# 스트리밍 서버 DB 설정 가이드

스트리밍 서버가 메인 서버의 DB를 사용하도록 설정하는 방법입니다.

## 📋 사전 준비

1. **메인 서버의 Static IP 확인**
   - Lightsail 콘솔 → 메인 서버 → 네트워킹 → Static IP 확인
   - 예: `54.123.45.67`

2. **스트리밍 서버의 Static IP 확인**
   - Lightsail 콘솔 → 스트리밍 서버 → 네트워킹 → Static IP 확인
   - 예: `54.123.45.68`

## 🔧 설정 단계

### 1. 메인 서버 설정

#### 1-1. Docker Compose 파일 확인
`docker-compose.production.yml`에서 MySQL 포트가 외부 접근을 허용하는지 확인:

```yaml
mysql:
  ports:
    - "0.0.0.0:3306:3306"  # 스트리밍 서버 접근 허용
```

#### 1-2. Lightsail 방화벽 설정 (중요!)
1. Lightsail 콘솔 → 메인 서버 선택
2. **네트워킹** 탭 → **방화벽** 섹션
3. **규칙 추가** 클릭
4. 다음 규칙 추가:
   - **애플리케이션**: MySQL/Aurora
   - **포트**: 3306
   - **제한**: 스트리밍 서버의 Static IP만 허용
     - 예: `54.123.45.68`
5. **저장** 클릭

#### 1-3. Docker 컨테이너 재시작
```bash
# 메인 서버에서
cd ~/projects/dailycam
docker-compose -f docker-compose.production.yml restart mysql
```

### 2. 스트리밍 서버 설정

#### 2-1. 환경 변수 설정
`.env` 파일에 메인 서버의 IP 추가:

```bash
# 스트리밍 서버의 .env 파일
MYSQL_REMOTE_HOST=54.123.45.67  # 메인 서버의 Static IP
MYSQL_PASSWORD=dailycam_pass_2024  # 메인 서버와 동일한 비밀번호
```

#### 2-2. Docker Compose 파일 확인
`docker-compose.streaming.yml`에서 MySQL 서비스가 제거되고 메인 서버 DB를 사용하도록 설정되어 있는지 확인:

```yaml
fastapi:
  environment:
    - MYSQL_HOST=${MYSQL_REMOTE_HOST:-메인서버IP}
    - MYSQL_PORT=3306
    - MYSQL_USER=dailycam_user
    - MYSQL_PASSWORD=${MYSQL_PASSWORD}
    - MYSQL_DATABASE=dailycam
```

#### 2-3. Docker 컨테이너 재시작
```bash
# 스트리밍 서버에서
cd ~/projects/dailycam
docker-compose -f docker-compose.streaming.yml down
docker-compose -f docker-compose.streaming.yml up -d
```

### 3. 연결 테스트

#### 3-1. 스트리밍 서버에서 메인 서버 DB 연결 테스트
```bash
# 스트리밍 서버에서
docker exec dailycam-fastapi-streaming python -c "
from app.database.session import test_db_connection
if test_db_connection():
    print('✅ DB 연결 성공!')
else:
    print('❌ DB 연결 실패')
"
```

#### 3-2. 로그 확인
```bash
# 스트리밍 서버에서
docker logs dailycam-fastapi-streaming --tail 50 -f
```

성공하면 다음과 같은 로그가 보입니다:
```
✅ 데이터베이스 연결 성공!
✅ 데이터베이스 테이블 준비 완료!
```

## 🔐 보안 주의사항

1. **방화벽 설정은 필수입니다**
   - MySQL 포트를 모든 IP에 열면 보안 위험
   - 스트리밍 서버 IP만 허용하는 것이 안전

2. **Private IP 사용 (같은 리전인 경우)**
   - 두 서버가 같은 AWS 리전에 있으면 Private IP 사용 권장
   - 더 안전하고 비용 절감 (데이터 전송 비용 없음)
   - `.env`에서 `MYSQL_REMOTE_HOST`를 Private IP로 설정

3. **비밀번호 확인**
   - 메인 서버와 스트리밍 서버의 `MYSQL_PASSWORD`가 동일해야 함

## ⚠️ 문제 해결

### 연결 실패 시

1. **방화벽 규칙 확인**
   ```bash
   # 메인 서버에서
   sudo ufw status
   # 또는 Lightsail 콘솔에서 방화벽 규칙 확인
   ```

2. **네트워크 연결 테스트**
   ```bash
   # 스트리밍 서버에서
   telnet 메인서버IP 3306
   # 또는
   nc -zv 메인서버IP 3306
   ```

3. **MySQL 사용자 권한 확인**
   ```sql
   -- 메인 서버 DB에서
   SELECT user, host FROM mysql.user WHERE user='dailycam_user';
   -- 스트리밍 서버 IP에서 접근 가능한지 확인
   ```

4. **로그 확인**
   ```bash
   # 스트리밍 서버
   docker logs dailycam-fastapi-streaming --tail 100
   
   # 메인 서버
   docker logs dailycam-mysql-prod --tail 100
   ```

## ✅ 완료 확인

모든 설정이 완료되면:
1. 스트리밍 서버에서 영상 업로드 시 DB 조회가 정상 작동
2. 카메라 설정이 정상적으로 조회됨
3. HLS 스트림이 정상적으로 시작됨

---

**작성일**: 2025-12-13  
**버전**: 1.0

