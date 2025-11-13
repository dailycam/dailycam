"""일일 리포트 추천 사항 모델."""

from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class DailyReportRecommendation(Base):
    """일일 리포트 추천 사항 모델."""

    __tablename__ = "daily_report_recommendations"

    id = Column(Integer, primary_key=True, index=True)
    daily_report_id = Column(Integer, ForeignKey("daily_reports.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # 추천 정보
    priority = Column(String(10), nullable=False, index=True, comment="우선순위: high, medium, low")
    title = Column(String(200), nullable=False, comment="추천 제목")
    description = Column(Text, nullable=False, comment="추천 설명")
    estimated_cost = Column(String(100), comment="예상 비용")
    difficulty = Column(String(50), comment="난이도")
    
    # 타임스탬프
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 관계
    daily_report = relationship("DailyReport", back_populates="recommendations")
    
    def __repr__(self):
        return f"<DailyReportRecommendation(id={self.id}, priority={self.priority}, title={self.title})>"

