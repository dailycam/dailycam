"""Camera settings model for user-uploaded videos"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class CameraSetting(Base):
    """사용자별 카메라 설정"""
    __tablename__ = "camera_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    camera_id = Column(String(255), nullable=False, index=True)  # 예: "camera-1"
    camera_name = Column(String(255), nullable=True)  # 사용자 지정 카메라 이름
    
    # 스트리밍 설정
    is_active = Column(Boolean, default=True)  # 카메라 활성화 여부
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", backref="camera_settings")
    videos = relationship("CameraVideo", back_populates="camera_setting", cascade="all, delete-orphan")


class CameraVideo(Base):
    """카메라에 업로드된 영상 파일"""
    __tablename__ = "camera_videos"
    
    id = Column(Integer, primary_key=True, index=True)
    camera_setting_id = Column(Integer, ForeignKey("camera_settings.id"), nullable=False, index=True)
    
    filename = Column(String(500), nullable=False)  # 파일명
    file_path = Column(String(1000), nullable=False)  # 저장 경로 (로컬 또는 S3 URL)
    file_size = Column(Integer, nullable=True)  # 파일 크기 (bytes)
    duration = Column(Integer, nullable=True)  # 영상 길이 (초)
    s3_key = Column(String(1000), nullable=True)  # S3 키 (S3에 저장된 경우)
    
    is_active = Column(Boolean, default=True)  # 스트림에 사용 여부
    order_index = Column(Integer, default=0)  # 재생 순서
    
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    camera_setting = relationship("CameraSetting", back_populates="videos")

