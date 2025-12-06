"""클립 생성 서비스 - HLS 아카이브에서 하이라이트 클립 자동 생성"""

import cv2
import subprocess
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from sqlalchemy.orm import Session

from app.models.clip import HighlightClip, ClipCategory
from app.models.live_monitoring.models import SegmentAnalysis
from app.database.session import get_db


class ClipGenerator:
    """
    HLS 아카이브 영상에서 하이라이트 클립 자동 생성
    
    - 안전 이벤트 (위험 상황)
    - 발달 마일스톤 (첫 걸음, 새로운 행동 등)
    """
    
    def __init__(self, camera_id: str):
        self.camera_id = camera_id
        self.archive_dir = Path(f"temp_videos/hls_buffer/{camera_id}/archive")
        self.clips_dir = Path(f"videos/clips/{camera_id}")
        self.clips_dir.mkdir(parents=True, exist_ok=True)
        
        # 썸네일 디렉토리
        self.thumbnails_dir = Path(f"videos/clips/{camera_id}/thumbnails")
        self.thumbnails_dir.mkdir(parents=True, exist_ok=True)
        
        # FFmpeg 경로 찾기
        self.ffmpeg_path = self._find_ffmpeg()
    
    def _find_ffmpeg(self) -> str:
        """FFmpeg 경로 찾기"""
        import shutil
        import platform
        
        # 1. PATH에서 찾기
        ffmpeg_path = shutil.which('ffmpeg')
        if ffmpeg_path:
            return ffmpeg_path
        
        # 2. Windows 일반 경로들
        if platform.system() == 'Windows':
            common_paths = [
                r"C:\ffmpeg\ffmpeg-8.0.1-essentials_build\ffmpeg-8.0.1-essentials_build\bin\ffmpeg.exe",
                r"C:\ffmpeg\bin\ffmpeg.exe",
                Path(__file__).resolve().parents[2] / "bin" / "ffmpeg.exe",
            ]
            for path in common_paths:
                if Path(path).exists():
                    return str(path)
        
        return "ffmpeg"  # 기본값
    
    async def generate_clips_from_segment_analysis(
        self, 
        segment_analysis: SegmentAnalysis,
        db: Session
    ) -> List[HighlightClip]:
        """
        10분 단위 분석 결과에서 클립 생성
        
        Args:
            segment_analysis: 분석 완료된 세그먼트
            db: 데이터베이스 세션
            
        Returns:
            생성된 클립 리스트
        """
        clips = []
        
        # 1. 안전 이벤트 클립 생성
        if segment_analysis.safety_incidents:
            safety_clips = await self._create_safety_clips(segment_analysis, db)
            clips.extend(safety_clips)
        
        # 2. 발달 마일스톤 클립 생성
        if segment_analysis.development_milestones:
            development_clips = await self._create_development_clips(segment_analysis, db)
            clips.extend(development_clips)
        
        return clips
    
    async def _create_safety_clips(
        self, 
        segment_analysis: SegmentAnalysis,
        db: Session
    ) -> List[HighlightClip]:
        """안전 이벤트에서 클립 생성"""
        clips = []
        
        # safety_incidents는 JSON 형태로 저장됨
        incidents = segment_analysis.safety_incidents or []
        
        for idx, incident in enumerate(incidents):
            # 중요도가 높은 이벤트만 클립으로 생성
            severity = incident.get('severity', '').lower()
            if severity not in ['danger', 'warning', '위험', '주의']:
                continue
            
            # 클립 생성
            clip_info = await self._extract_clip(
                segment_analysis=segment_analysis,
                event_data=incident,
                clip_index=idx,
                category=ClipCategory.SAFETY
            )
            
            if clip_info:
                clip = HighlightClip(
                    title=incident.get('title', '안전 이벤트'),
                    description=incident.get('description', ''),
                    video_url=clip_info['video_url'],
                    thumbnail_url=clip_info['thumbnail_url'],
                    category=ClipCategory.SAFETY,
                    sub_category=incident.get('category', '안전'),
                    importance='high' if severity in ['danger', '위험'] else 'medium',
                    duration_seconds=clip_info['duration'],
                )
                
                db.add(clip)
                clips.append(clip)
        
        if clips:
            db.commit()
            print(f"[클립 생성] ✅ 안전 클립 {len(clips)}개 생성 완료")
        
        return clips
    
    async def _create_development_clips(
        self, 
        segment_analysis: SegmentAnalysis,
        db: Session
    ) -> List[HighlightClip]:
        """발달 마일스톤에서 클립 생성"""
        clips = []
        
        milestones = segment_analysis.development_milestones or []
        
        for idx, milestone in enumerate(milestones):
            # 중요한 마일스톤만 클립으로 생성
            importance = milestone.get('importance', '').lower()
            if importance not in ['high', 'medium', '높음', '중간']:
                continue
            
            # 클립 생성
            clip_info = await self._extract_clip(
                segment_analysis=segment_analysis,
                event_data=milestone,
                clip_index=idx,
                category=ClipCategory.DEVELOPMENT
            )
            
            if clip_info:
                clip = HighlightClip(
                    title=milestone.get('title', '발달 마일스톤'),
                    description=milestone.get('description', ''),
                    video_url=clip_info['video_url'],
                    thumbnail_url=clip_info['thumbnail_url'],
                    category=ClipCategory.DEVELOPMENT,
                    sub_category=milestone.get('category', '발달'),
                    importance=importance if importance in ['high', 'medium', 'low'] else 'medium',
                    duration_seconds=clip_info['duration'],
                )
                
                db.add(clip)
                clips.append(clip)
        
        if clips:
            db.commit()
            print(f"[클립 생성] ✅ 발달 클립 {len(clips)}개 생성 완료")
        
        return clips
    
    async def _extract_clip(
        self,
        segment_analysis: SegmentAnalysis,
        event_data: Dict,
        clip_index: int,
        category: ClipCategory
    ) -> Optional[Dict]:
        """
        원본 영상에서 클립 추출
        
        Returns:
            {
                'video_url': '/videos/clips/camera-1/clip_xxx.mp4',
                'thumbnail_url': '/videos/clips/camera-1/thumbnails/clip_xxx.jpg',
                'duration': 15
            }
        """
        # 1. 원본 영상 파일 찾기
        archive_dir = Path(f"temp_videos/hls_buffer/{self.camera_id}/archive")
        segment_start = segment_analysis.segment_start
        
        # 아카이브 파일명: archive_YYYYMMDD_HHMMSS.mp4
        archive_filename = f"archive_{segment_start.strftime('%Y%m%d_%H%M%S')}.mp4"
        source_video = archive_dir / archive_filename
        
        if not source_video.exists():
            # 패턴 매칭으로 찾기
            pattern = f"archive_{segment_start.strftime('%Y%m%d_%H%M')}*.mp4"
            matches = list(archive_dir.glob(pattern))
            if matches:
                source_video = matches[0]
            else:
                print(f"[클립 생성] ❌ 원본 영상 없음: {archive_filename}")
                return None
        
        # 2. 클립 파일명 생성
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        category_prefix = "safety" if category == ClipCategory.SAFETY else "dev"
        clip_filename = f"clip_{category_prefix}_{timestamp}_{clip_index}.mp4"
        clip_path = self.clips_dir / clip_filename
        
        # 3. 이벤트 발생 시간 추정 (세그먼트 중간 부분)
        # 실제로는 event_data에 timestamp가 있으면 사용
        event_timestamp = event_data.get('timestamp')
        if event_timestamp:
            # timestamp가 문자열인 경우 파싱
            if isinstance(event_timestamp, str):
                try:
                    event_time = datetime.fromisoformat(event_timestamp.replace('Z', '+00:00'))
                except:
                    event_time = segment_start + timedelta(minutes=5)  # 중간 지점
            else:
                event_time = event_timestamp
        else:
            # 세그먼트 중간 지점 사용
            event_time = segment_start + timedelta(minutes=5)
        
        # 세그먼트 시작 시간으로부터 몇 초 후인지 계산
        offset_seconds = (event_time - segment_start).total_seconds()
        
        # 4. 클립 추출 (이벤트 전후 15초, 총 30초)
        clip_duration = 30
        start_time = max(0, offset_seconds - 15)
        
        # FFmpeg로 클립 추출
        success = await self._extract_video_clip(
            source_video=source_video,
            output_path=clip_path,
            start_time=start_time,
            duration=clip_duration
        )
        
        if not success:
            return None
        
        # 5. 썸네일 생성 (클립 중간 프레임)
        thumbnail_filename = f"{clip_filename.replace('.mp4', '.jpg')}"
        thumbnail_path = self.thumbnails_dir / thumbnail_filename
        
        await self._generate_thumbnail(
            video_path=clip_path,
            thumbnail_path=thumbnail_path,
            timestamp=clip_duration / 2  # 중간 프레임
        )
        
        # 6. URL 반환 (웹에서 접근 가능한 경로)
        return {
            'video_url': f"/videos/clips/{self.camera_id}/{clip_filename}",
            'thumbnail_url': f"/videos/clips/{self.camera_id}/thumbnails/{thumbnail_filename}",
            'duration': clip_duration
        }
    
    async def _extract_video_clip(
        self,
        source_video: Path,
        output_path: Path,
        start_time: float,
        duration: int
    ) -> bool:
        """FFmpeg로 영상 클립 추출"""
        try:
            cmd = [
                self.ffmpeg_path,
                '-y',  # 덮어쓰기
                '-ss', str(start_time),  # 시작 시간
                '-i', str(source_video),  # 입력 파일
                '-t', str(duration),  # 길이
                '-c:v', 'libx264',  # 비디오 코덱
                '-preset', 'fast',
                '-crf', '23',
                '-c:a', 'aac',  # 오디오 코덱 (있는 경우)
                '-movflags', '+faststart',  # 웹 재생 최적화
                str(output_path)
            ]
            
            result = subprocess.run(
                cmd,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                timeout=60,
                creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, 'CREATE_NO_WINDOW') else 0
            )
            
            if result.returncode == 0 and output_path.exists():
                print(f"[클립 생성] ✅ 클립 추출 완료: {output_path.name}")
                return True
            else:
                print(f"[클립 생성] ❌ FFmpeg 실패 (code: {result.returncode})")
                return False
                
        except Exception as e:
            print(f"[클립 생성] ❌ 클립 추출 오류: {e}")
            return False
    
    async def _generate_thumbnail(
        self,
        video_path: Path,
        thumbnail_path: Path,
        timestamp: float = 0
    ) -> bool:
        """영상에서 썸네일 생성"""
        try:
            # FFmpeg로 썸네일 추출
            cmd = [
                self.ffmpeg_path,
                '-y',
                '-ss', str(timestamp),
                '-i', str(video_path),
                '-vframes', '1',  # 1프레임만
                '-q:v', '2',  # 품질
                str(thumbnail_path)
            ]
            
            result = subprocess.run(
                cmd,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                timeout=30,
                creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, 'CREATE_NO_WINDOW') else 0
            )
            
            if result.returncode == 0 and thumbnail_path.exists():
                print(f"[클립 생성] ✅ 썸네일 생성 완료: {thumbnail_path.name}")
                return True
            else:
                print(f"[클립 생성] ❌ 썸네일 생성 실패")
                return False
                
        except Exception as e:
            print(f"[클립 생성] ❌ 썸네일 생성 오류: {e}")
            return False


async def generate_clips_for_segment(camera_id: str, segment_analysis_id: int):
    """
    특정 세그먼트 분석 결과에서 클립 생성 (외부 호출용)
    
    Args:
        camera_id: 카메라 ID
        segment_analysis_id: 세그먼트 분석 ID
    """
    db = next(get_db())
    
    try:
        # 세그먼트 분석 결과 조회
        segment_analysis = db.query(SegmentAnalysis).filter(
            SegmentAnalysis.id == segment_analysis_id,
            SegmentAnalysis.camera_id == camera_id,
            SegmentAnalysis.status == 'completed'
        ).first()
        
        if not segment_analysis:
            print(f"[클립 생성] ❌ 세그먼트 분석 결과 없음: {segment_analysis_id}")
            return
        
        # 클립 생성기 실행
        generator = ClipGenerator(camera_id)
        clips = await generator.generate_clips_from_segment_analysis(segment_analysis, db)
        
        print(f"[클립 생성] ✅ 총 {len(clips)}개 클립 생성 완료")
        
    except Exception as e:
        print(f"[클립 생성] ❌ 오류: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()
