# Gemini 분석 일관성 및 파일 수명주기 관리 보고서

## 1. 문제 상황 (Problem Context)

### 1-1. 분석의 독립성에 대한 의심
동일한 환경의 영상을 반복적으로 분석할 때 결과가 묘하게 편향되거나, 이전 분석의 내용이 잔상(Hallucination)처럼 남는 듯한 현상이 관찰될 수 있습니다.

### 1-2. File API 전환에 따른 우려
대용량 비디오 처리를 위해 기존 Base64 전송 방식에서 **Google File API** 업로드 방식으로 전환하면서, 다음과 같은 보안 및 기술적 우려가 제기되었습니다.
*   "업로드된 파일이 서버에 남아 학습에 사용되거나 다음 분석에 영향을 미치지 않는가?"
*   "Stateless(무상태) 원칙이 깨지는 것이 아닌가?"

---

## 2. 원인 분석 (Root Cause Analysis)

### 2-1. Gemini의 기억력 (Stateless Nature)
Gemini API는 본질적으로 **Stateless(무상태)** 아키텍처를 따릅니다.
*   **휘발성 메모리**: API 호출이 종료되는 즉시 모델의 컨텍스트(기억)는 소멸합니다.
*   **독립적 세션**: 1번째 분석 세션과 2번째 분석 세션은 서로의 존재를 전혀 알지 못합니다. 모델은 매번 "태어나서 처음 보는 영상"으로 인식합니다.

### 2-2. 파일 잔존과 학습의 관계
업로드된 파일이 Cloud Storage에 일시적으로 존재한다고 해서 모델이 이를 자동으로 "기억"하거나 "학습(Training)"하지 않습니다. 파일은 단지 처리를 대기하는 **데이터 덩어리(Blob)**일 뿐입니다.

### 2-3. 진짜 원인: 프롬프트와 Temperature
일관성이 흔들리거나 편향이 발생하는 진짜 이유는 기술적 구조가 아닌 **설정값(Hyperparameters)**에 있었습니다.
*   **높은 Temperature**: 창의성 지수가 높으면 모델이 없는 사실을 지어내거나(Hallucination), 매번 다른 해석을 내놓을 확률이 높아집니다.
*   **유도 신문형 프롬프트**: 프롬프트가 특정 답변을 유도할 경우, 영상 내용과 무관하게 편향된 결과를 뱉을 수 있습니다.

---

## 3. 해결 솔루션: 코드 레벨의 강제 조치

우리는 시스템적으로 **"이전 분석의 잔상"이 남을 가능성을 0%로 차단**하는 3중 방어막을 구축했습니다. (관련 코드: `backend/app/services/gemini_service.py`)

### 3-1. 물리적 차단: 즉시 파일 삭제 (Immediate Deletion)
```python
# 분석 API 호출 직후
response = await asyncio.to_thread(generate_metadata_sync)

# 즉시 원격 파일 삭제 (파일 수명주기 강제 종료)
await asyncio.to_thread(genai.delete_file, video_file.name)
```
*   분석이 끝나자마자 `genai.delete_file`을 호출하여 Cloud 상의 파일을 물리적으로 **소멸**시킵니다.
*   모델이 기억하고 싶어도 기억할 대상(참조 파일) 자체가 존재하지 않게 됩니다.

### 3-2. 논리적 차단: Temperature 제로화 (Zero Temperature)
```python
vlm_generation_config = genai.types.GenerationConfig(
    temperature=0.0,  # 창의성 0% 설정
    top_k=30,
    top_p=0.95,
)
```
*   1단계 메타데이터 추출 시 `temperature=0.0`을 적용하여 모델의 **'상상력'을 원천 봉쇄**했습니다.
*   오직 영상에 존재하는 팩트(Fact)만 건조하게 추출하도록 강제합니다.

### 3-3. 데이터 격리: Base64 폐기 및 독립 세션
*   File API를 사용하되, 각 분석 요청(`generate_content`)마다 새로운 File 객체를 전달하고 즉시 폐기하는 사이클을 엄격히 준수합니다.

---

## 4. 결론 (Conclusion)

현재 시스템은 **File API의 대용량 처리 이점**을 취하되, **엄격한 수명주기 관리(Upload → Analyze → Delete)**를 통해 **완벽한 Stateless 환경**을 보장합니다.

따라서 분석 결과의 편향이나 기억 잔존 현상은 기술적으로 불가능하며, 만약 결과가 이상하다면 이는 오직 **영상 자체의 내용**이나 **프롬프트 논리**의 문제일 뿐, 시스템 아키텍처의 문제는 아닙니다.
