"""사용자 설정 모델."""

from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class UserSetting(Base):
    """사용자 설정 모델."""

    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # 설정 정보
    setting_key = Column(String(100), nullable=False, index=True, comment="설정 키")
    setting_value = Column(Text, comment="설정 값 (JSON 또는 텍스트)")
    setting_type = Column(String(50), comment="설정 타입: string, number, boolean, json")
    
    # 타임스탬프
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # 관계
    user = relationship("User", back_populates="settings")
    
    def __repr__(self):
        return f"<UserSetting(id={self.id}, key={self.setting_key}, user_id={self.user_id})>"

