# AWS Lightsail 배포 가이드

이 문서는 DailyCam 애플리케이션을 AWS Lightsail에 배포하는 방법을 설명합니다.

## 📋 목차

1. [사전 준비사항](#사전-준비사항)
2. [Lightsail 인스턴스 생성](#lightsail-인스턴스-생성)
3. [서버 초기 설정](#서버-초기-설정)
4. [애플리케이션 배포](#애플리케이션-배포)
5. [도메인 연결](#도메인-연결)
6. [모니터링 및 유지보수](#모니터링-및-유지보수)
7. [문제 해결](#문제-해결)

---

## 사전 준비사항

### 1. 필요한 AWS 계정 및 서비스

- AWS 계정
- AWS Lightsail 액세스 권한
- 도메인 (선택사항, HTTPS 사용 시 필요)

### 2. 필요한 API 키 및 인증 정보

다음 API 키들을 준비하세요:

- **GEMINI_API_KEY**: Google Gemini API 키
- **GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET**: Google OAuth 인증 정보
- **JWT_SECRET_KEY**: JWT 토큰 서명용 비밀키 (강력한 랜덤 문자열)
- **PORTONE_API_KEY / PORTONE_API_SECRET**: 포트원 결제 API 키
- **YOUTUBE_API_KEY**: YouTube API 키 (콘텐츠 추천 기능)
- **TAVILY_API_KEY**: Tavily API 키 (웹 검색 기능)

### 3. 로컬 환경 준비

- Git 설치
- SSH 클라이언트 설치
- (선택사항) AWS CLI 설치

---

## Lightsail 인스턴스 생성

### 1. Lightsail 콘솔 접속

1. [AWS Lightsail 콘솔](https://lightsail.aws.amazon.com/)에 로그인
2. "인스턴스 생성" 클릭

### 2. 인스턴스 설정

**플랫폼 및 블루프린트:**
- 플랫폼: Linux/Unix
- 블루프린트: Ubuntu 22.04 LTS 또는 Amazon Linux 2023

**인스턴스 플랜:**
- 최소 권장: **$20/월 플랜** (2GB RAM, 1 vCPU, 60GB SSD)
- 권장: **$40/월 플랜** (4GB RAM, 2 vCPU, 80GB SSD) - 비디오 처리 및 워커 실행을 위해
- 고성능 필요 시: **$80/월 플랜** 이상

**인스턴스 이름:**
- 예: `dailycam-production`

### 3. 네트워킹 설정

**고정 IP 생성:**
1. 인스턴스 생성 후 "네트워킹" 탭으로 이동
2. "고정 IP 생성" 클릭
3. 고정 IP 이름 지정 (예: `dailycam-static-ip`)
4. 인스턴스에 연결

**포트 열기:**
1. "네트워킹" 탭에서 "방화벽" 섹션 확인
2. 다음 포트 열기:
   - **HTTP (80)**: 웹 서버 접근
   - **HTTPS (443)**: SSL/TLS (선택사항)
   - **SSH (22)**: 서버 관리용

### 4. SSH 키 다운로드

1. 인스턴스 페이지에서 "SSH 키" 다운로드
2. 키 파일을 안전한 위치에 저장
3. Windows: PuTTY를 사용하거나 WSL에서 사용
4. Mac/Linux: `chmod 400 [key-file].pem` 실행

---

## 서버 초기 설정

### 1. SSH 접속

```bash
# Windows (PowerShell 또는 WSL)
ssh -i [key-file].pem ubuntu@[인스턴스-IP]

# Mac/Linux
ssh -i [key-file].pem ubuntu@[인스턴스-IP]
```

### 2. 시스템 업데이트

```bash
sudo apt update && sudo apt upgrade -y
```

### 3. 필수 패키지 설치

```bash
# Docker 설치
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Docker Compose 설치
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Git 설치
sudo apt install git -y

# 확인
docker --version
docker-compose --version
git --version
```

### 4. 사용자 권한 설정

```bash
# 현재 사용자를 docker 그룹에 추가
sudo usermod -aG docker $USER

# 변경사항 적용 (재로그인 필요)
newgrp docker
```

### 5. 프로젝트 클론

```bash
# 프로젝트 디렉토리 생성
mkdir -p ~/projects
cd ~/projects

# Git 저장소 클론 (또는 코드 업로드)
git clone [your-repository-url] dailycam
cd dailycam

# 또는 SCP로 파일 업로드
# scp -i [key-file].pem -r ./dailycam ubuntu@[인스턴스-IP]:~/projects/
```

---

## 애플리케이션 배포

### 1. 환경 변수 설정

```bash
# 프로덕션 환경 변수 파일 생성
cp .env.production.example .env.production

# 환경 변수 편집
nano .env.production
# 또는
vi .env.production
```

**중요한 환경 변수 확인:**
- `MYSQL_ROOT_PASSWORD`: 강력한 비밀번호 사용
- `MYSQL_PASSWORD`: 강력한 비밀번호 사용
- `JWT_SECRET_KEY`: `openssl rand -hex 32`로 생성
- `GEMINI_API_KEY`: 실제 API 키 입력
- `VITE_API_BASE_URL`: 프로덕션 도메인 URL (예: `https://your-domain.com`)

### 2. 프론트엔드 빌드 (로컬 또는 서버에서)

**옵션 A: 서버에서 빌드**

```bash
# Node.js 설치
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 프론트엔드 빌드
cd frontend
npm ci
npm run build
cd ..
```

**옵션 B: 로컬에서 빌드 후 업로드**

```bash
# 로컬에서
cd frontend
npm run build
cd ..

# 서버로 업로드
scp -i [key-file].pem -r frontend/dist ubuntu@[인스턴스-IP]:~/projects/dailycam/frontend/
```

### 3. Docker Compose로 배포

```bash
# 프로덕션용 Docker Compose로 빌드 및 시작
docker-compose -f docker-compose.production.yml build
docker-compose -f docker-compose.production.yml up -d

# 로그 확인
docker-compose -f docker-compose.production.yml logs -f
```

### 4. 배포 스크립트 사용 (권장)

```bash
# 배포 스크립트에 실행 권한 부여
chmod +x deploy.sh

# 배포 실행
./deploy.sh
```

### 5. 서비스 상태 확인

```bash
# 모든 컨테이너 상태 확인
docker-compose -f docker-compose.production.yml ps

# 특정 서비스 로그 확인
docker-compose -f docker-compose.production.yml logs -f fastapi
docker-compose -f docker-compose.production.yml logs -f nginx
docker-compose -f docker-compose.production.yml logs -f mysql

# 헬스 체크
curl http://localhost/
curl http://localhost/api/
```

---

## 도메인 연결

### 1. DNS 설정

1. 도메인 제공업체의 DNS 설정으로 이동
2. A 레코드 추가:
   - **호스트**: `@` 또는 `www`
   - **값**: Lightsail 인스턴스의 고정 IP 주소
   - **TTL**: 300 (5분)

### 2. Lightsail DNS 영역 생성 (선택사항)

1. Lightsail 콘솔에서 "DNS 영역" 생성
2. 도메인 등록
3. A 레코드 추가하여 인스턴스 연결

### 3. SSL/TLS 인증서 설정

**Let's Encrypt 사용 (무료):**

```bash
# Certbot 설치
sudo apt install certbot python3-certbot-nginx -y

# 인증서 발급 (Nginx가 실행 중이어야 함)
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 자동 갱신 설정
sudo certbot renew --dry-run
```

**인증서를 Nginx에 적용:**

1. `nginx/nginx.conf`에서 HTTPS 서버 블록 주석 해제
2. SSL 인증서 경로 설정:
   ```nginx
   ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
   ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
   ```
3. Docker Compose 재시작:
   ```bash
   docker-compose -f docker-compose.production.yml restart nginx
   ```

---

## 모니터링 및 유지보수

### 1. 로그 모니터링

```bash
# 실시간 로그 확인
docker-compose -f docker-compose.production.yml logs -f

# 특정 서비스 로그
docker-compose -f docker-compose.production.yml logs -f fastapi
docker-compose -f docker-compose.production.yml logs -f nginx

# 로그 파일 확인
docker exec dailycam-fastapi-prod tail -f /var/log/app.log
```

### 2. 리소스 모니터링

```bash
# 컨테이너 리소스 사용량
docker stats

# 디스크 사용량
df -h
docker system df

# 메모리 사용량
free -h
```

### 3. 백업

**MySQL 데이터베이스 백업:**

```bash
# 백업 스크립트 생성
cat > ~/backup_db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR=~/backups
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d_%H%M%S)
docker exec dailycam-mysql-prod mysqldump -u root -p${MYSQL_ROOT_PASSWORD} dailycam > $BACKUP_DIR/dailycam_$DATE.sql
# 오래된 백업 삭제 (30일 이상)
find $BACKUP_DIR -name "dailycam_*.sql" -mtime +30 -delete
EOF

chmod +x ~/backup_db.sh

# Cron으로 자동 백업 설정 (매일 새벽 2시)
crontab -e
# 다음 줄 추가:
# 0 2 * * * /home/ubuntu/backup_db.sh
```

**비디오 파일 백업:**

```bash
# S3 또는 다른 스토리지로 백업 (예시)
aws s3 sync ~/projects/dailycam/backend/videos s3://your-bucket/videos/
```

### 4. 업데이트 및 재배포

```bash
# 코드 업데이트
cd ~/projects/dailycam
git pull origin main  # 또는 배포 브랜치

# 재배포
./deploy.sh

# 또는 수동으로
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml build
docker-compose -f docker-compose.production.yml up -d
```

### 5. 자동 재시작 설정

Docker Compose의 `restart: unless-stopped` 설정으로 자동 재시작이 활성화되어 있습니다.

시스템 재부팅 시 자동 시작을 위해:

```bash
# Docker 서비스 자동 시작 확인
sudo systemctl enable docker

# (선택사항) 시스템 재부팅 시 자동으로 docker-compose 시작
cat > /etc/systemd/system/dailycam.service << 'EOF'
[Unit]
Description=DailyCam Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/ubuntu/projects/dailycam
ExecStart=/usr/local/bin/docker-compose -f docker-compose.production.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.production.yml down
User=ubuntu

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable dailycam.service
```

---

## 문제 해결

### 1. 컨테이너가 시작되지 않음

```bash
# 로그 확인
docker-compose -f docker-compose.production.yml logs

# 컨테이너 상태 확인
docker-compose -f docker-compose.production.yml ps

# 특정 컨테이너 로그
docker logs dailycam-fastapi-prod
```

### 2. 데이터베이스 연결 실패

```bash
# MySQL 컨테이너 상태 확인
docker exec dailycam-mysql-prod mysqladmin ping -h localhost -u root -p

# 연결 테스트
docker exec -it dailycam-mysql-prod mysql -u dailycam_user -p dailycam

# 환경 변수 확인
docker exec dailycam-fastapi-prod env | grep MYSQL
```

### 3. 포트 충돌

```bash
# 포트 사용 확인
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :8000

# 기존 프로세스 종료
sudo kill -9 [PID]
```

### 4. 디스크 공간 부족

```bash
# 사용하지 않는 Docker 리소스 정리
docker system prune -a --volumes

# 로그 파일 정리
docker-compose -f docker-compose.production.yml logs --no-log-prefix | head -n 1000 > /dev/null
```

### 5. API 응답 없음

```bash
# FastAPI 직접 접근 테스트
curl http://localhost:8000/

# Nginx 프록시 테스트
curl http://localhost/api/

# Nginx 설정 확인
docker exec dailycam-nginx-prod nginx -t
```

### 6. 프론트엔드 빌드 오류

```bash
# Node.js 버전 확인
node --version  # 18.x 이상 필요

# 캐시 정리 후 재빌드
cd frontend
rm -rf node_modules dist
npm ci
npm run build
```

---

## 향후 추가 예정 기능

### 자동 클립 하이라이트 생성

자동 클립 하이라이트 생성 기능이 추가되면:

1. `docker-compose.production.yml`에서 `clip-highlight-worker` 서비스 주석 해제
2. 필요한 환경 변수 추가
3. 재배포

```bash
# 워커 추가 후
docker-compose -f docker-compose.production.yml up -d clip-highlight-worker
```

---

## 보안 체크리스트

배포 전 다음 사항을 확인하세요:

- [ ] `.env.production` 파일이 `.gitignore`에 포함되어 있는지 확인
- [ ] 모든 비밀번호가 강력한지 확인 (최소 16자, 대소문자, 숫자, 특수문자 포함)
- [ ] `JWT_SECRET_KEY`가 안전하게 생성되었는지 확인
- [ ] MySQL 포트가 외부에 노출되지 않도록 설정 (127.0.0.1만 허용)
- [ ] FastAPI 포트가 외부에 노출되지 않도록 설정 (Nginx를 통해서만 접근)
- [ ] SSL/TLS 인증서가 올바르게 설정되었는지 확인
- [ ] 방화벽 규칙이 올바르게 설정되었는지 확인
- [ ] 정기적인 백업이 설정되었는지 확인

---

## 추가 리소스

- [AWS Lightsail 문서](https://docs.aws.amazon.com/lightsail/)
- [Docker Compose 문서](https://docs.docker.com/compose/)
- [Nginx 문서](https://nginx.org/en/docs/)
- [Let's Encrypt 문서](https://letsencrypt.org/docs/)

---

## 지원

문제가 발생하면 다음을 확인하세요:

1. 로그 파일: `docker-compose -f docker-compose.production.yml logs`
2. 컨테이너 상태: `docker-compose -f docker-compose.production.yml ps`
3. 시스템 리소스: `docker stats`, `df -h`, `free -h`

