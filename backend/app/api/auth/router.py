"""Google OAuth authentication router"""

from fastapi import APIRouter, Depends, HTTPException, status, Cookie
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from authlib.integrations.starlette_client import OAuth
from authlib.integrations.httpx_client import AsyncOAuth2Client
from starlette.config import Config
from starlette.requests import Request
from datetime import datetime, timedelta
from typing import Optional
import os
import traceback
import asyncio
from httpx import ConnectTimeout, ReadTimeout, WriteTimeout, PoolTimeout

from app.database import get_db
from app.models.user import User
from app.utils.auth_utils import create_access_token, create_refresh_token, get_current_user_id
from app.models.refresh_token import RefreshToken
from app.utils.logging_utils import dev_log, prod_log

# OAuth 설정
config = Config(environ=os.environ)
oauth = OAuth(config)

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# Google OAuth 클라이언트 등록 (타임아웃 설정 포함)
oauth.register(
    name='google',
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET,
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile'
    }
)

# httpx 타임아웃 설정 (Google OAuth 서버 연결용)
import httpx
def _configure_oauth_timeout():
    """OAuth 클라이언트의 httpx 클라이언트에 타임아웃 설정"""
    try:
        # 전체 타임아웃 30초, 연결 타임아웃 10초
        timeout = httpx.Timeout(30.0, connect=10.0)
        
        # OAuth 클라이언트의 httpx 클라이언트에 타임아웃 설정
        if hasattr(oauth.google, 'client') and oauth.google.client:
            oauth.google.client.timeout = timeout
        elif hasattr(oauth.google, '_client') and oauth.google._client:
            oauth.google._client.timeout = timeout
        elif hasattr(oauth.google, 'http_client') and oauth.google.http_client:
            oauth.google.http_client.timeout = timeout
    except Exception as e:
        dev_log(f"[OAuth 설정] 타임아웃 설정 중 오류 (무시): {e}")

# 초기 설정 시도
_configure_oauth_timeout()

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/google/login")
async def google_login(request: Request):
    """Google 로그인 페이지로 리다이렉트"""
    # BACKEND_URL을 사용하여 명시적으로 redirect_uri 생성
    BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
    redirect_uri = f"{BACKEND_URL}/api/auth/google/callback"
    
    # 타임아웃 설정 확인
    _configure_oauth_timeout()
    
    # 재시도 로직 추가
    max_retries = 2
    last_error = None
    
    for attempt in range(max_retries):
        try:
            return await oauth.google.authorize_redirect(request, redirect_uri)
        except (ConnectTimeout, ReadTimeout, WriteTimeout, PoolTimeout, asyncio.TimeoutError) as e:
            last_error = e
            if attempt < max_retries - 1:
                wait_time = (attempt + 1) * 2  # 2초, 4초로 증가
                dev_log(f"[Google Login] 타임아웃 발생 (시도 {attempt + 1}/{max_retries}), {wait_time}초 후 재시도...: {e}")
                await asyncio.sleep(wait_time)
            else:
                error_msg = f"Google 로그인 타임아웃: {repr(e)}"
                print(error_msg)
                dev_log(f"[Google Login] 모든 시도 실패: {e}")
                raise HTTPException(
                    status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                    detail="Google 인증 서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요."
                )
        except Exception as e:
            # 타임아웃이 아닌 다른 에러는 즉시 실패
            error_msg = f"Google 로그인 오류: {repr(e)}\n{traceback.format_exc()}"
            print(error_msg)
            dev_log(f"[Google Login] 오류 발생: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"로그인 처리 중 오류가 발생했습니다: {str(e)}"
            )


@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    """Google OAuth 콜백 처리
    
    사용자 정보를 받아서 데이터베이스에 저장하고 JWT 토큰 생성
    토큰을 httpOnly Cookie로 설정하여 보안 강화
    """
    try:
        # 요청 파라미터 로깅 (디버깅용)
        dev_log(f"[OAuth Callback] Query params: {dict(request.query_params)}")
        
        # Google에서 토큰 받기 (재시도 로직 추가)
        token = None
        max_retries = 3
        last_error = None
        
        for attempt in range(max_retries):
            try:
                token = await oauth.google.authorize_access_token(request)
                dev_log(f"[OAuth Callback] Token received: {bool(token)}")
                break
            except (ConnectTimeout, ReadTimeout, WriteTimeout, PoolTimeout, asyncio.TimeoutError) as e:
                last_error = e
                if attempt < max_retries - 1:
                    wait_time = (attempt + 1) * 2  # 2초, 4초, 6초로 증가
                    dev_log(f"[OAuth Callback] 타임아웃 발생 (시도 {attempt + 1}/{max_retries}), {wait_time}초 후 재시도...: {e}")
                    await asyncio.sleep(wait_time)
                else:
                    dev_log(f"[OAuth Callback] 모든 시도 실패: {e}")
            except Exception as e:
                # 타임아웃이 아닌 다른 에러는 즉시 실패
                last_error = e
                dev_log(f"[OAuth Callback] 예상치 못한 오류 발생: {e}")
                break
        
        if not token:
            # 모든 재시도 실패 시 id_token으로 fallback 시도
            dev_log(f"[OAuth Callback] 토큰 획득 실패, id_token으로 fallback 시도")
            code = request.query_params.get('code')
            if code:
                # code가 있으면 직접 토큰 교환 시도 (간단한 fallback)
                try:
                    # 쿼리 파라미터에서 state도 확인
                    state = request.query_params.get('state')
                    dev_log(f"[OAuth Callback] code와 state로 직접 토큰 교환 시도")
                    # authlib의 내부 메서드를 사용하거나, 직접 HTTP 요청
                    # 하지만 이건 복잡하므로, 사용자에게 재시도 요청
                    raise HTTPException(
                        status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                        detail="Google 인증 서버 응답이 지연되고 있습니다. 잠시 후 다시 로그인해주세요."
                    )
                except HTTPException:
                    raise
                except Exception as fallback_error:
                    dev_log(f"[OAuth Callback] Fallback도 실패: {fallback_error}")
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail=f"Google 인증 처리 중 오류가 발생했습니다: {str(last_error)}"
                    )
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Google 인증 토큰을 받아올 수 없습니다: {str(last_error)}"
                )
        
        # 사용자 정보 가져오기
        user_info = token.get('userinfo')
        if not user_info:
            dev_log(f"[OAuth Callback] userinfo 없음, id_token 시도")
            # userinfo가 없으면 토큰에서 직접 가져오기 시도
            if 'id_token' in token:
                from jose import jwt
                id_token = token['id_token']
                try:
                    # id_token 디코딩 (검증 없이, 정보만 가져오기)
                    decoded = jwt.get_unverified_claims(id_token)
                    user_info = decoded
                    dev_log(f"[OAuth Callback] id_token에서 사용자 정보 추출 성공")
                except Exception as decode_error:
                    dev_log(f"[OAuth Callback] id_token 디코딩 실패: {decode_error}")
            
            if not user_info:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="사용자 정보를 가져올 수 없습니다"
                )
        
        google_id = user_info.get('sub')
        email = user_info.get('email')
        name = user_info.get('name')
        picture = user_info.get('picture')
        
        dev_log(f"[OAuth Callback] User info: google_id={google_id}, email={email}, name={name}")
        
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
            # 사용자가 커스텀 프로필 사진을 업로드했다면 (Base64로 시작) 유지, 아니면 Google 사진으로 업데이트
            if not user.picture or not user.picture.startswith('data:image'):
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
        
        # Access Token 생성 (짧은 만료 시간: 15분)
        access_token = create_access_token(
            data={
                "user_id": user.id,
                "email": user.email,
                "name": user.name
            }
        )
        
        # Refresh Token 생성 (긴 만료 시간: 7일)
        refresh_token_str, refresh_expires_at = create_refresh_token(user.id)
        
        # Refresh Token DB에 저장
        refresh_token_db = RefreshToken(
            user_id=user.id,
            token=refresh_token_str,
            expires_at=refresh_expires_at
        )
        db.add(refresh_token_db)
        db.commit()
        
        prod_log(f"[OAuth Callback] 로그인 성공: user_id={user.id}, email={email}")
        dev_log(f"[OAuth Callback] Access Token 만료: 15분, Refresh Token 만료: 7일")
        
        # 프론트엔드로 리다이렉트 (쿼리 파라미터에 토큰 포함)
        # 프론트엔드에서 토큰을 받아 Cookie에 설정
        response = RedirectResponse(
            url=f"{FRONTEND_URL}/auth/callback?token={access_token}"
        )
        
        # httpOnly Cookie 설정 (JavaScript 접근 불가)
        is_production = os.getenv("ENVIRONMENT", "development") == "production"
        
        # Access Token Cookie (짧은 만료: 15분)
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,        # JavaScript 접근 차단 (XSS 방어)
            secure=is_production, # HTTPS에서만 전송 (프로덕션)
            samesite="lax",       # CSRF 방어
            max_age=900,          # 15분 (초 단위)
            path="/"
        )
        
        # Refresh Token Cookie (긴 만료: 7일)
        response.set_cookie(
            key="refresh_token",
            value=refresh_token_str,
            httponly=True,        # JavaScript 접근 차단
            secure=is_production,
            samesite="lax",
            max_age=604800,       # 7일 (초 단위)
            path="/"
        )
        
        dev_log(f"[OAuth Callback] httpOnly Cookies 설정 완료 (secure={is_production})")
        dev_log(f"[OAuth Callback] - Access Token: 15분")
        dev_log(f"[OAuth Callback] - Refresh Token: 7일")
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"OAuth 콜백 오류: {repr(e)}\n{traceback.format_exc()}"
        print(error_msg)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"인증 처리 중 오류가 발생했습니다: {str(e)}"
        )


@router.post("/refresh")
async def refresh_access_token(
    refresh_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """Refresh Token으로 새로운 Access Token 발급
    
    - Access Token 만료 시 자동으로 호출
    - Refresh Token도 함께 갱신 (Token Rotation)
    - 보안: 사용된 Refresh Token은 즉시 무효화
    """
    from fastapi.responses import JSONResponse
    from datetime import datetime
    
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh Token이 없습니다"
        )
    
    # Refresh Token 검증
    token_db = db.query(RefreshToken).filter(
        RefreshToken.token == refresh_token,
        RefreshToken.is_revoked == False
    ).first()
    
    if not token_db:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 Refresh Token입니다"
        )
    
    # 만료 확인
    if token_db.expires_at < datetime.utcnow():
        # 만료된 토큰 삭제
        db.delete(token_db)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh Token이 만료되었습니다. 다시 로그인해주세요."
        )
    
    # 사용자 정보 조회
    user = db.query(User).filter(User.id == token_db.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자를 찾을 수 없습니다"
        )
    
    # 기존 Refresh Token 무효화 (Token Rotation)
    token_db.is_revoked = True
    token_db.last_used_at = datetime.utcnow()
    
    # 새로운 Access Token 생성
    new_access_token = create_access_token(
        data={
            "user_id": user.id,
            "email": user.email,
            "name": user.name
        }
    )
    
    # 새로운 Refresh Token 생성 (Rotation)
    new_refresh_token_str, new_refresh_expires_at = create_refresh_token(user.id)
    new_refresh_token_db = RefreshToken(
        user_id=user.id,
        token=new_refresh_token_str,
        expires_at=new_refresh_expires_at
    )
    db.add(new_refresh_token_db)
    db.commit()
    
    prod_log(f"[Token Refresh] 토큰 갱신 성공: user_id={user.id}")
    
    # Cookie 갱신
    is_production = os.getenv("ENVIRONMENT", "development") == "production"
    response = JSONResponse(content={"message": "토큰이 갱신되었습니다"})
    
    # Access Token Cookie 갱신
    response.set_cookie(
        key="access_token",
        value=new_access_token,
        httponly=True,
        secure=is_production,
        samesite="lax",
        max_age=900,  # 15분
        path="/"
    )
    
    # Refresh Token Cookie 갱신
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token_str,
        httponly=True,
        secure=is_production,
        samesite="lax",
        max_age=604800,  # 7일
        path="/"
    )
    
    return response


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
    
    # 프로필 완성 여부 확인
    profile_completed = bool(user.phone and user.child_name and user.child_birthdate)
    
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "picture": user.picture,
        "is_subscribed": user.is_subscribed == 1,
        "created_at": user.created_at,
        "next_billing_at": user.next_billing_at,
        "has_billing_key": user.subscription_customer_uid is not None,
        "subscription_plan": user.subscription_plan,
        "phone": user.phone,
        "child_name": user.child_name,
        "child_birthdate": user.child_birthdate.isoformat() if user.child_birthdate else None,
        "profile_completed": profile_completed
    }


@router.post("/logout")
async def logout(
    access_token: Optional[str] = Cookie(None),
    refresh_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """로그아웃 (간단 버전 - 쿠키 기반)
    
    /logout-with-token과 동일한 기능을 제공합니다.
    """
    # 실제로는 logout-with-token으로 리다이렉트하는 것이 코드 중복을 줄입니다
    return await logout_with_token(None, access_token, refresh_token, db)


@router.post("/logout-with-token")
async def logout_with_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    access_token: Optional[str] = Cookie(None),
    refresh_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """로그아웃 (Access Token 블랙리스트 추가 및 Refresh Token 무효화)
    
    Authorization 헤더 또는 Cookie에서 토큰을 받아 처리합니다.
    """
    from app.models.token_blacklist import TokenBlacklist
    from jose import jwt
    from datetime import datetime
    from fastapi.responses import JSONResponse
    import os
    
    # Access Token 가져오기 (Cookie 우선)
    token = access_token
    if not token and credentials:
        token = credentials.credentials
    
    # Access Token이 있으면 블랙리스트 추가
    if token:
        try:
            # 토큰 디코딩하여 만료 시간 확인
            from app.utils.auth_utils import _get_secret_key
            secret_key = _get_secret_key()
            payload = jwt.decode(token, secret_key, algorithms=["HS256"])
            exp_timestamp = payload.get("exp")
            user_id = payload.get("user_id")
            
            if exp_timestamp:
                expires_at = datetime.fromtimestamp(exp_timestamp)
            else:
                # 만료 시간이 없으면 15분 후로 설정
                from datetime import timedelta
                expires_at = datetime.utcnow() + timedelta(minutes=15)
            
            # 블랙리스트에 Access Token 추가
            blacklist_entry = TokenBlacklist(
                token=token,
                expires_at=expires_at
            )
            db.add(blacklist_entry)
            
            # Refresh Token 무효화 (해당 사용자의 모든 Refresh Token)
            if user_id:
                db.query(RefreshToken).filter(
                    RefreshToken.user_id == user_id,
                    RefreshToken.is_revoked == False
                ).update({"is_revoked": True, "last_used_at": datetime.utcnow()})
            
            db.commit()
            dev_log(f"[Logout] Access Token 블랙리스트 추가 및 Refresh Token 무효화 완료")
            
        except Exception as e:
            dev_log(f"[Logout] 토큰 처리 오류: {e}")
            # 오류가 나도 로그아웃은 계속 진행
    
    # Refresh Token 무효화 (Cookie에서 직접 받은 경우)
    if refresh_token:
        try:
            token_db = db.query(RefreshToken).filter(
                RefreshToken.token == refresh_token
            ).first()
            if token_db:
                token_db.is_revoked = True
                token_db.last_used_at = datetime.utcnow()
                db.commit()
                dev_log(f"[Logout] Refresh Token 무효화 완료")
        except Exception as e:
            dev_log(f"[Logout] Refresh Token 무효화 오류: {e}")
    
    # Cookie 삭제를 포함한 응답 생성
    response = JSONResponse(
        content={"message": "로그아웃되었습니다. 모든 토큰이 무효화되었습니다."}
    )
    
    # Access Token Cookie 삭제
    response.delete_cookie(key="access_token", path="/")
    
    # Refresh Token Cookie 삭제
    response.delete_cookie(key="refresh_token", path="/")
    
    prod_log(f"[Logout] 로그아웃 완료 - Cookies 삭제")
    
    return response
