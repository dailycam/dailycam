# Frontend - Daily-cam 아이 곁에

React + TypeScript + Vite 기반의 프론트엔드 애플리케이션입니다.

## 🚀 시작하기

### 패키지 설치

```bash
npm install
```

### 환경 변수 설정

`.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
VITE_OPENAI_API_KEY=your_openai_api_key_here
VITE_API_BASE_URL=http://localhost:3000/api
```

### 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:5173` 접속

### 빌드

```bash
npm run build
```

### 프리뷰

```bash
npm run preview
```

## 📁 프로젝트 구조

```
frontend/
├── src/
│   ├── components/          # 재사용 컴포넌트
│   │   ├── Layout/         # 레이아웃 컴포넌트
│   │   ├── Charts/         # 차트 컴포넌트
│   │   └── VideoHighlights/ # 비디오 하이라이트
│   ├── pages/              # 페이지 컴포넌트
│   │   ├── Dashboard.tsx   # 대시보드
│   │   ├── CameraSetup.tsx # 카메라 설정
│   │   ├── LiveMonitoring.tsx # 실시간 모니터링
│   │   ├── DailyReport.tsx # 일일 리포트
│   │   ├── Analytics.tsx   # 분석
│   │   └── Settings.tsx    # 설정
│   ├── lib/                # 라이브러리
│   │   └── openai.ts       # OpenAI 통합
│   ├── utils/              # 유틸리티
│   │   └── mockData.ts     # 목 데이터
│   ├── types/              # TypeScript 타입
│   │   └── index.ts
│   ├── App.tsx             # 메인 앱
│   ├── main.tsx            # 진입점
│   └── index.css           # 글로벌 스타일
├── public/                 # 정적 파일
├── index.html              # HTML 템플릿
├── vite.config.ts          # Vite 설정
├── tailwind.config.js      # Tailwind 설정
├── tsconfig.json           # TypeScript 설정
└── package.json            # 패키지 정보
```

## 🛠 기술 스택

- **React 18** - UI 라이브러리
- **TypeScript** - 타입 안정성
- **Vite** - 빌드 도구 및 개발 서버
- **TailwindCSS** - 유틸리티 우선 CSS 프레임워크
- **React Router** - 클라이언트 사이드 라우팅
- **Recharts** - 데이터 시각화
- **Lucide React** - 아이콘
- **OpenAI API** - AI 기능
- **date-fns** - 날짜 포맷팅

## 📄 주요 페이지

### Dashboard (대시보드)
- 오늘의 안전도 요약
- AI 한줄평
- 주요 지표 (위험 감지, 활동 시간, 카메라 상태)
- 실시간 알림

### Live Monitoring (실시간 모니터링)
- 멀티 카메라 뷰
- AI 실시간 분석
- 활동 타임라인
- 즉시 알림

### Daily Report (일일 리포트)
- AI 생성 요약
- 위험 사건 목록
- 비디오 하이라이트
- PDF 다운로드

### Analytics (분석)
- 안전도 트렌드
- 시간대별 히트맵
- 활동 패턴 분석
- 주간/월간 통계

### Camera Setup (카메라 설정)
- 카메라 추가/편집
- 세이프존/데드존 설정
- 연결 테스트

### Settings (설정)
- 프로필 관리
- 알림 설정
- 구독 관리
- 보안 설정

## 🔧 개발

### 코드 스타일

이 프로젝트는 ESLint를 사용합니다:

```bash
npm run lint
```

### 타입 체크

```bash
npm run build
```

빌드 시 TypeScript 타입 체크가 자동으로 수행됩니다.

## 📚 참고 문서

프로젝트 루트의 `docs/` 폴더에서 더 많은 문서를 확인하세요:

- [개발 가이드](../docs/DEVELOPMENT.md)
- [기능 명세서](../docs/FEATURES.md)
- [차트 가이드](../docs/CHARTS_GUIDE.md)
- [비디오 하이라이트 가이드](../docs/VIDEO_HIGHLIGHTS_GUIDE.md)

