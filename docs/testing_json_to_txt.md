# Gemini 분석 결과 JSON → TXT 변환 기능 테스트 가이드

## ✅ 구현 완료

### 추가된 파일
1. **`backend/app/utils/json_to_txt_formatter.py`**
   - Gemini JSON을 TXT로 변환하는 클래스
   - 사람이 읽기 쉬운 포맷으로 변환

2. **`backend/app/api/homecam/router.py`** (수정)
   - 분석 완료 후 자동으로 TXT/JSON 파일 저장

3. **`backend/app/utils/README.md`**
   - 사용법 및 예시

---

## 📝 테스트 방법

### 1. 서버 실행
```bash
cd backend
python -m uvicorn app.main:app --reload
```

### 2. 비디오 분석 API 호출

#### 방법 A: cURL 사용
```bash
curl -X POST "http://localhost:8000/api/homecam/analyze-video" \
  -F "video=@your_video.mp4" \
  -F "age_months=7"
```

#### 방법 B: Python 요청
```python
import requests

url = "http://localhost:8000/api/homecam/analyze-video"
files = {"video": open("your_video.mp4", "rb")}
data = {"age_months": 7}

response = requests.post(url, files=files, data=data)
print(response.json())
```

#### 방법 C: Swagger UI 사용
1. 브라우저에서 `http://localhost:8000/docs` 접속
2. `POST /api/homecam/analyze-video` 클릭
3. "Try it out" 클릭
4. 비디오 파일 업로드
5. "Execute" 클릭

### 3. 결과 파일 확인

분석이 완료되면 다음 위치에 파일이 자동 생성됩니다:

```
backend/
└── analysis_results/
    ├── analysis_stage3_20251127_130500.txt      # 👈 사람이 읽기 쉬운 TXT
    └── raw_stage3_final_20251127_130500.json    # 👈 원본 JSON
```

### 4. 터미널 출력 확인

분석 중에 터미널에 다음과 같이 출력됩니다:

```
[VLM 비디오 분석 시작]
[발달 단계] 자동 판단 모드
[비디오 최적화] 전처리 시작...
[1차 VLM] 비디오에서 메타데이터 추출 중...
[1차 완료] 관찰 25개, 안전 이벤트 3개
[2차 LLM] 메타데이터로 발달 단계 판단 중...
[2차 완료] 판단된 단계: 3, 신뢰도: 높음
[3차 LLM] 3단계 기준으로 상세 분석 중...
[Gemini API 호출 시작 (LLM 상세 분석 모드)]
[Gemini API 호출 완료]
[3차 완료] 상세 분석 완료
[VLM 비디오 분석 완료] 총 소요 시간: 125.34초

✅ 분석 결과 TXT 파일 저장 완료: analysis_results/analysis_stage3_20251127_130500.txt
📄 TXT 파일 저장 완료: analysis_results/analysis_stage3_20251127_130500.txt
✅ 원본 JSON 저장 완료: analysis_results/raw_stage3_final_20251127_130500.json
📄 원본 JSON 저장 완료: analysis_results/raw_stage3_final_20251127_130500.json
```

---

## 📄 TXT 파일 내용 예시

생성된 TXT 파일은 다음과 같이 구성됩니다:

```txt
================================================================================
Gemini 비디오 분석 결과
생성 시각: 2025-11-27 13:05:00
================================================================================

📋 메타 정보
--------------------------------------------------------------------------------
발달 단계: 3단계
개월 수: 7개월
관찰 시간: 45.5분
비디오 화질: 좋음
아이 가시성: 명확함
환경 유형: 거실


🎯 발달 단계 판단
--------------------------------------------------------------------------------
판단된 단계: 3단계
신뢰도: 높음

📌 판단 근거:
  1. 혼자 앉기: 30회 관찰, 숙련 수준
  2. 배밀이: 15회 관찰, 중간 수준
  3. 집게 집기: 초기 수준 관찰


🧸 발달 분석
================================================================================

✨ 관찰된 발달 기술:
--------------------------------------------------------------------------------

[대근육운동]
✓ 혼자 앉기
   숙련도: 숙련 | 관찰 횟수: 30회
   관찰 예시:
     • 00:05:23 - 10초간 안정적으로 앉아서 장난감을 만지며 균형을 유지함
     • 00:12:45 - 앉은 자세에서 몸을 90도 돌려 다른 물건을 집음

✓ 배밀이
   숙련도: 중간 | 관찰 횟수: 15회
   관찰 예시:
     • 00:18:30 - 배를 바닥에 대고 팔과 다리로 밀며 1미터 정도 이동


🛡️ 안전 분석
================================================================================

📊 안전 점수:
--------------------------------------------------------------------------------
점수: 78점
안전도 레벨: 높음

📉 감점 내역:
  • 주의: 2건 (감점: -10점)
  • 권장: 3건 (감점: -6점)

⚠️ 안전 사고/위험 이벤트:
--------------------------------------------------------------------------------
🟡 [주의] E001
   시간: 00:15:23-00:15:28
   위험 유형: 충돌
   상황: 아이가 배밀이로 테이블 쪽으로 이동하며 머리를 테이블 모서리로 기울임
   유발 행동: 배밀이 중 방향 전환
   환경 요인: 테이블 모서리에 보호대 없음
   안전장치: 없음
   보호자 개입: 있음
   💡 권장사항: 모서리 보호대 설치 권장

...
```

---

## 🔍 JSON 파싱 로직 확인

### 1단계: VLM 메타데이터 추출
**위치**: `gemini_service.py` 라인 588-619

```python
# VLM 호출
response = self.model.generate_content([
    {"mime_type": mime_type, "data": video_base64},
    metadata_prompt
])

# JSON 파싱
metadata_text = response.text.strip()
metadata = self._extract_and_parse_json(metadata_text)
```

**출력 JSON 구조**:
```json
{
  "video_metadata": {...},
  "timeline_observations": [...],
  "behavior_summary": {...},
  "safety_observations": [...]
}
```

### 2단계: 발달 단계 판단
**위치**: `gemini_service.py` 라인 663-735

```python
# LLM 호출
response = self.model.generate_content(combined_prompt_stage)

# JSON 파싱
result_text = response.text.strip()
stage_determination_result = self._extract_and_parse_json(result_text)
detected_stage = stage_determination_result.get("detected_stage")
```

**출력 JSON 구조**:
```json
{
  "detected_stage": "3",
  "confidence": "높음",
  "evidence": [...],
  "age_months_estimate": 7
}
```

### 3단계: 상세 분석
**위치**: `gemini_service.py` 라인 820-918

```python
# LLM 호출
response = self.model.generate_content(combined_prompt_detail)

# JSON 파싱
result_text = response.text.strip()
analysis_data = self._extract_and_parse_json(result_text)

# 안전 점수 계산
safety_score, incident_summary = self._calculate_safety_score(safety_analysis)
```

**출력 JSON 구조**:
```json
{
  "meta": {...},
  "development_analysis": {...},
  "safety_analysis": {...},
  "stage_determination": {...},
  "_extracted_metadata": {...}
}
```

### JSON 파싱 헬퍼 함수
**위치**: `gemini_service.py` 라인 503-553

```python
def _extract_and_parse_json(self, text: str) -> dict:
    """
    - ```json 코드블록 제거
    - 첫 '{'부터 마지막 '}'까지 추출
    - json.loads()로 파싱
    """
    # 1. 코드블록 제거
    if "```json" in text:
        text = extract_from_code_block(text)
    
    # 2. 중괄호 매칭
    first_brace = text.find("{")
    last_brace = find_matching_brace(text, first_brace)
    text = text[first_brace:last_brace+1]
    
    # 3. JSON 파싱
    return json.loads(text)
```

---

## 📁 파일 구조

```
backend/
├── app/
│   ├── api/
│   │   └── homecam/
│   │       └── router.py              # ✅ TXT/JSON 저장 추가
│   ├── services/
│   │   └── gemini_service.py          # JSON 파싱 로직
│   └── utils/
│       ├── __init__.py                # ✅ 새로 추가
│       ├── json_to_txt_formatter.py   # ✅ 새로 추가
│       └── README.md                  # ✅ 새로 추가
└── analysis_results/                  # ✅ 자동 생성
    ├── *.txt                          # 분석 결과 TXT
    └── *.json                         # 원본 JSON
```

---

## 🎯 다음 단계 (데이터베이스 설계)

TXT 파일을 확인하여 실제 데이터 구조를 파악한 후:

1. **기존 더미 데이터 구조 확인**
2. **테이블 스키마 설계**
3. **JSON → DB 매핑 함수 작성**
4. **마이그레이션 실행**

---

## ❓ 문제 해결

### Q: 파일이 저장되지 않아요
A: `backend/analysis_results/` 디렉토리가 자동 생성되는지 확인하세요.

### Q: TXT 파일이 깨져서 보여요
A: UTF-8 인코딩을 지원하는 텍스트 에디터로 열어보세요 (VS Code, Notepad++ 등).

### Q: JSON 파싱 에러가 발생해요
A: Gemini 응답에 JSON이 아닌 텍스트가 포함되어 있을 수 있습니다. 원본 JSON 파일을 확인하세요.
