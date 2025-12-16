"""영상 큐 관리 서비스 - DB 기반"""

from pathlib import Path
from typing import List, Optional
import random
from sqlalchemy.orm import Session
from app.models.camera_setting import CameraSetting, CameraVideo


class VideoQueue:
    """
    짧은 영상들을 큐에 넣고 순차적으로 재생
    DB에서 활성화된 사용자 업로드 영상을 조회하여 사용
    """
    
    def __init__(self, camera_id: str, video_dir: Path, user_id: Optional[int] = None, db: Optional[Session] = None):
        self.camera_id = camera_id
        self.video_dir = video_dir
        self.user_id = user_id
        self.db = db
        
        self.current_queue: List[Path] = []
        self.current_index = 0
        
    def load_videos(self, shuffle: bool = True, target_duration_minutes: int = 60):
        """
        DB에서 활성화된 영상 파일들을 로드하여 큐에 추가
        ⚠️ DB 기반으로 동작 (로컬 파일 스캔 대신)
        
        Args:
            shuffle: 영상 순서를 섞을지 여부
            target_duration_minutes: 목표 재생 시간 (분)
        """
        self.current_queue = []
        
        if not self.db:
            print(f"[영상 큐] ⚠️ DB 세션이 없어 로컬 파일 시스템을 사용합니다.")
            # 폴백: 로컬 파일 시스템 사용
            user_uploaded_videos = list(self.video_dir.glob("user_uploaded_*.mp4"))
            if user_uploaded_videos:
                user_uploaded_videos.sort()
                if shuffle:
                    random.shuffle(user_uploaded_videos)
                while len(self.current_queue) * 5 < target_duration_minutes * 60:
                    self.current_queue.extend(user_uploaded_videos)
                print(f"[영상 큐] 로컬 파일 {len(user_uploaded_videos)}개 사용")
            return
        
        # DB에서 활성화된 영상 조회
        try:
            # CameraSetting 찾기
            camera_setting = self.db.query(CameraSetting).filter(
                CameraSetting.camera_id == self.camera_id,
                CameraSetting.is_active == True
            ).first()
            
            if not camera_setting:
                print(f"[영상 큐] ⚠️ 카메라 설정을 찾을 수 없습니다: {self.camera_id}")
                return
            
            # 활성화된 영상들 조회 (order_index 순서대로)
            camera_videos = self.db.query(CameraVideo).filter(
                CameraVideo.camera_setting_id == camera_setting.id,
                CameraVideo.is_active == True
            ).order_by(CameraVideo.order_index).all()
            
            if not camera_videos:
                print(f"[영상 큐] ⚠️ 활성화된 영상이 없습니다. Settings 페이지에서 영상을 업로드해주세요.")
                return
            
            # S3에서 영상을 다운로드하여 로컬에 저장하고 큐에 추가
            valid_videos = []
            from app.services.s3_service import S3Service
            s3_service = S3Service()
            
            for video in camera_videos:
                video_path = Path(video.file_path)
<<<<<<< HEAD
<<<<<<< HEAD
                if video_path.exists():
                    valid_videos.append(video_path)
                else:
                    print(f"[영상 큐] ⚠️ 파일이 존재하지 않습니다: {video.file_path}")
            
            if not valid_videos:
                print(f"[영상 큐] ⚠️ 유효한 영상 파일이 없습니다.")
=======
                if not video_path.exists():
                    # 로컬에 파일이 없으면 S3에서 다운로드 시도
=======
                
                # S3에서 영상 다운로드 시도
                if s3_service.is_enabled():
>>>>>>> aeeee4d7df38868b2068c57a6b64016cbbe1e4ef
                    try:
                        # s3_key 우선 사용, 없으면 표준 경로 추정
                        if video.s3_key:
                            s3_key = video.s3_key
                            print(f"[영상 큐] 📥 S3 키 사용: {s3_key}")
                        else:
                            # 표준 경로 추정: videos/{camera_id}/{filename}
                            s3_key = f"videos/{self.camera_id}/{video_path.name}"
                            print(f"[영상 큐] 📥 S3 키 추정: {s3_key}")
                        
                        # 디렉토리 생성
                        video_path.parent.mkdir(parents=True, exist_ok=True)
                        
                        # S3에서 다운로드 (로컬 파일이 있어도 S3 최신 버전으로 덮어쓰기)
                        print(f"[영상 큐] 📥 S3에서 다운로드 중: {s3_key} → {video_path}")
                        success = s3_service.download_camera_video(s3_key, video_path)
                        
                        if success and video_path.exists():
                            print(f"[영상 큐] ✅ S3 다운로드 성공: {video_path.name}")
                            valid_videos.append(video_path)
                        else:
                            print(f"[영상 큐] ⚠️ S3 다운로드 실패 또는 파일 없음: {video_path}")
                            
                    except Exception as e:
                        # S3 다운로드 실패 시 로컬 파일 확인 (폴백)
                        print(f"[영상 큐] ⚠️ S3 다운로드 실패 ({video_path.name}): {e}")
                        if video_path.exists():
                            print(f"[영상 큐] 📁 로컬 파일 사용 (폴백): {video_path.name}")
                            valid_videos.append(video_path)
                        else:
                            print(f"[영상 큐] ❌ S3 다운로드 실패하고 로컬 파일도 없음: {video.file_path}")
                else:
                    # S3가 비활성화된 경우 로컬 파일 확인
                    print(f"[영상 큐] ⚠️ S3가 비활성화됨, 로컬 파일 확인: {video_path.name}")
                    if video_path.exists():
                        valid_videos.append(video_path)
                    else:
                        print(f"[영상 큐] ⚠️ 로컬 파일이 없고 S3도 비활성화됨: {video.file_path}")
            
            if not valid_videos:
                print(f"[영상 큐] ⚠️ 재생할 수 있는 영상이 없습니다.")
>>>>>>> 339dc48c4d9f2d2a4a72d593e47305b717dc4c6e
                return
            
            print(f"[영상 큐] ✅ DB에서 활성화된 영상 {len(valid_videos)}개 발견")
            
            if shuffle:
                random.shuffle(valid_videos)
            
            # 목표 시간까지 반복 (평균 5분 가정)
            while len(self.current_queue) * 5 < target_duration_minutes * 60:
                self.current_queue.extend(valid_videos)
            
            print(f"[영상 큐] 영상을 순환 재생 큐에 추가 (총 {len(self.current_queue)}개)")
            
        except Exception as e:
            print(f"[영상 큐] ❌ DB 조회 중 오류: {e}")
            # 폴백: 로컬 파일 시스템 사용
            user_uploaded_videos = list(self.video_dir.glob("user_uploaded_*.mp4"))
            if user_uploaded_videos:
                user_uploaded_videos.sort()
                if shuffle:
                    random.shuffle(user_uploaded_videos)
                while len(self.current_queue) * 5 < target_duration_minutes * 60:
                    self.current_queue.extend(user_uploaded_videos)
                print(f"[영상 큐] 폴백: 로컬 파일 {len(user_uploaded_videos)}개 사용")
    
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

