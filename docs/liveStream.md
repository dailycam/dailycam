# 라이브 스트리밍 기능 가이드

## 개요

녹화된 비디오 파일을 라이브 스트림처럼 보여주는 기능을 구현했습니다. 이 기능을 통해 실제 카메라 없이도 실시간 캠 연동 기능을 테스트할 수 있습니다.

## 구현 방식

### 선택한 방식: 백엔드 MJPEG 스트리밍

**이유:**
- 프로젝트에 통합하기 쉬움 (FastAPI 백엔드 활용)
- 외부 도구(FFmpeg/VLC) 설치 불필요
- 프론트엔드에서 비디오 파일 선택 → 즉시 스트리밍 가능
- 스트림 속도 조절, 루프 재생 등 유연한 제어 가능
- 브라우저에서 `<img>` 태그로 바로 재생 가능

## 아키텍처

```
프론트엔드 (React)
    ↓ (비디오 파일 업로드)
백엔드 API (/api/live-monitoring/upload-video)
    ↓ (임시 저장)
temp_videos/ 디렉토리
    ↓ (MJPEG 스트리밍)
백엔드 스트리밍 엔드포인트 (/api/live-monitoring/stream/{camera_id})
    ↓ (프레임 단위 전송)
프론트엔드 <img> 태그로 표시
```

## 주요 기능

### 1. 비디오 파일 업로드
- 프론트엔드에서 비디오 파일 선택
- 백엔드로 업로드하여 임시 저장
- 카메라 ID별로 파일 관리

### 2. MJPEG 스트리밍
- OpenCV로 비디오 프레임 읽기
- JPEG로 인코딩하여 MJPEG 스트림 형식으로 전송
- 실시간 프레임 전송

### 3. 스트림 제어
- **재생 속도 조절**: 0.5x ~ 3x
- **루프 재생**: 비디오 끝에 도달하면 처음부터 반복
- **스트림 중지**: 언제든지 스트림 중지 가능

## 기술 스택

### 백엔드
- **FastAPI**: REST API 및 스트리밍 엔드포인트
- **OpenCV (cv2)**: 비디오 파일 읽기 및 프레임 처리
- **NumPy**: 이미지 데이터 처리

### 프론트엔드
- **React**: UI 컴포넌트
- **TypeScript**: 타입 안정성
- **Fetch API**: 백엔드 통신

## API 엔드포인트

### 1. 비디오 업로드
```
POST /api/live-monitoring/upload-video?camera_id={camera_id}
Content-Type: multipart/form-data

Body:
  - video: File (비디오 파일)

Response:
{
  "camera_id": "camera-1",
  "video_path": "temp_videos/camera-1_video.mp4",
  "filename": "video.mp4",
  "message": "비디오 파일이 업로드되었습니다. 스트리밍 엔드포인트를 사용하세요.",
  "stream_url": "/api/live-monitoring/stream/camera-1"
}
```

### 2. 스트리밍
```
GET /api/live-monitoring/stream/{camera_id}?loop=true&speed=1.0

Query Parameters:
  - loop: boolean (기본값: true) - 비디오 반복 재생 여부
  - speed: float (기본값: 1.0) - 재생 속도 배율
  - video_path: string (선택) - 직접 비디오 파일 경로 지정

Response:
  Content-Type: multipart/x-mixed-replace; boundary=frame
  (MJPEG 스트림)
```

### 3. 스트림 중지
```
POST /api/live-monitoring/stop-stream/{camera_id}

Response:
{
  "message": "카메라 camera-1의 스트림이 중지되었습니다."
}
```

### 4. 활성 스트림 목록
```
GET /api/live-monitoring/active-streams

Response:
{
  "active_streams": ["camera-1", "camera-2"]
}
```

## 사용 방법

### 1. 백엔드 설정

#### 의존성 설치
```bash
cd backend
pip install -r requirements.txt
```

필요한 패키지:
- `opencv-python>=4.8.0`
- `numpy>=1.24.0`
- `fastapi>=0.110.0`

#### 서버 실행
```bash
python run.py
# 또는
uvicorn app.main:app --reload
```

### 2. 프론트엔드 사용

1. **실시간 모니터링 페이지 접속**
   - `/live-monitoring` 경로로 이동

2. **비디오 파일 업로드**
   - 우측 상단의 "비디오 업로드" 버튼 클릭
   - 비디오 파일 선택 (mp4, mov, avi 등)
   - 재생 속도 및 루프 옵션 설정
   - "업로드 및 스트리밍 시작" 클릭

3. **스트림 확인**
   - 업로드된 비디오가 라이브 스트림으로 표시됨
   - LIVE 인디케이터가 표시됨

4. **스트림 중지**
   - "스트림 중지" 버튼 클릭

## 파일 구조

### 백엔드

```
backend/
├── app/
│   ├── api/
│   │   └── live_monitoring/
│   │       └── router.py          # 스트리밍 API 엔드포인트
│   ├── services/
│   │   └── live_monitoring/
│   │       └── service.py         # 비디오 스트리밍 서비스 로직
│   └── ...
├── temp_videos/                    # 업로드된 비디오 임시 저장 디렉토리
└── requirements.txt                # opencv-python, numpy 추가됨
```

### 프론트엔드

```
frontend/
├── src/
│   ├── lib/
│   │   └── api.ts                 # 스트리밍 API 클라이언트 함수
│   └── pages/
│       └── LiveMonitoring.tsx     # 비디오 업로드 및 스트리밍 UI
└── ...
```

## 주요 구현 내용

### 백엔드 서비스 (`service.py`)

```python
class LiveMonitoringService:
    async def generate_mjpeg_stream(
        self,
        camera_id: str,
        video_path: str | None = None,
        loop: bool = True,
        speed: float = 1.0,
    ) -> AsyncGenerator[bytes, None]:
        """
        녹화된 비디오 파일을 MJPEG 스트림으로 변환하여 전송합니다.
        """
        # OpenCV로 비디오 파일 열기
        cap = cv2.VideoCapture(video_path)
        
        # 프레임 단위로 읽어서 JPEG 인코딩
        while True:
            ret, frame = cap.read()
            if not ret:
                if loop:
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    continue
                break
            
            # JPEG 인코딩
            _, buffer = cv2.imencode(".jpg", frame)
            frame_bytes = buffer.tobytes()
            
            # MJPEG 스트림 형식으로 전송
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
            )
            
            # 프레임 속도에 맞춰 대기
            await asyncio.sleep(frame_delay)
```

### 프론트엔드 컴포넌트 (`LiveMonitoring.tsx`)

```typescript
// 비디오 업로드 및 스트리밍 시작
const handleUploadAndStream = async () => {
  await uploadVideoForStreaming(selectedCamera, videoFile)
  const url = getStreamUrl(selectedCamera, streamLoop, streamSpeed)
  setStreamUrl(url)
}

// 스트림 표시
{streamUrl && (
  <img
    src={streamUrl}
    alt="Live Stream"
    className="w-full h-full object-contain"
  />
)}
```

## 설정 옵션

### 스트리밍 속도
- **0.5x**: 느린 재생 (테스트용)
- **1.0x**: 정상 속도 (기본값)
- **1.5x ~ 3.0x**: 빠른 재생

### 루프 모드
- **true**: 비디오 끝에 도달하면 처음부터 반복
- **false**: 비디오 끝에 도달하면 스트림 종료

## 제한사항 및 주의사항

1. **비디오 파일 크기**
   - 큰 비디오 파일 업로드 시 시간이 걸릴 수 있음
   - 네트워크 상태에 따라 업로드 시간 변동

2. **동시 스트리밍**
   - 여러 카메라 동시 스트리밍 가능
   - 각 카메라별로 독립적인 스트림 관리

3. **임시 파일 관리**
   - 업로드된 파일은 `temp_videos/` 디렉토리에 저장
   - 서버 재시작 시 파일 유지됨 (수동 삭제 필요)

4. **브라우저 호환성**
   - MJPEG 스트림은 대부분의 모던 브라우저에서 지원
   - `<img>` 태그로 직접 표시 가능

## 향후 개선 사항

1. **파일 관리**
   - 업로드된 파일 자동 정리 기능
   - 파일 크기 제한 설정
   - 파일 형식 검증 강화

2. **스트리밍 최적화**
   - 프레임 스킵 옵션 (낮은 대역폭 환경)
   - 해상도 조절 옵션
   - 비디오 코덱 자동 감지

3. **UI 개선**
   - 스트리밍 상태 표시 (연결됨/끊김)
   - 재생 시간 표시
   - 스트림 품질 표시

4. **실제 카메라 연동**
   - RTSP 스트림 지원
   - 웹캠 직접 연결
   - IP 카메라 연동

## 문제 해결

### 스트림이 표시되지 않는 경우
1. 백엔드 서버가 실행 중인지 확인
2. 비디오 파일이 올바르게 업로드되었는지 확인
3. 브라우저 콘솔에서 오류 메시지 확인
4. 네트워크 연결 상태 확인

### 업로드 실패
1. 비디오 파일 형식 확인 (mp4, mov, avi 등)
2. 파일 크기 확인 (너무 큰 파일은 시간이 걸릴 수 있음)
3. 백엔드 로그 확인

### 스트림이 끊기는 경우
1. 네트워크 연결 상태 확인
2. 백엔드 서버 상태 확인
3. 비디오 파일이 손상되지 않았는지 확인

## 트러블슈팅

개발 중 발생한 문제들과 해결 방법은 [트러블슈팅 가이드](./LiveStreamTroubleShooting.md)를 참고하세요.

## 참고 자료

- [FastAPI StreamingResponse 문서](https://fastapi.tiangolo.com/advanced/custom-response/#streamingresponse)
- [OpenCV 비디오 처리 문서](https://docs.opencv.org/4.x/dd/d43/tutorial_py_video_display.html)
- [MJPEG 스트리밍 프로토콜](https://en.wikipedia.org/wiki/Motion_JPEG)

