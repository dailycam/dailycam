# Daily-cam 프론트엔드 구조

## 📂 폴더 구조

```
frontend/src/
├── components/          # 재사용 가능한 컴포넌트
│   ├── Charts/         # 차트 컴포넌트 (Recharts 기반)
│   │   ├── ActivityBarChart.tsx
│   │   ├── ComposedTrendChart.tsx
│   │   ├── HourlyHeatmap.tsx
│   │   ├── IncidentPieChart.tsx
│   │   └── SafetyTrendChart.tsx
│   ├── Layout/         # 레이아웃 컴포넌트
│   │   ├── Header.tsx
│   │   ├── HomeLayout.tsx
│   │   ├── Layout.tsx
│   │   └── Sidebar.tsx
│   ├── VideoHighlights/ # 비디오 관련 컴포넌트
│   │   ├── HighlightCard.tsx
│   │   └── VideoPlayer.tsx
│   ├── figma/          # Figma 디자인 관련
│   │   └── ImageWithFallback.tsx
│   └── SafetyBannerCarousel.tsx
├── lib/                # 라이브러리 및 유틸리티
│   ├── api.ts          # 백엔드 API 클라이언트
│   └── openai.ts       # ⚠️ 삭제 예정 (보안 위험)
├── pages/              # 페이지 컴포넌트
│   ├── Home.tsx        # 랜딩 페이지
│   ├── Dashboard.tsx   # 대시보드
│   ├── LiveMonitoring.tsx  # 실시간 모니터링
│   ├── DailyReport.tsx     # 발달 리포트 (재활용)
│   ├── Analytics.tsx       # 안전 리포트 (재활용)
│   ├── CameraSetup.tsx     # 클립 하이라이트 (재활용)
│   └── Settings.tsx    # 설정
├── types/              # TypeScript 타입 정의
│   └── index.ts
├── utils/              # 유틸리티 함수
│   └── mockData.ts
├── App.tsx             # 메인 앱 컴포넌트 (라우팅)
├── main.tsx            # 엔트리 포인트
└── index.css           # 글로벌 스타일
```

## 🗺️ 라우팅 구조

| 경로 | 페이지 컴포넌트 | 설명 |
|------|----------------|------|
| `/` | Home | 랜딩 페이지 |
| `/dashboard` | Dashboard | 대시보드 (주요 안전 지표) |
| `/live-monitoring` | LiveMonitoring | 실시간 모니터링 |
| `/development-report` | DailyReport | 발달 리포트 (AI 발달 분석) |
| `/safety-report` | Analytics | 안전 리포트 (안전도·트렌드) |
| `/clip-highlights` | CameraSetup | 클립 하이라이트 (주요 순간 모음) |
| `/settings` | Settings | 설정 (프로필·알림) |

## 🎨 컴포넌트 재사용 전략

### 기존 페이지 재활용
- **DailyReport.tsx** → 발달 리포트로 재활용
- **Analytics.tsx** → 안전 리포트로 재활용
- **CameraSetup.tsx** → 클립 하이라이트로 재활용

### 향후 개선 사항
각 페이지를 목적에 맞게 리팩토링 필요:
1. **발달 리포트**: 아이의 발달 단계별 분석 내용 표시
2. **안전 리포트**: 안전도 점수, 위험 요소 분석
3. **클립 하이라이트**: 주요 순간 영상 클립 모음

## 🔌 API 연동 상태

### ✅ 구현된 API
- `/api/homecam/analyze-video` - 비디오 분석

### ❌ 미구현 API (백엔드 작업 필요)
- `/api/live-monitoring/*` - 라이브 스트리밍
- `/api/analytics/*` - 분석 데이터
- `/api/dashboard/*` - 대시보드 데이터

## 🚨 보안 이슈

### 즉시 삭제 필요
- `src/lib/openai.ts` - OpenAI API 키가 프론트엔드에 노출되는 보안 위험
  - 모든 AI 기능은 백엔드(Gemini)에서 처리 중
  - 현재 사용되지 않음

## 📋 개발 가이드라인

### 새 컴포넌트 추가 시
1. **위치 선택**:
   - 재사용 가능 → `components/`
   - 페이지 전용 → `pages/`
   - 차트 관련 → `components/Charts/`
   
2. **명명 규칙**:
   - PascalCase 사용 (예: `SafetyTrendChart.tsx`)
   - 파일명과 컴포넌트명 일치
   
3. **타입 정의**:
   - 공통 타입 → `types/index.ts`
   - 컴포넌트 전용 타입 → 같은 파일 내 정의

### API 호출
- 모든 API 호출은 `lib/api.ts`를 통해 수행
- 환경변수: `VITE_API_BASE_URL` (기본값: `http://localhost:8000`)

### 스타일링
- TailwindCSS 사용
- 커스텀 색상: `primary`, `safe`, `warning`, `danger` 등
- 글로벌 스타일: `index.css`

## 🎯 다음 단계

1. **보안**: `openai.ts` 삭제
2. **백엔드 API**: 미구현 엔드포인트 개발
3. **페이지 리팩토링**: 재활용된 페이지를 목적에 맞게 수정
4. **타입 정리**: `api.ts`의 중복 타입 정의 제거
