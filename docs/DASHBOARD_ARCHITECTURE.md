# Dashboard 컴포넌트 아키텍처

## 📋 개요

Dashboard 페이지를 유지보수 가능한 구조로 리팩토링했습니다.
- **이전**: 단일 파일 ~1,081줄
- **현재**: 5개 컴포넌트로 분리 (~450줄)
- **감소율**: 약 58% 감소

## 🏗️ 컴포넌트 구조

```
pages/
└── Dashboard.tsx                  (~380줄) - 메인 오케스트레이터

components/dashboard/
├── HeroSection.tsx                (~30줄)  - 인사말 섹션
├── StatsGrid.tsx                  (~110줄) - 통계 카드 그리드
├── HighlightsSection.tsx          (~75줄)  - AI 분석 하이라이트
└── TimelineChart.tsx              (~170줄) - 시간별 차트
```

## 📦 컴포넌트 상세

### 1. Dashboard.tsx (메인 페이지)
**위치**: `frontend/src/pages/Dashboard.tsx`

**역할**:
- 전체 레이아웃 구성
- 데이터 로딩 및 상태 관리
- 자식 컴포넌트들에게 props 전달
- 타임라인 테이블 렌더링 (인라인)

**주요 로직**:
```typescript
- useWindowWidth() - 반응형 처리
- loadData() - API 데이터 로딩
- generateChartData() - 차트 데이터 생성
- timelineEvents - 하드코드 이벤트 데이터
```

**Props 흐름**:
- ✅ HeroSection에 childName, summary 전달
- ✅ StatsGrid에 4개 메트릭 전달
- ✅ TimelineChart에 차트 데이터 및 상태 전달

---

### 2. HeroSection.tsx
**위치**: `frontend/src/components/dashboard/HeroSection.tsx`

**역할**: 상단 감성적 인사말 섹션

**Props**:
```typescript
interface HeroSectionProps {
  childName?: string      // 기본값: "지수"
  summary?: string        // AI 요약
}
```

**UI 요소**:
- 인사말 텍스트 ("오늘도 함께해요")
- 아이 이름과 상태 (그라데이션 텍스트)
- AI 요약 문구

**애니메이션**: Framer Motion fade-in (duration: 0.6s)

---

### 3. StatsGrid.tsx
**위치**: `frontend/src/components/dashboard/StatsGrid.tsx`

**역할**: 4개 핵심 메트릭 카드 표시

**Props**:
```typescript
interface StatsGridProps {
  safetyScore: number          // 안전 점수
  developmentScore: number     // 발달 점수
  monitoringHours: number      // 모니터링 시간
  incidentCount: number        // 이벤트 감지 건수
}
```

**표시 카드**:
1. **안전 점수** - Shield 아이콘, 초록색
2. **발달 점수** - Baby 아이콘, 파란색
3. **모니터링 시간** - Eye 아이콘, 초록색
4. **이벤트 감지** - Activity 아이콘, 노란색

**레이아웃**: 
- 모바일: 2x2 그리드
- 데스크톱: 1x4 그리드

**애니메이션**: 각 카드 순차적 fade-in (delay: 0.1 + index * 0.05)

---

### 4. HighlightsSection.tsx
**위치**: `frontend/src/components/dashboard/HighlightsSection.tsx`

**역할**: AI가 분석한 오늘의 하이라이트 표시

**데이터**: 현재 하드코드 (향후 API 연동)

**UI 요소**:
1. **헤더**: Sparkles 아이콘 + "오늘의 하이라이트"
2. **하이라이트 카드 3개**:
   - 배밀이 2미터 성공!
   - 옹알이 20% 증가
   - 안전한 하루
3. **CTA 버튼 2개**:
   - 발달 리포트 자세히 보기 → `/development-report`
   - 안전 리포트 자세히 보기 → `/safety-report`

**스타일**: 파스텔 블루 배경 (#E6F2FF)

**레이아웃**:
- 모바일: 세로 스택
- 데스크톱: 3열 그리드

---

### 5. TimelineChart.tsx
**위치**: `frontend/src/components/dashboard/TimelineChart.tsx`

**역할**: 시간별 안전/발달 점수 추이 차트

**Props**:
```typescript
interface TimelineChartProps {
  timeRange: TimeRangeType              // 'day' | 'week' | 'month' | 'year'
  setTimeRange: (range) => void         // 기간 변경 핸들러
  selectedDate: Date                    // 선택된 날짜
  setSelectedDate: (date) => void       // 날짜 변경 핸들러
  chartData: ChartDataPoint[]           // 차트 데이터
  isMobile: boolean                     // 반응형 플래그
}
```

**UI 요소**:
1. **헤더**: Clock 아이콘 + 제목
2. **기간 선택기**: 하루/7일/한달/1년 버튼
3. **날짜 네비게이터**: 전/후 날짜 이동 (하루 선택 시에만)
4. **차트**: Recharts AreaChart
   - 초록색: 안전 점수
   - 파란색: 발달 점수

**차트 설정**:
- Y축: 70~100점
- X축: 시간/기간별 레이블 (45도 회전)
- 그라데이션 fill 효과
- 애니메이션 duration: 1.5초

---

## 🔄 데이터 흐름

```
Dashboard.tsx
    │
    ├─→ getDashboardData(7)           // API 호출
    │   └─→ dashboardData 상태 저장
    │
    ├─→ HeroSection
    │   └─→ childName, summary
    │
    ├─→ StatsGrid
    │   └─→ 4개 메트릭 값
    │
    ├─→ HighlightsSection
    │   └─→ (props 없음, 하드코드)
    │
    └─→ TimelineChart
        └─→ chartData, 상태 핸들러
```

## 📊 활동 타임라인 테이블

**위치**: Dashboard.tsx 내부 (인라인)

**조건**: `timeRange === 'day'`일 때만 표시

**구조**:
- **데스크톱**: HTML 테이블
  - 카테고리: 발달, 안전 주의, 안전 위험, 안전 권장, 안전 확인
  - 시간대: 4시간 단위 (04~07, 08~11, 12~15, 16~19시)
  
- **모바일**: 카드 리스트
  - 시간대별로 카드 분리
  - 이벤트가 있는 시간대만 표시

**이벤트 데이터**: 현재 하드코드 (향후 API 연동)

---

## 🎨 디자인 시스템

### 색상
- **Primary**: 파란색 계열 (`#0ea5e9`)
- **Safe**: 초록색 (`#22c55e`)
- **Warning**: 노란색 (`#f59e0b`)
- **Danger**: 빨간색 (`#ef4444`)

### 간격
- 섹션 간격: `mb-8` (2rem)
- 카드 간격: `gap-4` (1rem)

### 애니메이션
- Framer Motion 사용
- Fade-in + Slide-up 조합
- Duration: 0.5~0.6초
- Stagger delay: 0.05초 간격

---

## 🔧 향후 개선 사항

### 1. API 연동
- [ ] `HighlightsSection`: recommendations API 연결
- [ ] `Dashboard`: timelineEvents API 연결
- [ ] 수면 이벤트 그룹화 로직 복원

### 2. 컴포넌트 확장
- [ ] `EventModal`: 이벤트 상세보기 모달 추가
- [ ] `ActivityTable`: 별도 컴포넌트로 분리

### 3. 기능 추가
- [ ] 차트 기간별 실제 데이터 집계
- [ ] 테이블 이벤트 클릭 시 모달 오픈
- [ ] 영상 클립 재생 기능

---

## 📝 사용 예시

```tsx
// Dashboard.tsx
import { HeroSection } from '../components/dashboard/HeroSection'
import { StatsGrid } from '../components/dashboard/StatsGrid'

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null)
  
  // ... 데이터 로딩 로직
  
  return (
    <div>
      <HeroSection 
        childName="지수"
        summary={dashboardData.summary}
      />
      
      <StatsGrid
        safetyScore={dashboardData.safetyScore}
        developmentScore={92}
        monitoringHours={dashboardData.monitoringHours}
        incidentCount={dashboardData.incidentCount}
      />
      
      {/* ... */}
    </div>
  )
}
```

---

## 🐛 알려진 이슈

없음

---

## 📚 참고 자료

- [Recharts 공식 문서](https://recharts.org/)
- [Framer Motion 문서](https://www.framer.com/motion/)
- [Lucide React Icons](https://lucide.dev/)

---

**마지막 업데이트**: 2025-12-02
**작성자**: Antigravity AI Assistant
