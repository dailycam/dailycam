# VLM Baby Prompts

영유아 발달 단계별 비전-언어 모델(VLM) 분석을 위한 프롬프트 모음입니다.

## 디렉토리 구조

```
vlm-baby-prompts/
├─ README.md
├─ schema/
│  └─ baby_dev_safety.schema.json      # JSON 출력 스키마 정의
├─ prompts/
│  └─ baby_dev_safety/
│     ├─ common_header.ko.txt         # 공통 역할/출력 포맷(스키마 설명)
│     ├─ stage_03_6-8m.ko.txt         # 3단계 프롬프트(앉기·배밀이/기기 시작)
│     ├─ stage_04_9-11m.ko.txt        # 4단계 프롬프트(잡고 서기·가구 붙잡고 걷기)
│     ├─ stage_05_12-17m.ko.txt      # 5단계 프롬프트(혼자 걷기 시작)
│     └─ config.yaml                  # 단계별 메타 정보(나이, 파일 경로 매핑)
```

## 사용 방법

각 단계별 프롬프트는 `common_header.ko.txt`와 함께 사용됩니다.

1. **공통 헤더 로드**: `common_header.ko.txt` 파일을 먼저 읽습니다.
2. **단계별 프롬프트 로드**: 분석할 발달 단계에 맞는 프롬프트 파일을 읽습니다.
3. **프롬프트 결합**: 공통 헤더 + 단계별 프롬프트를 결합하여 VLM에 전달합니다.

## 발달 단계

- **3단계 (6~8개월)**: 앉기, 배밀이/기기 시작
- **4단계 (9~11개월)**: 잡고 서기, 가구 붙잡고 걷기
- **5단계 (12~17개월)**: 혼자 걷기 시작

## 출력 형식

모든 프롬프트는 `schema/baby_dev_safety.schema.json`에 정의된 JSON 구조를 따릅니다.

주요 필드:
- `meta`: 메타데이터 (단계, 나이, 관찰 시간)
- `stage_consistency`: 발달 단계 일치 여부 평가
- `development_analysis`: 발달 관찰 및 카운트
- `safety_analysis`: 안전사고 위험 및 환경 평가
- `disclaimer`: 의학적 진단이 아님을 명시

## 참고사항

- 모든 프롬프트는 한글로 작성되었습니다.
- 출력은 반드시 단일 JSON 객체만 반환해야 합니다.
- 발달의 개인차가 크므로, 나이보다 실제 관찰 행동을 우선합니다.

