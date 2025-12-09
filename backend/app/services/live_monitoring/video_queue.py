"""영상 큐 관리 서비스"""

from pathlib import Path
from typing import List, Optional
import random


class VideoQueue:
    """
    짧은 영상들을 큐에 넣고 순차적으로 재생
    사용자 업로드 영상을 우선적으로 사용
    """
    
    def __init__(self, camera_id: str, video_dir: Path, user_id: Optional[int] = None):
        self.camera_id = camera_id
        self.video_dir = video_dir
        self.user_id = user_id
        
        self.current_queue: List[Path] = []
        self.current_index = 0
        
    def load_videos(self, shuffle: bool = True, target_duration_minutes: int = 60):
        """
        영상 파일들을 로드하여 큐에 추가
        ⚠️ 사용자 업로드 영상만 사용 (샘플 영상 사용 안 함)
        
        Args:
            shuffle: 영상 순서를 섞을지 여부
            target_duration_minutes: 목표 재생 시간 (분)
        """
        self.current_queue = []
        
        # 사용자 업로드 영상만 로드 (user_uploaded_로 시작하는 파일)
        user_uploaded_videos = list(self.video_dir.glob("user_uploaded_*.mp4"))
        
        if user_uploaded_videos:
            # 사용자가 업로드한 영상이 있으면 이것만 사용
            print(f"[영상 큐] ✅ 사용자 업로드 영상 {len(user_uploaded_videos)}개 발견")
            
            # 업로드 시간 순으로 정렬 (파일명의 타임스탬프 기준)
            user_uploaded_videos.sort()
            
            if shuffle:
                random.shuffle(user_uploaded_videos)
            
            # 목표 시간까지 반복
            while len(self.current_queue) * 5 < target_duration_minutes * 60:  # 평균 5분 가정
                self.current_queue.extend(user_uploaded_videos)
            
            print(f"[영상 큐] 사용자 업로드 영상을 순환 재생 (총 {len(self.current_queue)}개)")
            return
        
        # 사용자 업로드 영상이 없으면 큐를 비워둠 (샘플 영상 사용 안 함)
        print(f"[영상 큐] ⚠️ 사용자 업로드 영상이 없습니다. 스트림을 시작할 수 없습니다.")
        print(f"[영상 큐] 💡 Settings 페이지에서 영상을 업로드해주세요.")
        return
    
    def get_next_video(self) -> Optional[Path]:
        """
        다음 영상 반환 (순환)
        
        Returns:
            다음 영상 파일 경로 (큐가 비어있으면 None)
        """
        if not self.current_queue:
            return None
        
        video = self.current_queue[self.current_index]
        self.current_index = (self.current_index + 1) % len(self.current_queue)
        return video
    
    def reset(self):
        """큐 인덱스 초기화"""
        self.current_index = 0
    
    def get_queue_size(self) -> int:
        """큐에 있는 영상 개수 반환"""
        return len(self.current_queue)

