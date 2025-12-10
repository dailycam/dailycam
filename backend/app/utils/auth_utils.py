"""JWT token utilities for authentication"""

from datetime import datetime, timedelta
from typing import Optional, Tuple
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status, Request, Cookie
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
import secrets

# JWT 설정
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15  # 15분으로 단축 (보안 강화)
REFRESH_TOKEN_EXPIRE_DAYS = 7     # Refresh Token은 7일

def _get_secret_key() -> str:
    """JWT Secret Key 가져오기 (실제 사용 시점에 검증)"""
    if not SECRET_KEY:
        raise ValueError(
            "JWT_SECRET_KEY 환경 변수가 설정되지 않았습니다. "
            ".env 파일에 강력한 비밀키를 설정해주세요."
        )
    return SECRET_KEY

security = HTTPBearer(auto_error=False)  # Cookie를 우선 사용하므로 auto_error=False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """JWT 액세스 토큰 생성
    
    Args:
        data: 토큰에 포함할 데이터 (user_id, email 등)
        expires_delta: 토큰 만료 시간
        
    Returns:
        str: JWT 토큰
    """
    secret = _get_secret_key()
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "type": "access"})  # 토큰 타입 추가
    encoded_jwt = jwt.encode(to_encode, secret, algorithm=ALGORITHM)
    return encoded_jwt


def create_refresh_token(user_id: int) -> Tuple[str, datetime]:
    """Refresh Token 생성
    
    Args:
        user_id: 사용자 ID
        
    Returns:
        Tuple[str, datetime]: (토큰, 만료 시간)
    """
    # 보안을 위해 랜덤 문자열 사용 (JWT 대신)
    token = secrets.token_urlsafe(64)
    expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    return token, expires_at


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
    secret = _get_secret_key()
    try:
        payload = jwt.decode(token, secret, algorithms=[ALGORITHM])
        
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
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    access_token: Optional[str] = Cookie(None)
) -> int:
    """현재 로그인한 사용자 ID 가져오기
    
    Cookie를 우선 사용하고, 없으면 Authorization 헤더 사용 (하위 호환성)
    
    Args:
        request: FastAPI Request 객체
        credentials: HTTP Authorization 헤더 (선택)
        access_token: Cookie의 access_token (선택)
        
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
        # 1. Cookie에서 토큰 가져오기 (우선순위 높음)
        token = access_token
        
        # 2. Cookie가 없으면 Authorization 헤더에서 가져오기 (하위 호환성)
        if not token and credentials:
            token = credentials.credentials
        
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="인증 토큰이 없습니다",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        payload = verify_token(token, db)
        user_id: int = payload.get("user_id")
        
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="인증 정보를 찾을 수 없습니다",
            )
        
        return user_id
    finally:
        # 제너레이터의 cleanup 로직 실행
        try:
            next(db_gen)
        except StopIteration:
            pass
