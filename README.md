# 🍼 DailyCam - AI 기반 육아 모니터링 서비스

<div align="center">

![DailyCam Logo](https://img.shields.io/badge/DailyCam-AI%20Guardian-blue?style=for-the-badge)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
[![React](https://img.shields.io/badge/React-18.2-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Google AI](https://img.shields.io/badge/Google-Gemini%20AI-4285F4?style=flat-square&logo=google)](https://ai.google.dev/)

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
- **🤖 AI 분석**: Google Gemini AI를 활용한 정교한 영상 분석
- **📊 발달 리포트**: 아이의 신체, 인지, 언어, 사회성, 정서 발달 추적
- **⏰ 실시간 모니터링**: 근무 중에도 아이 상태 확인 가능
- **🎯 맞춤형 추천**: AI 기반 발달 단계별 활동 추천

---

## ✨ 주요 기능

### 1. 📹 실시간 모니터링
- 기존 홈캠/펫캠 연동
- 영상 업로드 및 실시간 스트리밍
- 주요 순간 하이라이트 자동 추출

### 2. 🧠 AI 기반 발달 분석
- **3단계 분석 프로세스**:
  1. 영상 내용 상세 분석
  2. 발달 영역별 평가 (신체, 인지, 언어, 사회성, 정서)
  3. 맞춤형 활동 추천

### 3. 📈 발달 리포트
- 레이더 차트를 통한 5개 발달 영역 시각화
- 월령별 발달 점수 추이 그래프
- 전문가 수준의 육아 인사이트 제공

### 4. 🎨 직관적인 대시보드
- 모던하고 반응형 UI/UX
- 다크 모드 지원
- 모바일 최적화

---

## 🛠 기술 스택

### Frontend
```
React 18.2          - UI 프레임워크
TypeScript 5.2      - 타입 안정성
Vite 5.0           - 빌드 도구
TailwindCSS 3.3    - 스타일링
Recharts 2.10      - 데이터 시각화
Framer Motion      - 애니메이션
React Router 6.20  - 라우팅
```

### Backend
```
FastAPI 0.110      - 웹 프레임워크
Python 3.11+       - 프로그래밍 언어
Google Gemini AI   - AI 영상 분석
SQLAlchemy 2.0     - ORM
PyMySQL            - 데이터베이스 드라이버
OpenCV 4.8         - 영상 처리
Pydantic 2.6       - 데이터 검증
```

### AI & ML
```
Google Generative AI 0.5  - Gemini Pro Vision
OpenAI API                - GPT 통합 (선택)
```

---

## 🚀 시작하기

### 필수 요구사항

- **Node.js** 18.0 이상
- **Python** 3.11 이상
- **npm** 또는 **yarn**
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
.\venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux

# 의존성 설치
pip install -r requirements.txt

# 환경 변수 설정
# .env 파일을 생성하고 다음 내용 추가:
# GOOGLE_API_KEY=your_google_api_key_here
# DATABASE_URL=mysql+pymysql://user:password@localhost/dailycam

# 서버 실행
python run.py
# 또는
.\start.bat  # Windows
```

#### 3️⃣ Frontend 설정
```bash
cd frontend

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

#### 4️⃣ 접속
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API 문서**: http://localhost:8000/docs

---

## 📁 프로젝트 구조

```
dailycam/
├── 📂 frontend/              # React 프론트엔드
│   ├── src/
│   │   ├── components/      # 재사용 가능한 컴포넌트
│   │   ├── pages/          # 페이지 컴포넌트
│   │   ├── lib/            # 유틸리티 및 API 클라이언트
│   │   └── App.tsx         # 메인 앱 컴포넌트
│   ├── package.json
│   └── vite.config.ts
│
├── 📂 backend/              # FastAPI 백엔드
│   ├── app/
│   │   ├── api/            # API 라우터
│   │   ├── core/           # 핵심 설정
│   │   ├── models/         # 데이터 모델
│   │   ├── prompts/        # AI 프롬프트 템플릿
│   │   └── services/       # 비즈니스 로직
│   ├── requirements.txt
│   ├── run.py
│   └── start.bat
│
├── 📂 docs/                 # 프로젝트 문서
│   ├── market_definition.md
│   ├── OPTIMIZATION_SUMMARY.md
│   └── troubleshooting/
│
└── README.md               # 이 파일
```

---

## 📱 사용 방법

### 1. 카메라 연동
1. 대시보드에서 "카메라 추가" 클릭
2. 홈캠/펫캠 정보 입력
3. 연결 테스트 및 저장

### 2. 영상 업로드
1. "모니터링" 페이지로 이동
2. 영상 파일 업로드 또는 실시간 스트림 연결
3. AI 분석 시작

### 3. 발달 리포트 확인
1. "발달 리포트" 페이지에서 분석 결과 확인
2. 5개 영역별 점수 및 추이 확인
3. AI 추천 활동 검토

---

## 📊 시장 분석

### 타겟 시장
- **규모**: 약 25,000 가구 (맞벌이 부부 + 홈캠 보유)
- **성장률**: 연 10-12% (홈캠 보급률 증가)
- **주요 고객**: 0-3세 자녀를 둔 맞벌이 부부

### 경쟁 우위
- ✅ 기존 카메라 활용으로 **2중 지출 방지**
- ✅ AI 기반 **전문적인 발달 분석**
- ✅ **낮은 진입 장벽** (별도 장비 불필요)
- ✅ **맞벌이 특화** 기능

자세한 시장 분석은 [docs/market_definition.md](docs/market_definition.md)를 참조하세요.

---

## 🗺 로드맵

### ✅ Phase 1 - MVP (완료)
- [x] 기본 영상 업로드 기능
- [x] Google Gemini AI 연동
- [x] 3단계 발달 분석 시스템
- [x] 발달 리포트 대시보드

### 🚧 Phase 2 - 현재 진행 중
- [ ] 실시간 스트리밍 지원
- [ ] 사용자 인증 시스템
- [ ] 다중 카메라 지원
- [ ] 모바일 앱 개발

### 🔮 Phase 3 - 계획 중
- [ ] 육아 전문가 상담 연결
- [ ] 커뮤니티 기능
- [ ] 성장 기록 공유
- [ ] 프리미엄 구독 모델

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

- **Email**: your.email@example.com
- **Issues**: [GitHub Issues](https://github.com/yourusername/dailycam/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/dailycam/discussions)

---

<div align="center">

**Made with ❤️ for working parents**

⭐ 이 프로젝트가 도움이 되셨다면 Star를 눌러주세요!

</div>
