"""일일 리포트 관련 데이터베이스 모델"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base


class EventType(str, enum.Enum):
    """이벤트 타입"""
    FALL = "fall"
    DANGER = "danger"
    WARNING = "warning"
    SAFE = "safe"


class SeverityLevel(str, enum.Enum):
    """심각도 레벨"""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class PriorityLevel(str, enum.Enum):
    """우선순위 레벨"""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class Video(Base):
    """비디오 파일 정보"""
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    filename = Column(String(255), nullable=False, comment="원본 파일명")
    file_path = Column(String(500), nullable=False, comment="저장된 파일 경로")
    file_size = Column(Integer, comment="파일 크기 (bytes)")
    duration = Column(Float, comment="비디오 길이 (초)")
    mime_type = Column(String(100), comment="MIME 타입")
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # 관계
    analyses = relationship("VideoAnalysis", back_populates="video", cascade="all, delete-orphan")


class VideoAnalysis(Base):
    """비디오 분석 결과"""
    __tablename__ = "video_analyses"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    video_id = Column(Integer, ForeignKey("videos.id", ondelete="CASCADE"), nullable=False, index=True)
    total_incidents = Column(Integer, default=0, nullable=False)
    falls = Column(Integer, default=0, nullable=False)
    dangerous_actions = Column(Integer, default=0, nullable=False)
    safety_score = Column(Integer, nullable=False, comment="안전도 점수 (0-100)")
    summary = Column(Text, nullable=False, comment="전체 요약")
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    # 관계
    video = relationship("Video", back_populates="analyses")
    timeline_events = relationship("TimelineEvent", back_populates="analysis", cascade="all, delete-orphan")
    recommendations = relationship("AnalysisRecommendation", back_populates="analysis", cascade="all, delete-orphan")
    daily_reports = relationship("DailyReport", back_populates="analysis", cascade="all, delete-orphan")


class TimelineEvent(Base):
    """타임라인 이벤트"""
    __tablename__ = "timeline_events"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    analysis_id = Column(Integer, ForeignKey("video_analyses.id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(String(20), nullable=False, comment="이벤트 발생 시간 (예: 00:00:05)")
    type = Column(Enum(EventType), nullable=False, comment="이벤트 타입")
    description = Column(Text, nullable=False, comment="이벤트 설명")
    severity = Column(Enum(SeverityLevel), nullable=False, comment="심각도")
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    # 관계
    analysis = relationship("VideoAnalysis", back_populates="timeline_events")
    highlights = relationship("Highlight", back_populates="event", cascade="all, delete-orphan")


class AnalysisRecommendation(Base):
    """분석 추천 사항"""
    __tablename__ = "analysis_recommendations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    analysis_id = Column(Integer, ForeignKey("video_analyses.id", ondelete="CASCADE"), nullable=False, index=True)
    recommendation = Column(Text, nullable=False, comment="추천 사항 내용")
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    # 관계
    analysis = relationship("VideoAnalysis", back_populates="recommendations")


class DailyReport(Base):
    """일일 리포트"""
    __tablename__ = "daily_reports"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    analysis_id = Column(Integer, ForeignKey("video_analyses.id", ondelete="CASCADE"), nullable=False, index=True)
    report_date = Column(DateTime, nullable=False, index=True, comment="리포트 날짜")
    overall_summary = Column(Text, nullable=False, comment="종합 요약")
    total_monitoring_time = Column(String(50), comment="총 모니터링 시간")
    safe_zone_percentage = Column(Integer, comment="세이프존 체류율")
    activity_level = Column(String(50), comment="활동 지수")
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # 관계
    analysis = relationship("VideoAnalysis", back_populates="daily_reports")
    time_slots = relationship("ReportTimeSlot", back_populates="report", cascade="all, delete-orphan")
    risk_priorities = relationship("ReportRiskPriority", back_populates="report", cascade="all, delete-orphan")
    action_recommendations = relationship("ReportActionRecommendation", back_populates="report", cascade="all, delete-orphan")
    highlights = relationship("Highlight", back_populates="report", cascade="all, delete-orphan")


class ReportTimeSlot(Base):
    """리포트 시간대별 활동"""
    __tablename__ = "report_time_slots"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    report_id = Column(Integer, ForeignKey("daily_reports.id", ondelete="CASCADE"), nullable=False, index=True)
    time_range = Column(String(50), nullable=False, comment="시간대 (예: 09:00 - 12:00)")
    activity = Column(String(50), comment="활동량 (낮은/중간/높은)")
    safety_score = Column(Integer, nullable=False, comment="안전도 점수")
    incidents = Column(Integer, default=0, nullable=False, comment="사건 수")
    summary = Column(Text, comment="시간대별 요약")
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    # 관계
    report = relationship("DailyReport", back_populates="time_slots")


class ReportRiskPriority(Base):
    """리포트 위험도 우선순위"""
    __tablename__ = "report_risk_priorities"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    report_id = Column(Integer, ForeignKey("daily_reports.id", ondelete="CASCADE"), nullable=False, index=True)
    level = Column(Enum(SeverityLevel), nullable=False, comment="위험도 레벨")
    title = Column(String(255), nullable=False, comment="위험 제목")
    description = Column(Text, nullable=False, comment="설명")
    location = Column(String(255), comment="위치")
    time_range = Column(String(50), comment="시간 범위")
    count = Column(Integer, default=1, nullable=False, comment="반복 횟수")
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    # 관계
    report = relationship("DailyReport", back_populates="risk_priorities")


class ReportActionRecommendation(Base):
    """리포트 실행 리스트"""
    __tablename__ = "report_action_recommendations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    report_id = Column(Integer, ForeignKey("daily_reports.id", ondelete="CASCADE"), nullable=False, index=True)
    priority = Column(Enum(PriorityLevel), nullable=False, comment="우선순위")
    title = Column(String(255), nullable=False, comment="제목")
    description = Column(Text, nullable=False, comment="설명")
    estimated_cost = Column(String(100), comment="예상 비용")
    difficulty = Column(String(50), comment="난이도")
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    # 관계
    report = relationship("DailyReport", back_populates="action_recommendations")


class Highlight(Base):
    """하이라이트 영상"""
    __tablename__ = "highlights"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    report_id = Column(Integer, ForeignKey("daily_reports.id", ondelete="CASCADE"), nullable=True, index=True)
    event_id = Column(Integer, ForeignKey("timeline_events.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(255), nullable=False, comment="제목")
    timestamp = Column(String(20), nullable=False, comment="발생 시각")
    duration = Column(String(20), nullable=False, comment="영상 길이")
    location = Column(String(255), comment="위치")
    severity = Column(Enum(SeverityLevel), nullable=False, comment="심각도")
    description = Column(Text, nullable=False, comment="설명")
    video_url = Column(String(500), comment="비디오 URL")
    thumbnail_url = Column(String(500), comment="썸네일 URL")
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    # 관계
    report = relationship("DailyReport", back_populates="highlights")
    event = relationship("TimelineEvent", back_populates="highlights")

