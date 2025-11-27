"""Children model - 아이 정보"""

from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Child(Base):
    """아이 정보 모델"""
    __tablename__ = "children"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    birth_date = Column(Date, nullable=False)
    gender = Column(String(10), nullable=True)  # 'M', 'F', 'OTHER'
    profile_image_url = Column(String(500), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="children")
    video_analyses = relationship("VideoAnalysis", back_populates="child", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Child(id={self.id}, name={self.name}, user_id={self.user_id})>"
