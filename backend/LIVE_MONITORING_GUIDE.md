# 라이브 모니터링 가이드

## 개요

가짜 라이브 스트림을 생성하여 1시간 단위로 자동 분석하는 시스템입니다.

## 아키텍처

```
영상 파일들 → 가짜 라이브 스트림 생성 → 1시간 단위 버퍼링 → 자동 분석 → DB 저장
```

### 주요 구성 요소

1. **VideoQueue**: 짧은 영상들을 큐로 관리
2. **FakeLiveStreamGenerator**: 영상들을 연속 재생하여 1시간 단위로 저장
3. **HourlyAnalysisScheduler**: 1시간마다 자동으로 Gemini VLM 분석 실행
4. **API Router**: 스트림 시작/중지, 상태 조회 등

## 디렉토리 구조

```
backend/
├── videos/
│   └── camera-1/
│       ├── short/          # 10-15초 짧은 영상들
│       │   ├── clip_001.mp4
│       │   └── clip_002.mp4
│       └── medium/         # 5분 중간 영상들
│           └── clip_101.mp4
└── temp_videos/
    └── hourly_buffer/
        └── camera-1/       # 1시간 단위 버퍼 파일 저장
            ├── hourly_20241128_140000.mp4
            └── hourly_20241128_150000.mp4
```

## 사용 방법

### 1. 영상 파일 준비

짧은 영상들을 `videos/camera-1/short/` 폴더에 복사합니다.

```bash
# PowerShell
Copy-Item "your_video.mp4" "videos/camera-1/short/"
```

### 2. 백엔드 서버 시작

```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

### 3. 스트림 시작

#### API 호출
```bash
# PowerShell
Invoke-RestMethod -Method Post -Uri "http://localhost:8000/api/live-monitoring/start-stream/camera-1?enable_analysis=true"
```

#### 또는 Python 스크립트
```bash
python test_live_monitoring.py
```

### 4. 스트림 상태 확인

```bash
# PowerShell
Invoke-RestMethod -Uri "http://localhost:8000/api/live-monitoring/status/camera-1"
```

### 5. 1시간 단위 파일 목록 확인

```bash
# PowerShell
Invoke-RestMethod -Uri "http://localhost:8000/api/live-monitoring/list-hourly-files/camera-1"
```

### 6. 스트림 중지

```bash
# PowerShell
Invoke-RestMethod -Method Post -Uri "http://localhost:8000/api/live-monitoring/stop-stream/camera-1"
```

## API 엔드포인트

### POST /api/live-monitoring/start-stream/{camera_id}

스트림 시작

**Parameters:**
- `enable_analysis` (bool, optional): 1시간 단위 분석 활성화 (기본값: true)

**Response:**
```json
{
  "message": "스트림 시작: camera-1",
  "camera_id": "camera-1",
  "status": "running",
  "analysis_enabled": true
}
```

### POST /api/live-monitoring/stop-stream/{camera_id}

스트림 및 분석 중지

### GET /api/live-monitoring/status/{camera_id}

스트림 상태 조회

**Response:**
```json
{
  "camera_id": "camera-1",
  "is_running": true,
  "hourly_files_count": 3,
  "hourly_files": [
    "hourly_20241128_140000.mp4",
    "hourly_20241128_150000.mp4",
    "hourly_20241128_160000.mp4"
  ]
}
```

### GET /api/live-monitoring/list-hourly-files/{camera_id}

1시간 단위 버퍼 파일 목록 조회

**Response:**
```json
{
  "camera_id": "camera-1",
  "total_files": 3,
  "files": [
    {
      "filename": "hourly_20241128_140000.mp4",
      "path": "temp_videos/hourly_buffer/camera-1/hourly_20241128_140000.mp4",
      "size_mb": 45.23,
      "created_at": "2024-11-28T14:00:00"
    }
  ]
}
```

### GET /api/live-monitoring/stream/{camera_id}

실시간 MJPEG 스트리밍 (프론트엔드용)

**Parameters:**
- `loop` (bool): 반복 재생 (기본값: true)
- `speed` (float): 재생 속도 (기본값: 1.0)

## 동작 원리

### 1. 가짜 라이브 스트림 생성

1. `VideoQueue`가 short/medium 폴더의 영상들을 로드
2. 짧은 영상 10개 + 중간 영상 1개 패턴 반복 (약 7분)
3. 1시간 분량이 될 때까지 패턴 반복

### 2. 1시간 단위 버퍼링

1. `FakeLiveStreamGenerator`가 영상들을 순차 재생
2. 프레임을 1fps로 다운샘플링하여 480p로 리사이즈
3. 시간대가 바뀌면 (예: 14:00 → 15:00) 자동으로 새 파일 생성
4. `hourly_YYYYMMDD_HHMMSS.mp4` 형식으로 저장

### 3. 자동 분석

1. `HourlyAnalysisScheduler`가 매 시간 정각 + 5분에 실행
2. 이전 시간대의 hourly 파일을 찾아서 분석
3. `GeminiService.analyze_video_vlm()`로 VLM 분석 실행
4. 결과를 `HourlyAnalysis` 테이블에 저장

### 4. 데이터베이스 저장

분석 결과는 다음 테이블에 저장됩니다:

- `hourly_analyses`: 1시간 단위 상세 분석 결과
- `realtime_events`: 실시간 이벤트 (추후 구현)
- `daily_reports`: 일일 리포트 (추후 구현)

## 설정

### 영상 큐 설정

`VideoQueue.load_videos()` 파라미터:
- `shuffle`: 영상 순서 섞기 (기본값: True)
- `target_duration_minutes`: 목표 재생 시간 (기본값: 60분)

### 스트림 설정

`FakeLiveStreamGenerator`:
- `target_width`: 640px
- `target_height`: 480px
- `target_fps`: 1.0 (분석용)

### 분석 스케줄

`HourlyAnalysisScheduler`:
- 실행 시간: 매 시간 정각 + 5분 (예: 14:05, 15:05)
- 5분 여유를 두어 1시간 분량 비디오가 완전히 저장되도록 함

## 트러블슈팅

### 스트림이 시작되지 않음

1. 영상 파일이 있는지 확인:
   ```bash
   ls videos/camera-1/short/
   ```

2. 디렉토리 권한 확인

### 분석이 실행되지 않음

1. hourly 파일이 생성되었는지 확인:
   ```bash
   ls temp_videos/hourly_buffer/camera-1/
   ```

2. 백엔드 로그 확인:
   - `[분석 스케줄러]` 로그 메시지 확인

### 메모리 부족

1. 영상 해상도를 낮추기 (FakeLiveStreamGenerator 설정)
2. 분석 완료 후 hourly 파일 자동 삭제 활성화

## 다음 단계

1. **실시간 이벤트 탐지**: 경량 이벤트 탐지 추가
2. **일일 리포트 생성**: hourly 분석 결과 집계
3. **프론트엔드 연동**: 실시간 타임라인 표시
4. **S3 연동**: 장기 보관용 스토리지

## 참고

- Gemini API 비용: 1시간 분석당 약 $0.01-0.05 (영상 길이에 따라)
- 디스크 공간: 1시간 분량 약 50-100MB (480p, 1fps 기준)

