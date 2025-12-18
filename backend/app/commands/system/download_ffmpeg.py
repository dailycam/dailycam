"""
FFmpeg 자동 다운로드 및 설치 스크립트
Windows용 FFmpeg 빌드를 다운로드하여 backend/bin 폴더에 설치합니다.
"""

import os
import sys
import zipfile
import shutil
import urllib.request
from pathlib import Path
import ssl

# SSL 인증서 오류 무시 (일부 환경 호환성)
ssl._create_default_https_context = ssl._create_unverified_context

def download_ffmpeg():
    # 설정 - 안정적인 최신 버전 사용
    FFMPEG_URL = "https://github.com/GyanD/codexffmpeg/releases/download/7.1/ffmpeg-7.1-essentials_build.zip"
    
    # backend 루트 디렉토리 (scripts 폴더의 상위 폴더)
    backend_dir = Path(__file__).resolve().parent.parent
    bin_dir = backend_dir / "bin"
    temp_zip = backend_dir / "ffmpeg_temp.zip"
    
    print("[FFmpeg] 설치 시작...")
    print(f"[FFmpeg] 설치 위치: {bin_dir}")
    
    # bin 디렉토리 생성
    if not bin_dir.exists():
        bin_dir.mkdir(parents=True)
    
    # 이미 설치되어 있는지 확인
    if (bin_dir / "ffmpeg.exe").exists():
        print("[FFmpeg] 이미 설치되어 있습니다.")
        return

    # 다운로드
    print("[FFmpeg] 다운로드 중... (약 130MB)")
    try:
        urllib.request.urlretrieve(FFMPEG_URL, temp_zip)
        print("[FFmpeg] 다운로드 완료")
    except Exception as e:
        print(f"[FFmpeg] 다운로드 실패: {e}")
        return

    # 압축 해제
    print("[FFmpeg] 압축 해제 및 설치 중...")
    try:
        with zipfile.ZipFile(temp_zip, 'r') as zip_ref:
            # 압축 파일 내의 ffmpeg.exe 찾기
            ffmpeg_src = None
            for file in zip_ref.namelist():
                if file.endswith('bin/ffmpeg.exe'):
                    ffmpeg_src = file
                    break
            
            if ffmpeg_src:
                # ffmpeg.exe만 추출해서 bin 폴더로 이동
                zip_ref.extract(ffmpeg_src, backend_dir)
                
                # 추출된 파일 경로
                extracted_path = backend_dir / ffmpeg_src
                target_path = bin_dir / "ffmpeg.exe"
                
                # 이동
                shutil.move(str(extracted_path), str(target_path))
                
                # 임시 폴더 정리 (압축 해제로 생긴 최상위 폴더)
                extracted_root = backend_dir / ffmpeg_src.split('/')[0]
                if extracted_root.exists() and extracted_root != backend_dir:
                    shutil.rmtree(extracted_root)
                    
                print(f"[FFmpeg] 설치 완료: {target_path}")
            else:
                print("[FFmpeg] 압축 파일 내에서 ffmpeg.exe를 찾을 수 없습니다.")
                
    except Exception as e:
        print(f"[FFmpeg] 설치 중 오류 발생: {e}")
    finally:
        # 임시 zip 파일 삭제
        if temp_zip.exists():
            os.remove(temp_zip)

if __name__ == "__main__":
    download_ffmpeg()
