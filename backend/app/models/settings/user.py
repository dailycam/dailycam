"""사용자 모델."""

from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class User(Base):
    """사용자 모델."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(100), unique=True, nullable=False, index=True, comment="사용자 고유 ID")
    
    # 사용자 정보
    name = Column(String(200), comment="사용자 이름")
    email = Column(String(200), unique=True, index=True, comment="이메일")
    
    # 상태
    is_active = Column(String(10), default="true", index=True, comment="활성 여부: true, false")
    
    # 타임스탬프
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login_at = Column(DateTime(timezone=True), comment="마지막 로그인 시간")
    
    # 관계
    settings = relationship("UserSetting", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User(id={self.id}, user_id={self.user_id}, name={self.name})>"

