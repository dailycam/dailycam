"""1시간 단위 텍스트 데이터 종합 분석 서비스"""

import asyncio
import json
import re
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.services.gemini_service import GeminiService
from app.models.live_monitoring.models import SegmentAnalysis, HourlyReport
from app.database.session import get_db


class HourlyAggregator:
    """
    1시간 단위로 SegmentAnalysis의 텍스트 데이터를 종합 분석하는 서비스
    
    - 해당 시간대의 6개 세그먼트(10분×6) 조회
    - 텍스트 데이터 추출 및 종합
    - Gemini로 중복 제거, 그룹화, 핵심 정보 추출
    - HourlyReport에 저장
    """
    
    def __init__(self):
        self.gemini_service = GeminiService()
    
    async def aggregate_hour(self, camera_id: str, hour_start: datetime, db: Session) -> Optional[HourlyReport]:
        """
        특정 시간대의 세그먼트들을 종합 분석하여 HourlyReport 생성
        
        Args:
            camera_id: 카메라 ID
            hour_start: 시간대 시작 (예: 14:00)
            db: 데이터베이스 세션
        
        Returns:
            HourlyReport: 생성된 리포트 (실패 시 None)
        """
        hour_end = hour_start + timedelta(hours=1)
        
        print(f"[HourlyAggregator] {hour_start.strftime('%Y-%m-%d %H:%M')} ~ {hour_end.strftime('%H:%M')} 종합 분석 시작")
        
        # 1. 해당 시간대의 완료된 세그먼트 조회 (최대 6개)
        segments = (
            db.query(SegmentAnalysis)
            .filter(
                SegmentAnalysis.camera_id == camera_id,
                SegmentAnalysis.segment_start >= hour_start,
                SegmentAnalysis.segment_start < hour_end,
                SegmentAnalysis.status == 'completed'
            )
            .order_by(SegmentAnalysis.segment_start.asc())
            .all()
        )
        
        if not segments:
            print(f"[HourlyAggregator] 해당 시간대에 완료된 세그먼트가 없습니다")
            return None
        
        print(f"[HourlyAggregator] {len(segments)}개 세그먼트 발견")
        
        # 2. 수치 데이터 집계 (실시간 계산)
        safety_scores = [s.safety_score for s in segments if s.safety_score is not None]
        avg_safety_score = sum(safety_scores) / len(safety_scores) if safety_scores else 0
        total_incidents = sum(s.incident_count or 0 for s in segments)
        
        # 3. 텍스트 데이터 추출
        text_data = self._extract_text_data(segments)
        
        if not text_data['has_data']:
            print(f"[HourlyAggregator] 텍스트 데이터가 없습니다. 수치 데이터만 저장합니다.")
            # 수치 데이터만 저장
            hourly_report = HourlyReport(
                camera_id=camera_id,
                hour_start=hour_start,
                hour_end=hour_end,
                average_safety_score=avg_safety_score,
                total_incidents=total_incidents,
                segment_count=len(segments),
                segment_analyses_ids=[s.id for s in segments]
            )
            db.add(hourly_report)
            db.commit()
            return hourly_report
        
        # 4. Gemini로 텍스트 데이터 종합 분석
        try:
            aggregated_text = await self._aggregate_with_gemini(text_data)
        except Exception as e:
            print(f"[HourlyAggregator] Gemini 종합 분석 실패: {e}")
            import traceback
            traceback.print_exc()
            # 실패 시 원본 데이터를 그대로 저장
            aggregated_text = {
                'safety_summary': text_data['safety_summaries'][0] if text_data['safety_summaries'] else '',
                'safety_insights': text_data['safety_insights'],
                'development_summary': text_data['development_summaries'][0] if text_data['development_summaries'] else '',
                'development_insights': text_data['development_insights'],
                'recommended_activities': text_data['recommended_activities']
            }
        
        # 5. HourlyReport 생성 및 저장
        hourly_report = HourlyReport(
            camera_id=camera_id,
            hour_start=hour_start,
            hour_end=hour_end,
            average_safety_score=avg_safety_score,
            total_incidents=total_incidents,
            segment_count=len(segments),
            safety_summary=aggregated_text.get('safety_summary', ''),
            safety_insights=aggregated_text.get('safety_insights', []),
            development_summary=aggregated_text.get('development_summary', ''),
            development_insights=aggregated_text.get('development_insights', []),
            recommended_activities=aggregated_text.get('recommended_activities', []),
            segment_analyses_ids=[s.id for s in segments]
        )
        
        # 기존 리포트가 있으면 업데이트, 없으면 생성
        existing = db.query(HourlyReport).filter(
            HourlyReport.camera_id == camera_id,
            HourlyReport.hour_start == hour_start
        ).first()
        
        if existing:
            existing.average_safety_score = avg_safety_score
            existing.total_incidents = total_incidents
            existing.segment_count = len(segments)
            existing.safety_summary = aggregated_text.get('safety_summary', '')
            existing.safety_insights = aggregated_text.get('safety_insights', [])
            existing.development_summary = aggregated_text.get('development_summary', '')
            existing.development_insights = aggregated_text.get('development_insights', [])
            existing.recommended_activities = aggregated_text.get('recommended_activities', [])
            existing.segment_analyses_ids = [s.id for s in segments]
            existing.updated_at = datetime.now()
            hourly_report = existing
        else:
            db.add(hourly_report)
        
        db.commit()
        db.refresh(hourly_report)
        
        print(f"[HourlyAggregator] ✅ 종합 분석 완료: {hour_start.strftime('%H:%M')}~{hour_end.strftime('%H:%M')}")
        return hourly_report
    
    def _extract_text_data(self, segments: List[SegmentAnalysis]) -> Dict[str, Any]:
        """
        세그먼트들에서 텍스트 데이터 추출
        
        Returns:
            dict: 추출된 텍스트 데이터
        """
        safety_summaries = []
        safety_insights = []
        development_summaries = []
        development_insights = []
        recommended_activities = []
        
        for segment in segments:
            if not segment.analysis_result:
                continue
            
            result = segment.analysis_result
            
            # 안전 분석 데이터 추출
            safety_analysis = result.get('safety_analysis', {})
            if safety_analysis:
                # safety_summary 추출 (있는 경우)
                if 'summary' in safety_analysis:
                    safety_summaries.append(safety_analysis['summary'])
                
                # insights 추출
                if 'insights' in safety_analysis and isinstance(safety_analysis['insights'], list):
                    safety_insights.extend(safety_analysis['insights'])
                
                # incident_events에서 요약 추출
                if 'incident_events' in safety_analysis and isinstance(safety_analysis['incident_events'], list):
                    for event in safety_analysis['incident_events']:
                        if isinstance(event, dict):
                            insight = {
                                'title': event.get('title', ''),
                                'description': event.get('description', ''),
                                'severity': event.get('severity', ''),
                                'location': event.get('location', '')
                            }
                            if insight['title']:
                                safety_insights.append(insight)
            
            # 발달 분석 데이터 추출
            development_analysis = result.get('development_analysis', {})
            if development_analysis:
                # summary 추출
                if 'summary' in development_analysis:
                    development_summaries.append(development_analysis['summary'])
                
                # insights 추출
                if 'insights' in development_analysis and isinstance(development_analysis['insights'], list):
                    development_insights.extend(development_analysis['insights'])
                
                # next_stage_signs 추출
                if 'next_stage_signs' in development_analysis and isinstance(development_analysis['next_stage_signs'], list):
                    for sign in development_analysis['next_stage_signs']:
                        if isinstance(sign, dict):
                            insight = {
                                'title': sign.get('title', ''),
                                'description': sign.get('description', ''),
                                'category': sign.get('category', '')
                            }
                            if insight['title']:
                                development_insights.append(insight)
            
            # 추천 활동 추출
            recommendations = result.get('recommendations', [])
            if isinstance(recommendations, list):
                recommended_activities.extend(recommendations)
        
        return {
            'has_data': bool(safety_summaries or safety_insights or development_summaries or 
                            development_insights or recommended_activities),
            'safety_summaries': safety_summaries,
            'safety_insights': safety_insights,
            'development_summaries': development_summaries,
            'development_insights': development_insights,
            'recommended_activities': recommended_activities
        }
    
    async def _aggregate_with_gemini(self, text_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Gemini로 텍스트 데이터 종합 분석 (중복 제거, 그룹화, 핵심 정보 추출)
        
        Args:
            text_data: 추출된 텍스트 데이터
        
        Returns:
            dict: 종합 분석 결과
        """
        # 프롬프트 생성
        prompt = self._build_aggregation_prompt(text_data)
        
        # Gemini API 호출
        try:
            import google.generativeai as genai
            generation_config = genai.types.GenerationConfig(
                temperature=0.3,
                top_k=30,
                top_p=0.95,
            )
            
            model = genai.GenerativeModel('gemini-1.5-pro')
            response = model.generate_content(
                prompt,
                generation_config=generation_config,
            )
            
            if not response or not hasattr(response, "text"):
                raise ValueError("Gemini 응답이 올바르지 않습니다.")
            
            result_text = response.text.strip()
            result = self._extract_and_parse_json(result_text)
            
            return result
            
        except Exception as e:
            print(f"[HourlyAggregator] Gemini API 호출 실패: {e}")
            raise
    
    def _build_aggregation_prompt(self, text_data: Dict[str, Any]) -> str:
        """
        1시간 분량 텍스트 데이터 종합 분석 프롬프트 생성
        """
        prompt_parts = [
            "다음은 1시간 동안 수집된 10분 단위 분석 결과들입니다.",
            "이 데이터들을 종합하여 중복을 제거하고, 비슷한 내용을 묶어서 핵심 정보만 추출해주세요.\n"
        ]
        
        # 안전 요약들
        if text_data['safety_summaries']:
            prompt_parts.append("## 안전 요약들:")
            for i, summary in enumerate(text_data['safety_summaries'], 1):
                prompt_parts.append(f"{i}. {summary}")
            prompt_parts.append("")
        
        # 안전 인사이트들
        if text_data['safety_insights']:
            prompt_parts.append("## 안전 인사이트들:")
            for i, insight in enumerate(text_data['safety_insights'], 1):
                if isinstance(insight, dict):
                    title = insight.get('title', '')
                    desc = insight.get('description', '')
                    prompt_parts.append(f"{i}. {title}: {desc}")
                else:
                    prompt_parts.append(f"{i}. {insight}")
            prompt_parts.append("")
        
        # 발달 요약들
        if text_data['development_summaries']:
            prompt_parts.append("## 발달 요약들:")
            for i, summary in enumerate(text_data['development_summaries'], 1):
                prompt_parts.append(f"{i}. {summary}")
            prompt_parts.append("")
        
        # 발달 인사이트들
        if text_data['development_insights']:
            prompt_parts.append("## 발달 인사이트들:")
            for i, insight in enumerate(text_data['development_insights'], 1):
                if isinstance(insight, dict):
                    title = insight.get('title', '')
                    desc = insight.get('description', '')
                    prompt_parts.append(f"{i}. {title}: {desc}")
                else:
                    prompt_parts.append(f"{i}. {insight}")
            prompt_parts.append("")
        
        # 추천 활동들
        if text_data['recommended_activities']:
            prompt_parts.append("## 추천 활동들:")
            for i, activity in enumerate(text_data['recommended_activities'], 1):
                if isinstance(activity, dict):
                    title = activity.get('title', '')
                    desc = activity.get('description', '') or activity.get('benefit', '')
                    prompt_parts.append(f"{i}. {title}: {desc}")
                else:
                    prompt_parts.append(f"{i}. {activity}")
            prompt_parts.append("")
        
        prompt_parts.extend([
            "위 데이터를 종합하여 다음 형식의 JSON으로 응답해주세요:",
            "",
            "```json",
            "{",
            '  "safety_summary": "1시간 동안의 안전 상황을 종합한 요약 (중복 제거, 핵심만)",',
            '  "safety_insights": [',
            '    {',
            '      "title": "인사이트 제목",',
            '      "description": "상세 설명",',
            '      "severity": "위험/주의/권장",',
            '      "frequency": "발생 빈도 (예: 3회)"',
            '    }',
            '  ],',
            '  "development_summary": "1시간 동안의 발달 상황을 종합한 요약 (중복 제거, 핵심만)",',
            '  "development_insights": [',
            '    {',
            '      "title": "인사이트 제목",',
            '      "description": "상세 설명",',
            '      "category": "언어/운동/인지/사회성/정서"',
            '    }',
            '  ],',
            '  "recommended_activities": [',
            '    {',
            '      "title": "활동 제목",',
            '      "description": "활동 설명",',
            '      "benefit": "기대 효과",',
            '      "category": "언어/운동/인지/사회성/정서"',
            '    }',
            '  ]',
            "}",
            "```",
            "",
            "**중요 지침:**",
            "1. 중복되는 내용은 하나로 통합하세요",
            "2. 비슷한 내용은 그룹화하여 핵심만 남기세요",
            "3. 가장 중요한 정보만 선별하여 포함하세요",
            "4. 빈 배열이나 빈 문자열이어도 괜찮습니다",
            "5. 반드시 유효한 JSON 형식으로 응답하세요"
        ])
        
        return "\n".join(prompt_parts)


class HourlyAggregatorScheduler:
    """
    1시간마다 HourlyAggregator를 실행하는 스케줄러
    """
    
    def __init__(self, camera_id: str):
        self.camera_id = camera_id
        self.aggregator = HourlyAggregator()
        self.is_running = False
    
    async def start_scheduler(self):
        """스케줄러 시작 (백그라운드 태스크)"""
        self.is_running = True
        print(f"[HourlyAggregator] 스케줄러 시작: {self.camera_id}")
        
        while self.is_running:
            # 매 시간 정각 + 5분에 실행 (예: 14:05, 15:05, 16:05...)
            # 5분 여유를 두어 마지막 10분 세그먼트가 완료되도록 함
            now = datetime.now()
            next_aggregation_time = (now.replace(minute=5, second=0, microsecond=0) + 
                                    timedelta(hours=1))
            
            if now.minute >= 5:
                # 이미 5분이 지났으면 다음 시간으로
                pass
            else:
                # 아직 5분 전이면 이번 시간으로
                next_aggregation_time = now.replace(minute=5, second=0, microsecond=0)
            
            wait_seconds = (next_aggregation_time - now).total_seconds()
            
            if wait_seconds > 0:
                hour_to_aggregate = next_aggregation_time - timedelta(hours=1)
                print(f"[HourlyAggregator] 다음 종합 분석 시간: {hour_to_aggregate.strftime('%H:%M')} ({wait_seconds/60:.1f}분 후)")
                await asyncio.sleep(wait_seconds)
            
            if self.is_running:
                # 이전 시간대 종합 분석
                hour_to_aggregate = next_aggregation_time - timedelta(hours=1)
                hour_start = hour_to_aggregate.replace(minute=0, second=0, microsecond=0)
                
                db = next(get_db())
                try:
                    await self.aggregator.aggregate_hour(self.camera_id, hour_start, db)
                except Exception as e:
                    print(f"[HourlyAggregator] 오류: {e}")
                    import traceback
                    traceback.print_exc()
                finally:
                    db.close()
        
        print(f"[HourlyAggregator] 스케줄러 종료: {self.camera_id}")
    
    def _extract_and_parse_json(self, text: str) -> dict:
        """
        텍스트에서 JSON 추출 및 파싱
        (GeminiService의 _extract_and_parse_json과 동일한 로직)
        """
        cleaned_text = text

        if "```json" in cleaned_text:
            start = cleaned_text.find("```json")
            if start != -1:
                start = cleaned_text.find("\n", start) + 1
                end = cleaned_text.find("```", start)
                if end != -1:
                    cleaned_text = cleaned_text[start:end].strip()
        elif "```" in cleaned_text:
            start = cleaned_text.find("```")
            if start != -1:
                start = cleaned_text.find("\n", start) + 1
                end = cleaned_text.find("```", start)
                if end != -1:
                    cleaned_text = cleaned_text[start:end].strip()

        first_brace = cleaned_text.find("{")
        if first_brace != -1:
            brace_count = 0
            last_brace = first_brace
            for i in range(first_brace, len(cleaned_text)):
                ch = cleaned_text[i]
                if ch == "{":
                    brace_count += 1
                elif ch == "}":
                    brace_count -= 1
                    if brace_count == 0:
                        last_brace = i
                        break

            if brace_count == 0:
                cleaned_text = cleaned_text[first_brace : last_brace + 1]
            else:
                last_brace = cleaned_text.rfind("}")
                if last_brace != -1 and last_brace > first_brace:
                    cleaned_text = cleaned_text[first_brace : last_brace + 1]

        try:
            return json.loads(cleaned_text)
        except json.JSONDecodeError as e:
            print(f"⚠️ JSON 파싱 실패: {str(e)}")
            print(f"[추출된 텍스트 (처음 500자)]\n{cleaned_text[:500]}")
            raise ValueError(f"JSON 파싱 실패: {str(e)}")
    
    def stop_scheduler(self):
        """스케줄러 중지"""
        print(f"[HourlyAggregator] 중지 요청: {self.camera_id}")
        self.is_running = False


# 전역 스케줄러 관리
active_aggregator_schedulers = {}


async def start_hourly_aggregation_for_camera(camera_id: str):
    """특정 카메라의 1시간 종합 분석 스케줄러 시작"""
    if camera_id in active_aggregator_schedulers:
        print(f"[HourlyAggregator] 이미 실행 중: {camera_id}")
        return
    
    scheduler = HourlyAggregatorScheduler(camera_id)
    active_aggregator_schedulers[camera_id] = scheduler
    
    # 백그라운드 태스크로 실행
    asyncio.create_task(scheduler.start_scheduler())
    
    print(f"[HourlyAggregator] 스케줄러 시작됨: {camera_id}")


def stop_hourly_aggregation_for_camera(camera_id: str):
    """특정 카메라의 1시간 종합 분석 스케줄러 중지"""
    if camera_id not in active_aggregator_schedulers:
        print(f"[HourlyAggregator] 실행 중이 아님: {camera_id}")
        return
    
    scheduler = active_aggregator_schedulers[camera_id]
    scheduler.stop_scheduler()
    del active_aggregator_schedulers[camera_id]
    
    print(f"[HourlyAggregator] 스케줄러 중지됨: {camera_id}")

