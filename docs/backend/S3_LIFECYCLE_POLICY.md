# S3 Lifecycle Policy 설정 가이드

## 개요
아카이브 영상을 1일 후 자동으로 삭제하는 S3 Lifecycle Policy 설정 방법입니다.

## AWS Console에서 설정

### 1. S3 버킷으로 이동
1. AWS Console → S3 서비스 접속
2. 해당 버킷 선택 (예: `dailycam-videos`)

### 2. Lifecycle Rule 생성
1. **Management** 탭 클릭
2. **Create lifecycle rule** 클릭

### 3. Rule 설정

#### Step 1: Rule name
```
Name: Delete Archives After 1 Day
Description: 아카이브 영상을 1일 후 자동 삭제
```

#### Step 2: Filter
- **Prefix**: `archives/`
- 이렇게 하면 `archives/` 폴더의 파일들만 규칙이 적용됩니다

#### Step 3: Lifecycle rule actions
✅ **Expire current versions of objects** 체크

#### Step 4: Expiration settings
```
Days after object creation: 1
```

#### Step 5: Review and create
- 설정 확인 후 **Create rule** 클릭

## 결과

### 자동 삭제 동작
```
업로드 시간                  삭제 시간
2025-12-09 10:00:00  →  2025-12-10 10:00:00 (24시간 후)
2025-12-09 14:30:00  →  2025-12-10 14:30:00 (24시간 후)
```

### 폴더 구조
```
s3://your-bucket/
├── highlights/          ← 7일 보관 (ClipCleanupService)
│   └── clip-123/
│       ├── video.mp4
│       └── thumbnail.jpg
└── archives/           ← 1일 보관 (Lifecycle Policy)
    └── camera-1/
        └── 2025/
            └── 12/
                └── 09/
                    ├── archive_20251209_100000.mp4
                    └── archive_20251209_101000.mp4
```

## CLI로 설정 (선택사항)

### lifecycle.json 파일 생성
```json
{
  "Rules": [
    {
      "Id": "DeleteArchivesAfter1Day",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "archives/"
      },
      "Expiration": {
        "Days": 1
      }
    }
  ]
}
```

### 적용 명령어
```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket your-bucket-name \
  --lifecycle-configuration file://lifecycle.json
```

### 확인 명령어
```bash
aws s3api get-bucket-lifecycle-configuration \
  --bucket your-bucket-name
```

## 비용 계산

### 최적화 후 예상 용량
```
아카이브 영상 (압축 강화):
- FPS: 5 (30 → 5)
- CRF: 32 (23 → 32)
- 10분당: ~20-30MB
- 하루: 144개 × 25MB = 3.6GB
```

### S3 비용 (1일 보관)
```
Standard Storage: $0.023/GB/월
- 하루치: 3.6GB
- 월 평균: 3.6GB (계속 교체되므로)
- 월 비용: 3.6GB × $0.023 ≈ $0.08/월 ≈ 100원/월
```

### 하이라이트 클립 비용 (7일 보관)
```
클립당: ~10MB
하루 5개 생성 가정: 50MB
일주일: 350MB
월 비용: 0.35GB × $0.023 ≈ $0.01/월 ≈ 12원/월
```

### 총 비용
```
아카이브 + 하이라이트 = $0.09/월 ≈ 110원/월
```

## 검증 방법

### 1. 업로드 확인
```bash
# S3에 아카이브가 업로드되는지 확인
aws s3 ls s3://your-bucket/archives/camera-1/ --recursive
```

### 2. 자동 삭제 확인
```bash
# 24시간 후 해당 파일이 삭제되었는지 확인
aws s3 ls s3://your-bucket/archives/camera-1/2025/12/09/
```

### 3. 백엔드 로그 확인
```
[S3Service] 📤 아카이브 업로드 시작: archive_20251209_100000.mp4 (25.3MB)
[S3Service] ✅ 아카이브 업로드 완료: https://...
[HLS 아카이브] 🗑️ 로컬 파일 삭제: archive_20251209_100000.mp4
[HLS 아카이브] ✅ S3 업로드 및 로컬 삭제 완료
```

## 주의사항

1. **Lifecycle Policy는 즉시 적용되지 않음**
   - 일반적으로 24-48시간 이내에 삭제됩니다
   - 정확한 24시간 후가 아닐 수 있습니다 (AWS의 내부 스케줄에 따름)

2. **로컬 디스크 관리**
   - S3 업로드 실패 시 로컬 파일이 남을 수 있습니다
   - 주기적으로 확인 권장

3. **복구 불가능**
   - 삭제된 파일은 복구할 수 없습니다
   - 장기 보관이 필요하면 Glacier로 전환 고려

## 문제 해결

### S3 업로드가 안 될 때
1. `.env` 파일의 S3 설정 확인:
   ```bash
   S3_BUCKET_NAME=your-bucket-name
   AWS_REGION=ap-northeast-2
   AWS_ACCESS_KEY_ID=your-access-key
   AWS_SECRET_ACCESS_KEY=your-secret-key
   ```

2. IAM 권한 확인:
   ```json
   {
     "Effect": "Allow",
     "Action": [
       "s3:PutObject",
       "s3:PutObjectAcl",
       "s3:GetObject",
       "s3:DeleteObject"
     ],
     "Resource": "arn:aws:s3:::your-bucket-name/archives/*"
   }
   ```

### 로컬 디스크가 가득 찰 때
S3 업로드가 제대로 되지 않아 로컬 파일이 쌓이는 경우:

```bash
# 수동으로 오래된 아카이브 삭제 (1일 이상 된 파일)
find ./temp_videos/hls_buffer/*/archive/ -name "*.mp4" -mtime +1 -delete
```

