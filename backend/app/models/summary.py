"""Daily summary model for dashboard statistics"""

from sqlalchemy import Column, Integer, Date, DateTime, ForeignKey, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class DailySummary(Base):
    """대시보드 통계용 일별 요약 데이터 모델"""
    __tablename__ = "daily_summaries"
    
    # 기본 컬럼
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    summary_date = Column(Date, nullable=False, index=True)
    
    # 안전 통계
    avg_safety_score = Column(Float, nullable=True)
    min_safety_score = Column(Float, nullable=True)
    max_safety_score = Column(Float, nullable=True)
    
    # 이벤트 감지 횟수
    total_incident_count = Column(Integer, default=0)
    danger_count = Column(Integer, default=0)
    warning_count = Column(Integer, default=0)
    info_count = Column(Integer, default=0)
    
    # 발달 통계
    avg_development_score = Column(Float, nullable=True)
    total_development_events = Column(Integer, default=0)
    
    # 발달 영역별 감지 횟수
    language_count = Column(Integer, default=0)
    motor_count = Column(Integer, default=0)
    cognitive_count = Column(Integer, default=0)
    social_count = Column(Integer, default=0)
    emotional_count = Column(Integer, default=0)
    
    # 모니터링 시간
    monitoring_hours = Column(Float, nullable=True)
    
    # 타임스탬프
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", backref="daily_summaries")
    
    def __repr__(self):
        return f"<DailySummary(user_id={self.user_id}, date={self.summary_date}, safety={self.avg_safety_score})>"
