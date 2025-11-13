"""대시보드 위험 항목 모델."""

from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func

from app.database import Base


class DashboardRisk(Base):
    """대시보드 위험도 우선순위 모델."""

    __tablename__ = "dashboard_risks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(100), index=True, comment="사용자 ID")
    
    # 위험 정보
    level = Column(String(10), nullable=False, index=True, comment="위험도: high, medium, low")
    title = Column(String(200), nullable=False, comment="위험 제목")
    time = Column(String(100), comment="발생 시간 (예: 오후 2:15 - 2:45)")
    count = Column(Integer, default=1, comment="발생 횟수")
    
    # 추가 정보
    description = Column(Text, comment="상세 설명")
    location = Column(String(200), comment="발생 위치")
    
    # 상태
    is_active = Column(String(10), default="true", index=True, comment="활성 여부: true, false")
    
    # 타임스탬프
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<DashboardRisk(id={self.id}, level={self.level}, title={self.title})>"

