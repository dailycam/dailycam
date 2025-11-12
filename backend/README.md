
# DailyCam Backend

영유아 안전 모니터링 시스템의 백엔드 서버입니다. Gemini 2.5 Flash를 사용하여 비디오 분석을 수행합니다.

## 🚀 시작하기

### 1. 환경 변수 설정

`backend/.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

**Gemini API 키 발급:**
1. [Google AI Studio](https://aistudio.google.com/apikey) 접속
2. "Create API Key" 클릭
3. 생성된 API 키 복사하여 `.env` 파일에 추가

### 2. 의존성 설치

```bash
cd backend
pip install -r requirements.txt
```

### 3. 서버 실행

**방법 1: uvicorn 명령어 (권장)**
```bash
uvicorn app.main:app --reload --port 8000
```

**방법 2: Python 모듈로 실행**
```bash
python -m uvicorn app.main:app --reload --port 8000
```

**방법 3: 실행 스크립트 (간편)**
```bash
# Windows
start.bat

# 또는 Python 스크립트
python run.py
```

서버가 실행되면 다음 URL에서 확인할 수 있습니다:
- **API 서버**: http://localhost:8000
- **자동 문서 (Swagger)**: http://localhost:8000/docs
- **대체 문서 (ReDoc)**: http://localhost:8000/redoc

## 📡 API 엔드포인트

### 비디오 분석

**POST** `/api/homecam/analyze-video`

비디오 파일을 업로드하여 Gemini 2.5 Flash로 안전 분석을 수행합니다.

**Request:**
- Content-Type: `multipart/form-data`
- Body: `video` (file) - 비디오 파일

**Response:**
```json
{
  "total_incidents": 3,
  "falls": 1,
  "dangerous_actions": 1,
  "safety_score": 75,
  "timeline_events": [
    {
      "timestamp": "00:00:15",
      "type": "fall",
      "description": "아이가 소파에서 내려오다가 균형을 잃고 넘어졌습니다",
      "severity": "high"
    }
  ],
  "summary": "대체로 안전하나 1회 넘어짐이 감지되었습니다",
  "recommendations": [
    "소파 주변에 안전 매트를 설치하세요",
    "아이가 높은 곳에서 내려올 때 보호자가 지켜봐 주세요"
  ]
}
```

## 🛠 기술 스택

- **FastAPI** - 현대적인 Python 웹 프레임워크
- **Google Generative AI** - Gemini 2.5 Flash 모델
- **Uvicorn** - ASGI 서버
- **Pydantic** - 데이터 검증

## 📁 프로젝트 구조
# Backend Scaffold

This directory contains the Python backend scaffold for the DailyCam project.
It is organised to make it easy to plug in camera-integration logic that will
talk to Gemini 2.5 Flash or any other provider.

```
backend/
├── app/
│   ├── api/                    # API 라우터
│   │   └── homecam/
│   │       └── router.py       # 홈캠 관련 엔드포인트
│   ├── services/
│   │   └── gemini_service.py   # Gemini AI 서비스
│   ├── schemas/                # Pydantic 스키마
│   │   └── homecam/
│   │       └── video_analysis.py
│   └── main.py                 # FastAPI 앱 진입점
├── .env                        # 환경 변수 (gitignore)
├── .env.example                # 환경 변수 예시
├── requirements.txt            # Python 의존성
└── README.md
```

## 🔧 개발

### 코드 포맷팅
```bash
black app/
```

### 타입 체크
```bash
mypy app/
```

## 🐛 문제 해결

### "GEMINI_API_KEY 환경 변수가 설정되지 않았습니다"
- `.env` 파일이 `backend/` 폴더에 있는지 확인
- `GEMINI_API_KEY=your_key` 형식으로 올바르게 작성되었는지 확인
- 서버를 재시작

### CORS 오류
- `app/main.py`의 `allow_origins`에 프론트엔드 URL이 포함되어 있는지 확인
- 현재 설정: `http://localhost:5173` (Vite 기본 포트)

### 비디오 업로드 실패
- 비디오 파일 크기 확인 (너무 크면 타임아웃 발생 가능)
- Content-Type이 `video/*`인지 확인

## 📚 참고 자료

- [FastAPI 문서](https://fastapi.tiangolo.com/)
- [Gemini API 문서](https://ai.google.dev/docs)
- [Google AI Studio](https://aistudio.google.com/)
│   ├── api/
│   │   ├── analytics/      # FastAPI routers grouped by domain
│   │   ├── daily_report/
│   │   ├── homecam/
│   │   ├── live_monitoring/
│   │   └── video_highlights/
│   ├── models/
│   │   ├── analytics/      # Domain models or ORM entities
│   │   ├── daily_report/
│   │   ├── homecam/
│   │   ├── live_monitoring/
│   │   └── video_highlights/
│   ├── schemas/
│   │   ├── analytics/      # Pydantic request/response schemas
│   │   ├── daily_report/
│   │   ├── homecam/
│   │   ├── live_monitoring/
│   │   └── video_highlights/
│   └── services/
│       ├── analytics/      # Business logic (e.g. analytics aggregation)
│       ├── daily_report/
│       ├── homecam/
│       ├── live_monitoring/
│       └── video_highlights/
└── pyproject.toml        # Python project configuration
```

### Next Steps

1. Install dependencies (FastAPI, Uvicorn, google-generativeai, etc.).
2. Flesh out each domain service (e.g. `app/services/homecam/service.py`, `app/services/analytics/service.py`).
3. Expose API endpoints in the corresponding routers and ensure they are included in `app/main.py`.
4. Wire the frontend to call the new backend endpoi