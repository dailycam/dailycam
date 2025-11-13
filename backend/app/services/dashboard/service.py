"""대시보드 서비스 - 비디오 분석 결과를 대시보드 데이터로 변환 및 저장, 대시보드 데이터 조회"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import TYPE_CHECKING, Optional

from sqlalchemy.orm import Session

if TYPE_CHECKING:
    from app.services.gemini_service import GeminiService

from app.models.dashboard import (
    DashboardRecommendation,
    DashboardRisk,
    DashboardStatistics,
    DashboardWeeklyTrend,
)
from app.schemas.dashboard import (
    DashboardRequest,
    DashboardResponse,
    RecommendationItem,
    RiskItem,
    WeeklyTrendData,
)


@dataclass(slots=True)
class DashboardServiceConfig:
    """Configuration for the dashboard service."""

    default_range_days: int = 7


class DashboardService:
    """대시보드 데이터 관리 서비스 - 저장 및 조회"""

    def __init__(self, db: Session, config: Optional[DashboardServiceConfig] = None):
        self.db = db
        self._config = config or DashboardServiceConfig()

    def save_video_analysis_to_dashboard(
        self,
        user_id: str,
        video_analysis_result: dict,
        video_duration_seconds: Optional[float] = None,
    ) -> None:
        """
        비디오 분석 결과를 대시보드 테이블에 저장합니다.
        
        Args:
            user_id: 사용자 ID
            video_analysis_result: Gemini 분석 결과 딕셔너리
                - safety_score: 안전도 점수
                - total_incidents: 전체 사건 수
                - falls: 넘어짐 횟수
                - dangerous_actions: 위험 행동 횟수
                - timeline_events: 타임라인 이벤트 리스트
                - summary: AI 요약
                - recommendations: 추천 사항 리스트
            video_duration_seconds: 비디오 길이 (초) - 모니터링 시간 계산용
        """
        today = date.today()
        
        # 1. dashboard_statistics 업데이트 또는 생성
        stats = (
            self.db.query(DashboardStatistics)
            .filter(
                DashboardStatistics.user_id == user_id,
                DashboardStatistics.stat_date == today,
            )
            .first()
        )
        
        if not stats:
            stats = DashboardStatistics(
                user_id=user_id,
                stat_date=today,
            )
            self.db.add(stats)
        
        # 통계 업데이트
        safety_score = float(video_analysis_result.get("safety_score", 0))
        total_incidents = int(video_analysis_result.get("total_incidents", 0))
        
        # 최신 비디오 분석 결과로 덮어쓰기 (누적하지 않음)
        # 비디오를 업로드할 때마다 대시보드가 최신 결과로 반응하도록
        stats.safety_score = safety_score
        stats.incident_count = total_incidents
        
        # 모니터링 시간 계산 (비디오 길이를 시간으로 변환)
        if video_duration_seconds:
            video_hours = float(video_duration_seconds) / 3600
            stats.monitoring_hours = (stats.monitoring_hours or 0.0) + video_hours
        
        # 활동 패턴 판단 (정제된 데이터가 있으면 사용, 없으면 기본 로직)
        if video_analysis_result.get("activity_pattern"):
            stats.activity_pattern = video_analysis_result.get("activity_pattern")
        else:
            if safety_score >= 85:
                stats.activity_pattern = "정상"
            elif safety_score >= 70:
                stats.activity_pattern = "주의 필요"
            else:
                stats.activity_pattern = "위험"
        
        # AI 요약 업데이트 (정제된 요약이 있으면 사용, 없으면 원본)
        summary = video_analysis_result.get("refined_summary") or video_analysis_result.get("summary")
        if summary:
            stats.summary = summary
            stats.summary_updated_at = datetime.now()
        
        self.db.flush()
        
        # 2. dashboard_risks 저장
        # 정제된 위험 항목이 있으면 사용, 없으면 기본 로직 사용
        refined_risks = video_analysis_result.get("refined_risks", [])
        
        if refined_risks:
            # 정제된 위험 항목 저장
            for refined_risk in refined_risks:
                title = refined_risk.get("title", "")
                level = refined_risk.get("level", "low")
                time_str = refined_risk.get("time", "")
                count = int(refined_risk.get("count", 1))
                description = refined_risk.get("description", "")
                
                existing_risk = (
                    self.db.query(DashboardRisk)
                    .filter(
                        DashboardRisk.user_id == user_id,
                        DashboardRisk.title == title,
                        DashboardRisk.is_active == "true",
                    )
                    .first()
                )
                
                if existing_risk:
                    existing_risk.count += count
                    existing_risk.updated_at = datetime.now()
                else:
                    risk = DashboardRisk(
                        user_id=user_id,
                        level=level,
                        title=title,
                        time=time_str,
                        count=count,
                        description=description,
                        is_active="true",
                    )
                    self.db.add(risk)
        else:
            # 기본 로직: timeline_events에서 위험한 이벤트만 추출
            timeline_events = video_analysis_result.get("timeline_events", [])
            for event in timeline_events:
                event_type = event.get("type", "")
                severity = event.get("severity", "low")
                
                # fall, danger, warning만 위험 항목으로 저장
                if event_type in ["fall", "danger", "warning"]:
                    # 같은 위험 항목이 있는지 확인 (제목으로)
                    description = event.get("description", "")
                    title = self._extract_risk_title(description, event_type)
                    
                    existing_risk = (
                        self.db.query(DashboardRisk)
                        .filter(
                            DashboardRisk.user_id == user_id,
                            DashboardRisk.title == title,
                            DashboardRisk.is_active == "true",
                        )
                        .first()
                    )
                    
                    if existing_risk:
                        # 기존 위험 항목 업데이트
                        existing_risk.count += 1
                        existing_risk.updated_at = datetime.now()
                    else:
                        # 새 위험 항목 생성
                        timestamp = event.get("timestamp", "")
                        time_str = self._format_time(timestamp)
                        
                        risk = DashboardRisk(
                            user_id=user_id,
                            level=severity,
                            title=title,
                            time=time_str,
                            count=1,
                            description=description,
                            is_active="true",
                        )
                        self.db.add(risk)
        
        self.db.flush()
        
        # 3. dashboard_recommendations 저장
        # 정제된 추천 사항이 있으면 사용, 없으면 기본 로직 사용
        refined_recommendations = video_analysis_result.get("refined_recommendations", [])
        
        if refined_recommendations:
            # 정제된 추천 사항 저장
            for refined_rec in refined_recommendations:
                title = refined_rec.get("title", "")
                description = refined_rec.get("description", title)
                priority = refined_rec.get("priority", "medium")
                
                if not title:
                    continue
                
                existing_rec = (
                    self.db.query(DashboardRecommendation)
                    .filter(
                        DashboardRecommendation.user_id == user_id,
                        DashboardRecommendation.title == title,
                        DashboardRecommendation.status.in_(["pending", "in_progress"]),
                    )
                    .first()
                )
                
                if not existing_rec:
                    rec = DashboardRecommendation(
                        user_id=user_id,
                        priority=priority,
                        title=title,
                        description=description,
                        status="pending",
                    )
                    self.db.add(rec)
        else:
            # 기본 로직: 원본 recommendations 사용
            recommendations = video_analysis_result.get("recommendations", [])
            timeline_events = video_analysis_result.get("timeline_events", [])
            
            for rec_text in recommendations:
                if not rec_text:
                    continue
                
                # 추천 사항이 이미 있는지 확인
                existing_rec = (
                    self.db.query(DashboardRecommendation)
                    .filter(
                        DashboardRecommendation.user_id == user_id,
                        DashboardRecommendation.title == rec_text,
                        DashboardRecommendation.status.in_(["pending", "in_progress"]),
                    )
                    .first()
                )
                
                if not existing_rec:
                    # 우선순위 결정 (위험 항목의 심각도에 따라)
                    priority = self._determine_priority(rec_text, timeline_events)
                    
                    rec = DashboardRecommendation(
                        user_id=user_id,
                        priority=priority,
                        title=rec_text,
                        description=rec_text,
                        status="pending",
                    )
                    self.db.add(rec)
        
        # 4. dashboard_weekly_trend 업데이트 (오늘 날짜의 주간 추이)
        day_names = ["월", "화", "수", "목", "금", "토", "일"]
        today_weekday = today.weekday()  # 0=월요일, 6=일요일
        day_name = day_names[today_weekday]
        
        weekly_trend = (
            self.db.query(DashboardWeeklyTrend)
            .filter(
                DashboardWeeklyTrend.user_id == user_id,
                DashboardWeeklyTrend.trend_date == today,
            )
            .first()
        )
        
        if not weekly_trend:
            weekly_trend = DashboardWeeklyTrend(
                user_id=user_id,
                trend_date=today,
                day=day_name,
                score=safety_score,
                incidents=total_incidents,
            )
            self.db.add(weekly_trend)
        else:
            # 최신 비디오 분석 결과로 덮어쓰기 (누적하지 않음)
            weekly_trend.score = safety_score
            weekly_trend.incidents = total_incidents
        
        try:
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            raise e
    
    def _extract_risk_title(self, description: str, event_type: str) -> str:
        """이벤트 설명에서 위험 제목 추출"""
        # 간단한 추출 로직 (향후 개선 가능)
        if "주방" in description or "데드존" in description:
            return "주방 근처 반복 접근"
        elif "계단" in description:
            return "계단 입구 접근"
        elif "모서리" in description or "충돌" in description:
            return "가구 모서리 접촉"
        elif "넘어" in description or "낙상" in description:
            return "넘어짐 위험"
        elif "콘센트" in description or "전기" in description:
            return "전기 콘센트 접근"
        else:
            # 기본 제목 생성
            type_map = {
                "fall": "넘어짐 위험",
                "danger": "위험한 행동",
                "warning": "경고 상황",
            }
            return type_map.get(event_type, "위험 상황")
    
    def _format_time(self, timestamp: str) -> str:
        """타임스탬프를 시간 문자열로 변환 (예: "오후 2:15")"""
        try:
            # "00:00:15" 형식을 파싱
            parts = timestamp.split(":")
            if len(parts) >= 2:
                hour = int(parts[0])
                minute = int(parts[1])
                
                if hour < 12:
                    return f"오전 {hour}:{minute:02d}"
                elif hour == 12:
                    return f"오후 {hour}:{minute:02d}"
                else:
                    return f"오후 {hour-12}:{minute:02d}"
        except:
            pass
        return timestamp
    
    def _determine_priority(self, recommendation: str, timeline_events: list) -> str:
        """추천 사항의 우선순위 결정"""
        # 위험한 이벤트가 많으면 high
        high_severity_count = sum(
            1
            for event in timeline_events
            if event.get("severity") == "high"
            and event.get("type") in ["fall", "danger"]
        )
        
        if high_severity_count > 0:
            return "high"
        elif "중요" in recommendation or "즉시" in recommendation:
            return "high"
        else:
            return "medium"
    
    def _create_dashboard_refinement_prompt(self, video_analysis_result: dict) -> str:
        """
        대시보드 데이터 정제를 위한 프롬프트 생성
        Gemini 분석 결과를 대시보드에 최적화된 형태로 정제
        """
        return f"""
당신은 영유아 안전 모니터링 대시보드 데이터 정제 전문가입니다.
비디오 분석 결과를 대시보드에 표시하기 최적화된 형태로 정제해주세요.

**중요: 모든 응답은 반드시 한글로만 작성해주세요.**

## 입력 데이터:
{json.dumps(video_analysis_result, ensure_ascii=False, indent=2)}

## 정제 작업:

### 1. 위험 항목 제목 추출 및 분류
각 timeline_event의 description을 분석하여 대시보드에 표시할 명확한 제목을 생성하세요.
- 제목은 10-20자 이내로 간결하고 명확해야 합니다
- 유사한 위험은 같은 제목으로 그룹화하세요
- 예: "주방 근처 반복 접근", "계단 입구 접근", "가구 모서리 접촉", "전기 콘센트 접근", "넘어짐 위험"

### 2. 추천 사항 우선순위 판단
각 추천 사항의 우선순위를 다음 기준으로 판단하세요:
- **high**: 즉시 조치가 필요한 심각한 위험 (넘어짐, 전기 관련, 높은 곳에서 떨어짐 등)
- **medium**: 주의가 필요한 상황 (반복적인 접근, 잠재적 위험 등)
- **low**: 개선 권장 사항 (환경 개선, 모니터링 강화 등)

### 3. 대시보드 요약 개선
summary를 대시보드에 표시하기 적합한 형태로 다듬어주세요:
- 50-100자 이내로 간결하게
- 핵심 정보(안전도 점수, 주요 위험) 포함
- 부모가 빠르게 파악할 수 있는 형태

### 4. 활동 패턴 판단
safety_score를 기반으로 활동 패턴을 판단하세요:
- 85점 이상: "정상"
- 70-84점: "주의 필요"
- 70점 미만: "위험"

## 출력 형식 (JSON):
{{
  "refined_summary": "정제된 요약 (50-100자)",
  "activity_pattern": "정상|주의 필요|위험",
  "refined_risks": [
    {{
      "title": "위험 제목 (10-20자)",
      "level": "high|medium|low",
      "time": "오전/오후 시간 형식",
      "count": 발생 횟수,
      "description": "원본 설명",
      "grouped_events": ["같은 제목으로 그룹화된 이벤트들의 timestamp"]
    }}
  ],
  "refined_recommendations": [
    {{
      "title": "추천 사항 제목",
      "description": "상세 설명",
      "priority": "high|medium|low",
      "reason": "우선순위 판단 이유"
    }}
  ],
  "safety_insights": {{
    "trend": "개선|유지|악화",
    "main_concern": "가장 우려되는 사항 (한 줄)",
    "quick_action": "즉시 조치할 사항 (있다면)"
  }}
}}

**중요: 반드시 유효한 JSON 형식으로만 응답하세요. 마크다운 코드 블록은 사용하지 마세요.**
"""
    
    async def refine_video_analysis_for_dashboard(
        self,
        video_analysis_result: dict,
        gemini_service: Optional["GeminiService"] = None,
    ) -> dict:
        """
        Gemini를 사용하여 비디오 분석 결과를 대시보드에 최적화된 형태로 정제합니다.
        
        Args:
            video_analysis_result: 원본 Gemini 분석 결과
            gemini_service: Gemini 서비스 인스턴스 (선택)
            
        Returns:
            정제된 대시보드 데이터
        """
        # Gemini 서비스가 없으면 기본 정제 로직 사용
        if not gemini_service:
            return self._refine_with_basic_logic(video_analysis_result)
        
        try:
            # 정제 프롬프트 생성
            prompt = self._create_dashboard_refinement_prompt(video_analysis_result)
            
            # Gemini API 호출 (텍스트만 전달)
            response = gemini_service.model.generate_content(prompt)
            
            if not response or not hasattr(response, 'text'):
                raise ValueError("Gemini API 응답이 올바르지 않습니다.")
            
            result_text = response.text.strip()
            
            # JSON 추출
            if result_text.startswith('```json'):
                result_text = result_text.replace('```json\n', '').replace('```', '')
            elif result_text.startswith('```'):
                result_text = result_text.replace('```\n', '').replace('```', '')
            
            # JSON 파싱
            refined_data = json.loads(result_text)
            
            # 원본 데이터와 정제된 데이터 병합
            return {
                **video_analysis_result,
                "refined_summary": refined_data.get("refined_summary", video_analysis_result.get("summary", "")),
                "activity_pattern": refined_data.get("activity_pattern", "정상"),
                "refined_risks": refined_data.get("refined_risks", []),
                "refined_recommendations": refined_data.get("refined_recommendations", []),
                "safety_insights": refined_data.get("safety_insights", {}),
            }
        except Exception as e:
            import traceback
            print(f"⚠️ 대시보드 데이터 정제 실패: {e}")
            print(f"상세:\n{traceback.format_exc()}")
            # 실패 시 기본 정제 로직 사용
            return self._refine_with_basic_logic(video_analysis_result)

    def _refine_with_basic_logic(self, video_analysis_result: dict) -> dict:
        """기본 정제 로직 (Gemini 사용 불가 시)"""
        safety_score = float(video_analysis_result.get("safety_score", 0))
        
        # 활동 패턴 판단
        if safety_score >= 85:
            activity_pattern = "정상"
        elif safety_score >= 70:
            activity_pattern = "주의 필요"
        else:
            activity_pattern = "위험"
        
        return {
            **video_analysis_result,
            "activity_pattern": activity_pattern,
        }
    
    def create_dummy_data(self, user_id: str = "default_user") -> dict:
        """
        대시보드에 더미 데이터를 생성합니다.
        로그인 기능이 없을 때 테스트용으로 사용합니다.
        
        Args:
            user_id: 사용자 ID (기본값: "default_user")
            
        Returns:
            생성된 데이터 개수 딕셔너리
        """
        today = date.today()
        day_names = ["월", "화", "수", "목", "금", "토", "일"]
        
        created_count = {
            "statistics": 0,
            "weekly_trend": 0,
            "risks": 0,
            "recommendations": 0,
        }
        
        try:
            # 1. 오늘의 통계 데이터 생성
            existing_stats = (
                self.db.query(DashboardStatistics)
                .filter(
                    DashboardStatistics.user_id == user_id,
                    DashboardStatistics.stat_date == today,
                )
                .first()
            )
            
            if not existing_stats:
                stats = DashboardStatistics(
                    user_id=user_id,
                    stat_date=today,
                    safety_score=87.5,
                    incident_count=5,
                    monitoring_hours=8.5,
                    activity_pattern="정상",
                    summary="최근 7일간 전반적으로 안전하게 활동했습니다. 안전도 점수는 87.5점이며, 총 5건의 사건이 감지되었습니다.",
                    summary_updated_at=datetime.now(),
                )
                self.db.add(stats)
                created_count["statistics"] = 1
            
            # 2. 최근 7일간 주간 추이 데이터 생성
            # 오늘도 포함하여 7일간의 데이터를 생성 (오늘은 나중에 실제 분석 결과로 덮어쓸 수 있음)
            base_scores = [85, 88, 92, 87, 90, 95, 93]  # 7개
            base_incidents = [5, 3, 2, 4, 3, 1, 2]  # 7개
            
            for i in range(7):
                trend_date = today - timedelta(days=6 - i)  # 6일 전부터 오늘까지
                weekday = trend_date.weekday()
                day_name = day_names[weekday]
                
                existing_trend = (
                    self.db.query(DashboardWeeklyTrend)
                    .filter(
                        DashboardWeeklyTrend.user_id == user_id,
                        DashboardWeeklyTrend.trend_date == trend_date,
                    )
                    .first()
                )
                
                if not existing_trend:
                    # 더미 점수 생성 (80~95 사이)
                    trend = DashboardWeeklyTrend(
                        user_id=user_id,
                        trend_date=trend_date,
                        day=day_name,
                        score=float(base_scores[i]),
                        incidents=int(base_incidents[i]),
                    )
                    self.db.add(trend)
                    created_count["weekly_trend"] += 1
                    print(f"  📅 {trend_date} ({day_name}) 더미 데이터 생성: 점수={base_scores[i]}, 사건={base_incidents[i]}")
                else:
                    print(f"  ⏭️  {trend_date} ({day_name}) 기존 데이터 존재, 스킵")
            
            # 3. 위험 항목 생성
            dummy_risks = [
                {
                    "level": "high",
                    "title": "주방 근처 반복 접근",
                    "time": "오후 2:15 - 2:45",
                    "count": 3,
                    "description": "아이가 주방에 자주 접근하고 있습니다",
                    "location": "주방",
                },
                {
                    "level": "medium",
                    "title": "계단 입구 접근",
                    "time": "오전 11:30",
                    "count": 1,
                    "description": "계단 입구 근처에서 활동이 감지되었습니다",
                    "location": "계단",
                },
                {
                    "level": "low",
                    "title": "가구 모서리 접촉",
                    "time": "오후 1:20",
                    "count": 2,
                    "description": "테이블 모서리에 접촉했습니다",
                    "location": "거실",
                },
            ]
            
            for risk_data in dummy_risks:
                existing_risk = (
                    self.db.query(DashboardRisk)
                    .filter(
                        DashboardRisk.user_id == user_id,
                        DashboardRisk.title == risk_data["title"],
                        DashboardRisk.is_active == "true",
                    )
                    .first()
                )
                
                if not existing_risk:
                    risk = DashboardRisk(
                        user_id=user_id,
                        level=risk_data["level"],
                        title=risk_data["title"],
                        time=risk_data["time"],
                        count=risk_data["count"],
                        description=risk_data["description"],
                        location=risk_data["location"],
                        is_active="true",
                    )
                    self.db.add(risk)
                    created_count["risks"] += 1
            
            # 4. 추천 사항 생성
            dummy_recommendations = [
                {
                    "priority": "high",
                    "title": "주방 출입문 안전 게이트 설치",
                    "description": "아이가 주방에 자주 접근하고 있습니다. 안전 게이트를 설치하여 접근을 제한하세요.",
                },
                {
                    "priority": "medium",
                    "title": "거실 테이블 모서리 보호대 추가",
                    "description": "충돌 위험이 감지되었습니다. 테이블 모서리에 보호대를 설치하세요.",
                },
                {
                    "priority": "low",
                    "title": "세이프존 범위 재설정 검토",
                    "description": "활동 패턴이 변화했습니다. 세이프존 범위를 재검토하세요.",
                },
            ]
            
            for rec_data in dummy_recommendations:
                existing_rec = (
                    self.db.query(DashboardRecommendation)
                    .filter(
                        DashboardRecommendation.user_id == user_id,
                        DashboardRecommendation.title == rec_data["title"],
                        DashboardRecommendation.status.in_(["pending", "in_progress"]),
                    )
                    .first()
                )
                
                if not existing_rec:
                    rec = DashboardRecommendation(
                        user_id=user_id,
                        priority=rec_data["priority"],
                        title=rec_data["title"],
                        description=rec_data["description"],
                        status="pending",
                    )
                    self.db.add(rec)
                    created_count["recommendations"] += 1
            
            self.db.commit()
            return created_count
            
        except Exception as e:
            self.db.rollback()
            raise e
    
    async def summarize(self, payload: DashboardRequest) -> DashboardResponse:
        """
        대시보드 테이블에서 데이터를 조회하여 반환합니다.
        비디오 분석 결과가 저장된 대시보드 테이블에서 필요한 데이터만 추출합니다.
        """
        user_id = payload.user_id or "default_user"
        range_days = payload.range_days or self._config.default_range_days
        
        # 오늘 날짜 기준으로 최근 range_days일간 데이터 조회
        today = date.today()
        start_date = today - timedelta(days=range_days - 1)
        
        # 1. 오늘의 통계 데이터 조회 (dashboard_statistics)
        today_stats = (
            self.db.query(DashboardStatistics)
            .filter(
                DashboardStatistics.user_id == user_id,
                DashboardStatistics.stat_date == today,
            )
            .first()
        )
        
        # 2. 주간 추이 데이터 조회 (dashboard_weekly_trend)
        weekly_trend_records = (
            self.db.query(DashboardWeeklyTrend)
            .filter(
                DashboardWeeklyTrend.user_id == user_id,
                DashboardWeeklyTrend.trend_date >= start_date,
                DashboardWeeklyTrend.trend_date <= today,
            )
            .order_by(DashboardWeeklyTrend.trend_date)
            .all()
        )
        
        print(f"🔍 주간 추이 데이터 조회: user_id={user_id}, 기간={start_date}~{today}, 레코드 수={len(weekly_trend_records)}")
        
        # 주간 추이 데이터가 7개 미만이면 더미 데이터 생성
        # 영상 하나로는 주간 추이를 판단할 수 없으므로 더미 데이터로 항상 표시
        if len(weekly_trend_records) < 7:
            print(f"📊 주간 추이 데이터가 부족합니다 ({len(weekly_trend_records)}/7). 더미 데이터를 생성합니다. (user_id: {user_id})")
            try:
                dummy_result = self.create_dummy_data(user_id=user_id)
                print(f"✅ 더미 데이터 생성 완료: {dummy_result}")
                
                # 생성 후 다시 조회
                weekly_trend_records = (
                    self.db.query(DashboardWeeklyTrend)
                    .filter(
                        DashboardWeeklyTrend.user_id == user_id,
                        DashboardWeeklyTrend.trend_date >= start_date,
                        DashboardWeeklyTrend.trend_date <= today,
                    )
                    .order_by(DashboardWeeklyTrend.trend_date)
                    .all()
                )
                
                print(f"📈 생성 후 조회된 주간 추이 레코드 수: {len(weekly_trend_records)}")
            except Exception as e:
                # 더미 데이터 생성 실패해도 계속 진행
                import traceback
                error_trace = traceback.format_exc()
                print(f"⚠️ 더미 데이터 자동 생성 실패: {e}")
                print(f"상세 에러:\n{error_trace}")
        
        # 주간 추이 데이터 변환
        weekly_trend = []
        if weekly_trend_records and len(weekly_trend_records) > 0:
            print(f"✅ 주간 추이 데이터 변환 중... ({len(weekly_trend_records)}개)")
            for record in weekly_trend_records:
                weekly_trend.append(
                    WeeklyTrendData(
                        day=record.day,
                        score=float(record.score),
                        incidents=int(record.incidents),
                    )
                )
            print(f"✅ 주간 추이 데이터 변환 완료: {len(weekly_trend)}개")
        else:
            print(f"⚠️ 주간 추이 데이터가 없습니다.")
        
        print(f"📊 최종 주간 추이 데이터 개수: {len(weekly_trend)}")
        
        # 3. 위험 항목 조회 (dashboard_risks)
        risk_records = (
            self.db.query(DashboardRisk)
            .filter(
                DashboardRisk.user_id == user_id,
                DashboardRisk.is_active == "true",
            )
            .order_by(
                DashboardRisk.level.desc(),  # high, medium, low 순
                DashboardRisk.created_at.desc(),
            )
            .limit(10)  # 최대 10개
            .all()
        )
        
        risks = []
        for risk in risk_records:
            risks.append(
                RiskItem(
                    level=risk.level,  # type: ignore
                    title=risk.title,
                    time=risk.time or "",
                    count=int(risk.count),
                )
            )
        
        # 4. 추천 사항 조회 (dashboard_recommendations)
        rec_records = (
            self.db.query(DashboardRecommendation)
            .filter(
                DashboardRecommendation.user_id == user_id,
                DashboardRecommendation.status.in_(["pending", "in_progress"]),
            )
            .order_by(
                DashboardRecommendation.priority.desc(),  # high, medium, low 순
                DashboardRecommendation.created_at.desc(),
            )
            .limit(10)  # 최대 10개
            .all()
        )
        
        recommendations = []
        for rec in rec_records:
            recommendations.append(
                RecommendationItem(
                    priority=rec.priority,  # type: ignore
                    title=rec.title,
                    description=rec.description,
                )
            )
        
        # 5. 통계 계산
        if today_stats:
            safety_score = float(today_stats.safety_score or 0)
            incident_count = int(today_stats.incident_count or 0)
            monitoring_hours = float(today_stats.monitoring_hours or 0)
            activity_pattern = today_stats.activity_pattern or "정상"
            summary = today_stats.summary or "데이터가 없습니다."
        else:
            # 오늘 데이터가 없으면 주간 추이에서 계산
            if weekly_trend:
                safety_score = sum(day.score for day in weekly_trend) / len(weekly_trend)
                incident_count = sum(day.incidents for day in weekly_trend)
            else:
                safety_score = 0.0
                incident_count = 0
            
            monitoring_hours = 0.0
            activity_pattern = "정상" if safety_score >= 85 else "주의 필요" if safety_score >= 70 else "위험"
            summary = "아직 분석된 비디오가 없습니다. 비디오를 업로드하여 분석해주세요."
        
        return DashboardResponse(
            summary=summary,
            range_days=range_days,
            safety_score=round(safety_score, 1),
            incident_count=incident_count,
            monitoring_hours=round(monitoring_hours, 1),
            activity_pattern=activity_pattern,
            weekly_trend=weekly_trend,
            risks=risks,
            recommendations=recommendations,
        )


def get_dashboard_service(db: Session) -> DashboardService:
    """대시보드 서비스 의존성"""
    return DashboardService(db)

