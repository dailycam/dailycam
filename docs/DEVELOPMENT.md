# Daily-cam 아이 곁에 - 개발 가이드

## 📋 프로젝트 구조

```
ai_x_daily_cam/
├── src/
│   ├── components/          # 재사용 가능한 컴포넌트
│   │   └── Layout/         # 레이아웃 컴포넌트
│   │       ├── Layout.tsx
│   │       ├── Sidebar.tsx
│   │       └── Header.tsx
│   ├── pages/              # 페이지 컴포넌트
│   │   ├── Dashboard.tsx
│   │   ├── CameraSetup.tsx
│   │   ├── LiveMonitoring.tsx
│   │   ├── DailyReport.tsx
│   │   ├── Analytics.tsx
│   │   └── Settings.tsx
│   ├── lib/                # 라이브러리 및 유틸리티
│   │   └── openai.ts       # OpenAI API 통합
│   ├── utils/              # 헬퍼 함수
│   │   └── mockData.ts     # 개발용 Mock 데이터
│   ├── types/              # TypeScript 타입 정의
│   │   └── index.ts
│   ├── App.tsx             # 메인 앱 컴포넌트
│   ├── main.tsx            # 진입점
│   └── index.css           # 글로벌 스타일
├── public/                 # 정적 파일
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## 🎨 주요 페이지 설명

### 1. Dashboard (대시보드)
- **경로**: `/dashboard`
- **기능**:
  - 오늘의 안전도 요약
  - AI 한줄평
  - 카메라 상태 확인
  - 위험도 우선순위
  - 즉시 실행 리스트
  - 빠른 액션 버튼

### 2. Camera Setup (홈캠 연동)
- **경로**: `/camera-setup`
- **기능**:
  - 카메라 추가/삭제
  - 세이프존 설정 (안전 구역)
  - 데드존 설정 (위험 구역)
  - 실시간 카메라 피드 미리보기
  - 구역 그리기 인터페이스

### 3. Live Monitoring (실시간 모니터링)
- **경로**: `/live-monitoring`
- **기능**:
  - 실시간 카메라 스트림
  - AI 실시간 분석
  - 위험 감지 알림
  - 활동 타임라인
  - 멀티 카메라 뷰

### 4. Daily Report (일일 리포트)
- **경로**: `/daily-report`
- **기능**:
  - AI 한줄평
  - 위험도 분석
  - 시간대별 활동
  - 즉시 실행 리스트
  - 리포트 다운로드/공유

### 5. Analytics (데이터 분석)
- **경로**: `/analytics`
- **기능**:
  - 장기 트렌드 분석
  - 공간 히트맵
  - 시간대별 히트맵
  - 주간 활동 패턴
  - 데이터 내보내기

### 6. Settings (설정)
- **경로**: `/settings`
- **기능**:
  - 프로필 관리
  - 알림 설정
  - 보안 설정
  - 구독 관리

## 🔧 개발 환경 설정

### 1. 환경 변수 설정
`.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
VITE_OPENAI_API_KEY=your_openai_api_key_here
VITE_API_BASE_URL=http://localhost:3000/api
```

### 2. 개발 서버 실행
```bash
npm install
npm run dev
```

서버가 실행되면 `http://localhost:5173`에서 확인할 수 있습니다.

## 🎯 다음 단계 구현 사항

### Phase 1: 백엔드 통합
- [ ] REST API 엔드포인트 연결
- [ ] 실제 카메라 스트림 통합 (WebRTC/HLS)
- [ ] 사용자 인증 시스템
- [ ] 데이터베이스 연동

### Phase 2: AI 기능 강화
- [ ] OpenAI Vision API 실시간 분석
- [ ] 행동 패턴 학습
- [ ] 커스텀 위험 감지 모델
- [ ] 음성 알림 기능

### Phase 3: 고급 기능
- [ ] 모바일 앱 (React Native)
- [ ] 푸시 알림 시스템
- [ ] 비디오 녹화 및 재생
- [ ] 다중 사용자 지원
- [ ] 가족 공유 기능

### Phase 4: 데이터 시각화
- [ ] Recharts 차트 구현
- [ ] 실제 히트맵 시각화
- [ ] 3D 공간 분석
- [ ] 인터랙티브 대시보드

## 🎨 디자인 시스템

### 색상 팔레트
- **Primary**: Blue (#0ea5e9)
- **Safe**: Green (#22c55e)
- **Danger**: Red (#ef4444)
- **Warning**: Orange (#f59e0b)

### 컴포넌트 클래스
- `.btn-primary`: 주요 버튼
- `.btn-secondary`: 보조 버튼
- `.card`: 카드 컨테이너
- `.input-field`: 입력 필드

## 📚 OpenAI Cookbook 활용

### 참고할 예제들
1. **Vision API**: 이미지 분석 및 안전 감지
2. **Streaming**: 실시간 AI 응답
3. **Function Calling**: 구조화된 데이터 추출
4. **Embeddings**: 패턴 인식 및 검색

### 구현 예시
```typescript
// src/lib/openai.ts 참고
import { analyzeVideoFrame, generateDailySummary } from './lib/openai'

// 비디오 프레임 분석
const analysis = await analyzeVideoFrame(imageBase64)

// 일일 요약 생성
const summary = await generateDailySummary(incidents)
```

## 🔒 보안 고려사항

1. **API 키 관리**: 프로덕션에서는 절대 클라이언트에 노출하지 마세요
2. **백엔드 프록시**: 모든 OpenAI API 호출은 백엔드를 통해 수행
3. **카메라 스트림 암호화**: HTTPS/WSS 사용
4. **사용자 인증**: JWT 또는 OAuth 구현
5. **데이터 암호화**: 민감한 영유아 데이터 보호

## 🚀 배포

### Vercel 배포
```bash
npm run build
vercel --prod
```

### 환경 변수 설정
Vercel 대시보드에서 환경 변수를 설정하세요.

## 📝 라이선스
MIT License

