@echo off
echo ========================================
echo DailyCam Backend Server Starting...
echo ========================================
echo.

REM 환경 변수 확인
if not exist .env (
    echo [ERROR] .env 파일이 없습니다!
    echo .env.example을 복사하여 .env 파일을 생성하고 GEMINI_API_KEY를 설정하세요.
    pause
    exit /b 1
)

echo [INFO] 백엔드 서버를 시작합니다...
echo [INFO] API: http://localhost:8000
echo [INFO] Swagger 문서: http://localhost:8000/docs
echo.

uvicorn app.main:app --reload --port 8000

