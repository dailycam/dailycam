# 배포 환경 동영상 관리 종합 가이드

> 최종 업데이트: 2025-12-17

## 개요

이 문서는 DailyCam 서비스의 배포 환경에서 동영상이 어떻게 생성, 저장, 분석, 정리되는지 전체 흐름을 설명합니다.

---

## 1. 서버 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   메인 서버      │    │  스트리밍 서버   │    │   워커 서버     │
│  (Lightsail)    │    │  (Lightsail)    │    │  (Lightsail)    │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ - FastAPI       │    │ - FastAPI       │    │ - VLM Worker 1  │
│ - MySQL         │    │ - HLS 스트리밍   │    │ - VLM Worker 2  │
│ - Nginx         │    │ - 아카이브 생성  │    │ - Gemini API    │
│ - HLS 비활성화   │    │ - S3 업로드     │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              ↓                       ↓
                       ┌─────────────────┐
                       │   AWS S3        │
                       ├─────────────────┤
                       │ - archives/     │ ← 1일 후 자동 삭제
                       │ - highlights/   │ ← 30일 후 자동 삭제
                       │ - videos/       │ ← 사용자 업로드 영상
                       └─────────────────┘
```

### 서버별 역할

| 서버 | Docker Compose 파일 | 주요 역할 |
|------|---------------------|-----------|
| **메인 서버** | `docker-compose.production.yml` | API 서버, DB, 프론트엔드 호스팅 |
| **스트리밍 서버** | `docker-compose.streaming.yml` | HLS 스트리밍, 아카이브 생성, S3 업로드 |
| **워커 서버** | `docker-compose.worker.yml` | VLM 분석, 하이라이트 클립 생성 |

---

## 2. 영상 종류별 관리

### A. HLS 스트리밍 세그먼트 (실시간 시청용)

| 항목 | 내용 |
|------|------|
| **위치** | `temp_videos/hls_buffer/{camera-id}/hls/` |
| **파일 형식** | `.m3u8` (플레이리스트), `.ts` (세그먼트) |
| **스펙** | 15fps, 640x480, 10초 세그먼트 |
| **DVR 윈도우** | 300 세그먼트 (약 50분) |
| **보관 기간** | 1시간 이상 된 파일 자동 삭제 |
| **정리 주기** | 10분마다 실행 |

**관련 코드**: `hls_stream_generator.py` → `_start_hls_cleanup_task()`

```python
def _cleanup_old_hls_segments(self):
    """오래된 HLS 세그먼트 파일 삭제 (1시간 이상 된 파일)"""
    max_age_seconds = 3600  # 1시간
    for ts_file in self.hls_dir.glob("*.ts"):
        file_age = now - file_mtime
        if file_age > max_age_seconds:
            ts_file.unlink()
```

---

### B. 10분 아카이브 영상 (VLM 분석용)

| 항목 | 내용 |
|------|------|
| **로컬 위치** | `temp_videos/hls_buffer/{camera-id}/archive/` |
| **S3 위치** | `s3://bucket/archives/{camera-id}/{YYYY}/{MM}/{DD}/` |
| **파일명 형식** | `archive_20251217_140000.mp4` |
| **스펙** | 15fps, 640x480, fragmented MP4 |
| **로컬 보관** | 분석 완료 후 7-8일, 미분석 시 30일 |
| **S3 보관** | 1일 (Lifecycle Policy) |

**생성 흐름**:
1. FFmpeg tee muxer로 HLS + 아카이브 동시 생성
2. 10분마다 새 아카이브 파일 생성
3. 파일 안정화 확인 후 S3 업로드
4. `analysis_jobs` 테이블에 분석 Job 등록

**관련 코드**: `hls_stream_generator.py` → `_monitor_archive_files()`

---

### C. 하이라이트 클립 (사용자 공유용)

| 항목 | 내용 |
|------|------|
| **S3 위치** | `s3://bucket/highlights/{clip-id}/video.mp4` |
| **썸네일** | `s3://bucket/highlights/{clip-id}/thumbnail.jpg` |
| **보관 기간** | 30일 (CleanupService + S3 Lifecycle) |
| **생성 조건** | 안전 사건 또는 발달 마일스톤 감지 시 자동 생성 |

**관련 코드**: `s3_service.py` → `upload_clip()`

---

### D. 사용자 업로드 영상 (가짜 카메라용)

| 항목 | 내용 |
|------|------|
| **S3 위치** | `s3://bucket/videos/{camera-id}/{filename}` |
| **DB 테이블** | `camera_videos` |
| **용도** | 실제 홈캠 없을 때 HLS 스트리밍 소스로 사용 |
| **보관 기간** | 영구 (수동 삭제) |

**관련 코드**: `video_queue.py` → S3에서 자동 다운로드 지원

---

## 3. 전체 워크플로우

```
┌─────────────────────────────────────────────────────────────┐
│ 1. HLS 스트림 생성 (실시간)                                  │
│    - FFmpeg: 15fps, 640x480                                  │
│    - tee muxer로 HLS + 아카이브 동시 출력                    │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. 10분 아카이브 생성 (자동)                                 │
│    - segment muxer로 10분마다 파일 분할                      │
│    - temp_videos/hls_buffer/camera-1/archive/               │
│    - 파일명: archive_20251217_140000.mp4                    │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. 아카이브 모니터링 & S3 업로드                             │
│    - _monitor_archive_files() 5초마다 체크                   │
│    - 파일 안정화 확인 (크기 변화 없음)                       │
│    - S3 업로드: archives/{camera-id}/{YYYY}/{MM}/{DD}/      │
│    - analysis_jobs 테이블에 Job 등록 (PENDING)              │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. VLM Worker 분석                                          │
│    - PENDING Job 폴링                                        │
│    - 로컬 파일에서 영상 읽기                                 │
│    - Gemini API로 분석 (1fps, 480p로 추가 압축)             │
│    - 분석 결과: 안전 점수, 발달 점수, 이벤트 저장           │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. 하이라이트 클립 생성 (조건부)                             │
│    - 안전 사건 감지 시 → 클립 생성                          │
│    - 발달 마일스톤 감지 시 → 클립 생성                      │
│    - S3 업로드: highlights/{clip-id}/                       │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. 자동 정리                                                 │
│    - 로컬 아카이브: 분석 완료 후 7-8일 → 삭제               │
│    - S3 아카이브: 1일 후 → Lifecycle Policy 삭제            │
│    - S3 하이라이트: 30일 후 → Lifecycle Policy 삭제         │
│    - HLS 세그먼트: 1시간 후 → 자동 삭제                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. 자동 정리 시스템

### CleanupService (매일 새벽 3시)

**위치**: `backend/app/services/cleanup_service.py`

```python
async def run_cleanup(self):
    # 1. 오래된 아카이브 파일 정리
    await self.cleanup_old_archives(db)
    
    # 2. 오래된 하이라이트 클립 정리
    await self.cleanup_old_highlights(db)
    
    # 3. 임시 파일 정리 (HLS 버퍼)
    await self.cleanup_temp_files()
```

### 정리 정책 요약

| 파일 종류 | 조건 | 삭제 시점 | 정리 주체 |
|-----------|------|-----------|-----------|
| 아카이브 (분석 완료) | `SegmentAnalysis.status == 'completed'` | 8일 후 | CleanupService |
| 아카이브 (분석 안됨) | 분석 결과 없음 | 30일 후 | CleanupService |
| 하이라이트 클립 | `HighlightClip.created_at` 기준 | 30일 후 | CleanupService + S3 Lifecycle |
| HLS .ts 파일 | 파일 수정 시간 기준 | 1시간 후 | HLS Cleanup Task |
| S3 아카이브 | S3 업로드 시간 기준 | 1일 후 | S3 Lifecycle Policy |

---

## 5. S3 저장 구조

```
s3://dailycam-bucket/
│
├── archives/                    # 아카이브 영상 (1일 보관)
│   └── camera-1/
│       └── 2025/
│           └── 12/
│               └── 17/
│                   ├── archive_20251217_100000.mp4
│                   ├── archive_20251217_101000.mp4
│                   └── archive_20251217_102000.mp4
│
├── highlights/                  # 하이라이트 클립 (30일 보관)
│   ├── {clip-uuid-1}/
│   │   ├── video.mp4
│   │   └── thumbnail.jpg
│   └── {clip-uuid-2}/
│       ├── video.mp4
│       └── thumbnail.jpg
│
└── videos/                      # 사용자 업로드 영상 (영구 보관)
    └── camera-1/
        ├── user_uploaded_001.mp4
        └── user_uploaded_002.mp4
```

---

## 6. S3 Lifecycle Policy 설정

### 권장 설정 (lifecycle.json)

```json
{
  "Rules": [
    {
      "ID": "DeleteOldArchives",
      "Filter": {
        "Prefix": "archives/"
      },
      "Status": "Enabled",
      "Expiration": {
        "Days": 1
      }
    },
    {
      "ID": "DeleteOldHighlights",
      "Filter": {
        "Prefix": "highlights/"
      },
      "Status": "Enabled",
      "Expiration": {
        "Days": 30
      }
    }
  ]
}
```

### 적용 방법

```bash
# Lifecycle 정책 적용
aws s3api put-bucket-lifecycle-configuration \
  --bucket your-bucket-name \
  --lifecycle-configuration file://lifecycle.json

# 적용 확인
aws s3api get-bucket-lifecycle-configuration \
  --bucket your-bucket-name
```

---

## 7. 예상 스토리지 사용량

### 로컬 디스크 (스트리밍 서버)

| 항목 | 크기 |
|------|------|
| HLS 스트림 버퍼 (300 세그먼트) | ~500MB |
| 분석 대기 아카이브 (2-3개) | ~75MB |
| **총합** | **~600MB 이하** |

### S3 (1일 기준)

| 항목 | 크기 | 월 비용 (예상) |
|------|------|----------------|
| 아카이브 (144개/일 × 25MB) | ~3.6GB | ~$0.09 |
| 하이라이트 (7일치) | ~350MB | ~$0.01 |
| 사용자 업로드 | 가변 | 가변 |
| **총합** | ~4GB | **~$0.10/월** |

---

## 8. 환경 변수 설정

### 스트리밍 서버 (.env)

```bash
# S3 설정 (필수)
S3_BUCKET_NAME=your-dailycam-bucket
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# CloudFront CDN (선택)
CLOUDFRONT_DOMAIN=d1234567890.cloudfront.net

# HLS 스트리밍 활성화
ENABLE_HLS_STREAMING=true

# DB 연결 (메인 서버)
MYSQL_REMOTE_HOST=메인서버IP
MYSQL_PASSWORD=your_password
```

### 워커 서버 (.env)

```bash
# S3 설정 (분석 시 다운로드 필요할 수 있음)
S3_BUCKET_NAME=your-dailycam-bucket
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# 분석 후 로컬 파일 삭제 (현재 비활성화)
DELETE_VIDEO_AFTER_ANALYSIS=false

# Gemini API
GEMINI_API_KEY=your_gemini_key
```

---

## 9. 모니터링 & 트러블슈팅

### 로그 확인

```bash
# HLS 스트림 상태
docker logs dailycam-fastapi-streaming 2>&1 | grep "HLS 스트림"

# 아카이브 생성
docker logs dailycam-fastapi-streaming 2>&1 | grep "아카이브"

# S3 업로드
docker logs dailycam-fastapi-streaming 2>&1 | grep "S3Service"

# VLM 분석
docker logs dailycam-worker-1 2>&1 | grep "워커"

# 자동 정리
docker logs dailycam-fastapi-prod 2>&1 | grep "자동 정리"
```

### 디스크 사용량 확인

```bash
# 로컬 아카이브 폴더
du -sh temp_videos/hls_buffer/*/archive/

# 아카이브 파일 개수
find temp_videos/hls_buffer/*/archive/ -name "*.mp4" | wc -l

# Docker 볼륨 크기
docker system df -v
```

### S3 사용량 확인

```bash
# AWS CLI
aws s3 ls s3://your-bucket/archives/ --recursive --human-readable --summarize
aws s3 ls s3://your-bucket/highlights/ --recursive --human-readable --summarize
```

---

## 10. 관련 문서

- [아카이브 워크플로우 상세](./ARCHIVE_WORKFLOW.md)
- [S3 Lifecycle Policy 설정](./S3_LIFECYCLE_POLICY.md)
- [프로덕션 영상 관리](./PRODUCTION_VIDEO_MANAGEMENT.md)
- [스트리밍 컴포넌트 개요](./STREAMING_COMPONENTS_OVERVIEW.md)
- [서버 분리 배포 가이드](../deployment/SERVER_SEPARATION_SETUP.md)
