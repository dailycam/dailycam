# 프롬프트 사용 플로우 다이어그램

## 📊 전체 분석 프로세스

```
┌─────────────────────────────────────────────────────────────────────┐
│                     영상 분석 시작                                   │
│              (Worker가 10분 세그먼트 처리)                          │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    1단계: VLM 메타데이터 추출                        │
├─────────────────────────────────────────────────────────────────────┤
│  프롬프트: vlm_metadata.ko.txt (12,991 bytes)                       │
│  위치: extraction/vlm_metadata.ko.txt                               │
│  로딩: _load_prompt("vlm_metadata.ko.txt")                         │
├─────────────────────────────────────────────────────────────────────┤
│  입력: 최적화된 영상 (480p, 1fps)                                   │
│  출력:                                                               │
│    - timeline_observations (최대 400개)                             │
│    - behavior_summary (행동 빈도 통계)                              │
│    - safety_observations (최대 150개)                               │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   2단계: LLM 발달 단계 판단                          │
├─────────────────────────────────────────────────────────────────────┤
│  프롬프트: header.ko.txt (10,179 bytes)                            │
│  위치: common/header.ko.txt                                         │
│  로딩: _load_prompt("header.ko.txt")                               │
├─────────────────────────────────────────────────────────────────────┤
│  입력: 1단계 메타데이터 (JSON)                                      │
│  출력:                                                               │
│    - detected_stage: 1~11                                           │
│    - confidence: high/medium/low                                    │
│    - age_months_estimate: 추정 개월 수                             │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   3단계: 단계별 상세 분석                            │
├─────────────────────────────────────────────────────────────────────┤
│  프롬프트 조합: _load_vlm_prompt(stage="5")                        │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │ 1️⃣ 단계별 프롬프트 (config.yaml에서 매핑)                  │   │
│  │    stage_05_12-17m.ko.txt (2,504 bytes)                    │   │
│  │    - 12-17개월 발달 특성                                   │   │
│  │    - 체크리스트                                            │   │
│  └────────────────────────────────────────────────────────────┘   │
│                          +                                          │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │ 2️⃣ 입력 전제                                               │   │
│  │    input_premise.ko.txt (604 bytes)                        │   │
│  │    - 메타데이터 기반 분석 설명                             │   │
│  └────────────────────────────────────────────────────────────┘   │
│                          +                                          │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │ 3️⃣ 분석 단계 템플릿                                        │   │
│  │    analysis_steps_template.ko.txt (2,970 bytes)            │   │
│  │    - 3단계 분석 절차                                       │   │
│  │    - 관찰 → 요약 → 인사이트                               │   │
│  └────────────────────────────────────────────────────────────┘   │
│                          +                                          │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │ 4️⃣ 필드 정의                                               │   │
│  │    field_definitions.ko.txt (9,922 bytes)                  │   │
│  │    - development_insights 필드 정의                        │   │
│  │    - 좋은/나쁜 예시                                        │   │
│  └────────────────────────────────────────────────────────────┘   │
│                          +                                          │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │ 5️⃣ 안전 규칙 및 요약/인사이트 정의                         │   │
│  │    safety_rules.ko.txt (19,273 bytes) ⭐ 가장 큰 파일     │   │
│  │    - 안전 이벤트 정의                                      │   │
│  │    - summary vs insights 구분                             │   │
│  │    - 요약/인사이트 작성 가이드                             │   │
│  └────────────────────────────────────────────────────────────┘   │
│                          +                                          │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │ 6️⃣ 메타데이터 섹션                                         │   │
│  │    - age_months: 개월 수                                   │   │
│  │    - video_duration_seconds: 영상 길이                     │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  출력:                                                               │
│    - 발달 이벤트 (development_events)                              │
│    - 안전 이벤트 (safety_events)                                   │
│    - 발달 요약 (summary)                                           │
│    - 발달 인사이트 (development_insights)                          │
│    - 안전 요약 (safety_summary)                                    │
│    - 안전 인사이트 (safety_insights)                               │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        분석 결과 저장                                │
│                   (DB + 하이라이트 클립 생성)                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔍 단계별 상세 흐름

### **1단계: VLM 메타데이터 추출**

```python
# gemini_service.py:820
metadata_prompt = self._load_prompt("vlm_metadata.ko.txt")

# 영상과 프롬프트를 Gemini API로 전송
response = self.model.generate_content([video_file, metadata_prompt])

# JSON 파싱
metadata = self._extract_and_parse_json(response.text)
```

**프롬프트 경로 탐색 순서**:
1. `prompts/vlm_metadata.ko.txt`
2. `prompts/baby_dev_safety/common/vlm_metadata.ko.txt`
3. `prompts/baby_dev_safety/stages/vlm_metadata.ko.txt`
4. ✅ `prompts/baby_dev_safety/extraction/vlm_metadata.ko.txt` (찾음!)

---

### **2단계: LLM 발달 단계 판단**

```python
# gemini_service.py:924
stage_header_prompt = self._load_prompt("header.ko.txt")

# 메타데이터와 프롬프트를 조합
combined_prompt_stage = f"""[입력 방식]
비디오 대신 비디오에서 추출된 메타데이터를 제공합니다.
{age_hint}
[메타데이터]
```json
{metadata_json_str}
```

{stage_header_prompt}
"""

# Gemini API 호출
response = self.model.generate_content(combined_prompt_stage)
stage_determination_result = self._extract_and_parse_json(response.text)
detected_stage = stage_determination_result.get("detected_stage")
```

**프롬프트 경로 탐색 순서**:
1. `prompts/header.ko.txt`
2. ✅ `prompts/baby_dev_safety/common/header.ko.txt` (찾음!)

---

### **3단계: 단계별 상세 분석**

```python
# gemini_service.py:995
stage_prompt = self._load_vlm_prompt(
    stage=detected_stage,  # 예: "5" (12-17개월)
    age_months=age_months,
    video_duration_seconds=video_duration_seconds,
)

# 내부적으로 6개 파일 조합:
# 1. stage_05_12-17m.ko.txt (config.yaml에서 매핑)
# 2. input_premise.ko.txt
# 3. analysis_steps_template.ko.txt
# 4. field_definitions.ko.txt
# 5. safety_rules.ko.txt
# 6. 메타데이터 섹션 (동적 생성)

# 조합된 프롬프트와 메타데이터를 전송
combined_prompt_analysis = f"""[입력 방식]
{metadata_json_str}

{stage_prompt}
"""

response = self.model.generate_content(combined_prompt_analysis)
final_result = self._extract_and_parse_json(response.text)
```

---

## 📋 config.yaml 매핑

```yaml
stages:
  "1":
    age_range_months: [0, 2]
    prompt_file: "stage_01_0-2m.ko.txt"  ✅
  "2":
    age_range_months: [3, 5]
    prompt_file: "stage_02_3-5m.ko.txt"  ✅
  "3":
    age_range_months: [6, 8]
    prompt_file: "stage_03_6-8m.ko.txt"  ✅
  ...
  "11":
    age_range_months: [60, 71]
    prompt_file: "stage_11_60-71m.ko.txt"  ✅
```

**매핑 확인**:
- Stage 1~11 모두 올바르게 매핑됨
- 모든 파일 존재 확인 완료

---

## 🎯 프롬프트 캐싱 메커니즘

```python
# gemini_service.py:66
self.prompt_cache: Dict[str, str] = {}

# gemini_service.py:100-126
def _load_prompt(self, filename: str) -> str:
    # 캐시에 있으면 재사용
    if filename in self.prompt_cache:
        return self.prompt_cache[filename]
    
    # 파일 읽기
    with open(prompt_path, "r", encoding="utf-8") as f:
        content = f.read()
        # 캐시에 저장
        self.prompt_cache[filename] = content
        print(f"[프롬프트 캐시 등록] {filename} ({len(content)}자)")
        return content
```

**장점**:
- 동일한 프롬프트 파일을 여러 번 읽지 않음
- 디스크 I/O 최소화
- 분석 속도 향상

**주의**:
- Worker 재시작 시 캐시 초기화됨
- 프롬프트 수정 후에는 반드시 Worker 재시작 필요

---

## ✅ 검증 결과

### **모든 프롬프트 파일 존재 확인**

| 파일 | 크기 | 상태 |
|------|------|------|
| `vlm_metadata.ko.txt` | 12,991 bytes | ✅ |
| `header.ko.txt` | 10,179 bytes | ✅ |
| `input_premise.ko.txt` | 604 bytes | ✅ |
| `analysis_steps_template.ko.txt` | 2,970 bytes | ✅ |
| `field_definitions.ko.txt` | 9,922 bytes | ✅ |
| `safety_rules.ko.txt` | 19,273 bytes | ✅ 최대 |
| `stage_01_0-2m.ko.txt` | 3,497 bytes | ✅ |
| `stage_02_3-5m.ko.txt` | 3,034 bytes | ✅ |
| `stage_03_6-8m.ko.txt` | 3,123 bytes | ✅ |
| `stage_04_9-11m.ko.txt` | 3,069 bytes | ✅ |
| `stage_05_12-17m.ko.txt` | 2,504 bytes | ✅ |
| `stage_06_18-23m.ko.txt` | 3,964 bytes | ✅ |
| `stage_07_24-29m.ko.txt` | 4,940 bytes | ✅ |
| `stage_08_30-35m.ko.txt` | 4,738 bytes | ✅ |
| `stage_09_36-47m.ko.txt` | 4,643 bytes | ✅ |
| `stage_10_48-59m.ko.txt` | 4,546 bytes | ✅ |
| `stage_11_60-71m.ko.txt` | 4,761 bytes | ✅ |
| `config.yaml` | 1,132 bytes | ✅ |

**총 프롬프트 크기**: ~100KB

---

## 🔧 디버깅 명령어

### **Worker 로그에서 프롬프트 로딩 확인**

```bash
# 프롬프트 캐시 등록 로그 확인
docker logs dailycam-worker-1 2>&1 | grep "캐시 등록"

# VLM 프롬프트 로드 로그 확인
docker logs dailycam-worker-1 2>&1 | grep "프롬프트 로드"

# 분석 단계별 로그 확인
docker logs dailycam-worker-1 2>&1 | grep -E "\[1단계\]|\[2단계\]|\[3단계\]"
```

### **특정 프롬프트 파일 내용 확인**

```bash
# safety_rules.ko.txt 확인
cat backend/app/prompts/baby_dev_safety/common/safety_rules.ko.txt | head -50

# stage_05 프롬프트 확인
cat backend/app/prompts/baby_dev_safety/stages/stage_05_12-17m.ko.txt
```

---

## 📝 결론

✅ **모든 프롬프트가 정상적으로 사용되고 있습니다!**

1. **3단계 분석 프로세스** 정상 작동
2. **18개 프롬프트 파일** 모두 존재 및 비어있지 않음
3. **config.yaml 매핑** 정확함
4. **프롬프트 캐싱** 적용으로 성능 최적화
5. **최근 개선 사항** (요약/인사이트 구분) 반영됨

**다음 영상 분석부터 개선된 프롬프트가 적용됩니다!** 🎉

