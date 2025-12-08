@echo off
REM VLM 분석 워커 시작 스크립트

echo ============================================================
echo VLM 분석 워커 시작
echo ============================================================

cd /d "%~dp0"

REM 가상환경 활성화 (있는 경우)
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
)

REM 워커 실행
python analysis_worker.py

pause

