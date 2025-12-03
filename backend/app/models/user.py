"""User model for authentication"""

from sqlalchemy import Column, Integer, String, DateTime, Date, Text
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    """사용자 모델"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    google_id = Column(String(255), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=True)
    picture = Column(Text, nullable=True)  # Base64 이미지를 저장하기 위해 Text 타입 사용

    # 구독 여부 (0: 미구독, 1: 구독)
    is_subscribed = Column(Integer, default=0)

    # 🔥 어떤 플랜인지 (예: BASIC, PREMIUM 등)
    subscription_plan = Column(String(50), nullable=True)

    # 정기 결제에 필요한 customer_uid
    subscription_customer_uid = Column(String(255), nullable=True)

    # 다음 결제 예정일
    next_billing_at = Column(DateTime(timezone=True), nullable=True)

    # 프로필 정보
    phone = Column(String(20), nullable=True)
    child_name = Column(String(100), nullable=True)
    child_birthdate = Column(Date, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, name={self.name})>"
