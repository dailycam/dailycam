# 📚 DailyCam 데이터베이스 완전 가이드

> **통합 가이드**: 데이터베이스 생성부터 실제 데이터 사용까지 모든 과정을 한 곳에서 확인하세요.

---

## 📑 목차

1. [빠른 시작](#1-빠른-시작-5분)
2. [데이터베이스 초기 설정](#2-데이터베이스-초기-설정)
3. [기존 분석 결과 Import](#3-기존-분석-결과-import)
4. [API 사용법](#4-api-사용법)
5. [프론트엔드 연동](#5-프론트엔드-연동)
6. [문제 해결](#6-문제-해결)

---

## 1. 빠른 시작 (5분)

### 전체 프로세스

```bash
# 1. 데이터베이스 초기화
cd backend
python -m app.database.init_db

# 2. 더미 아이 데이터 생성
python -m app.database.create_dummy_child

# 3. 기존 분석 결과 Import (선택사항)
python -m app.database.import_existing_analyses

# 4. 서버 실행
python -m uvicorn app.main:app --reload
```

**완료!** 🎉 이제 프론트엔드에서 실제 DB 데이터를 사용할 수 있습니다.

---

## 2. 데이터베이스 초기 설정

### 2.1 테이블 생성

```bash
cd backend
python -m app.database.init_db
```

**생성되는 테이블** (11개):
- `users` - 사용자 정보
- `children` - 아이 정보
- `video_analyses` - 비디오 분석 메인
- `development_skills` - 발달 기술
- `skill_examples` - 기술 예시
- `safety_incidents` - 안전 사고
- `environment_risks` - 환경 위험
- `incident_summaries` - 사고 요약
- `stage_evidences` - 단계 판단 근거
- `analysis_raw_json` - 원본 JSON
- `token_blacklist` - 토큰 블랙리스트

**예상 출력**:
```
================================================================================
DailyCam Database Initialization
================================================================================
Database: dailycam

Step 1: Testing database connection...
[OK] MariaDB Connected: localhost:3306/dailycam

Step 2: Creating tables...
✅ Table creation completed!

Created tables:
  - analysis_raw_json
  - children
  - development_skills
  ...

================================================================================
✅ Database initialization successful!
================================================================================
```

### 2.2 더미 아이 데이터 생성

```bash
python -m app.database.create_dummy_child
```

**생성되는 데이터**:
- user_id: 1 (기존 사용자: 강지원)
- child_id: 1
- 이름: 지원이
- 생년월일: 2024-04-27 (7개월)
- 성별: F

**예상 출력**:
```
================================================================================
Creating Dummy Child Data
================================================================================

✅ Found user: 강지원 (jangsung0031@gmail.com)
Creating dummy child data...

✅ Dummy child data created successfully!

Child ID: 1
Name: 지원이
Birth Date: 2024-04-27
Gender: F
User ID: 1
================================================================================
```

---

## 3. 기존 분석 결과 Import

### 3.1 자동 Import

```bash
python -m app.database.import_existing_analyses
```

**동작 방식**:
- `backend/analysis_results/` 폴더의 `raw_stage*_final_*.json` 파일들을 찾음
- 각 JSON을 파싱하여 DB에 저장
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
  ✅ Saved with ID: 1
     - Safety Score: 86
     - Skills: 8
     - Incidents: 3

Processing: raw_stage3_final_20251127_132341.json
  Stage: 3
  ✅ Saved with ID: 2
     - Safety Score: 84
     - Skills: 12
     - Incidents: 5

================================================================================
✅ Successfully imported 2/2 analyses
================================================================================
```

### 3.2 데이터 확인

```sql
-- MariaDB 접속
mysql -u root -p dailycam

-- 분석 데이터 확인
SELECT id, child_id, detected_stage, safety_score, created_at 
FROM video_analyses;

-- 발달 기술 확인
SELECT skill_name, category, level 
FROM development_skills 
WHERE analysis_id = 1;
```

---

## 4. API 사용법

### 4.1 비디오 분석 (자동 DB 저장)

#### Swagger UI
1. `http://localhost:8000/docs` 접속
2. `POST /api/homecam/analyze-video` 클릭
3. 파라미터:
   - `video`: 파일 선택
   - `child_id`: 1 (선택사항, 기본값 1)
   - `user_id`: 1 (선택사항, 기본값 1)
   - `save_to_db`: true
4. Execute

#### cURL
```bash
curl -X POST "http://localhost:8000/api/homecam/analyze-video" \
  -F "video=@test_video.mp4" \
  -F "child_id=1" \
  -F "user_id=1"
```

**응답**:
```json
{
  "meta": {...},
  "development_analysis": {...},
  "safety_analysis": {...},
  "_db_id": 1  // ← DB에 저장된 ID
}
```

### 4.2 분석 결과 조회

#### 목록 조회
```bash
curl "http://localhost:8000/api/analysis/analyses?child_id=1&limit=10"
```

#### 상세 조회
```bash
curl "http://localhost:8000/api/analysis/analyses/1"
```

#### 통계 조회
```bash
curl "http://localhost:8000/api/analysis/statistics/child/1"
```

### 4.3 Dashboard API

```bash
curl -X POST "http://localhost:8000/api/dashboard/summary" \
  -H "Content-Type: application/json" \
  -d '{"child_id": 1, "range_days": 7}'
```

### 4.4 Analytics API

```bash
curl "http://localhost:8000/api/analytics/all?child_id=1"
```

### 4.5 Children API

```bash
# 아이 목록
curl "http://localhost:8000/api/children/children?user_id=1"

# 특정 아이
curl "http://localhost:8000/api/children/children/1"
```

---

## 5. 프론트엔드 연동

### 5.1 자동 연동 (이미 구현됨)

프론트엔드는 자동으로 백엔드 API를 호출합니다:

1. **Dashboard** → `POST /api/dashboard/summary`
2. **Analytics** → `GET /api/analytics/all`
3. **Video Analysis** → `POST /api/homecam/analyze-video`

### 5.2 데이터 흐름

```
비디오 업로드 → Gemini 분석 → DB 저장 → 프론트엔드 조회 → 화면 표시
```

### 5.3 TypeScript 예시

```typescript
// 분석 결과 목록 조회
import { getAnalyses } from './api/analysis';

const analyses = await getAnalyses(1, 10, 0);
console.log(analyses.items);

// 대시보드 데이터 조회
import { getDashboardData } from './lib/api';

const dashboard = await getDashboardData(7);
console.log(dashboard.safetyScore);
```

---

## 6. 문제 해결

### 6.1 DB 연결 실패

```
❌ Database connection failed!
```

**해결**:
1. `.env` 파일 확인
2. MariaDB 서버 실행 확인
3. 데이터베이스 `dailycam` 생성 확인

```sql
CREATE DATABASE dailycam CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 6.2 child_id Foreign Key 에러

```
Cannot add or update a child row: a foreign key constraint fails
```

**해결**:
```bash
python -m app.database.create_dummy_child
```

### 6.3 프론트엔드에서 Mock 데이터가 표시됨

**원인**: 백엔드 API 호출 실패 → Fallback to mock

**확인**:
1. 백엔드 서버 실행 중인지 확인
2. 브라우저 개발자 도구 → Network 탭 확인
3. API 응답 상태 확인

**해결**:
```bash
# 서버 재시작
cd backend
python -m uvicorn app.main:app --reload
```

### 6.4 Import 스크립트 실행 안됨

```bash
# 경로 확인
cd backend
ls analysis_results/

# 다시 실행
python -m app.database.import_existing_analyses
```

### 6.5 테이블 재생성 (주의!)

```python
# Python 인터프리터 실행
from app.models import drop_all_tables, create_all_tables

# 모든 테이블 삭제 (데이터 손실!)
drop_all_tables()

# 테이블 재생성
create_all_tables()
```

---

## 📊 주요 API 엔드포인트

| 엔드포인트 | 메서드 | 설명 | 파라미터 |
|-----------|--------|------|---------|
| `/api/homecam/analyze-video` | POST | 비디오 분석 + DB 저장 | video, child_id, user_id |
| `/api/analysis/analyses` | GET | 분석 결과 목록 | child_id, limit, offset |
| `/api/analysis/analyses/{id}` | GET | 분석 상세 조회 | analysis_id, include_raw_json |
| `/api/analysis/statistics/child/{id}` | GET | 아이 통계 | child_id |
| `/api/dashboard/summary` | POST | 대시보드 데이터 | child_id, range_days |
| `/api/analytics/all` | GET | Analytics 데이터 | child_id |
| `/api/children/children` | GET | 아이 목록 | user_id |

---

## 📁 관련 파일 위치

### 백엔드

```
backend/
├── app/
│   ├── models/                    # SQLAlchemy 모델
│   │   ├── child.py
│   │   ├── video_analysis.py
│   │   ├── development_skill.py
│   │   ├── safety.py
│   │   ├── stage_evidence.py
│   │   └── raw_json.py
│   ├── api/                       # API 엔드포인트
│   │   ├── homecam/router.py
│   │   ├── analysis/router.py
│   │   ├── children/router.py
│   │   └── dashboard/router.py
│   ├── utils/                     # 유틸리티
│   │   ├── json_to_db_mapper.py
│   │   └── json_to_txt_formatter.py
│   └── database/                  # DB 스크립트
│       ├── init_db.py
│       ├── create_dummy_child.py
│       └── import_existing_analyses.py
└── analysis_results/              # 분석 결과 파일
    ├── *.json
    └── *.txt
```

### 프론트엔드

```
frontend/
└── src/
    ├── lib/
    │   └── api.ts                # API 클라이언트
    ├── pages/
    │   ├── Dashboard.tsx
    │   ├── Analytics.tsx
    │   └── VideoAnalysisTest.tsx
    └── utils/
        └── mockData.ts           # Fallback용 Mock 데이터
```

---

## 🔄 일반적인 워크플로우

### 개발 환경 설정 (최초 1회)

```bash
# 1. DB 초기화
python -m app.database.init_db

# 2. 더미 데이터 생성
python -m app.database.create_dummy_child

# 3. 기존 분석 Import (있는 경우)
python -m app.database.import_existing_analyses

# 4. 서버 실행
python -m uvicorn app.main:app --reload
```

### 일상적인 사용

```bash
# 1. 서버 실행
cd backend
python -m uvicorn app.main:app --reload

# 2. 프론트엔드 실행
cd frontend
npm run dev

# 3. 비디오 분석
# - 브라우저: http://localhost:5173
# - Video Analysis 페이지에서 비디오 업로드
# - 자동으로 DB 저장됨

# 4. 결과 확인
# - Dashboard: http://localhost:5173/dashboard
# - Analytics: http://localhost:5173/analytics
```

---

## 🎯 체크리스트

설정이 완료되었는지 확인하세요:

- [ ] MariaDB 서버 실행 중
- [ ] `.env` 파일에 DB 접속 정보 설정
- [ ] 데이터베이스 `dailycam` 생성됨
- [ ] `python -m app.database.init_db` 실행 완료
- [ ] `python -m app.database.create_dummy_child` 실행 완료
- [ ] 백엔드 서버 실행 중 (`http://localhost:8000`)
- [ ] Swagger UI 접속 가능 (`http://localhost:8000/docs`)
- [ ] 프론트엔드 실행 중 (`http://localhost:5173`)
- [ ] Dashboard에서 실제 데이터 표시 확인

---

## 📚 추가 참고 자료

- **Swagger UI**: `http://localhost:8000/docs`
- **DB 스키마 정의**: `backend/app/models/`
- **API 클라이언트**: `frontend/src/lib/api.ts`

---

## 💡 팁

### 새로운 분석 추가 시

분석이 자동으로 DB에 저장되므로, 별도 작업 불필요:
```
비디오 업로드 → 분석 완료 → DB 자동 저장 → Dashboard 즉시 반영
```

### DB 데이터 확인

```bash
# Swagger UI 사용 (추천)
http://localhost:8000/docs

# 또는 cURL
curl "http://localhost:8000/api/analysis/analyses?child_id=1"

# 또는 직접 SQL
mysql -u root -p dailycam
SELECT * FROM video_analyses;
```

### 프로덕션 배포 시

1. `.env`에서 실제 DB 정보로 변경
2. `save_to_db=true` 기본값 유지
3. 정기적인 DB 백업 설정

---

**마지막 업데이트**: 2025-11-27  
**문의**: [GitHub Issues](https://github.com/your-repo/issues)
