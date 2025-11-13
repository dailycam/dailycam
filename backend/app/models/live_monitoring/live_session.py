"""실시간 모니터링 세션 모델."""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class LiveSession(Base):
    """실시간 모니터링 세션 모델."""

    __tablename__ = "live_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(100), index=True, comment="사용자 ID")
    camera_id = Column(Integer, ForeignKey("cameras.id", ondelete="SET NULL"), nullable=True, index=True, comment="카메라 ID")
    
    # 세션 정보
    session_name = Column(String(200), comment="세션 이름")
    status = Column(String(20), default="active", index=True, comment="상태: active, paused, ended")
    
    # 통계
    total_alerts = Column(Integer, default=0, comment="총 알림 수")
    total_activities = Column(Integer, default=0, comment="총 활동 수")
    
    # 타임스탬프
    started_at = Column(DateTime(timezone=True), server_default=func.now(), index=True, comment="시작 시간")
    ended_at = Column(DateTime(timezone=True), nullable=True, comment="종료 시간")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # 관계
    camera = relationship("Camera", foreign_keys=[camera_id])
    alerts = relationship("LiveAlert", back_populates="session", cascade="all, delete-orphan")
    activities = relationship("LiveActivity", back_populates="session", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<LiveSession(id={self.id}, status={self.status}, camera_id={self.camera_id})>"

