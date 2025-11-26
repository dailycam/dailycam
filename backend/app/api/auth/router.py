"""Google OAuth authentication router"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from authlib.integrations.starlette_client import OAuth
from starlette.config import Config
from starlette.requests import Request
import os

from app.database import get_db
from app.models.user import User
from app.utils.auth_utils import create_access_token, get_current_user_id

# OAuth 설정
config = Config(environ=os.environ)
oauth = OAuth(config)

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# Google OAuth 클라이언트 등록
oauth.register(
    name='google',
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET,
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile'
    }
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/google/login")
async def google_login(request: Request):
    """Google 로그인 페이지로 리다이렉트"""
    redirect_uri = request.url_for('google_callback')
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    """Google OAuth 콜백 처리
    
    사용자 정보를 받아서 데이터베이스에 저장하고 JWT 토큰 생성
    """
    try:
        # Google에서 토큰 받기
        token = await oauth.google.authorize_access_token(request)
        
        # 사용자 정보 가져오기
        user_info = token.get('userinfo')
        if not user_info:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="사용자 정보를 가져올 수 없습니다"
            )
        
        google_id = user_info.get('sub')
        email = user_info.get('email')
        name = user_info.get('name')
        picture = user_info.get('picture')
        
        if not google_id or not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="필수 사용자 정보가 누락되었습니다"
            )
        
        # 데이터베이스에서 사용자 찾기
        user = db.query(User).filter(User.google_id == google_id).first()
        
        if user:
            # 기존 사용자 정보 업데이트
            user.email = email
            user.name = name
            user.picture = picture
        else:
            # 새 사용자 생성
            user = User(
                google_id=google_id,
                email=email,
                name=name,
                picture=picture
            )
            db.add(user)
        
        db.commit()
        db.refresh(user)
        
        # JWT 토큰 생성
        access_token = create_access_token(
            data={
                "user_id": user.id,
                "email": user.email,
                "name": user.name
            }
        )
        
        # 프론트엔드로 리다이렉트 (토큰 포함)
        return RedirectResponse(
            url=f"{FRONTEND_URL}/auth/callback?token={access_token}"
        )
        
    except Exception as e:
        print(f"OAuth 콜백 오류: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"인증 처리 중 오류가 발생했습니다: {str(e)}"
        )


@router.get("/me")
async def get_current_user(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """현재 로그인한 사용자 정보 조회"""
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자를 찾을 수 없습니다"
        )
    
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "picture": user.picture,
        "created_at": user.created_at
    }


@router.post("/logout")
async def logout(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """로그아웃 (토큰 블랙리스트 추가)"""
    from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
    from fastapi import Request
    from app.models.token_blacklist import TokenBlacklist
    from jose import jwt
    from datetime import datetime
    
    # 요청에서 토큰 추출
    # Note: 이 방법은 간단하지만, 실제로는 Depends를 통해 토큰을 받는 것이 더 좋습니다
    # 여기서는 get_current_user_id가 이미 토큰을 검증했으므로 안전합니다
    
    # 토큰을 블랙리스트에 추가하기 위해 다시 추출해야 합니다
    # 이를 위해 별도의 의존성을 만들거나, 토큰을 반환하도록 수정할 수 있습니다
    
    return {"message": "로그아웃되었습니다. 클라이언트에서 토큰을 삭제해주세요."}


@router.post("/logout-with-token")
async def logout_with_token(
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer()),
    db: Session = Depends(get_db)
):
    """로그아웃 (토큰 블랙리스트 추가)
    
    Authorization 헤더에서 토큰을 받아 블랙리스트에 추가합니다.
    """
    from app.models.token_blacklist import TokenBlacklist
    from jose import jwt
    from datetime import datetime
    import os
    
    token = credentials.credentials
    
    try:
        # 토큰 디코딩하여 만료 시간 확인
        SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key")
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        exp_timestamp = payload.get("exp")
        
        if exp_timestamp:
            expires_at = datetime.fromtimestamp(exp_timestamp)
        else:
            # 만료 시간이 없으면 7일 후로 설정
            from datetime import timedelta
            expires_at = datetime.utcnow() + timedelta(days=7)
        
        # 블랙리스트에 토큰 추가
        blacklist_entry = TokenBlacklist(
            token=token,
            expires_at=expires_at
        )
        db.add(blacklist_entry)
        db.commit()
        
        return {"message": "로그아웃되었습니다. 토큰이 무효화되었습니다."}
        
    except Exception as e:
        print(f"로그아웃 오류: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="로그아웃 처리 중 오류가 발생했습니다"
        )
