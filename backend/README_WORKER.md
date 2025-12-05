# VLM 분석 워커 프로세스

## 개요

VLM 분석 워커는 FastAPI 메인 서버와 완전히 분리된 별도 프로세스입니다.
HLS 스트리밍에 영향을 주지 않고 무거운 Gemini VLM 분석을 수행합니다.

## 아키텍처

```
FastAPI 서버 (HLS 스트리밍)
    ↓ (Job 등록)
analysis_jobs 테이블
    ↓ (폴링)
워커 프로세스 (VLM 분석)
```

## 실행 방법

### Windows

```bash
# 방법 1: 배치 파일 사용
cd backend
start_worker.bat

# 방법 2: 직접 실행
cd backend
python analysis_worker.py
```

### Linux/Mac

```bash
cd backend
python analysis_worker.py
```

## 워커 상태 확인

워커가 정상적으로 실행되면 다음과 같은 로그가 출력됩니다:

```
============================================================
🤖 VLM 분석 워커 프로세스
============================================================
워커 ID: worker-1
시작 시간: 2025-12-03 15:30:00
============================================================
[워커 worker-1] 🚀 시작됨
[워커 worker-1] 폴링 간격: 5초
```

## Job 처리 로그

```
[워커 worker-1] 📋 Job 발견: ID=123, 구간=15:20:00~15:30:00
[워커 worker-1] ⏳ 파일 안정화 대기 중...
[워커 worker-1] ✅ 파일 안정화 완료: 78.83MB
[워커 worker-1] 📹 비디오 파일 크기: 78.83MB ✅
[워커 worker-1] 🤖 Gemini VLM 분석 시작...
[워커 worker-1] ✅ Gemini VLM 분석 완료
[워커 worker-1] ✅ Job 완료: ID=123
  📊 안전 점수: 85
  🚨 사건 수: 3
```

## 종료 방법

워커를 종료하려면 `Ctrl+C`를 누르세요. Graceful shutdown이 수행됩니다.

## 여러 워커 실행

부하가 높은 경우 여러 워커를 동시에 실행할 수 있습니다:

```bash
# 터미널 1
set WORKER_ID=worker-1
python analysis_worker.py

# 터미널 2
set WORKER_ID=worker-2
python analysis_worker.py

# 터미널 3
set WORKER_ID=worker-3
python analysis_worker.py
```

각 워커는 독립적으로 Job을 가져가서 처리합니다.

## 문제 해결

### 워커가 Job을 처리하지 않음

1. **데이터베이스 연결 확인**:
   ```bash
   # MySQL 연결 테스트
   python scripts/test_mysql.py
   ```

2. **analysis_jobs 테이블 확인**:
   ```sql
   SELECT * FROM analysis_jobs WHERE status = 'pending';
   ```

3. **워커 로그 확인**:
   - 오류 메시지가 있는지 확인
   - DB 연결 오류, 파일 접근 오류 등

### Gemini API 오류

- API 키 확인: `.env` 파일의 `GEMINI_API_KEY`
- API 할당량 확인: Google Cloud Console
- 재시도 로직이 작동하는지 확인

### 파일 접근 오류

- 비디오 파일 경로가 올바른지 확인
- 파일 권한 확인
- 파일이 다른 프로세스에 의해 잠겨있지 않은지 확인

## 모니터링

### DB에서 Job 상태 확인

```sql
-- 대기 중인 Job
SELECT COUNT(*) FROM analysis_jobs WHERE status = 'pending';

-- 처리 중인 Job
SELECT * FROM analysis_jobs WHERE status = 'processing';

-- 완료된 Job (최근 10개)
SELECT * FROM analysis_jobs 
WHERE status = 'completed' 
ORDER BY completed_at DESC 
LIMIT 10;

-- 실패한 Job
SELECT * FROM analysis_jobs WHERE status = 'failed';
```

### 워커 성능 확인

```sql
-- 워커별 처리 현황
SELECT 
    worker_id, 
    COUNT(*) as total_jobs,
    AVG(TIMESTAMPDIFF(SECOND, started_at, completed_at)) as avg_duration_sec
FROM analysis_jobs 
WHERE status = 'completed'
GROUP BY worker_id;
```

## 프로덕션 배포

### systemd 서비스 (Linux)

`/etc/systemd/system/vlm-worker.service`:

```ini
[Unit]
Description=VLM Analysis Worker
After=network.target mysql.service

[Service]
Type=simple
User=your_user
WorkingDirectory=/path/to/backend
Environment="WORKER_ID=worker-1"
ExecStart=/path/to/venv/bin/python analysis_worker.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

실행:
```bash
sudo systemctl enable vlm-worker
sudo systemctl start vlm-worker
sudo systemctl status vlm-worker
```

### Docker Compose

```yaml
version: '3.8'

services:
  fastapi:
    build: ./backend
    ports:
      - "8000:8000"
    depends_on:
      - mysql
    
  vlm-worker:
    build: ./backend
    command: python analysis_worker.py
    environment:
      - WORKER_ID=worker-1
    depends_on:
      - mysql
    deploy:
      replicas: 2  # 2개의 워커 실행
```

## 관련 파일

- `backend/analysis_worker.py`: 워커 메인 스크립트
- `backend/app/models/live_monitoring/analysis_job.py`: Job 모델
- `backend/app/services/live_monitoring/segment_analyzer.py`: Job 등록 스케줄러
- `backend/start_worker.bat`: Windows 시작 스크립트

