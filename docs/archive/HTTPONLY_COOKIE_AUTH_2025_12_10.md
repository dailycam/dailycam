# httpOnly Cookie 인증 방식 적용

## 📅 작업 일자: 2025년 12월 10일

## 🎯 목표
localStorage 대신 **httpOnly Cookie**를 사용하여 보안 강화

## 🔐 왜 httpOnly Cookie가 더 안전한가?

### 보안 비교

| 항목 | localStorage | httpOnly Cookie |
|------|-------------|-----------------|
| **JavaScript 접근** | ✅ 가능 | ❌ **불가능** |
| **XSS 공격** | 🔴 **취약** | 🟢 **방어됨** |
| **CSRF 공격** | 🟢 방어됨 | 🟡 sameSite로 방어 |
| **HTTPS 전용** | ❌ 없음 | ✅ secure 플래그 |
| **자동 전송** | ❌ 수동 | ✅ 자동 |
| **구현 복잡도** | 🟢 간단 | 🟡 중간 |
| **보안 수준** | 🟡 중간 | 🟢 **높음** |

### XSS 공격 시나리오

```javascript
// ❌ localStorage (취약)
// 악성 스크립트가 토큰을 탈취할 수 있음
const token = localStorage.getItem('access_token')
// → 공격자에게 토큰 전송 가능 😱

// ✅ httpOnly Cookie (안전)
// JavaScript로 접근 불가능!
document.cookie  // → access_token이 보이지 않음 🛡️
```

---

## 🔧 구현 상세

### 1. 백엔드 변경사항

#### auth_utils.py
```python
# Cookie 또는 Authorization 헤더에서 토큰 가져오기 (하위 호환성)
async def get_current_user_id(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    access_token: Optional[str] = Cookie(None)  # ← Cookie 추가
) -> int:
    # 1. Cookie 우선 (보안)
    token = access_token
    
    # 2. 없으면 헤더 (하위 호환성)
    if not token and credentials:
        token = credentials.credentials
```

#### auth/router.py - 로그인
```python
@router.get("/google/callback")
async def google_callback(...):
    # JWT 토큰 생성
    access_token = create_access_token(...)
    
    # httpOnly Cookie 설정
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,        # ← JavaScript 접근 차단 (XSS 방어)
        secure=is_production, # ← HTTPS에서만 전송
        samesite="lax",       # ← CSRF 방어
        max_age=604800,       # ← 7일 (초 단위)
        path="/"
    )
```

#### auth/router.py - 로그아웃
```python
@router.post("/logout-with-token")
async def logout_with_token(...):
    # Cookie 삭제
    response.delete_cookie(
        key="access_token",
        path="/"
    )
```

### 2. 프론트엔드 변경사항

#### context/AuthContext.tsx
```typescript
// ✅ 변경 후: credentials 추가
const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
  credentials: 'include',  // ← Cookie 자동 포함!
})

// ❌ 변경 전: Authorization 헤더
const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
  headers: {
    Authorization: `Bearer ${token}`,  // ← 수동으로 토큰 추가
  },
})
```

#### 모든 API 호출에 credentials 추가
```typescript
// 방법 1: 직접 추가
fetch(url, {
  credentials: 'include',  // ← 이거 하나만 추가!
})

// 방법 2: getAuthFetchOptions 사용
import { getAuthFetchOptions } from '@/lib/auth'

fetch(url, {
  ...getAuthFetchOptions(),  // credentials 자동 포함
})
```

---

## 🚀 배포 가이드

### 1. 환경 변수 확인
```bash
# env.production
ENVIRONMENT=production  # ← secure 플래그 활성화
```

### 2. CORS 설정
백엔드에서 credentials를 허용해야 합니다:

```python
# main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://dailycam.net"],
    allow_credentials=True,  # ← 필수!
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 3. 배포
```bash
# 백엔드
docker-compose down
docker-compose up -d --build

# 프론트엔드
cd frontend
npm run build
# 빌드 파일 배포
```

---

## 🧪 테스트 방법

### 1. Cookie 확인
```
1. Chrome 개발자 도구 (F12)
2. Application 탭
3. Cookies → https://dailycam.net
4. ✅ access_token 확인
   - HttpOnly: ✅ 체크됨 (JavaScript 접근 불가)
   - Secure: ✅ 체크됨 (HTTPS만)
   - SameSite: Lax (CSRF 방어)
```

### 2. JavaScript 접근 테스트
```javascript
// Console에서 실행
document.cookie
// ❌ access_token이 보이지 않아야 함 (httpOnly)
```

### 3. 로그인/로그아웃 테스트
```
1. 로그인 → Cookie 생성 확인
2. 새로고침 → 로그인 상태 유지
3. 브라우저 종료 → 재접속 → 로그인 상태 유지
4. 로그아웃 → Cookie 삭제 확인
```

### 4. API 호출 테스트
```
1. Network 탭 열기
2. 아무 API 호출 (예: /api/dashboard/summary)
3. Request Headers 확인
   ✅ Cookie: access_token=... (자동 포함됨)
```

---

## 🔄 하위 호환성

기존 Authorization 헤더 방식도 여전히 작동합니다:

```typescript
// ✅ 방법 1: Cookie (권장)
fetch(url, { credentials: 'include' })

// ✅ 방법 2: Authorization 헤더 (하위 호환)
fetch(url, {
  headers: { Authorization: `Bearer ${token}` }
})
```

백엔드가 **Cookie를 우선** 사용하고, 없으면 헤더를 확인합니다.

---

## ⚠️ 주의사항

### 1. CORS 설정 필수
```python
allow_credentials=True  # ← 이게 없으면 Cookie 전송 안됨!
```

### 2. 프로덕션에서만 secure
```python
secure=is_production  # ← 로컬(HTTP)에서는 False
```

### 3. sameSite 설정
```python
samesite="lax"  # ← "strict"로 하면 OAuth 콜백 안 됨!
```

### 4. 도메인 이슈
- 프론트엔드: `https://dailycam.net`
- 백엔드: `https://dailycam.net/api`
- ✅ 같은 도메인이어야 Cookie 전송됨

---

## 📊 보안 개선 효과

### 변경 전 (localStorage)
```
공격 시나리오:
1. 사이트에 XSS 취약점 존재
2. 악성 스크립트 삽입
3. localStorage.getItem('access_token')
4. 공격자 서버로 토큰 전송
5. 계정 탈취 완료 😱
```

### 변경 후 (httpOnly Cookie)
```
공격 시나리오:
1. 사이트에 XSS 취약점 존재
2. 악성 스크립트 삽입
3. document.cookie 시도
4. ❌ access_token 접근 불가 (httpOnly)
5. 공격 실패! 🛡️
```

---

## 📚 관련 파일

### 변경된 파일
- ✅ `backend/app/utils/auth_utils.py` - Cookie 지원 추가
- ✅ `backend/app/api/auth/router.py` - Cookie 설정/삭제
- ✅ `frontend/src/lib/auth.ts` - Cookie 방식 안내 추가
- ✅ `frontend/src/context/AuthContext.tsx` - credentials 추가

### 수정이 필요한 파일들
프론트엔드의 모든 fetch 호출에 `credentials: 'include'` 추가 필요:
- `frontend/src/pages/*.tsx`
- `frontend/src/features/**/*.tsx`
- `frontend/src/lib/api.ts`

---

## 🔗 참고 자료

- [MDN - HttpOnly Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#restrict_access_to_cookies)
- [OWASP - XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP - CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [FastAPI - Cookie Parameters](https://fastapi.tiangolo.com/tutorial/cookie-params/)

---

## ✅ 마이그레이션 체크리스트

### 백엔드
- [x] auth_utils.py - Cookie 지원 추가
- [x] auth/router.py - httpOnly Cookie 설정
- [x] auth/router.py - 로그아웃 시 Cookie 삭제
- [ ] CORS 설정 확인 (allow_credentials=True)

### 프론트엔드
- [x] AuthContext.tsx - credentials 추가
- [x] auth.ts - Cookie 방식 안내
- [ ] 모든 API 호출에 credentials 추가
- [ ] 테스트 및 검증

### 배포
- [ ] 환경 변수 설정 (ENVIRONMENT=production)
- [ ] 백엔드 재배포
- [ ] 프론트엔드 재배포
- [ ] Cookie 동작 확인
- [ ] XSS 방어 확인

---

## 💡 추가 보안 권장사항

### 1. CSP (Content Security Policy) 헤더 추가
```python
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    return response
```

### 2. Rate Limiting
```python
from slowapi import Limiter

limiter = Limiter(key_func=get_remote_address)

@app.get("/api/auth/me")
@limiter.limit("60/minute")  # 분당 60회 제한
async def get_current_user(...):
    ...
```

### 3. 토큰 Rotation
```python
# Access Token (짧음) + Refresh Token (김)
ACCESS_TOKEN_EXPIRE_MINUTES = 15  # 15분으로 단축
REFRESH_TOKEN_EXPIRE_DAYS = 7     # Refresh는 7일
```


