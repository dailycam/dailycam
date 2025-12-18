# 스트리밍 서버 설정 트러블슈팅

## 📋 문제 개요

영상 업로드는 성공하지만 모니터링 페이지에서 스트리밍이 작동하지 않는 문제

---

## 🔍 초기 상태 (2025-12-13)

### 문제 상황
- ✅ 영상 업로드: 성공
- ❌ 스트리밍: 작동하지 않음
- ❌ 모니터링 페이지: 스트림이 표시되지 않음

### 서버 구조
- **메인 서버** (www.dailycam.net): 프론트엔드 + API 서버
- **스트리밍 서버** (stream.dailycam.net): HLS 스트림 전용 서버

### 초기 설정
- 메인 서버와 스트리밍 서버가 각각 별도의 MySQL DB 사용
- 메인 서버: `docker-compose.production.yml` - 자체 MySQL
- 스트리밍 서버: `docker-compose.streaming.yml` - 자체 MySQL

---

## 🔧 중간 과정

### 1단계: 스트림 상태 확인 문제 발견

**문제**: 프론트엔드가 메인 서버의 스트림 상태를 확인하지만, 실제 스트림은 스트리밍 서버에서 실행됨

**해결**:
- `backend/app/api/live_monitoring/router.py`의 `get_stream_status` 함수 수정
- 메인 서버일 때는 스트리밍 서버의 상태를 확인하도록 변경
- `httpx`를 사용하여 스트리밍 서버 API 호출

**코드 변경**:
```python
# 메인 서버에서는 스트리밍 서버의 상태를 확인
if not enable_hls_streaming:
    streaming_server_url = os.getenv("STREAMING_SERVER_URL", "https://stream.dailycam.net")
    response = await httpx.get(f"{streaming_server_url}/api/live-monitoring/stream-status/{camera_id}")
```

**상태**: ✅ 해결됨

---

### 2단계: S3 업로드 권한 문제

**문제**: 
```
[S3Service] ❌ 카메라 영상 업로드 중 오류 발생: 
User: arn:aws:iam::070949690849:user/dailycam-hls-prod 
is not authorized to perform: s3:PutObject
```

**원인**: IAM 사용자 `dailycam-hls-prod`에 S3 업로드 권한 없음

**해결**:
1. AWS IAM 콘솔에서 사용자 `dailycam-hls-prod` 선택
2. 권한 추가 → 기존 정책 직접 연결
3. `AmazonS3FullAccess` 또는 커스텀 정책 연결
4. 커스텀 정책 예시:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::dailycam-hls-prod",
                "arn:aws:s3:::dailycam-hls-prod/*"
            ]
        }
    ]
}
```

**상태**: ✅ 해결됨 (2025-12-13)

**확인 로그**:
```
[S3Service] ✅ 카메라 영상 업로드 완료: videos/camera-1/...
[비디오 업로드] ✅ S3 업로드 완료: videos/camera-1/...
```

---

### 3단계: 스트리밍 서버 DB 조회 실패

**문제**:
```
[영상 큐] ⚠️ 카메라 설정을 찾을 수 없습니다: camera-1
[HLS 스트림] ❌ 오류: 사용자 업로드 영상이 없습니다
```

**원인**: 
- 메인 서버와 스트리밍 서버가 별도의 DB 사용
- 메인 서버에만 카메라 설정이 저장됨
- 스트리밍 서버의 DB에는 카메라 설정이 없음
- S3에서 파일은 다운로드되었지만, DB 조회 실패로 영상을 찾지 못함

**해결 방안 검토**:
1. ❌ 로컬 파일 시스템 폴백 (사용자 요청: 원하지 않음)
2. ✅ 스트리밍 서버가 메인 서버의 DB를 사용하도록 설정 (선택됨)

**상태**: 🔄 진행 중

---

## 🎯 현재 상태 (2025-12-13)

### 선택한 해결 방법
**스트리밍 서버가 메인 서버의 DB를 사용하도록 설정**

### 변경 사항

#### 1. 메인 서버 설정 (`docker-compose.production.yml`)
```yaml
mysql:
  ports:
    - "0.0.0.0:3306:3306"  # 스트리밍 서버 접근 허용
```

#### 2. 스트리밍 서버 설정 (`docker-compose.streaming.yml`)
- MySQL 서비스 제거
- 메인 서버의 DB 사용하도록 환경 변수 설정:
```yaml
fastapi:
  environment:
    - MYSQL_HOST=${MYSQL_REMOTE_HOST:-메인서버IP}
    - MYSQL_PORT=3306
    - MYSQL_USER=dailycam_user
    - MYSQL_PASSWORD=${MYSQL_PASSWORD}
    - MYSQL_DATABASE=dailycam
```

#### 3. 보안 설정
- Lightsail 방화벽에서 MySQL(3306) 포트를 스트리밍 서버 IP만 허용

### 필요한 작업

#### 메인 서버
1. ✅ Docker Compose 파일 수정 완료
2. ⏳ Lightsail 방화벽 설정 (사용자 작업 필요)
3. ⏳ Docker 컨테이너 재시작 (사용자 작업 필요)

#### 스트리밍 서버
1. ✅ Docker Compose 파일 수정 완료
2. ⏳ `.env` 파일에 `MYSQL_REMOTE_HOST` 추가 (사용자 작업 필요)
3. ⏳ Docker 컨테이너 재시작 (사용자 작업 필요)

---

## ✅ 문제 해결 여부

### 완료된 항목
- [x] 스트림 상태 확인 로직 수정
- [x] S3 업로드 권한 설정
- [x] Docker Compose 파일 수정
- [x] 설정 가이드 문서 작성

### 진행 중인 항목
- [ ] 메인 서버 Lightsail 방화벽 설정
- [ ] 스트리밍 서버 환경 변수 설정
- [ ] Docker 컨테이너 재시작 및 테스트

### 예상 결과
설정 완료 후:
1. 스트리밍 서버가 메인 서버의 DB에서 카메라 설정 조회 성공
2. S3에서 다운로드한 영상 파일을 정상적으로 로드
3. HLS 스트림이 정상적으로 시작됨
4. 모니터링 페이지에서 스트림이 정상적으로 표시됨

---

## 📝 추가 참고 사항

### 관련 문서
- `docs/LIGHTSAIL_SERVER_SEPARATION.md` - 서버 분리 설정 가이드
- `docs/STREAMING_SERVER_DB_SETUP.md` - 스트리밍 서버 DB 설정 가이드

### 주요 파일 변경 내역
1. `docker-compose.production.yml` - MySQL 포트 외부 접근 허용
2. `docker-compose.streaming.yml` - MySQL 서비스 제거, 메인 서버 DB 사용
3. `backend/app/api/live_monitoring/router.py` - 스트림 상태 확인 로직 개선
4. `backend/app/api/camera_settings/router.py` - 에러 처리 개선

### 로그 확인 명령어
```bash
# 메인 서버
docker logs dailycam-fastapi-prod --tail 100 -f

# 스트리밍 서버
docker logs dailycam-fastapi-streaming --tail 100 -f
```

---

### 4단계: 모니터링 페이지 스트림 미표시 문제

**문제**: 
- 스트리밍 서버에서 영상이 돌아가는 것은 확인됨
- 모니터링 페이지에서 화면이 표시되지 않음
- 브라우저 콘솔: `Failed to load resource: the server responded with a status of 404`

**원인 분석**:
1. `camera-1.m3u8` 파일이 생성되지 않음
2. FFmpeg 프로세스가 즉시 종료됨 (exit code: 254)
3. 에러 메시지: `Error opening input file temp_videos/hls_buffer/camera-1/concat_list.txt`

**근본 원인**:
- concat 파일의 영상 경로가 상대 경로 (`videos/camera-1/...`)
- FFmpeg 실행 시 작업 디렉토리가 `/app`이 아니어서 상대 경로를 찾지 못함
- FFmpeg 명령어에 상대 경로가 전달되어 파일을 찾지 못함

**해결**:
- `backend/app/services/live_monitoring/hls_stream_generator.py` 수정:
  1. `_create_concat_file`: `video.resolve()`로 절대 경로 변환
  2. `_start_hls_streaming`: 모든 경로를 절대 경로로 변환
  3. FFmpeg 실행 시 `cwd='/app'` 설정

**코드 변경**:
```python
# concat 파일 생성 시 절대 경로 사용
video_absolute = video.resolve()
video_path = str(video_absolute).replace('\\', '/')

# FFmpeg 명령어에 절대 경로 사용
concat_file_absolute = concat_file.resolve()
playlist_path_absolute = playlist_path.resolve()
segment_pattern_absolute = str(hls_dir_absolute / segment_filename)

# FFmpeg 실행 시 작업 디렉토리 명시
subprocess.Popen(
    ffmpeg_cmd,
    cwd='/app',  # Docker 컨테이너 내부 작업 디렉토리
    ...
)
```

**상태**: ✅ 해결됨 (2025-12-13)

---

## 🔄 업데이트 이력

### 2025-12-13 (오후)
- ✅ 모니터링 페이지 스트림 미표시 문제 해결
- FFmpeg 경로 문제 수정 (상대 경로 → 절대 경로)
- concat 파일 생성 시 절대 경로 사용
- FFmpeg 실행 시 작업 디렉토리 명시

### 2025-12-13 (오전)
- 초기 문제 발견 및 분석
- 스트림 상태 확인 로직 수정
- S3 권한 문제 해결
- DB 조회 실패 문제 발견
- 스트리밍 서버가 메인 서버 DB 사용하도록 설계 변경
- Docker Compose 파일 수정
- 설정 가이드 문서 작성

---

**작성일**: 2025-12-13  
**최종 업데이트**: 2025-12-13 (오후)  
**상태**: 진행 중 (모니터링 페이지 스트림 표시 문제 해결 완료)

