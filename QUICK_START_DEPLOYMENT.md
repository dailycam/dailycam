# ⚡ 빠른 배포 가이드

AWS Lightsail에 DailyCam을 빠르게 배포하는 방법입니다.

## 🎯 5분 안에 배포하기

### 1단계: Lightsail 인스턴스 생성 (2분)

```bash
# AWS Lightsail 콘솔에서:
# 1. "인스턴스 생성" 클릭
# 2. Ubuntu 22.04 LTS 선택
# 3. $40/월 플랜 선택 (4GB RAM, 2 vCPU)
# 4. 인스턴스 이름: dailycam-production
# 5. 생성 완료 대기
```

### 2단계: 서버 접속 및 초기 설정 (1분)

```bash
# SSH 접속
ssh -i [key-file].pem ubuntu@[인스턴스-IP]

# 한 번에 설치
curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
sudo usermod -aG docker $USER
newgrp docker
```

### 3단계: 프로젝트 업로드 (1분)

```bash
# 방법 1: Git 사용
git clone [your-repo-url] ~/dailycam
cd ~/dailycam

# 방법 2: SCP 사용 (로컬에서)
# scp -i [key-file].pem -r ./dailycam ubuntu@[인스턴스-IP]:~/
```

### 4단계: 환경 변수 설정 (30초)

```bash
# 템플릿 복사
cp env.production.template .env.production

# 환경 변수 편집
nano .env.production
# 또는
vi .env.production

# 최소 필수 항목:
# - MYSQL_ROOT_PASSWORD
# - MYSQL_PASSWORD  
# - GEMINI_API_KEY
# - JWT_SECRET_KEY (openssl rand -hex 32로 생성)
# - VITE_API_BASE_URL (http://[인스턴스-IP] 또는 도메인)
```

### 5단계: 배포 실행 (30초)

```bash
# 배포 스크립트 실행
chmod +x deploy.sh
./deploy.sh

# 또는 수동으로
cd frontend && npm install && npm run build && cd ..
docker-compose -f docker-compose.production.yml up -d --build
```

### 6단계: 확인 (30초)

```bash
# 서비스 상태 확인
docker-compose -f docker-compose.production.yml ps

# 접속 테스트
curl http://localhost/
curl http://localhost/api/

# 브라우저에서 접속
# http://[인스턴스-IP]/
```

## ✅ 완료!

이제 `http://[인스턴스-IP]/`에서 애플리케이션에 접속할 수 있습니다.

## 🔧 다음 단계

1. **도메인 연결**: `docs/DEPLOYMENT_LIGHTSAIL.md` 참고
2. **SSL 설정**: Let's Encrypt로 HTTPS 설정
3. **백업 설정**: 자동 백업 스크립트 설정
4. **모니터링**: 로그 및 리소스 모니터링 설정

## 🆘 문제 발생 시

```bash
# 로그 확인
docker-compose -f docker-compose.production.yml logs -f

# 컨테이너 재시작
docker-compose -f docker-compose.production.yml restart

# 완전 재시작
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d --build
```

자세한 내용은 `docs/DEPLOYMENT_LIGHTSAIL.md`를 참고하세요.

