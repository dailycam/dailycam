"""일일 리포트 서비스 - 팀원 구조 기반으로 새로 작성"""

from __future__ import annotations

from datetime import date
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session, selectinload
import json

from app.models.daily_report import DailyReport, DailyReportRisk, DailyReportRecommendation
from app.services.gemini_service import GeminiService, get_gemini_service


class DailyReportService:
    """일일 리포트 서비스"""

    def __init__(self, db: Session, gemini_service: Optional[GeminiService] = None):
        self.db = db
        self._gemini_service = gemini_service or get_gemini_service()

    async def generate_from_analysis(
        self,
        analysis_data: Dict[str, Any],
        db: Session,
    ) -> Dict[str, Any]:
        """
        비디오 분석 결과를 기반으로 일일 리포트를 생성하고 DB에 저장합니다.
        
        Args:
            analysis_data: 비디오 분석 결과 딕셔너리
            db: 데이터베이스 세션
            
        Returns:
            리포트 데이터 딕셔너리 (report_id 포함)
        """
        print("=" * 60)
        print("[리포트 생성] 시작")
        print("=" * 60)
        
        try:
            # 1. Gemini로 리포트 데이터 생성
            print("[1단계] Gemini로 리포트 데이터 생성 중...")
            report_data = await self._gemini_service.analyze_for_daily_report(analysis_data)
            
            if not isinstance(report_data, dict):
                if hasattr(report_data, 'dict'):
                    report_data = report_data.dict()
                elif hasattr(report_data, '__dict__'):
                    report_data = report_data.__dict__
                else:
                    report_data = dict(report_data)
            
            print(f"[1단계 완료] 리포트 데이터 생성 완료")
            
            # 2. DB에 저장
            print("[2단계] DB에 리포트 저장 중...")
            user_id = "default_user"  # TODO: 실제 인증에서 가져오기
            report_date = date.today()
            
            # 리포트 기본 정보 추출
            safety_metrics = report_data.get("safety_metrics", {})
            safety_score = float(safety_metrics.get("safe_zone_percentage", 0))
            total_monitoring_time = int(analysis_data.get("total_monitoring_time", 0) or 0)
            incident_count = int(analysis_data.get("total_incidents", 0))
            safe_zone_percentage = float(safety_metrics.get("safe_zone_percentage", 0))
            activity_level = str(safety_metrics.get("activity_level", "medium"))
            ai_summary = str(report_data.get("overall_summary", ""))
            time_slots = report_data.get("time_slots", [])
            
            # 리포트 생성
            daily_report = DailyReport(
                user_id=user_id,
                report_date=report_date,
                safety_score=safety_score,
                total_monitoring_time=total_monitoring_time,
                incident_count=incident_count,
                safe_zone_percentage=safe_zone_percentage,
                activity_level=activity_level,
                ai_summary=ai_summary,
                hourly_activity_json=json.dumps(time_slots, ensure_ascii=False)
            )
            db.add(daily_report)
            db.flush()
            
            print(f"[2-1] 리포트 기본 정보 저장: report_id={daily_report.id}")
            
            # 위험 항목 저장
            risk_count = 0
            for risk_data in report_data.get("risk_priorities", []):
                try:
                    risk = DailyReportRisk(
                        daily_report_id=daily_report.id,
                        level=str(risk_data.get("level", "low")).lower(),
                        title=str(risk_data.get("title", "")),
                        description=str(risk_data.get("description", "")),
                        location=str(risk_data.get("location", "")),
                        time=str(risk_data.get("time", "")),
                        count=int(risk_data.get("count", 1))
                    )
                    db.add(risk)
                    risk_count += 1
                except Exception as e:
                    print(f"[경고] 위험 항목 저장 실패: {e}")
            
            print(f"[2-2] 위험 항목 {risk_count}개 저장")
            
            # 추천 사항 저장
            rec_count = 0
            for rec_data in report_data.get("action_recommendations", []):
                try:
                    recommendation = DailyReportRecommendation(
                        daily_report_id=daily_report.id,
                        priority=str(rec_data.get("priority", "low")).lower(),
                        title=str(rec_data.get("title", "")),
                        description=str(rec_data.get("description", "")),
                        estimated_cost=str(rec_data.get("estimated_cost", "")) if rec_data.get("estimated_cost") else None,
                        difficulty=str(rec_data.get("difficulty", "")) if rec_data.get("difficulty") else None
                    )
                    db.add(recommendation)
                    rec_count += 1
                except Exception as e:
                    print(f"[경고] 추천 사항 저장 실패: {e}")
            
            print(f"[2-3] 추천 사항 {rec_count}개 저장")
            
            # 커밋
            db.commit()
            db.refresh(daily_report)
            
            # report_id 설정
            report_id = daily_report.id
            report_data["report_id"] = report_id
            
            print(f"[2단계 완료] 리포트 저장 완료: report_id={report_id}")
            print("=" * 60)
            
            return report_data
            
        except Exception as e:
            db.rollback()
            import traceback
            print(f"[오류] 리포트 생성 실패: {e}")
            print(traceback.format_exc())
            raise

    def get_latest_report(self, db: Session) -> Optional[Dict[str, Any]]:
        """가장 최근 리포트 조회"""
        try:
            report = (
                db.query(DailyReport)
                .options(
                    selectinload(DailyReport.risks),
                    selectinload(DailyReport.recommendations)
                )
                .order_by(DailyReport.created_at.desc())
                .first()
            )
            
            if not report:
                return None
            
            return self._report_to_dict(report)
        except Exception as e:
            import traceback
            print(f"[오류] 리포트 조회 실패: {e}")
            print(traceback.format_exc())
            return None

    def get_report_by_id(self, report_id: int, db: Session) -> Optional[Dict[str, Any]]:
        """리포트 ID로 리포트 조회"""
        try:
            report = (
                db.query(DailyReport)
                .options(
                    selectinload(DailyReport.risks),
                    selectinload(DailyReport.recommendations)
                )
                .filter(DailyReport.id == report_id)
                .first()
            )
            
            if not report:
                return None
            
            return self._report_to_dict(report)
        except Exception as e:
            import traceback
            print(f"[오류] 리포트 조회 실패: {e}")
            print(traceback.format_exc())
            return None

    def _report_to_dict(self, report: DailyReport) -> Dict[str, Any]:
        """리포트 모델을 딕셔너리로 변환 (그래프 데이터 포함)"""
        try:
            # time_slots 파싱
            time_slots = []
            if report.hourly_activity_json:
                try:
                    time_slots = json.loads(report.hourly_activity_json)
                except:
                    time_slots = []
            
            # risks 변환
            risk_priorities = []
            if report.risks:
                risk_priorities = [
                    {
                        "level": str(risk.level).lower(),
                        "title": str(risk.title),
                        "description": str(risk.description) if risk.description else "",
                        "location": str(risk.location) if risk.location else "",
                        "time": str(risk.time) if risk.time else "",
                        "count": int(risk.count) if risk.count else 1
                    }
                    for risk in report.risks
                ]
            
            # recommendations 변환
            action_recommendations = []
            if report.recommendations:
                action_recommendations = [
                    {
                        "priority": str(rec.priority).lower(),
                        "title": str(rec.title),
                        "description": str(rec.description),
                        "estimated_cost": str(rec.estimated_cost) if rec.estimated_cost else "",
                        "difficulty": str(rec.difficulty) if rec.difficulty else ""
                    }
                    for rec in report.recommendations
                ]
            
            # 그래프 데이터 생성
            chart_data = self._generate_chart_data(report, risk_priorities)
            
            # report_date 변환
            report_date_str = ""
            if report.report_date:
                if isinstance(report.report_date, str):
                    report_date_str = report.report_date
                else:
                    report_date_str = report.report_date.isoformat()
            
            # created_at 변환
            created_at_str = ""
            if report.created_at:
                if isinstance(report.created_at, str):
                    created_at_str = report.created_at
                else:
                    created_at_str = report.created_at.isoformat()
            
            return {
                "report_id": int(report.id),
                "report_date": report_date_str,
                "overall_summary": str(report.ai_summary) if report.ai_summary else "",
                "safety_metrics": {
                    "total_monitoring_time": f"{report.total_monitoring_time}분" if report.total_monitoring_time else "",
                    "safe_zone_percentage": int(report.safe_zone_percentage) if report.safe_zone_percentage else 0,
                    "activity_level": str(report.activity_level) if report.activity_level else "",
                    "incident_count": int(report.incident_count) if report.incident_count else 0,
                    "safety_score": float(report.safety_score) if report.safety_score else 0,
                },
                "time_slots": time_slots,
                "risk_priorities": risk_priorities,
                "action_recommendations": action_recommendations,
                "chart_data": chart_data,  # 그래프 데이터 추가
                "highlights": [],  # 팀원 모델에 없음
                "created_at": created_at_str
            }
        except Exception as e:
            import traceback
            print(f"[오류] 리포트 변환 실패: {e}")
            print(traceback.format_exc())
            return {
                "report_id": report.id if hasattr(report, 'id') else None,
                "report_date": "",
                "overall_summary": "",
                "safety_metrics": {
                    "total_monitoring_time": "",
                    "safe_zone_percentage": 0,
                    "activity_level": "",
                    "incident_count": 0,
                    "safety_score": 0,
                },
                "time_slots": [],
                "risk_priorities": [],
                "action_recommendations": [],
                "chart_data": {},
                "highlights": [],
                "created_at": ""
            }

    def _generate_chart_data(self, report: DailyReport, risk_priorities: List[Dict]) -> Dict[str, Any]:
        """그래프 데이터 생성"""
        try:
            # 1. 위험도 분포 데이터 (파이 차트용)
            risk_distribution = {"high": 0, "medium": 0, "low": 0}
            for risk in risk_priorities:
                level = risk.get("level", "low")
                count = risk.get("count", 1)
                if level in risk_distribution:
                    risk_distribution[level] += count
            
            risk_pie_data = [
                {"name": "높음", "value": risk_distribution["high"], "color": "#ef4444"},
                {"name": "중간", "value": risk_distribution["medium"], "color": "#f59e0b"},
                {"name": "낮음", "value": risk_distribution["low"], "color": "#10b981"},
            ]
            
            # 2. 시간대별 활동 데이터 (라인 차트용)
            hourly_data = []
            if report.hourly_activity_json:
                try:
                    time_slots = json.loads(report.hourly_activity_json)
                    for slot in time_slots:
                        hourly_data.append({
                            "time": slot.get("time_range", ""),
                            "activity": self._convert_activity_to_number(slot.get("activity", "")),
                            "incidents": slot.get("incidents", 0),
                            "safety_score": slot.get("safety_score", 0),
                        })
                except:
                    pass
            
            # 3. 안전 지표 요약 (게이지 차트용)
            safety_indicators = {
                "safety_score": float(report.safety_score) if report.safety_score else 0,
                "safe_zone_percentage": float(report.safe_zone_percentage) if report.safe_zone_percentage else 0,
                "incident_count": int(report.incident_count) if report.incident_count else 0,
            }
            
            return {
                "risk_distribution": risk_pie_data,
                "hourly_activity": hourly_data,
                "safety_indicators": safety_indicators,
            }
        except Exception as e:
            print(f"[경고] 그래프 데이터 생성 실패: {e}")
            return {
                "risk_distribution": [],
                "hourly_activity": [],
                "safety_indicators": {},
            }

    def _convert_activity_to_number(self, activity_str: str) -> int:
        """활동 수준 문자열을 숫자로 변환"""
        if not activity_str:
            return 50
        
        activity_lower = activity_str.lower()
        if "낮은" in activity_lower or "low" in activity_lower:
            return 30
        elif "높은" in activity_lower or "high" in activity_lower:
            return 90
        else:  # 중간 또는 기본값
            return 60


def get_daily_report_service(db: Session) -> DailyReportService:
    """일일 리포트 서비스 인스턴스 생성"""
    return DailyReportService(db)
