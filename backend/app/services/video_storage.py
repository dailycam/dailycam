"""비디오 파일 저장 서비스"""

import os
import uuid
from pathlib import Path
from typing import Optional
from fastapi import UploadFile


class VideoStorage:
    """비디오 파일 저장 및 관리 클래스"""

    def __init__(self):
        """초기화"""
        self.storage_path = Path(__file__).parent.parent.parent / "storage" / "videos"
        self.storage_path.mkdir(parents=True, exist_ok=True)

    async def save_video(self, video_file: UploadFile) -> str:
        """
        업로드된 비디오 파일을 저장합니다.
        
        Args:
            video_file: 업로드된 비디오 파일
            
        Returns:
            저장된 파일 경로
        """
        # 고유한 파일명 생성
        file_extension = Path(video_file.filename).suffix if video_file.filename else ".mp4"
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = self.storage_path / unique_filename
        
        # 파일 저장
        with open(file_path, "wb") as f:
            content = await video_file.read()
            f.write(content)
        
        return str(file_path)

    def get_video_path(self, filename: str) -> Optional[Path]:
        """
        파일명으로 비디오 경로를 가져옵니다.
        
        Args:
            filename: 파일명
            
        Returns:
            비디오 파일 경로 (없으면 None)
        """
        file_path = self.storage_path / filename
        if file_path.exists():
            return file_path
        return None

    def delete_video(self, file_path: str) -> bool:
        """
        비디오 파일을 삭제합니다.
        
        Args:
            file_path: 삭제할 파일 경로
            
        Returns:
            삭제 성공 여부
        """
        try:
            path = Path(file_path)
            if path.exists():
                path.unlink()
                return True
            return False
        except Exception as e:
            print(f"비디오 파일 삭제 실패: {e}")
            return False

