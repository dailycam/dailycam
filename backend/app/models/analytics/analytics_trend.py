"""분석 추이 데이터 모델."""

from sqlalchemy import Column, Integer, String, Float, DateTime, Date
from sqlalchemy.sql import func

from app.database import Base


class AnalyticsTrend(Base):
    """분석 추이 데이터 모델."""

    __tablename__ = "analytics_trends"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(100), index=True, comment="사용자 ID")
    trend_date = Column(Date, nullable=False, index=True, comment="추이 날짜")
    
    # 추이 데이터
    safety_score = Column(Float, default=0.0, comment="안전도 점수")
    incidents = Column(Integer, default=0, comment="사건 수")
    activity = Column(Float, default=0.0, comment="활동량")
    
    # 타임스탬프
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<AnalyticsTrend(id={self.id}, date={self.trend_date}, safety={self.safety_score})>"

