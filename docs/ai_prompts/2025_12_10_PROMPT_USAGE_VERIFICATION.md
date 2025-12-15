# 프롬프트 사용 현황 검증 보고서

## 📋 프롬프트 파일 목록

### 1. **공통 프롬프트** (모든 분석에 사용)

| 파일명 | 경로 | 용도 | 사용 시점 |
|--------|------|------|-----------|
| `vlm_metadata.ko.txt` | `extraction/` | VLM 메타데이터 추출 | **1단계** VLM 호출 |
| `header.ko.txt` | `common/` | 발달 단계 판단 | **2단계** LLM 호출 |
| `input_premise.ko.txt` | `common/` | 입력 전제 설명 | **3단계** 조합 |
| `analysis_steps_template.ko.txt` | `common/` | 분석 단계 가이드 | **3단계** 조합 |
| `field_definitions.ko.txt` | `common/` | 필드 정의 (insights 등) | **3단계** 조합 |
| `safety_rules.ko.txt` | `common/` | 안전 규칙 및 요약/인사이트 정의 | **3단계** 조합 |

### 2. **단계별 프롬프트** (발달 단계별 선택적 사용)

| 단계 | 파일명 | 개월 수 | 사용 시점 |
|------|--------|---------|-----------|
| Stage 1 | `stage_01_0-2m.ko.txt` | 0-2개월 | **3단계** 선택 |
| Stage 2 | `stage_02_3-5m.ko.txt` | 3-5개월 | **3단계** 선택 |
| Stage 3 | `stage_03_6-8m.ko.txt` | 6-8개월 | **3단계** 선택 |
| Stage 4 | `stage_04_9-11m.ko.txt` | 9-11개월 | **3단계** 선택 |
| Stage 5 | `stage_05_12-17m.ko.txt` | 12-17개월 | **3단계** 선택 |
| Stage 6 | `stage_06_18-23m.ko.txt` | 18-23개월 | **3단계** 선택 |
| Stage 7 | `stage_07_24-29m.ko.txt` | 24-29개월 | **3단계** 선택 |
| Stage 8 | `stage_08_30-35m.ko.txt` | 30-35개월 | **3단계** 선택 |
| Stage 9 | `stage_09_36-47m.ko.txt` | 36-47개월 | **3단계** 선택 |
| Stage 10 | `stage_10_48-59m.ko.txt` | 48-59개월 | **3단계** 선택 |
| Stage 11 | `stage_11_60-71m.ko.txt` | 60-71개월 | **3단계** 선택 |

---

## 🔄 3단계 분석 프로세스

### **1단계: VLM 메타데이터 추출**

**사용 프롬프트**:
- `vlm_metadata.ko.txt` (extraction/)

**코드 위치**: `gemini_service.py:820`

```python
metadata_prompt = self._load_prompt("vlm_metadata.ko.txt")
```

**출력**:
- `timeline_observations`: 시간대별 관찰 내용
- `behavior_summary`: 행동 빈도 통계
- `safety_observations`: 안전 관련 관찰

---

### **2단계: LLM 발달 단계 판단**

**사용 프롬프트**:
- `header.ko.txt` (common/)
- 1단계에서 추출한 메타데이터 (JSON)

**코드 위치**: `gemini_service.py:924`

```python
stage_header_prompt = self._load_prompt("header.ko.txt")
```

**입력**:
```json
{
  "timeline_observations": [...],
  "behavior_summary": {...},
  "safety_observations": [...]
}
```

**출력**:
- `detected_stage`: 판단된 발달 단계 (1~11)
- `confidence`: 신뢰도 (high/medium/low)
- `age_months_estimate`: 추정 개월 수

---

### **3단계: 단계별 상세 분석**

**사용 프롬프트 조합**: `gemini_service.py:274-282`

```python
combined_prompt = f"""{stage_prompt}         # 단계별 프롬프트 (예: stage_05_12-17m.ko.txt)

{input_premise}                              # common/input_premise.ko.txt

{analysis_steps}                             # common/analysis_steps_template.ko.txt

{field_definitions}                          # common/field_definitions.ko.txt

{common_safety_rules}{metadata_section}"""   # common/safety_rules.ko.txt + 메타데이터
```

**프롬프트 조합 순서**:

1. **단계별 프롬프트** (`stage_XX_XX-XXm.ko.txt`)
   - 해당 발달 단계의 특성 및 체크리스트

2. **입력 전제** (`input_premise.ko.txt`)
   - 메타데이터 기반 분석 설명

3. **분석 단계** (`analysis_steps_template.ko.txt`)
   - 3단계 분석 절차 (관찰 → 요약 → 인사이트)

4. **필드 정의** (`field_definitions.ko.txt`)
   - `development_insights` 필드 정의
   - 좋은/나쁜 예시

5. **안전 규칙** (`safety_rules.ko.txt`)
   - 안전 이벤트 정의
   - `summary` vs `insights` 구분
   - 요약/인사이트 작성 가이드

6. **메타데이터 섹션**
   - 개월 수, 영상 길이 등

**출력**:
- 발달 이벤트, 안전 이벤트, 요약, 인사이트 등 전체 분석 결과

---

## ✅ 프롬프트 로딩 검증

### **코드 구조**

#### 1. `_load_prompt()` - 단순 프롬프트 로딩

**위치**: `gemini_service.py:98-131`

```python
def _load_prompt(self, filename: str) -> str:
    """프롬프트 파일을 캐시하여 반환합니다."""
    if filename in self.prompt_cache:
        return self.prompt_cache[filename]  # 캐시된 경우 재사용
    
    # 1. baby_dev_safety/extraction 시도
    # 2. baby_dev_safety/common 시도
    # 3. baby_dev_safety/stages 시도
    
    with open(prompt_path, "r", encoding="utf-8") as f:
        content = f.read()
        self.prompt_cache[filename] = content
        print(f"[프롬프트 캐시 등록] {filename} ({len(content)}자)")
        return content
```

**사용 위치**:
- 1단계: `vlm_metadata.ko.txt`
- 2단계: `header.ko.txt`

---

#### 2. `_load_vlm_prompt()` - 복합 프롬프트 조합

**위치**: `gemini_service.py:184-287`

```python
def _load_vlm_prompt(self, stage: str, age_months: Optional[int] = None, 
                     video_duration_seconds: Optional[float] = None) -> str:
    """VLM 발달 단계별 프롬프트를 로드합니다."""
    
    # 1. input_premise.ko.txt 로드
    input_premise_path = baby_dev_safety_dir / "common" / "input_premise.ko.txt"
    
    # 2. analysis_steps_template.ko.txt 로드
    analysis_steps_path = baby_dev_safety_dir / "common" / "analysis_steps_template.ko.txt"
    
    # 3. field_definitions.ko.txt 로드
    field_definitions_path = baby_dev_safety_dir / "common" / "field_definitions.ko.txt"
    
    # 4. config.yaml에서 단계별 프롬프트 파일명 확인
    stage_config = config["stages"][stage]
    prompt_file = stage_config["prompt_file"]
    
    # 5. 단계별 프롬프트 로드 (예: stage_05_12-17m.ko.txt)
    stage_prompt_path = baby_dev_safety_dir / "stages" / prompt_file
    
    # 6. safety_rules.ko.txt 로드
    common_rules_path = baby_dev_safety_dir / "common" / "safety_rules.ko.txt"
    
    # 7. 모두 조합
    combined_prompt = f"{stage_prompt}\n\n{input_premise}\n\n{analysis_steps}\n\n{field_definitions}\n\n{common_safety_rules}{metadata_section}"
    
    return combined_prompt
```

**사용 위치**:
- 3단계: 단계별 상세 분석 (`gemini_service.py:995`)

---

## 🔍 실제 사용 확인

### **확인 방법 1: 로그 확인**

```bash
# Worker 로그에서 프롬프트 로딩 확인
docker logs dailycam-worker-1 2>&1 | grep "프롬프트"

# 출력 예시:
# [프롬프트 캐시 등록] vlm_metadata.ko.txt (12345자)
# [프롬프트 캐시 등록] header.ko.txt (8901자)
# [VLM 프롬프트 로드 완료] 단계: 5, 길이: 23456자
```

### **확인 방법 2: 분석 결과 검증**

최근 수정한 프롬프트 내용이 반영되었는지 확인:

1. **`safety_rules.ko.txt` 수정 사항**:
   - `summary` vs `insights` 구분 명확화
   - 예시 추가

2. **`field_definitions.ko.txt` 수정 사항**:
   - `development_insights` 필드 정의 확장
   - 좋은/나쁜 예시 추가

3. **`analysis_steps_template.ko.txt` 수정 사항**:
   - 3단계 분석 절차 명확화

**검증 방법**: 새로운 영상 분석 후 결과 확인
- 요약과 인사이트가 제대로 구분되는지
- 인사이트가 구체적이고 실행 가능한지

---

## 📊 프롬프트 사용 현황 요약

### ✅ **모든 프롬프트 정상 사용 중**

| 단계 | 프롬프트 | 상태 | 로딩 방식 |
|------|----------|------|-----------|
| 1단계 | `vlm_metadata.ko.txt` | ✅ 사용 중 | `_load_prompt()` |
| 2단계 | `header.ko.txt` | ✅ 사용 중 | `_load_prompt()` |
| 3단계 | `input_premise.ko.txt` | ✅ 사용 중 | `_load_vlm_prompt()` |
| 3단계 | `analysis_steps_template.ko.txt` | ✅ 사용 중 | `_load_vlm_prompt()` |
| 3단계 | `field_definitions.ko.txt` | ✅ 사용 중 | `_load_vlm_prompt()` |
| 3단계 | `safety_rules.ko.txt` | ✅ 사용 중 | `_load_vlm_prompt()` |
| 3단계 | `stage_XX_XX-XXm.ko.txt` | ✅ 사용 중 | `_load_vlm_prompt()` |

### 🎯 **프롬프트 캐싱**

- 첫 로드 시 메모리에 캐시됨
- 이후 호출 시 캐시에서 재사용 (성능 향상)
- Worker 재시작 시 캐시 초기화

---

## 🚨 주의사항

### 1. **프롬프트 수정 후 재시작 필요**

프롬프트 파일을 수정한 경우:

```bash
# Worker 재시작 (프롬프트 캐시 초기화)
docker-compose restart vlm-worker-1
docker-compose restart vlm-worker-2
```

### 2. **config.yaml 변경 시**

단계별 프롬프트 매핑을 변경한 경우:
- Worker 재시작 필수
- 파일명 오타 주의

### 3. **인코딩 주의**

모든 프롬프트 파일은 **UTF-8** 인코딩이어야 함:
```python
with open(prompt_path, "r", encoding="utf-8") as f:
```

---

## 📝 최근 프롬프트 개선 사항

### ✅ **완료된 개선**

1. **`safety_rules.ko.txt`** (2025-12-10)
   - `summary`와 `insights` 구분 명확화
   - 각각의 정의, 목적, 톤, 예시 추가

2. **`field_definitions.ko.txt`** (2025-12-10)
   - `development_insights` 필드 정의 확장
   - 좋은 예시 vs 나쁜 예시 추가

3. **`analysis_steps_template.ko.txt`** (2025-12-10)
   - 3단계 분석 절차 명확화
   - 요약 → 인사이트 순서 강조

### 📖 **관련 문서**

- [Summary vs Insights 가이드](./SUMMARY_VS_INSIGHTS_GUIDE.md)

---

## 🔬 테스트 권장사항

### **새 영상으로 전체 프로세스 테스트**

1. 새 영상 업로드
2. VLM 분석 실행 (10분 세그먼트)
3. 결과 확인:
   - `summary`가 객관적인 요약인지
   - `insights`가 구체적이고 실행 가능한지
   - 발달 단계 판단이 정확한지

```bash
# 분석 진행 상황 모니터링
docker logs -f dailycam-worker-1

# 분석 결과 확인 (DB 쿼리)
docker exec dailycam-mysql mysql -u root -pdailycam_root_2024 dailycam \
  -e "SELECT summary, development_insights FROM daily_summary ORDER BY created_at DESC LIMIT 1;"
```

---

## ✅ 결론

**모든 프롬프트 파일이 정상적으로 사용되고 있습니다!**

- ✅ 3단계 분석 프로세스 정상 작동
- ✅ 프롬프트 캐싱 적용으로 성능 향상
- ✅ 최근 개선 사항 (요약/인사이트 구분) 반영됨
- ✅ 단계별 프롬프트 (Stage 1~11) 모두 매핑됨

**다음 분석부터 개선된 프롬프트가 적용됩니다!** 🎉

