"""실시간 활동 모델."""

from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class LiveActivity(Base):
    """실시간 활동 모델."""

    __tablename__ = "live_activities"

    id = Column(Integer, primary_key=True, index=True)
    live_session_id = Column(Integer, ForeignKey("live_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # 활동 정보
    activity_type = Column(String(50), nullable=False, index=True, comment="활동 타입: movement, play, rest, etc.")
    description = Column(Text, comment="활동 설명")
    location = Column(String(200), comment="활동 위치")
    
    # 타임스탬프
    occurred_at = Column(DateTime(timezone=True), server_default=func.now(), index=True, comment="발생 시간")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 관계
    session = relationship("LiveSession", back_populates="activities")
    
    def __repr__(self):
        return f"<LiveActivity(id={self.id}, type={self.activity_type}, occurred_at={self.occurred_at})>"

