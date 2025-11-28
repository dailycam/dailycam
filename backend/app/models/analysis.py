"""Analysis models - 분석 관련 테이블들"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Enum, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import enum


# ============================================================================
# AnalysisLog (분석 원본 테이블)
# ============================================================================

class AnalysisLog(Base):
    """비디오 분석 메인 기록 모델"""
    __tablename__ = "analysis_log"
    
    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    video_path = Column(String(512), nullable=False)
    age_months = Column(Integer, nullable=True)  # 월령 (7개월, 15개월 등)
    assumed_stage = Column(String(50), nullable=True)  # 발달 단계 ("5단계")
    
    # 안전 관련
    safety_score = Column(Integer, nullable=True)  # 안전 점수 (92점)
    overall_safety_level = Column(String(20), nullable=True)  # "주의", "안전", "위험"
    safety_summary = Column(Text, nullable=True)  # 안전 요약
    
    # 발달 관련
    development_score = Column(Integer, nullable=True)  # 발달 점수 (88점)
    main_activity = Column(String(255), nullable=True)  # 주요 활동 ("블록 쌓기", "낮잠")
    development_summary = Column(Text, nullable=True)  # 발달 요약
    development_radar_scores = Column(JSON, nullable=True)  # 오각형 차트 {"언어": 88, "운동": 92...}
    
    # 추천 활동
    recommendations = Column(JSON, nullable=True)  # [{"title": "까꿍 놀이", "benefit": "인지"}]
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 관계
    user = relationship("User", backref="analysis_logs")
    safety_events = relationship("SafetyEvent", back_populates="analysis_log", cascade="all, delete-orphan")
    development_events = relationship("DevelopmentEvent", back_populates="analysis_log", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<AnalysisLog(id={self.id}, analysis_id={self.analysis_id}, user_id={self.user_id})>"


# ============================================================================
# SafetyEvent (안전 이벤트 테이블)
# ============================================================================

class SeverityLevel(str, enum.Enum):
    """심각도 레벨"""
    DANGER = "위험"
    WARNING = "주의"
    RECOMMENDED = "권장"


class SafetyEvent(Base):
    """안전 이벤트 모델"""
    __tablename__ = "safety_event"
    
    id = Column(Integer, primary_key=True, index=True)
    analysis_log_id = Column(Integer, ForeignKey("analysis_log.id"), nullable=False, index=True)
    severity = Column(Enum(SeverityLevel), nullable=False)  # "위험", "주의", "권장"
    title = Column(String(255), nullable=False)  # "주방 근처 접근"
    description = Column(Text, nullable=True)  # "데드존에 3회 접근했습니다."
    location = Column(String(255), nullable=True)  # "주방 입구"
    timestamp_range = Column(String(50), nullable=True)  # "14:15 - 14:45"
    resolved = Column(Boolean, default=False)  # 해결 여부
    event_timestamp = Column(DateTime(timezone=True), nullable=True, index=True)  # 이벤트 발생 시각
    
    # 관계
    analysis_log = relationship("AnalysisLog", back_populates="safety_events")
    
    def __repr__(self):
        return f"<SafetyEvent(id={self.id}, severity={self.severity}, title={self.title})>"


# ============================================================================
# DevelopmentEvent (발달 이벤트 테이블)
# ============================================================================

class DevelopmentCategory(str, enum.Enum):
    """발달 영역"""
    MOTOR = "운동"
    LANGUAGE = "언어"
    COGNITIVE = "인지"
    SOCIAL = "사회성"


class DevelopmentEvent(Base):
    """발달 이벤트 모델"""
    __tablename__ = "development_event"
    
    id = Column(Integer, primary_key=True, index=True)
    analysis_log_id = Column(Integer, ForeignKey("analysis_log.id"), nullable=False, index=True)
    category = Column(Enum(DevelopmentCategory), nullable=False)  # "운동", "언어", "인지", "사회성"
    title = Column(String(255), nullable=False)  # "배밀이 연습 (15분)"
    description = Column(Text, nullable=True)  # "대근육 발달 촉진"
    is_sleep = Column(Boolean, default=False)  # 수면 여부
    event_timestamp = Column(DateTime(timezone=True), nullable=True, index=True)  # 이벤트 발생 시각
    
    # 관계
    analysis_log = relationship("AnalysisLog", back_populates="development_events")
    
    def __repr__(self):
        return f"<DevelopmentEvent(id={self.id}, category={self.category}, title={self.title})>"

