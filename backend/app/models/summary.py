"""DailySummary model - 일별 통계 테이블"""

from sqlalchemy import Column, Integer, Float, Date, JSON, UniqueConstraint
from app.database import Base


class DailySummary(Base):
    """일별 통계 모델 - 하루 데이터를 요약 저장 (그래프 그리기용)"""
    __tablename__ = "daily_summary"
    
    id = Column(Integer, primary_key=True, index=True)
    summary_date = Column(Date, nullable=False, unique=True, index=True)  # 2024-11-28 (X축)
    avg_safety_score = Column(Float, nullable=True)  # 평균 안전도 (꺾은선 그래프 Y축)
    monitoring_hours = Column(Float, nullable=True)  # 모니터링 시간 ("누적 8시간")
    incident_counts = Column(JSON, nullable=True)  # 파이 차트 {"낙상": 2, "충돌": 1}
    development_counts = Column(JSON, nullable=True)  # 바 차트 {"운동": 15, "언어": 8}
    
    __table_args__ = (
        UniqueConstraint('summary_date', name='uq_daily_summary_date'),
    )
    
    def __repr__(self):
        return f"<DailySummary(id={self.id}, date={self.summary_date}, avg_safety={self.avg_safety_score})>"

