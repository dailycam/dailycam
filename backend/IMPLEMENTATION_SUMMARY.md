# 라이브 모니터링 구현 완료 요약

## ✅ 완료된 작업

### 1. 디렉토리 구조 생성
- `backend/videos/camera-1/short/` - 짧은 영상 저장
- `backend/videos/camera-1/medium/` - 중간 영상 저장
- `backend/temp_videos/hourly_buffer/camera-1/` - 1시간 단위 버퍼 파일

### 2. 핵심 서비스 구현

#### VideoQueue (`app/services/live_monitoring/video_queue.py`)
- 영상 파일 큐 관리
- 짧은 영상 + 중간 영상 패턴 조합
- 1시간 분량 자동 구성

#### FakeLiveStreamGenerator (`app/services/live_monitoring/fake_stream_generator.py`)
- 영상들을 연속 재생하여 가짜 라이브 스트림 생성
- 1시간 단위로 자동 분할 저장
- 480p, 1fps로 최적화

#### HourlyAnalysisScheduler (`app/services/live_monitoring/hourly_analyzer.py`)
- 매 시간 정각 + 5분에 자동 실행
- Gemini VLM으로 1시간 분량 분석
- 결과를 DB에 저장

### 3. API 엔드포인트 구현

#### `/api/live-monitoring/start-stream/{camera_id}`
- 스트림 시작
- 1시간 단위 분석 스케줄러 자동 시작

#### `/api/live-monitoring/stop-stream/{camera_id}`
- 스트림 및 분석 중지

#### `/api/live-monitoring/status/{camera_id}`
- 스트림 상태 조회

#### `/api/live-monitoring/list-hourly-files/{camera_id}`
- 1시간 단위 파일 목록 조회

#### `/api/live-monitoring/stream/{camera_id}`
- MJPEG 스트리밍 (프론트엔드용)

### 4. 데이터베이스 모델

#### HourlyAnalysis
- 1시간 단위 분석 결과 저장
- Gemini VLM 전체 결과 JSON 저장
- 안전 점수, 사건 수 등 요약 정보

#### RealtimeEvent
- 실시간 이벤트 저장 (추후 활용)

#### DailyReport
- 일일 리포트 (추후 구현)

## 📋 사용 방법

### 1. 영상 파일 준비
```powershell
# 기존 영상 파일 복사 (이미 완료됨)
Copy-Item "temp_videos/camera-1_1.mp4.mp4" "videos/camera-1/short/clip_001.mp4"
Copy-Item "temp_videos/camera-1_4.mp4.mp4" "videos/camera-1/short/clip_002.mp4"
```

### 2. 서버 시작
```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

### 3. 스트림 시작 (API 호출)
```powershell
# PowerShell
$response = Invoke-RestMethod -Method Post -Uri "http://localhost:8000/api/live-monitoring/start-stream/camera-1?enable_analysis=true"
$response
```

### 4. 상태 확인
```powershell
# 스트림 상태
Invoke-RestMethod -Uri "http://localhost:8000/api/live-monitoring/status/camera-1"

# 1시간 파일 목록
Invoke-RestMethod -Uri "http://localhost:8000/api/live-monitoring/list-hourly-files/camera-1"
```

### 5. 스트림 중지
```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:8000/api/live-monitoring/stop-stream/camera-1"
```

## 🔄 동작 흐름

```
1. 스트림 시작
   ↓
2. VideoQueue가 영상 파일들 로드
   ↓
3. FakeLiveStreamGenerator가 영상 연속 재생
   ↓
4. 1시간마다 hourly_YYYYMMDD_HHMMSS.mp4 생성
   ↓
5. HourlyAnalysisScheduler가 매 시간 정각+5분에 실행
   ↓
6. Gemini VLM으로 분석
   ↓
7. HourlyAnalysis 테이블에 저장
   ↓
8. 일일 리포트 생성 (추후)
```

## 📊 데이터 흐름

### 실시간 레벨 (추후 구현)
```
프레임 → 경량 이벤트 탐지 → RealtimeEvent 테이블 → 타임라인
```

### 1시간 레벨 (현재 구현)
```
1시간 영상 → Gemini VLM 분석 → HourlyAnalysis 테이블 → 시간대별 요약
```

### 일일 레벨 (추후 구현)
```
HourlyAnalysis 집계 → DailyReport 테이블 → 일일 리포트
```

## 🎯 다음 단계

### Phase 1: 기본 동작 확인
- [ ] 서버 시작 확인
- [ ] 스트림 시작 테스트
- [ ] 1시간 파일 생성 확인
- [ ] 분석 실행 확인

### Phase 2: 실시간 이벤트 탐지
- [ ] 경량 이벤트 탐지 구현
- [ ] RealtimeEvent 저장
- [ ] 타임라인 API 구현

### Phase 3: 일일 리포트
- [ ] HourlyAnalysis 집계 서비스
- [ ] DailyReport 생성 API
- [ ] 프론트엔드 연동

### Phase 4: 프론트엔드 통합
- [ ] 실시간 타임라인 표시
- [ ] 1시간 단위 분석 결과 표시
- [ ] 일일 리포트 페이지

## 📝 주요 파일

### 서비스
- `app/services/live_monitoring/video_queue.py` - 영상 큐 관리
- `app/services/live_monitoring/fake_stream_generator.py` - 가짜 스트림 생성
- `app/services/live_monitoring/hourly_analyzer.py` - 1시간 분석 스케줄러

### API
- `app/api/live_monitoring/router.py` - API 엔드포인트

### 모델
- `app/models/live_monitoring/models.py` - DB 모델

### 문서
- `LIVE_MONITORING_GUIDE.md` - 사용 가이드
- `test_live_monitoring.py` - 테스트 스크립트

## ⚙️ 설정 값

### 영상 처리
- 해상도: 640x480 (480p)
- FPS: 1.0 (분석용)
- 버퍼 단위: 1시간

### 분석 스케줄
- 실행 시간: 매 시간 정각 + 5분
- 예: 14:05, 15:05, 16:05...

### 영상 큐 패턴
- 짧은 영상 10개 (약 2분)
- 중간 영상 1개 (약 5분)
- 패턴 반복: 약 8-9회 (1시간 분량)

## 🐛 알려진 이슈

1. **서버 시작 지연**: 백그라운드 서버가 완전히 시작되기까지 5-10초 소요
2. **인코딩 문제**: Windows 콘솔 인코딩 문제로 일부 로그 깨짐
3. **메모리 사용**: 장시간 실행 시 메모리 사용량 증가 가능

## 💡 최적화 팁

1. **디스크 공간 관리**: 분석 완료 후 hourly 파일 자동 삭제 활성화
2. **메모리 관리**: 영상 해상도를 더 낮추기 (예: 320x240)
3. **비용 절감**: Gemini API 호출 빈도 조정

## 📚 참고 자료

- Gemini API 문서: https://ai.google.dev/gemini-api/docs
- FastAPI 문서: https://fastapi.tiangolo.com/
- OpenCV 문서: https://docs.opencv.org/

## ✨ 구현 완료!

모든 핵심 기능이 구현되었습니다. 이제 서버를 시작하고 테스트하면 됩니다!

