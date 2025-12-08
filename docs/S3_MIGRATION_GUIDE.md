# S3 마이그레이션 가이드

## 개요

DailyCam의 영상 파일 저장소를 로컬 파일 시스템에서 AWS S3로 마이그레이션하는 가이드입니다.

## 아키텍처

### 하이브리드 방식 (권장)

- **실시간 HLS 스트리밍**: 로컬 디스크 사용 (빠른 접근)
- **업로드된 영상 파일**: S3 저장 (장기 보관)
- **아카이브 영상**: S3 저장 (10분 단위 분석용)

### 완전 S3 방식 (향후)

- 모든 영상 파일을 S3에 저장
- CloudFront CDN으로 전 세계 빠른 스트리밍
- 여러 인스턴스에서 동일 파일 접근 가능

## 설정 방법

### 1. AWS S3 버킷 생성

```bash
# AWS CLI 설치 후
aws s3 mb s3://dailycam-hls-prod --region ap-northeast-2

# 버킷 정책 설정 (공개 읽기)
aws s3api put-bucket-policy --bucket dailycam-videos --policy file://bucket-policy.json
```

### 2. IAM 사용자 생성 및 권한 설정

1. AWS 콘솔에서 IAM 사용자 생성
2. 다음 권한 부여:
   - `AmazonS3FullAccess` (또는 필요한 권한만)
3. Access Key ID와 Secret Access Key 생성

### 3. 환경 변수 설정

`.env.production` 파일에 다음 추가:

```bash
# AWS S3 설정
S3_BUCKET_NAME=dailycam-videos
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key

# CloudFront URL (선택사항, CDN 사용 시)
CLOUDFRONT_URL=https://d1234567890.cloudfront.net

# 로컬 저장소도 사용할지 여부 (true/false)
SAVE_VIDEO_LOCALLY=true
```

### 4. CloudFront 설정 (선택사항)

1. CloudFront 배포 생성
2. Origin을 S3 버킷으로 설정
3. Caching 정책 설정:
   - HLS 세그먼트: 캐시 없음 (0초)
   - 일반 영상: 1일 캐시
4. `CLOUDFRONT_URL` 환경 변수에 배포 URL 설정

## 사용 방법

### 영상 업로드

영상 업로드 시 자동으로 S3에 저장됩니다:

```python
# API 호출
POST /api/live-monitoring/upload-video?camera_id=camera-1

# 응답
{
    "camera_id": "camera-1",
    "filename": "uploaded_20250101_120000_video.mp4",
    "video_url": "https://dailycam-videos.s3.ap-northeast-2.amazonaws.com/videos/camera-1/short/uploaded_20250101_120000_video.mp4",
    "s3_key": "videos/camera-1/short/uploaded_20250101_120000_video.mp4",
    "storage": "s3"
}
```

### S3에서 영상 읽기

S3에 저장된 영상은 URL로 직접 접근 가능합니다:

```python
from app.utils.s3_utils import s3_client

# URL 가져오기
video_url = s3_client.get_url("videos/camera-1/short/video.mp4")

# 프리사인드 URL 생성 (비공개 파일용)
presigned_url = s3_client.get_presigned_url("videos/camera-1/short/video.mp4", expiration=3600)
```

## 마이그레이션 단계

### Phase 1: 새 파일만 S3 저장 (현재)

- 새로 업로드되는 영상만 S3에 저장
- 기존 파일은 로컬에 유지
- 로컬 저장소도 백업으로 유지 (`SAVE_VIDEO_LOCALLY=true`)

### Phase 2: 기존 파일 마이그레이션

```python
# 마이그레이션 스크립트 실행
python scripts/migrate_videos_to_s3.py
```

### Phase 3: 완전 전환

- 모든 영상 파일 S3 저장
- 로컬 저장소 제거 또는 최소화
- CloudFront CDN 활성화

## 비용 최적화

### S3 스토리지 클래스

- **Standard**: 자주 접근하는 파일
- **Intelligent-Tiering**: 접근 패턴 자동 최적화
- **Glacier**: 오래된 아카이브 파일

### 라이프사이클 정책

```json
{
  "Rules": [
    {
      "Id": "Move old videos to Glacier",
      "Status": "Enabled",
      "Prefix": "videos/",
      "Transitions": [
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        }
      ]
    }
  ]
}
```

## 문제 해결

### S3 업로드 실패

1. AWS 자격 증명 확인
2. 버킷 권한 확인
3. 네트워크 연결 확인
4. 로컬 저장소로 폴백 (자동)

### 성능 최적화

1. CloudFront CDN 사용
2. 멀티파트 업로드 (대용량 파일)
3. 병렬 업로드 (여러 파일)

## 모니터링

### CloudWatch 메트릭

- S3 요청 수
- 데이터 전송량
- 에러율

### 로그 확인

```bash
# FastAPI 로그에서 S3 관련 메시지 확인
docker-compose -f docker-compose.production.yml logs fastapi | grep S3
```

## 보안

### 버킷 정책

- 공개 읽기: HLS 세그먼트, 썸네일
- 비공개: 원본 영상 파일 (프리사인드 URL 사용)

### IAM 권한

최소 권한 원칙:
- `s3:PutObject` (업로드)
- `s3:GetObject` (다운로드)
- `s3:DeleteObject` (삭제)

## 참고 자료

- [AWS S3 문서](https://docs.aws.amazon.com/s3/)
- [CloudFront 문서](https://docs.aws.amazon.com/cloudfront/)
- [boto3 문서](https://boto3.amazonaws.com/v1/documentation/api/latest/index.html)

