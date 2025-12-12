"""HLS 스트림 생성기 - FFmpeg 직접 입력 방식 (OpenCV 제거)"""

from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional, List
import asyncio
import subprocess
import shutil
import os
import threading
import time
import pytz
import tempfile

class HLSStreamGenerator:
    """
    HLS 스트림 생성기 (최적화 버전)
    - FFmpeg가 직접 영상 파일을 읽어서 처리 (OpenCV 제거)
    - filter_complex로 HLS와 아카이브 동시 출력
    - CPU 사용량 대폭 감소
    """
    
    def __init__(
        self, 
        camera_id: str, 
        video_source,  # Path (가짜 영상 디렉토리) 또는 str (홈캠 URL)
        output_dir: Path,
        is_real_camera: bool = False,
        segment_duration: int = 10,  # HLS 세그먼트 길이 (초)
        enable_realtime_detection: bool = True,
        age_months: Optional[int] = None,
        event_loop: Optional[asyncio.AbstractEventLoop] = None,
        db_session = None,
        user_id: Optional[int] = None
    ):
        self.camera_id = camera_id
        self.video_source = video_source
        self.output_dir = output_dir
        self.is_real_camera = is_real_camera
        self.segment_duration = segment_duration
        
        # HLS 출력 디렉토리
        self.hls_dir = output_dir / "hls"
        self.hls_dir.mkdir(parents=True, exist_ok=True)
        
        # 10분 단위 세그먼트 저장 디렉토리
        self.archive_dir = output_dir / "archive"
        self.archive_dir.mkdir(parents=True, exist_ok=True)
        
        self.is_running = False
        self.ffmpeg_process = None
        self.archive_ffmpeg_process = None
        
        # 실시간 이벤트 탐지
        self.enable_realtime_detection = enable_realtime_detection
        self.age_months = age_months
        self.event_loop = event_loop
        
        # 10분 단위 아카이브 설정
        self.archive_duration_minutes = 10
        self.target_fps = 30.0
        self.archive_fps = 5.0
        self.target_width = 640
        self.target_height = 480
        
        self.current_archive_path = None
        self.current_archive_start = None
        self.archive_start_time = None
        
        # DB 세션 및 사용자 ID
        self.db_session = db_session
        self.user_id = user_id
        
        # FFmpeg 경로
        self.ffmpeg_path = None
        
    async def start_streaming(self):
        """HLS 스트리밍 시작"""
        self.is_running = True
        
        if self.is_real_camera:
            await self._start_real_camera_hls()
        else:
            await self._start_fake_stream_hls()
    
    async def _start_fake_stream_hls(self):
        """가짜 영상으로 HLS 스트림 생성 (FFmpeg 직접 입력)"""
        from app.services.live_monitoring.video_queue import VideoQueue
        
        # FFmpeg 경로 찾기
        self.ffmpeg_path = self._find_ffmpeg()
        if not self.ffmpeg_path:
            print(f"[HLS 스트림] ❌ FFmpeg를 찾을 수 없습니다")
            self.is_running = False
            return
        
        # 영상 큐 로드
        video_queue = VideoQueue(
            self.camera_id,
            self.video_source,
            user_id=self.user_id,
            db=self.db_session
        )
        video_queue.load_videos(shuffle=True, target_duration_minutes=60)
        
        if video_queue.get_queue_size() == 0:
            print(f"[HLS 스트림] ❌ 오류: 사용자 업로드 영상이 없습니다")
            self.is_running = False
            return
        
        # 영상 목록 가져오기
        video_list = []
        for _ in range(video_queue.get_queue_size()):
            video = video_queue.get_next_video()
            if video:
                video_list.append(video)
        
        if not video_list:
            print(f"[HLS 스트림] ❌ 영상 목록이 비어있습니다")
            self.is_running = False
            return
        
        print(f"[HLS 스트림] ✅ 영상 {len(video_list)}개 로드 완료")
        
        # HLS 스트리밍 시작 (영상 순환 재생)
        playlist_path = self.hls_dir / f"{self.camera_id}.m3u8"
        segment_pattern = str(self.hls_dir / f"{self.camera_id}_%03d.ts")
        
        # FFmpeg concat 파일 생성 (여러 영상을 하나로 연결)
        concat_file = await self._create_concat_file(video_list)
        if not concat_file:
            print(f"[HLS 스트림] ❌ concat 파일 생성 실패")
            self.is_running = False
            return
        
        try:
            # HLS 스트리밍 FFmpeg 프로세스 시작
            await self._start_hls_streaming(concat_file, playlist_path, segment_pattern)
            
            # 10분 단위 아카이브 시작
            self._start_archive_streaming(concat_file)
            
            # 프로세스 모니터링
            while self.is_running:
                await asyncio.sleep(1)
                
                # HLS 프로세스 상태 확인
                if self.ffmpeg_process and self.ffmpeg_process.poll() is not None:
                    print(f"[HLS 스트림] ⚠️ FFmpeg 프로세스 종료됨, 재시작...")
                    await self._start_hls_streaming(concat_file, playlist_path, segment_pattern)
                
                # 아카이브 10분 체크 및 교체
                if self.archive_start_time:
                    elapsed = time.time() - self.archive_start_time
                    if elapsed >= self.archive_duration_minutes * 60:
                        self._finalize_current_archive()
                        self._start_archive_streaming(concat_file)
        
        except Exception as e:
            print(f"[HLS 스트림] ❌ 오류: {e}")
            import traceback
            traceback.print_exc()
        finally:
            self._cleanup()
    
    def _find_ffmpeg(self) -> Optional[str]:
        """FFmpeg 경로 찾기"""
        import platform
        
        # Docker 환경
        if os.path.exists('/.dockerenv') or os.getenv('DOCKER_CONTAINER') == 'true':
            ffmpeg_path = shutil.which('ffmpeg')
            if ffmpeg_path:
                return ffmpeg_path
        
        # 환경 변수
        env_path = os.getenv('FFMPEG_PATH')
        if env_path and Path(env_path).exists():
            return env_path
        
        # PATH에서 찾기
        ffmpeg_path = shutil.which('ffmpeg')
        if ffmpeg_path:
            return ffmpeg_path
        
        # Windows 일반 경로
        if platform.system() == 'Windows':
            backend_dir = Path(__file__).resolve().parents[3]
            local_ffmpeg = backend_dir / "bin" / "ffmpeg.exe"
            if local_ffmpeg.exists():
                return str(local_ffmpeg)
            
            common_paths = [
                r"C:\ffmpeg\bin\ffmpeg.exe",
                r"C:\Program Files\ffmpeg\bin\ffmpeg.exe",
            ]
            for path in common_paths:
                if Path(path).exists():
                    return path
        
        return None
    
    async def _create_concat_file(self, video_list: List[Path]) -> Optional[Path]:
        """FFmpeg concat 파일 생성 (여러 영상을 순환 재생)"""
        try:
            # 임시 파일 생성
            concat_file = self.output_dir / "concat_list.txt"
            
            with open(concat_file, 'w', encoding='utf-8') as f:
                # 영상을 여러 번 반복하여 긴 재생 목록 생성
                for _ in range(20):  # 충분히 긴 재생 시간 확보
                    for video in video_list:
                        # FFmpeg concat 형식: file '경로'
                        # Windows 경로는 백슬래시를 슬래시로 변환
                        video_path = str(video).replace('\\', '/')
                        f.write(f"file '{video_path}'\n")
            
            print(f"[HLS 스트림] ✅ concat 파일 생성: {len(video_list)}개 영상, 20회 반복")
            return concat_file
            
        except Exception as e:
            print(f"[HLS 스트림] ❌ concat 파일 생성 실패: {e}")
            return None
    
    async def _start_hls_streaming(self, concat_file: Path, playlist_path: Path, segment_pattern: str):
        """HLS 스트리밍 FFmpeg 프로세스 시작"""
        try:
            # 이전 프로세스 종료
            if self.ffmpeg_process:
                try:
                    self.ffmpeg_process.terminate()
                    self.ffmpeg_process.wait(timeout=2)
                except:
                    pass
            
            # FFmpeg 명령: concat 파일에서 읽어서 HLS 출력
            ffmpeg_cmd = [
                self.ffmpeg_path,
                '-f', 'concat',
                '-safe', '0',
                '-i', str(concat_file),
                '-c:v', 'libx264',
                '-preset', 'ultrafast',
                '-tune', 'zerolatency',
                '-s', f'{self.target_width}x{self.target_height}',
                '-r', str(self.target_fps),
                '-f', 'hls',
                '-hls_time', str(self.segment_duration),
                '-hls_list_size', '10',
                '-hls_flags', 'delete_segments',
                '-hls_segment_filename', segment_pattern,
                '-stream_loop', '-1',  # 무한 반복
                str(playlist_path)
            ]
            
            self.ffmpeg_process = subprocess.Popen(
                ffmpeg_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, 'CREATE_NO_WINDOW') else 0
            )
            
            print(f"[HLS 스트림] ✅ FFmpeg HLS 프로세스 시작 (PID: {self.ffmpeg_process.pid})")
            
            # stderr 모니터링 스레드
            def read_stderr():
                try:
                    while self.is_running and self.ffmpeg_process:
                        line = self.ffmpeg_process.stderr.readline()
                        if line:
                            decoded = line.decode('utf-8', errors='ignore').strip()
                            if decoded and ('error' in decoded.lower() or 'failed' in decoded.lower()):
                                print(f"[FFmpeg HLS] {decoded}")
                except:
                    pass
            
            stderr_thread = threading.Thread(target=read_stderr, daemon=True)
            stderr_thread.start()
            
            # 플레이리스트 생성 대기
            for _ in range(50):
                if playlist_path.exists():
                    print(f"[HLS 스트림] ✅ 플레이리스트 생성 완료")
                    return
                await asyncio.sleep(0.1)
            
            print(f"[HLS 스트림] ⚠️ 플레이리스트 생성 대기 시간 초과")
            
        except Exception as e:
            print(f"[HLS 스트림] ❌ HLS 프로세스 시작 실패: {e}")
            import traceback
            traceback.print_exc()
    
    def _start_archive_streaming(self, concat_file: Path):
        """10분 단위 아카이브 FFmpeg 프로세스 시작
        
        최적화: concat 파일에서 직접 읽되, filter로 FPS 다운샘플링
        """
        try:
            # 이전 아카이브 종료
            if self.archive_ffmpeg_process:
                try:
                    self.archive_ffmpeg_process.terminate()
                    self.archive_ffmpeg_process.wait(timeout=2)
                except:
                    pass
            
            # 새 아카이브 파일 경로
            kst = pytz.timezone('Asia/Seoul')
            now = datetime.now(kst)
            self.current_archive_start = self._get_segment_start_time(now)
            filename = f"archive_{self.current_archive_start.strftime('%Y%m%d_%H%M%S')}.mp4"
            self.current_archive_path = self.archive_dir / filename
            self.archive_start_time = time.time()
            
            # FFmpeg 명령: concat 파일에서 읽어서 아카이브 출력
            # filter로 FPS를 5fps로 다운샘플링하여 CPU 절약
            ffmpeg_cmd = [
                self.ffmpeg_path,
                '-f', 'concat',
                '-safe', '0',
                '-i', str(concat_file),
                '-vf', f'fps={self.archive_fps},scale={self.target_width}:{self.target_height}',  # 5fps로 다운샘플링
                '-c:v', 'libx264',
                '-preset', 'veryfast',
                '-crf', '32',
                '-t', str(self.archive_duration_minutes * 60),  # 정확히 10분만
                '-movflags', '+faststart',
                str(self.current_archive_path)
            ]
            
            self.archive_ffmpeg_process = subprocess.Popen(
                ffmpeg_cmd,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, 'CREATE_NO_WINDOW') else 0
            )
            
            print(f"[HLS 아카이브] ✅ 아카이브 프로세스 시작: {filename} (10분 녹화, {self.archive_fps}fps)")
            
        except Exception as e:
            print(f"[HLS 아카이브] ❌ 아카이브 프로세스 시작 실패: {e}")
            import traceback
            traceback.print_exc()
    
    def _finalize_current_archive(self):
        """현재 아카이브 완료 및 S3 업로드"""
        if self.archive_ffmpeg_process:
            try:
                self.archive_ffmpeg_process.terminate()
                self.archive_ffmpeg_process.wait(timeout=10)
                self.archive_ffmpeg_process = None
                
                if self.current_archive_path and self.current_archive_path.exists():
                    file_size = self.current_archive_path.stat().st_size / (1024 * 1024)
                    print(f"[HLS 아카이브] ✅ 10분 구간 저장 완료: {self.current_archive_path.name} ({file_size:.2f}MB)")
                    
                    # S3 업로드
                    self._upload_archive_to_s3()
                else:
                    print(f"[HLS 아카이브] ⚠️ 파일 생성 실패")
                    
            except Exception as e:
                print(f"[HLS 아카이브] ❌ 종료 중 오류: {e}")
                if self.archive_ffmpeg_process:
                    try:
                        self.archive_ffmpeg_process.terminate()
                    except:
                        pass
                    self.archive_ffmpeg_process = None
    
    def _upload_archive_to_s3(self):
        """아카이브 영상을 S3에 업로드"""
        if not self.current_archive_path or not self.current_archive_path.exists():
            return
        
        try:
            from app.services.s3_service import S3Service
            
            s3_service = S3Service()
            if not s3_service.is_enabled():
                print(f"[HLS 아카이브] ℹ️ S3가 비활성화되어 있습니다.")
                return
            
            s3_url = s3_service.upload_archive(
                file_path=self.current_archive_path,
                camera_id=self.camera_id,
                segment_start=self.current_archive_start
            )
            
            if s3_url:
                print(f"[HLS 아카이브] ✅ S3 업로드 완료: {s3_url}")
            else:
                print(f"[HLS 아카이브] ⚠️ S3 업로드 실패")
                
        except Exception as e:
            print(f"[HLS 아카이브] ❌ S3 업로드 중 오류: {e}")
            import traceback
            traceback.print_exc()
    
    def _get_segment_start_time(self, now: datetime) -> datetime:
        """현재 시간을 10분 단위로 내림"""
        minute = (now.minute // self.archive_duration_minutes) * self.archive_duration_minutes
        return now.replace(minute=minute, second=0, microsecond=0)
    
    def _cleanup(self):
        """리소스 정리"""
        if self.ffmpeg_process:
            try:
                self.ffmpeg_process.terminate()
                self.ffmpeg_process.wait(timeout=5)
            except:
                pass
        
        self._finalize_current_archive()
        print(f"[HLS 스트림] 종료: {self.camera_id}")
    
    async def _start_real_camera_hls(self):
        """실제 홈캠으로 HLS 스트림 생성"""
        playlist_path = self.hls_dir / f"{self.camera_id}.m3u8"
        segment_pattern = str(self.hls_dir / f"{self.camera_id}_%03d.ts")
        
        # FFmpeg 경로 찾기
        self.ffmpeg_path = self._find_ffmpeg()
        if not self.ffmpeg_path:
            print(f"[HLS 스트림] ❌ FFmpeg를 찾을 수 없습니다")
            self.is_running = False
            return
        
        # FFmpeg로 홈캠 스트림을 직접 HLS로 변환
        ffmpeg_cmd = [
            self.ffmpeg_path,
            '-i', str(self.video_source),  # 홈캠 RTSP/HTTP URL
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-tune', 'zerolatency',
            '-s', f'{self.target_width}x{self.target_height}',
            '-r', str(self.target_fps),
            '-f', 'hls',
            '-hls_time', str(self.segment_duration),
            '-hls_list_size', '10',
            '-hls_flags', 'delete_segments',
            '-hls_segment_filename', segment_pattern,
            str(playlist_path)
        ]
        
        try:
            self.ffmpeg_process = subprocess.Popen(
                ffmpeg_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            
            # FFmpeg 프로세스가 종료될 때까지 대기
            while self.is_running:
                if self.ffmpeg_process.poll() is not None:
                    print("[HLS 스트림] FFmpeg 프로세스 종료, 재시작 시도...")
                    await asyncio.sleep(5)
                    self.ffmpeg_process = subprocess.Popen(ffmpeg_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                await asyncio.sleep(1)
        
        except Exception as e:
            print(f"[HLS 스트림] 오류: {e}")
        finally:
            if self.ffmpeg_process:
                self.ffmpeg_process.terminate()
                self.ffmpeg_process.wait()
            print(f"[HLS 스트림] 종료: {self.camera_id}")
    
    def stop_streaming(self):
        """스트리밍 중지"""
        print(f"[HLS 스트림] 중지 요청: {self.camera_id}")
        self.is_running = False
        
        if self.ffmpeg_process:
            self.ffmpeg_process.terminate()
        
        self._finalize_current_archive()
    
    def get_playlist_url(self) -> str:
        """HLS 플레이리스트 URL 반환"""
        return f"/api/live-monitoring/hls/{self.camera_id}/{self.camera_id}.m3u8"
