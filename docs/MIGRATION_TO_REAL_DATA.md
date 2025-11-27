# 🔄 더미 데이터를 실제 DB 데이터로 전환하기

## 📋 개요

프론트엔드의 mock 데이터를 삭제하고, 백엔드 데이터베이스에서 실제 Gemini 분석 결과를 가져오도록 변경합니다.

---

## 🚀 Step-by-Step 가이드

### Step 1: 데이터베이스 초기화

```bash
cd backend
python -m app.database.init_db
```

### Step 2: 더미 아이 데이터 생성

```bash
python -m app.database.create_dummy_child
```

**결과**: child_id=1, user_id=1 생성됨

### Step 3: 기존 분석 결과를 DB에 저장

```bash
python -m app.database.import_existing_analyses
```

**이 스크립트가 하는 일**:
- `backend/analysis_results/` 폴더의 `raw_stage*_final_*.json` 파일들을 찾음
- 각 JSON 파일을 파싱하여 데이터베이스에 저장
- 발달 기술, 안전 사고, 환경 위험 등 모든 데이터 저장

**예상 출력**:
```
================================================================================
Importing Existing Analysis Results to Database
================================================================================

Found 2 analysis files:
  - raw_stage2_final_20251127_135752.json
  - raw_stage3_final_20251127_132341.json

Processing: raw_stage2_final_20251127_135752.json
  Stage: 2
  Video Quality: 좋음
  ✅ Saved with ID: 1
     - Safety Score: 86
     - Skills: 8
     - Incidents: 3

Processing: raw_stage3_final_20251127_132341.json
  Stage: 3
  Video Quality: 좋음
  ✅ Saved with ID: 2
     - Safety Score: 84
     - Skills: 12
     - Incidents: 5

================================================================================
✅ Successfully imported 2/2 analyses
================================================================================
```

### Step 4: 서버 재시작

```bash
# 서버가 실행 중이면 Ctrl+C로 종료 후 재시작
python -m uvicorn app.main:app --reload
```

**서버가 시작되면 다음 엔드포인트가 추가됨**:
- `POST /api/dashboard/summary` - 대시보드 데이터 (실제 DB)
- `GET /api/analytics/all` - Analytics 데이터 (실제 DB)

---

## 📊 변경사항 확인

### API 테스트

#### 1. Dashboard API
```bash
curl -X POST "http://localhost:8000/api/dashboard/summary" \
  -H "Content-Type: application/json" \
  -d '{"child_id": 1, "range_days": 7}'
```

**응답 예시**:
```json
{
  "summary": "최근 7일간 2건의 분석이 수행되었습니다. 평균 안전 점수는 85점이며...",
  "safety_score": 85,
  "incident_count": 8,
  "monitoring_hours": 0.3,
  "activity_pattern": "약간빠름",
  "weekly_trend": [
    {"day": "월", "score": 0, "incidents": 0},
    ...
    {"day": "수", "score": 85, "incidents": 8}
  ],
  "risks": [...],
  "recommendations": [...]
}
```

#### 2. Analytics API
```bash
curl "http://localhost:8000/api/analytics/all?child_id=1"
```

#### 3. Analysis List API
```bash
curl "http://localhost:8000/api/analysis/analyses?child_id=1"
```

---

## 🎨 프론트엔드 변경 사항

### 자동 적용됨 ✅

프론트엔드는 이미 백엔드 API를 호출하도록 구현되어 있습니다:

1. **Dashboard.tsx** - `getDashboardData()` 호출
   - 백엔드 `/api/dashboard/summary` 호출
   - 실패 시에만 mock 데이터로 fallback

2. **Analytics.tsx** - `fetchAnalyticsData()` 호출
   - 백엔드 `/api/analytics/all` 호출
   - 실패 시에만 mock 데이터로 fallback

3. **VideoAnalysisTest.tsx** - `analyzeVideoWithBackend()` 호출
   - 분석 완료 후 자동으로 DB에 저장 (`save_to_db=true`)

### 작동 방식

```
프론트엔드 → 백엔드 API 호출 → DB에서 실제 데이터 조회 → 화면 표시
              ↓ (실패 시)
            Mock 데이터로 Fallback
```

---

## 📁 데이터 흐름

### 비디오 분석 → DB 저장 → 화면 표시

1. **비디오 업로드 & 분석**
   ```
   프론트엔드 → POST /api/homecam/analyze-video
              → Gemini 분석
              → DB 저장 (자동)
              → JSON 응답
   ```

2. **대시보드 조회**
   ```
   프론트엔드 → POST /api/dashboard/summary
              → DB에서 분석 데이터 집계
              → 요약 정보 반환
              → 화면 표시
   ```

3. **Analytics 조회**
   ```
   프론트엔드 → GET /api/analytics/all
              → DB에서 7일간 데이터 조회
              → 차트 데이터 생성
              → 화면 표시
   ```

---

## ✅ 확인사항

### 1. DB 데이터 확인

```sql
-- MariaDB에 접속
mysql -u root -p dailycam

-- 분석 데이터 확인
SELECT id, child_id, detected_stage, safety_score, created_at 
FROM video_analyses;

-- 발달 기술 확인
SELECT a.id, skill_name, category, level 
FROM development_skills s
JOIN video_analyses a ON s.analysis_id = a.id
LIMIT 10;

-- 안전 사고 확인
SELECT a.id, severity, description, timestamp_start
FROM safety_incidents s
JOIN video_analyses a ON s.analysis_id = a.id
LIMIT 10;
```

### 2. 프론트엔드 확인

1. **Dashboard 페이지**
   - 브라우저: `http://localhost:5173/dashboard`
   - 개발자 도구 확인: 네트워크 탭에서 `/api/dashboard/summary` 호출 확인
   - 실제 DB 데이터가 표시되는지 확인

2. **Analytics 페이지**
   - 브라우저: `http://localhost:5173/analytics`
   - 네트워크 탭에서 `/api/analytics/all` 호출 확인

3. **Video Analysis 페이지**
   - 새 비디오 분석 실행
   - 분석 완료 후 응답에 `_db_id` 포함 확인
   - Dashboard에서 새 분석 데이터 반영 확인

---

## 🐛 문제 해결

### Mock 데이터가 계속 표시되는 경우

**원인**: 백엔드 API 호출 실패 → Fallback to mock data

**해결**:
1. 백엔드 서버가 실행 중인지 확인
2. 브라우저 개발자 도구 → Network 탭에서 API 요청 확인
3. 에러 메시지 확인

### DB에 데이터가 없는 경우

```bash
# 다시 import
python -m app.database.import_existing_analyses

# 또는 새로운 비디오 분석 실행
```

### 분석 결과가 DB에 저장되지 않는 경우

API 호출 시 `save_to_db=true` 확인:
```typescript
// api.ts에서
formData.append('save_to_db', 'true')
```

---

## 📈 다음 단계

### 1. Mock 데이터 완전 제거 (선택사항)

Mock 데이터는 fallback으로 남겨두는 것을 권장하지만, 완전히 제거하려면:

```bash
# mockData.ts 삭제
rm frontend/src/utils/mockData.ts

# api.ts에서 fallback 로직 제거
# getDashboardData() 함수에서 catch 블록 제거
```

### 2. 추가 기능 개발

- [ ] 사용자별 여러 아이 지원
- [ ] 분석 결과 필터링 (날짜, 단계별)
- [ ] 상세 리포트 페이지
- [ ] 비교 기능 (이전 분석과 비교)

### 3. 성능 최적화

- [ ] DB 쿼리 최적화
- [ ] 데이터 캐싱
- [ ] 페이지네이션

---

## 📚 관련 파일

### Backend
- `backend/app/api/dashboard/router.py` - Dashboard API (신규)
- `backend/app/api/analysis/router.py` - Analysis API
- `backend/app/api/children/router.py` - Children API
- `backend/app/database/import_existing_analyses.py` - 데이터 import 스크립트

### Frontend
- `frontend/src/lib/api.ts` - API 클라이언트
- `frontend/src/pages/Dashboard.tsx` - Dashboard 페이지
- `frontend/src/pages/Analytics.tsx` - Analytics 페이지
- `frontend/src/utils/mockData.ts` - Mock 데이터 (Fallback용)

---

## 🎯 요약

1. ✅ **DB 초기화** → `python -m app.database.init_db`
2. ✅ **더미 아이 생성** → `python -m app.database.create_dummy_child`
3. ✅ **기존 분석 import** → `python -m app.database.import_existing_analyses`
4. ✅ **서버 재시작** → `python -m uvicorn app.main:app --reload`
5. ✅ **프론트엔드 확인** → `http://localhost:5173/dashboard`

이제 프론트엔드는 **실제 Gemini 분석 결과**를 DB에서 가져와서 표시합니다! 🎉
