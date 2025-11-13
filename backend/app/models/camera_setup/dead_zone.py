"""데드존 모델."""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class DeadZone(Base):
    """데드존 모델."""

    __tablename__ = "dead_zones"

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, ForeignKey("cameras.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # 데드존 정보
    name = Column(String(200), nullable=False, comment="데드존 이름")
    coordinates = Column(JSON, comment="좌표 데이터 (polygon points)")
    color = Column(String(20), default="#ef4444", comment="표시 색상")
    
    # 타임스탬프
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # 관계
    camera = relationship("Camera", back_populates="dead_zones")
    
    def __repr__(self):
        return f"<DeadZone(id={self.id}, name={self.name}, camera_id={self.camera_id})>"

