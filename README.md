# 🍼 DailyCam - AI 기반 육아 모니터링 서비스

<div align="center">

![DailyCam Logo](https://img.shields.io/badge/DailyCam-AI%20Guardian-blue?style=for-the-badge)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
[![React](https://img.shields.io/badge/React-18.2-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Google AI](https://img.shields.io/badge/Google-Gemini%202.5%20Flash-4285F4?style=flat-square&logo=google)](https://ai.google.dev/)

**기존 홈캠을 활용한 스마트 육아 솔루션**

[데모 보기](#) · [문서](#) · [버그 신고](https://github.com/yourusername/dailycam/issues)

</div>

---

## 📋 목차

- [프로젝트 소개](#-프로젝트-소개)
- [주요 기능](#-주요-기능)
- [기술 스택](#-기술-스택)
- [시작하기](#-시작하기)
- [프로젝트 구조](#-프로젝트-구조)
- [사용 방법](#-사용-방법)
- [시장 분석](#-시장-분석)
- [로드맵](#-로드맵)
- [기여하기](#-기여하기)
- [라이선스](#-라이선스)

---

## 🎯 프로젝트 소개

**DailyCam**은 맞벌이 부부를 위한 AI 기반 육아 모니터링 서비스입니다. 이미 보유하고 있는 홈캠이나 펫캠을 활용하여 추가 비용 없이 아이의 발달 상태를 모니터링하고 전문적인 육아 리포트를 제공받을 수 있습니다.

### 💡 왜 DailyCam인가?

- **💰 비용 절감**: 별도의 고가 육아 전용 카메라 구매 불필요
- **🤖 정교한 AI 분석**: **Google Gemini 2.5 Flash (Multimodal)** 모델을 활용한 3단계 심층 추론 (메타데이터 → 맥락 → 정밀 분석)
- **📊 발달 리포트**: 아이의 월령(개월 수)에 맞춘 신체, 인지, 언어, 사회성, 정서 5대 발달 영역 정밀 추적
- **⏰ 실시간 모니터링**: 차세대 HLS 스트리밍 기술로 끊김 없는 실시간 영상 확인
- **🎯 맞춤형 케어**: AI가 분석한 데이터를 바탕으로 한 연령별/상황별 맞춤 활동 추천

---

## ✨ 주요 기능

### 1. 📹 고성능 실시간 모니터링
- **HLS (HTTP Live Streaming)** 기반의 안정적인 스트리밍
- 기존 RTSP 지원 홈캠/펫캠 완벽 호환
- FFmpeg 파이프라인 최적화를 통한 저지연 스트리밍
- 주요 순간(하이라이트) 자동 감지 및 추출

### 2. 🧠 차세대 AI 기반 발달 분석
- **Gemini 2.5 Flash** 멀티모달 모델 탑재
- **3단계 추론 파이프라인**:
  1. **영상 전처리 & 메타데이터 추출**: 영상 최적화 후 1차 메타데이터 확보
  2. **맥락 파악 (Context Awareness)**: 아이의 행동 패턴과 상황적 맥락 이해
  3. **발달 단계별 정밀 평가**: 개월 수(Age Months)에 따른 발달 과업 달성도 분석
- 월령별 발달 단계 자동 매칭 및 분석

### 3. 📈 전문적인 발달 리포트
- 5개 발달 영역(신체/인지/언어/사회성/정서) 레이더 차트 시각화
- 주간/월간 발달 추이 그래프 제공
- **안전 점수(Safety Score)** 시스템: 위험 행동 및 환경 요소 자동 탐지 및 점수화

### 4. 🔒 안전하고 편리한 시스템
- **OAuth 2.0 & JWT**: 구글 로그인 및 토큰 기반의 안전한 인증 시스템
- **자동화된 데이터 관리**: 오래된 영상 및 클립 자동 정리 스케줄러 내장
- 구독 결제 시스템 연동 (PortOne)

---

## 🛠 기술 스택

### Frontend
```
React 18.2          - UI 프레임워크
TypeScript 5.2      - 타입 안정성
Vite 5.0            - 초고속 빌드 도구
TailwindCSS 3.3     - 유틸리티 퍼스트 스타일링
Recharts 2.10       - 데이터 시각화 (차트)
Framer Motion       - 부드러운 UI 애니메이션
React Router 6.20   - SPA 라우팅
```

### Backend
```
FastAPI 0.110       - 고성능 비동기 웹 프레임워크
Python 3.11+        - 서버 사이드 언어
Google Gemini 2.5   - Multimodal AI (Flash 모델)
FFmpeg & OpenCV     - 고성능 영상 처리 및 HLS 스트리밍
SQLAlchemy 2.0      - ORM (데이터베이스 관리)
PyMySQL             - DB 드라이버
Pydantic 2.6        - 데이터 유효성 검사
```

### Infrastructure & DevOps
```
Docker & Compose    - 컨테이너화 및 배포
Nginx               - 리버스 프록시
AWS Lightsail       - 클라우드 호스팅
GitHub Actions      - CI/CD (예정)
```

---

## 🚀 시작하기

### 필수 요구사항

- **Node.js** 18.0 이상
- **Python** 3.11 이상
- **FFmpeg** (시스템 경로에 설치되어 있어야 함)
- **Google AI API Key** ([발급 방법](https://ai.google.dev/))

### 설치 방법

#### 1️⃣ 저장소 클론
```bash
git clone https://github.com/yourusername/dailycam.git
cd dailycam
```

#### 2️⃣ Backend 설정
```bash
cd backend

# 가상환경 생성 및 활성화
python -m venv venv
# Windows
.\venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

# 의존성 설치
pip install -r requirements.txt

# 환경 변수 설정
# .env 파일을 생성하고 필요한 키들을 입력하세요 (Google API Key, DB URL 등)
```

#### 3️⃣ Frontend 설정
```bash
cd frontend

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

#### 4️⃣ Docker로 실행 (권장)
```bash
# 프로젝트 루트에서
docker-compose up -d --build
```

---

## 🌐 프로덕션 배포

DailyCam은 **AWS Lightsail** 환경에 최적화되어 있습니다.

1. **빠른 시작**: [QUICK_START_DEPLOYMENT.md](QUICK_START_DEPLOYMENT.md) 참고
2. **상세 가이드**: [docs/DEPLOYMENT_LIGHTSAIL.md](docs/DEPLOYMENT_LIGHTSAIL.md) 참고
3. **배포 체크리스트**: [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) 확인

배포 스크립트를 사용하여 간편하게 배포할 수 있습니다:
```bash
./deploy.sh
```

---

## 📁 프로젝트 구조

```
dailycam/
├── 📂 frontend/              # React 프론트엔드
├── 📂 backend/               # FastAPI 백엔드
│   ├── app/
│   │   ├── api/             # API 라우터 (Auth, Streaming, Analysis 등)
│   │   ├── services/        # 비즈니스 로직 (Gemini, HLS Generator 등)
│   │   ├── models/          # DB 모델
│   │   └── ...
│   └── ...
├── 📂 docs/                  # 프로젝트 및 배포 문서
├── 📂 nginx/                 # Nginx 설정
└── README.md                # 이 파일
```

---

## � 사용 방법

### 1. 카메라 연동 및 설정
1. 대시보드에서 "카메라 추가" 클릭
2. 보유한 홈캠/펫캠의 RTSP 주소 입력
3. 연결 테스트 (HLS 스트림 생성 확인) 및 저장

### 2. 실시간 모니터링 & 분석
1. "실시간 모니터링" 페이지로 이동
2. 연결된 카메라의 실시간 영상 확인 (저지연 HLS)
3. **Smart Alert**: 아이의 위험 행동 감지 시 알림 수신

### 3. 발달 리포트 확인
1. "발달 리포트" 페이지에서 일간/주간 분석 결과 확인
2. 5대 발달 영역(신체, 인지, 언어, 사회성, 정서) 점수 및 추이 확인
3. AI가 추천하는 아이 맞춤형 활동 및 육아 팁 확인

---

## 📊 시장 분석

### 타겟 시장
- **규모**: 약 25,000 가구 (맞벌이 부부 + 홈캠 보유, 초기 타겟)
- **성장률**: 연 10-12% (홈캠 보급률 및 AI 육아 서비스 수요 증가)
- **주요 고객**: 0-3세 자녀를 둔 맞벌이 부부, 육아 도움이 필요한 초보는 부모

### 경쟁 우위
- ✅ **Cost Efficiency**: 기존 카메라 활용으로 **수십만원 대 전용 장비 구매 불필요**
- ✅ **Advanced AI**: Gemini 2.5 기반의 **전문가 수준 발달 분석** (단순 움직임 감지 아님)
- ✅ **Accessibility**: **낮은 진입 장벽** (앱 설치 및 카메라 주소 입력만으로 시작)
- ✅ **Work-Life Balance**: **맞벌이 특화** 기능 (근무 중 안심 모니터링, 요약 리포트)

자세한 시장 분석은 [docs/market_definition.md](docs/market_definition.md)를 참조하세요.

---

## �🗺 로드맵

### ✅ Phase 1 - MVP (완료)
- [x] 기본 영상 업로드 및 재생
- [x] Google Gemini AI 기반 분석 시스템
- [x] 3단계 발달 추론 엔진 (Gemini 2.5 Flash 적용)
- [x] 발달 리포트 대시보드 및 시각화

### ✅ Phase 2 - 고도화 (완료/진행중)
- [x] **실시간 스트리밍 (HLS) 및 파이프라인 구축**
- [x] **사용자 인증 시스템 (JWT, OAuth)**
- [x] 다중 카메라 지원 구조
- [x] 자동 데이터 정리 스케줄러

### 🚀 Phase 3 - 배포 및 상용화 (예정)
- [ ] **AWS Lightsail 프로덕션 배포** 및 HTTPS 보안 적용
- [ ] **실시간 알림 고도화** (FCM/Web Push: 위험 감지 시 즉각 알림)
- [ ] **결제 시스템 연동** (PG사 연동 및 구독 모델 구현)
- [ ] 모바일 환경 최적화 (PWA 지원)

---

## 🤝 기여하기

DailyCam 프로젝트에 기여해주셔서 감사합니다! 

### 기여 방법
1. 이 저장소를 Fork 합니다
2. Feature 브랜치를 생성합니다 (`git checkout -b feature/AmazingFeature`)
3. 변경사항을 커밋합니다 (`git commit -m 'Add some AmazingFeature'`)
4. 브랜치에 Push 합니다 (`git push origin feature/AmazingFeature`)
5. Pull Request를 생성합니다

### 코드 스타일
- Frontend: ESLint + Prettier
- Backend: Black + isort
- Commit: Conventional Commits

---

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

---

## 📞 문의

프로젝트에 대한 질문이나 제안사항이 있으시면 언제든지 연락주세요!

- **Email**: contact@dailycam.ai (예시)
- **Issues**: [GitHub Issues](https://github.com/yourusername/dailycam/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/dailycam/discussions)

---

<div align="center">

**Made with ❤️ for working parents**

⭐ 이 프로젝트가 도움이 되셨다면 Star를 눌러주세요!

</div>
