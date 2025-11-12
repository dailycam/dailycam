# Gemini 비디오 분석 기능 가이드

## 개요

홈캠 연동 페이지에 **Gemini 2.0 Flash (2.5 Flash)** 를 사용한 비디오 분석 기능이 추가되었습니다. 이 기능을 통해 영유아의 넘어짐, 위험한 행동 등을 AI가 자동으로 감지합니다.

## 기능

- 📹 **비디오 업로드**: 로컬 비디오 파일을 업로드하여 분석
- 🤖 **AI 분석**: Gemini 2.5 Flash가 비디오 내용을 분석
- 📊 **통계 표시**: 넘어짐 횟수, 위험한 행동 횟수, 안전도 점수 등
- ⏱️ **타임라인 이벤트**: 각 사건의 타임스탬프와 상세 설명
- 💡 **안전 개선 추천**: AI가 제안하는 안전 개선 방안

## 설정 방법

### 1. Gemini API 키 발급

1. [Google AI Studio](https://aistudio.google.com/apikey)에 접속
2. Google 계정으로 로그인
3. "Get API Key" 버튼 클릭하여 API 키 생성

### 2. 환경 변수 설정

`frontend/.env` 파일을 생성하고 다음 내용을 추가:

```env
# OpenAI API 키 (기존)
VITE_OPENAI_API_KEY=your_openai_api_key_here

# Google Gemini API 키 (비디오 분석용)
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. 개발 서버 재시작

```bash
cd frontend
npm run dev
```

## 사용 방법

1. **홈캠 연동** 페이지로 이동
2. **AI 비디오 분석 (테스트)** 섹션 찾기
3. 비디오 파일 업로드 영역 클릭
4. 분석할 비디오 파일 선택 (mp4, mov, avi 등)
5. **AI 분석 시작** 버튼 클릭
6. 분석 결과 확인

## 분석 결과

### 통계 카드
- **넘어짐**: 아이가 넘어지거나 균형을 잃은 횟수
- **위험 행동**: 위험한 물건을 만지거나 위험한 장소에 접근한 횟수
- **전체 사건**: 감지된 모든 이벤트 수
- **안전도**: 0-100점 사이의 안전도 점수

### 타임라인 이벤트
각 이벤트는 다음 정보를 포함합니다:
- **타임스탬프**: 사건이 발생한 시간 (예: 00:01:23)
- **타입**: fall (넘어짐), danger (위험), warning (경고), safe (안전)
- **심각도**: high (높음), medium (보통), low (낮음)
- **설명**: 구체적인 상황 설명

### 안전 개선 추천
AI가 분석한 결과를 바탕으로 안전을 개선할 수 있는 구체적인 방안을 제시합니다.

## 기술 스택

- **AI 모델**: Google Gemini 2.0 Flash 실험 버전 (`gemini-2.0-flash-exp`)
  - 이전 명칭: Gemini 2.5 Flash
  - 비디오 분석에 최적화된 멀티모달 모델
- **API 라이브러리**: `@google/generative-ai`
- **프론트엔드**: React + TypeScript

## 파일 구조

```
frontend/src/
├── lib/
│   └── gemini.ts              # Gemini API 클라이언트 및 분석 함수
└── pages/
    └── CameraSetup.tsx         # 비디오 업로드 및 분석 UI
```

## API 함수

### `analyzeVideoWithGemini(file: File)`

비디오 파일을 분석하여 결과를 반환합니다.

**파라미터:**
- `file`: 분석할 비디오 파일

**반환값:**
```typescript
{
  totalIncidents: number         // 전체 사건 수
  falls: number                  // 넘어짐 횟수
  dangerousActions: number       // 위험한 행동 횟수
  safetyScore: number           // 안전도 점수 (0-100)
  timelineEvents: TimelineEvent[]  // 타임라인 이벤트 배열
  summary: string               // 전체 요약
  recommendations: string[]     // 안전 개선 추천
}
```

## 주의 사항

⚠️ **개발 환경 전용**: 현재는 테스트 목적으로 브라우저에서 직접 API를 호출합니다. 프로덕션 환경에서는 반드시 백엔드 서버를 통해 API를 호출해야 합니다.

⚠️ **파일 크기 제한**: 큰 비디오 파일은 업로드 및 분석에 시간이 오래 걸릴 수 있습니다.

⚠️ **API 비용**: Gemini API 사용량에 따라 비용이 발생할 수 있습니다. [가격 정책](https://ai.google.dev/pricing)을 확인하세요.

## 문제 해결

### "Gemini API 키를 확인해주세요" 오류
- `.env` 파일에 올바른 API 키가 설정되었는지 확인
- 개발 서버를 재시작했는지 확인
- API 키가 활성화되어 있는지 Google AI Studio에서 확인

### 분석이 너무 오래 걸림
- 비디오 파일 크기가 너무 큰 경우 시간이 오래 걸릴 수 있습니다
- 짧은 비디오(1-2분)로 먼저 테스트해보세요

### JSON 파싱 오류
- Gemini가 예상치 못한 형식으로 응답한 경우입니다
- 콘솔 로그를 확인하여 실제 응답 내용을 파악하세요

## 향후 개선 사항

- [ ] 실시간 스트리밍 분석
- [ ] 프레임별 세부 분석
- [ ] 커스텀 위험 상황 정의
- [ ] 분석 결과 저장 및 히스토리
- [ ] 알림 설정 (위험도에 따른)
- [ ] 백엔드 API 서버 구축

## 참고 자료

- [Google Gemini API 문서](https://ai.google.dev/docs)
- [Gemini 비디오 분석 가이드](https://ai.google.dev/tutorials/video_quickstart)

