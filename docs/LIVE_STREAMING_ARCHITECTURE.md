# 라이브 스트리밍 시스템 아키텍처 문서

## 📹 라이브 스트리밍 시스템

### 구조 및 흐름

**1. HLS (HTTP Live Streaming) 방식**
- 백그라운드에서 계속 실행되는 진짜 실시간 스트림
- 재연결 시 자동으로 현재 시간부터 재생
- 10초 단위 `.ts` 세그먼트 파일 + `.m3u8` 플레이리스트

**2. 스트림 생성 프로세스**
```
영상 큐 로드 → 프레임 추출 (5fps) → FFmpeg로 HLS 변환 → 
10초 단위 .ts 파일 생성 → .m3u8 플레이리스트 업데이트
```

**3. 주요 구성 요소**
- `HLSStreamGenerator`: HLS 스트림 생성
- `VideoQueue`: 영상 파일 큐 관리
- FFmpeg: HLS 인코딩

**4. 파일 구조**
```
temp_videos/hls_buffer/camera-1/
├── hls/
│   ├── camera-1.m3u8          # 플레이리스트
│   ├── camera-1_000.ts        # 10초 세그먼트
│   └── ...
└── archive/                    # 10분 단위 아카이브
    ├── archive_20251202_140000.mp4
    └── ...
```

---

## 🔍 실시간 이벤트 탐지 시스템

### 구조 및 흐름

**1. 하이브리드 탐지 방식 (현재: Gemini 전용)**
- OpenCV 경량 탐지: 비활성화됨 (정확도 문제)
- Gemini 분석: 45초마다 실행

**2. 탐지 프로세스**
```
프레임 캡처 (5fps) → 30프레임마다 탐지 체크 →
Gemini 분석 필요 시 (45초 간격) → 
Gemini API 호출 → 이벤트 생성 → DB 저장
```

**3. 주요 구성 요소**
- `RealtimeEventDetector`: 실시간 이벤트 탐지
- `GeminiService`: Gemini API 호출
- `RealtimeEvent` 모델: 이벤트 저장

**4. 탐지 설정**
- Gemini 분석 간격: 45초
- 프레임 체크 간격: 30프레임 (약 1초)
- 이벤트 쿨다운: 10초

**5. 이벤트 유형**
- `safety`: 안전 관련 (danger, warning)
- `development`: 발달 관련 (info)

---

## 📊 10분 간격 영상 분석 시스템

### 구조 및 흐름

**1. 분석 프로세스**
```
10분 단위 세그먼트 생성 (3000 프레임, 5fps) →
10분 30초 후 스케줄러 실행 →
이전 10분 구간 영상 파일 찾기 →
Gemini VLM 분석 → 결과 DB 저장
```

**2. 버퍼링 방식**
- 프레임 카운트 기반: 정확히 3000 프레임(10분)마다 새 파일 생성
- 파일명 형식: `segment_YYYYMMDD_HHMMSS.mp4`
- 저장 위치: `temp_videos/hourly_buffer/camera-1/`

**3. 주요 구성 요소**
- `FakeLiveStreamGenerator`: 10분 단위 세그먼트 생성
- `SegmentAnalysisScheduler`: 10분마다 분석 스케줄링
- `SegmentAnalysis` 모델: 분석 결과 저장

**4. 스케줄링 로직**
- 실행 시간: 매 10분 정각 + 30초 (예: 14:00:30, 14:10:30)
- 분석 대상: 이전 10분 구간 (예: 14:00:30에 13:50:00~14:00:00 분석)

**5. 분석 결과**
- 안전 점수 (`safety_score`)
- 사건 수 (`incident_count`)
- 상세 분석 결과 (`analysis_result`)

---

## 🛠 사용 기술 스택

### 백엔드 기술

**1. 스트리밍**
- **FFmpeg**: HLS 인코딩, 영상 처리
- **OpenCV**: 프레임 추출, 리사이징
- **asyncio**: 비동기 스트리밍 처리

**2. AI 분석**
- **Google Gemini API**: 영상/이미지 분석
  - `analyze_video_vlm()`: 10분 영상 분석
  - `analyze_realtime_snapshot()`: 실시간 프레임 분석

**3. 데이터베이스**
- **SQLAlchemy**: ORM
- **MySQL**: 데이터 저장
- **모델**:
  - `RealtimeEvent`: 실시간 이벤트
  - `SegmentAnalysis`: 10분 단위 분석 결과

**4. 웹 프레임워크**
- **FastAPI**: REST API
- **비동기 처리**: asyncio

### 프론트엔드 기술

**1. 스트리밍 재생**
- **HLS.js**: HLS 스트림 재생
- **HTML5 Video**: 네이티브 HLS 지원 (Safari)

**2. 실시간 업데이트**
- **폴링**: 주기적 이벤트 조회
- **WebSocket**: 추후 구현 가능

---

## 📈 전체 시스템 흐름도

```
[영상 소스]
    ↓
[VideoQueue] → 영상 파일 로드
    ↓
[HLSStreamGenerator / FakeLiveStreamGenerator]
    ├─→ [HLS 스트림 생성] → .m3u8 + .ts 파일
    ├─→ [10분 아카이브] → segment_*.mp4 파일
    └─→ [실시간 탐지] → RealtimeEventDetector
                        ├─→ Gemini 분석 (45초마다)
                        └─→ RealtimeEvent 저장
    ↓
[SegmentAnalysisScheduler]
    ├─→ 10분마다 실행
    ├─→ 이전 세그먼트 파일 분석
    └─→ SegmentAnalysis 저장
    ↓
[프론트엔드]
    ├─→ HLS 스트림 재생
    ├─→ 실시간 이벤트 조회
    └─→ 10분 분석 결과 조회
```

---

## 💰 비용 구조

### 24시간 기준 예상 비용

**1. 실시간 Gemini 분석**
- 45초마다 1회 = 시간당 80회
- 24시간 = 1,920회
- 비용: 약 $0.62/일 (약 800원)

**2. 10분 단위 분석**
- 10분마다 1회 = 시간당 6회
- 24시간 = 144회
- 비용: 약 $0.40/일 (약 520원)

**3. 총 비용**
- 일일: 약 $1.02 (약 1,320원)
- 월간: 약 $30.60 (약 39,600원)

---

## 🎯 주요 특징

1. **백그라운드 지속 실행**: HLS 스트림이 백그라운드에서 계속 실행
2. **이어서 재생**: 재연결 시 자동으로 현재 시간부터 재생
3. **프레임 카운트 기반 버퍼링**: 정확히 10분 분량 보장
4. **하이브리드 탐지**: Gemini 기반 실시간 이벤트 탐지
5. **자동 스케줄링**: 10분 단위 분석 자동 실행

---

## 📝 주요 파일 위치

### 백엔드
- `backend/app/services/live_monitoring/hls_stream_generator.py`: HLS 스트림 생성
- `backend/app/services/live_monitoring/fake_stream_generator.py`: 가짜 스트림 생성 (10분 세그먼트)
- `backend/app/services/live_monitoring/realtime_detector.py`: 실시간 이벤트 탐지
- `backend/app/services/live_monitoring/segment_analyzer.py`: 10분 단위 분석 스케줄러
- `backend/app/api/live_monitoring/router.py`: API 엔드포인트

### 프론트엔드
- `frontend/src/pages/Monitoring.tsx`: 모니터링 페이지
- `frontend/src/lib/api.ts`: API 호출 함수

---

## 🔧 설정 파라미터

### 스트리밍 설정
- **FPS**: 5.0fps
- **해상도**: 640x480 (480p)
- **HLS 세그먼트 길이**: 10초
- **10분 세그먼트 프레임 수**: 3000 프레임

### 실시간 탐지 설정
- **Gemini 분석 간격**: 45초
- **프레임 체크 간격**: 30프레임
- **이벤트 쿨다운**: 10초

### 10분 분석 설정
- **세그먼트 길이**: 10분
- **스케줄 실행 시간**: 매 10분 정각 + 30초
- **분석 지연**: 30초 (파일 완성 대기)

---

## 📚 관련 문서

- `docs/HLS_STREAMING_GUIDE.md`: HLS 스트리밍 가이드
- `backend/10MIN_ANALYSIS_UPDATE.md`: 10분 분석 업데이트
- `backend/HYBRID_REALTIME_GUIDE.md`: 하이브리드 실시간 탐지 가이드
- `backend/LIVE_MONITORING_GUIDE.md`: 라이브 모니터링 가이드

---

## 🚀 API 엔드포인트

### 스트리밍
- `POST /api/live-monitoring/start-hls-stream/{camera_id}`: HLS 스트림 시작
- `POST /api/live-monitoring/stop-hls-stream/{camera_id}`: HLS 스트림 중지
- `GET /api/live-monitoring/hls/{camera_id}/{filename}`: HLS 파일 제공

### 실시간 이벤트
- `GET /api/live-monitoring/events/{camera_id}`: 실시간 이벤트 조회
- `GET /api/live-monitoring/events/{camera_id}/latest`: 최신 이벤트 조회
- `GET /api/live-monitoring/stats/{camera_id}`: 모니터링 통계

### 10분 분석
- `GET /api/live-monitoring/segment-analyses/{camera_id}`: 10분 분석 결과 조회

---

이 문서는 현재 시스템의 라이브 스트리밍, 실시간 이벤트 탐지, 10분 간격 영상 분석에 대한 전체 구조와 흐름을 정리한 것입니다.

