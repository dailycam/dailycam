# DailyCam 데이터베이스 스키마 - 리포트 및 대시보드

## 개요
대시보드, 안전 리포트, 발달 리포트, 클립 하이라이트 페이지에서 사용하는 데이터베이스 스키마입니다.
프론트엔드 더미 데이터를 기반으로 실제로 표시되는 데이터만 저장합니다.

---

## 1. 비디오 분석 결과 (video_analyses)

### 목적
VLM/LLM이 분석한 비디오 분석 결과의 기본 정보를 저장합니다. **모든 리포트의 기반이 되는 테이블입니다.**

### 테이블: `video_analyses`

| 컬럼명 | 타입 | 제약조건 | 설명 | 프론트 참조 | 필요 이유 |
|--------|------|----------|------|-------------|-----------|
| `id` | INT | PRIMARY KEY AUTO_INCREMENT | 분석 결과 ID | - | 고유 식별자 |
| `video_id` | INT | FOREIGN KEY(videos.id) | 비디오 ID | - | 어떤 비디오를 분석했는지 추적 |
| `analysis_date` | DATE | NOT NULL | 분석 날짜 | - | 날짜별 리포트 조회 |
| `safety_score` | INT | NOT NULL | 안전 점수 (0-100) | `SafetyReport` 안전도 스코어, `DashboardData.safetyScore` | 안전 리포트와 대시보드에 표시 |
| `total_incidents` | INT | DEFAULT 0 | 총 사고 건수 | `SafetyReport` 위험 감지 건수, `DashboardData.incidentCount` | 안전 리포트 통계 표시 |
| `warning_count` | INT | DEFAULT 0 | 주의 알림 건수 | `SafetyReport` 주의 알림 건수 | 안전 리포트 통계 표시 |
| `danger_count` | INT | DEFAULT 0 | 위험 감지 건수 | `SafetyReport` 위험 감지 건수 | 안전 리포트 통계 표시 |
| `accident_count` | INT | DEFAULT 0 | 사고 발생 건수 | `SafetyReport` 사고 발생 건수 | 안전 리포트 통계 표시 |
| `observation_start_time` | TIME | NULL | 관찰 시작 시간 | `SafetyReport` 관찰 시간 시작 | 안전 리포트 "관찰 시간" 표시 |
| `observation_end_time` | TIME | NULL | 관찰 종료 시간 | `SafetyReport` 관찰 시간 종료 | 안전 리포트 "관찰 시간" 표시 |
| `age_months` | INT | NULL | 나이 (개월) | `DevelopmentReport` "현재 발달 단계" | 발달 리포트에 7개월 등으로 표시 |
| `detected_stage` | ENUM('1', '2', '3', '4', '5', '6') | NULL | 감지된 발달 단계 | `DevelopmentReport` 발달 단계 | 발달 리포트에 발달 단계 표시 |
| `monitoring_hours` | INT | DEFAULT 0 | 모니터링 시간 (시간) | `DashboardData.monitoringHours` | 대시보드 "모니터링 시간" 표시 |
| `activity_pattern` | VARCHAR(50) | NULL | 활동 패턴 (예: '활발', '정상') | `DashboardData.activityPattern` | 대시보드 활동 패턴 표시 |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 생성 시간 | - | 데이터 생성 시점 추적 |

### 인덱스
- `idx_analysis_date` ON (`analysis_date`)

### 필요 이유
- 모든 리포트의 기본 정보 제공
- 날짜별 분석 결과 조회
- 대시보드 요약 정보 표시

---

## 2. 발달 분석 결과 (development_analyses)

### 목적
VLM/LLM이 분석한 발달 분석 결과를 저장합니다. **발달 리포트의 "오늘의 발달 요약" 섹션에 사용됩니다.**

### 테이블: `development_analyses`

| 컬럼명 | 타입 | 제약조건 | 설명 | 프론트 참조 | 필요 이유 |
|--------|------|----------|------|-------------|-----------|
| `id` | INT | PRIMARY KEY AUTO_INCREMENT | 발달 분석 ID | - | 고유 식별자 |
| `video_analysis_id` | INT | FOREIGN KEY(video_analyses.id) | 비디오 분석 ID | - | 어떤 분석 결과인지 연결 |
| `summary` | TEXT | NOT NULL | AI 발달 요약 | `DevelopmentReport` "오늘의 발달 요약" 텍스트 | 발달 리포트 상단에 표시되는 요약 |
| `ai_insights` | JSON | NULL | AI 발달 인사이트 목록 | `DevelopmentReport` "AI 발달 인사이트" (4개 항목) | 발달 리포트에 AI 인사이트 표시 |
| `strongest_area` | ENUM('언어', '운동', '인지', '사회성', '정서') | NULL | 발달 강점 영역 | `DevelopmentReport` "발달 강점" | 발달 리포트에 강점 영역 표시 |
| `total_development_actions` | INT | DEFAULT 0 | 총 발달 행동 건수 | `DevelopmentReport` "79건의 발달 행동" | 발달 리포트 요약에 건수 표시 |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 생성 시간 | - | 데이터 생성 시점 추적 |

### 필요 이유
- 발달 리포트의 "오늘의 발달 요약" 섹션 표시
- 발달 강점 영역 표시
- AI 인사이트 표시

---

## 3. 발달 영역별 점수 (development_area_scores)

### 목적
5가지 발달 영역(언어, 운동, 인지, 사회성, 정서)별 점수를 저장합니다. **발달 리포트의 5각형 차트에 사용됩니다.**

### 테이블: `development_area_scores`

| 컬럼명 | 타입 | 제약조건 | 설명 | 프론트 참조 | 필요 이유 |
|--------|------|----------|------|-------------|-----------|
| `id` | INT | PRIMARY KEY AUTO_INCREMENT | 점수 ID | - | 고유 식별자 |
| `development_analysis_id` | INT | FOREIGN KEY(development_analyses.id) | 발달 분석 ID | - | 어떤 발달 분석인지 연결 |
| `area` | ENUM('언어', '운동', '인지', '사회성', '정서') | NOT NULL | 발달 영역 | `DevelopmentReport` radarData[].category | 5각형 차트의 각 축 |
| `score` | INT | NOT NULL | 점수 (0-100) | `DevelopmentReport` radarData[].score | 5각형 차트에 표시되는 점수 |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 생성 시간 | - | 데이터 생성 시점 추적 |

### 필요 이유
- 발달 리포트의 "영역별 발달 분석" 5각형 차트 표시
- 각 영역별 점수를 시각적으로 비교
- 발달 강점 영역 파악

---

## 4. 발달 행동 빈도 (development_action_frequencies)

### 목적
카테고리별 발달 행동 빈도를 저장합니다. **발달 리포트의 막대 차트에 사용됩니다.**

### 테이블: `development_action_frequencies`

| 컬럼명 | 타입 | 제약조건 | 설명 | 프론트 참조 | 필요 이유 |
|--------|------|----------|------|-------------|-----------|
| `id` | INT | PRIMARY KEY AUTO_INCREMENT | 빈도 ID | - | 고유 식별자 |
| `development_analysis_id` | INT | FOREIGN KEY(development_analyses.id) | 발달 분석 ID | - | 어떤 발달 분석인지 연결 |
| `category` | ENUM('언어', '운동', '인지', '사회성', '정서') | NOT NULL | 카테고리 | `DevelopmentReport` dailyDevelopmentFrequency[].category | 막대 차트의 X축 카테고리 |
| `count` | INT | DEFAULT 0 | 감지 횟수 | `DevelopmentReport` dailyDevelopmentFrequency[].count | 막대 차트의 높이 (Y축 값) |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 생성 시간 | - | 데이터 생성 시점 추적 |

### 필요 이유
- 발달 리포트의 "금일 발달 행동 빈도" 막대 차트 표시
- 카테고리별 활동 횟수를 시각적으로 비교
- 어떤 영역에서 활동이 많은지 파악

---

## 5. AI 추천 발달 놀이 (recommended_development_activities)

### 목적
AI가 추천한 발달 촉진 놀이를 저장합니다. **발달 리포트의 "AI 추천 발달 촉진 놀이" 섹션에 사용됩니다.**

### 테이블: `recommended_development_activities`

| 컬럼명 | 타입 | 제약조건 | 설명 | 프론트 참조 | 필요 이유 |
|--------|------|----------|------|-------------|-----------|
| `id` | INT | PRIMARY KEY AUTO_INCREMENT | 놀이 ID | - | 고유 식별자 |
| `development_analysis_id` | INT | FOREIGN KEY(development_analyses.id) | 발달 분석 ID | - | 어떤 발달 분석인지 연결 |
| `title` | VARCHAR(255) | NOT NULL | 놀이 제목 | `DevelopmentReport` recommendedActivities[].title | 카드 제목 표시 |
| `category` | VARCHAR(100) | NOT NULL | 카테고리 | `DevelopmentReport` recommendedActivities[].category | 카드에 배지로 표시 |
| `description` | TEXT | NOT NULL | 설명 | `DevelopmentReport` recommendedActivities[].description | 카드 설명 표시 |
| `duration` | VARCHAR(50) | NULL | 소요 시간 | `DevelopmentReport` recommendedActivities[].duration | 카드에 "⏱ 10-15분" 표시 |
| `benefit` | VARCHAR(100) | NULL | 효과 | `DevelopmentReport` recommendedActivities[].benefit | 카드에 "✨ 인지 능력 향상" 표시 |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 생성 시간 | - | 데이터 생성 시점 추적 |

### 필요 이유
- 발달 리포트의 "AI 추천 발달 촉진 놀이" 섹션 표시
- 부모가 실천할 수 있는 구체적인 놀이 추천
- 발달 촉진을 위한 실용적인 정보 제공

---

## 6. 안전 분석 결과 (safety_analyses)

### 목적
VLM/LLM이 분석한 안전 분석 결과를 저장합니다. **안전 리포트의 "AI 안전 분석" 섹션에 사용됩니다.**

### 테이블: `safety_analyses`

| 컬럼명 | 타입 | 제약조건 | 설명 | 프론트 참조 | 필요 이유 |
|--------|------|----------|------|-------------|-----------|
| `id` | INT | PRIMARY KEY AUTO_INCREMENT | 안전 분석 ID | - | 고유 식별자 |
| `video_analysis_id` | INT | FOREIGN KEY(video_analyses.id) | 비디오 분석 ID | - | 어떤 분석 결과인지 연결 |
| `summary` | TEXT | NOT NULL | AI 안전 분석 요약 | `SafetyReport` "AI 안전 분석" 텍스트 | 안전 리포트 상단에 표시되는 요약 |
| `ai_recommendations` | JSON | NULL | AI 안전 권장사항 목록 | `SafetyReport` "AI 안전 권장사항" (3개 항목) | 안전 리포트에 AI 권장사항 표시 |
| `overall_safety_level` | ENUM('매우낮음', '낮음', '중간', '높음', '매우높음') | NULL | 전체 안전 수준 | `SafetyAnalysis.overall_safety_level` | 안전 리포트 요약에 수준 표시 |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 생성 시간 | - | 데이터 생성 시점 추적 |

### 필요 이유
- 안전 리포트의 "AI 안전 분석" 섹션 표시
- AI 안전 권장사항 표시
- 전체 안전 수준 파악

---

## 7. 시간대별 안전 점수 (hourly_safety_scores)

### 목적
24시간 시계 형태로 표시되는 시간대별 안전 점수를 저장합니다. **안전 리포트의 "24시간 안전 현황" 시계 차트에 사용됩니다.**

### 테이블: `hourly_safety_scores`

| 컬럼명 | 타입 | 제약조건 | 설명 | 프론트 참조 | 필요 이유 |
|--------|------|----------|------|-------------|-----------|
| `id` | INT | PRIMARY KEY AUTO_INCREMENT | 점수 ID | - | 고유 식별자 |
| `safety_analysis_id` | INT | FOREIGN KEY(safety_analyses.id) | 안전 분석 ID | - | 어떤 안전 분석인지 연결 |
| `hour` | TINYINT | NOT NULL | 시간 (0-23) | `SafetyReport` clockData[].hour | 시계 차트의 각 시간대 |
| `safety_score` | INT | NOT NULL | 안전 점수 (0-100) | `SafetyReport` clockData[].safetyScore | 시계 차트에 표시되는 점수 |
| `safety_level` | ENUM('safe', 'warning', 'danger') | NULL | 안전 수준 | `SafetyReport` clockData[].safetyLevel | 시계 차트의 색상 결정 (안전/주의/위험) |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 생성 시간 | - | 데이터 생성 시점 추적 |

### 인덱스
- `idx_safety_analysis_hour` ON (`safety_analysis_id`, `hour`)

### 필요 이유
- 안전 리포트의 "24시간 안전 현황" 시계 형태 차트 표시
- 시간대별 안전 상태를 시각적으로 확인
- 위험 시간대 파악

---

## 8. 안전사고 유형 분포 (safety_incident_types)

### 목적
안전사고 유형별 분포를 저장합니다. **안전 리포트의 파이 차트에 사용됩니다.**

### 테이블: `safety_incident_types`

| 컬럼명 | 타입 | 제약조건 | 설명 | 프론트 참조 | 필요 이유 |
|--------|------|----------|------|-------------|-----------|
| `id` | INT | PRIMARY KEY AUTO_INCREMENT | 유형 ID | - | 고유 식별자 |
| `safety_analysis_id` | INT | FOREIGN KEY(safety_analyses.id) | 안전 분석 ID | - | 어떤 안전 분석인지 연결 |
| `incident_type` | VARCHAR(100) | NOT NULL | 사고 유형 (예: '낙상', '충돌/부딛힘') | `SafetyReport` incidentTypeData[].name | 파이 차트의 각 조각 이름 |
| `percentage` | DECIMAL(5,2) | NOT NULL | 비율 (%) | `SafetyReport` incidentTypeData[].value | 파이 차트의 각 조각 크기 |
| `count` | INT | DEFAULT 0 | 발생 건수 | `SafetyReport` incidentTypeData[].count | 파이 차트 하단에 "2건 (35%)" 표시 |
| `color` | VARCHAR(7) | NULL | 차트 색상 코드 | `SafetyReport` incidentTypeData[].color | 파이 차트의 각 조각 색상 |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 생성 시간 | - | 데이터 생성 시점 추적 |

### 필요 이유
- 안전 리포트의 "안전사고 유형" 파이 차트 표시
- 사고 유형별 비율을 시각적으로 확인
- 주요 사고 유형 파악

---

## 9. 안전 체크리스트 (safety_checklist_items)

### 목적
AI가 생성한 안전 체크리스트 항목을 저장합니다. **안전 리포트의 "오늘의 안전 체크리스트" 섹션에 사용됩니다.**

### 테이블: `safety_checklist_items`

| 컬럼명 | 타입 | 제약조건 | 설명 | 프론트 참조 | 필요 이유 |
|--------|------|----------|------|-------------|-----------|
| `id` | INT | PRIMARY KEY AUTO_INCREMENT | 체크리스트 ID | - | 고유 식별자 |
| `safety_analysis_id` | INT | FOREIGN KEY(safety_analyses.id) | 안전 분석 ID | - | 어떤 안전 분석인지 연결 |
| `title` | VARCHAR(255) | NOT NULL | 체크리스트 제목 | `SafetyReport` safetyChecklist[].title | 카드 제목 표시 |
| `description` | TEXT | NOT NULL | 설명 | `SafetyReport` safetyChecklist[].description | 카드 설명 표시 |
| `priority` | ENUM('high', 'medium', 'low') | NOT NULL | 우선순위 | `SafetyReport` safetyChecklist[].priority | 카드에 배지로 표시 (높은/중간 우선순위) |
| `checked` | BOOLEAN | DEFAULT FALSE | 체크 여부 | `SafetyReport` safetyChecklist[].checked | 카드에 체크박스 표시 |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 생성 시간 | - | 데이터 생성 시점 추적 |

### 필요 이유
- 안전 리포트의 "오늘의 안전 체크리스트" 섹션 표시
- 부모가 확인해야 할 안전 사항 목록 제공
- 우선순위에 따라 체크리스트 관리

---

## 10. 안전도 추이 (safety_trends)

### 목적
주간/월간 안전도 추이를 저장합니다. **안전 리포트의 "안전도 추이" 라인 차트에 사용됩니다.**

### 테이블: `safety_trends`

| 컬럼명 | 타입 | 제약조건 | 설명 | 프론트 참조 | 필요 이유 |
|--------|------|----------|------|-------------|-----------|
| `id` | INT | PRIMARY KEY AUTO_INCREMENT | 추이 ID | - | 고유 식별자 |
| `trend_date` | DATE | NOT NULL | 추이 날짜 | - | 날짜별 추이 조회 |
| `period_type` | ENUM('week', 'month') | NOT NULL | 기간 타입 | `SafetyReport` periodType | 주간/월간 모드 전환 |
| `period_label` | VARCHAR(50) | NOT NULL | 기간 레이블 (예: '월', '1주') | `SafetyReport` weeklySafetyData[].date | 라인 차트의 X축 레이블 |
| `safety_score` | INT | NOT NULL | 안전도 점수 (0-100) | `SafetyReport` weeklySafetyData[].안전도 | 라인 차트의 Y축 값 |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 생성 시간 | - | 데이터 생성 시점 추적 |

### 인덱스
- `idx_trend_date_period` ON (`trend_date`, `period_type`)

### 필요 이유
- 안전 리포트의 "안전도 추이" 라인 차트 표시
- 주간/월간 안전도 변화 추적
- 시간에 따른 안전도 트렌드 파악

---

## 11. 타임라인 이벤트 (timeline_events)

### 목적
시간대별로 발생한 이벤트(발달 활동, 안전 이벤트 등)를 저장합니다. **대시보드의 "오늘의 활동 타임라인"에 사용됩니다.**

### 테이블: `timeline_events`

| 컬럼명 | 타입 | 제약조건 | 설명 | 프론트 참조 | 필요 이유 |
|--------|------|----------|------|-------------|-----------|
| `id` | INT | PRIMARY KEY AUTO_INCREMENT | 이벤트 ID | - | 고유 식별자 |
| `video_analysis_id` | INT | FOREIGN KEY(video_analyses.id) | 비디오 분석 ID | - | 어떤 분석 결과인지 연결 |
| `event_time` | TIME | NOT NULL | 이벤트 발생 시간 (예: '15:00') | `timelineEvents[].time` | 타임라인 테이블의 시간 컬럼 |
| `event_hour` | TINYINT | NOT NULL | 이벤트 발생 시간 (0-23) | `timelineEvents[].hour` | 시간대별 필터링 및 그룹화 |
| `event_date` | DATE | NOT NULL | 이벤트 발생 날짜 | - | 날짜별 타임라인 조회 |
| `event_type` | ENUM('development', 'safety') | NOT NULL | 이벤트 타입 | `timelineEvents[].type` | 발달/안전 이벤트 구분 |
| `category` | VARCHAR(100) | NULL | 카테고리 (예: '운동 발달', '안전 확인') | `timelineEvents[].category` | 타임라인 테이블의 행 구분 |
| `title` | VARCHAR(255) | NOT NULL | 이벤트 제목 | `timelineEvents[].title` | 타임라인 테이블에 표시되는 제목 |
| `description` | TEXT | NULL | 이벤트 설명 | `timelineEvents[].description` | 타임라인 테이블에 표시되는 설명 |
| `severity` | ENUM('info', 'warning', 'danger') | NULL | 심각도 (안전 이벤트용) | `timelineEvents[].severity` | 안전 이벤트의 심각도 표시 |
| `is_sleep_event` | BOOLEAN | DEFAULT FALSE | 수면 이벤트 여부 | `timelineEvents[].isSleep` | 수면 이벤트 그룹화 여부 판단 |
| `is_sleep_group` | BOOLEAN | DEFAULT FALSE | 수면 그룹 여부 | `timelineEvents[].isSleepGroup` | 수면 그룹으로 표시 여부 |
| `sleep_start_time` | TIME | NULL | 수면 시작 시간 (그룹인 경우) | `timelineEvents[].sleepStartTime` | "8:30~11:00까지 수면했습니다" 형식 |
| `sleep_end_time` | TIME | NULL | 수면 종료 시간 (그룹인 경우) | `timelineEvents[].sleepEndTime` | 수면 종료 시간 표시 |
| `has_clip` | BOOLEAN | DEFAULT FALSE | 비디오 클립 존재 여부 | `timelineEvents[].hasClip` | 타임라인에 비디오 아이콘 표시 |
| `resolved` | BOOLEAN | DEFAULT FALSE | 해결 여부 (안전 이벤트) | `timelineEvents[].resolved` | 안전 이벤트 해결 여부 표시 |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 생성 시간 | - | 데이터 생성 시점 추적 |

### 인덱스
- `idx_event_date_hour` ON (`event_date`, `event_hour`, `event_type`)

### 필요 이유
- 대시보드 "오늘의 활동 타임라인" 표시
- 시간대별 활동 내역 테이블 표시
- 수면 이벤트 그룹화 및 표시
- 발달/안전 이벤트 분류 및 필터링

---

## 12. 시간대별 점수 (hourly_scores)

### 목적
시간대별(3시간 구간) 안전 점수 및 발달 점수를 저장합니다. **대시보드의 시간-점수 차트에 사용됩니다.**

### 테이블: `hourly_scores`

| 컬럼명 | 타입 | 제약조건 | 설명 | 프론트 참조 | 필요 이유 |
|--------|------|----------|------|-------------|-----------|
| `id` | INT | PRIMARY KEY AUTO_INCREMENT | 점수 ID | - | 고유 식별자 |
| `score_date` | DATE | NOT NULL | 점수 날짜 | - | 날짜별 점수 조회 |
| `time_range_start` | TINYINT | NOT NULL | 시간 구간 시작 (0-23) | - | 3시간 구간 시작 시간 |
| `time_range_end` | TINYINT | NOT NULL | 시간 구간 종료 (0-23) | - | 3시간 구간 종료 시간 |
| `safety_score` | INT | NOT NULL | 안전 점수 (0-100) | `chartData[].safety` | 차트의 안전 점수 라인 |
| `development_score` | INT | NOT NULL | 발달 점수 (0-100) | `chartData[].development` | 차트의 발달 점수 라인 |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 생성 시간 | - | 데이터 생성 시점 추적 |

### 인덱스
- `idx_date_time_range` ON (`score_date`, `time_range_start`, `time_range_end`)

### 필요 이유
- 대시보드 시간-점수 차트 표시 (하루 모드)
- 시간대별 활동 패턴 분석
- 안전/발달 점수 추이 확인

---

## 13. 일자별 점수 (daily_scores)

### 목적
일자별 평균 안전 점수 및 발달 점수를 저장합니다. **대시보드의 7일/한달 모드에 사용됩니다.**

### 테이블: `daily_scores`

| 컬럼명 | 타입 | 제약조건 | 설명 | 프론트 참조 | 필요 이유 |
|--------|------|----------|------|-------------|-----------|
| `id` | INT | PRIMARY KEY AUTO_INCREMENT | 점수 ID | - | 고유 식별자 |
| `score_date` | DATE | NOT NULL UNIQUE | 점수 날짜 | - | 날짜별 점수 조회 |
| `safety_score` | INT | NOT NULL | 평균 안전 점수 (0-100) | `chartData[].safety` (7일/한달 모드) | 7일 모드: "1일차", "2일차" 등 |
| `development_score` | INT | NOT NULL | 평균 발달 점수 (0-100) | `chartData[].development` (7일/한달 모드) | 한달 모드: "1~5일", "6~10일" 등 |
| `total_incidents` | INT | DEFAULT 0 | 총 사고 건수 | - | 일자별 통계 |
| `total_events` | INT | DEFAULT 0 | 총 이벤트 건수 | - | 일자별 통계 |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 생성 시간 | - | 데이터 생성 시점 추적 |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 수정 시간 | - | 데이터 업데이트 시점 추적 |

### 인덱스
- `idx_score_date` ON (`score_date`)

### 필요 이유
- 7일 모드에서 일자별 점수 표시 ("1일차", "2일차" 등)
- 한달 모드에서 5일 단위 점수 표시 ("1~5일", "6~10일" 등)
- 일자별 통계 집계 및 조회 성능 향상
- 기간별 트렌드 분석

---

## 14. 주간 트렌드 (weekly_trends)

### 목적
주간 단위의 안전 점수 및 활동 추이를 저장합니다. **대시보드와 Analytics 페이지에 사용됩니다.**

### 테이블: `weekly_trends`

| 컬럼명 | 타입 | 제약조건 | 설명 | 프론트 참조 | 필요 이유 |
|--------|------|----------|------|-------------|-----------|
| `id` | INT | PRIMARY KEY AUTO_INCREMENT | 트렌드 ID | - | 고유 식별자 |
| `trend_date` | DATE | NOT NULL | 트렌드 날짜 | `WeeklyTrendItem.date` | 날짜별 트렌드 조회 |
| `day_of_week` | ENUM('월', '화', '수', '목', '금', '토', '일') | NOT NULL | 요일 | `DashboardWeeklyTrendItem.day` | 대시보드 주간 트렌드 차트 X축 |
| `safety_score` | INT | NOT NULL | 안전 점수 | `WeeklyTrendItem.safety` | Analytics 페이지 주간 추이 |
| `development_score` | INT | NULL | 발달 점수 | - | 발달 트렌드 추적 |
| `incident_count` | INT | DEFAULT 0 | 사고 건수 | `WeeklyTrendItem.incidents` | Analytics 페이지 사고 건수 |
| `activity_score` | INT | NULL | 활동 점수 | `WeeklyTrendItem.activity` | Analytics 페이지 활동 점수 |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 생성 시간 | - | 데이터 생성 시점 추적 |

### 인덱스
- `idx_trend_date` ON (`trend_date`)

### 필요 이유
- 대시보드 주간 트렌드 차트 표시
- Analytics 페이지 주간 추이 표시
- 주간 통계 및 비교 분석

---

## 15. 분석 통계 (analytics_summary)

### 목적
기간별 분석 통계 요약을 저장합니다. **Analytics 페이지에 사용됩니다.**

### 테이블: `analytics_summary`

| 컬럼명 | 타입 | 제약조건 | 설명 | 프론트 참조 | 필요 이유 |
|--------|------|----------|------|-------------|-----------|
| `id` | INT | PRIMARY KEY AUTO_INCREMENT | 통계 ID | - | 고유 식별자 |
| `period_start` | DATE | NOT NULL | 기간 시작일 | - | 기간별 통계 조회 |
| `period_end` | DATE | NOT NULL | 기간 종료일 | - | 기간 범위 확인 |
| `period_type` | ENUM('week', 'month', 'quarter') | NOT NULL | 기간 타입 | - | 주간/월간/분기별 구분 |
| `avg_safety_score` | DECIMAL(5,2) | NOT NULL | 평균 안전 점수 | `AnalyticsSummary.avg_safety_score` | Analytics 페이지 "평균 안전도" 표시 |
| `total_incidents` | INT | DEFAULT 0 | 총 사고 건수 | `AnalyticsSummary.total_incidents` | Analytics 페이지 "총 위험 감지" 표시 |
| `safe_zone_percentage` | DECIMAL(5,2) | NOT NULL | 안전 구역 비율 (%) | `AnalyticsSummary.safe_zone_percentage` | Analytics 페이지 "세이프존 체류" 표시 |
| `incident_reduction_percentage` | DECIMAL(5,2) | NULL | 사고 감소율 (%) | `AnalyticsSummary.incident_reduction_percentage` | Analytics 페이지 변화율 표시 |
| `prev_avg_safety` | DECIMAL(5,2) | NULL | 이전 기간 평균 안전 점수 | `AnalyticsSummary.prev_avg_safety` | Analytics 페이지 "기간별 비교" 표시 |
| `prev_total_incidents` | INT | NULL | 이전 기간 총 사고 건수 | `AnalyticsSummary.prev_total_incidents` | Analytics 페이지 "기간별 비교" 표시 |
| `safety_change` | DECIMAL(5,2) | NULL | 안전 점수 변화 | `AnalyticsSummary.safety_change` | Analytics 페이지 변화량 표시 |
| `safety_change_percent` | DECIMAL(5,2) | NULL | 안전 점수 변화율 (%) | `AnalyticsSummary.safety_change_percent` | Analytics 페이지 변화율 표시 |
| `incident_change` | INT | NULL | 사고 건수 변화 | `AnalyticsSummary.incident_change` | Analytics 페이지 변화량 표시 |
| `incident_change_percent` | DECIMAL(5,2) | NULL | 사고 건수 변화율 (%) | `AnalyticsSummary.incident_change_percent` | Analytics 페이지 변화율 표시 |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 생성 시간 | - | 데이터 생성 시점 추적 |

### 필요 이유
- Analytics 페이지 요약 통계 표시
- 기간별 비교 분석
- 트렌드 변화 추적

---

## 16. 사고 유형 분포 (incident_distributions)

### 목적
사고 유형별 분포 통계를 저장합니다. **Analytics 페이지에 사용됩니다.**

### 테이블: `incident_distributions`

| 컬럼명 | 타입 | 제약조건 | 설명 | 프론트 참조 | 필요 이유 |
|--------|------|----------|------|-------------|-----------|
| `id` | INT | PRIMARY KEY AUTO_INCREMENT | 분포 ID | - | 고유 식별자 |
| `analytics_summary_id` | INT | FOREIGN KEY(analytics_summary.id) | 분석 통계 ID | - | 어떤 통계인지 연결 |
| `incident_type` | VARCHAR(100) | NOT NULL | 사고 유형 (예: '데드존 접근', '모서리 충돌') | `IncidentDistItem.name` | Analytics 페이지 파이 차트 조각 이름 |
| `count` | INT | DEFAULT 0 | 발생 건수 | `IncidentDistItem.value` | Analytics 페이지 파이 차트 조각 크기 |
| `color` | VARCHAR(7) | NULL | 차트 색상 코드 | `IncidentDistItem.color` | Analytics 페이지 파이 차트 색상 |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 생성 시간 | - | 데이터 생성 시점 추적 |

### 필요 이유
- Analytics 페이지 사고 유형별 파이 차트 표시
- 사고 유형별 통계 분석
- 주요 사고 유형 파악

---

## 17. 비디오 하이라이트 클립 (video_highlights)

### 목적
중요한 순간의 비디오 클립 정보를 저장합니다. **클립 하이라이트 페이지에 사용됩니다.**

### 테이블: `video_highlights`

| 컬럼명 | 타입 | 제약조건 | 설명 | 프론트 참조 | 필요 이유 |
|--------|------|----------|------|-------------|-----------|
| `id` | INT | PRIMARY KEY AUTO_INCREMENT | 하이라이트 ID | - | 고유 식별자 |
| `video_analysis_id` | INT | FOREIGN KEY(video_analyses.id) | 비디오 분석 ID | - | 어떤 분석 결과인지 연결 |
| `clip_type` | ENUM('development', 'safety') | NOT NULL | 클립 타입 | `ClipHighlights` activeTab | 발달 클립/안전 클립 탭 구분 |
| `title` | VARCHAR(255) | NOT NULL | 클립 제목 | `ClipHighlights` developmentClips[].title | 클립 카드 제목 표시 |
| `category` | VARCHAR(100) | NOT NULL | 카테고리 | `ClipHighlights` developmentClips[].category | 클립 카드 배지 표시 |
| `clip_timestamp` | DATETIME | NOT NULL | 클립 발생 시간 | `ClipHighlights` developmentClips[].timestamp | 클립 카드에 "2024-11-19 15:23" 표시 |
| `duration_seconds` | INT | NOT NULL | 클립 길이 (초) | `ClipHighlights` developmentClips[].duration | 클립 카드에 "0:45" 표시 |
| `description` | TEXT | NULL | 설명 | `ClipHighlights` developmentClips[].description | 클립 카드 설명 표시 |
| `importance` | ENUM('high', 'medium', 'warning', 'info') | NOT NULL | 중요도 | `ClipHighlights` developmentClips[].importance | 클립 카드 배경색 결정 |
| `thumbnail_url` | VARCHAR(500) | NULL | 썸네일 URL | - | 클립 카드 썸네일 이미지 |
| `video_url` | VARCHAR(500) | NULL | 비디오 클립 URL | - | 클립 재생 시 사용 |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 생성 시간 | - | 데이터 생성 시점 추적 |

### 인덱스
- `idx_clip_type_timestamp` ON (`clip_type`, `clip_timestamp`)

### 필요 이유
- 클립 하이라이트 페이지에서 발달/안전 클립 목록 표시
- 클립 카드에 제목, 카테고리, 시간, 설명 표시
- 클립 재생 및 다운로드 기능
- 중요도에 따른 클립 필터링

---

## 18. 대시보드 요약 (dashboard_summaries)

### 목적
대시보드에 표시되는 요약 정보를 저장합니다. **대시보드의 "오늘도 함께해요" 섹션에 사용됩니다.**

### 테이블: `dashboard_summaries`

| 컬럼명 | 타입 | 제약조건 | 설명 | 프론트 참조 | 필요 이유 |
|--------|------|----------|------|-------------|-----------|
| `id` | INT | PRIMARY KEY AUTO_INCREMENT | 요약 ID | - | 고유 식별자 |
| `summary_date` | DATE | NOT NULL UNIQUE | 요약 날짜 | - | 날짜별 요약 조회 |
| `summary_text` | TEXT | NOT NULL | 요약 텍스트 | `DashboardData.summary` | 대시보드 "오늘도 함께해요" 섹션 표시 |
| `range_days` | INT | DEFAULT 7 | 조회 기간 (일) | `DashboardData.rangeDays` | 요약 생성 시 기준 기간 |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 생성 시간 | - | 데이터 생성 시점 추적 |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 수정 시간 | - | 데이터 업데이트 시점 추적 |

### 필요 이유
- 대시보드 상단에 표시되는 요약 텍스트
- 날짜별 요약 정보 관리

---

## 19. 대시보드 위험 항목 (dashboard_risks)

### 목적
대시보드에 표시되는 위험 항목을 저장합니다. **대시보드의 위험 항목 표시에 사용됩니다.**

### 테이블: `dashboard_risks`

| 컬럼명 | 타입 | 제약조건 | 설명 | 프론트 참조 | 필요 이유 |
|--------|------|----------|------|-------------|-----------|
| `id` | INT | PRIMARY KEY AUTO_INCREMENT | 위험 항목 ID | - | 고유 식별자 |
| `dashboard_summary_id` | INT | FOREIGN KEY(dashboard_summaries.id) | 대시보드 요약 ID | - | 어떤 요약인지 연결 |
| `level` | ENUM('high', 'medium', 'low') | NOT NULL | 위험 수준 | `DashboardData.risks[].level` | 위험 수준별 색상 표시 |
| `title` | VARCHAR(255) | NOT NULL | 위험 제목 | `DashboardData.risks[].title` | 위험 항목 제목 표시 |
| `time` | VARCHAR(50) | NULL | 발생 시간 | `DashboardData.risks[].time` | 위험 항목 발생 시간 표시 |
| `count` | INT | DEFAULT 1 | 발생 횟수 | `DashboardData.risks[].count` | 위험 항목 발생 횟수 표시 |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 생성 시간 | - | 데이터 생성 시점 추적 |

### 필요 이유
- 대시보드에 주요 위험 항목 표시
- 위험 수준별 필터링 및 정렬

---

## 20. 대시보드 권장사항 (dashboard_recommendations)

### 목적
대시보드에 표시되는 권장사항을 저장합니다. **대시보드의 권장사항 표시에 사용됩니다.**

### 테이블: `dashboard_recommendations`

| 컬럼명 | 타입 | 제약조건 | 설명 | 프론트 참조 | 필요 이유 |
|--------|------|----------|------|-------------|-----------|
| `id` | INT | PRIMARY KEY AUTO_INCREMENT | 권장사항 ID | - | 고유 식별자 |
| `dashboard_summary_id` | INT | FOREIGN KEY(dashboard_summaries.id) | 대시보드 요약 ID | - | 어떤 요약인지 연결 |
| `priority` | ENUM('high', 'medium', 'low') | NOT NULL | 우선순위 | `DashboardData.recommendations[].priority` | 권장사항 우선순위 표시 |
| `title` | VARCHAR(255) | NOT NULL | 권장사항 제목 | `DashboardData.recommendations[].title` | 권장사항 제목 표시 |
| `description` | TEXT | NOT NULL | 권장사항 설명 | `DashboardData.recommendations[].description` | 권장사항 설명 표시 |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 생성 시간 | - | 데이터 생성 시점 추적 |

### 필요 이유
- 대시보드에 주요 권장사항 표시
- 우선순위별 필터링 및 정렬

---

## 관계도 요약

```
video_analyses (1) ──< (1) development_analyses
video_analyses (1) ──< (1) safety_analyses
video_analyses (1) ──< (N) timeline_events
video_analyses (1) ──< (N) video_highlights
development_analyses (1) ──< (N) development_area_scores
development_analyses (1) ──< (N) development_action_frequencies
development_analyses (1) ──< (N) recommended_development_activities
safety_analyses (1) ──< (N) hourly_safety_scores
safety_analyses (1) ──< (N) safety_incident_types
safety_analyses (1) ──< (N) safety_checklist_items
dashboard_summaries (1) ──< (N) dashboard_risks
dashboard_summaries (1) ──< (N) dashboard_recommendations
```

---

## 데이터 생성 시점

1. **VLM/LLM 비디오 분석 완료 시**: 
   - `video_analyses` 생성 (기본 정보)
   - `development_analyses` 생성 (발달 분석 결과)
   - `development_area_scores` 생성 (5개 영역별 점수)
   - `development_action_frequencies` 생성 (5개 카테고리별 빈도)
   - `recommended_development_activities` 생성 (AI 추천 놀이)
   - `safety_analyses` 생성 (안전 분석 결과)
   - `hourly_safety_scores` 생성 (24개 시간대별 점수)
   - `safety_incident_types` 생성 (사고 유형별 분포)
   - `safety_checklist_items` 생성 (안전 체크리스트)
   - `timeline_events` 생성 (여러 개)
   - `hourly_scores` 생성 (여러 개)
   - `video_highlights` 생성 (여러 개)

2. **일일 집계 시**: 
   - `daily_scores` 생성/업데이트
   - `dashboard_summaries` 생성
   - `dashboard_risks` 생성 (여러 개)
   - `dashboard_recommendations` 생성 (여러 개)

3. **주간 집계 시**: 
   - `weekly_trends` 생성 (7개)
   - `safety_trends` 생성 (주간)

4. **월간 집계 시**: 
   - `safety_trends` 생성 (월간)

5. **분석 통계 생성 시**: 
   - `analytics_summary` 생성
   - `incident_distributions` 생성 (여러 개)

---

## 참고사항

- 모든 날짜/시간 컬럼은 한국 시간대(KST) 기준으로 저장
- JSON 컬럼은 MySQL 5.7+ 또는 MariaDB 10.2+ 버전 필요
- ENUM 타입은 추후 확장 가능성을 고려하여 VARCHAR로 변경 고려 가능
- 대용량 데이터 처리를 위해 파티셔닝 고려 (날짜 기준)
- 삭제 정책: 비디오 파일 삭제 시 관련 분석 데이터도 함께 삭제 (CASCADE)

