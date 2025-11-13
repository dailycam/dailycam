"""분석 히트맵 데이터 모델."""

from sqlalchemy import Column, Integer, String, Float, DateTime, JSON
from sqlalchemy.sql import func

from app.database import Base


class AnalyticsHeatmap(Base):
    """분석 히트맵 데이터 모델."""

    __tablename__ = "analytics_heatmaps"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(100), index=True, comment="사용자 ID")
    
    # 히트맵 정보
    heatmap_type = Column(String(50), nullable=False, index=True, comment="히트맵 타입: spatial, hourly, weekly")
    location = Column(String(200), comment="위치 (공간 히트맵인 경우)")
    hour = Column(Integer, comment="시간대 (0-23, 시간대별 히트맵인 경우)")
    
    # 데이터
    activity_value = Column(Float, default=0.0, comment="활동량 값")
    safety_value = Column(Float, default=0.0, comment="안전도 값")
    coordinates = Column(JSON, comment="좌표 데이터")
    
    # 타임스탬프
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<AnalyticsHeatmap(id={self.id}, type={self.heatmap_type}, location={self.location})>"

