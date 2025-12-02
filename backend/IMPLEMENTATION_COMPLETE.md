# 5분 단위 분석 시스템 구현 완료 ✅

## 📅 구현 날짜
2024년 12월 2일

## 🎯 구현 목표
라이브 스트림을 **5분 주기로 끊어서 분석**하고, 메타데이터를 저장한 후 **특정 시간에 정리/종합**하여 **일일 리포트를 자동 생성**하는 시스템 구현

## ✅ 완료된 작업

### 1. 5분 단위 버퍼링 시스템 ✅
**파일**: `app/services/live_monitoring/fake_stream_generator.py`

**변경사항**:
- 1시간 단위 → 5분 단위 버퍼링으로 변경
- `hourly_*.mp4` → `segment_*.mp4` 파일명 변경
- `_get_segment_start_time()` 메서드 추가 (5분 단위로 시간 내림)
- 5분마다 새 파일 자동 생성

**결과**:
```
temp_videos/hourly_buffer/camera-1/
├── segment_20241202_140000.mp4  (14:00 ~ 14:05)
├── segment_20241202_140500.mp4  (14:05 ~ 14:10)
├── segment_20241202_141000.mp4  (14:10 ~ 14:15)
└── ...
```

### 2. SegmentAnalysis 데이터베이스 모델 ✅
**파일**: `app/models/live_monitoring/models.py`

**추가된 모델**:
```python
class SegmentAnalysis(Base):
    """5분 단위 상세 분석 결과"""
    - segment_start, segment_end  # 5분 구간
    - analysis_result (JSON)       # Gemini 전체 결과
    - safety_score, incident_count # 요약 정보
```

**업데이트된 모델**:
```python
class DailyReport(Base):
    - segment_analyses_ids (JSON)  # 5분 단위 분석 ID 배열
```

### 3. 5분 단위 분석 스케줄러 ✅
**파일**: `app/services/live_monitoring/segment_analyzer.py` (새로 생성)

**기능**:
- 5분마다 자동 실행 (14:05:30, 14:10:30, 14:15:30...)
- 이전 5분 구간의 segment 파일 자동 분석
- Gemini VLM으로 상세 분석
- `segment_analyses` 테이블에 결과 저장

**로직**:
```python
class SegmentAnalysisScheduler:
    - start_scheduler()              # 5분마다 실행
    - _analyze_previous_segment()    # 이전 5분 구간 분석
    - _get_segment_video()           # segment 파일 찾기
```

### 4. API 라우터 업데이트 ✅
**파일**: `app/api/live_monitoring/router.py`

**변경사항**:
- `start_segment_analysis_for_camera()` 연동
- `stop_segment_analysis_for_camera()` 연동
- 상태 조회 API에 segment 파일 정보 추가

**새 엔드포인트**:
```python
GET  /api/live-monitoring/list-segment-files/{camera_id}
GET  /api/live-monitoring/segment-analyses/{camera_id}?date=YYYY-MM-DD
GET  /api/live-monitoring/daily-report/{camera_id}?date=YYYY-MM-DD
GET  /api/live-monitoring/daily-reports/{camera_id}/list
```

### 5. 일일 리포트 자동 생성 서비스 ✅
**파일**: `app/services/daily_report/report_generator.py` (새로 생성)

**기능**:
```python
class DailyReportGenerator:
    - generate_report()              # 일일 리포트 생성
    - _aggregate_safety()            # 안전 분석 집계
    - _aggregate_development()       # 발달 분석 집계
    - _create_hourly_summary()       # 시간대별 요약
    - _create_timeline()             # 타임라인 생성

async def schedule_daily_reports():
    # 매일 자정 00:05에 전날 리포트 자동 생성
```

**집계 데이터**:
- 안전 점수 평균
- 총 사건 수
- 시간대별 요약
- 타임라인 이벤트
- 발달 관찰 내용

### 6. 일일 리포트 조회 API ✅
**파일**: `app/api/live_monitoring/router.py`

**엔드포인트**:
```python
@router.get("/daily-report/{camera_id}")
async def get_daily_report(camera_id, date):
    # 리포트 조회 또는 자동 생성
    
@router.get("/daily-reports/{camera_id}/list")
async def list_daily_reports(camera_id, limit):
    # 최근 N일 리포트 목록
    
@router.get("/segment-analyses/{camera_id}")
async def get_segment_analyses(camera_id, date, limit):
    # 5분 단위 분석 결과 조회
```

### 7. 데이터베이스 마이그레이션 스크립트 ✅
**파일**: `create_segment_analysis_table.py` (새로 생성)

**기능**:
- `segment_analyses` 테이블 생성
- `daily_reports` 테이블 업데이트
- 테이블 구조 출력

**사용법**:
```bash
python create_segment_analysis_table.py
```

## 📊 전체 데이터 흐름

```
1. 라이브 스트림 시작
   ↓
2. 5분 단위 버퍼링 (segment_*.mp4)
   ↓
3. 5분 30초마다 자동 분석 (Gemini VLM)
   ↓
4. segment_analyses 테이블에 저장
   ↓
5. 매일 자정 00:05 일일 리포트 자동 생성
   ↓
6. daily_reports 테이블에 저장
```

## 🔌 API 사용 예제

### 1. 스트림 시작
```bash
POST /api/live-monitoring/start-stream/camera-1?enable_analysis=true
```

### 2. 5분 후 - segment 파일 확인
```bash
GET /api/live-monitoring/list-segment-files/camera-1
```

### 3. 5분 30초 후 - 분석 결과 확인
```bash
GET /api/live-monitoring/segment-analyses/camera-1?limit=5
```

### 4. 일일 리포트 조회
```bash
GET /api/live-monitoring/daily-report/camera-1?date=2024-12-02
```

## 📁 생성된 파일 목록

### 새로 생성된 파일
1. `app/services/live_monitoring/segment_analyzer.py` - 5분 단위 분석 스케줄러
2. `app/services/daily_report/report_generator.py` - 일일 리포트 생성 서비스
3. `app/services/daily_report/__init__.py` - 서비스 모듈 초기화
4. `create_segment_analysis_table.py` - DB 마이그레이션 스크립트
5. `MIGRATION_GUIDE.md` - 마이그레이션 가이드
6. `5MIN_ANALYSIS_README.md` - 5분 분석 시스템 README
7. `IMPLEMENTATION_COMPLETE.md` - 이 문서

### 수정된 파일
1. `app/services/live_monitoring/fake_stream_generator.py` - 5분 단위 버퍼링
2. `app/models/live_monitoring/models.py` - SegmentAnalysis 모델 추가
3. `app/api/live_monitoring/router.py` - API 엔드포인트 추가/수정

## ⏱️ 타이밍 정리

| 작업 | 간격 | 설명 |
|------|------|------|
| 버퍼링 | 5분 | segment 파일 생성 |
| 5분 분석 | 5분 30초 | Gemini VLM 분석 |
| 실시간 탐지 (경량) | 1초 | 움직임, 위험 구역 |
| 실시간 탐지 (Gemini) | 45초 | 상세 분석 |
| 일일 리포트 | 매일 00:05 | 전날 데이터 집계 |

## 💰 예상 비용 (24시간)

### Gemini API 호출
- **5분 분석**: 288회/일
- **실시간 Gemini**: 1,920회/일
- **총**: 2,208회/일

### 비용
- **일간**: 약 $0.77 (약 1,000원)
- **월간**: 약 $23 (약 30,000원)

## 🧪 테스트 방법

### 1. 데이터베이스 마이그레이션
```bash
cd backend
python create_segment_analysis_table.py
```

### 2. 서버 시작
```bash
python run.py
```

### 3. 스트림 시작 및 테스트
```bash
# 스트림 시작
Invoke-RestMethod -Method Post -Uri "http://localhost:8000/api/live-monitoring/start-stream/camera-1?enable_analysis=true"

# 5분 대기...

# segment 파일 확인
ls temp_videos/hourly_buffer/camera-1/segment_*.mp4

# 5분 30초 대기...

# 분석 결과 확인
Invoke-RestMethod -Uri "http://localhost:8000/api/live-monitoring/segment-analyses/camera-1?limit=5"

# 일일 리포트 생성 (수동)
Invoke-RestMethod -Uri "http://localhost:8000/api/live-monitoring/daily-report/camera-1?date=2024-12-02"
```

## 📚 문서

### 사용자 가이드
- `5MIN_ANALYSIS_README.md` - 빠른 시작 가이드
- `MIGRATION_GUIDE.md` - 상세 마이그레이션 가이드

### 기존 문서 (여전히 유효)
- `LIVE_MONITORING_GUIDE.md` - 라이브 모니터링 전체 가이드
- `HYBRID_REALTIME_GUIDE.md` - 실시간 탐지 가이드
- `IMPLEMENTATION_SUMMARY.md` - 기존 구현 요약

## 🎉 구현 완료!

모든 요구사항이 성공적으로 구현되었습니다:

✅ 라이브 스트림 시작
✅ 5분 주기로 영상 분석
✅ 메타데이터 저장 (segment_analyses)
✅ 특정 시간에 정리/종합 (일일 리포트)
✅ 리포트 자동 생성 (매일 자정)

## 🚀 다음 단계

사용자가 직접 테스트를 진행하실 수 있습니다:

1. **데이터베이스 마이그레이션 실행**
2. **서버 재시작**
3. **스트림 시작 및 동작 확인**
4. **5분 단위 분석 결과 확인**
5. **일일 리포트 생성 및 조회**

모든 준비가 완료되었습니다! 🎊

