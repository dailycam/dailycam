"""영상 큐 관리 서비스"""

from pathlib import Path
from typing import List, Optional
import random


class VideoQueue:
    """
    짧은 영상들을 큐에 넣고 순차적으로 재생
    """
    
    def __init__(self, camera_id: str, video_dir: Path):
        self.camera_id = camera_id
        self.video_dir = video_dir
        self.short_clips_dir = video_dir / "short"
        self.medium_clips_dir = video_dir / "medium"
        
        self.current_queue: List[Path] = []
        self.current_index = 0
        
    def load_videos(self, shuffle: bool = True, target_duration_minutes: int = 60):
        """
        영상 파일들을 로드하여 큐에 추가
        
        Args:
            shuffle: 영상 순서를 섞을지 여부
            target_duration_minutes: 목표 재생 시간 (분)
        """
        # 짧은 영상들 (10-15초)
        short_clips = list(self.short_clips_dir.glob("*.mp4"))
        
        # 중간 영상들 (5분)
        medium_clips = list(self.medium_clips_dir.glob("*.mp4"))
        
        if not short_clips and not medium_clips:
            print(f"[영상 큐] 경고: {self.video_dir}에 영상 파일이 없습니다")
            return
        
        # 큐 구성 전략
        # 짧은 영상 10개 = 약 2분 (12초 * 10)
        # 중간 영상 1개 = 5분
        # 총 7분 패턴을 반복
        
        self.current_queue = []
        
        # 목표 시간까지 영상 추가
        pattern_duration = 7  # 분
        num_patterns = (target_duration_minutes // pattern_duration) + 1
        
        for _ in range(num_patterns):
            # 짧은 영상 10개 추가
            if short_clips:
                if shuffle:
                    selected_shorts = random.sample(
                        short_clips, 
                        min(10, len(short_clips))
                    )
                else:
                    selected_shorts = short_clips[:10]
                self.current_queue.extend(selected_shorts)
            
            # 중간 영상 1개 추가
            if medium_clips:
                self.current_queue.append(random.choice(medium_clips))
        
        print(f"[영상 큐] 총 {len(self.current_queue)}개 영상 로드 (목표: {target_duration_minutes}분)")
    
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

