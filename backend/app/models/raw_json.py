"""Raw JSON Storage model - 원본 JSON 저장"""

from sqlalchemy import Column, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.types import DateTime
from app.database import Base


class AnalysisRawJson(Base):
    """원본 JSON 저장 모델"""
    __tablename__ = "analysis_raw_json"
    
    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("video_analyses.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    
    # VLM 메타데이터 (1단계)
    vlm_metadata_json = Column(Text, nullable=True)
    
    # 발달 단계 판단 (2단계)
    stage_determination_json = Column(Text, nullable=True)
    
    # 최종 분석 결과 (3단계)
    final_analysis_json = Column(Text, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    analysis = relationship("VideoAnalysis", back_populates="raw_json")
    
    def __repr__(self):
        return f"<AnalysisRawJson(id={self.id}, analysis_id={self.analysis_id})>"
