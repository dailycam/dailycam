# 스트림 지속성 개선 완료 ✅

## 📅 수정 날짜
2024년 12월 2일

## 🎯 문제

다른 네비게이션으로 이동했다가 모니터링 페이지로 돌아오면 **영상 스트림이 멈추는 현상** 발생

### 원인
- MJPEG 스트림은 `<img>` 태그로 구현됨
- 페이지를 벗어나면 브라우저가 자동으로 연결 종료
- 백엔드는 계속 스트리밍 중이지만 프론트엔드 연결이 끊김

## ✅ 해결 방법

### 1. 페이지 Visibility 감지 추가
페이지로 돌아올 때 자동으로 스트림 복원

```typescript
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && streamUrl) {
      console.log('페이지 재진입 감지 - 스트림 복원 중...')
      
      // 재연결 시도 횟수 리셋
      setReconnectAttempts(0)
      
      // 타임스탬프 추가하여 강제 새로고침
      const timestamp = Date.now()
      const newUrl = getStreamUrl(
        selectedCamera,
        streamLoop,
        streamSpeed,
        timestamp,
        lastVideoPathRef.current || undefined
      )
      
      // 스트림 URL 업데이트
      setStreamUrl(null)
      setTimeout(() => {
        setStreamUrl(newUrl)
        setIsStreamActive(true)
      }, 100)
    }
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)
  
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }
}, [streamUrl, selectedCamera, streamLoop, streamSpeed])
```

### 2. 페이지 로드 시 타임스탬프 추가
저장된 스트림 정보를 복원할 때도 새 연결 시도

```typescript
// 타임스탬프 추가하여 항상 새로운 연결 시도
const timestamp = Date.now()
const url = getStreamUrl(
  selectedCamera,
  info.streamLoop ?? streamLoop,
  info.streamSpeed ?? streamSpeed,
  timestamp,  // 타임스탬프 추가
  info.videoPath
)
```

### 3. 기존 재연결 로직 활용
이미 구현된 `handleStreamError`와 `handleStreamLoad` 활용

## 📊 동작 방식

### 시나리오 1: 다른 페이지로 이동
```
1. 사용자가 다른 메뉴 클릭
   ↓
2. 브라우저가 MJPEG 연결 자동 종료
   ↓
3. 백엔드는 계속 스트리밍 중 (영향 없음)
```

### 시나리오 2: 모니터링 페이지로 복귀
```
1. 사용자가 모니터링 메뉴 클릭
   ↓
2. visibilitychange 이벤트 감지
   ↓
3. 재연결 시도 횟수 리셋
   ↓
4. 타임스탬프 추가한 새 URL 생성
   ↓
5. 스트림 URL 업데이트 (강제 새로고침)
   ↓
6. 영상 스트림 자동 복원 ✅
```

## 🎨 사용자 경험 개선

### 이전
- ❌ 다른 페이지 갔다가 돌아오면 영상 멈춤
- ❌ 수동으로 새로고침 필요
- ❌ 불편한 사용자 경험

### 현재
- ✅ 다른 페이지 갔다가 돌아와도 자동 복원
- ✅ 수동 조작 불필요
- ✅ 부드러운 사용자 경험

## 🔧 기술적 세부사항

### Visibility API 사용
```typescript
document.addEventListener('visibilitychange', handleVisibilityChange)
```

- `document.visibilityState === 'visible'`: 페이지가 보임
- `document.visibilityState === 'hidden'`: 페이지가 숨겨짐

### 타임스탬프 캐시 방지
```typescript
const timestamp = Date.now()
const url = getStreamUrl(..., timestamp, ...)
```

- 브라우저 캐시 방지
- 항상 새로운 연결 시도
- URL: `/api/live-monitoring/stream/camera-1?_t=1701234567890`

### 재연결 로직
```typescript
setStreamUrl(null)  // 기존 스트림 제거
setTimeout(() => {
  setStreamUrl(newUrl)  // 새 스트림 연결
  setIsStreamActive(true)
}, 100)
```

- 100ms 딜레이로 안정적인 재연결
- React 상태 업데이트 순서 보장

## 📈 테스트 시나리오

### 1. 기본 동작 테스트
```
1. 모니터링 페이지에서 영상 확인
2. 다른 메뉴(Dashboard, Analytics 등) 클릭
3. 다시 모니터링 페이지로 돌아오기
4. ✅ 영상이 자동으로 재생됨
```

### 2. 반복 테스트
```
1. 여러 메뉴를 왔다갔다 하기
2. ✅ 매번 모니터링 페이지로 돌아올 때마다 영상 자동 복원
```

### 3. 새로고침 테스트
```
1. 모니터링 페이지에서 F5 (새로고침)
2. ✅ localStorage에서 스트림 정보 복원
3. ✅ 타임스탬프 추가하여 새 연결
4. ✅ 영상 자동 재생
```

## 🐛 문제 해결

### Q: 여전히 영상이 멈춰요
**A**: 다음을 확인하세요:
1. 백엔드 서버가 실행 중인지 확인
2. 브라우저 콘솔에서 에러 메시지 확인
3. 네트워크 탭에서 스트림 요청 상태 확인

### Q: 스트림이 너무 느려요
**A**: 
1. 네트워크 연결 상태 확인
2. 백엔드 서버 리소스 확인
3. 다른 탭/앱이 네트워크 대역폭을 사용하는지 확인

### Q: 재연결이 계속 실패해요
**A**:
1. 백엔드 로그 확인
2. 5회 재연결 시도 후 실패하면 수동으로 "스트림 시작" 버튼 클릭
3. localStorage 초기화: `localStorage.clear()`

## 💡 추가 개선 가능 사항

### 1. 백엔드 스트림 상태 확인
```typescript
// 페이지 로드 시 백엔드 스트림 상태 확인
const checkBackendStreamStatus = async () => {
  const status = await getStreamStatus(selectedCamera)
  if (status.is_running && !streamUrl) {
    // 백엔드는 실행 중인데 프론트엔드 연결 없음 → 자동 연결
    const url = getStreamUrl(selectedCamera, ...)
    setStreamUrl(url)
  }
}
```

### 2. WebSocket 기반 스트림
```typescript
// MJPEG 대신 WebSocket 사용 (더 안정적)
const ws = new WebSocket('ws://localhost:8000/ws/stream/camera-1')
ws.onmessage = (event) => {
  // 프레임 데이터 처리
}
```

### 3. 오프라인 감지
```typescript
// 네트워크 연결 상태 감지
window.addEventListener('online', () => {
  console.log('네트워크 복구 - 스트림 재연결')
  // 스트림 재연결
})
```

## 🎉 완료!

모니터링 페이지의 스트림 지속성이 개선되었습니다!

**주요 개선사항**:
- ✅ 페이지 이동 후 자동 복원
- ✅ 타임스탬프 기반 캐시 방지
- ✅ 재연결 로직 개선
- ✅ 부드러운 사용자 경험

이제 다른 페이지를 갔다가 돌아와도 영상이 계속 재생됩니다! 🚀

## 📚 관련 파일

- `frontend/src/pages/Monitoring.tsx` - 스트림 지속성 로직 추가
- `frontend/src/lib/api.ts` - API 함수들
- `backend/app/api/live_monitoring/router.py` - 스트림 API

## 📞 참고 자료

- [Visibility API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)
- [MJPEG Streaming](https://en.wikipedia.org/wiki/Motion_JPEG)
- [React useEffect](https://react.dev/reference/react/useEffect)

