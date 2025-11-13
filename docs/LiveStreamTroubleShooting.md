# 라이브 스트리밍 트러블슈팅 가이드

이 문서는 라이브 스트리밍 기능 개발 중 발생한 문제들과 해결 방법을 정리한 것입니다.

## 문제 1: 비디오 업로드 시 "업로드 중..."에서 멈추는 문제

### 증상
- 비디오 파일을 업로드하면 "업로드 중..." 상태에서 진행이 멈춤
- 브라우저 콘솔에 에러 메시지가 없거나 불명확함

### 원인
- 네트워크 오류나 타임아웃이 발생했을 때 적절한 에러 처리가 없음
- 백엔드 서버가 실행되지 않았을 때 에러 메시지가 명확하지 않음
- 파일 크기가 클 때 업로드 시간이 오래 걸려 타임아웃 발생 가능

### 해결 방법

#### 프론트엔드 개선 (`frontend/src/lib/api.ts`)
```typescript
// 타임아웃 설정 추가
const response = await fetch(
  `${API_BASE_URL}/api/live-monitoring/upload-video?camera_id=${cameraId}`,
  {
    method: 'POST',
    body: formData,
    signal: AbortSignal.timeout(5 * 60 * 1000), // 5분 타임아웃
  }
)

// 상세한 에러 처리
if (error.name === 'AbortError' || error.name === 'TimeoutError') {
  throw new Error('업로드 시간이 초과되었습니다. 파일 크기를 확인해주세요.')
}
if (error.name === 'TypeError' && error.message.includes('fetch')) {
  throw new Error('서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.')
}
```

#### 백엔드 개선 (`backend/app/api/live_monitoring/router.py`)
```python
# 로깅 추가
logger.info(f"비디오 업로드 요청 받음: camera_id={camera_id}, filename={video.filename}")

# 청크 단위로 읽어서 메모리 효율성 향상
while True:
    chunk = await video.read(8192)  # 8KB 청크
    if not chunk:
        break
    f.write(chunk)
    total_size += len(chunk)
    logger.debug(f"파일 저장 중: {total_size} bytes")
```

### 확인 사항
- 브라우저 개발자 도구(F12) → Console 탭에서 에러 메시지 확인
- Network 탭에서 `/api/live-monitoring/upload-video` 요청 상태 확인
- 백엔드 서버가 `http://localhost:8000`에서 실행 중인지 확인

---

## 문제 2: 새 영상 업로드 시 이전 영상이 계속 재생되는 문제

### 증상
- 새 비디오 파일을 업로드해도 이전 영상이 계속 재생됨
- 브라우저 캐시 문제로 보임

### 원인
- 스트림 URL이 동일하여 브라우저가 캐시된 이미지를 계속 표시
- 이미지 태그가 URL 변경을 감지하지 못함

### 해결 방법

#### 프론트엔드 개선 (`frontend/src/pages/LiveMonitoring.tsx`)
```typescript
// 1. 기존 스트림 중지
if (streamUrl) {
  await stopStream(selectedCamera)
  setStreamUrl(null)
  await new Promise((resolve) => setTimeout(resolve, 500))
}

// 2. 타임스탬프를 추가하여 새로운 스트림임을 명확히 함
const timestamp = Date.now()
const url = getStreamUrl(selectedCamera, streamLoop, streamSpeed, timestamp, result.video_path)

// 3. 이미지 태그에 key prop 추가하여 URL 변경 시 강제 리로드
<img
  key={streamUrl} // URL 변경 시 이미지 강제 리로드
  src={streamUrl}
  alt="Live Stream"
/>
```

#### 스트림 URL 생성 함수 개선 (`frontend/src/lib/api.ts`)
```typescript
export function getStreamUrl(
  cameraId: string,
  loop: boolean = true,
  speed: number = 1.0,
  timestamp?: number,
  videoPath?: string
): string {
  const ts = timestamp || Date.now()
  const baseUrl = `${API_BASE_URL}/api/live-monitoring/stream/${cameraId}?loop=${loop}&speed=${speed}&t=${ts}`
  
  if (videoPath) {
    return `${baseUrl}&video_path=${encodeURIComponent(videoPath)}`
  }
  
  return baseUrl
}
```

---

## 문제 3: 긴 영상 업로드 시 이전 영상이 재생되는 문제

### 증상
- 긴 영상(큰 파일)을 업로드하면 이전에 업로드한 영상이 재생됨
- 파일 용량과 관련이 있어 보임

### 원인
- 백엔드에서 파일을 찾을 때 정렬하지 않아 어떤 파일이 선택될지 불확실
- 같은 카메라 ID로 여러 파일이 있을 때 최신 파일을 선택하지 않음
- 업로드가 완료되기 전에 스트림이 시작되면 이전 파일을 찾을 수 있음

### 해결 방법

#### 백엔드 개선 (`backend/app/api/live_monitoring/router.py`)
```python
# 수정 시간으로 정렬하여 가장 최근 파일 선택
temp_files = list(TEMP_VIDEO_DIR.glob(f"{camera_id}_*"))
temp_files.sort(key=lambda p: p.stat().st_mtime, reverse=True)
video_path = str(temp_files[0])
```

#### 프론트엔드 개선 (`frontend/src/pages/LiveMonitoring.tsx`)
```typescript
// 업로드 응답의 video_path를 사용하여 정확한 파일 경로로 스트림 시작
const result = await uploadVideoForStreaming(selectedCamera, videoFile)
const url = getStreamUrl(
  selectedCamera,
  streamLoop,
  streamSpeed,
  timestamp,
  result.video_path // 업로드된 정확한 파일 경로 사용
)
```

#### 백엔드 업로드 응답 개선 (`backend/app/api/live_monitoring/router.py`)
```python
# 절대 경로로 변환하여 반환
absolute_path = str(temp_file_path.resolve())

return {
    "camera_id": camera_id,
    "video_path": absolute_path,  # 절대 경로 반환
    "filename": video.filename,
    "message": "비디오 파일이 업로드되었습니다.",
    "stream_url": f"/api/live-monitoring/stream/{camera_id}",
}
```

---

## 문제 4: 페이지 이동 시 스트림이 끊기는 문제

### 증상
- 실시간 모니터링 페이지에서 다른 페이지로 이동했다가 돌아오면 스트림이 보이지 않음
- 파일 저장 중 오류: `[WinError 32] 다른 프로세스가 파일을 사용 중이기 때문에 프로세스가 액세스 할 수 없습니다`

### 원인
- FastAPI의 `StreamingResponse`는 클라이언트 연결이 끊기면 자동으로 종료됨
- 페이지를 떠나면 HTTP 연결이 끊어지고 백엔드 스트림도 종료됨
- 새 파일 업로드 시 기존 스트림이 사용 중인 파일을 삭제하려고 해서 오류 발생

### 해결 방법

#### 백그라운드 태스크로 스트림 실행 (`backend/app/services/live_monitoring/service.py`)

**핵심 변경:**
- 스트림을 독립적인 백그라운드 태스크로 실행
- 클라이언트 연결과 무관하게 계속 실행
- 현재 프레임을 메모리에 저장

```python
async def _background_stream_task(
    self,
    camera_id: str,
    video_path: str,
    loop: bool,
    speed: float,
) -> None:
    """백그라운드에서 비디오를 읽고 현재 프레임을 업데이트하는 태스크."""
    cap = None
    try:
        cap = self._get_video_capture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or self._config.default_fps
        frame_delay = 1.0 / (fps * speed)

        while True:
            ret, frame = cap.read()
            if not ret:
                if loop:
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    continue
                else:
                    break

            # 프레임을 JPEG로 인코딩
            encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 85]
            _, buffer = cv2.imencode(".jpg", frame, encode_param)
            frame_bytes = buffer.tobytes()

            # 현재 프레임 업데이트 (동기화)
            async with self._lock:
                if camera_id in self._active_streams:
                    self._active_streams[camera_id].current_frame = frame_bytes

            await asyncio.sleep(frame_delay)
    finally:
        if cap is not None:
            cap.release()
```

#### 파일 업로드 시 스트림 중지 (`backend/app/api/live_monitoring/router.py`)
```python
# 기존 파일이 있으면 삭제 (스트림이 사용 중일 수 있으므로 먼저 스트림 중지)
if temp_file_path.exists():
    # 해당 카메라의 스트림이 활성화되어 있으면 먼저 중지
    if camera_id in service.get_active_streams():
        logger.info(f"기존 스트림 중지 중: {camera_id}")
        await service.stop_stream(camera_id)
        await asyncio.sleep(0.5)  # 스트림 완전 종료 대기
    
    # 파일 삭제 시도
    try:
        temp_file_path.unlink()
    except PermissionError as e:
        # 파일이 사용 중이면 다른 이름으로 저장
        timestamp = int(time.time())
        temp_file_path = TEMP_VIDEO_DIR / f"{camera_id}_{timestamp}_{video.filename}{file_extension}"
```

#### 프론트엔드 localStorage 활용 (`frontend/src/pages/LiveMonitoring.tsx`)
```typescript
// 페이지 로드 시 저장된 스트림 정보 복원
useEffect(() => {
  const savedStreamInfo = localStorage.getItem(`stream_${selectedCamera}`)
  if (savedStreamInfo) {
    const info = JSON.parse(savedStreamInfo)
    if (info.videoPath) {
      lastVideoPathRef.current = info.videoPath
      // 타임스탬프 없이 기존 스트림 사용 (초기화 방지)
      const url = getStreamUrl(
        selectedCamera,
        info.streamLoop ?? streamLoop,
        info.streamSpeed ?? streamSpeed,
        undefined, // 타임스탬프 없음 (기존 스트림 사용)
        info.videoPath
      )
      setStreamUrl(url)
    }
  }
}, [selectedCamera])

// 스트림 정보를 localStorage에 저장
useEffect(() => {
  if (streamUrl && lastVideoPathRef.current) {
    const streamInfo = {
      videoPath: lastVideoPathRef.current,
      streamUrl: streamUrl,
      streamLoop: streamLoop,
      streamSpeed: streamSpeed,
      cameraId: selectedCamera,
    }
    localStorage.setItem(`stream_${selectedCamera}`, JSON.stringify(streamInfo))
  }
}, [streamUrl, streamLoop, streamSpeed, selectedCamera])
```

---

## 문제 5: 페이지 복귀 시 영상이 초기화되는 문제

### 증상
- 페이지를 떠났다가 돌아오면 영상이 처음부터 다시 시작됨
- 스트림은 계속 실행 중이지만 프론트엔드에서 새 스트림으로 인식

### 원인
- 스트림 URL에 타임스탬프를 추가하면 새 스트림이 시작됨
- 백그라운드에서 계속 실행 중인 스트림을 사용하지 않고 새로 시작

### 해결 방법

#### 타임스탬프 조건부 추가 (`frontend/src/lib/api.ts`)
```typescript
export function getStreamUrl(
  cameraId: string,
  loop: boolean = true,
  speed: number = 1.0,
  timestamp?: number,  // undefined일 수 있음
  videoPath?: string
): string {
  let baseUrl = `${API_BASE_URL}/api/live-monitoring/stream/${cameraId}?loop=${loop}&speed=${speed}`
  
  // timestamp가 제공된 경우에만 추가 (새 스트림 시작 시)
  if (timestamp !== undefined) {
    baseUrl += `&t=${timestamp}`
  }
  
  if (videoPath) {
    return `${baseUrl}&video_path=${encodeURIComponent(videoPath)}`
  }
  
  return baseUrl
}
```

#### 페이지 복귀 시 기존 스트림 사용 (`frontend/src/pages/LiveMonitoring.tsx`)
```typescript
// 타임스탬프 없이 기존 스트림 사용
const url = getStreamUrl(
  selectedCamera,
  info.streamLoop ?? streamLoop,
  info.streamSpeed ?? streamSpeed,
  undefined, // 타임스탬프 없음 (기존 스트림 사용)
  info.videoPath
)
```

---

## 문제 6: 자동 재연결 기능

### 증상
- 스트림이 끊겼을 때 자동으로 재연결되지 않음
- 네트워크 문제나 일시적인 오류 시 수동으로 다시 시작해야 함

### 해결 방법

#### 자동 재연결 로직 추가 (`frontend/src/pages/LiveMonitoring.tsx`)
```typescript
// 스트림 이미지 로드 오류 처리
const handleStreamError = () => {
  console.warn('스트림 이미지 로드 실패, 재연결 시도...')
  setIsStreamActive(false)
  
  // 재연결 시도 (최대 5회)
  if (reconnectAttempts < 5 && lastVideoPathRef.current) {
    const newAttempts = reconnectAttempts + 1
    setReconnectAttempts(newAttempts)
    
    // 2초 후 재연결
    setTimeout(() => {
      const timestamp = Date.now()
      const url = getStreamUrl(
        selectedCamera,
        streamLoop,
        streamSpeed,
        timestamp,
        lastVideoPathRef.current || undefined
      )
      setStreamUrl(null)
      setTimeout(() => {
        setStreamUrl(url)
        setIsStreamActive(true)
      }, 100)
    }, 2000)
  }
}

// 스트림 모니터링 (30초마다 상태 확인)
const startStreamMonitoring = () => {
  streamCheckIntervalRef.current = setInterval(() => {
    if (streamUrl && streamImgRef.current) {
      const img = streamImgRef.current
      if (!img.complete || img.naturalWidth === 0) {
        console.warn('스트림 이미지가 로드되지 않음, 재연결 시도...')
        handleStreamError()
      } else {
        setIsStreamActive(true)
      }
    }
  }, 30000) // 30초마다 확인
}
```

---

## 최종 아키텍처

### 백그라운드 태스크 기반 스트리밍

```
┌─────────────────────────────────────────────────────────┐
│                    백엔드 서버                          │
│                                                         │
│  ┌──────────────────────────────────────────────┐     │
│  │  백그라운드 태스크 (독립 실행)                │     │
│  │  - 비디오 파일 읽기                           │     │
│  │  - 프레임을 JPEG로 인코딩                     │     │
│  │  - 메모리에 현재 프레임 저장                  │     │
│  │  - 클라이언트 연결과 무관하게 계속 실행       │     │
│  └──────────────────────────────────────────────┘     │
│                        │                                │
│                        ▼                                │
│  ┌──────────────────────────────────────────────┐     │
│  │  스트림 상태 관리                             │     │
│  │  - current_frame: 현재 프레임 (JPEG 바이트)   │     │
│  │  - task: 백그라운드 태스크 참조               │     │
│  └──────────────────────────────────────────────┘     │
│                        │                                │
│                        ▼                                │
│  ┌──────────────────────────────────────────────┐     │
│  │  MJPEG 스트림 엔드포인트                      │     │
│  │  - 클라이언트 요청 시 현재 프레임 전송        │     │
│  │  - 여러 클라이언트가 동시 접근 가능           │     │
│  └──────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
                        │
                        │ HTTP 연결
                        ▼
┌─────────────────────────────────────────────────────────┐
│                  프론트엔드 (브라우저)                   │
│                                                         │
│  ┌──────────────────────────────────────────────┐     │
│  │  <img src="stream_url" />                    │     │
│  │  - MJPEG 스트림 수신                         │     │
│  │  - 자동 재연결 기능                           │     │
│  │  - localStorage에 스트림 정보 저장           │     │
│  └──────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

### 주요 특징

1. **독립 실행**: 백그라운드 태스크가 클라이언트 연결과 무관하게 계속 실행
2. **상태 유지**: 페이지를 떠나도 스트림이 계속 실행되고 현재 프레임 업데이트
3. **자동 복원**: localStorage를 사용하여 페이지 복귀 시 자동으로 스트림 복원
4. **초기화 방지**: 타임스탬프 없이 기존 스트림에 연결하여 영상이 초기화되지 않음

---

## 체크리스트

문제 발생 시 확인할 사항:

- [ ] 백엔드 서버가 실행 중인가? (`http://localhost:8000`)
- [ ] 브라우저 콘솔에 에러 메시지가 있는가?
- [ ] Network 탭에서 API 요청이 성공했는가?
- [ ] 비디오 파일이 올바른 형식인가? (mp4, mov, avi 등)
- [ ] 파일 크기가 너무 크지 않은가? (타임아웃 가능)
- [ ] `temp_videos/` 디렉토리에 파일이 저장되었는가?
- [ ] 같은 카메라 ID로 여러 파일이 있는가? (최신 파일 선택 확인)
- [ ] localStorage에 스트림 정보가 저장되어 있는가?
- [ ] 백그라운드 태스크가 실행 중인가? (백엔드 로그 확인)

---

## 참고 자료

- [FastAPI StreamingResponse 문서](https://fastapi.tiangolo.com/advanced/custom-response/#streamingresponse)
- [OpenCV 비디오 처리 문서](https://docs.opencv.org/4.x/dd/d43/tutorial_py_video_display.html)
- [MJPEG 스트리밍 프로토콜](https://en.wikipedia.org/wiki/Motion_JPEG)
- [Python asyncio 백그라운드 태스크](https://docs.python.org/3/library/asyncio-task.html)

