# 데이터베이스 초기화 가이드

## 🚀 실행 방법

### 1. 데이터베이스 초기화 (테이블 생성)

```bash
cd backend
python -m app.database.init_db
```

또는:

```bash
cd backend
python app/database/init_db.py
```

### 2. 실행 결과

성공 시:
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

## 📋 생성된 테이블 목록

1. **`users`** - 사용자 정보 (기존)
2. **`children`** - 아이 정보
3. **`video_analyses`** - 비디오 분석 메인 테이블
4. **`development_skills`** - 발달 기술
5. **`skill_examples`** - 기술 관찰 예시
6. **`safety_incidents`** - 안전 사고/위험 이벤트
7. **`environment_risks`** - 환경 위험 요소
8. **`incident_summaries`** - 사고 요약 (감점 통계)
9. **`stage_evidences`** - 발달 단계 판단 근거
10. **`analysis_raw_json`** - 원본 JSON 저장
11. **`token_blacklist`** - 토큰 블랙리스트 (기존)

## ⚠️ 주의사항

- MariaDB/MySQL 서버가 실행 중이어야 합니다
- `.env` 파일에 DB 접속 정보가 정확해야 합니다
- 데이터베이스 `dailycam`이 미리 생성되어 있어야 합니다

## 🔄 테이블 재생성 (주의!)

모든 테이블을 삭제하고 다시 생성하려면:

```python
from app.models import drop_all_tables, create_all_tables

# 모든 테이블 삭제
drop_all_tables()

# 테이블 재생성
create_all_tables()
```

**⚠️ WARNING**: 이 작업은 모든 데이터를 삭제합니다!

## 📂 관련 파일

- **모델 정의**: `backend/app/models/`
  - `child.py` - Child 모델
  - `video_analysis.py` - VideoAnalysis 모델
  - `development_skill.py` - DevelopmentSkill, SkillExample 모델
  - `safety.py` - SafetyIncident, EnvironmentRisk, IncidentSummary 모델
  - `stage_evidence.py` - StageEvidence 모델
  - `raw_json.py` - AnalysisRawJson 모델
  
- **초기화 스크립트**: `backend/app/database/init_db.py`
- **DB 매퍼**: `backend/app/utils/json_to_db_mapper.py`
