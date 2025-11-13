"""대시보드 통계 모델."""

from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Date
from sqlalchemy.sql import func

from app.database import Base


class DashboardStatistics(Base):
    """대시보드 통계 데이터 모델."""

    __tablename__ = "dashboard_statistics"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(100), index=True, comment="사용자 ID")
    stat_date = Column(Date, nullable=False, index=True, comment="통계 날짜")
    
    # 오늘의 통계 (Quick Stats)
    safety_score = Column(Float, default=0.0, comment="오늘의 안전도 (%)")
    incident_count = Column(Integer, default=0, comment="감지된 위험 건수")
    monitoring_hours = Column(Float, default=0.0, comment="모니터링 시간 (시간)")
    activity_pattern = Column(String(50), default="정상", comment="활동 패턴: 정상, 주의 필요, 위험")
    
    # AI 요약
    summary = Column(Text, comment="AI 한줄평")
    summary_updated_at = Column(DateTime(timezone=True), comment="요약 업데이트 시간")
    
    # 타임스탬프
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<DashboardStatistics(id={self.id}, date={self.stat_date}, safety_score={self.safety_score}, incidents={self.incident_count})>"

