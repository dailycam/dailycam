# 🚀 DailyCam 데이터베이스 & API 완전 설정 가이드

## 📋 목차
1. [데이터베이스 초기화](#1-데이터베이스-초기화)
2. [더미 데이터 생성](#2-더미-데이터-생성)
3. [서버 실행 및 테스트](#3-서버-실행-및-테스트)
4. [API 사용법](#4-api-사용법)
5. [프론트엔드 연동](#5-프론트엔드-연동)

---

## 1. 데이터베이스 초기화

### Step 1-1: 테이블 생성

```bash
cd backend
python -m app.database.init_db
```

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
  - environment_risks
  - incident_summaries
  - safety_incidents
  - skill_examples
  - stage_evidences
  - token_blacklist
  - users
  - video_analyses

================================================================================
✅ Database initialization successful!
================================================================================
```

---

## 2. 더미 데이터 생성

### Step 2-1: 아이 데이터 생성 (user_id=1 사용)

```bash
cd backend
python -m app.database.create_dummy_child
```

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
💡 You can now use this child_id for video analysis!
Example: child_id=1, user_id=1
================================================================================
```

**생성된 데이터**:
- **user_id**: 1 (기존 사용자)
- **child_id**: 1
- **이름**: 지원이
- **생년월일**: 2024-04-27 (7개월 아기)
- **성별**: F (여아)

---

## 3. 서버 실행 및 테스트

### Step 3-1: 서버 실행

```bash
cd backend
python -m uvicorn app.main:app --reload
```

**예상 출력**:
```
============================================================
🚀 DailyCam Backend 시작
============================================================

📊 데이터베이스 연결 확인 중...
[OK] MariaDB Connected: localhost:3306/dailycam
✅ 데이터베이스 연결 성공!

📋 데이터베이스 테이블 확인 중...
✅ 데이터베이스 테이블 준비 완료!

📌 사용 가능한 테이블:
   - analysis_raw_json
   - children
   - development_skills
   ...

============================================================
✨ 서버가 준비되었습니다!
   API 문서: http://localhost:8000/docs
============================================================

INFO:     Uvicorn running on http://127.0.0.1:8000
```

### Step 3-2: API 테스트 (Swagger UI)

1. 브라우저에서 `http://localhost:8000/docs` 접속
2. 다음 엔드포인트 확인:
   - **Children API** - `/api/children/children`
   - **Analysis API** - `/api/analysis/analyses`
   - **HomeCam API** - `/api/homecam/analyze-video`

---

## 4. API 사용법

### 📝 비디오 분석 + DB 저장

#### Swagger UI 사용
1. `POST /api/homecam/analyze-video` 클릭
2. "Try it out" 클릭
3. 파라미터 입력:
   ```
   video: (파일 선택)
   child_id: 1
   user_id: 1
   age_months: 7
   save_to_db: true
   ```
4. "Execute" 클릭

#### cURL 사용
```bash
curl -X POST "http://localhost:8000/api/homecam/analyze-video" \
  -F "video=@test_video.mp4" \
  -F "child_id=1" \
  -F "user_id=1" \
  -F "age_months=7" \
  -F "save_to_db=true"
```

#### 응답
```json
{
  "meta": {
    "assumed_stage": 3,
    "age_months": 7,
    "observation_duration_minutes": 0.17
  },
  "development_analysis": { ... },
  "safety_analysis": {
    "safety_score": 84,
    "overall_safety_level": "높음"
  },
  "_db_id": 1  // ← DB에 저장된 ID
}
```

### 📊 분석 결과 조회

#### 목록 조회
```bash
curl "http://localhost:8000/api/analysis/analyses?child_id=1&limit=10"
```

**응답**:
```json
{
  "total": 1,
  "items": [
    {
      "id": 1,
      "child_id": 1,
      "detected_stage": "3",
      "safety_score": 84,
      "overall_safety_level": "높음",
      "created_at": "2025-11-27T13:23:41"
    }
  ]
}
```

#### 상세 조회
```bash
curl "http://localhost:8000/api/analysis/analyses/1"
```

#### 통계 조회
```bash
curl "http://localhost:8000/api/analysis/statistics/child/1"
```

### 👶 아이 정보 조회

```bash
curl "http://localhost:8000/api/children/children?user_id=1"
```

**응답**:
```json
[
  {
    "id": 1,
    "name": "지원이",
    "birth_date": "2024-04-27",
    "gender": "F",
    "created_at": "2025-11-27T13:45:00"
  }
]
```

---

## 5. 프론트엔드 연동

### TypeScript API 클라이언트

```typescript
// api/analysis.ts

const API_BASE_URL = 'http://localhost:8000';

// 아이 목록 조회
export const getChildren = async (userId: number) => {
  const response = await fetch(
    `${API_BASE_URL}/api/children/children?user_id=${userId}`
  );
  return await response.json();
};

// 분석 결과 목록 조회
export const getAnalyses = async (
  childId: number,
  limit: number = 10,
  offset: number = 0
) => {
  const response = await fetch(
    `${API_BASE_URL}/api/analysis/analyses?child_id=${childId}&limit=${limit}&offset=${offset}`
  );
  return await response.json();
};

// 분석 상세 조회
export const getAnalysisDetail = async (analysisId: number) => {
  const response = await fetch(
    `${API_BASE_URL}/api/analysis/analyses/${analysisId}`
  );
  return await response.json();
};

// 비디오 분석 실행
export const analyzeVideo = async (
  videoFile: File,
  childId: number,
  userId: number
) => {
  const formData = new FormData();
  formData.append('video', videoFile);
  formData.append('child_id', childId.toString());
  formData.append('user_id', userId.toString());
  
  const response = await fetch(
    `${API_BASE_URL}/api/homecam/analyze-video`,
    {
      method: 'POST',
      body: formData
    }
  );
  
  return await response.json();
};
```

### React 컴포넌트 예시

```tsx
// components/AnalysisList.tsx
import { useEffect, useState } from 'react';
import { getAnalyses } from '../api/analysis';

export const AnalysisList = ({ childId }: { childId: number }) => {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadAnalyses = async () => {
      try {
        const data = await getAnalyses(childId, 10, 0);
        setAnalyses(data.items);
      } catch (error) {
        console.error('Failed to load analyses:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadAnalyses();
  }, [childId]);
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      <h2>분석 결과 ({analyses.length}건)</h2>
      {analyses.map(analysis => (
        <div key={analysis.id} className="analysis-card">
          <h3>분석 #{analysis.id}</h3>
          <p>발달 단계: {analysis.detected_stage}단계</p>
          <p>안전 점수: {analysis.safety_score}점</p>
          <p>안전도: {analysis.overall_safety_level}</p>
          <p>날짜: {new Date(analysis.created_at).toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  );
};
```

---

## ✅ 전체 플로우 확인

### 1단계: 초기 설정
```bash
# 데이터베이스 초기화
python -m app.database.init_db

# 더미 아이 데이터 생성
python -m app.database.create_dummy_child

# 서버 실행
python -m uvicorn app.main:app --reload
```

### 2단계: 비디오 분석 실행
```bash
# API로 비디오 업로드 & 분석
curl -X POST "http://localhost:8000/api/homecam/analyze-video" \
  -F "video=@test_video.mp4" \
  -F "child_id=1" \
  -F "user_id=1"
```

### 3단계: 결과 확인
```bash
# 분석 결과 목록
curl "http://localhost:8000/api/analysis/analyses?child_id=1"

# 분석 상세
curl "http://localhost:8000/api/analysis/analyses/1"

# 통계
curl "http://localhost:8000/api/analysis/statistics/child/1"
```

---

## 📁 생성된 파일 구조

```
backend/
├── app/
│   ├── api/
│   │   ├── children/
│   │   │   ├── __init__.py
│   │   │   └── router.py         ✅ 아이 API
│   │   ├── analysis/
│   │   │   ├── __init__.py
│   │   │   └── router.py         ✅ 분석 조회 API
│   │   └── homecam/
│   │       └── router.py         ✅ 비디오 분석 API (수정됨)
│   ├── models/
│   │   ├── child.py              ✅ Child 모델
│   │   ├── video_analysis.py    ✅ VideoAnalysis 모델
│   │   ├── development_skill.py ✅ DevelopmentSkill 모델
│   │   ├── safety.py             ✅ Safety 모델들
│   │   ├── stage_evidence.py    ✅ StageEvidence 모델
│   │   └── raw_json.py           ✅ RawJson 모델
│   ├── utils/
│   │   ├── json_to_txt_formatter.py  ✅ TXT 변환
│   │   └── json_to_db_mapper.py      ✅ DB 저장
│   └── database/
│       ├── init_db.py                 ✅ DB 초기화
│       └── create_dummy_child.py      ✅ 더미 데이터
└── analysis_results/                  ✅ JSON/TXT 저장
    ├── *.txt
    └── *.json
```

---

## 🎯 다음 단계

1. ✅ **완료**: 데이터베이스 설계 및 모델 생성
2. ✅ **완료**: API 엔드포인트 생성
3. ✅ **완료**: 더미 데이터 생성
4. **TODO**: 프론트엔드에서 API 호출하여 UI에 표시
5. **TODO**: 실제 사용자 아이 데이터 CRUD API 추가

---

## ❓ 문제 해결

### DB 연결 실패
```
❌ Database connection failed!
```
→ `.env` 파일의 DB 접속 정보 확인

### child_id가 없다는 에러
```
Cannot add or update a child row: a foreign key constraint fails
```
→ `python -m app.database.create_dummy_child` 실행

### API 404 에러
```
404 Not Found
```
→ 서버 재시작: `python -m uvicorn app.main:app --reload`

---

## 📚 참고 문서

- **API 사용 가이드**: `docs/API_USAGE_GUIDE.md`
- **DB 초기화 가이드**: `docs/database/INITIALIZATION_GUIDE.md`
- **DB 사용 가이드**: `docs/database_usage_guide.md`
- **JSON 샘플**: `docs/gemini_json_samples.md`
