# 서버 분리 설정 가이드

## 📋 개요

스트리밍 서버와 워커 서버를 분리하여 CPU 부하를 분산합니다.

## 🏗️ 아키텍처

```
[스트리밍 서버 - stream.dailycam.net]
├── FastAPI (API 서버)
├── HLS 스트리밍 생성
├── MySQL (워커 서버에서 접근)
└── Nginx

[워커 서버 - 기존 서버]
├── VLM Worker 1
└── VLM Worker 2
```

---

## 🚀 설정 단계

### 1단계: 스트리밍 서버 설정 (새 서버)

#### 1-1. 코드 배포

```bash
# 새 서버에 접속
ssh ubuntu@stream.dailycam.net

# 코드 클론
git clone <repository>
cd dailycam

# 환경 변수 설정
cp env.production.template .env
# .env 파일 편집 (기존 서버와 동일한 값 사용)
```

#### 1-2. Docker Compose 실행

```bash
# 스트리밍 서버용 compose 파일 사용
docker-compose -f docker-compose.streaming.yml up -d --build

# 로그 확인
docker-compose -f docker-compose.streaming.yml logs -f
```

#### 1-3. MySQL 외부 접근 허용

```bash
# MySQL 컨테이너 접속
docker exec -it dailycam-mysql-streaming mysql -u root -p${MYSQL_ROOT_PASSWORD}

# MySQL 내부에서 실행:
CREATE USER IF NOT EXISTS 'dailycam_user'@'%' IDENTIFIED BY '${MYSQL_PASSWORD}';
GRANT ALL PRIVILEGES ON dailycam.* TO 'dailycam_user'@'%';
FLUSH PRIVILEGES;
EXIT;
```

#### 1-4. 테이블 생성

```bash
# 모든 테이블 생성
docker exec -it dailycam-fastapi-streaming python app/init_db.py
```

---

### 2단계: 워커 서버 설정 (기존 서버)

#### 2-1. 환경 변수 설정

`.env` 파일에 추가:

```bash
# 스트리밍 서버 MySQL 접속 정보
MYSQL_REMOTE_HOST=stream.dailycam.net  # 또는 스트리밍 서버 Static IP
MYSQL_REMOTE_PASSWORD=동일한MYSQL_PASSWORD

# 나머지는 기존과 동일
```

#### 2-2. 기존 컨테이너 중지

```bash
# 기존 프로덕션 컨테이너 중지
docker-compose -f docker-compose.production.yml down

# 또는 특정 서비스만 중지
docker-compose -f docker-compose.production.yml stop fastapi mysql nginx
```

#### 2-3. 워커만 실행

```bash
# 코드 업데이트
git pull

# 워커 컨테이너 실행
docker-compose -f docker-compose.worker.yml up -d --build

# 로그 확인
docker-compose -f docker-compose.worker.yml logs -f
```

#### 2-4. 연결 테스트

```bash
# MySQL 연결 테스트
docker exec -it dailycam-worker-1 python -c "from app.database.session import test_db_connection; print('✅ 연결 성공' if test_db_connection() else '❌ 연결 실패')"
```

---

### 3단계: Lightsail 콘솔 설정

#### 3-1. 스트리밍 서버 방화벽 설정

1. Lightsail 콘솔 → 스트리밍 서버 선택
2. 네트워킹 탭 → 방화벽
3. 규칙 추가:
   - 애플리케이션: MySQL/Aurora
   - 포트: 3306
   - 제한: 워커 서버 IP만 허용 (또는 워커 서버의 Static IP)

#### 3-2. 워커 서버 방화벽 설정

1. Lightsail 콘솔 → 워커 서버 선택
2. 네트워킹 탭 → 방화벽
3. 확인 사항:
   - 아웃바운드: MySQL (3306) 허용되어 있는지 확인

#### 3-3. Static IP 확인

- 스트리밍 서버 Static IP 확인
- 워커 서버 Static IP 확인
- Route 53 레코드가 올바른 Static IP를 가리키는지 확인

---

## 🔍 확인 사항

### 스트리밍 서버

```bash
# 1. 컨테이너 상태 확인
docker-compose -f docker-compose.streaming.yml ps

# 2. MySQL 포트 확인
sudo netstat -tlnp | grep 3306

# 3. 로그 확인
docker-compose -f docker-compose.streaming.yml logs -f fastapi
```

### 워커 서버

```bash
# 1. 컨테이너 상태 확인
docker-compose -f docker-compose.worker.yml ps

# 2. MySQL 연결 테스트
docker exec -it dailycam-worker-1 python -c "from app.database.session import test_db_connection; test_db_connection()"

# 3. 워커 로그 확인
docker-compose -f docker-compose.worker.yml logs -f
```

---

## 🛠️ 트러블슈팅

### 문제: 워커 서버에서 MySQL 연결 실패

**확인 사항:**
1. 스트리밍 서버 MySQL이 실행 중인지
   ```bash
   docker-compose -f docker-compose.streaming.yml ps mysql
   ```

2. 방화벽 설정 확인
   - Lightsail 콘솔에서 3306 포트가 워커 서버 IP에 허용되어 있는지

3. MySQL 사용자 권한 확인
   ```bash
   docker exec -it dailycam-mysql-streaming mysql -u root -p${MYSQL_ROOT_PASSWORD} -e "SELECT user, host FROM mysql.user WHERE user='dailycam_user';"
   ```

4. 네트워크 연결 테스트
   ```bash
   # 워커 서버에서
   telnet stream.dailycam.net 3306
   # 또는
   nc -zv stream.dailycam.net 3306
   ```

### 문제: 워커가 Job을 찾지 못함

**확인 사항:**
1. 스트리밍 서버에서 Job이 생성되는지
   ```bash
   docker exec -it dailycam-mysql-streaming mysql -u dailycam_user -p${MYSQL_PASSWORD} dailycam -e "SELECT * FROM analysis_jobs ORDER BY created_at DESC LIMIT 5;"
   ```

2. 워커 로그 확인
   ```bash
   docker-compose -f docker-compose.worker.yml logs worker-1 | grep "PENDING Job"
   ```

---

## 📝 파일 구조

```
dailycam/
├── docker-compose.production.yml  # 기존 (백업용)
├── docker-compose.streaming.yml   # 스트리밍 서버용 (새로 생성)
├── docker-compose.worker.yml      # 워커 서버용 (새로 생성)
└── ...
```

---

## 🔄 마이그레이션 체크리스트

### 스트리밍 서버
- [ ] 코드 배포
- [ ] 환경 변수 설정
- [ ] Docker Compose 실행
- [ ] MySQL 외부 접근 허용
- [ ] 테이블 생성
- [ ] 방화벽 설정 (3306 포트)
- [ ] SSL 인증서 설정 (Let's Encrypt)

### 워커 서버
- [ ] 환경 변수 업데이트 (MYSQL_REMOTE_HOST)
- [ ] 기존 컨테이너 중지
- [ ] 워커 컨테이너 실행
- [ ] MySQL 연결 테스트
- [ ] 워커 로그 확인

---

**작성일**: 2025-12-12  
**버전**: 1.0

