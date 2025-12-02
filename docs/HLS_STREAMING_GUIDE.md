# HLS 스트리밍 가이드

## 개요

HLS (HTTP Live Streaming)를 사용한 **진짜 실시간 스트림** 구현

### 기존 방식 vs HLS 방식

| 항목 | 기존 (MJPEG) | HLS |
|------|-------------|-----|
| 재연결 시 | 처음부터 재생 | 현재 시간부터 재생 |
| 백그라운드 실행 | ❌ | ✅ |
| 이어서 재생 | ❌ | ✅ |
| 브라우저 지원 | 모든 브라우저 | 모든 브라우저 |
| 홈캠 연동 | 가능 | 가능 |

## 동작 방식

```
1. 백그라운드에서 FFmpeg가 계속 실행
   ↓
2. 10초 단위로 .ts 파일 생성
   ↓
3. .m3u8 플레이리스트 자동 업데이트
   ↓
4. 브라우저가 최신 세그먼트 자동 재생
```

### 예시: 이어서 재생

```
사용자 행동:
- 00:05 - 스트림 시작
- 00:08 - 대시보드로 이동 (스트림은 백그라운드에서 계속 실행)
- 00:11 - 모니터링 페이지로 복귀

결과:
- 00:11부터 재생 (00:05가 아님!)
- 3초 동안 놓친 내용 없음
```

## API 사용법

### 1. HLS 스트림 시작 (가짜 영상)

```bash
POST /api/live-monitoring/start-hls-stream/camera-1
```

### 2. HLS 스트림 시작 (실제 홈캠)

```bash
POST /api/live-monitoring/start-hls-stream/camera-1?camera_url=rtsp://192.168.1.100:554/stream
```

### 3. 플레이리스트 URL

```
/api/live-monitoring/hls/camera-1/camera-1.m3u8
```

## 프론트엔드 사용법

### React에서 HLS 재생

```typescript
import Hls from 'hls.js'

const videoRef = useRef<HTMLVideoElement>(null)

useEffect(() => {
  if (videoRef.current && playlistUrl) {
    if (Hls.isSupported()) {
      const hls = new Hls()
      hls.loadSource(playlistUrl)
      hls.attachMedia(videoRef.current)
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        videoRef.current?.play()
      })
      
      return () => {
        hls.destroy()
      }
    } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari 네이티브 HLS 지원
      videoRef.current.src = playlistUrl
      videoRef.current.play()
    }
  }
}, [playlistUrl])

return <video ref={videoRef} controls />
```

## 장점

1. ✅ **진짜 실시간**: 백그라운드에서 계속 실행
2. ✅ **자동 이어서 재생**: 재연결 시 현재 시간부터
3. ✅ **표준 기술**: 모든 브라우저 지원
4. ✅ **홈캠 연동 준비**: 실제 홈캠도 동일하게 처리
5. ✅ **10분 단위 아카이브**: 메타데이터 추출용 파일 자동 생성

## 파일 구조

```
temp_videos/hls_buffer/camera-1/
├── hls/                          # HLS 스트림 파일
│   ├── camera-1.m3u8            # 플레이리스트
│   ├── camera-1_000.ts          # 세그먼트 (10초)
│   ├── camera-1_001.ts
│   └── ...
└── archive/                      # 10분 단위 아카이브
    ├── archive_20251202_140000.mp4
    ├── archive_20251202_141000.mp4
    └── ...
```

## 다음 단계

1. ✅ HLS 스트림 생성기 구현
2. ✅ API 엔드포인트 추가
3. ⏳ 프론트엔드 HLS 플레이어 구현
4. ⏳ 실제 홈캠 테스트

