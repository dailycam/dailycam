"""
백엔드 서버 실행 스크립트

사용법:
    python run.py
"""

import uvicorn
from pathlib import Path
import sys

def check_and_install_ffmpeg():
    """FFmpeg 설치 확인 및 자동 설치"""
    backend_dir = Path(__file__).resolve().parent
    ffmpeg_path = backend_dir / "bin" / "ffmpeg.exe"
    
    if ffmpeg_path.exists():
        print("[서버] FFmpeg 확인 완료")
        return
    
    print("[서버] FFmpeg가 설치되어 있지 않습니다.")
    print("[서버] FFmpeg 자동 설치를 시작합니다...")
    
    try:
        # download_ffmpeg 모듈 import 및 실행
        sys.path.insert(0, str(backend_dir))
        from download_ffmpeg import download_ffmpeg
        download_ffmpeg()
        print("[서버] FFmpeg 설치 완료")
    except Exception as e:
        print(f"[서버] FFmpeg 자동 설치 실패: {e}")
        print("[서버] 수동으로 설치하려면: python backend/download_ffmpeg.py")
        print("[서버] 계속 진행합니다...")

if __name__ == "__main__":
    # FFmpeg 자동 설치 체크
    check_and_install_ffmpeg()
    
    # 서버 시작
    print("[서버] 백엔드 서버를 시작합니다...")
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
