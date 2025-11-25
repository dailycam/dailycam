"""분석 인사이트 모델."""

from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func

from app.database import Base


class AnalyticsInsight(Base):
    """분석 인사이트 모델."""

    __tablename__ = "analytics_insights"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(100), index=True, comment="사용자 ID")
    
    # 인사이트 정보
    insight_type = Column(String(50), nullable=False, index=True, comment="인사이트 타입: trend, pattern, anomaly")
    title = Column(String(200), nullable=False, comment="인사이트 제목")
    description = Column(Text, nullable=False, comment="인사이트 설명")
    category = Column(String(50), comment="카테고리: safety, activity, risk")
    
    # 중요도
    importance = Column(String(10), default="medium", index=True, comment="중요도: high, medium, low")
    
    # 타임스탬프
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<AnalyticsInsight(id={self.id}, type={self.insight_type}, title={self.title})>"

