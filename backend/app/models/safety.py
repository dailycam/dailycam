"""Safety models - 안전 관련 테이블들"""

from sqlalchemy import Column, Integer, String, Boolean, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.types import DateTime
from app.database import Base
import enum


class Severity(str, enum.Enum):
    """심각도"""
    ACCIDENT = "사고발생"
    DANGER = "위험"
    CAUTION = "주의"
    RECOMMENDED = "권장"


class RiskType(str, enum.Enum):
    """위험 유형"""
    FALL = "낙상"
    COLLISION = "충돌"
    PINCH = "끼임"
    CHOKING = "질식/삼킴"
    BURN = "화상"
    ELECTRIC = "전기"
    BURN_ELECTRIC = "화상/전기"
    FALLING = "넘어짐"
    OTHER = "기타"


class SafetyIncident(Base):
    """안전 사고/위험 이벤트"""
    __tablename__ = "safety_incidents"
    
    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("video_analyses.id", ondelete="CASCADE"), nullable=False, index=True)
    
    event_id = Column(String(20), nullable=True)  # "E001", "E002"
    timestamp_start = Column(String(20), nullable=True)  # "HH:MM:SS"
    timestamp_end = Column(String(20), nullable=True)
    
    severity = Column(SQLEnum(Severity), nullable=False, index=True)
    risk_type = Column(String(100), nullable=True, index=True)
    
    description = Column(Text, nullable=True)
    trigger_behavior = Column(Text, nullable=True)
    environment_factor = Column(Text, nullable=True)
    
    has_safety_device = Column(Boolean, default=False)
    safety_device_type = Column(String(200), nullable=True)
    
    adult_intervention = Column(Boolean, default=False)
    comment = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    analysis = relationship("VideoAnalysis", back_populates="safety_incidents")
    
    def __repr__(self):
        return f"<SafetyIncident(id={self.id}, event_id={self.event_id}, severity={self.severity})>"


class EnvironmentRisk(Base):
    """환경 위험 요소"""
    __tablename__ = "environment_risks"
    
    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("video_analyses.id", ondelete="CASCADE"), nullable=False, index=True)
    
    risk_id = Column(String(20), nullable=True)  # "R001", "R002"
    risk_type = Column(String(100), nullable=True, index=True)
    severity = Column(SQLEnum(Severity), nullable=True, index=True)
    
    location = Column(String(200), nullable=True)
    description = Column(Text, nullable=True)
    
    trigger_behavior = Column(Text, nullable=True)
    environment_factor = Column(Text, nullable=True)
    
    has_safety_device = Column(Boolean, default=False)
    safety_device_type = Column(String(200), nullable=True)
    
    comment = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    analysis = relationship("VideoAnalysis", back_populates="environment_risks")
    
    def __repr__(self):
        return f"<EnvironmentRisk(id={self.id}, risk_type={self.risk_type}, severity={self.severity})>"


class IncidentSummary(Base):
    """안전 사고 요약 (감점 통계)"""
    __tablename__ = "incident_summaries"
    
    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("video_analyses.id", ondelete="CASCADE"), nullable=False, index=True)
    
    severity = Column(SQLEnum(Severity), nullable=False)
    occurrences = Column(Integer, default=0)
    applied_deduction = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    analysis = relationship("VideoAnalysis", back_populates="incident_summaries")
    
    def __repr__(self):
        return f"<IncidentSummary(id={self.id}, severity={self.severity}, occurrences={self.occurrences})>"
