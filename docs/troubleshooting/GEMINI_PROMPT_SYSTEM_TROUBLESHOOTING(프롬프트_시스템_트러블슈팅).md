# Gemini 프롬프트 시스템 트러블슈팅 가이드

## 1. 개요

이 문서는 DailyCam의 **Gemini VLM/LLM 프롬프트 시스템**에서 자주 발생할 수 있는 문제들을 정리하고, 실제 코드(`gemini_service.py`)와 프롬프트 구조(`backend/app/prompts/baby_dev_safety/…`)를 기준으로 **원인–진단–해결 절차**를 제공하기 위한 트러블슈팅 가이드입니다.

참고한 설계/히스토리 문서:
- `docs/ai_prompts/2025_12_05_VLM_PROMPT_HISTORY.md`
- `docs/ai_prompts/2025_12_10_PROMPT_USAGE_VERIFICATION.md`
- `docs/ai_prompts/PROMPT_SYSTEM_ARCHITECTURE.md`
- `docs/ai_prompts/2025_12_15_PROMPT_ENGINEERING_GUIDE.md`
- `docs/ai_prompts/PROMPT_REFACTORING_2025_11_24.md`

---

## 2. 구조 요약 (Mental Model)

프롬프트 시스템은 크게 **3단계 분석 파이프라인**과 **모듈화된 프롬프트 파일 세트**로 구성됩니다.

### 2-1. 3단계 분석 파이프라인

1. **1단계 – VLM 메타데이터 추출**
   - 입력: 최적화된 비디오 (480p, 15fps)
   - 프롬프트: `extraction/vlm_metadata.ko.txt`
   - 출력: `timeline_observations`, `behavior_summary`, `safety_observations` 등 메타데이터 JSON

2. **2단계 – LLM 발달 단계 판단**
   - 입력: 1단계 메타데이터 JSON
   - 프롬프트: `common/header.ko.txt`
   - 출력: `detected_stage`, `confidence`, `age_months_estimate`

3. **3단계 – 단계별 상세 분석**
   - 입력: 1단계 메타데이터 + 2단계에서 결정된 단계(Stage)
   - 프롬프트 조합:
     - `stages/stage_XX_*.ko.txt`
     - `common/input_premise.ko.txt`
     - `common/analysis_steps_template.ko.txt`
     - `common/field_definitions.ko.txt`
     - `common/safety_rules.ko.txt`
   - 출력: 발달/안전 이벤트, 요약, 인사이트 등 최종 구조화 JSON

### 2-2. 모듈화된 프롬프트 구조

- `baby_dev_safety/common/` – 모든 단계에서 공통으로 사용하는 규칙/정의
- `baby_dev_safety/stages/` – 각 발달 단계(월령대)에 특화된 기준
- `baby_dev_safety/extraction/` – VLM 메타데이터 추출 전용 프롬프트

> 이 구조를 이해하면, "어떤 문제가 어느 레이어에서 발생했는지"를 빠르게 좁혀갈 수 있습니다.

---

## 3. 자주 발생하는 문제 유형별 트러블슈팅

### 3-1. 증상 A – 분석 결과에 최근 프롬프트 수정이 반영되지 않음

#### 1) 의심되는 원인
- 프롬프트 파일은 수정했지만, **Worker 프로세스가 캐시된 내용을 계속 사용**하고 있을 가능성이 높습니다.
- `GeminiService._load_prompt()` / `_load_vlm_prompt()` 에서 첫 로딩 이후 내용을 `self.prompt_cache`에 보관하기 때문입니다.

#### 2) 확인 방법
- Worker 로그에서 프롬프트 캐시 등록 로그를 확인합니다.

```bash
# 프롬프트 캐시 로그 확인
docker logs dailycam-worker-1 2>&1 | grep "프롬프트 캐시 등록"
```

- 특정 프롬프트 파일을 수정한 시간 이후에도 **새로운 "캐시 등록" 로그가 찍히지 않으면**, 프로세스 재시작이 되지 않은 상태일 가능성이 큽니다.

#### 3) 해결 방법

1. **Worker 재시작**
   ```bash
   docker compose restart dailycam-vlm-worker-1
   docker compose restart dailycam-vlm-worker-2   # 여러 워커 사용 시
   ```
2. 재시작 후, 로그에서 다시 캐시 등록 로그가 나오는지 확인합니다.

> 프롬프트 파일 또는 `config.yaml`을 수정했다면 **반드시 Worker 재시작**이 필요합니다.

---

### 3-2. 증상 B – VLM 1단계에서 400/500 에러 또는 JSON 파싱 실패

#### 1) 대표 증상
- 로그 예시:
  - `Request contains an invalid argument`
  - `Gemini VLM 응답이 올바르지 않습니다.`
  - `_extract_and_parse_json()`에서 예외 발생

#### 2) 의심되는 원인

- `vlm_metadata.ko.txt`의 출력 포맷 지시가 깨져서 **LLM이 JSON 이외의 텍스트를 섞어서 응답**했을 수 있습니다.
- VLM에 전달되는 입력 비디오가 손상되었거나(0 bytes, 너무 작은 크기) 포맷이 올바르지 않은 경우도 함께 의심해야 합니다. 
- 프롬프트 수정 중 **필드 이름, 중괄호/대괄호 구조 변경**으로 인해 `_extract_and_parse_json()`이 기대한 스키마와 맞지 않을 수 있습니다.

#### 3) 확인 체크리스트

1. **비디오 유효성 검사 통과 여부**
   - `VLM_PROMPT_HISTORY.md`에서 제안한 것처럼, 분석 전에 파일 크기/포맷을 검증하도록 되어 있는지 확인합니다.
2. **VLM 응답 원문 로그 확인**
   - 일시적으로 `_extract_and_parse_json()` 호출 전 `response.text` 일부를 출력해 실제 응답 구조를 확인합니다.
3. **`vlm_metadata.ko.txt`의 출력 형식 규칙 재검토**
   - JSON 이외의 자연어 설명이 답에 섞이지 않도록, "반드시 **순수 JSON**만 반환"하도록 강하게 지시되어 있는지 확인합니다.

#### 4) 해결 가이드

- `vlm_metadata.ko.txt` 끝부분에 **JSON 출력 형식 예시와 금지 규칙**을 명시합니다.
  - 예: "설명 문장을 쓰지 말고, 아래 예시와 같이 JSON만 출력하라".
- VLM 응답 구조가 바뀌는 경우, `_extract_and_parse_json()`에서 허용하는 필드 스키마를 함께 업데이트해야 합니다.

---

### 3-3. 증상 C – 발달 단계 판단이 일관되지 않거나 기대와 다름

#### 1) 의심되는 원인

- 2단계 프롬프트(`header.ko.txt`)가 **입력 메타데이터의 맥락을 충분히 설명하지 않거나**, 최근에 수정한 공통 규칙과 충돌하고 있을 수 있습니다.
- 프롬프트 모듈화 이전/이후 내용이 섞여 있거나, 구버전 내용을 일부만 가져와 일관성이 깨졌을 가능성도 있습니다.

#### 2) 확인 방법

1. `PROMPT_SYSTEM_ARCHITECTURE.md` / `PROMPT_REFACTORING_2025_11_24.md` 에 정의된 **역할 분리 원칙**과 현재 `header.ko.txt` 내용을 비교합니다.
   - 이 파일에는 **"발달 단계 판단"에 필요한 규칙만** 있어야 합니다.
   - 안전 분석, 인사이트 작성 가이드 등은 `safety_rules.ko.txt` / `field_definitions.ko.txt` 쪽으로 분리되어야 합니다.
2. `2025_12_10_PROMPT_USAGE_VERIFICATION.md` 의 **2단계 입력/출력 예시**와 실제 응답을 비교하여, 필드 이름과 의미가 맞는지 확인합니다.

#### 3) 해결 가이드

- 2단계 프롬프트에는 **다음 요소만** 유지하는 것을 권장합니다.
  - 메타데이터 설명
  - 발달 단계 정의/기준
  - 출력 JSON 스키마 (`detected_stage`, `confidence`, `age_months_estimate` 등)
- 발달 단계 외의 설명/분석(예: 요약, 인사이트)은 3단계 프롬프트로 옮겨 **책임을 분리**합니다.

---

### 3-4. 증상 D – 3단계 결과에서 summary/insights가 뒤섞여 있음

#### 1) 의심되는 원인

- `safety_rules.ko.txt`, `field_definitions.ko.txt`, `analysis_steps_template.ko.txt` 의 정의가 최신 가이드와 어긋나 있거나, 요약/인사이트 구분이 약하게 표현되어 있을 수 있습니다.
- `2025_12_10_PROMPT_USAGE_VERIFICATION.md` 에서 요약 vs 인사이트를 명확히 나눴는데, 실제 프롬프트 파일에 반영이 덜 된 경우도 있습니다.

#### 2) 확인 방법

1. `safety_rules.ko.txt` 에서 summary/insights에 대한 정의와 예시를 다시 읽어봅니다.
2. 최근 분석 결과 JSON에서 `summary`와 `development_insights` 필드의 내용이 **가이드에 맞는 톤과 구분을 유지하는지** 샘플링합니다.

#### 3) 해결 가이드

- `field_definitions.ko.txt`에 **좋은/나쁜 예시**를 추가하고, 3단계 프롬프트 조합 시 항상 이 정의가 포함되도록 `_load_vlm_prompt()`를 유지합니다.
- "요약은 관찰된 사실을 2~3문장으로", "인사이트는 해석/조언을 bullet 형식으로" 등, 프롬프트에 명확한 형식을 강제합니다.

---

### 3-5. 증상 E – 특정 단계(Stage)에서만 결과가 이상하거나 비어 있음

#### 1) 의심되는 원인

- `config.yaml` 의 `stages` 매핑이 잘못되어, 잘못된 `stage_XX_*.ko.txt` 파일을 가리키고 있을 수 있습니다.
- 해당 단계의 `stage_XX_*.ko.txt` 파일이 비어 있거나, 구조적으로 깨져 있을 가능성도 있습니다.

#### 2) 확인 방법

1. `2025_12_15_PROMPT_ENGINEERING_GUIDE.md` / `2025_12_10_PROMPT_USAGE_VERIFICATION.md` 의 **config 매핑 섹션**을 참고하여, `config.yaml` 을 다시 확인합니다.
2. 다음 명령어로 파일 존재 여부/크기를 점검합니다.

```bash
# 모든 stage 프롬프트 크기 확인
ls -l backend/app/prompts/baby_dev_safety/stages
```

- 사이즈가 0이거나 다른 단계에 비해 현저히 작으면, 내용을 다시 작성해야 할 가능성이 큽니다.

#### 3) 해결 가이드

- 문제가 되는 Stage의 프롬프트를 다른 정상 Stage 파일과 비교하여 **구조(헤더, 섹션 순서, 출력 형식)**를 통일합니다.
- `PROMPT_REFACTORING_2025_11_24.md`에서 제안한 **"공통은 common/, 단계별 차이는 stages/"** 원칙을 다시 적용합니다.

---

## 4. 프롬프트 관련 디버깅 실전 체크리스트

1. **프롬프트 캐시 확인** – 수정 후 Worker 재시작 했는가?
2. **1·2·3단계 로그 라인 확인** – 어느 단계에서 처음 이상 징후가 보이는가?
3. **해당 단계에서 사용하는 프롬프트 파일 목록을 명시적으로 나열**
   - 1단계: `vlm_metadata.ko.txt`
   - 2단계: `header.ko.txt`
   - 3단계: `stage_XX_*.ko.txt`, `input_premise.ko.txt`, `analysis_steps_template.ko.txt`, `field_definitions.ko.txt`, `safety_rules.ko.txt`
4. **config.yaml Stage 매핑 검증** – 잘못된 파일명을 가리키고 있지 않은가?
5. **요약/인사이트 필드 내용 샘플링** – 가이드와 톤이 일치하는가?

---

## 5. 추가 참고 문서

- `docs/ai_prompts/2025_12_05_VLM_PROMPT_HISTORY.md` – VLM 분석 개선 히스토리 및 로깅 전략
- `docs/ai_prompts/2025_12_10_PROMPT_USAGE_VERIFICATION.md` – 프롬프트 사용 현황/검증 보고서
- `docs/ai_prompts/PROMPT_SYSTEM_ARCHITECTURE.md` – 모듈화된 프롬프트 시스템 설계 철학
- `docs/ai_prompts/2025_12_15_PROMPT_ENGINEERING_GUIDE.md` – 프롬프트 엔지니어링 실무 가이드
- `docs/ai_prompts/PROMPT_REFACTORING_2025_11_24.md` – 프롬프트 구조 개편 요약

이 문서를 기준으로, **문제가 발생한 단계 → 관련 프롬프트/코드 → 원인 후보 → 수정 포인트** 순서로 좁혀가면, 프롬프트 관련 이슈를 훨씬 빠르게 진단하고 해결할 수 있습니다.
