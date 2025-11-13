# Daily-cam 아이 곁에 🏠👶

> AI 기반 영유아 안전 모니터링 서비스

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18.2-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue.svg)](https://www.typescriptlang.org/)

## 📖 프로젝트 소개

**Daily-cam 아이 곁에**는 기존 홈캠을 AI 안전 모니터링 시스템으로 업그레이드하는 혁신적인 구독형 서비스입니다.

### 🎯 핵심 가치
- 💰 **비용 효율**: 새 AI 홈캠 구매 불필요, 기존 홈캠 활용
- 🤖 **AI 분석**: OpenAI GPT-4 Vision 기반 실시간 위험 감지
- 📊 **데이터 기반**: 히트맵과 트렌드 분석으로 패턴 발견
- 🔔 **즉시 알림**: 위험 상황 실시간 푸시 알림
- 📱 **언제 어디서나**: 회사에서도 아이 안전 확인

## 📁 프로젝트 구조

```
ai_x_daily_cam/
├── frontend/              # React 프론트엔드
│   ├── src/
│   │   ├── components/   # 재사용 컴포넌트
│   │   ├── pages/        # 페이지 컴포넌트
│   │   ├── lib/          # 라이브러리
│   │   ├── utils/        # 유틸리티
│   │   └── types/        # TypeScript 타입
│   ├── public/
│   └── package.json
├── backend/              # 백엔드 (예정)
├── docs/                 # 프로젝트 문서
│   ├── CHARTS_GUIDE.md
│   ├── DEVELOPMENT.md
│   ├── FEATURES.md
│   ├── USER_SCENARIOS.md
│   └── VIDEO_HIGHLIGHTS_GUIDE.md
└── README.md
```

## 🚀 빠른 시작

### 프론트엔드 개발

```bash
# 프론트엔드 디렉토리로 이동
cd frontend

# 패키지 설치
npm install

# 환경 변수 설정
# .env 파일 생성 후 아래 내용 추가
# VITE_OPENAI_API_KEY=your_openai_api_key_here

# 개발 서버 실행
npm run dev

# 빌드
npm run build
```

브라우저에서 `http://localhost:5173` 접속

## ✨ 주요 기능

### 1️⃣ 홈캠 연동
- 기존 IP 카메라 RTSP 연결
- 세이프존(안전 구역) 설정
- 데드존(위험 구역) 설정
- 다중 카메라 지원

### 2️⃣ 실시간 모니터링
- AI 기반 행동 패턴 분석
- 위험 상황 즉시 감지
- 실시간 영상 스트리밍
- 활동 타임라인

### 3️⃣ 일일 리포트
- AI 한줄평 (GPT-4 생성)
- 위험도 우선순위 분석
- 즉시 실행 리스트
- PDF 다운로드/공유

### 4️⃣ 데이터 분석
- 안전도 트렌드 차트
- 공간별 활동 히트맵
- 시간대별 위험 분석
- 주간/월간 통계

## 🛠 기술 스택

### Frontend
- **React 18** - UI 라이브러리
- **TypeScript** - 타입 안정성
- **Vite** - 빌드 도구
- **TailwindCSS** - 스타일링
- **React Router** - 라우팅
- **Lucide React** - 아이콘
- **Recharts** - 데이터 시각화

### AI & Analytics
- **Gemini 2.5 Flash** - 비디오 분석 및 리포트 생성
- **Google Generative AI** - AI 모델 통합

### Backend
- **FastAPI** - Python 웹 프레임워크
- **Gemini API** - 비디오 분석 및 리포트 생성
- **Pydantic** - 데이터 검증
- **SQLAlchemy** - ORM (데이터베이스 연동)
- **MariaDB/MySQL** - 데이터베이스
- **Transformers** - Bert 모델 (이벤트 분류)
- **MoviePy** - 하이라이트 영상 생성

## 📚 문서

- [개발 가이드](./DEVELOPMENT.md) - 상세 개발 문서
- [기능 명세서](./FEATURES.md) - 전체 기능 설명
- [사용 시나리오](./USER_SCENARIOS.md) - 실제 사용 예시
- [차트 가이드](./CHARTS_GUIDE.md) - 차트 컴포넌트 사용법
- [비디오 하이라이트 가이드](./VIDEO_HIGHLIGHTS_GUIDE.md) - 비디오 기능 가이드
- [데이터베이스 연동 가이드](./backend/DATABASE_INTEGRATION.md) - 데이터베이스 설정 및 연동 방법

## 🗺 로드맵

### ✅ Phase 1: MVP UI/UX (완료)
- [x] 프로젝트 초기화
- [x] 레이아웃 및 네비게이션
- [x] 6개 주요 페이지 UI
- [x] 반응형 디자인
- [x] 프론트엔드 폴더 구조 분리

### ✅ Phase 2: 백엔드 통합 (진행 중)
- [x] REST API 개발 (FastAPI)
- [x] Gemini 2.5 Flash 비디오 분석 통합
- [x] 일일 리포트 자동 생성
- [x] 데이터베이스 설계 및 연동 (MariaDB/MySQL)
- [x] Bert 모델 통합 (이벤트 분류)
- [x] MoviePy 하이라이트 영상 생성
- [ ] 사용자 인증
- [ ] 카메라 스트림 통합

### 🚧 Phase 3: AI 기능 (진행 중)
- [x] Gemini 비디오 분석 API 통합
- [x] 비디오 분석 결과 기반 리포트 생성
- [x] 프롬프트 분리 및 관리
- [ ] 실시간 위험 감지
- [ ] 행동 패턴 학습

### 📅 Phase 4: 고급 기능 (예정)
- [ ] 모바일 앱
- [ ] 푸시 알림
- [ ] 비디오 녹화
- [ ] 커뮤니티 기능

## 🤝 기여하기

기여는 언제나 환영합니다! 다음 단계를 따라주세요:

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.

## 📞 연락처

- 이메일: contact@dailycam.kr
- 웹사이트: https://dailycam.kr
- 고객지원: support@dailycam.kr

## 🙏 감사의 말

- [OpenAI](https://openai.com/) - GPT-4 및 Vision API
- [Vite](https://vitejs.dev/) - 빠른 빌드 도구
- [TailwindCSS](https://tailwindcss.com/) - 유틸리티 CSS
- [Lucide](https://lucide.dev/) - 아름다운 아이콘

## 📝 최근 변경 사항 (2024-11)

### 비디오 분석 및 리포트 통합 기능 추가

#### 프론트엔드 변경사항
- **DailyReport.tsx**: 모든 더미 데이터 제거, 실제 분석 결과 표시로 변경
- **CameraSetup.tsx**: 분석 결과 표시 섹션 제거, 분석 완료 후 "분석 결과 보러가기" 버튼 추가
- **api.ts**: 리포트 생성 API 함수 추가 (`generateDailyReportFromAnalysis`)

#### 백엔드 변경사항
- **프롬프트 파일 분리**: 
  - `backend/app/prompts/video_analysis_prompt.txt`: 비디오 분석용 프롬프트
  - `backend/app/prompts/daily_report_analysis_prompt.txt`: 리포트 생성용 프롬프트
- **gemini_service.py**: 
  - 프롬프트 파일 로드 기능 추가 (`_load_prompt`)
  - 리포트용 분석 메서드 추가 (`analyze_for_daily_report`)
  - 기존 `analyze_video` 메서드는 유지 (하위 호환성)
- **daily_report/service.py**: 
  - Gemini 서비스 통합
  - `generate_from_analysis` 메서드 추가
- **daily_report/router.py**: 
  - `/api/daily-report/from-analysis` 엔드포인트 추가

#### 데이터 흐름
1. 사용자가 비디오 업로드 → `POST /api/homecam/analyze-video`
2. 분석 완료 → 결과를 로컬 스토리지에 저장
3. "분석 결과 보러가기" 버튼 클릭 → DailyReport 페이지로 이동
4. DailyReport에서 저장된 분석 결과 로드 및 표시

#### 주의사항
- 기존 Gemini 호출 코드는 최대한 수정하지 않고 추가하는 방식으로 구현
- 프롬프트는 별도 파일로 분리하여 관리 용이성 향상
- 로컬 스토리지를 사용하여 분석 결과 임시 저장 (향후 데이터베이스로 전환 예정)

---

Made with ❤️ for safer childcare
