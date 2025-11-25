"""대시보드 추천 사항 모델."""

from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func

from app.database import Base


class DashboardRecommendation(Base):
    """대시보드 즉시 실행 리스트 모델."""

    __tablename__ = "dashboard_recommendations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(100), index=True, comment="사용자 ID")
    
    # 추천 정보
    priority = Column(String(10), nullable=False, index=True, comment="우선순위: high, medium, low")
    title = Column(String(200), nullable=False, comment="추천 제목")
    description = Column(Text, nullable=False, comment="추천 설명")
    
    # 상태
    status = Column(String(20), default="pending", index=True, comment="상태: pending, in_progress, completed, dismissed")
    completed_at = Column(DateTime(timezone=True), nullable=True, comment="완료 시간")
    
    # 타임스탬프
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<DashboardRecommendation(id={self.id}, priority={self.priority}, title={self.title})>"

