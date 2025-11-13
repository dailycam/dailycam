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
from app.services.daily_report.repository import DailyReportRepository
from app.models.daily_report.models import DailyReport, VideoAnalysis
import traceback


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
        
        # 데이터베이스에 저장 (세션이 제공된 경우)
        if db and analysis_id:
            try:
                repository = DailyReportRepository(db)
                saved_report = repository.save_daily_report(
                    analysis_id=analysis_id,
                    report_data=report_data,
                    video_path=video_path
                )
                # report_id를 명확하게 설정 (예외가 발생해도 report_id는 설정)
                report_id = saved_report.id
                report_data["report_id"] = report_id
                report_data["analysis_id"] = analysis_id  # analysis_id도 명확하게 설정
                
                if saved_report.created_at:
                    if isinstance(saved_report.created_at, str):
                        report_data["created_at"] = saved_report.created_at
                    else:
                        report_data["created_at"] = saved_report.created_at.isoformat()
                else:
                    report_data["created_at"] = ""
                
                print(f"[성공] 리포트 저장 완료: report_id={report_id}, analysis_id={analysis_id}")
                print(f"[디버그] 리포트 데이터에 report_id 추가됨: {report_data.get('report_id')}")
            except Exception as e:
                import traceback
                print(f"[오류] 리포트 DB 저장 중 오류 발생: {e}")
                print(traceback.format_exc())
                
                # 리포트는 저장되었지만 관계 데이터 로드 중 오류가 발생한 경우
                # report_id를 DB에서 다시 조회
                try:
                    from app.models.daily_report.models import DailyReport
                    existing_report = db.query(DailyReport).filter(
                        DailyReport.analysis_id == analysis_id
                    ).order_by(DailyReport.created_at.desc()).first()
                    
                    if existing_report:
                        report_id = existing_report.id
                        report_data["report_id"] = report_id
                        report_data["analysis_id"] = analysis_id
                        print(f"[복구] DB에서 리포트 ID 찾음: report_id={report_id}")
                    else:
                        print(f"[경고] 리포트 ID를 찾을 수 없습니다.")
                except Exception as recovery_error:
                    print(f"[경고] 리포트 ID 복구 실패: {recovery_error}")
                
                # 저장 실패해도 리포트 데이터는 반환 (report_id가 있으면 포함)
        else:
            print(f"[경고] 리포트 DB 저장 스킵: db={db is not None}, analysis_id={analysis_id}")
        
        # 최종 확인
        print(f"[디버그] 반환 전 리포트 데이터 키: {list(report_data.keys())}")
        print(f"[디버그] 반환 전 report_id: {report_data.get('report_id')}")
        
        return report_data

    def get_report_by_id(self, report_id: int, db: Session) -> Optional[Dict[str, Any]]:
        """리포트 ID로 리포트 조회"""
        repository = DailyReportRepository(db)
        report = repository.get_daily_report_by_id(report_id)
        
        if not report:
            return None
        
        return self._report_to_dict(report)

    def get_latest_report(self, db: Session) -> Optional[Dict[str, Any]]:
        """가장 최근 리포트 조회"""
        try:
            print("[서비스] get_latest_report 시작")
            repository = DailyReportRepository(db)
            print("[서비스] repository 생성 완료")
            
            report = repository.get_latest_daily_report()
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
        """리포트 모델을 딕셔너리로 변환"""
        try:
            # 관계 데이터가 로드되었는지 확인하고 안전하게 변환
            time_slots = []
            try:
                if hasattr(report, 'time_slots') and report.time_slots:
                    time_slots = [
                        {
                            "time": slot.time_range or "",
                            "activity": slot.activity or "",
                            "safety_score": slot.safety_score or 0,
                            "incidents": slot.incidents or 0,
                            "summary": slot.summary or ""
                        }
                        for slot in report.time_slots
                    ]
            except Exception as e:
                print(f"[경고] time_slots 변환 실패: {e}")
                time_slots = []
            
            risk_priorities = []
            try:
                if hasattr(report, 'risk_priorities') and report.risk_priorities:
                    risk_priorities = [
                        {
                            "level": risk.level.value.lower() if risk.level else "low",
                            "title": risk.title or "",
                            "description": risk.description or "",
                            "location": risk.location or "",
                            "time": risk.time_range or "",
                            "count": risk.count or 1
                        }
                        for risk in report.risk_priorities
                    ]
            except Exception as e:
                print(f"[경고] risk_priorities 변환 실패: {e}")
                import traceback
                print(traceback.format_exc())
                risk_priorities = []
            
            action_recommendations = []
            try:
                if hasattr(report, 'action_recommendations') and report.action_recommendations:
                    action_recommendations = [
                        {
                            "priority": action.priority.value.lower() if action.priority else "low",
                            "title": action.title or "",
                            "description": action.description or "",
                            "estimated_cost": action.estimated_cost or "",
                            "difficulty": action.difficulty or ""
                        }
                        for action in report.action_recommendations
                    ]
            except Exception as e:
                print(f"[경고] action_recommendations 변환 실패: {e}")
                import traceback
                print(traceback.format_exc())
                action_recommendations = []
            
            highlights = []
            try:
                if hasattr(report, 'highlights') and report.highlights:
                    highlights = [
                        {
                            "id": highlight.id,
                            "title": highlight.title or "",
                            "timestamp": highlight.timestamp or "",
                            "duration": highlight.duration or "",
                            "location": highlight.location or "",
                            "severity": highlight.severity.value.lower() if highlight.severity else "medium",
                            "description": highlight.description or "",
                            "video_url": highlight.video_url or "",
                            "thumbnail_url": highlight.thumbnail_url or ""
                        }
                        for highlight in report.highlights
                    ]
            except Exception as e:
                print(f"[경고] highlights 변환 실패: {e}")
                import traceback
                print(traceback.format_exc())
                highlights = []
        
            # report_date 처리 (datetime 또는 None)
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
                "analysis_id": report.analysis_id,
                "report_date": report_date_str,
                "overall_summary": report.overall_summary or "",
                "safety_metrics": {
                    "total_monitoring_time": report.total_monitoring_time or "",
                    "safe_zone_percentage": report.safe_zone_percentage or 0,
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
                "analysis_id": report.analysis_id if hasattr(report, 'analysis_id') else None,
                "report_date": "",
                "overall_summary": report.overall_summary or "" if hasattr(report, 'overall_summary') else "",
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


