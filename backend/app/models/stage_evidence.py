"""Stage Evidence model - 발달 단계 판단 근거"""

from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.types import DateTime
from app.database import Base


class StageEvidence(Base):
    """발달 단계 판단 근거"""
    __tablename__ = "stage_evidences"
    
    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("video_analyses.id", ondelete="CASCADE"), nullable=False, index=True)
    
    evidence_text = Column(Text, nullable=False)
    alternative_stage = Column(String(10), nullable=True)  # 대안 단계
    alternative_reason = Column(Text, nullable=True)  # 대안 단계 이유
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    analysis = relationship("VideoAnalysis", back_populates="stage_evidences")
    
    def __repr__(self):
        return f"<StageEvidence(id={self.id}, analysis_id={self.analysis_id})>"
