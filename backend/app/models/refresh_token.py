"""Refresh Token model for token rotation"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class RefreshToken(Base):
    """Refresh Token 모델
    
    Access Token을 갱신하기 위한 Refresh Token을 저장합니다.
    - Access Token: 짧은 만료 시간 (15분)
    - Refresh Token: 긴 만료 시간 (7일)
    
    보안 향상:
    - Access Token 탈취 시 피해 최소화 (15분만 유효)
    - Refresh Token은 httpOnly Cookie로 저장
    - 사용된 Refresh Token은 자동으로 무효화 (Rotation)
    """
    __tablename__ = "refresh_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token = Column(String(512), unique=True, index=True, nullable=False)
    is_revoked = Column(Boolean, default=False, nullable=False)  # 무효화 여부
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
    last_used_at = Column(DateTime(timezone=True), nullable=True)  # 마지막 사용 시간
    
    # 관계
    user = relationship("User", backref="refresh_tokens")
    
    def __repr__(self):
        return f"<RefreshToken(id={self.id}, user_id={self.user_id}, revoked={self.is_revoked})>"

