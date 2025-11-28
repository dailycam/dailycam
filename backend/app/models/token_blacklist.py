"""Token blacklist model for logout functionality"""

from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.database import Base


class TokenBlacklist(Base):
    """블랙리스트 토큰 모델"""
    __tablename__ = "token_blacklist"
    
    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(512), unique=True, index=True, nullable=False)
    blacklisted_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
    
    def __repr__(self):
        return f"<TokenBlacklist(id={self.id}, blacklisted_at={self.blacklisted_at})>"
