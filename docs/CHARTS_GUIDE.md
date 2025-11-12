# 데이터 시각화 가이드

## 📊 구현된 차트 컴포넌트

JP Morgan 스타일의 전문적이고 깔끔한 데이터 시각화를 Recharts로 구현했습니다.

### 1. SafetyTrendChart (안전도 추이)
**위치**: `src/components/Charts/SafetyTrendChart.tsx`

**사용처**: Dashboard, Analytics, DailyReport

**특징**:
- Area Chart with gradient fill
- 부드러운 곡선 (monotone)
- 그라데이션 배경 (초록색)
- 깔끔한 그리드 라인
- 프로페셔널한 툴팁

```typescript
<SafetyTrendChart data={weeklyData} />

// 데이터 형식
[
  { day: '월', score: 85, incidents: 5 },
  { day: '화', score: 88, incidents: 3 },
  ...
]
```

### 2. IncidentPieChart (위험 유형별 분포)
**위치**: `src/components/Charts/IncidentPieChart.tsx`

**사용처**: Analytics

**특징**:
- 도넛 차트 스타일
- 퍼센트 라벨 (차트 내부)
- 커스텀 색상
- 하단 범례
- 호버 툴팁

```typescript
<IncidentPieChart data={incidentData} />

// 데이터 형식
[
  { name: '데드존 접근', value: 12, color: '#ef4444' },
  { name: '모서리 충돌', value: 8, color: '#f59e0b' },
  ...
]
```

### 3. ActivityBarChart (주간 활동 패턴)
**위치**: `src/components/Charts/ActivityBarChart.tsx`

**사용처**: Analytics

**특징**:
- 세로 막대 차트
- 값에 따른 동적 색상
  - 90%+: 초록색 (매우 활발)
  - 70-89%: 파란색 (활발)
  - 50-69%: 주황색 (보통)
  - <50%: 빨간색 (낮음)
- 둥근 모서리
- 호버 효과

```typescript
<ActivityBarChart data={activityData} />

// 데이터 형식
[
  { day: '월', activity: 85 },
  { day: '화', activity: 78 },
  ...
]
```

### 4. HourlyHeatmap (시간대별 히트맵)
**위치**: `src/components/Charts/HourlyHeatmap.tsx`

**사용처**: Analytics

**특징**:
- 가로 막대 차트 (horizontal)
- 시간대별 활동량 표시
- 값에 따른 색상 변화
- 퍼센트 라벨 (막대 내부)
- 깔끔한 Y축 라벨

```typescript
<HourlyHeatmap data={hourlyData} />

// 데이터 형식
[
  { hour: '06:00', activity: 20, safety: 95 },
  { hour: '09:00', activity: 60, safety: 88 },
  ...
]
```

### 5. ComposedTrendChart (종합 트렌드)
**위치**: `src/components/Charts/ComposedTrendChart.tsx`

**사용처**: DailyReport

**특징**:
- 복합 차트 (라인 + 막대)
- 이중 Y축
  - 왼쪽: 안전도, 활동량 (%)
  - 오른쪽: 위험 감지 (건수)
- 3개 데이터 시리즈
  - 안전도: 실선 (초록색)
  - 활동량: 점선 (파란색)
  - 위험 감지: 막대 (빨간색)
- 범례 포함

```typescript
<ComposedTrendChart data={weeklyTrendData} />

// 데이터 형식
[
  { date: '11/05', safety: 85, incidents: 5, activity: 75 },
  { date: '11/06', safety: 88, incidents: 3, activity: 80 },
  ...
]
```

## 🎨 디자인 원칙

### JP Morgan 스타일 특징
1. **미니멀리즘**: 불필요한 요소 제거
2. **명확한 그리드**: 수평선만 표시 (세로선 제거)
3. **부드러운 색상**: 과하지 않은 색상 사용
4. **프로페셔널 툴팁**: 흰 배경, 그림자, 둥근 모서리
5. **적절한 여백**: 차트 주변 충분한 공간

### 색상 팔레트
```css
/* 안전 */
#22c55e (Green)

/* 위험 */
#ef4444 (Red)

/* 주의 */
#f59e0b (Orange)

/* 정보 */
#3b82f6 (Blue)

/* 중립 */
#6b7280 (Gray)
```

### 툴팁 스타일
```javascript
contentStyle={{
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
}}
```

## 📈 사용 예시

### Dashboard 페이지
```typescript
import SafetyTrendChart from '../components/Charts/SafetyTrendChart'
import { generateWeeklySafetyData } from '../utils/mockData'

export default function Dashboard() {
  const weeklyData = generateWeeklySafetyData()
  
  return (
    <div className="card">
      <h2>주간 안전도 추이</h2>
      <div className="h-64">
        <SafetyTrendChart data={weeklyData} />
      </div>
    </div>
  )
}
```

### Analytics 페이지
```typescript
import SafetyTrendChart from '../components/Charts/SafetyTrendChart'
import IncidentPieChart from '../components/Charts/IncidentPieChart'
import ActivityBarChart from '../components/Charts/ActivityBarChart'
import HourlyHeatmap from '../components/Charts/HourlyHeatmap'

export default function Analytics() {
  const weeklyData = generateWeeklySafetyData()
  const hourlyData = generateHourlyActivityData()
  
  const incidentData = [
    { name: '데드존 접근', value: 12, color: '#ef4444' },
    { name: '모서리 충돌', value: 8, color: '#f59e0b' },
  ]
  
  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="card">
        <SafetyTrendChart data={weeklyData} />
      </div>
      <div className="card">
        <IncidentPieChart data={incidentData} />
      </div>
    </div>
  )
}
```

## 🔧 커스터마이징

### 차트 높이 조정
```typescript
// 높이 변경
<div className="h-64">  {/* 256px */}
<div className="h-80">  {/* 320px */}
<div className="h-96">  {/* 384px */}
```

### 색상 변경
```typescript
// SafetyTrendChart.tsx
<Area
  stroke="#22c55e"  // 라인 색상
  fill="url(#colorScore)"  // 그라데이션
/>

// Gradient 정의
<linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
</linearGradient>
```

### 축 범위 조정
```typescript
<YAxis
  domain={[0, 100]}  // 0-100 범위
  // 또는
  domain={['dataMin', 'dataMax']}  // 데이터 기반 자동
/>
```

## 📊 Mock 데이터 생성

### generateWeeklySafetyData()
```typescript
// src/utils/mockData.ts
export function generateWeeklySafetyData() {
  return [
    { day: '월', score: 85, incidents: 5 },
    { day: '화', score: 88, incidents: 3 },
    { day: '수', score: 92, incidents: 2 },
    { day: '목', score: 87, incidents: 4 },
    { day: '금', score: 90, incidents: 3 },
    { day: '토', score: 95, incidents: 1 },
    { day: '일', score: 93, incidents: 2 },
  ]
}
```

### generateHourlyActivityData()
```typescript
export function generateHourlyActivityData() {
  return Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    activity: Math.floor(Math.random() * 100),
    safety: Math.floor(Math.random() * 30) + 70,
  }))
}
```

## 🚀 실제 데이터 연동

### API 연동 예시
```typescript
import { useEffect, useState } from 'react'
import SafetyTrendChart from '../components/Charts/SafetyTrendChart'

export default function Dashboard() {
  const [data, setData] = useState([])
  
  useEffect(() => {
    fetch('/api/safety/weekly')
      .then(res => res.json())
      .then(data => setData(data))
  }, [])
  
  return (
    <div className="h-64">
      <SafetyTrendChart data={data} />
    </div>
  )
}
```

## 📱 반응형 디자인

모든 차트는 `ResponsiveContainer`를 사용하여 자동으로 반응형입니다:

```typescript
<ResponsiveContainer width="100%" height="100%">
  <AreaChart data={data}>
    {/* ... */}
  </AreaChart>
</ResponsiveContainer>
```

부모 요소의 높이만 지정하면 됩니다:
```typescript
<div className="h-64">  {/* 고정 높이 */}
  <SafetyTrendChart data={data} />
</div>
```

## 🎯 베스트 프랙티스

1. **일관된 색상**: 프로젝트 전체에서 동일한 색상 사용
2. **적절한 높이**: 차트는 최소 200px 이상 권장
3. **로딩 상태**: 데이터 로딩 중 스켈레톤 표시
4. **에러 처리**: 데이터 없을 때 대체 UI 표시
5. **접근성**: 색상만으로 정보 전달하지 않기

## 🔍 트러블슈팅

### 차트가 표시되지 않음
- 부모 요소에 높이가 지정되어 있는지 확인
- 데이터 형식이 올바른지 확인
- Recharts 패키지가 설치되어 있는지 확인

### 툴팁이 잘림
- `overflow: visible` 또는 충분한 여백 추가
- 차트 margin 조정

### 성능 이슈
- 데이터 포인트 수 제한 (권장: 100개 이하)
- 메모이제이션 사용 (`React.memo`)
- 불필요한 리렌더링 방지

---

**참고**: 이 차트들은 Recharts 라이브러리를 기반으로 하며, JP Morgan의 데이터 시각화 원칙을 따라 디자인되었습니다.

