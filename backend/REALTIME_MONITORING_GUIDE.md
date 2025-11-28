# 실시간 모니터링 완전 가이드

## 🎯 개요

이 가이드는 **Phase 5: 실시간 이벤트 탐지** 기능을 포함한 완전한 실시간 모니터링 시스템의 사용법을 설명합니다.

## 📋 주요 기능

### 1. **실시간 이벤트 탐지** (OpenCV 기반)
- 움직임 감지
- 위험 구역 진입 감지
- 활동 수준 분류 (active/moderate/calm)
- 실시간 DB 저장

### 2. **1시간 단위 상세 분석** (Gemini VLM)
- 1시간마다 자동으로 영상 분석
- 안전 및 발달 분석
- 분석 결과 DB 저장

### 3. **일일 리포트 생성**
- 하루 치 데이터 집계
- 타임라인 및 요약 제공

## 🚀 시작하기

### 1. 데이터베이스 테이블 생성

```bash
cd backend
python create_live_monitoring_tables.py
```

### 2. 백엔드 서버 실행

```bash
cd backend
python run.py
```

### 3. 프론트엔드 실행

```bash
cd frontend
npm run dev
```

### 4. 모니터링 페이지 접속

브라우저에서 `http://localhost:5173/monitoring` 접속

## 📊 사용 방법

### 스트림 시작

1. **"스트림 시작"** 버튼 클릭
2. 백엔드가 자동으로:
   - 영상 큐 로드
   - 1시간 단위 버퍼링 시작
   - 실시간 이벤트 탐지 시작
   - 1시간 분석 스케줄러 시작

### 실시간 데이터 확인

모니터링 페이지에서 실시간으로 확인 가능:
- **알림 패널**: 최신 이벤트 (위험, 경고, 정보)
- **활동 타임라인**: 시간대별 활동 기록
- **오늘의 통계**: 오늘 발생한 이벤트 요약

### 데이터 폴링

- 스트림이 활성화되면 **5초마다** 자동으로 데이터 갱신
- 새로운 이벤트가 실시간으로 표시됨

## 🔧 API 엔드포인트

### 스트림 관리

```bash
# 스트림 시작
POST /api/live-monitoring/start-stream/{camera_id}?enable_analysis=true&enable_realtime_detection=true

# 스트림 중지
POST /api/live-monitoring/stop-stream/{camera_id}

# 스트림 상태 조회
GET /api/live-monitoring/status/{camera_id}
```

### 실시간 이벤트 조회

```bash
# 최신 이벤트 조회 (폴링용)
GET /api/live-monitoring/events/{camera_id}/latest?limit=10

# 이벤트 조회 (필터링)
GET /api/live-monitoring/events/{camera_id}?limit=50&since=2024-11-28T10:00:00&event_type=safety

# 통계 조회
GET /api/live-monitoring/stats/{camera_id}
```

### 1시간 분석 결과 조회

```bash
# 1시간 버퍼 파일 목록
GET /api/live-monitoring/list-hourly-files/{camera_id}
```

## 📁 데이터 저장 위치

### 1. 영상 파일
- **원본 영상**: `backend/videos/{camera_id}/short/`, `medium/`
- **1시간 버퍼**: `backend/temp_videos/hourly_buffer/{camera_id}/hourly_YYYYMMDD_HHMMSS.mp4`

### 2. 데이터베이스

#### `realtime_events` 테이블
```sql
- id: 이벤트 ID
- camera_id: 카메라 ID
- timestamp: 발생 시간
- event_type: 'safety' | 'development'
- severity: 'danger' | 'warning' | 'info' | 'safe'
- title: 이벤트 제목
- description: 상세 설명
- location: 위치
- event_metadata: JSON (추가 정보)
```

#### `hourly_analyses` 테이블
```sql
- id: 분석 ID
- camera_id: 카메라 ID
- hour_start: 시간대 시작
- hour_end: 시간대 종료
- video_path: 분석한 영상 경로
- analysis_result: JSON (Gemini VLM 전체 결과)
- status: 'pending' | 'processing' | 'completed' | 'failed'
- safety_score: 안전 점수
- incident_count: 사고 수
```

#### `daily_reports` 테이블
```sql
- id: 리포트 ID
- camera_id: 카메라 ID
- report_date: 리포트 날짜
- total_hours_analyzed: 분석된 시간 수
- average_safety_score: 평균 안전 점수
- total_incidents: 총 사고 수
- safety_summary: JSON (안전 분석 집계)
- development_summary: JSON (발달 분석 집계)
- hourly_summary: JSON (시간대별 요약)
- timeline_events: JSON (실시간 이벤트 타임라인)
```

## 🎨 프론트엔드 통합

### Mock 데이터 제거 완료

모든 Mock 데이터가 실제 API 호출로 교체되었습니다:

- ✅ 실시간 알림
- ✅ 활동 타임라인
- ✅ 오늘의 통계

### 실시간 폴링

```typescript
// 5초마다 데이터 갱신
useEffect(() => {
  if (isStreamActive) {
    pollingIntervalRef.current = setInterval(() => {
      loadRealtimeData()
    }, 5000)
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }
}, [isStreamActive, selectedCamera])
```

## 🔍 실시간 탐지 커스터마이징

### 위험 구역 설정

`backend/app/services/live_monitoring/realtime_detector.py`:

```python
self.danger_zones = [
    {"name": "주방", "coords": [(0.7, 0.0), (1.0, 0.5)], "severity": "danger"},
    {"name": "계단", "coords": [(0.0, 0.7), (0.3, 1.0)], "severity": "danger"},
    # 추가 구역 정의 가능
]
```

### 탐지 파라미터 조정

```python
self.motion_threshold = 30  # 움직임 감지 임계값
self.min_contour_area = 500  # 최소 윤곽 면적
self.event_cooldown = 10  # 이벤트 중복 방지 (초)
self.detection_frame_interval = 30  # 탐지 간격 (프레임)
```

## 🐛 문제 해결

### 이벤트가 표시되지 않는 경우

1. 데이터베이스 테이블 확인:
   ```bash
   python create_live_monitoring_tables.py
   ```

2. 백엔드 로그 확인:
   ```
   [실시간 탐지] N개 이벤트 저장됨
   ```

3. API 직접 테스트:
   ```bash
   curl http://localhost:8000/api/live-monitoring/events/camera-1/latest
   ```

### 스트림이 시작되지 않는 경우

1. 영상 파일 확인:
   ```
   backend/videos/camera-1/short/
   backend/videos/camera-1/medium/
   ```

2. 기존 스트림 중지:
   ```bash
   curl -X POST http://localhost:8000/api/live-monitoring/stop-stream/camera-1
   ```

## 📈 성능 최적화

### 실시간 탐지 성능

- **탐지 간격 조정**: `detection_frame_interval` 값을 높이면 CPU 사용량 감소
- **프레임 다운샘플링**: 이미 1fps로 버퍼링되므로 추가 최적화 불필요

### 폴링 간격 조정

프론트엔드에서 폴링 간격 변경:

```typescript
// 5초 → 10초로 변경
setInterval(() => {
  loadRealtimeData()
}, 10000)  // 10초
```

## 🎉 완료!

이제 완전한 실시간 모니터링 시스템이 준비되었습니다:

1. ✅ **Phase 1-4**: 영상 큐, 스트림 생성, API, 1시간 분석
2. ✅ **Phase 5**: 실시간 이벤트 탐지
3. ✅ **프론트엔드**: Mock 데이터 제거 및 실제 데이터 연동
4. ✅ **실시간 폴링**: 5초마다 자동 갱신

## 📞 추가 지원

문제가 발생하면 백엔드 로그를 확인하거나, 다음 명령어로 디버깅:

```bash
# 데이터베이스 확인
python backend/debug_db.py

# 이벤트 수 확인
curl http://localhost:8000/api/live-monitoring/stats/camera-1
```

