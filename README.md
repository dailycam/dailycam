# Daily-cam 아이 곁에 🏠👶

> AI 기반 영유아 안전 모니터링 서비스

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18.2-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF.svg)](https://vitejs.dev/)

## 📖 프로젝트 소개

**Daily-cam 아이 곁에**는 기존 홈캠을 AI 안전 모니터링 시스템으로 업그레이드하는 혁신적인 구독형 서비스입니다.

### 🎯 핵심 가치
- 💰 **비용 효율**: 새 AI 홈캠 구매 불필요, 기존 홈캠 활용
- 🤖 **AI 분석**: OpenAI GPT-4 Vision 기반 실시간 위험 감지
- 📊 **데이터 기반**: 히트맵과 트렌드 분석으로 패턴 발견
- 🔔 **즉시 알림**: 위험 상황 실시간 푸시 알림
- 📱 **언제 어디서나**: 회사에서도 아이 안전 확인

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

### 5️⃣ 맞춤 설정
- 알림 민감도 조정
- 프로필 관리
- 구독 플랜 관리
- 보안 설정

## 🎨 UI/UX 미리보기

### 대시보드
- 오늘의 안전도 한눈에 확인
- AI 한줄평 및 주요 지표
- 카메라 상태 모니터링
- 빠른 액션 버튼

### 실시간 모니터링
- 멀티 카메라 뷰
- AI 실시간 분석 오버레이
- 위험 알림 피드
- 양방향 통신 (예정)

## 🛠 기술 스택

### Frontend
- **React 18** - UI 라이브러리
- **TypeScript** - 타입 안정성
- **Vite** - 빌드 도구
- **TailwindCSS** - 스타일링
- **React Router** - 라우팅
- **Lucide React** - 아이콘

### AI & Analytics
- **OpenAI GPT-4** - 텍스트 분석 및 요약
- **GPT-4 Vision** - 이미지/비디오 분석
- **Recharts** - 데이터 시각화 (예정)

### Backend (예정)
- Node.js + Express
- PostgreSQL
- Redis (캐싱)
- WebRTC (실시간 스트리밍)

## 🚀 시작하기

### 1. 저장소 클론
```bash
git clone https://github.com/yourusername/ai_x_daily_cam.git
cd ai_x_daily_cam
```

### 2. 패키지 설치
```bash
npm install
```

### 3. 환경 변수 설정
`.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
VITE_OPENAI_API_KEY=your_openai_api_key_here
VITE_API_BASE_URL=http://localhost:3000/api
```

### 4. 개발 서버 실행
```bash
npm run dev
```

브라우저에서 `http://localhost:5173` 접속

### 5. 빌드
```bash
npm run build
```

## 📁 프로젝트 구조

```
ai_x_daily_cam/
├── src/
│   ├── components/          # 재사용 컴포넌트
│   │   └── Layout/         # 레이아웃
│   ├── pages/              # 페이지 컴포넌트
│   │   ├── Dashboard.tsx
│   │   ├── CameraSetup.tsx
│   │   ├── LiveMonitoring.tsx
│   │   ├── DailyReport.tsx
│   │   ├── Analytics.tsx
│   │   └── Settings.tsx
│   ├── lib/                # 라이브러리
│   │   └── openai.ts       # OpenAI 통합
│   ├── utils/              # 유틸리티
│   │   └── mockData.ts
│   ├── types/              # TypeScript 타입
│   └── App.tsx
├── public/
├── DEVELOPMENT.md          # 개발 가이드
├── FEATURES.md            # 기능 명세
├── USER_SCENARIOS.md      # 사용 시나리오
└── README.md
```

## 📚 문서

- [개발 가이드](./DEVELOPMENT.md) - 상세 개발 문서
- [기능 명세서](./FEATURES.md) - 전체 기능 설명
- [사용 시나리오](./USER_SCENARIOS.md) - 실제 사용 예시

## 🗺 로드맵

### ✅ Phase 1: MVP UI/UX (완료)
- [x] 프로젝트 초기화
- [x] 레이아웃 및 네비게이션
- [x] 6개 주요 페이지 UI
- [x] 반응형 디자인
- [x] TailwindCSS 스타일링

### 🚧 Phase 2: 백엔드 통합 (진행 중)
- [ ] REST API 개발
- [ ] 사용자 인증
- [ ] 카메라 스트림 통합
- [ ] 데이터베이스 설계

### 📅 Phase 3: AI 기능 (예정)
- [ ] OpenAI Vision API 통합
- [ ] 실시간 위험 감지
- [ ] 일일 리포트 자동 생성
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

---

Made with ❤️ for safer childcare
