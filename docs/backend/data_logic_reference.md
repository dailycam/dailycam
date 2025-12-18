# Dashboard & Report Data Logic

이 문서는 DailyCam의 **대시보드** 및 **리포트** 페이지에서 표시되는 주요 지표(점수, 시간, 카운트 등)가 어떻게 계산되고 집계되는지 정리한 문서입니다.

## 1. 데이터 소스 (Data Sources)

시스템에는 크게 두 가지의 데이터 소스가 존재하며, **중복 집계 방지**가 핵심입니다.

| 소스 이름 | 모델명 (`app.models`) | 설명 | 사용 용도 |
| :--- | :--- | :--- | :--- |
| **분석 로그** | `AnalysisLog` | 분석 완료 시 생성되는 최종 결과 기록 | **이벤트 상세 정보**, 장기 트렌드 분석 |
| **영상 구간** | `SegmentAnalysis` | 10분 단위 영상 분석 결과 (실시간 스트리밍) | **평균 점수**, **분석 횟수**, **모니터링 시간** 계산의 **기준(Source of Truth)** |

> ⚠️ **중요**: `AnalysisLog`와 `SegmentAnalysis`는 1:1로 대응되어 생성되므로, **단순 합산 시 수치가 2배가 되는 문제**가 있습니다. 따라서 수치 계산 시에는 **`SegmentAnalysis` 하나만 기준**으로 삼아야 합니다.

---

## 2. 대시보드 (Dashboard) 계산 로직

**파일 위치**: `backend/app/api/dashboard/router.py`

| 항목 (Metric) | 계산 방식 (Logic) | 비고 |
| :--- | :--- | :--- |
| **모니터링 시간** | `len(completed_segments) * (10 / 60)` | 완료된 10분 단위 세그먼트 개수 × 10분. (단위: 시간) |
| **총 분석 횟수** | `len(completed_segments)` | 완료된 세그먼트 개수만 카운트. (`AnalysisLog` 미포함) |
| **평균 안전 점수** | `Avg(SegmentAnalysis.safety_score)` | 해당 기간 내 완료된 세그먼트들의 안전 점수 평균. |
| **평균 발달 점수** | `Avg(SegmentAnalysis.development_score)` | 해당 기간 내 완료된 세그먼트들의 발달 점수 평균. |
| **위험 이벤트 수** | `Count(SafetyEvent where severity >= '주의')` | `SafetyEvent` 테이블에서 직접 카운트. (중복 없음) |
| **시간대별 통계** | `SegmentAnalysis` 루프에서만 `analysisCount` 증가 | 시간대별 평균 점수 계산 시 중복 방지. |

---

## 3. 안전 리포트 (Safety Report) 계산 로직

**파일 위치**: `backend/app/api/safety/router.py`

| 항목 (Metric) | 계산 방식 (Logic) | 비고 |
| :--- | :--- | :--- |
| **안전 점수** | `Avg(SegmentAnalysis.safety_score)` | `AnalysisLog` 점수는 합산에서 **제외**. |
| **안전도 추이** | 주간: 일별 `Avg(SegmentAnalysis.safety_score)` / 월간: 주별 평균 | 상단 안전 점수와 일관성을 위해 모두 `SegmentAnalysis` 기준으로 집계. |
| **사고 유형 통계** | `Count(SafetyEvent by title keyword)` | 이벤트 제목의 키워드(낙상, 충돌 등)로 분류하여 카운트. |
| **체크리스트** | `SafetyEvent` 중 미해결(`resolved=False`) 항목 | 최신순 정렬, 중요도에 따라 상단 배치. |

---

## 4. 발달 리포트 (Development Report) 계산 로직

**파일 위치**: `backend/app/api/development/router.py`

| 항목 (Metric) | 계산 방식 (Logic) | 비고 |
| :--- | :--- | :--- |
| **발달 점수** | `Avg(SegmentAnalysis.development_score)` | `AnalysisLog` 점수는 합산에서 **제외**. |
| **발달 영역 점수** | `DevelopmentTrackingService` (누적) | 단순 평균이 아닌, **누적 추적 시스템**의 점수 사용. (실패 시 VLM 평균으로 Fallback) |
| **행동 빈도** | `Count(DevelopmentEvent by category)` | `DevelopmentEvent` 테이블에서 카테고리별 카운트. |
| **아이 월령** | `User.child_birthdate` 기준 계산 | 생년월일 기반 실시간 월령 계산 (만 나이 아님). |

---

## 5. 요약 (Summary)

*   **수치 계산(평균, 합계, 시간)**: 무조건 **`SegmentAnalysis`** 테이블만 사용합니다.
*   **상세 내용(이벤트 목록, 트렌드)**: **`AnalysisLog`** 및 연결된 `Event` 테이블을 사용합니다.
*   이 원칙을 지켜야 **데이터 중복(Double Counting)** 문제를 방지할 수 있습니다.
