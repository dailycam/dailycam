# 발달 점수 추적 시스템 DB 초기화 가이드

## 새로운 테이블 생성

발달 점수 누적 추적 시스템에 필요한 2개의 새로운 테이블을 생성해야 합니다.

### 방법 1: Python 스크립트 실행 (권장)

```bash
# backend 디렉토리에서 실행
cd C:\dev\dailycam-main\backend
python -m app.database.init_db
```

이 명령어는 다음 테이블을 생성합니다:
- `development_score_tracking`: 사용자별 영역별 점수 저장
- `development_milestone_tracking`: 나이대별 milestone 달성 추적

### 방법 2: SQL 직접 실행

MySQL Workbench 또는 다른 클라이언트에서 아래 SQL을 실행하세요:

```sql
-- development_score_tracking 테이블
CREATE TABLE development_score_tracking (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    language_score INT NOT NULL DEFAULT 50,
    motor_score INT NOT NULL DEFAULT 50,
    cognitive_score INT NOT NULL DEFAULT 50,
    social_score INT NOT NULL DEFAULT 50,
    emotional_score INT NOT NULL DEFAULT 50,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- development_milestone_tracking 테이블
CREATE TABLE development_milestone_tracking (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    age_months INT NOT NULL,
    category VARCHAR(20) NOT NULL,
    milestone_name VARCHAR(255) NOT NULL,
    achieved BOOLEAN NOT NULL DEFAULT FALSE,
    first_achieved_at TIMESTAMP NULL,
    days_unachieved INT NOT NULL DEFAULT 0,
    penalty_applied INT NOT NULL DEFAULT 0,
    last_checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_age_months (age_months),
    INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 테이블 생성 확인

```sql
-- 테이블 확인
SHOW TABLES LIKE 'development_%';

-- 테이블 구조 확인
DESC development_score_tracking;
DESC development_milestone_tracking;
```

## 작동 방식

### 1. 분석 완료 시
- `AnalysisService.save_analysis_result()` 호출
- VLM 분석 결과 저장
- **자동으로** `DevelopmentTrackingService.update_scores_from_analysis()` 호출
- 발달 이벤트 카테고리별로 점수 증가 (각 이벤트당 +1점, 최대 +10점)

### 2. Development Report API 호출 시
- **누적 추적 점수** 반환 (VLM 일회성 점수 대신)
- 초기값: 모든 영역 50점
- 영상 분석할 때마다 점수 증가

### 3. 점수 변화 예시
```
초기 상태:
- 언어: 50, 운동: 50, 인지: 50, 사회성: 50, 정서: 50

1번째 영상 분석 (운동 행동 5개, 언어 행동 2개 관찰):
- 언어: 52 (+2), 운동: 55 (+5), 인지: 50, 사회성: 50, 정서: 50

2번째 영상 분석 (운동 행동 3개, 인지 행동 4개 관찰):
- 언어: 52, 운동: 58 (+3), 인지: 54 (+4), 사회성: 50, 정서: 50

3번째 영상 분석 (언어 행동 10개, 사회성 행동 5개 관찰):
- 언어: 62 (+10), 운동: 58, 인지: 54, 사회성: 55 (+5), 정서: 50
```

## 주의사항

> [!IMPORTANT]
> **백업 필수**
> 기존 DB를 백업한 후 테이블을 생성하세요.

> [!NOTE]
> **기존 데이터 영향 없음**
> 새로운 테이블이므로 기존 `analysis_log`, `safety_event` 등의 데이터에는 영향이 없습니다.

> [!WARNING]
> **Milestone 기능은 향후 구현**
> `development_milestone_tracking` 테이블은 생성되지만, 3-4일 주기 감점 기능은 아직 구현되지 않았습니다.
> 현재는 **가점만** 작동합니다.

## 문제 해결

### 테이블 생성 실패 시
```bash
# 에러 로그 확인
python -m app.database.init_db

# 테이블 삭제 후 재생성 (주의!)
# DROP TABLE development_milestone_tracking;
# DROP TABLE development_score_tracking;
```

### 점수가 업데이트되지 않을 때
1. 백엔드 콘솔에서 `[DevelopmentTracking]` 로그 확인
2. `development_events`가 VLM 응답에 포함되어 있는지 확인
3. 테이블이 제대로 생성되었는지 확인

## 다음 단계 (TODO)

- [ ] Milestone 정의 (나이대별 필수 행동)
- [ ] 3-4일 주기 감점 로직 구현
- [ ] 일일 배치 작업 스케줄러 추가
- [ ] 사용자가 수동으로 점수 조정할 수 있는 관리자 API
