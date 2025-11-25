"""비디오 분석 결과 모델."""

from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class VideoAnalysis(Base):
    """비디오 분석 결과 모델."""

    __tablename__ = "video_analyses"

    id = Column(Integer, primary_key=True, index=True)
    video_path = Column(String(500), nullable=False, comment="비디오 파일 경로")
    video_filename = Column(String(255), comment="비디오 파일명")
    camera_id = Column(String(100), index=True, comment="카메라 ID")
    user_id = Column(String(100), index=True, comment="사용자 ID")
    
    # 분석 결과 통계
    total_incidents = Column(Integer, default=0, comment="전체 사건 수")
    falls = Column(Integer, default=0, comment="넘어짐 횟수")
    dangerous_actions = Column(Integer, default=0, comment="위험한 행동 횟수")
    safety_score = Column(Float, default=0.0, comment="안전도 점수 (0-100)")
    summary = Column(Text, comment="AI 분석 요약")
    
    # 메타데이터
    model_used = Column(String(50), default="gemini-2.5-flash", comment="사용된 AI 모델")
    analysis_duration = Column(Float, comment="분석 소요 시간 (초)")
    
    # 타임스탬프
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    analyzed_at = Column(DateTime(timezone=True), comment="분석 수행 시간")
    
    # 관계
    timeline_events = relationship("TimelineEvent", back_populates="video_analysis", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<VideoAnalysis(id={self.id}, safety_score={self.safety_score}, total_incidents={self.total_incidents})>"


class TimelineEvent(Base):
    """타임라인 이벤트 모델."""

    __tablename__ = "timeline_events"

    id = Column(Integer, primary_key=True, index=True)
    video_analysis_id = Column(Integer, ForeignKey("video_analyses.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # 이벤트 정보
    timestamp = Column(String(20), nullable=False, comment="이벤트 발생 시간 (예: 00:00:05)")
    event_type = Column(String(20), nullable=False, index=True, comment="이벤트 타입: fall, danger, warning, safe")
    description = Column(Text, nullable=False, comment="이벤트 설명")
    severity = Column(String(10), nullable=False, index=True, comment="심각도: high, medium, low")
    
    # 추가 정보
    location = Column(String(200), comment="발생 위치")
    confidence = Column(Float, comment="AI 신뢰도 (0-1)")
    
    # 타임스탬프
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 관계
    video_analysis = relationship("VideoAnalysis", back_populates="timeline_events")
    
    def __repr__(self):
        return f"<TimelineEvent(id={self.id}, type={self.event_type}, severity={self.severity})>"

