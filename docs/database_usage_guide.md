# Gemini 분석 결과 DB 저장 완전 가이드

## 📌 전체 흐름

```
1. 비디오 업로드 → 2. Gemini 분석 → 3. JSON 파싱 → 4. DB 저장 → 5. 프론트엔드 연동
```

---

## 🗄️ 1. 데이터베이스 초기화

### 테이블 생성

```bash
cd backend
python -m app.database.init_db
```

**생성되는 테이블**:
- `users` - 사용자
- `children` - 아이 정보
- `video_analyses` - 비디오 분석 메인
- `development_skills`, `skill_examples` - 발달 기술
- `safety_incidents`, `environment_risks`, `incident_summaries` - 안전
- `stage_evidences` - 단계 판단 근거
- `analysis_raw_json` - 원본 JSON

---

## 📤 2. API 사용법

### 비디오 분석 + DB 저장

```python
import requests

url = "http://localhost:8000/api/homecam/analyze-video"

files = {"video": open("test_video.mp4", "rb")}

data = {
    "child_id": 1,        # 필수: 아이 ID
    "user_id": 1,         # 필수: 사용자 ID
    "age_months": 7,      # 선택: 개월 수
    "stage": None,        # 선택: None이면 자동 판단
    "save_to_db": True    # DB 저장 여부
}

response = requests.post(url, files=files, data=data)
result = response.json()

print(f"분석 완료! DB ID: {result.get('_db_id')}")
```

### Swagger UI 사용

1. `http://localhost:8000/docs` 접속
2. `POST /api/homecam/analyze-video` 클릭
3. 필수 파라미터 입력:
   - `video`: 파일 선택
   - `child_id`: 아이 ID
   - `user_id`: 사용자 ID
4. Execute 클릭

---

## 💾 3. DB 저장 프로세스

### 저장 흐름

```python
# backend/app/api/homecam/router.py

# 1. Gemini 분석
result = await gemini_service.analyze_video_vlm(...)

# 2. JSON to DB 매핑
saved_analysis = db_mapper.save_analysis_to_db(
    db=db,
    child_id=child_id,
    user_id=user_id,
    analysis_data=result,
    video_file_path=video.filename,
    video_file_size=len(video_content)
)

# 3. DB ID 반환
result["_db_id"] = saved_analysis.id
```

### 저장되는 데이터

#### video_analyses (메인)
```sql
INSERT INTO video_analyses (
  child_id, user_id, detected_stage, safety_score,
  video_quality, environment_type, development_summary, ...
) VALUES (...)
```

#### development_skills
```sql
-- 각 기술마다 레코드 생성
INSERT INTO development_skills (
  analysis_id, skill_name, category, present, frequency, level
) VALUES (...)
```

#### skill_examples
```sql
-- 각 기술의 예시마다 레코드 생성
INSERT INTO skill_examples (
  skill_id, timestamp, example_description
) VALUES (...)
```

#### safety_incidents
```sql
-- 각 안전 사고마다 레코드 생성
INSERT INTO safety_incidents (
  analysis_id, event_id, severity, description, ...
) VALUES (...)
```

#### analysis_raw_json
```sql
-- 원본 JSON 전체 저장
INSERT INTO analysis_raw_json (
  analysis_id, vlm_metadata_json, stage_determination_json, final_analysis_json
) VALUES (...)
```

---

## 🔍 4. 데이터 조회

### 최근 분석 결과 조회

```python
from app.database import SessionLocal
from app.models import VideoAnalysis

db = SessionLocal()

# 특정 아이의 최근 분석 10개
analyses = db.query(VideoAnalysis)\
    .filter(VideoAnalysis.child_id == 1)\
    .order_by(VideoAnalysis.created_at.desc())\
    .limit(10)\
    .all()

for analysis in analyses:
    print(f"ID: {analysis.id}")
    print(f"Stage: {analysis.detected_stage}")
    print(f"Safety Score: {analysis.safety_score}")
    print(f"Skills: {len(analysis.skills)}")
    print("---")
```

### 발달 기술 조회

```python
from app.models import DevelopmentSkill

# 특정 분석의 모든 기술
skills = db.query(DevelopmentSkill)\
    .filter(DevelopmentSkill.analysis_id == 1)\
    .all()

for skill in skills:
    print(f"{skill.skill_name} ({skill.category}): {skill.level}")
    for example in skill.examples:
        print(f"  - {example.timestamp}: {example.example_description}")
```

### 안전 사고 조회

```python
from app.models import SafetyIncident

# 심각도별 조회
incidents = db.query(SafetyIncident)\
    .filter(SafetyIncident.severity == "주의")\
    .all()
```

---

## 🔗 5. 프론트엔드 연동

### API 엔드포인트

```typescript
// frontend/src/api/analysis.ts

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

// 사용
const result = await analyzeVideo(file, 1, 1);
console.log('DB ID:', result._db_id);
```

### 분석 결과 목록 조회 API (TODO)

```python
# backend/app/api/homecam/router.py

@router.get("/analyses")
async def get_analyses(
    child_id: int = Query(...),
    limit: int = Query(10),
    db: Session = Depends(get_db)
):
    """아이의 분석 결과 목록 조회"""
    analyses = db.query(VideoAnalysis)\
        .filter(VideoAnalysis.child_id == child_id)\
        .order_by(VideoAnalysis.created_at.desc())\
        .limit(limit)\
        .all()
    
    return {
        "total": len(analyses),
        "items": [
            {
                "id": a.id,
                "detected_stage": a.detected_stage,
                "safety_score": a.safety_score,
                "created_at": a.created_at.isoformat()
            }
            for a in analyses
        ]
    }
```

---

## 📊 6. 프롬프트 수정이 필요한 경우

### 필드가 누락되는 경우

**증상**: DB에 NULL 값이 많이 저장됨

**해결**:

1. **JSON 확인**: `analysis_results/raw_*.json` 파일 확인
2. **프롬프트 수정**: 
   - `backend/app/prompts/baby_dev_safety/common/field_definitions.ko.txt`
   - 또는 각 단계별 프롬프트 파일(`stage_01_0-2m.ko.txt` 등)
3. **매퍼 수정**: `backend/app/utils/json_to_db_mapper.py`에서 매핑 로직 조정

### 예시: risk_type 필드 추가

#### 1. 프롬프트 파일 수정

```txt
# backend/app/prompts/baby_dev_safety/common/safety_rules.ko.txt

[incident_events 필드 정의]
- event_id: "E001", "E002" 형식
- severity: "사고발생" | "위험" | "주의" | "권장"
- risk_type: "낙상" | "충돌" | "전기" | "화상" | "질식" | "기타"  # ← 추가
- description: 상황 설명
```

#### 2. 매퍼 수정 (필요한 경우)

```python
# backend/app/utils/json_to_db_mapper.py

@staticmethod
def _save_safety_incidents(db: Session, analysis_id: int, incidents: list):
    for inc_data in incidents:
        incident = SafetyIncident(
            analysis_id=analysis_id,
            event_id=inc_data.get("event_id"),
            severity=inc_data.get("severity"),
            risk_type=inc_data.get("risk_type"),  # ← 이 필드가 JSON에 있으면 자동 매핑
            ...
        )
        db.add(incident)
```

---

## 🧪 7. 테스트

### 전체 프로세스 테스트

```bash
# 1. DB 초기화
python -m app.database.init_db

# 2. 서버 실행
python -m uvicorn app.main:app --reload

# 3. API 테스트
curl -X POST "http://localhost:8000/api/homecam/analyze-video" \
  -F "video=@test_video.mp4" \
  -F "child_id=1" \
  -F "user_id=1"

# 4. 결과 확인
- analysis_results/*.txt (TXT)
- analysis_results/*.json (원본 JSON)
- MariaDB dailycam database (테이블 확인)
```

---

## ⚠️ 문제 해결

### DB 연결 실패
```
❌ Database connection failed!
```
→ `.env` 파일의 DB 접속 정보 확인

### child_id가 없다는 에러
```
Cannot add or update a child row: a foreign key constraint fails
```
→ `children` 테이블에 child_id가 먼저 존재해야 함

### JSON 파싱 에러
```
JSON 파싱 실패: Expecting value
```
→ `analysis_results/raw_*.json` 파일 확인하여 Gemini 응답 점검

---

## 📚 참고 문서

- **JSON 샘플**: `docs/gemini_json_samples.md`
- **프롬프트 구조**: `docs/gemini_prompts_structure.md`
- **DB 초기화**: `docs/database/INITIALIZATION_GUIDE.md`
- **테스트 가이드**: `docs/testing_json_to_txt.md`
