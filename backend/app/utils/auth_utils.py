"""JWT token utilities for authentication"""

from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os

# JWT 설정
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7일

security = HTTPBearer()


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """JWT 액세스 토큰 생성
    
    Args:
        data: 토큰에 포함할 데이터 (user_id, email 등)
        expires_delta: 토큰 만료 시간
        
    Returns:
        str: JWT 토큰
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str, db = None) -> dict:
    """JWT 토큰 검증
    
    Args:
        token: JWT 토큰
        db: 데이터베이스 세션 (블랙리스트 확인용)
        
    Returns:
        dict: 토큰 페이로드
        
    Raises:
        HTTPException: 토큰이 유효하지 않은 경우
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # 블랙리스트 확인
        if db is not None:
            from app.models.token_blacklist import TokenBlacklist
            blacklisted = db.query(TokenBlacklist).filter(
                TokenBlacklist.token == token
            ).first()
            
            if blacklisted:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="토큰이 무효화되었습니다 (로그아웃됨)",
                    headers={"WWW-Authenticate": "Bearer"},
                )
        
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="인증 토큰이 유효하지 않습니다",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> int:
    """현재 로그인한 사용자 ID 가져오기
    
    Args:
        credentials: HTTP Authorization 헤더
        
    Returns:
        int: 사용자 ID
        
    Raises:
        HTTPException: 인증 실패 시
    """
    from app.database import get_db
    
    # 데이터베이스 세션 생성
    db_gen = get_db()
    db = next(db_gen)
    
    try:
        token = credentials.credentials
        payload = verify_token(token, db)
        user_id: int = payload.get("user_id")
        
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="인증 정보를 찾을 수 없습니다",
            )
        
        return user_id
    finally:
        db.close()
