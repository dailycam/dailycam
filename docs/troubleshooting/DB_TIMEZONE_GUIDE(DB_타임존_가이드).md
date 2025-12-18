# DB 시간대(Timezone) 및 데이터 정합성 가이드

## 1. 타임존 정책 (Timezone Policy)

서버와 클라이언트, DB가 서로 다른 시간대를 사용할 때 발생하는 "리포트 날짜 밀림 현상"을 방지하기 위한 원칙입니다.

### [원칙] "저장은 UTC, 해석은 KST"

1.  **Database (MySQL)**: **UTC (협정 세계시)** 기준 저장
    *   MySQL의 `DATETIME` 컬럼은 타임존 정보를 저장하지 않는 경우가 많으므로, 모든 값은 UTC라고 가정합니다.
    *   `created_at`, `segment_start` 등 모든 시간 필드는 UTC 0 기준입니다.

2.  **Application (Backend)**: **KST (한국 표준시)** 변환 로직 내장
    *   코드 레벨에서 데이터를 조회하거나 저장할 때 명시적으로 변환합니다.

---

## 2. 코드 구현 현황 (Implementation Fact)

현재 `backend/app/api/dashboard/router.py` 등의 파일에서 다음과 같이 구현되어 있습니다.

### 2-1. 날짜 조회 시 (Request)
사용자가 `target_date="2025-12-15"` (KST 기준)를 요청하면:

```python
# KST 타임존 정의
kst = pytz.timezone('Asia/Seoul')

# 1. 사용자가 요청한 날짜의 시작/끝을 KST로 정의
today_start_kst = kst.localize(datetime(2025, 12, 15, 0, 0, 0))
today_end_kst = kst.localize(datetime(2025, 12, 15, 23, 59, 59))

# 2. 이를 UTC로 변환하여 DB 쿼리에 사용
start_utc = today_start_kst.astimezone(pytz.UTC)
end_utc = today_end_kst.astimezone(pytz.UTC)

# DB 쿼리
db.query(AnalysisLog).filter(
    AnalysisLog.created_at >= start_utc,
    AnalysisLog.created_at <= end_utc
)
```

### 2-2. 데이터 표시 시 (Response)
DB에서 가져온 UTC 시간(`log.created_at`)을 다시 KST로 변환하여 시각화합니다.

```python
# 시간대별 통계 집계 시
log_time_kst = log.created_at.replace(tzinfo=pytz.UTC).astimezone(kst)
hour = log_time_kst.hour  # 한국 시간 기준 시간(hour) 추출
```

---

## 3. 주의사항 (Troubleshooting)

*   **증상**: 대시보드에서 오전 9시 이전 데이터가 전날 데이터로 잡히거나, 아예 안 보임.
*   **원인**: UTC -> KST 변환(+9시간)을 누락하고 UTC 시간을 그대로 사용하여 `hour`를 추출했을 때 발생.
*   **해결**: 반드시 `astimezone(kst)`를 거친 후 날짜/시간 처리를 해야 함.
