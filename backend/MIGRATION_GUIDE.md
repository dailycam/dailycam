# 5분 단위 분석 시스템 마이그레이션 가이드

## 📋 개요

기존 1시간 단위 분석 시스템을 **5분 단위 분석 시스템**으로 업그레이드합니다.

## 🔄 주요 변경사항

### 1. 버퍼링 간격 변경
- **이전**: 1시간 단위 (`hourly_YYYYMMDD_HHMMSS.mp4`)
- **이후**: 5분 단위 (`segment_YYYYMMDD_HHMMSS.mp4`)

### 2. 분석 스케줄러 변경
- **이전**: `HourlyAnalysisScheduler` (매 시간 정각 + 5분)
- **이후**: `SegmentAnalysisScheduler` (5분마다 + 30초)

### 3. 데이터베이스 모델 추가
- **새 테이블**: `segment_analyses` (5분 단위 분석 결과)
- **업데이트**: `daily_reports` (segment_analyses_ids 필드 추가)

### 4. API 엔드포인트 추가
- `GET /api/live-monitoring/list-segment-files/{camera_id}` - 5분 단위 파일 목록
- `GET /api/live-monitoring/daily-report/{camera_id}?date=YYYY-MM-DD` - 일일 리포트 조회
- `GET /api/live-monitoring/daily-reports/{camera_id}/list` - 리포트 목록
- `GET /api/live-monitoring/segment-analyses/{camera_id}?date=YYYY-MM-DD` - 5분 단위 분석 조회

## 🚀 마이그레이션 단계

### Step 1: 데이터베이스 마이그레이션

```bash
cd backend
python create_segment_analysis_table.py
```

**예상 출력**:
```
============================================================
5분 단위 분석 시스템 데이터베이스 마이그레이션
============================================================

✅ 테이블 생성 완료:
  - segment_analyses: 5분 단위 분석 결과
  - daily_reports: 일일 리포트 (업데이트됨)
```

### Step 2: 백엔드 서버 재시작

```bash
cd backend
python run.py
```

### Step 3: 스트림 시작 (테스트)

```bash
# PowerShell
Invoke-RestMethod -Method Post -Uri "http://localhost:8000/api/live-monitoring/start-stream/camera-1?enable_analysis=true"
```

### Step 4: 5분 단위 파일 확인

5분 후:
```bash
ls backend/temp_videos/hourly_buffer/camera-1/
# segment_20241202_140000.mp4
# segment_20241202_140500.mp4
# ...
```

### Step 5: 분석 결과 확인

5분 30초 후 (첫 번째 분석 완료):
```bash
# 5분 단위 분석 조회
Invoke-RestMethod -Uri "http://localhost:8000/api/live-monitoring/segment-analyses/camera-1?limit=10"
```

### Step 6: 일일 리포트 생성 (수동)

```bash
# 오늘 날짜의 리포트 생성
Invoke-RestMethod -Uri "http://localhost:8000/api/live-monitoring/daily-report/camera-1?date=2024-12-02"
```

## 📊 데이터 흐름 비교

### 이전 (1시간 단위)
```
영상 → 1시간 버퍼링 → 1시간마다 분석 → hourly_analyses 테이블
```

### 이후 (5분 단위)
```
영상 → 5분 버퍼링 → 5분마다 분석 → segment_analyses 테이블 → 일일 리포트 자동 생성
```

## 🔍 테스트 체크리스트

- [ ] `segment_analyses` 테이블 생성 확인
- [ ] 스트림 시작 성공
- [ ] 5분마다 `segment_*.mp4` 파일 생성 확인
- [ ] 5분 30초마다 자동 분석 실행 확인
- [ ] `segment_analyses` 테이블에 데이터 저장 확인
- [ ] 일일 리포트 조회 API 동작 확인
- [ ] 실시간 이벤트 탐지 정상 동작 확인

## 🐛 문제 해결

### 테이블 생성 실패
```bash
# MySQL 접속 확인
python backend/scripts/test_mysql.py

# 수동으로 테이블 생성
mysql -u root -p
USE ai_x_daily_cam;
SHOW TABLES;
```

### 분석이 실행되지 않음
```bash
# 로그 확인
# [5분 분석 스케줄러] 메시지 확인

# segment 파일 확인
ls backend/temp_videos/hourly_buffer/camera-1/segment_*.mp4
```

### API 오류
```bash
# 백엔드 로그 확인
# ImportError 또는 ModuleNotFoundError 확인

# 필요시 서버 재시작
```

## 📝 API 사용 예제

### 1. 5분 단위 파일 목록 조회
```bash
GET /api/live-monitoring/list-segment-files/camera-1
```

**응답**:
```json
{
  "camera_id": "camera-1",
  "total_files": 12,
  "files": [
    {
      "filename": "segment_20241202_140000.mp4",
      "path": "temp_videos/hourly_buffer/camera-1/segment_20241202_140000.mp4",
      "size_mb": 8.5,
      "created_at": "2024-12-02T14:05:00"
    }
  ]
}
```

### 2. 일일 리포트 조회
```bash
GET /api/live-monitoring/daily-report/camera-1?date=2024-12-02
```

**응답**:
```json
{
  "camera_id": "camera-1",
  "report_date": "2024-12-02",
  "total_hours_analyzed": 4.5,
  "average_safety_score": 95,
  "total_incidents": 3,
  "safety_summary": {
    "average_safety_score": 95,
    "total_incidents": 3,
    "danger_events_count": 1,
    "warning_events_count": 2
  },
  "development_summary": {
    "total_observations": 15
  },
  "hourly_summary": {
    "hours": [
      {
        "hour": 14,
        "segments_count": 12,
        "average_safety_score": 95,
        "total_incidents": 1
      }
    ]
  },
  "timeline_events": {
    "events": [...]
  }
}
```

### 3. 5분 단위 분석 조회
```bash
GET /api/live-monitoring/segment-analyses/camera-1?date=2024-12-02&limit=20
```

**응답**:
```json
{
  "camera_id": "camera-1",
  "date": "2024-12-02",
  "total": 20,
  "analyses": [
    {
      "id": 123,
      "segment_start": "2024-12-02T14:00:00",
      "segment_end": "2024-12-02T14:05:00",
      "safety_score": 95,
      "incident_count": 0,
      "status": "completed",
      "completed_at": "2024-12-02T14:05:35"
    }
  ]
}
```

## 💰 예상 비용 (24시간 기준)

### Gemini API 호출 횟수
- 5분마다 1회 = 시간당 12회
- 24시간 = **288회**
- 실시간 탐지 (45초 간격) = **1,920회**
- **총: 2,208회/일**

### 예상 비용
- **약 $0.71/일** (약 920원)
- **월간: 약 $21/월** (약 27,000원)

## 🎉 완료!

모든 마이그레이션이 완료되었습니다. 이제 5분 단위 분석 시스템을 사용할 수 있습니다!

## 📞 추가 지원

문제가 발생하면:
1. 백엔드 로그 확인
2. `backend/temp_videos/hourly_buffer/camera-1/` 디렉토리 확인
3. 데이터베이스 테이블 확인: `SHOW TABLES;`

