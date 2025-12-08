# DailyCam 개발 일지 - 2025년 12월 5일

## 📋 작업 요약
오늘은 **일일 육아 리포트(Daily Report) 기능 구현**, **버그 수정**, 그리고 **UI 개선** 작업을 진행했습니다.

---

## 🎯 주요 기능 추가

### 1. 일일 육아 리포트 (Daily Report) 기능 ✨

#### 개요
- AI가 하루 동안 수집된 영상 분석 데이터를 종합하여 부모님께 전달하는 **일일 육아 리포트** 생성 기능
- 단순 데이터 나열이 아닌, **팩트 기반의 객관적이고 따뜻한 에세이 형식** 리포트
- **PDF 다운로드** 기능 제공 (React-PDF 사용)

#### 구현 내용

**백엔드 (Backend)**
1. **`GeminiService.generate_text_from_prompt()` 메서드 추가**
   - 위치: `backend/app/services/gemini_service.py`
   - 기능: 순수 텍스트 프롬프트를 받아 LLM 응답 생성
   - 용도: 비디오 분석이 아닌 텍스트 기반 리포트 생성에 사용

2. **`ReportService` 생성**
   - 위치: `backend/app/services/report_service.py`
   - 기능:
     - 특정 날짜의 `AnalysisLog`, `SafetyEvent`, `DevelopmentEvent` 데이터 집계
     - 통계 계산 (안전 점수 평균, 사건 빈도, 발달 행동 키워드 등)
     - Gemini LLM에 전달할 프롬프트 구성
     - AI가 작성한 리포트 텍스트 반환

3. **Reports API Router 추가**
   - 위치: `backend/app/api/reports/router.py`
   - 엔드포인트: `GET /api/reports/daily-summary?target_date=YYYY-MM-DD`
   - 응답: `{ "date": "2025-12-05", "report_text": "..." }`

4. **LLM 프롬프트 설계 원칙**
   - ✅ **No Hallucination**: 데이터에 없는 내용 작성 금지
   - ✅ **AI 정체성 유지**: "20년 경력 전문가" 같은 거짓 페르소나 사용 금지
   - ✅ **타임스탬프 나열 금지**: "00:04:33" 같은 비디오 시간 대신 "오전 중" 같은 표현 사용
   - ✅ **마크다운 기호 사용 금지**: `**강조**` 같은 기호 없이 순수 텍스트만 작성
   - ✅ **과장 금지**: 사실 기반의 객관적인 서술

**프론트엔드 (Frontend)**
1. **`DailyReportModal` 컴포넌트**
   - 위치: `frontend/src/features/reports/DailyReportModal.tsx`
   - 기능:
     - API 호출하여 리포트 텍스트 로드
     - 로딩 상태 표시 ("AI 전문가가 리포트를 작성 중입니다...")
     - 마크다운 스타일 텍스트를 HTML로 렌더링 (`parseBold` 함수로 `**text**` → **Bold** 변환)
     - PDF 다운로드 버튼 제공

2. **`DailyReportPDF` 컴포넌트**
   - 위치: `frontend/src/features/reports/DailyReportPDF.tsx`
   - 기능:
     - React-PDF를 사용한 A4 사이즈 PDF 문서 생성
     - 나눔고딕 폰트 적용 (한글 지원)
     - 마크다운 기호(`**`) 자동 제거
     - 전문적인 레이아웃 (헤더, 본문, 푸터)

3. **Dashboard에 리포트 버튼 추가**
   - 위치: `frontend/src/pages/Dashboard.tsx`
   - 우상단에 **[오늘의 육아 리포트]** 버튼 추가
   - 클릭 시 `DailyReportModal` 표시

4. **API 함수 추가**
   - 위치: `frontend/src/api/reportApi.ts`
   - `fetchDailyReport(date: string)` 함수 구현

#### 사용 방법
1. 대시보드 페이지 우상단의 **[오늘의 육아 리포트]** 버튼 클릭
2. 모달에서 AI가 생성한 리포트 확인 (약 5~10초 소요)
3. **[PDF로 소장하기]** 버튼으로 고품질 PDF 다운로드

---

## 🐛 버그 수정

### 1. DevelopmentCategory Enum 에러 수정
**문제:**
```
AttributeError: EMOTIONAL
```
- `analysis_service.py`에서 존재하지 않는 Enum 값(`EMOTIONAL`, `ADAPTIVE`) 사용

**해결:**
- 위치: `backend/app/services/analysis_service.py` (라인 163-175)
- `"정서"` → `DevelopmentCategory.SOCIAL`로 매핑
- `"적응"` → `DevelopmentCategory.SOCIAL`로 매핑
- 실제 Enum 정의에 맞춰 카테고리 매핑 수정

### 2. FFmpeg 경로 에러 수정
**문제:**
```
[Errno 2] No such file or directory: '/app/bin/ffmpeg.exe'
```
- Docker 컨테이너(Linux)에서 Windows 실행 파일(`.exe`) 찾으려고 시도

**해결:**
- 위치: `backend/app/services/gemini_service.py` (라인 382-403)
- `platform.system()`으로 OS 감지
- Windows: `ffmpeg.exe` 사용
- Linux (Docker): `ffmpeg` 사용 (확장자 없음)
- 로컬 bin 폴더 우선, 없으면 시스템 PATH에서 자동 탐색

### 3. MySQL 테이블 생성 타이밍 이슈
**문제:**
- `docker-compose down -v` 후 재시작 시 `users` 테이블 없음 에러

**해결:**
- FastAPI 컨테이너 재시작으로 `Base.metadata.create_all()` 재실행
- MySQL `healthcheck` 조건이 있어도 간헐적으로 발생 가능
- 해결: `docker-compose restart fastapi`

---

## 🎨 UI 개선

### 1. 카드 모서리 둥글기 조정
**변경 사항:**
- 위치: `frontend/tailwind.config.js`
- 사용자 요청에 따라 카드 모서리를 덜 둥글게 조정

```javascript
borderRadius: {
  'xl': '12px',   // 기존 16px → 12px
  '2xl': '14px',  // 기존 20px → 14px
  '3xl': '16px',  // 기존 24px → 16px
}
```

### 2. 리포트 제목 간소화
**변경 사항:**
- "일일 육아 통찰 리포트" → "일일 육아 리포트"
- 위치:
  - `frontend/src/features/reports/DailyReportPDF.tsx`
  - `frontend/src/features/reports/DailyReportModal.tsx`

---

## 📦 새로 추가된 패키지

### 프론트엔드
```bash
npm install @react-pdf/renderer  # PDF 생성 라이브러리
npm install axios                # HTTP 클라이언트 (기존에 없었음)
```

---

## 🗂️ 파일 구조 변경

### 새로 생성된 파일
```
backend/
  app/
    api/
      reports/
        __init__.py
        router.py                    # 새로 추가
    services/
      report_service.py              # 새로 추가

frontend/
  src/
    api/
      reportApi.ts                   # 새로 추가
    features/
      reports/
        DailyReportModal.tsx         # 새로 추가
        DailyReportPDF.tsx           # 새로 추가
```

### 수정된 파일
```
backend/
  app/
    main.py                          # report_router 등록
    services/
      gemini_service.py              # generate_text_from_prompt 메서드 추가, FFmpeg 경로 수정
      analysis_service.py            # DevelopmentCategory 매핑 수정

frontend/
  src/
    pages/
      Dashboard.tsx                  # 리포트 버튼 및 모달 추가
  tailwind.config.js                 # borderRadius 값 조정
```

---

## 🔧 환경 설정 변경

### Docker Compose
- 기존 설정 유지
- `DELETE_VIDEO_AFTER_ANALYSIS=false` (이전 세션에서 설정)

---

## ✅ 테스트 체크리스트

### 일일 리포트 기능
- [ ] 영상 업로드 및 분석 완료
- [ ] 대시보드에서 [오늘의 육아 리포트] 버튼 표시 확인
- [ ] 버튼 클릭 시 모달 정상 표시
- [ ] 리포트 텍스트 로딩 및 표시 확인
- [ ] 마크다운 기호(`**`) 없이 깔끔한 텍스트 표시 확인
- [ ] PDF 다운로드 버튼 클릭 시 PDF 생성 및 다운로드 확인
- [ ] PDF 내용 확인 (한글 폰트, 레이아웃, 내용)

### 버그 수정 확인
- [ ] 새 영상 분석 시 `DevelopmentEvent` 정상 저장 확인
- [ ] 발달 리포트 페이지에서 "금일 발달 행동 빈도" 데이터 표시 확인
- [ ] FFmpeg 비디오 최적화 정상 작동 확인
- [ ] Worker 로그에서 에러 없음 확인

### UI 개선 확인
- [ ] 카드 모서리가 덜 둥글게 표시되는지 확인
- [ ] 리포트 제목에 "통찰" 단어 없음 확인

---

## 📝 향후 개선 사항

### 일일 리포트 기능
1. **리포트 캐싱**
   - 같은 날짜의 리포트를 여러 번 요청할 경우 DB에 저장된 리포트 재사용
   - `daily_reports` 테이블 활용

2. **리포트 히스토리**
   - 과거 날짜의 리포트 조회 기능
   - 날짜 선택 UI 추가

3. **리포트 커스터마이징**
   - 부모가 관심 있는 영역(안전/발달) 선택 가능
   - 리포트 길이 조절 옵션

4. **이메일 발송**
   - 매일 자동으로 리포트를 이메일로 발송하는 기능

### 발달 행동 빈도 데이터
1. **데이터 시각화 개선**
   - 차트에 애니메이션 추가
   - 주간/월간 트렌드 비교 기능

2. **카테고리 세분화**
   - 대근육/소근육 분리 표시
   - 사회성/정서 분리 표시

---

## 🚀 배포 시 주의사항

1. **환경 변수 확인**
   - `GEMINI_API_KEY` 설정 필수
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` 설정 필수

2. **FFmpeg 설치 확인**
   - Docker 이미지에 FFmpeg 포함 여부 확인
   - `Dockerfile`에 `RUN apt-get install -y ffmpeg` 포함 권장

3. **MySQL 볼륨 백업**
   - `docker-compose down -v` 사용 시 모든 데이터 삭제됨
   - 프로덕션에서는 볼륨 백업 필수

4. **프론트엔드 빌드**
   - `npm run build` 후 정적 파일 서빙 확인
   - PDF 생성 시 폰트 로딩 확인 (CDN 의존성)

---

## 👥 기여자
- AI Assistant (Gemini)
- 사용자 (301)

---

## 📅 작업 일시
- 2025년 12월 5일
- 작업 시간: 약 4시간

---

## 🔗 관련 문서
- [FEATURE_HIGHLIGHT_CLIPS_2025_12_05.md](./FEATURE_HIGHLIGHT_CLIPS_2025_12_05.md) - 클립 하이라이트 기능 개발 일지
- [DOCKER_SETUP.md](./DOCKER_SETUP.md) - Docker 환경 설정 가이드
