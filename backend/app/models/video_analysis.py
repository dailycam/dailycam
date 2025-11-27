"""Video Analysis model - 비디오 분석 메인 테이블"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class SafetyLevel(str, enum.Enum):
    """안전도 레벨"""
    VERY_HIGH = "매우높음"
    HIGH = "높음"
    MEDIUM = "중간"
    LOW = "낮음"
    VERY_LOW = "매우낮음"


class MatchLevel(str, enum.Enum):
    """단계 일치도"""
    TYPICAL = "전형적"
    SLIGHTLY_FAST = "약간빠름"
    SLIGHTLY_SLOW = "약간느림"
    VERY_DIFFERENT = "많이다름"
    UNCLEAR = "판단불가"


class AdultPresence(str, enum.Enum):
    """보호자 동반 빈도"""
    ALWAYS = "항상동반"
    FREQUENT = "자주동반"
    OCCASIONAL = "드물게동반"
    RARELY = "거의없음"
    UNCLEAR = "판단불가"


class VideoAnalysis(Base):
    """비디오 분석 메인 모델"""
    __tablename__ = "video_analyses"
    
    id = Column(Integer, primary_key=True, index=True)
    child_id = Column(Integer, ForeignKey("children.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # 비디오 정보
    video_file_path = Column(String(500), nullable=True)
    video_file_size = Column(Integer, nullable=True)
    video_duration_seconds = Column(Float, nullable=True)
    video_quality = Column(String(20), nullable=True)  # '좋음', '보통', '나쁨'
    child_visibility = Column(String(20), nullable=True)  # '명확함', '부분적', '불명확'
    environment_type = Column(String(50), nullable=True)  # '거실', '침실', '놀이방', '야외', '기타'
    
    # 발달 단계 정보
    detected_stage = Column(String(10), nullable=True, index=True)  # "1" ~ "6"
    assumed_stage = Column(String(10), nullable=True)
    stage_confidence = Column(String(20), nullable=True)  # '높음', '중간', '낮음'
    age_months = Column(Integer, nullable=True)
    
    # 단계 일치도
    match_level = Column(SQLEnum(MatchLevel), nullable=True)
    suggested_next_stage = Column(String(10), nullable=True)
    
    # 안전 분석
    safety_score = Column(Integer, nullable=True)
    overall_safety_level = Column(SQLEnum(SafetyLevel), nullable=True, index=True)
    adult_presence = Column(SQLEnum(AdultPresence), nullable=True)
    
    # 발달 분석 요약
    development_summary = Column(Text, nullable=True)
    
    # 관찰 시간
    observation_duration_minutes = Column(Float, nullable=True)
    
    # 타임스탬프
    analysis_started_at = Column(DateTime(timezone=True), nullable=True)
    analysis_completed_at = Column(DateTime(timezone=True), nullable=True)
    analysis_duration_seconds = Column(Float, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    child = relationship("Child", back_populates="video_analyses")
    user = relationship("User")
    
    skills = relationship("DevelopmentSkill", back_populates="analysis", cascade="all, delete-orphan")
    stage_evidences = relationship("StageEvidence", back_populates="analysis", cascade="all, delete-orphan")
    safety_incidents = relationship("SafetyIncident", back_populates="analysis", cascade="all, delete-orphan")
    environment_risks = relationship("EnvironmentRisk", back_populates="analysis", cascade="all, delete-orphan")
    incident_summaries = relationship("IncidentSummary", back_populates="analysis", cascade="all, delete-orphan")
    raw_json = relationship("AnalysisRawJson", back_populates="analysis", uselist=False, cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<VideoAnalysis(id={self.id}, child_id={self.child_id}, stage={self.detected_stage})>"
