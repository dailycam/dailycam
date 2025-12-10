# 프로덕션 환경 영상 관리 가이드

## 📹 영상 저장 구조

### 개발 환경 vs 프로덕션 환경

| 항목 | 개발 환경 | 프로덕션 환경 |
|------|-----------|--------------|
| **임시 영상** | `./backend/temp_videos` (호스트) | Docker 볼륨 `temp_videos` |
| **하이라이트 클립** | `./backend/videos` (호스트) | S3 + Docker 볼륨 (임시) |
| **스토리지** | 로컬 디스크 | S3 (메인) + 로컬 (버퍼) |
| **정리 정책** | 수동 | 자동 (S3 Lifecycle) |

---

## 🏗️ 프로덕션 아키텍처

### 1. **HLS 스트리밍 버퍼** (`temp_videos`)
```
temp_videos/
  └── hls_buffer/
      └── camera-1/
          ├── hls/           # 라이브 스트리밍 세그먼트 (실시간)
          │   ├── camera-1.m3u8
          │   ├── camera-1_000.ts
          │   └── camera-1_001.ts
          └── archive/       # 10분 단위 아카이브 (VLM 분석용)
              ├── archive_20251210_100000.mp4
              └── thumbnails/
```

**용도**: 
- 라이브 스트리밍 임시 버퍼
- VLM 분석 대기 중인 영상
- **분석 완료 후 자동 삭제** (7일 후)

**Docker 볼륨 사용 이유**:
- FastAPI, Worker-1, Worker-2가 동일한 파일 접근 필요
- 컨테이너 간 파일 공유

---

### 2. **하이라이트 클립** (`videos`)
```
videos/
  └── highlights/
      ├── highlight_safety_20251210_120000_abc123.mp4
      ├── highlight_dev_20251210_130000_def456.mp4
      └── thumbnails/
          ├── highlight_safety_20251210_120000_abc123.jpg
          └── highlight_dev_20251210_130000_def456.jpg
```

**플로우**:
1. Worker가 중요 이벤트 감지
2. FFmpeg로 클립 생성 → 로컬에 저장
3. **S3에 업로드** (자동)
4. **로컬 파일 삭제** (S3 업로드 성공 시)

**S3 업로드 설정**:
```python
# backend/app/services/s3_service.py
if s3_service.is_enabled():
    video_s3_url = s3_service.upload_clip(file_path, clip_id, "video")
    # 업로드 성공 시 로컬 파일 삭제
    output_path.unlink()
```

---

## 🗂️ S3 스토리지 구조

### S3 버킷 구조
```
s3://your-bucket-name/
  └── clips/
      └── {clip_id}/
          ├── video.mp4      # 원본 클립
          └── thumbnail.jpg  # 썸네일
```

### S3 Lifecycle 정책

**자동 삭제 규칙**:
```json
{
  "Rules": [
    {
      "Id": "DeleteOldClips",
      "Status": "Enabled",
      "Prefix": "clips/",
      "Expiration": {
        "Days": 30
      }
    }
  ]
}
```

→ **30일 후 자동 삭제** (스토리지 비용 절감)

---

## 🔧 프로덕션 설정

### docker-compose.production.yml

```yaml
services:
  fastapi:
    volumes:
      - temp_videos:/app/temp_videos  # Docker 볼륨
      - videos:/app/videos            # Docker 볼륨
    environment:
      # S3 설정 (필수)
      - S3_BUCKET_NAME=${S3_BUCKET_NAME}
      - AWS_REGION=${AWS_REGION:-ap-northeast-2}
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - CLOUDFRONT_DOMAIN=${CLOUDFRONT_DOMAIN}  # CDN (선택)
      
      # 자동 정리 활성화
      - DELETE_VIDEO_AFTER_ANALYSIS=True

volumes:
  temp_videos:    # 컨테이너 간 공유
  videos:         # 컨테이너 간 공유
  mysql_data:
```

### 환경 변수 설정

`.env.production` 파일:
```bash
# S3 스토리지 (필수)
S3_BUCKET_NAME=your-dailycam-bucket
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# CloudFront CDN (선택)
CLOUDFRONT_DOMAIN=d1234567890.cloudfront.net

# 자동 정리 활성화
DELETE_VIDEO_AFTER_ANALYSIS=True
```

---

## 📊 디스크 사용량 모니터링

### 1. Docker 볼륨 확인
```bash
# 볼륨 크기 확인
docker system df -v

# temp_videos 볼륨 정리 (주의: 스트리밍 중단)
docker volume rm dailycam_temp_videos
```

### 2. 자동 정리 스케줄러

**백엔드 자동 정리**:
```python
# backend/app/main.py
# 매일 새벽 3시 실행
- 아카이브 파일: 분석 완료 후 7일
- 하이라이트 클립: S3 업로드 후 즉시 삭제
```

---

## ⚠️ 주의사항

### 1. **S3 설정 필수**
프로덕션 환경에서는 **반드시 S3를 설정**하세요. 그렇지 않으면:
- 로컬 디스크가 빠르게 가득 참
- 서버 다운 가능

### 2. **볼륨 백업**
Docker 볼륨은 컨테이너 삭제 시 유지되지만, `docker-compose down -v` 시 삭제됩니다.

**백업 방법**:
```bash
# 볼륨 백업
docker run --rm -v dailycam_temp_videos:/source -v $(pwd):/backup alpine tar czf /backup/temp_videos_backup.tar.gz -C /source .

# 볼륨 복원
docker run --rm -v dailycam_temp_videos:/target -v $(pwd):/backup alpine tar xzf /backup/temp_videos_backup.tar.gz -C /target
```

### 3. **스토리지 비용**
- **S3 Standard**: 매월 $0.023/GB
- **CloudFront CDN**: 전송량 기반 과금
- **예상 비용**: 
  - 100GB 클립: 약 $2.30/월 (S3)
  - 1TB 전송: 약 $85/월 (CloudFront)

### 4. **확장성**
현재 구조는 **단일 서버**에 적합합니다.

**다중 서버 배포 시 추가 필요**:
- 공유 스토리지 (NFS, EFS)
- Redis (스트림 상태 공유)
- 로드 밸런서

---

## 🚀 배포 체크리스트

프로덕션 배포 전 확인:

- [ ] S3 버킷 생성
- [ ] IAM 사용자 생성 (S3 권한)
- [ ] `.env.production` 파일 설정
- [ ] S3 Lifecycle 정책 설정 (30일 자동 삭제)
- [ ] CloudFront CDN 설정 (선택)
- [ ] 디스크 모니터링 알람 설정
- [ ] 자동 백업 스크립트 설정

---

## 📖 관련 문서

- [S3 Lifecycle Policy](./S3_LIFECYCLE_POLICY.md)
- [Deployment Checklist](../DEPLOYMENT_CHECKLIST.md)
- [Feature: Clip Highlights Storage](./FEATURE_CLIP_HIGHLIGHTS_STORAGE.md)

