# Docker로 DailyCam 실행하기

## 🚀 빠른 시작

### 1. .env 파일 생성

프로젝트 루트에 `.env` 파일을 생성하세요:

```bash
# .env
# MySQL 설정
MYSQL_ROOT_PASSWORD=dailycam_root_2024
MYSQL_PASSWORD=dailycam_pass_2024

# Gemini API Key (필수 - 실제 키로 변경하세요!)
GEMINI_API_KEY=your_actual_gemini_api_key_here

# JWT Secret Key (프로덕션에서는 강력한 키로 변경)
JWT_SECRET_KEY=your-secret-key-change-in-production-2024

# PortOne API Secret (결제 기능 사용 시)
PORTONE_API_SECRET=your-portone-secret
```

⚠️ **중요**: `GEMINI_API_KEY`를 실제 API 키로 변경해야 합니다!

### 2. Docker Compose로 실행

```bash
# 빌드 및 시작 (최초 실행)
docker-compose up -d --build

# 로그 확인
docker-compose logs -f

# 특정 서비스만 로그 보기
docker-compose logs -f fastapi
docker-compose logs -f vlm-worker-1
docker-compose logs -f vlm-worker-2
```

### 3. 접속

- **FastAPI 서버**: http://localhost:8000
- **API 문서**: http://localhost:8000/docs
- **MySQL**: localhost:3306

---

## 📦 포함된 서비스

### 1. MySQL (dailycam-mysql)
- 포트: 3306
- 데이터베이스: dailycam
- 자동으로 `analysis_jobs` 테이블 생성

### 2. FastAPI 서버 (dailycam-fastapi)
- 포트: 8000
- HLS 스트리밍 담당
- 10분마다 분석 Job 등록

### 3. VLM 워커 1 (dailycam-worker-1)
- PENDING Job 처리
- Gemini VLM 분석 수행

### 4. VLM 워커 2 (dailycam-worker-2)
- PENDING Job 처리
- 워커 1과 독립적으로 작동
- 처리량 2배 증가

---

## 🔧 Docker 명령어

### 서비스 관리

```bash
# 시작
docker-compose up -d

# 중지
docker-compose down

# 재시작
docker-compose restart

# 특정 서비스만 재시작
docker-compose restart fastapi
docker-compose restart vlm-worker-1
```

### 로그 확인

```bash
# 모든 서비스 로그
docker-compose logs -f

# 특정 서비스 로그
docker-compose logs -f fastapi
docker-compose logs -f mysql

# 마지막 100줄만 보기
docker-compose logs --tail=100 fastapi
```

### 컨테이너 접속

```bash
# FastAPI 컨테이너 접속
docker exec -it dailycam-fastapi bash

# MySQL 컨테이너 접속
docker exec -it dailycam-mysql mysql -u root -p

# 워커 컨테이너 접속
docker exec -it dailycam-worker-1 bash
```

### 완전 삭제 (데이터 포함)

```bash
# 컨테이너, 네트워크, 볼륨 모두 삭제
docker-compose down -v

# 이미지까지 삭제
docker-compose down -v --rmi all
```

---

## 🔍 상태 확인

### 컨테이너 상태

```bash
docker-compose ps
```

출력 예시:
```
NAME                   STATUS         PORTS
dailycam-fastapi       Up 5 minutes   0.0.0.0:8000->8000/tcp
dailycam-mysql         Up 5 minutes   0.0.0.0:3306->3306/tcp
dailycam-worker-1      Up 5 minutes
dailycam-worker-2      Up 5 minutes
```

### 리소스 사용량

```bash
docker stats
```

### 네트워크 확인

```bash
docker network ls
docker network inspect dailycam_dailycam-network
```

---

## 🐛 문제 해결

### 1. 컨테이너가 시작되지 않음

```bash
# 로그 확인
docker-compose logs

# 특정 서비스 로그 확인
docker-compose logs fastapi
```

### 2. MySQL 연결 실패

```bash
# MySQL 헬스체크 확인
docker-compose ps

# MySQL 로그 확인
docker-compose logs mysql

# MySQL 접속 테스트
docker exec -it dailycam-mysql mysql -u dailycam_user -p
# 비밀번호: .env 파일의 MYSQL_PASSWORD
```

### 3. Gemini API 오류

`.env` 파일의 `GEMINI_API_KEY`가 올바른지 확인:

```bash
# 환경 변수 확인
docker exec dailycam-fastapi printenv | grep GEMINI
```

### 4. 포트 충돌

이미 8000 또는 3306 포트를 사용 중인 경우:

```bash
# 포트 사용 확인 (Windows)
netstat -ano | findstr :8000
netstat -ano | findstr :3306

# docker-compose.yml에서 포트 변경
# ports:
#   - "8001:8000"  # 외부:내부
```

### 5. 디스크 공간 부족

```bash
# 사용하지 않는 이미지/컨테이너 정리
docker system prune -a

# 볼륨 정리 (주의: 데이터 삭제됨)
docker volume prune
```

---

## 🔄 업데이트

코드 변경 후 재배포:

```bash
# 1. 컨테이너 중지
docker-compose down

# 2. 이미지 재빌드
docker-compose build

# 3. 시작
docker-compose up -d

# 또는 한 번에
docker-compose up -d --build
```

특정 서비스만 업데이트:

```bash
docker-compose up -d --build fastapi
```

---

## 📊 모니터링

### Job 처리 현황 확인

```bash
# MySQL 접속
docker exec -it dailycam-mysql mysql -u dailycam_user -p dailycam

# SQL 실행
SELECT status, COUNT(*) as count 
FROM analysis_jobs 
GROUP BY status;

# 최근 완료된 Job
SELECT * FROM analysis_jobs 
WHERE status = 'completed' 
ORDER BY completed_at DESC 
LIMIT 10;

# 워커별 성능
SELECT 
    worker_id, 
    COUNT(*) as total_jobs,
    AVG(TIMESTAMPDIFF(SECOND, started_at, completed_at)) as avg_duration_sec
FROM analysis_jobs 
WHERE status = 'completed'
GROUP BY worker_id;
```

---

## 🎯 프로덕션 배포

### 환경 변수 보안

1. `.env` 파일을 `.gitignore`에 추가
2. 프로덕션 서버에서 별도로 `.env` 파일 생성
3. 강력한 비밀번호 사용

### 성능 최적화

```yaml
# docker-compose.yml에 리소스 제한 추가
services:
  fastapi:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### 백업

```bash
# MySQL 데이터 백업
docker exec dailycam-mysql mysqldump -u root -p dailycam > backup.sql

# 볼륨 백업
docker run --rm -v dailycam_mysql_data:/data -v $(pwd):/backup ubuntu tar czf /backup/mysql_backup.tar.gz /data
```

---

## 📝 로컬 개발 vs Docker

| 항목 | 로컬 개발 | Docker |
|-----|----------|--------|
| 실행 | `python run.py` | `docker-compose up -d` |
| 워커 | 별도 터미널 필요 | 자동 실행 |
| MySQL | 별도 설치 필요 | 자동 포함 |
| 환경 변수 | `backend/.env` | `.env` (루트) |
| 의존성 | `pip install` | 자동 설치 |

---

## ✅ 체크리스트

시작 전 확인:

- [ ] Docker Desktop 설치 및 실행 중
- [ ] `.env` 파일 생성 완료
- [ ] `GEMINI_API_KEY` 실제 키로 변경
- [ ] 8000, 3306 포트 사용 가능
- [ ] 충분한 디스크 공간 (최소 10GB)

---

## 🆘 도움말

문제가 발생하면:

1. **로그 확인**: `docker-compose logs -f`
2. **컨테이너 상태**: `docker-compose ps`
3. **재시작**: `docker-compose restart`
4. **완전 재시작**: `docker-compose down && docker-compose up -d --build`

---

## 📚 관련 문서

- `docs/PROCESS_SEPARATION_ARCHITECTURE.md`: 아키텍처 설명
- `backend/README_WORKER.md`: 워커 상세 가이드
- `docs/FINAL_SOLUTION_SUMMARY.md`: 전체 솔루션 요약

