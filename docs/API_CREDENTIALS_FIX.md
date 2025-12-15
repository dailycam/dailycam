# API credentials 누락 수정 가이드

## 문제점
프론트엔드의 fetch 호출에서 `credentials: 'include'`가 누락되어 httpOnly Cookie가 전송되지 않음

## 영향
- 대시보드 날짜 변경 시 데이터가 갱신되지 않음
- 안전 리포트, 발달 리포트 등에서 인증 실패 가능

## 수정 방법

### 수정 전
```typescript
const response = await fetch(`${API_BASE_URL}/api/...`, {
  method: 'GET',
  headers: {
    ...getAuthHeader(),
  },
})
```

### 수정 후
```typescript
const response = await fetch(`${API_BASE_URL}/api/...`, {
  method: 'GET',
  headers: {
    ...getAuthHeader(),
  },
  credentials: 'include', // httpOnly Cookie 전송
})
```

## 수정 완료된 파일
- ✅ `frontend/src/lib/api.ts` - getDashboardData, getDevelopmentData
- ✅ `frontend/src/features/safety/hooks/useSafetyReport.ts` - 모든 fetch
- ✅ `frontend/src/features/dashboard/hooks/useDashboard.ts` - 로딩 상태 수정

## 추가 수정 필요
`frontend/src/lib/api.ts`에 총 21개의 fetch 호출이 있음
각 fetch 호출에 `credentials: 'include'` 추가 필요

### 검색 명령어
```bash
# credentials가 없는 fetch 찾기
grep -n "await fetch" frontend/src/lib/api.ts
```

### 일괄 수정 (신중하게)
모든 fetch 옵션 객체에 `credentials: 'include'` 추가

