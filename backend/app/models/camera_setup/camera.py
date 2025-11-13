"""카메라 모델."""

from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Camera(Base):
    """카메라 모델."""

    __tablename__ = "cameras"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(100), index=True, comment="사용자 ID")
    
    # 카메라 정보
    name = Column(String(200), nullable=False, comment="카메라 이름")
    location = Column(String(200), comment="카메라 위치")
    rtsp_url = Column(String(500), comment="RTSP 스트림 URL")
    status = Column(String(20), default="offline", index=True, comment="상태: online, offline")
    
    # 설정
    is_active = Column(String(10), default="true", index=True, comment="활성 여부: true, false")
    resolution = Column(String(50), comment="해상도 (예: 1920x1080)")
    fps = Column(Integer, comment="프레임레이트")
    
    # 타임스탬프
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_connected_at = Column(DateTime(timezone=True), comment="마지막 연결 시간")
    
    # 관계
    safe_zones = relationship("SafeZone", back_populates="camera", cascade="all, delete-orphan")
    dead_zones = relationship("DeadZone", back_populates="camera", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Camera(id={self.id}, name={self.name}, status={self.status})>"

