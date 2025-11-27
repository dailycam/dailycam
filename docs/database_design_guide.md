# Gemini 분석 → 데이터베이스 설계 가이드

## 📌 현재 상황 요약

### 1. Gemini API 분석 결과 JSON 확인 완료 ✅
- **문서 위치**: `docs/gemini_json_samples.md`
- **내용**:
  - 1단계 VLM 메타데이터 추출 JSON
  - 2단계 발달 단계 판단 JSON
  - 3단계 최종 상세 분석 JSON

### 2. 프롬프트 TXT 파일 구조 확인 완료 ✅
- **문서 위치**: `docs/gemini_prompts_structure.md`
- **내용**:
  - VLM 메타데이터 추출 프롬프트 (`vlm_metadata.ko.txt`)
  - 발달 단계 판단 프롬프트 (`header.ko.txt`)
  - 단계별 프롬프트 (stage_01 ~ stage_06)
  - 공통 프롬프트 (input_premise, field_definitions, safety_rules 등)
  - 프롬프트 조합 방식

### 3. 기존 스키마 발견 ✅
- **파일**: `backend/app/schema/baby_dev_safety.schema.json`
- **구조**:
  ```json
  {
    "meta": { ... },
    "stage_consistency": { ... },
    "development_analysis": {
      "summary": "...",
      "skills": [...],
      "next_stage_signs": [...]
    },
    "safety_analysis": {
      "overall_safety_level": "...",
      "adult_presence": "...",
      "environment_risks": [...],
      "critical_events": [...],
      "incident_events": [...],
      "incident_summary": [...],
      "safety_score": 100
    }
  }
  ```

---

## 🔍 Gemini JSON vs 기존 스키마 비교

### 일치하는 부분
| 항목 | Gemini JSON | 기존 스키마 | 상태 |
|------|-------------|-------------|------|
| `meta` | ✅ | ✅ | **동일** |
| `development_analysis.summary` | ✅ | ✅ | **동일** |
| `development_analysis.skills` | ✅ | ✅ | **동일** |
| `development_analysis.next_stage_signs` | ✅ | ✅ | **동일** |
| `safety_analysis.safety_score` | ✅ | ✅ | **동일** |
| `safety_analysis.overall_safety_level` | ✅ | ✅ | **동일** |
| `safety_analysis.incident_events` | ✅ | ✅ | **동일** |
| `safety_analysis.critical_events` | ✅ | ✅ | **동일** |
| `safety_analysis.incident_summary` | ✅ | ✅ | **동일** |
| `safety_analysis.environment_risks` | ✅ | ✅ | **동일** |
| `stage_consistency` | ❌ | ✅ | **기존에만** |

### Gemini에만 있는 추가 항목
| 항목 | 설명 |
|------|------|
| `stage_determination` | 발달 단계 판단 결과 (2단계 출력) |
| `_extracted_metadata` | 1단계 VLM 메타데이터 원본 전체 |
| `meta.video_quality` | 비디오 화질 |
| `meta.child_visibility` | 아이 가시성 |
| `meta.environment_type` | 환경 유형 |
| `adult_interactions` | 보호자 상호작용 기록 (타임라인) |

---

## 💡 데이터베이스 설계 방향

### 옵션 1: 기존 스키마 기반 + Gemini 추가 필드 (권장)
기존 `baby_dev_safety.schema.json` 구조를 유지하면서 Gemini의 추가 필드를 보완하는 방식

#### 주요 테이블 구조:
```
1. video_analyses (메인)
   - 기존 필드: meta, safety_score, overall_safety_level
   - 추가 필드: detected_stage, stage_confidence, video_quality, child_visibility

2. development_skills
   - skill_name, category, present, frequency, level
   - skill_examples (별도 테이블)

3. safety_incidents
   - event_id, severity, timestamp_range, description
   - trigger_behavior, environment_factor, has_safety_device

4. critical_events
   - event_type, timestamp, description, estimated_outcome

5. environment_risks
   - risk_type, severity, trigger_behavior, environment_factor
   - has_safety_device, safety_device_type

6. stage_determination (신규)
   - detected_stage, confidence, evidence, alternative_stages

7. adult_interactions (신규)
   - timestamp, interaction_type, description

8. analysis_raw_json (신규)
   - vlm_metadata_json, stage_determination_json, final_analysis_json
```

### 옵션 2: Gemini JSON을 그대로 저장
JSON 전체를 `analysis_raw_json` 테이블에 저장하고, 주요 필드만 별도 테이블로 추출

#### 장점:
- 구현 간단
- 모든 데이터 보존
- 유연성 높음

#### 단점:
- 쿼리 성능 낮음
- 통계/집계 어려움

---

## 📝 다음 단계

### 1. 데이터베이스 스키마 확정
- [ ] 기존 스키마 리뷰
- [ ] Gemini JSON 매핑 확인
- [ ] 추가 필드 결정
- [ ] 인덱스 전략 수립

### 2. 테이블 생성
- [ ] 메인 테이블 (`video_analyses`)
- [ ] 발달 분석 테이블 (`development_skills`, `skill_examples`)
- [ ] 안전 분석 테이블 (`safety_incidents`, `critical_events`, `environment_risks`)
- [ ] 보조 테이블 (`stage_determination`, `adult_interactions`)
- [ ] JSON 저장 테이블 (`analysis_raw_json`)

### 3. 데이터 삽입 로직 구현
- [ ] Gemini JSON → DB 테이블 매핑 함수
- [ ] 트랜잭션 처리
- [ ] 에러 핸들링

---

## 📂 생성된 문서

1. **`docs/gemini_json_samples.md`**
   - Gemini API 실제 JSON 응답 샘플 (1/2/3단계)
   - 데이터 크기 정보
   
2. **`docs/gemini_prompts_structure.md`**
   - 프롬프트 TXT 파일 구조 및 내용
   - 프롬프트 조합 방식
   - config.yaml 구조

3. **`docs/gemini_analysis_structure.md`**
   - 3단계 분석 프로세스 설명
   - 안전 점수 계산 로직
   - ER 다이어그램 (참고용)

4. **`docs/database/schema_gemini_analysis.sql`** (참고용)
   - 전체 테이블 SQL 스키마
   
5. **`docs/database/sample_data_gemini_analysis.sql`** (참고용)
   - 샘플 데이터 INSERT 문

6. **`docs/database/erd_gemini_analysis.md`** (참고용)
   - ER 다이어그램 (Mermaid)
   - 관계 설명

---

## 🎯 결론

### 즉시 확인 가능한 것:
1. ✅ **Gemini JSON 응답 구조** → `docs/gemini_json_samples.md`
2. ✅ **프롬프트 TXT 파일 내용** → `docs/gemini_prompts_structure.md`
3. ✅ **기존 스키마** → `backend/app/schema/baby_dev_safety.schema.json`

### 다음 작업:
1. **기존 더미 데이터 구조 확인** (어디에 있는지 알려주세요)
2. **테이블 설계 확정** (기존 구조에 맞춰 조정)
3. **데이터베이스 생성 및 마이그레이션**

---

## ❓ 질문사항

1. **더미 데이터 위치**: 현재 더미 데이터가 어디에 있나요?
   - 파일 형식? (JSON, SQL, Python dict?)
   - 위치는?

2. **데이터베이스 종류**: MySQL? PostgreSQL? SQLite?

3. **우선순위**: 어떤 테이블부터 만들어야 하나요?
   - 전체 다 필요한가요?
   - 아니면 핵심 테이블만?
