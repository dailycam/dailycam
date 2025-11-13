"""일일 리포트 위험 항목 모델."""

from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class DailyReportRisk(Base):
    """일일 리포트 위험 항목 모델."""

    __tablename__ = "daily_report_risks"

    id = Column(Integer, primary_key=True, index=True)
    daily_report_id = Column(Integer, ForeignKey("daily_reports.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # 위험 정보
    level = Column(String(10), nullable=False, index=True, comment="위험도: high, medium, low")
    title = Column(String(200), nullable=False, comment="위험 제목")
    description = Column(Text, comment="위험 설명")
    location = Column(String(200), comment="발생 위치")
    time = Column(String(100), comment="발생 시간")
    count = Column(Integer, default=1, comment="발생 횟수")
    
    # 타임스탬프
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 관계
    daily_report = relationship("DailyReport", back_populates="risks")
    
    def __repr__(self):
        return f"<DailyReportRisk(id={self.id}, level={self.level}, title={self.title})>"

