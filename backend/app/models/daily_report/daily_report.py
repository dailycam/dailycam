"""일일 리포트 모델."""

from datetime import date

from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class DailyReport(Base):
    """일일 리포트 모델."""

    __tablename__ = "daily_reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(100), index=True, comment="사용자 ID")
    report_date = Column(Date, nullable=False, unique=True, index=True, comment="리포트 날짜")
    
    # 주요 지표
    safety_score = Column(Float, default=0.0, comment="안전도 점수")
    total_monitoring_time = Column(Integer, default=0, comment="총 모니터링 시간 (분)")
    incident_count = Column(Integer, default=0, comment="사건 수")
    safe_zone_percentage = Column(Float, default=0.0, comment="세이프존 체류 비율 (%)")
    activity_level = Column(String(20), default="medium", comment="활동 수준: low, medium, high")
    
    # AI 요약
    ai_summary = Column(Text, comment="AI 한줄평")
    
    # 시간대별 활동 (JSON으로 저장)
    hourly_activity_json = Column(Text, comment="시간대별 활동 데이터 (JSON)")
    
    # 타임스탬프
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # 관계
    risks = relationship("DailyReportRisk", back_populates="daily_report", cascade="all, delete-orphan")
    recommendations = relationship("DailyReportRecommendation", back_populates="daily_report", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<DailyReport(id={self.id}, date={self.report_date}, safety_score={self.safety_score})>"

