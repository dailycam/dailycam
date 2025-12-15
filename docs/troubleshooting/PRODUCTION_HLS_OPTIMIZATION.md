# 배포 환경 HLS 스트리밍 CPU 최적화 가이드

**날짜:** 2025-12-15  
**상태:** ✅ 적용 완료  
**버전:** 2.0

---

## 📋 개요

이 문서는 배포 환경(프로덕션)에서 HLS 스트리밍의 CPU 폭주 문제를 해결하기 위한 최적화 가이드입니다.

### 적용된 최적화

1. **`-re` 옵션 추가** - VOD 파일을 실제 재생 속도로 읽어 CPU 폭주 방지 (핵심!)
2. **Tee Muxer 구조** - 단일 인코딩으로 HLS와 아카이브 동시 생성
3. **CPU 스레드 제한** - `-threads 2` 옵션으로 리소스 사용 최적화
4. **비동기 이벤트 루프 충돌 해결** - `asyncio.run_coroutine_threadsafe` 사용

---

## 🎯 배포 환경 구조

### 서버 분리 구조

프로덕션 환경은 두 개의 서버로 분리되어 있습니다:

1. **메인 서버** (`docker-compose.production.yml`)
   - 역할: 프론트엔드 + API 서버
   - HLS 스트리밍: **비활성화** (`ENABLE_HLS_STREAMING=false`)
   - 도메인: `www.dailycam.net`

2. **스트리밍 서버** (`docker-compose.streaming.yml`)
   - 역할: HLS 스트리밍만 담당
   - HLS 스트리밍: **활성화** (`ENABLE_HLS_STREAMING=true`)
   - 도메인: `stream.dailycam.net`

### 최적화 적용 위치

**최적화는 스트리밍 서버에 적용됩니다:**
- 파일: `backend/app/services/live_monitoring/hls_stream_generator.py`
- 적용 대상: `docker-compose.streaming.yml`의 `fastapi` 컨테이너

---

## 🚀 배포 환경 테스트 방법

### 1. 스트리밍 서버 배포

#### 1-1. 코드 업데이트

```bash
# 스트리밍 서버에 SSH 접속
ssh -i [key-file].pem ubuntu@[streaming-server-IP]

# 프로젝트 디렉토리로 이동
cd ~/projects/dailycam

# 최신 코드 가져오기
git pull origin main  # 또는 배포 브랜치

# 변경사항 확인
git log --oneline -5
```

#### 1-2. 컨테이너 재빌드 및 재시작

```bash
# 기존 컨테이너 중지
docker-compose -f docker-compose.streaming.yml down

# 새 이미지 빌드
docker-compose -f docker-compose.streaming.yml build --no-cache fastapi

# 컨테이너 시작
docker-compose -f docker-compose.streaming.yml up -d

# 로그 확인
docker-compose -f docker-compose.streaming.yml logs -f fastapi
```

#### 1-3. 최적화 적용 확인

로그에서 다음 메시지를 확인하세요:

```
[통합 스트림] ✅ 최적화 적용: -re 옵션으로 CPU 폭주 방지 (600% → 10~20% 예상)
[통합 스트림] ✅ FFmpeg 프로세스 시작 (PID: xxx)
[통합 스트림] CPU 사용량 최적화: -re 옵션 + -threads 2로 리소스 사용 극대화
```

---

### 2. CPU 사용량 모니터링

#### 2-1. 실시간 CPU 모니터링

```bash
# Docker 컨테이너 리소스 사용량 확인
docker stats dailycam-fastapi-streaming

# 또는 시스템 전체 CPU 확인
top
htop  # 설치되어 있는 경우
```

#### 2-2. CPU 사용량 비교

**최적화 전 (예상):**
- CPU 사용량: **400% ~ 600%**
- 증상: 시스템 응답 지연, 다른 서비스 영향

**최적화 후 (예상):**
- CPU 사용량: **10% ~ 20%**
- 증상: 안정적 동작, 시스템 여유

#### 2-3. 장기 모니터링

```bash
# 1분마다 CPU 사용량 기록 (1시간 동안)
for i in {1..60}; do
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $(docker stats --no-stream --format '{{.CPUPerc}}' dailycam-fastapi-streaming)" >> cpu_monitor.log
    sleep 60
done

# 기록된 로그 확인
cat cpu_monitor.log
```

---

### 3. 스트리밍 기능 테스트

#### 3-1. HLS 스트림 재생 확인

1. 브라우저에서 `https://www.dailycam.net/live-monitoring` 접속
2. 카메라 스트림이 정상적으로 재생되는지 확인
3. 네트워크 탭에서 `.m3u8` 파일과 `.ts` 세그먼트 파일이 로드되는지 확인

#### 3-2. 아카이브 파일 생성 확인

```bash
# 아카이브 디렉토리 확인
ls -lh ~/projects/dailycam/backend/videos/camera-*/archive/

# 10분마다 새 파일이 생성되는지 확인
watch -n 60 'ls -lth ~/projects/dailycam/backend/videos/camera-*/archive/ | head -5'
```

#### 3-3. S3 업로드 확인

로그에서 다음 메시지를 확인하세요:

```
[아카이브] ✅ S3 업로드 완료: archive_YYYYMMDD_HHMMSS.mp4 → s3://...
[아카이브] ✅ 분석 Job 등록: archive_YYYYMMDD_HHMMSS.mp4 (Job ID: xxx)
```

---

### 4. 성능 벤치마크

#### 4-1. CPU 사용량 측정

```bash
# 스트리밍 시작 후 5분 동안 CPU 사용량 측정
echo "=== CPU 사용량 측정 시작 ===" > benchmark.txt
for i in {1..30}; do
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    cpu_usage=$(docker stats --no-stream --format '{{.CPUPerc}}' dailycam-fastapi-streaming)
    echo "$timestamp - CPU: $cpu_usage" >> benchmark.txt
    sleep 10
done
echo "=== 측정 완료 ===" >> benchmark.txt

# 결과 확인
cat benchmark.txt
```

#### 4-2. 메모리 사용량 확인

```bash
# 메모리 사용량 확인
docker stats --no-stream dailycam-fastapi-streaming

# 또는
docker exec dailycam-fastapi-streaming free -h
```

#### 4-3. FFmpeg 프로세스 확인

```bash
# FFmpeg 프로세스 확인
docker exec dailycam-fastapi-streaming ps aux | grep ffmpeg

# FFmpeg 명령어 확인
docker exec dailycam-fastapi-streaming ps aux | grep ffmpeg | grep -o '\-re'
```

---

## ✅ 검증 체크리스트

배포 환경 테스트 시 다음 항목을 확인하세요:

### 코드 적용 확인
- [ ] 최신 코드가 스트리밍 서버에 배포되었는지 확인
- [ ] 로그에서 최적화 메시지가 출력되는지 확인
- [ ] FFmpeg 프로세스에 `-re` 옵션이 적용되었는지 확인

### CPU 사용량 확인
- [ ] CPU 사용량이 10~20% 수준으로 안정적인지 확인
- [ ] CPU 사용량이 400% 이상으로 치솟지 않는지 확인
- [ ] 장기 실행 시에도 CPU 사용량이 안정적인지 확인

### 기능 동작 확인
- [ ] HLS 스트림이 정상적으로 재생되는지 확인
- [ ] 아카이브 파일이 10분마다 정상적으로 생성되는지 확인
- [ ] S3 업로드가 정상적으로 작동하는지 확인
- [ ] 분석 Job이 정상적으로 등록되는지 확인

### 시스템 안정성 확인
- [ ] 서버가 응답 불가 상태에 빠지지 않는지 확인
- [ ] 다른 서비스에 영향을 주지 않는지 확인
- [ ] 장기 실행 시에도 안정적인지 확인

---

## 🔧 트러블슈팅

### 문제: CPU 사용량이 여전히 높음 (400% 이상)

**확인 사항:**

1. **최적화 코드가 적용되었는지 확인**
   ```bash
   # 로그에서 -re 옵션 확인
   docker logs dailycam-fastapi-streaming 2>&1 | grep -i "최적화"
   ```

2. **FFmpeg 프로세스에 -re 옵션이 있는지 확인**
   ```bash
   docker exec dailycam-fastapi-streaming ps aux | grep ffmpeg
   # 출력에 "-re"가 포함되어 있어야 함
   ```

3. **컨테이너 재시작**
   ```bash
   docker-compose -f docker-compose.streaming.yml restart fastapi
   ```

**해결 방법:**

- 코드가 최신 버전인지 확인: `git log -1`
- 컨테이너 재빌드: `docker-compose -f docker-compose.streaming.yml build --no-cache fastapi`
- 컨테이너 재시작: `docker-compose -f docker-compose.streaming.yml restart fastapi`

### 문제: 스트리밍이 재생되지 않음

**확인 사항:**

1. **FFmpeg 프로세스 실행 확인**
   ```bash
   docker exec dailycam-fastapi-streaming ps aux | grep ffmpeg
   ```

2. **로그 확인**
   ```bash
   docker logs dailycam-fastapi-streaming --tail 100
   ```

3. **HLS 플레이리스트 파일 확인**
   ```bash
   ls -lh ~/projects/dailycam/backend/videos/camera-*/hls/*.m3u8
   ```

**해결 방법:**

- 컨테이너 로그 확인하여 오류 메시지 확인
- FFmpeg 프로세스가 실행 중인지 확인
- 영상 파일이 존재하는지 확인

### 문제: 아카이브 파일이 생성되지 않음

**확인 사항:**

1. **아카이브 디렉토리 확인**
   ```bash
   ls -lh ~/projects/dailycam/backend/videos/camera-*/archive/
   ```

2. **로그 확인**
   ```bash
   docker logs dailycam-fastapi-streaming 2>&1 | grep -i "아카이브"
   ```

3. **FFmpeg 프로세스 확인**
   ```bash
   docker exec dailycam-fastapi-streaming ps aux | grep ffmpeg
   ```

**해결 방법:**

- 로그에서 오류 메시지 확인
- 아카이브 디렉토리 권한 확인
- 컨테이너 재시작

---

## 📊 성능 모니터링 대시보드 (선택사항)

### Prometheus + Grafana 설정 (고급)

장기적인 성능 모니터링을 원하는 경우 Prometheus와 Grafana를 설정할 수 있습니다.

```yaml
# docker-compose.monitoring.yml (예시)
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"
  
  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
```

---

## 📝 변경 이력

### 2025-12-15: CPU 폭주 최적화 적용
- **변경사항**: `-re` 옵션 추가, CPU 스레드 제한, 비동기 이벤트 루프 충돌 해결
- **예상 효과**: CPU 사용량 600% → 10~20% 감소
- **상태**: ✅ 적용 완료

---

## 🔗 관련 문서

- [로컬 환경 최적화](../troubleshooting/CPU_OPTIMIZATION_HLS_STREAMING.md)
- [배포 가이드](../DEPLOYMENT_LIGHTSAIL.md)
- [서버 분리 가이드](../LIGHTSAIL_SERVER_SEPARATION.md)
- [HLS 스트리밍 아키텍처](../LIVE_STREAMING_ARCHITECTURE.md)

---

**작성일**: 2025-12-15  
**최종 업데이트**: 2025-12-15  
**작성자**: AI Assistant  
**버전**: 2.0

