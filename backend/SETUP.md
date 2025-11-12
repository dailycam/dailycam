# 백엔드 서버 설정 가이드

## 🚨 중요: 환경 변수 설정 필수!

서버를 실행하기 전에 반드시 환경 변수를 설정해야 합니다.

## 1️⃣ .env 파일 생성

`backend` 폴더에 `.env` 파일을 생성하세요:

### Windows (PowerShell)
```powershell
cd backend
Copy-Item .env.example .env
notepad .env
```

### Windows (명령 프롬프트)
```cmd
cd backend
copy .env.example .env
notepad .env
```

### Linux/Mac
```bash
cd backend
cp .env.example .env
nano .env
```

## 2️⃣ Gemini API 키 발급

1. https://aistudio.google.com/apikey 접속
2. Google 계정으로 로그인
3. "Create API Key" 클릭
4. 생성된 API 키 복사

## 3️⃣ API 키 설정

`.env` 파일을 열고 다음과 같이 입력:

```env
GEMINI_API_KEY=여기에_복사한_API_키_붙여넣기
```

**예시:**
```env
GEMINI_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

⚠️ **주의사항:**
- `GEMINI_API_KEY=` 뒤에 공백 없이 바로 API 키를 입력하세요
- 따옴표(`"` 또는 `'`)를 사용하지 마세요
- API 키 앞뒤에 공백이 없도록 주의하세요

## 4️⃣ 서버 실행

```bash
# backend 디렉토리에서
python -m uvicorn app.main:app --reload --port 8000
```

또는

```bash
python run.py
```

Windows에서는:
```cmd
start.bat
```

## ✅ 성공 확인

서버가 정상적으로 시작되면:
- http://localhost:8000 접속 가능
- http://localhost:8000/docs 에서 API 문서 확인

## 🐛 문제 해결

### "GEMINI_API_KEY 환경 변수가 설정되지 않았습니다" 오류

**원인:**
- `.env` 파일이 `backend` 폴더에 없음
- `.env` 파일에 `GEMINI_API_KEY`가 설정되지 않음
- API 키 형식이 잘못됨

**해결:**
1. `backend/.env` 파일이 있는지 확인
2. 파일 내용 확인:
   ```env
   GEMINI_API_KEY=AIzaSy...
   ```
3. 서버 재시작

### API 키가 유효하지 않음

**확인:**
1. https://aistudio.google.com/apikey 에서 API 키 상태 확인
2. 키가 활성화되어 있는지 확인
3. 새로운 키를 발급받아 다시 시도

### 서버가 시작되지 않음

**확인:**
1. Python 버전: Python 3.8 이상 필요
   ```bash
   python --version
   ```

2. 의존성 설치:
   ```bash
   pip install -r requirements.txt
   ```

3. 포트 충돌: 8000번 포트가 이미 사용 중인지 확인
   ```bash
   # 다른 포트로 실행
   python -m uvicorn app.main:app --reload --port 8001
   ```

## 📂 파일 구조

```
backend/
├── .env                    # 환경 변수 (직접 생성)
├── .env.example            # 환경 변수 예시
├── app/
│   ├── main.py
│   └── services/
│       └── gemini_service.py
└── requirements.txt
```

## 🔐 보안

⚠️ **절대 `.env` 파일을 Git에 커밋하지 마세요!**

`.gitignore`에 다음이 포함되어 있는지 확인:
```
.env
*.env
```

