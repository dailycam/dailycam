"""대시보드 주간 추이 모델."""

from sqlalchemy import Column, Integer, String, Float, DateTime, Date
from sqlalchemy.sql import func

from app.database import Base


class DashboardWeeklyTrend(Base):
    """대시보드 주간 추이 데이터 모델."""

    __tablename__ = "dashboard_weekly_trend"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(100), index=True, comment="사용자 ID")
    trend_date = Column(Date, nullable=False, index=True, comment="추이 날짜")
    
    # 주간 추이 데이터
    day = Column(String(10), nullable=False, comment="요일 (월, 화, 수, 목, 금, 토, 일)")
    score = Column(Float, default=0.0, comment="안전도 점수")
    incidents = Column(Integer, default=0, comment="사건 수")
    
    # 타임스탬프
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<DashboardWeeklyTrend(id={self.id}, day={self.day}, score={self.score}, incidents={self.incidents})>"

