# 프롬프트 시스템 구조 개편 및 최적화 (2025-11-24)

## 개요
기존의 거대하고 중복이 많았던 프롬프트 파일들을 기능별로 세분화하고 모듈화하여 유지보수성과 AI 분석 효율을 극대화했습니다. 또한, `gemini_service.py`의 로직을 개선하여 이 모듈화된 프롬프트들을 동적으로 조합해 사용하도록 변경했습니다.

## 주요 변경 사항

### 1. 프롬프트 파일 구조 세분화 (Modularization)
기존에 각 단계별 파일마다 반복되던 공통 지침들을 별도 파일로 분리했습니다.

- **`backend/app/prompts/baby_dev_safety/common/`**: 모든 단계에서 공통으로 쓰이는 지침
  - `input_premise.ko.txt`: 입력 데이터(메타데이터)에 대한 기본 전제
  - `analysis_steps_template.ko.txt`: 분석 단계 및 절차 가이드
  - `field_definitions.ko.txt`: 출력 필드에 대한 상세 정의
  - `header.ko.txt`: 발달 단계 판단을 위한 전용 프롬프트
  - `safety_rules.ko.txt`: 안전 분석 및 점수 계산 규칙

- **`backend/app/prompts/baby_dev_safety/stages/`**: 각 월령별 고유 발달 기준만 남김
  - `stage_01_0-2m.ko.txt` ~ `stage_06_18-23m.ko.txt`: 해당 월령의 대근육/소근육/언어 발달 체크리스트만 포함

- **`backend/app/prompts/baby_dev_safety/extraction/`**: VLM 전용
  - `vlm_metadata.ko.txt`: 영상에서 객관적 사실(메타데이터)만 추출하기 위한 프롬프트

### 2. 백엔드 로직 개선 (`gemini_service.py`)
프롬프트를 단순 로딩하는 방식에서, 상황에 맞춰 필요한 조각들을 조립(Assembly)하는 방식으로 변경했습니다.

- **동적 프롬프트 조합 (`_load_vlm_prompt`)**:
  - 요청된 단계(Stage)에 맞는 `stage_XX.txt` 로드
  - 공통 모듈(`input_premise`, `analysis_steps`, `field_definitions`, `safety_rules`) 로드
  - 이들을 하나의 완성된 프롬프트로 합쳐서 LLM에 전달
  - **효과**: 수정이 필요할 때 공통 파일 하나만 고치면 모든 단계에 적용됨

- **3단계 분석 파이프라인 정착**:
  1. **1차 VLM**: 영상 → 메타데이터 추출 (사실 기반 관찰)
  2. **2차 LLM**: 메타데이터 → 발달 단계 판단 (`header.ko.txt` 활용)
  3. **3차 LLM**: 메타데이터 + 단계 정보 → 상세 발달/안전 분석 (조합된 프롬프트 활용)

### 3. 기대 효과
- **유지보수 용이성**: 공통 규칙 수정 시 6개 파일을 일일이 열 필요 없이 `common` 폴더 내 파일만 수정하면 됨.
- **토큰 효율성**: 불필요한 중복 텍스트를 줄이고 체계적인 구조로 AI가 더 명확하게 지시를 이해함.
- **확장성**: 새로운 발달 단계나 분석 기준 추가 시 기존 구조를 해치지 않고 쉽게 확장 가능.
