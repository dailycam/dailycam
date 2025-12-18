# 아카이브 영상 워크플로우

## 개요
10분 아카이브 영상의 생성부터 S3 업로드, VLM 분석, 삭제까지의 전체 프로세스를 설명합니다.

## 전체 워크플로우

```
┌─────────────────────────────────────────────────────────────┐
│ 1. HLS 스트림 생성 (실시간)                                  │
│    - 30fps, 640x480 (프론트엔드 시청용)                      │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. 10분 아카이브 생성 (백그라운드)                           │
│    - 5fps, 640x480, CRF 32                                   │
│    - temp_videos/hls_buffer/camera-1/archive/               │
│    - 파일명: archive_20251209_100000.mp4 (~25MB)            │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. S3 업로드 (비동기)                                        │
│    - s3://bucket/archives/camera-1/2025/12/09/               │
│    - ✅ 업로드 성공                                          │
│    - 📁 로컬 파일 유지 (VLM 분석용)                          │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. SegmentAnalysisScheduler (10분마다)                      │
│    - archive 폴더에서 영상 파일 찾기                         │
│    - analysis_jobs 테이블에 Job 등록 (PENDING)              │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. VLM Worker (폴링)                                         │
│    - PENDING Job 가져오기                                    │
│    - 로컬 파일 읽기 (temp_videos/hls_buffer/.../archive/)   │
│    - 파일 안정화 대기 (30초)                                 │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. VLM 분석 (Gemini API)                                     │
│    - 추가 압축: 1fps, 480p, CRF 28 (~5-8MB)                 │
│    - Gemini API 전송 및 분석                                 │
│    - 분석 결과: 안전 점수, 발달 점수, 이벤트 등              │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. 결과 저장                                                 │
│    - AnalysisJob (COMPLETED)                                 │
│    - SegmentAnalysis                                         │
│    - AnalysisLog, DevelopmentEvent, SafetyEvent              │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. 하이라이트 클립 생성 (자동)                               │
│    - 안전 사건 + 발달 마일스톤 기반                          │
│    - FFmpeg로 클립 생성                                      │
│    - S3 업로드 (highlights/)                                 │
│    - 로컬 클립 삭제                                          │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 9. 아카이브 로컬 파일 삭제                                   │
│    - DELETE_VIDEO_AFTER_ANALYSIS=True 인 경우                │
│    - 🗑️ temp_videos/hls_buffer/.../archive/*.mp4 삭제       │
│    - ✅ 로컬 디스크 절약                                     │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 10. S3 자동 삭제 (24시간 후)                                │
│     - S3 Lifecycle Policy                                    │
│     - archives/ 폴더의 파일들 자동 삭제                      │
│     - ✅ 스토리지 비용 최소화                                │
└─────────────────────────────────────────────────────────────┘
```

## 타이밍 예시

```
10:00:00 - 아카이브 생성 시작 (10:00~10:10 구간)
10:10:00 - 아카이브 저장 완료 (archive_20251209_100000.mp4)
10:10:05 - S3 업로드 시작
10:10:30 - S3 업로드 완료 (로컬 파일 유지)
10:10:30 - SegmentAnalysisScheduler가 Job 등록
10:10:35 - VLM Worker가 Job 가져오기
10:11:05 - 파일 안정화 대기 완료 (30초)
10:11:10 - VLM 분석 시작 (추가 압축)
10:15:30 - VLM 분석 완료 (약 4분 소요)
10:15:35 - 하이라이트 클립 생성
10:15:45 - 로컬 아카이브 파일 삭제 ✅
          (temp_videos/hls_buffer/.../archive_20251209_100000.mp4)

다음날 10:10:30 - S3에서 자동 삭제 ✅
          (s3://bucket/archives/.../archive_20251209_100000.mp4)
```

## 파일 위치 정리

### 로컬 디스크
```
temp_videos/
└── hls_buffer/
    └── camera-1/
        ├── hls/                    # HLS 실시간 스트림 (.ts, .m3u8)
        │   ├── stream.m3u8
        │   ├── stream0.ts
        │   └── stream1.ts
        └── archive/                # 10분 아카이브 영상
            ├── archive_20251209_100000.mp4  (VLM 분석 후 삭제)
            ├── archive_20251209_101000.mp4  (VLM 분석 대기 중)
            └── archive_20251209_102000.mp4  (방금 생성됨)
```

### S3
```
s3://your-bucket/
├── archives/                       # 아카이브 영상 (1일 보관)
│   └── camera-1/
│       └── 2025/
│           └── 12/
│               └── 09/
│                   ├── archive_20251209_100000.mp4
│                   ├── archive_20251209_101000.mp4
│                   └── archive_20251209_102000.mp4
└── highlights/                     # 하이라이트 클립 (7일 보관)
    ├── clip-123/
    │   ├── video.mp4
    │   └── thumbnail.jpg
    └── clip-124/
        ├── video.mp4
        └── thumbnail.jpg
```

## 디스크 사용량

### 로컬 디스크 (최소화)
```
HLS 스트림: ~500MB (순환 버퍼)
아카이브: 2-3개 × 25MB = 50-75MB (분석 대기 중인 파일만)
총: ~600MB 이하
```

### S3 (1일치)
```
아카이브: 144개 × 25MB = 3.6GB
하이라이트: ~350MB (7일치)
총: ~4GB
월 비용: $0.09 (약 110원)
```

## 환경 변수 설정

### `.env` 파일
```bash
# S3 설정 (필수)
S3_BUCKET_NAME=your-bucket-name
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=xxxxx
AWS_SECRET_ACCESS_KEY=xxxxx

# VLM 분석 후 로컬 파일 삭제 (권장)
DELETE_VIDEO_AFTER_ANALYSIS=True

# Gemini API (필수)
GEMINI_API_KEY=xxxxx
```

## 트러블슈팅

### 문제 1: VLM 분석 실패 - FileNotFoundError
**증상**: `비디오 파일 없음: archive_xxx.mp4`

**원인**: 
- S3 업로드 후 로컬 파일이 삭제되었으나 VLM 분석이 아직 시작 안 됨
- (현재 버전에서는 해결됨 - VLM 분석 후 삭제)

**해결**:
```bash
# 환경 변수 확인
DELETE_VIDEO_AFTER_ANALYSIS=True  # VLM 분석 후에만 삭제
```

### 문제 2: 로컬 디스크가 가득 참
**증상**: 디스크 사용량이 계속 증가

**원인**: 
- `DELETE_VIDEO_AFTER_ANALYSIS=False`로 설정됨
- S3 업로드 실패로 로컬 파일이 쌓임

**해결**:
```bash
# 1. 환경 변수 확인
DELETE_VIDEO_AFTER_ANALYSIS=True

# 2. 수동으로 오래된 아카이브 삭제 (1일 이상)
find ./temp_videos/hls_buffer/*/archive/ -name "*.mp4" -mtime +1 -delete

# 3. S3 업로드 로그 확인
grep "S3 업로드" backend_logs.txt
```

### 문제 3: S3 비용이 높음
**증상**: 월 $10 이상 청구

**원인**: Lifecycle Policy 미설정

**해결**:
1. S3 Console → Bucket → Management 탭
2. Lifecycle Rule 확인:
   - Prefix: `archives/`
   - Expiration: 1 day
3. CloudWatch로 객체 수 모니터링

## 모니터링

### 로그 확인
```bash
# HLS 아카이브 생성
grep "HLS 아카이브" backend_logs.txt

# S3 업로드
grep "S3Service.*아카이브" backend_logs.txt

# VLM 분석
grep "워커.*Job 처리" backend_logs.txt

# 파일 삭제
grep "분석 완료된 파일 삭제" backend_logs.txt
```

### 디스크 사용량
```bash
# 로컬 아카이브 폴더 크기
du -sh temp_videos/hls_buffer/*/archive/

# 파일 개수
find temp_videos/hls_buffer/*/archive/ -name "*.mp4" | wc -l
```

### S3 사용량
```bash
# AWS CLI로 확인
aws s3 ls s3://your-bucket/archives/camera-1/ --recursive --human-readable --summarize
```

## 최적화 요약

✅ **압축 최적화**
- 아카이브: 5fps, CRF 32 → 25MB/10분
- VLM 전송: 1fps, CRF 28 → 5-8MB/10분

✅ **스토리지 최적화**
- 로컬: VLM 분석 후 자동 삭제 → 600MB 이하
- S3: 1일 후 자동 삭제 → 4GB 유지

✅ **비용 최적화**
- S3 Standard 1일 보관 → $0.09/월
- Lifecycle Policy 활용 → 추가 비용 없음

✅ **분석 품질**
- 5fps 아카이브도 AI 분석에 충분
- 1fps VLM 전송으로 속도 향상
- 정확도 손실 없음

