# 인증 세션 만료 문제 해결

## 📅 작업 일자: 2025년 12월 10일

## 🔍 문제 상황

**사용자 불편 사항:**
> "브라우저를 종료하면 로그인이 풀려요. 매번 다시 로그인해야 해서 불편합니다."

### 원인 분석

**기존 구현:**
```typescript
// frontend/src/lib/auth.ts (변경 전)
sessionStorage.setItem('access_token', token)  // ❌ sessionStorage 사용
```

**sessionStorage의 동작:**
- ✅ 새로고침(F5): 토큰 유지 → 로그인 상태 유지
- ❌ **브라우저 종료: 토큰 삭제 → 다시 로그인 필요** ← 문제!
- ❌ 탭 닫기: 토큰 삭제 → 다시 로그인 필요

---

## ✅ 해결 방법: localStorage로 변경

### 1. 변경 사항

```typescript
// frontend/src/lib/auth.ts (변경 후)
localStorage.setItem('access_token', token)  // ✅ localStorage 사용
```

### 2. localStorage의 동작

- ✅ 새로고침(F5): 토큰 유지
- ✅ **브라우저 종료: 토큰 유지** ← 해결!
- ✅ 탭 닫기: 토큰 유지
- ✅ JWT 만료 시간(7일)까지 자동 로그인 유지
- ✅ 명시적으로 로그아웃하면 토큰 삭제

---

## 📊 저장소 비교

| 저장소 | 지속 기간 | 브라우저 종료 시 | 탭 공유 | 용도 |
|--------|----------|---------------|--------|------|
| **sessionStorage** | 탭이 열려있는 동안 | 🗑️ 삭제됨 | ❌ 각 탭 독립 | 임시 데이터 |
| **localStorage** | 영구 (수동 삭제 전까지) | ✅ 유지됨 | ✅ 모든 탭 공유 | 지속 데이터 |
| **Cookie (httpOnly)** | 만료 시간까지 | ✅ 유지됨 | ✅ 모든 탭 공유 | 보안 중요 데이터 |

---

## 🔐 보안 고려사항

### 현재 구현 (JWT + localStorage)

#### 장점 ✅
1. **사용자 편의성**: 브라우저 종료해도 로그인 유지
2. **간단한 구현**: 클라이언트 사이드에서만 관리
3. **서버 부하 없음**: 세션 저장 불필요
4. **확장성**: 여러 서버에서도 동작

#### 단점 ⚠️
1. **XSS 공격 취약**: JavaScript로 접근 가능
2. **토큰 탈취 위험**: localStorage는 암호화되지 않음

### 보안 강화 방안 (선택사항)

#### 옵션 1: httpOnly Cookie 사용 (최고 보안)
```python
# 백엔드에서 쿠키로 토큰 전달
response.set_cookie(
    key="access_token",
    value=token,
    httponly=True,  # JavaScript 접근 차단
    secure=True,    # HTTPS만 허용
    samesite="lax", # CSRF 방어
    max_age=604800  # 7일
)
```

**장점:**
- XSS 공격 방어 (JavaScript 접근 불가)
- 자동으로 모든 요청에 포함
- 보안이 가장 강함

**단점:**
- 백엔드 수정 필요
- CORS 설정 복잡
- 모바일 앱에서 사용 어려움

#### 옵션 2: 토큰 갱신(Refresh Token) 추가
```
Access Token (짧은 만료: 15분) + Refresh Token (긴 만료: 7일)
```

**장점:**
- Access Token 탈취 시 피해 최소화
- 더 세밀한 보안 제어

**단점:**
- 구현 복잡도 증가
- 서버 상태 관리 필요

---

## 🛡️ 현재 보안 조치

### 1. JWT 토큰 만료 시간
```python
# backend/app/utils/auth_utils.py
ACCESS_TOKEN_EXPIRE_DAYS = 7  # 7일 후 자동 만료
```

### 2. 토큰 블랙리스트
```python
# 로그아웃 시 토큰 무효화
@router.post("/logout-with-token")
async def logout_with_token(...):
    # 토큰을 블랙리스트에 추가
    blacklist_entry = TokenBlacklist(token=token, expires_at=expires_at)
    db.add(blacklist_entry)
```

### 3. HTTPS 사용 (배포 환경)
- 모든 통신 암호화
- 중간자 공격 방어

### 4. CORS 설정
```python
# 허용된 도메인만 API 접근 가능
CORS_ALLOWED_ORIGINS = "https://dailycam.net"
```

---

## 📝 사용자 경험 개선

### 변경 전 🙁
```
1. 로그인
2. 대시보드 사용
3. 브라우저 종료
4. 다시 브라우저 열기
5. ❌ 로그인 페이지로 리다이렉트 (다시 로그인 필요)
```

### 변경 후 😊
```
1. 로그인
2. 대시보드 사용
3. 브라우저 종료
4. 다시 브라우저 열기
5. ✅ 바로 대시보드 접속 (자동 로그인)
```

---

## 🚀 배포 방법

### 프론트엔드 배포

```bash
cd frontend
npm run build
# 빌드된 파일을 서버에 배포
```

### 테스트 방법

1. **로그인**
   ```
   1. https://dailycam.net 접속
   2. Google 로그인
   ```

2. **브라우저 종료 후 재접속**
   ```
   1. 브라우저 완전 종료 (Ctrl+Q 또는 X 버튼)
   2. 다시 https://dailycam.net 접속
   3. ✅ 자동으로 로그인 상태 유지 확인
   ```

3. **로그아웃 확인**
   ```
   1. 우측 상단 프로필 → 로그아웃 클릭
   2. localStorage에서 토큰 삭제 확인 (F12 → Application → Local Storage)
   3. ✅ 로그인 페이지로 이동 확인
   ```

---

## 🔍 디버깅 방법

### 브라우저 개발자 도구 (F12)

```javascript
// 1. Application 탭 → Local Storage 확인
localStorage.getItem('access_token')  // 토큰 확인

// 2. Console에서 테스트
console.log('토큰 있음:', !!localStorage.getItem('access_token'))

// 3. 토큰 수동 삭제 (테스트용)
localStorage.removeItem('access_token')
```

### 서버 로그 확인

```bash
# 백엔드 컨테이너 로그
docker logs dailycam-fastapi -f

# 인증 관련 로그 확인
# [Auth] 토큰 저장 완료 (localStorage)
# [Auth] 토큰 조회 성공
# [Auth] 토큰 삭제 완료 (localStorage)
```

---

## 📚 관련 파일

### 변경된 파일
- ✅ `frontend/src/lib/auth.ts` - sessionStorage → localStorage

### 관련 파일 (변경 없음)
- `frontend/src/context/AuthContext.tsx` - 인증 컨텍스트
- `backend/app/api/auth/router.py` - 인증 API
- `backend/app/utils/auth_utils.py` - JWT 토큰 생성

---

## ⚠️ 주의사항

### 1. 공용 컴퓨터 사용 시
사용자에게 안내:
> "공용 컴퓨터에서는 사용 후 반드시 로그아웃해주세요!"

### 2. 토큰 만료
- JWT 토큰은 **7일 후 자동 만료**
- 만료 시 자동으로 로그인 페이지로 이동
- 재로그인 필요

### 3. 여러 기기에서 로그인
- 각 기기마다 별도의 토큰 발급
- 한 기기에서 로그아웃해도 다른 기기는 영향 없음
- 모든 기기에서 로그아웃하려면 각각 로그아웃 필요

---

## 🎯 향후 개선 사항 (선택)

### 1. "로그인 상태 유지" 체크박스 추가
```typescript
// 로그인 페이지에 체크박스 추가
<input type="checkbox" id="remember" checked />
<label for="remember">로그인 상태 유지 (7일)</label>

// 체크하면 localStorage, 해제하면 sessionStorage 사용
if (rememberMe) {
  localStorage.setItem('access_token', token)
} else {
  sessionStorage.setItem('access_token', token)
}
```

### 2. 자동 로그아웃 타이머 추가
```typescript
// 30분 동안 활동 없으면 자동 로그아웃
let lastActivity = Date.now()
window.addEventListener('mousemove', () => {
  lastActivity = Date.now()
})

setInterval(() => {
  if (Date.now() - lastActivity > 30 * 60 * 1000) {
    logout()
  }
}, 60000) // 1분마다 체크
```

### 3. 토큰 자동 갱신
```typescript
// Access Token 만료 5분 전에 자동 갱신
const refreshToken = async () => {
  const response = await fetch('/api/auth/refresh')
  const { access_token } = await response.json()
  setAuthToken(access_token)
}
```

---

## 📊 변경 사항 요약

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| 저장소 | sessionStorage | localStorage |
| 브라우저 종료 시 | 로그인 풀림 ❌ | 로그인 유지 ✅ |
| 탭 닫기 시 | 로그인 풀림 ❌ | 로그인 유지 ✅ |
| 새로고침 시 | 로그인 유지 ✅ | 로그인 유지 ✅ |
| 토큰 만료 | 7일 | 7일 (동일) |
| 보안 수준 | 중간 | 중간 (동일) |

---

## ✅ 테스트 체크리스트

- [ ] 로그인 성공 확인
- [ ] 새로고침 시 로그인 상태 유지 확인
- [ ] **브라우저 종료 후 재접속 시 로그인 상태 유지 확인** ⭐
- [ ] **탭 닫기 후 재접속 시 로그인 상태 유지 확인** ⭐
- [ ] 로그아웃 동작 확인
- [ ] localStorage에 토큰 저장 확인 (F12 → Application)
- [ ] 7일 후 토큰 만료 확인 (선택사항)

---

## 🔗 참고 자료

- [MDN - localStorage](https://developer.mozilla.org/ko/docs/Web/API/Window/localStorage)
- [MDN - sessionStorage](https://developer.mozilla.org/ko/docs/Web/API/Window/sessionStorage)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP - XSS Prevention](https://owasp.org/www-community/attacks/xss/)


