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
            
            # 파일 경로로 변환하고 존재 여부 확인
            valid_videos = []
            for video in camera_videos:
                video_path = Path(video.file_path)
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
                    try:
                        from app.services.s3_service import S3Service
                        s3_service = S3Service()
                        
                        if s3_service.is_enabled():
                            # S3 키 추정: videos/{camera_id}/{filename}
                            # (CameraVideo에 s3_key 필드가 없으므로 표준 경로 가정)
                            s3_key = f"videos/{self.camera_id}/{video_path.name}"
                            print(f"[영상 큐] 📥 로컬에 파일 없음, S3 다운로드 시도: {s3_key}")
                            
                            # 디렉토리 생성
                            video_path.parent.mkdir(parents=True, exist_ok=True)
                            
                            # 다운로드 (boto3 client 직접 사용 - S3Service에 download_file이 없으므로)
                            s3_service.s3_client.download_file(
                                s3_service.bucket_name,
                                s3_key,
                                str(video_path)
                            )
                            print(f"[영상 큐] ✅ S3 다운로드 성공: {video_path.name}")
                        else:
                             print(f"[영상 큐] ⚠️ 파일이 없고 S3도 비활성화됨: {video_path.name}")
                    except Exception as e:
                        print(f"[영상 큐] ⚠️ S3 다운로드 실패 ({video_path.name}): {e}")

                if video_path.exists():
                    valid_videos.append(video_path)
                else:
                    print(f"[영상 큐] ⚠️ 유효한 영상 파일을 확보하지 못함: {video.file_path}")
            
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

