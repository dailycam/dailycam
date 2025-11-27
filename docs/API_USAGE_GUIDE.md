# API 사용 가이드 - 프론트엔드 연동

## 🚀 시작하기

### 1. 데이터베이스 초기화

```bash
cd backend
python -m app.database.init_db
```

### 2. 더미 아이 데이터 생성

```bash
cd backend
python -m app.database.create_dummy_child
```

**결과**:
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

### 3. 서버 실행

```bash
cd backend
python -m uvicorn app.main:app --reload
```

---

## 📡 API 엔드포인트

### Children API

#### 아이 목록 조회
```http
GET /api/children/children?user_id=1
```

**응답**:
```json
[
  {
    "id": 1,
    "name": "지원이",
    "birth_date": "2024-04-27",
    "gender": "F",
    "profile_image_url": null,
    "created_at": "2025-11-27T13:45:00"
  }
]
```

#### 특정 아이 조회
```http
GET /api/children/children/1
```

---

### Analysis API

#### 비디오 분석 실행 (DB 저장)
```http
POST /api/homecam/analyze-video
Content-Type: multipart/form-data

{
  "video": (binary),
  "child_id": 1,
  "user_id": 1,
  "age_months": 7,
  "save_to_db": true
}
```

**응답**:
```json
{
  "meta": { ... },
  "development_analysis": { ... },
  "safety_analysis": { ... },
  "_db_id": 1  // ← DB에 저장된 ID
}
```

#### 분석 결과 목록 조회
```http
GET /api/analysis/analyses?child_id=1&limit=10&offset=0
```

**응답**:
```json
{
  "total": 15,
  "limit": 10,
  "offset": 0,
  "items": [
    {
      "id": 1,
      "child_id": 1,
      "detected_stage": "3",
      "assumed_stage": "3",
      "age_months": 7,
      "safety_score": 84,
      "overall_safety_level": "높음",
      "match_level": "약간빠름",
      "video_quality": "좋음",
      "environment_type": "침실",
      "observation_duration_minutes": 0.17,
      "created_at": "2025-11-27T13:23:41"
    },
    ...
  ]
}
```

#### 분석 결과 상세 조회
```http
GET /api/analysis/analyses/1
```

**응답**:
```json
{
  "id": 1,
  "child_id": 1,
  "user_id": 1,
  "video": {
    "file_path": "test_video.mp4",
    "duration_seconds": 10.0,
    "quality": "좋음",
    "environment_type": "침실"
  },
  "stage": {
    "detected_stage": "3",
    "confidence": "중간",
    "age_months": 7,
    "match_level": "약간빠름"
  },
  "safety": {
    "score": 84,
    "level": "높음",
    "adult_presence": "거의없음"
  },
  "development": {
    "summary": "아이는 전반적으로 7개월 영아에게...",
    "skills": [
      {
        "name": "침대에서 안전하게 내려오기",
        "category": "대근육운동",
        "present": true,
        "frequency": 1,
        "level": "숙련",
        "examples": [
          {
            "timestamp": "00:00:03",
            "description": "침대에서 머리부터..."
          }
        ]
      }
    ]
  },
  "safety_incidents": [...],
  "environment_risks": [...],
  "incident_summaries": [...]
}
```

#### 발달 기술만 조회
```http
GET /api/analysis/analyses/1/skills?category=대근육운동
```

#### 안전 분석만 조회
```http
GET /api/analysis/analyses/1/safety
```

#### 아이 통계 조회
```http
GET /api/analysis/statistics/child/1
```

**응답**:
```json
{
  "child_id": 1,
  "total_analyses": 15,
  "average_safety_score": 82.5,
  "stage_distribution": {
    "3": 12,
    "4": 3
  },
  "latest_analysis": {
    "id": 15,
    "detected_stage": "3",
    "safety_score": 84,
    "created_at": "2025-11-27T13:23:41"
  }
}
```

---

## 💻 프론트엔드 코드 예시

### React/TypeScript

```typescript
// api/analysis.ts

export interface AnalysisListItem {
  id: number;
  child_id: number;
  detected_stage: string;
  safety_score: number;
  overall_safety_level: string;
  created_at: string;
}

export interface AnalysisList {
  total: number;
  items: AnalysisListItem[];
}

// 분석 결과 목록 조회
export const getAnalyses = async (
  childId: number,
  limit: number = 10,
  offset: number = 0
): Promise<AnalysisList> => {
  const response = await fetch(
    `/api/analysis/analyses?child_id=${childId}&limit=${limit}&offset=${offset}`
  );
  return await response.json();
};

// 분석 결과 상세 조회
export const getAnalysisDetail = async (
  analysisId: number,
  includeRawJson: boolean = false
) => {
  const response = await fetch(
    `/api/analysis/analyses/${analysisId}?include_raw_json=${includeRawJson}`
  );
  return await response.json();
};

// 아이 목록 조회
export const getChildren = async (userId: number) => {
  const response = await fetch(`/api/children/children?user_id=${userId}`);
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
  
  const response = await fetch('/api/homecam/analyze-video', {
    method: 'POST',
    body: formData
  });
  
  return await response.json();
};
```

### 사용 예시

```typescript
// components/AnalysisList.tsx

import { useEffect, useState } from 'react';
import { getAnalyses } from '../api/analysis';

export const AnalysisList = ({ childId }: { childId: number }) => {
  const [analyses, setAnalyses] = useState([]);
  
  useEffect(() => {
    const loadAnalyses = async () => {
      const data = await getAnalyses(childId, 10, 0);
      setAnalyses(data.items);
    };
    loadAnalyses();
  }, [childId]);
  
  return (
    <div>
      <h2>분석 결과 ({analyses.length}건)</h2>
      {analyses.map(analysis => (
        <div key={analysis.id}>
          <h3>분석 #{analysis.id}</h3>
          <p>발달 단계: {analysis.detected_stage}단계</p>
          <p>안전 점수: {analysis.safety_score}점</p>
          <p>날짜: {new Date(analysis.created_at).toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  );
};
```

---

## 📊 데이터 플로우

```
1. 비디오 업로드
   ↓
2. Gemini 분석 실행
   ↓
3. JSON 결과 반환 + DB 저장
   ↓
4. 프론트엔드에서 목록 조회
   GET /api/analysis/analyses?child_id=1
   ↓
5. 특정 분석 상세 조회
   GET /api/analysis/analyses/{id}
```

---

## 🔧 테스트

### cURL로 테스트

```bash
# 1. 아이 목록 조회
curl "http://localhost:8000/api/children/children?user_id=1"

# 2. 비디오 분석
curl -X POST "http://localhost:8000/api/homecam/analyze-video" \
  -F "video=@test_video.mp4" \
  -F "child_id=1" \
  -F "user_id=1"

# 3. 분석 결과 목록 조회
curl "http://localhost:8000/api/analysis/analyses?child_id=1&limit=10"

# 4. 분석 상세 조회
curl "http://localhost:8000/api/analysis/analyses/1"

# 5. 통계 조회
curl "http://localhost:8000/api/analysis/statistics/child/1"
```

### Swagger UI로 테스트

1. `http://localhost:8000/docs` 접속
2. 각 엔드포인트 클릭하여 테스트

---

## 📌 주의사항

1. **child_id는 필수**: 비디오 분석 시 child_id가 반드시 필요합니다
2. **user_id 매칭**: child의 user_id와 요청의 user_id가 일치해야 합니다
3. **페이지네이션**: 분석 결과가 많을 경우 limit, offset 사용
4. **원본 JSON**: 디버깅 목적으로만 `include_raw_json=true` 사용 (용량 큼)
