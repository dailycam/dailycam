"""실시간 알림 모델."""

from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class LiveAlert(Base):
    """실시간 알림 모델."""

    __tablename__ = "live_alerts"

    id = Column(Integer, primary_key=True, index=True)
    live_session_id = Column(Integer, ForeignKey("live_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # 알림 정보
    alert_type = Column(String(50), nullable=False, index=True, comment="알림 타입: danger, warning, info")
    title = Column(String(200), nullable=False, comment="알림 제목")
    message = Column(Text, comment="알림 메시지")
    severity = Column(String(10), nullable=False, index=True, comment="심각도: high, medium, low")
    
    # 상태
    is_read = Column(String(10), default="false", index=True, comment="읽음 여부: true, false")
    read_at = Column(DateTime(timezone=True), nullable=True, comment="읽은 시간")
    
    # 타임스탬프
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # 관계
    session = relationship("LiveSession", back_populates="alerts")
    
    def __repr__(self):
        return f"<LiveAlert(id={self.id}, type={self.alert_type}, severity={self.severity})>"

