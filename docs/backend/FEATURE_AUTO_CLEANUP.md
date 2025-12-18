# 자동 정리 기능 구현

## 개요

시스템에 쌓이는 파일과 데이터를 자동으로 정리하여 저장 공간을 효율적으로 관리하는 기능입니다.

## 구현 내용

### 1. **아카이브 파일 자동 정리**

**위치**: `temp_videos/hls_buffer/{camera_id}/archive/`

**정리 규칙**:
- ✅ **분석 완료된 아카이브**: 7일 후 삭제
- ✅ **분석 안 된 아카이브**: 30일 후 삭제

**동작 방식**:
```python
# 분석 완료 여부 확인
segment_analysis = db.query(SegmentAnalysis).filter(
    SegmentAnalysis.camera_id == camera_id,
    SegmentAnalysis.segment_start <= file_time,
    SegmentAnalysis.segment_end > file_time,
    SegmentAnalysis.status == 'completed'
).first()

if segment_analysis and file_age_days >= 7:
    # 분석 완료 후 7일 경과 → 삭제
elif not segment_analysis and file_age_days >= 30:
    # 분석 안 됨, 30일 경과 → 삭제
```

---

### 2. **하이라이트 클립 자동 정리**

**위치**: `videos/highlights/`

**정리 규칙**:
- ✅ **30일 이상 된 클립** 자동 삭제
- 비디오 파일 + 썸네일 + DB 레코드 모두 삭제

**동작 방식**:
```python
cutoff_date = datetime.now() - timedelta(days=30)

old_clips = db.query(HighlightClip).filter(
    HighlightClip.created_at < cutoff_date
).all()

for clip in old_clips:
    # 비디오 파일 삭제
    # 썸네일 삭제
    # DB 레코드 삭제
```

---

### 3. **사용자 업로드 영상 용량 제한**

**제한**:
- 개별 파일: 최대 **500MB**
- 사용자 전체: 최대 **5GB**

**동작 방식**:
```python
# 사용자의 모든 영상 크기 합계
total_size = sum(video.file_size for video in user_videos)

# 새 파일 추가 시 용량 초과 확인
if total_size + new_file_size > 5GB:
    raise HTTPException(400, "전체 용량 제한 초과")
```

**프론트엔드 표시**:
- Settings 페이지에 저장 공간 사용량 표시
- 진행률 바로 시각화
- 남은 용량 실시간 표시

---

### 4. **임시 파일 정리**

**위치**: `temp_videos/hls_buffer/{camera_id}/hls/`

**정리 규칙**:
- ✅ **1시간 이상 된 .ts 파일** 삭제
- HLS 세그먼트는 자동 삭제되지만, 남은 것 정리

---

## 스케줄러 설정

### 실행 시간
- **매일 새벽 3시** 자동 실행
- 사용자 활동이 적은 시간대에 실행

### 등록 위치
`backend/app/main.py` - startup 이벤트

```python
@app.on_event("startup")
async def startup_event():
    # ... 다른 초기화 작업 ...
    
    # 자동 정리 스케줄러 시작
    asyncio.create_task(start_cleanup_scheduler())
```

---

## API 엔드포인트

### 1. **수동 정리 실행** (관리자용)

```http
POST /api/camera-settings/cleanup/run
Authorization: Bearer {token}
```

**응답**:
```json
{
  "message": "정리 작업이 완료되었습니다",
  "timestamp": "2024-12-09T15:30:00"
}
```

### 2. **저장 공간 사용량 조회**

```http
GET /api/camera-settings/storage/usage
Authorization: Bearer {token}
```

**응답**:
```json
{
  "total_size_bytes": 1073741824,
  "total_size_mb": 1024.0,
  "total_size_gb": 1.0,
  "max_size_gb": 5,
  "usage_percent": 20.0,
  "video_count": 3,
  "remaining_bytes": 4294967296,
  "remaining_gb": 4.0
}
```

---

## 프론트엔드 UI

### Settings 페이지 - 저장 공간 카드

```tsx
💾 저장 공간 사용량
━━━━━━━━━━━━━━━━━━━━━━
사용 중: 1.25 GB / 5 GB

████████░░░░░░░░░░░░ 25%

영상 5개        남은 용량: 3.75 GB
```

**색상 구분**:
- 🟢 **0-70%**: 파란색 (정상)
- 🟡 **70-90%**: 노란색 (주의)
- 🔴 **90-100%**: 빨간색 (경고)

---

## 정리 로그 예시

```
============================================================
[자동 정리] 정리 작업 시작: 2024-12-09 03:00:00
============================================================

[아카이브 정리] 시작...
  🗑️ 삭제: archive_20241201_140000.mp4 (분석 완료 후 8일 경과)
  🗑️ 삭제: archive_20241201_150000.mp4 (분석 완료 후 8일 경과)
  🗑️ 삭제: archive_20241120_100000.mp4 (분석 안됨, 19일 경과)

[아카이브 정리] 완료: 3개 파일 삭제, 245.3MB 확보

[하이라이트 정리] 시작...
  🗑️ 삭제: 위험 상황 감지 (32일 경과)
  🗑️ 삭제: 발달 마일스톤 (35일 경과)

[하이라이트 정리] 완료: 2개 클립 삭제, 45.2MB 확보

[임시 파일 정리] 시작...
[임시 파일 정리] 삭제할 파일이 없습니다

[자동 정리] ✅ 정리 작업 완료
```

---

## 설정 커스터마이징

필요에 따라 `cleanup_service.py`에서 기간 조정 가능:

```python
class CleanupService:
    # 커스터마이징 가능한 설정
    ARCHIVE_ANALYZED_RETENTION_DAYS = 7      # 분석 완료 아카이브 보관 기간
    ARCHIVE_UNANALYZED_RETENTION_DAYS = 30   # 분석 안 된 아카이브 보관 기간
    HIGHLIGHT_RETENTION_DAYS = 30            # 하이라이트 클립 보관 기간
    TEMP_FILE_RETENTION_HOURS = 1            # 임시 파일 보관 시간
    USER_MAX_STORAGE_GB = 5                  # 사용자 최대 저장 공간
```

---

## 테스트 방법

### 1. 수동 정리 테스트

```bash
curl -X POST http://localhost:8000/api/camera-settings/cleanup/run \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. 저장 공간 확인

```bash
curl http://localhost:8000/api/camera-settings/storage/usage \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. 용량 제한 테스트

1. 500MB 이상 파일 업로드 → 오류
2. 5GB 초과하도록 여러 파일 업로드 → 오류
3. Settings 페이지에서 진행률 바 확인

---

## 주의사항

### ⚠️ 중요
- **자동 정리는 복구 불가능합니다**
- 중요한 클립은 별도로 다운로드 보관 권장
- 아카이브 파일이 삭제되면 해당 시간대 재분석 불가

### 💡 권장사항
- 정기적으로 저장 공간 사용량 확인
- 90% 이상 시 오래된 영상 수동 삭제
- 중요 클립은 30일 이내에 다운로드

---

## 파일 목록

### 백엔드
- `backend/app/services/cleanup_service.py` - 자동 정리 서비스
- `backend/app/api/camera_settings/router.py` - 용량 제한 및 API
- `backend/app/main.py` - 스케줄러 등록

### 프론트엔드
- `frontend/src/lib/api.ts` - 저장 공간 API
- `frontend/src/pages/Settings.tsx` - 저장 공간 UI

---

## 향후 개선 사항

### 우선순위: 높음
- [ ] 사용자별 보관 기간 설정
- [ ] 중요 클립 즐겨찾기 (자동 삭제 제외)
- [ ] 정리 전 알림 기능

### 우선순위: 중간
- [ ] 클라우드 스토리지 연동 (S3, Google Drive)
- [ ] 자동 백업 기능
- [ ] 정리 통계 대시보드

---

## 구현 일자

2024년 12월 9일

## 작성자

AI Assistant (Claude Sonnet 4.5)

