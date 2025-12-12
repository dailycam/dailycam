# Lightsail 서버 분리 설정 가이드

## 📋 Lightsail 콘솔에서 해야 할 설정

### 1. 스트리밍 서버 (새 서버) 설정

#### 1-1. Static IP 확인 및 연결
1. Lightsail 콘솔 → 스트리밍 서버 선택
2. **네트워킹** 탭 → **Static IP** 확인
3. Static IP가 인스턴스에 연결되어 있는지 확인
4. 연결되어 있지 않으면 **연결** 클릭

#### 1-2. 방화벽 설정 (중요!)
1. Lightsail 콘솔 → 스트리밍 서버 선택
2. **네트워킹** 탭 → **방화벽** 섹션
3. **규칙 추가** 클릭
4. 다음 규칙 추가:
   - **애플리케이션**: MySQL/Aurora
   - **포트**: 3306
   - **제한**: 워커 서버의 Static IP만 허용
     - 또는: 워커 서버의 Private IP (같은 리전인 경우)
5. **저장** 클릭

#### 1-3. 도메인 연결 확인
1. Route 53 콘솔에서 `stream.dailycam.net` 레코드 확인
2. A 레코드가 스트리밍 서버의 Static IP를 가리키는지 확인

---

### 2. 워커 서버 (기존 서버) 설정

#### 2-1. 아웃바운드 규칙 확인
1. Lightsail 콘솔 → 워커 서버 선택
2. **네트워킹** 탭 → **방화벽** 섹션
3. 아웃바운드 규칙 확인:
   - MySQL (3306) 포트가 허용되어 있는지 확인
   - 기본적으로 모든 아웃바운드는 허용되므로 문제 없을 가능성이 높음

#### 2-2. Static IP 확인
- 워커 서버의 Static IP 확인 (스트리밍 서버 방화벽 설정에 사용)

---

## 🔐 보안 설정

### 옵션 1: Static IP로 제한 (권장)

**스트리밍 서버 방화벽:**
- MySQL (3306): 워커 서버 Static IP만 허용

**장점:**
- 보안 강화
- 특정 IP만 접근 가능

**설정 방법:**
1. 워커 서버 Static IP 확인
2. 스트리밍 서버 방화벽에서 MySQL 규칙 추가
3. 제한: 워커 서버 Static IP 입력

### 옵션 2: Private IP 사용 (같은 리전인 경우)

**조건:**
- 두 서버가 같은 AWS 리전에 있어야 함
- Private IP 사용 가능

**장점:**
- 더 안전 (인터넷을 거치지 않음)
- 비용 절감 (데이터 전송 비용 없음)

**설정 방법:**
1. 두 서버의 Private IP 확인
2. 스트리밍 서버 방화벽에서 MySQL 규칙 추가
3. 제한: 워커 서버 Private IP 입력
4. `docker-compose.worker.yml`에서 `MYSQL_REMOTE_HOST`를 Private IP로 설정

---

## 📝 체크리스트

### 스트리밍 서버
- [ ] Static IP 연결 확인
- [ ] 방화벽 설정 (MySQL 3306 포트)
- [ ] Route 53 레코드 확인 (stream.dailycam.net)
- [ ] SSL 인증서 설정 (Let's Encrypt)

### 워커 서버
- [ ] Static IP 확인
- [ ] 아웃바운드 규칙 확인 (MySQL 3306)
- [ ] 환경 변수 설정 (MYSQL_REMOTE_HOST)

---

## 🔍 연결 테스트

### 워커 서버에서 스트리밍 서버 MySQL 연결 테스트

```bash
# 1. 네트워크 연결 테스트
telnet stream.dailycam.net 3306
# 또는
nc -zv stream.dailycam.net 3306

# 2. MySQL 클라이언트로 연결 테스트
mysql -h stream.dailycam.net -u dailycam_user -p dailycam

# 3. Docker 컨테이너에서 테스트
docker exec -it dailycam-worker-1 python -c "from app.database.session import test_db_connection; print('✅ 연결 성공' if test_db_connection() else '❌ 연결 실패')"
```

---

## ⚠️ 주의사항

1. **방화벽 설정은 반드시 필요합니다**
   - MySQL 포트를 모든 IP에 열면 보안 위험
   - 워커 서버 IP만 허용하는 것이 안전

2. **Static IP 사용 권장**
   - 인스턴스 재시작 시 IP가 변경될 수 있음
   - Static IP를 사용하면 IP 변경 없음

3. **같은 리전 사용 권장**
   - 네트워크 지연 최소화
   - 데이터 전송 비용 없음

---

---

## 🌐 Nginx 설정 구조

### 서버별 역할

#### www.dailycam.net (메인 서버)
- **역할**: 프론트엔드 + API 서버
- **Nginx 설정**: `nginx/nginx.main.conf`
- **기능**:
  - 프론트엔드 정적 파일 서빙
  - API 요청을 FastAPI로 프록시
  - HLS 스트림 요청을 `stream.dailycam.net`으로 프록시

#### stream.dailycam.net (스트리밍 서버)
- **역할**: HLS 스트림만 제공
- **Nginx 설정**: `nginx/nginx.streaming.conf`
- **기능**:
  - HLS 스트림 엔드포인트만 제공 (`/api/live-monitoring/hls/`)
  - 프론트엔드 없음 (루트 경로는 404)
  - CORS 헤더로 `www.dailycam.net`에서 접근 허용

### 사용자 접근 흐름

```
사용자 → www.dailycam.net 접속
  ↓
프론트엔드 로드 (www.dailycam.net)
  ↓
모니터링 페이지에서 HLS 스트림 요청
  ↓
www.dailycam.net의 Nginx가 stream.dailycam.net으로 프록시
  ↓
stream.dailycam.net에서 HLS 스트림 제공
```

### Docker Compose 파일

- **메인 서버**: `docker-compose.production.yml` → `nginx.main.conf` 사용
- **스트리밍 서버**: `docker-compose.streaming.yml` → `nginx.streaming.conf` 사용

---

**작성일**: 2025-12-12  
**버전**: 2.0

