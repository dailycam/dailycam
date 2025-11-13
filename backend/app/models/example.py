"""예제 모델 - 데이터베이스 모델 작성 참고용"""

from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, Float, Text
from sqlalchemy.sql import func

from app.database import Base


class VideoAnalysis(Base):
    """비디오 분석 결과 모델 (예제)"""

    __tablename__ = "video_analyses"

    id = Column(Integer, primary_key=True, index=True)
    video_path = Column(String(500), nullable=False)
    total_incidents = Column(Integer, default=0)
    falls = Column(Integer, default=0)
    dangerous_actions = Column(Integer, default=0)
    safety_score = Column(Float, default=0.0)
    summary = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<VideoAnalysis(id={self.id}, safety_score={self.safety_score})>"

