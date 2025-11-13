"""일일 리포트 데이터베이스 리포지토리"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.daily_report.models import (
    Video,
    VideoAnalysis,
    TimelineEvent,
    AnalysisRecommendation,
    DailyReport,
    ReportTimeSlot,
    ReportRiskPriority,
    ReportActionRecommendation,
    Highlight,
    EventType,
    SeverityLevel,
    PriorityLevel,
)


class DailyReportRepository:
    """일일 리포트 데이터베이스 리포지토리"""

    def __init__(self, db: Session):
        self.db = db

    def save_video(self, filename: str, file_path: str, file_size: int = None, 
                   duration: float = None, mime_type: str = None) -> Video:
        """비디오 파일 정보 저장"""
        video = Video(
            filename=filename,
            file_path=file_path,
            file_size=file_size,
            duration=duration,
            mime_type=mime_type
        )
        self.db.add(video)
        self.db.commit()
        self.db.refresh(video)
        return video

    def save_video_analysis(
        self,
        video_id: int,
        analysis_data: Dict[str, Any]
    ) -> VideoAnalysis:
        """비디오 분석 결과 저장"""
        analysis = VideoAnalysis(
            video_id=video_id,
            total_incidents=analysis_data.get("total_incidents", 0),
            falls=analysis_data.get("falls", 0),
            dangerous_actions=analysis_data.get("dangerous_actions", 0),
            safety_score=analysis_data.get("safety_score", 0),
            summary=analysis_data.get("summary", "")
        )
        self.db.add(analysis)
        self.db.flush()

        # 타임라인 이벤트 저장
        for event_data in analysis_data.get("timeline_events", []):
            event = TimelineEvent(
                analysis_id=analysis.id,
                timestamp=event_data.get("timestamp", "00:00:00"),
                type=EventType(event_data.get("type", "safe")),
                description=event_data.get("description", ""),
                severity=SeverityLevel(event_data.get("severity", "low"))
            )
            self.db.add(event)

        # 추천 사항 저장
        for rec in analysis_data.get("recommendations", []):
            recommendation = AnalysisRecommendation(
                analysis_id=analysis.id,
                recommendation=rec
            )
            self.db.add(recommendation)

        self.db.commit()
        self.db.refresh(analysis)
        return analysis

    def save_daily_report(
        self,
        analysis_id: int,
        report_data: Dict[str, Any],
        video_path: Optional[str] = None
    ) -> DailyReport:
        """일일 리포트 저장"""
        # 리포트 기본 정보
        report = DailyReport(
            analysis_id=analysis_id,
            report_date=datetime.now(),
            overall_summary=report_data.get("overall_summary", ""),
            total_monitoring_time=report_data.get("safety_metrics", {}).get("total_monitoring_time"),
            safe_zone_percentage=report_data.get("safety_metrics", {}).get("safe_zone_percentage"),
            activity_level=report_data.get("safety_metrics", {}).get("activity_level")
        )
        self.db.add(report)
        self.db.flush()

        # 시간대별 활동 저장
        for slot_data in report_data.get("time_slots", []):
            time_slot = ReportTimeSlot(
                report_id=report.id,
                time_range=slot_data.get("time", ""),
                activity=slot_data.get("activity", ""),
                safety_score=slot_data.get("safety_score", 0),
                incidents=slot_data.get("incidents", 0),
                summary=slot_data.get("summary", "")
            )
            self.db.add(time_slot)

        # 위험도 우선순위 저장
        for risk_data in report_data.get("risk_priorities", []):
            # Enum 값 정규화 (소문자로 변환)
            level_str = risk_data.get("level", "low").lower()
            try:
                risk = ReportRiskPriority(
                    report_id=report.id,
                    level=SeverityLevel(level_str),
                    title=risk_data.get("title", ""),
                    description=risk_data.get("description", ""),
                    location=risk_data.get("location", ""),
                    time_range=risk_data.get("time", ""),
                    count=risk_data.get("count", 1)
                )
                self.db.add(risk)
            except ValueError as e:
                print(f"[경고] 위험도 우선순위 저장 실패 (level={level_str}): {e}")
                # 기본값으로 저장
                risk = ReportRiskPriority(
                    report_id=report.id,
                    level=SeverityLevel.LOW,
                    title=risk_data.get("title", ""),
                    description=risk_data.get("description", ""),
                    location=risk_data.get("location", ""),
                    time_range=risk_data.get("time", ""),
                    count=risk_data.get("count", 1)
                )
                self.db.add(risk)

        # 실행 리스트 저장
        for action_data in report_data.get("action_recommendations", []):
            # Enum 값 정규화 (소문자로 변환)
            priority_str = action_data.get("priority", "low").lower()
            try:
                action = ReportActionRecommendation(
                    report_id=report.id,
                    priority=PriorityLevel(priority_str),
                    title=action_data.get("title", ""),
                    description=action_data.get("description", ""),
                    estimated_cost=action_data.get("estimated_cost"),
                    difficulty=action_data.get("difficulty")
                )
                self.db.add(action)
            except ValueError as e:
                print(f"[경고] 실행 리스트 저장 실패 (priority={priority_str}): {e}")
                # 기본값으로 저장
                action = ReportActionRecommendation(
                    report_id=report.id,
                    priority=PriorityLevel.LOW,
                    title=action_data.get("title", ""),
                    description=action_data.get("description", ""),
                    estimated_cost=action_data.get("estimated_cost"),
                    difficulty=action_data.get("difficulty")
                )
                self.db.add(action)

        # 하이라이트 영상 저장
        for highlight_data in report_data.get("highlights", []):
            # Enum 값 정규화 (소문자로 변환)
            severity_str = highlight_data.get("severity", "medium").lower()
            try:
                highlight = Highlight(
                    report_id=report.id,
                    title=highlight_data.get("title", ""),
                    timestamp=highlight_data.get("timestamp", ""),
                    duration=highlight_data.get("duration", ""),
                    location=highlight_data.get("location", ""),
                    severity=SeverityLevel(severity_str),
                    description=highlight_data.get("description", ""),
                    video_url=highlight_data.get("video_url"),
                    thumbnail_url=highlight_data.get("thumbnail_url")
                )
                self.db.add(highlight)
            except ValueError as e:
                print(f"[경고] 하이라이트 저장 실패 (severity={severity_str}): {e}")
                # 기본값으로 저장
                highlight = Highlight(
                    report_id=report.id,
                    title=highlight_data.get("title", ""),
                    timestamp=highlight_data.get("timestamp", ""),
                    duration=highlight_data.get("duration", ""),
                    location=highlight_data.get("location", ""),
                    severity=SeverityLevel.MEDIUM,
                    description=highlight_data.get("description", ""),
                    video_url=highlight_data.get("video_url"),
                    thumbnail_url=highlight_data.get("thumbnail_url")
                )
                self.db.add(highlight)

        self.db.commit()
        self.db.refresh(report)
        
        # 저장 확인 로그 (lazy loading을 피하기 위해 직접 쿼리)
        time_slots_count = self.db.query(ReportTimeSlot).filter(ReportTimeSlot.report_id == report.id).count()
        risk_priorities_count = self.db.query(ReportRiskPriority).filter(ReportRiskPriority.report_id == report.id).count()
        action_recommendations_count = self.db.query(ReportActionRecommendation).filter(ReportActionRecommendation.report_id == report.id).count()
        highlights_count = self.db.query(Highlight).filter(Highlight.report_id == report.id).count()
        
        print(f"[성공] 리포트 저장 완료:")
        print(f"   - report_id: {report.id}")
        print(f"   - analysis_id: {report.analysis_id}")
        print(f"   - time_slots: {time_slots_count}개")
        print(f"   - risk_priorities: {risk_priorities_count}개")
        print(f"   - action_recommendations: {action_recommendations_count}개")
        print(f"   - highlights: {highlights_count}개")
        
        return report

    def get_daily_report_by_analysis_id(self, analysis_id: int) -> Optional[DailyReport]:
        """분석 ID로 리포트 조회 (모든 관계 데이터 포함)"""
        return (
            self.db.query(DailyReport)
            .options(
                selectinload(DailyReport.time_slots),
                selectinload(DailyReport.risk_priorities),
                selectinload(DailyReport.action_recommendations),
                selectinload(DailyReport.highlights)
            )
            .filter(DailyReport.analysis_id == analysis_id)
            .first()
        )

    def get_daily_report_by_id(self, report_id: int) -> Optional[DailyReport]:
        """리포트 ID로 리포트 조회 (모든 관계 데이터 포함)"""
        return (
            self.db.query(DailyReport)
            .options(
                selectinload(DailyReport.time_slots),
                selectinload(DailyReport.risk_priorities),
                selectinload(DailyReport.action_recommendations),
                selectinload(DailyReport.highlights)
            )
            .filter(DailyReport.id == report_id)
            .first()
        )

    def get_latest_daily_report(self) -> Optional[DailyReport]:
        """가장 최근 리포트 조회 (모든 관계 데이터 포함)"""
        try:
            # 먼저 리포트가 있는지 확인
            count = self.db.query(DailyReport).count()
            print(f"[DB] 저장된 리포트 총 개수: {count}")
            
            if count == 0:
                print("[경고] DB에 리포트가 없습니다.")
                return None
            
            # 최신 리포트 조회
            report = (
                self.db.query(DailyReport)
                .options(
                    selectinload(DailyReport.time_slots),
                    selectinload(DailyReport.risk_priorities),
                    selectinload(DailyReport.action_recommendations),
                    selectinload(DailyReport.highlights)
                )
                .order_by(DailyReport.created_at.desc())
                .first()
            )
            
            if report:
                print(f"[성공] 최신 리포트 조회: report_id={report.id}, analysis_id={report.analysis_id}, created_at={report.created_at}")
                # 관계 데이터 확인
                print(f"   - time_slots: {len(report.time_slots) if report.time_slots else 0}개")
                print(f"   - risk_priorities: {len(report.risk_priorities) if report.risk_priorities else 0}개")
                print(f"   - action_recommendations: {len(report.action_recommendations) if report.action_recommendations else 0}개")
                print(f"   - highlights: {len(report.highlights) if report.highlights else 0}개")
            else:
                print("[경고] 최신 리포트 조회 결과가 None입니다.")
            
            return report
        except Exception as e:
            import traceback
            print(f"[오류] 리포트 조회 중 오류: {e}")
            print(traceback.format_exc())
            return None

    def get_video_analysis_by_id(self, analysis_id: int) -> Optional[VideoAnalysis]:
        """분석 ID로 분석 결과 조회"""
        return self.db.query(VideoAnalysis).filter(
            VideoAnalysis.id == analysis_id
        ).first()

