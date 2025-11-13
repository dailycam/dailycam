"""Service layer for daily report features."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.schemas.daily_report import DailyReportRequest, DailyReportResponse
from app.services.gemini_service import GeminiService, get_gemini_service
from app.services.daily_report.highlight_generator import HighlightGenerator
from app.models.daily_report import DailyReport, DailyReportRisk, DailyReportRecommendation
import traceback
import json


@dataclass(slots=True)
class DailyReportServiceConfig:
    """Configuration for the daily report service."""

    default_sections: tuple[str, ...] = ("summary", "events", "recommendations")


class DailyReportService:
    """Business logic for daily reports."""

    def __init__(
        self,
        config: DailyReportServiceConfig,
        gemini_service: GeminiService,
        highlight_generator: Optional[HighlightGenerator] = None
    ) -> None:
        self._config = config
        self._gemini_service = gemini_service
        self._highlight_generator = highlight_generator or HighlightGenerator()

    async def generate(self, payload: DailyReportRequest) -> DailyReportResponse:
        """Generate a daily report. Placeholder for future implementation."""
        return DailyReportResponse(
            date=payload.date,
            sections=list(self._config.default_sections),
            summary="Daily report service not yet implemented.",
        )

    async def generate_from_analysis(
        self,
        analysis_data: dict,
        video_path: Optional[str] = None,
        video_id: Optional[int] = None,
        analysis_id: Optional[int] = None,
        db: Optional[Session] = None
    ) -> dict:
        """
        비디오 분석 결과를 기반으로 일일 리포트를 생성합니다.
        
        Args:
            analysis_data: 비디오 분석 결과 딕셔너리
            video_path: 원본 비디오 파일 경로 (하이라이트 생성용, 선택사항)
            video_id: 비디오 ID (DB 저장용)
            analysis_id: 분석 ID (DB 저장용)
            db: 데이터베이스 세션
            
        Returns:
            리포트 데이터 딕셔너리 (하이라이트 정보 포함, 리포트 ID 포함)
        """
        # Gemini를 사용하여 리포트 데이터 생성
        report_data = await self._gemini_service.analyze_for_daily_report(analysis_data)
        
        # report_data가 딕셔너리가 아닌 경우 딕셔너리로 변환
        if not isinstance(report_data, dict):
            if hasattr(report_data, 'dict'):
                report_data = report_data.dict()
            elif hasattr(report_data, '__dict__'):
                report_data = report_data.__dict__
            else:
                report_data = dict(report_data)
        
        # 하이라이트 영상 생성 (비디오 경로가 제공된 경우)
        if video_path and Path(video_path).exists():
            try:
                timeline_events = analysis_data.get("timeline_events", [])
                highlights = self._highlight_generator.generate_highlights(
                    video_path=video_path,
                    timeline_events=timeline_events
                )
                report_data["highlights"] = highlights
            except Exception as e:
                print(f"[경고] 하이라이트 생성 실패: {e}")
                report_data["highlights"] = []
        else:
            report_data["highlights"] = []
        
        # 데이터베이스에 저장 (세션이 제공된 경우) - 팀원의 DB 구조 사용
        if db:
            try:
                # 팀원의 DailyReport 모델 사용
                from datetime import date
                user_id = "default_user"  # TODO: 실제 인증에서 가져오기
                report_date = date.today()
                
                # 리포트 생성
                daily_report = DailyReport(
                    user_id=user_id,
                    report_date=report_date,
                    safety_score=float(report_data.get("safety_metrics", {}).get("safe_zone_percentage", 0)),
                    total_monitoring_time=0,  # TODO: 실제 모니터링 시간 계산
                    incident_count=analysis_data.get("total_incidents", 0),
                    safe_zone_percentage=float(report_data.get("safety_metrics", {}).get("safe_zone_percentage", 0)),
                    activity_level=report_data.get("safety_metrics", {}).get("activity_level", "medium"),
                    ai_summary=report_data.get("overall_summary", ""),
                    hourly_activity_json=json.dumps(report_data.get("time_slots", []), ensure_ascii=False)
                )
                db.add(daily_report)
                db.flush()
                
                # 위험 항목 저장
                for risk_data in report_data.get("risk_priorities", []):
                    risk = DailyReportRisk(
                        daily_report_id=daily_report.id,
                        level=risk_data.get("level", "low").lower(),
                        title=risk_data.get("title", ""),
                        description=risk_data.get("description", ""),
                        location=risk_data.get("location", ""),
                        time=risk_data.get("time", ""),
                        count=risk_data.get("count", 1)
                    )
                    db.add(risk)
                
                # 추천 사항 저장
                for rec_data in report_data.get("action_recommendations", []):
                    recommendation = DailyReportRecommendation(
                        daily_report_id=daily_report.id,
                        priority=rec_data.get("priority", "low").lower(),
                        title=rec_data.get("title", ""),
                        description=rec_data.get("description", ""),
                        estimated_cost=rec_data.get("estimated_cost"),
                        difficulty=rec_data.get("difficulty")
                    )
                    db.add(recommendation)
                
                db.commit()
                db.refresh(daily_report)
                
                # report_id 설정
                report_id = daily_report.id
                report_data["report_id"] = report_id
                
                if daily_report.created_at:
                    if isinstance(daily_report.created_at, str):
                        report_data["created_at"] = daily_report.created_at
                    else:
                        report_data["created_at"] = daily_report.created_at.isoformat()
                else:
                    report_data["created_at"] = ""
                
                print(f"[성공] 리포트 저장 완료: report_id={report_id}")
            except Exception as e:
                import traceback
                print(f"[오류] 리포트 DB 저장 중 오류 발생: {e}")
                print(traceback.format_exc())
                db.rollback()
        else:
            print(f"[경고] 리포트 DB 저장 스킵: db가 제공되지 않음")
        
        # 최종 확인
        print(f"[디버그] 반환 전 리포트 데이터 키: {list(report_data.keys())}")
        print(f"[디버그] 반환 전 report_id: {report_data.get('report_id')}")
        
        return report_data

    def get_report_by_id(self, report_id: int, db: Session) -> Optional[Dict[str, Any]]:
        """리포트 ID로 리포트 조회"""
        report = db.query(DailyReport).filter(DailyReport.id == report_id).first()
        
        if not report:
            return None
        
        return self._report_to_dict(report)

    def get_latest_report(self, db: Session) -> Optional[Dict[str, Any]]:
        """가장 최근 리포트 조회"""
        try:
            print("[서비스] get_latest_report 시작")
            
            report = db.query(DailyReport).order_by(DailyReport.created_at.desc()).first()
            print(f"[서비스] 리포트 조회 완료: report={report is not None}")
            
            if not report:
                print("[경고] 최신 리포트가 없습니다.")
                return None
            
            print(f"[성공] 리포트 조회 성공: report_id={report.id}")
            print(f"[서비스] _report_to_dict 호출 전")
            result = self._report_to_dict(report)
            print(f"[서비스] _report_to_dict 완료: report_id={result.get('report_id')}")
            return result
        except Exception as e:
            import traceback
            print(f"[오류] 리포트 조회 실패: {e}")
            print(traceback.format_exc())
            return None

    def _report_to_dict(self, report: DailyReport) -> Dict[str, Any]:
        """리포트 모델을 딕셔너리로 변환 (팀원의 DB 구조 사용)"""
        try:
            # time_slots는 hourly_activity_json에서 파싱
            time_slots = []
            try:
                if report.hourly_activity_json:
                    time_slots = json.loads(report.hourly_activity_json)
            except Exception as e:
                print(f"[경고] time_slots 파싱 실패: {e}")
                time_slots = []
            
            # risks 관계 데이터 변환
            risk_priorities = []
            try:
                if hasattr(report, 'risks') and report.risks:
                    risk_priorities = [
                        {
                            "level": risk.level.lower() if risk.level else "low",
                            "title": risk.title or "",
                            "description": risk.description or "",
                            "location": risk.location or "",
                            "time": risk.time or "",
                            "count": risk.count or 1
                        }
                        for risk in report.risks
                    ]
            except Exception as e:
                print(f"[경고] risks 변환 실패: {e}")
                import traceback
                print(traceback.format_exc())
                risk_priorities = []
            
            # recommendations 관계 데이터 변환
            action_recommendations = []
            try:
                if hasattr(report, 'recommendations') and report.recommendations:
                    action_recommendations = [
                        {
                            "priority": rec.priority.lower() if rec.priority else "low",
                            "title": rec.title or "",
                            "description": rec.description or "",
                            "estimated_cost": rec.estimated_cost or "",
                            "difficulty": rec.difficulty or ""
                        }
                        for rec in report.recommendations
                    ]
            except Exception as e:
                print(f"[경고] recommendations 변환 실패: {e}")
                import traceback
                print(traceback.format_exc())
                action_recommendations = []
            
            # highlights는 팀원 모델에 없으므로 빈 배열
            highlights = []
        
            # report_date 처리
            report_date_str = ""
            try:
                if report.report_date:
                    if isinstance(report.report_date, str):
                        report_date_str = report.report_date
                    else:
                        report_date_str = report.report_date.isoformat()
            except Exception as e:
                print(f"[경고] report_date 변환 실패: {e}")
                report_date_str = ""
            
            # created_at 처리
            created_at_str = ""
            try:
                if report.created_at:
                    if isinstance(report.created_at, str):
                        created_at_str = report.created_at
                    else:
                        created_at_str = report.created_at.isoformat()
            except Exception as e:
                print(f"[경고] created_at 변환 실패: {e}")
                created_at_str = ""
            
            result = {
                "report_id": report.id,
                "report_date": report_date_str,
                "overall_summary": report.ai_summary or "",
                "safety_metrics": {
                    "total_monitoring_time": f"{report.total_monitoring_time}분" if report.total_monitoring_time else "",
                    "safe_zone_percentage": int(report.safe_zone_percentage) if report.safe_zone_percentage else 0,
                    "activity_level": report.activity_level or ""
                },
                "time_slots": time_slots,
                "risk_priorities": risk_priorities,
                "action_recommendations": action_recommendations,
                "highlights": highlights,
                "created_at": created_at_str
            }
            
            print(f"[디버그] _report_to_dict 완료: report_id={result.get('report_id')}, keys={list(result.keys())}")
            return result
            
        except Exception as e:
            import traceback
            print(f"[오류] _report_to_dict 실패: {e}")
            print(traceback.format_exc())
            # 최소한의 데이터라도 반환
            return {
                "report_id": report.id if hasattr(report, 'id') else None,
                "report_date": "",
                "overall_summary": report.ai_summary or "" if hasattr(report, 'ai_summary') else "",
                "safety_metrics": {
                    "total_monitoring_time": "",
                    "safe_zone_percentage": 0,
                    "activity_level": ""
                },
                "time_slots": [],
                "risk_priorities": [],
                "action_recommendations": [],
                "highlights": [],
                "created_at": ""
            }


def get_daily_report_service() -> DailyReportService:
    """FastAPI dependency injector for DailyReportService."""
    config = DailyReportServiceConfig()
    gemini_service = get_gemini_service()
    highlight_generator = HighlightGenerator()
    return DailyReportService(
        config=config,
        gemini_service=gemini_service,
        highlight_generator=highlight_generator
    )


