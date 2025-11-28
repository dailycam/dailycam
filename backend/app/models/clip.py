"""Highlight clip model for storing important video moments"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Text, Enum as SQLEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class ClipCategory(str, enum.Enum):
    """클립 카테고리"""
    DEVELOPMENT = "development"  # 발달 클립
    SAFETY = "safety"            # 안전 클립


class ClipImportance(str, enum.Enum):
    """클립 중요도"""
    HIGH = "high"        # 높음
    MEDIUM = "medium"    # 중간
    WARNING = "warning"  # 주의
    INFO = "info"        # 정보


class HighlightClip(Base):
    """하이라이트 클립 정보 모델"""
    __tablename__ = "highlight_clips"
    
    # 기본 컬럼
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    analysis_log_id = Column(Integer, ForeignKey("analysis_logs.id", ondelete="SET NULL"), nullable=True)
    
    # 클립 정보
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(SQLEnum(ClipCategory), nullable=False, index=True)
    subcategory = Column(String(100), nullable=True)
    
    # 영상 정보
    video_path = Column(String(1000), nullable=True)
    thumbnail_path = Column(String(1000), nullable=True)
    thumbnail_emoji = Column(String(10), nullable=True)
    duration_seconds = Column(Float, nullable=True)
    timestamp_start = Column(String(20), nullable=True)
    timestamp_end = Column(String(20), nullable=True)
    
    # 중요도 및 태그
    importance = Column(SQLEnum(ClipImportance), nullable=False, index=True)
    tags = Column(String(500), nullable=True)
    
    # 메타데이터
    clip_timestamp = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", backref="highlight_clips")
    analysis_log = relationship("AnalysisLog", backref="highlight_clips")
    
    def __repr__(self):
        return f"<HighlightClip(id={self.id}, title={self.title}, category={self.category})>"
