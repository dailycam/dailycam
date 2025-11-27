"""Development Skills model - 발달 기술"""

from sqlalchemy import Column, Integer, String, Boolean, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.types import DateTime
from app.database import Base
import enum


class SkillCategory(str, enum.Enum):
    """발달 영역 카테고리"""
    GROSS_MOTOR = "대근육운동"
    FINE_MOTOR = "소근육운동"
    COGNITIVE = "인지"
    LANGUAGE = "언어"
    SOCIAL_EMOTIONAL = "사회정서"


class SkillLevel(str, enum.Enum):
    """숙련도"""
    NONE = "없음"
    BEGINNER = "초기"
    INTERMEDIATE = "중간"
    PROFICIENT = "숙련"


class DevelopmentSkill(Base):
    """발달 기술 모델"""
    __tablename__ = "development_skills"
    
    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("video_analyses.id", ondelete="CASCADE"), nullable=False, index=True)
    
    skill_name = Column(String(200), nullable=False)
    category = Column(SQLEnum(SkillCategory), nullable=False, index=True)
    present = Column(Boolean, default=False)
    frequency = Column(Integer, default=0)
    level = Column(SQLEnum(SkillLevel), default=SkillLevel.NONE, index=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    analysis = relationship("VideoAnalysis", back_populates="skills")
    examples = relationship("SkillExample", back_populates="skill", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<DevelopmentSkill(id={self.id}, name={self.skill_name}, level={self.level})>"


class SkillExample(Base):
    """기술 관찰 예시"""
    __tablename__ = "skill_examples"
    
    id = Column(Integer, primary_key=True, index=True)
    skill_id = Column(Integer, ForeignKey("development_skills.id", ondelete="CASCADE"), nullable=False, index=True)
    
    timestamp = Column(String(20), nullable=True)  # "HH:MM:SS"
    example_description = Column(Text, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    skill = relationship("DevelopmentSkill", back_populates="examples")
    
    def __repr__(self):
        return f"<SkillExample(id={self.id}, timestamp={self.timestamp})>"
