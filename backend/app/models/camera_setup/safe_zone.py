"""세이프존 모델."""

from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class SafeZone(Base):
    """세이프존 모델."""

    __tablename__ = "safe_zones"

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, ForeignKey("cameras.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # 세이프존 정보
    name = Column(String(200), nullable=False, comment="세이프존 이름")
    coordinates = Column(JSON, comment="좌표 데이터 (polygon points)")
    color = Column(String(20), default="#10b981", comment="표시 색상")
    
    # 타임스탬프
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # 관계
    camera = relationship("Camera", back_populates="safe_zones")
    
    def __repr__(self):
        return f"<SafeZone(id={self.id}, name={self.name}, camera_id={self.camera_id})>"

