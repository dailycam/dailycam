<<<<<<< HEAD
"""HLS 스트림 생성기 - 진짜 실시간 스트림"""

import cv2
import numpy as np
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional
=======
"""HLS 스트림 생성기 - FFmpeg 직접 입력 방식 (OpenCV 제거)"""

from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional, List
>>>>>>> 339dc48c4d9f2d2a4a72d593e47305b717dc4c6e
import asyncio
import subprocess
import shutil
import os
import threading
import time
import pytz
<<<<<<< HEAD

class HLSStreamGenerator:
    """
    HLS 스트림 생성기
    - 백그라운드에서 계속 실행되는 진짜 라이브 스트림
    - 재연결 시 자동으로 현재 시간부터 재생
    - 10초 단위 .ts 파일 + .m3u8 플레이리스트
=======
import tempfile

class HLSStreamGenerator:
    """
    HLS 스트림 생성기 (최적화 버전)
    - FFmpeg가 직접 영상 파일을 읽어서 처리 (OpenCV 제거)
    - filter_complex로 HLS와 아카이브 동시 출력
    - CPU 사용량 대폭 감소
>>>>>>> 339dc48c4d9f2d2a4a72d593e47305b717dc4c6e
    """
    
    def __init__(
        self, 
        camera_id: str, 
<<<<<<< HEAD
        video_source,  # Path (가짜 영상) 또는 str (홈캠 URL)
=======
        video_source,  # Path (가짜 영상 디렉토리) 또는 str (홈캠 URL)
>>>>>>> 339dc48c4d9f2d2a4a72d593e47305b717dc4c6e
        output_dir: Path,
        is_real_camera: bool = False,
        segment_duration: int = 10,  # HLS 세그먼트 길이 (초)
        enable_realtime_detection: bool = True,
        age_months: Optional[int] = None,
        event_loop: Optional[asyncio.AbstractEventLoop] = None,
<<<<<<< HEAD
        db_session = None,  # DB 세션 (VideoQueue에서 사용)
        user_id: Optional[int] = None  # 사용자 ID (VideoQueue에서 사용)
=======
        db_session = None,
        user_id: Optional[int] = None
>>>>>>> 339dc48c4d9f2d2a4a72d593e47305b717dc4c6e
    ):
        self.camera_id = camera_id
        self.video_source = video_source
        self.output_dir = output_dir
        self.is_real_camera = is_real_camera
        self.segment_duration = segment_duration
        
        # HLS 출력 디렉토리
        self.hls_dir = output_dir / "hls"
        self.hls_dir.mkdir(parents=True, exist_ok=True)
        
<<<<<<< HEAD
        # 10분 단위 세그먼트 저장 디렉토리 (메타데이터 추출용)
=======
        # 10분 단위 세그먼트 저장 디렉토리
>>>>>>> 339dc48c4d9f2d2a4a72d593e47305b717dc4c6e
        self.archive_dir = output_dir / "archive"
        self.archive_dir.mkdir(parents=True, exist_ok=True)
        
        self.is_running = False
<<<<<<< HEAD
        self.ffmpeg_process = None
=======
        self.ffmpeg_process = None  # 단일 FFmpeg 프로세스 (HLS + 아카이브 통합)
>>>>>>> 339dc48c4d9f2d2a4a72d593e47305b717dc4c6e
        
        # 실시간 이벤트 탐지
        self.enable_realtime_detection = enable_realtime_detection
        self.age_months = age_months
        self.event_loop = event_loop
        
        # 10분 단위 아카이브 설정
        self.archive_duration_minutes = 10
<<<<<<< HEAD
        self.target_fps = 30.0  # HLS 스트림용 (부드러운 스트리밍)
        self.archive_fps = 5.0  # 아카이브(분석)용 낮은 FPS (10→5, 용량 대폭 절약)
        self.target_width = 640
        self.target_height = 480
        
        self.current_archive_process = None  # FFmpeg 프로세스 (아카이브용)
        self.current_archive_path = None
        self.current_archive_start = None
        self.current_archive_frame_count = 0
        
        # DB 세션 및 사용자 ID 저장 (VideoQueue에서 사용)
        self.db_session = db_session
        self.user_id = user_id
        
=======
        self.target_fps = 15.0  # 30.0 → 15.0 (CPU 사용량 약 50% 감소)
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
        
>>>>>>> 339dc48c4d9f2d2a4a72d593e47305b717dc4c6e
    async def start_streaming(self):
        """HLS 스트리밍 시작"""
        self.is_running = True
        
        if self.is_real_camera:
<<<<<<< HEAD
            # 실제 홈캠: FFmpeg로 직접 HLS 생성
            await self._start_real_camera_hls()
        else:
            # 가짜 영상: OpenCV로 처리 후 FFmpeg로 HLS 생성
            await self._start_fake_stream_hls()
    
    async def _start_fake_stream_hls(self):
        """가짜 영상으로 HLS 스트림 생성"""
        from app.services.live_monitoring.video_queue import VideoQueue
        from app.services.live_monitoring.realtime_detector import RealtimeEventDetector
        import shutil
        import platform
        
        # FFmpeg 설치 확인 (여러 경로 시도)
        ffmpeg_path = None
        is_docker = os.path.exists('/.dockerenv') or os.getenv('DOCKER_CONTAINER') == 'true'
        
        # Docker 환경에서는 시스템 FFmpeg 우선 사용
        if is_docker:
            ffmpeg_path = shutil.which('ffmpeg')
            if ffmpeg_path:
                self.ffmpeg_path = ffmpeg_path
                print(f"[HLS 스트림] ✅ Docker 환경: 시스템 FFmpeg 사용 ({ffmpeg_path})")
        
        # 0. 프로젝트 내부 bin 폴더 확인 (Windows 환경에서만)
        if not ffmpeg_path and platform.system() == 'Windows':
            backend_dir = Path(__file__).resolve().parents[3]
            local_ffmpeg = backend_dir / "bin" / "ffmpeg.exe"
            
            if local_ffmpeg.exists():
                ffmpeg_path = str(local_ffmpeg)
                self.ffmpeg_path = ffmpeg_path  # 인스턴스 변수로 저장
                print(f"[HLS 스트림] ✅ 프로젝트 내부 bin에서 찾음: {ffmpeg_path}")
        
        # 1. 환경 변수에서 직접 경로 확인
        if not ffmpeg_path:
            env_path = os.getenv('FFMPEG_PATH')
            if env_path and Path(env_path).exists():
                ffmpeg_path = env_path
                self.ffmpeg_path = ffmpeg_path  # 인스턴스 변수로 저장
                print(f"[HLS 스트림] ✅ FFMPEG_PATH 환경 변수에서 찾음: {ffmpeg_path}")
        
        # 2. PATH에서 찾기
        if not ffmpeg_path:
            ffmpeg_path = shutil.which('ffmpeg')
            if ffmpeg_path:
                self.ffmpeg_path = ffmpeg_path  # 인스턴스 변수로 저장
                print(f"[HLS 스트림] ✅ PATH에서 찾음: {ffmpeg_path}")
        
        # 3. PATH에서 못 찾으면 일반적인 경로들 시도 (Windows만)
        if not ffmpeg_path and platform.system() == 'Windows':
            common_paths = [
                r"C:\ffmpeg\ffmpeg-8.0.1-essentials_build\ffmpeg-8.0.1-essentials_build\bin\ffmpeg.exe",
                r"C:\ffmpeg\bin\ffmpeg.exe",
                r"C:\ffmpeg\ffmpeg-8.0.1-essentials_build\bin\ffmpeg.exe",
                r"C:\Program Files\ffmpeg\bin\ffmpeg.exe",
                r"C:\tools\ffmpeg\bin\ffmpeg.exe",
            ]
            
            for path in common_paths:
                if Path(path).exists():
                    ffmpeg_path = path
                    self.ffmpeg_path = ffmpeg_path  # 인스턴스 변수로 저장
                    print(f"[HLS 스트림] ✅ FFmpeg를 일반 경로에서 찾음: {ffmpeg_path}")
                    break
        
        if not ffmpeg_path:
            print(f"[HLS 스트림] ❌ 오류: FFmpeg가 설치되지 않았거나 PATH에 없습니다")
            print(f"[HLS 스트림] 📥 FFmpeg 설치 방법:")
            print(f"[HLS 스트림]   1. https://www.gyan.dev/ffmpeg/builds/ 에서 다운로드")
            print(f"[HLS 스트림]   2. 압축 해제 후 bin 폴더를 PATH에 추가")
            print(f"[HLS 스트림]   3. 또는 Chocolatey 사용: choco install ffmpeg")
            print(f"[HLS 스트림] 💡 팁: FFmpeg 설치 경로를 환경 변수 FFMPEG_PATH에 설정하면 자동으로 인식합니다")
            return
        
        print(f"[HLS 스트림] ✅ FFmpeg 경로: {ffmpeg_path}")
        
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
            print(f"[HLS 스트림] 💡 Settings 페이지에서 영상을 업로드해주세요")
            print(f"[HLS 스트림] 영상 경로: {self.video_source}")
            self.is_running = False
            return
        
        # 실시간 이벤트 탐지기
        detector = None
        if self.enable_realtime_detection:
            detector = RealtimeEventDetector(self.camera_id, age_months=self.age_months)
        
        # 10분 단위 아카이브 시작
        self._start_new_archive()
        
        print(f"[HLS 스트림] 시작: {self.camera_id}")
        
        # FFmpeg 파이프 설정 (stdin으로 프레임 전송)
        playlist_path = self.hls_dir / f"{self.camera_id}.m3u8"
        segment_pattern = str(self.hls_dir / f"{self.camera_id}_%03d.ts")
        
        ffmpeg_cmd = [
            ffmpeg_path,  # 전체 경로 사용
            '-f', 'rawvideo',
            '-pix_fmt', 'bgr24',
            '-s', f'{self.target_width}x{self.target_height}',
            '-r', str(self.target_fps),
            '-i', 'pipe:',  # Windows 호환성
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-tune', 'zerolatency',
            '-f', 'hls',
            '-hls_time', str(self.segment_duration),
            '-hls_list_size', '10',
            '-hls_flags', 'delete_segments',
            '-hls_segment_filename', segment_pattern,
            str(playlist_path)
        ]
        
        print(f"[HLS 스트림] FFmpeg 명령: {' '.join(ffmpeg_cmd[:5])}...")
        
        try:
            self.ffmpeg_process = subprocess.Popen(
                ffmpeg_cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                bufsize=0,  # 버퍼링 비활성화
                creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, 'CREATE_NO_WINDOW') else 0
            )
            print(f"[HLS 스트림] ✅ FFmpeg 프로세스 시작 성공 (PID: {self.ffmpeg_process.pid})")
            
            # FFmpeg stderr를 별도 스레드에서 읽어서 로그 출력
=======
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
        video_queue.load_videos(shuffle=False, target_duration_minutes=60)  # shuffle=False로 영상 순서 고정
        
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
            # 단일 FFmpeg 프로세스로 HLS + 아카이브 동시 생성
            await self._start_unified_streaming(concat_file, playlist_path, segment_pattern)
            
            # 아카이브 파일 모니터링 시작 (파일 생성 이벤트 기반)
            self._monitor_archive_files()
            
            # 프로세스 모니터링 (10초 간격으로 CPU 절약)
            while self.is_running:
                await asyncio.sleep(10)  # 1초 → 10초로 변경 (CPU 절약)
                
                # FFmpeg 프로세스 상태 확인
                if self.ffmpeg_process:
                    try:
                        returncode = self.ffmpeg_process.poll()
                        if returncode is not None:
                            print(f"[통합 스트림] ⚠️ FFmpeg 프로세스 종료됨 (exit code: {returncode}), 재시작...")
                            await self._start_unified_streaming(concat_file, playlist_path, segment_pattern)
                            # 모니터링 재시작
                            self._monitor_archive_files()
                    except Exception as e:
                        print(f"[통합 스트림] ⚠️ 프로세스 상태 확인 오류: {e}")
        
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
                # 영상을 순서대로 한 번만 나열 (stream_loop가 전체를 반복하므로)
                for video in video_list:
                    # 절대 경로로 변환 (FFmpeg가 파일을 찾을 수 있도록)
                    video_absolute = video.resolve()
                    # FFmpeg concat 형식: file '경로'
                    # Windows 경로는 백슬래시를 슬래시로 변환
                    video_path = str(video_absolute).replace('\\', '/')
                    f.write(f"file '{video_path}'\n")
            
            print(f"[HLS 스트림] ✅ concat 파일 생성: {len(video_list)}개 영상 (stream_loop로 반복)")
            print(f"[HLS 스트림] concat 파일 경로: {concat_file.resolve()}")
            # concat 파일 내용 샘플 출력 (디버깅용)
            with open(concat_file, 'r') as f:
                first_line = f.readline().strip()
                print(f"[HLS 스트림] concat 파일 첫 줄 샘플: {first_line}")
            return concat_file
            
        except Exception as e:
            print(f"[HLS 스트림] ❌ concat 파일 생성 실패: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    async def _start_unified_streaming(self, concat_file: Path, playlist_path: Path, segment_pattern: str):
        """
        단일 FFmpeg 프로세스로 HLS + 10분 아카이브 동시 생성
        
        tee muxer를 사용하여 한 번의 인코딩으로 두 출력 생성:
        - 출력 A: DVR형 HLS (시청용)
        - 출력 B: 10분 단위 mp4 아카이브 (분석용)
        
        최적화 사항:
        - -re 옵션: VOD 파일을 실제 재생 속도로 읽어 CPU 폭주 방지 (핵심!)
        - tee muxer: 단일 인코딩으로 두 출력 생성 (이중 인코딩 제거)
        - -threads 2: CPU 스레드 제한으로 리소스 사용 최적화
        """
        try:
            # 이전 프로세스 종료
            if self.ffmpeg_process:
                try:
                    self.ffmpeg_process.terminate()
                    self.ffmpeg_process.wait(timeout=2)
                except:
                    pass
            
            # 절대 경로로 변환
            concat_file_absolute = concat_file.resolve()
            playlist_path_absolute = playlist_path.resolve()
            hls_dir_absolute = self.hls_dir.resolve()
            archive_dir_absolute = self.archive_dir.resolve()
            
            # 디렉토리 생성 확인
            hls_dir_absolute.mkdir(parents=True, exist_ok=True)
            archive_dir_absolute.mkdir(parents=True, exist_ok=True)
            
            # segment_pattern에서 파일명만 추출
            segment_filename = Path(segment_pattern).name
            segment_pattern_absolute = str(hls_dir_absolute / segment_filename)
            
            # concat 파일 존재 확인
            if not concat_file_absolute.exists():
                print(f"[HLS 스트림] ❌ concat 파일이 존재하지 않음: {concat_file_absolute}")
                return
            
            # 비디오 인코딩 (한 번만 수행)
            # tee muxer를 사용하여 단일 인코딩 결과를 두 출력으로 분배
            video_filter = (
                f"scale={self.target_width}:{self.target_height},"
                f"fps={self.target_fps},"
                f"split=2[hls_v][archive_v]"
            )
            
            # 아카이브용 추가 필터 (5fps 다운샘플링)
            archive_filter = f"[archive_v]fps={self.archive_fps}[archive_out]"
            
            # FFmpeg 명령어 구성
            # 핵심 최적화: -re 옵션으로 실제 재생 속도로 읽기 (CPU 폭주 방지)
            ffmpeg_cmd = [
                self.ffmpeg_path,
                '-hide_banner',
                '-loglevel', 'info',
                # 입력 (VOD 파일을 실제 재생 속도로 읽기 - CPU 폭주 방지의 핵심!)
                '-re',  # Read at native frame rate - 실제 재생 속도로 읽어 CPU 사용량 급격히 감소
                '-stream_loop', '-1',
                '-f', 'concat',
                '-safe', '0',
                '-i', str(concat_file_absolute),
                # 무음 오디오 생성
                '-f', 'lavfi',
                '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
                # 비디오 필터 (인코딩 + 분기)
                '-filter_complex', f"{video_filter};{archive_filter}",
                # CPU 스레드 제한 (리소스 사용 최적화)
                '-threads', '2',
                # HLS 출력 (hls_v 스트림 사용)
                '-map', '[hls_v]',
                '-map', '1:a',
                '-c:v', 'libx264',
                '-preset', 'ultrafast',
                '-tune', 'zerolatency',
                '-g', str(int(self.target_fps * self.segment_duration)),
                '-keyint_min', str(int(self.target_fps * self.segment_duration)),
                '-sc_threshold', '0',
                '-c:a', 'aac',
                '-b:a', '128k',
                '-ar', '48000',
                '-f', 'hls',
                '-hls_time', str(self.segment_duration),
                '-hls_list_size', '300',  # DVR 윈도우 확대 (10초 세그먼트 * 300 = 50분)
                '-hls_flags', 'delete_segments+append_list+program_date_time',
                '-hls_segment_filename', segment_pattern_absolute,
                str(playlist_path_absolute),
                # 아카이브 출력 (archive_out 스트림 사용, 10분마다 자동 생성)
                '-map', '[archive_out]',
                '-c:v', 'libx264',
                '-preset', 'ultrafast',
                '-crf', '32',
                '-movflags', '+faststart',
                '-f', 'segment',
                '-segment_time', str(self.archive_duration_minutes * 60),  # 10분(600초)
                '-reset_timestamps', '1',
                '-strftime', '1',
                '-segment_format', 'mp4',
                '-segment_atclocktime', '1',  # 정시(10분 단위)에 파일 생성
                '-segment_clocktime_offset', '0',
                f'{archive_dir_absolute}/archive_%Y%m%d_%H%M%S.mp4'
            ]
            
            print(f"[통합 스트림] FFmpeg 명령어:")
            print(f"  입력 파일: {concat_file_absolute}")
            print(f"  HLS 출력: {playlist_path_absolute} (DVR 윈도우: 300 세그먼트)")
            print(f"  아카이브 출력: {archive_dir_absolute}/archive_%Y%m%d_%H%M%S.mp4 (10분마다 자동 생성)")
            print(f"[통합 스트림] ✅ 최적화 적용: -re 옵션으로 CPU 폭주 방지 (600% → 10~20% 예상)")
            
            self.ffmpeg_process = subprocess.Popen(
                ffmpeg_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                cwd='/app',
                creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, 'CREATE_NO_WINDOW') else 0
            )
            
            print(f"[통합 스트림] ✅ FFmpeg 프로세스 시작 (PID: {self.ffmpeg_process.pid})")
            print(f"[통합 스트림] CPU 사용량 최적화: -re 옵션 + -threads 2로 리소스 사용 극대화")
            
            # stderr 모니터링 스레드 (아카이브 파일 생성 감지)
>>>>>>> 339dc48c4d9f2d2a4a72d593e47305b717dc4c6e
            def read_stderr():
                try:
                    while self.is_running and self.ffmpeg_process:
                        line = self.ffmpeg_process.stderr.readline()
                        if line:
                            decoded = line.decode('utf-8', errors='ignore').strip()
<<<<<<< HEAD
                            if decoded and not decoded.startswith('frame='):  # 일반적인 프레임 정보는 제외
                                print(f"[FFmpeg] {decoded}")
                except Exception as e:
                    print(f"[FFmpeg stderr 읽기 오류] {e}")
=======
                            if decoded:
                                # 에러나 경고 메시지 출력
                                if 'error' in decoded.lower() or 'failed' in decoded.lower() or 'warning' in decoded.lower():
                                    print(f"[FFmpeg] {decoded}")
                                # 아카이브 파일 생성 감지 (segment muxer 로그)
                                if 'Opening' in decoded and 'archive_' in decoded and '.mp4' in decoded:
                                    print(f"[아카이브] 파일 생성 시작: {decoded}")
                                if 'Output file' in decoded and 'archive_' in decoded:
                                    print(f"[아카이브] 파일 생성 완료: {decoded}")
                except:
                    pass
>>>>>>> 339dc48c4d9f2d2a4a72d593e47305b717dc4c6e
            
            stderr_thread = threading.Thread(target=read_stderr, daemon=True)
            stderr_thread.start()
            
<<<<<<< HEAD
            # HLS 플레이리스트 파일이 생성될 때까지 대기 (최대 15초)
            print(f"[HLS 스트림] HLS 플레이리스트 생성 대기 중...")
            playlist_created = False
            for i in range(150):  # 0.1초씩 150번 = 15초
                if playlist_path.exists():
                    playlist_created = True
                    print(f"[HLS 스트림] ✅ HLS 플레이리스트 생성 완료: {playlist_path}")
                    break
                await asyncio.sleep(0.1)
                # 5초, 10초마다 진행 상황 출력
                if (i + 1) % 50 == 0:
                    print(f"[HLS 스트림] 대기 중... ({(i+1)/10}초 경과)")
            
            if not playlist_created:
                print(f"[HLS 스트림] ⚠️ 경고: HLS 플레이리스트가 생성되지 않았습니다. 계속 진행합니다...")
                print(f"[HLS 스트림] 플레이리스트 경로: {playlist_path}")
                print(f"[HLS 스트림] 디렉토리 존재 여부: {self.hls_dir.exists()}")
                if self.hls_dir.exists():
                    files = list(self.hls_dir.glob("*"))
                    print(f"[HLS 스트림] 디렉토리 파일 목록: {[f.name for f in files]}")
            
            frame_count = 0
            detection_frame_interval = 30  # 30프레임마다 탐지
            frame_interval = 1.0 / self.target_fps  # 프레임 간격 (초)
            last_frame_time = time.time()
            frames_sent = 0
            
            print(f"[HLS 스트림] 프레임 전송 시작 (target_fps: {self.target_fps}, 간격: {frame_interval:.3f}초)")
            
            while self.is_running:
                video_path = video_queue.get_next_video()
                if not video_path:
                    print(f"[HLS 스트림] 경고: 다음 영상이 없습니다")
                    break
                
                print(f"[HLS 스트림] 영상 재생 시작: {video_path.name}")
                cap = cv2.VideoCapture(str(video_path))
                if not cap.isOpened():
                    print(f"[HLS 스트림] 오류: 영상 열기 실패 - {video_path.name}")
                    continue
                
                fps = cap.get(cv2.CAP_PROP_FPS)
                total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                if fps <= 0:
                    fps = 30.0
                
                print(f"[HLS 스트림] 영상 정보: FPS={fps:.2f}, 총 프레임={total_frames}")
                
                # 프레임 샘플링
                frame_skip = int(fps / self.target_fps) if fps > self.target_fps else 1
                video_frame_count = 0
                
                while cap.isOpened() and self.is_running:
                    ret, frame = cap.read()
                    if not ret:
                        break
                    
                    # 프레임 샘플링
                    if video_frame_count % frame_skip == 0:
                        # FFmpeg 프로세스 상태 확인
                        if self.ffmpeg_process.poll() is not None:
                            print(f"[HLS 스트림] ❌ FFmpeg 프로세스가 종료되었습니다 (exit code: {self.ffmpeg_process.returncode})")
                            # stderr에서 마지막 오류 메시지 읽기
                            try:
                                stderr_lines = self.ffmpeg_process.stderr.readlines()
                                for line in stderr_lines[-10:]:  # 마지막 10줄
                                    decoded = line.decode('utf-8', errors='ignore').strip()
                                    if decoded:
                                        print(f"[FFmpeg 오류] {decoded}")
                            except:
                                pass
                            break
                        
                        # 프레임 간격 조절 (target_fps 유지) - 비동기 sleep 사용
                        current_time = time.time()
                        elapsed = current_time - last_frame_time
                        if elapsed < frame_interval:
                            await asyncio.sleep(frame_interval - elapsed)
                        last_frame_time = time.time()
                        
                        # 프레임 크기 조정
                        frame = self._resize_frame(frame)
                        
                        # FFmpeg로 프레임 전송 (HLS 생성)
                        try:
                            frame_bytes = frame.tobytes()
                            self.ffmpeg_process.stdin.write(frame_bytes)
                            self.ffmpeg_process.stdin.flush()  # 버퍼 즉시 전송
                            frames_sent += 1
                            
                            # 첫 10프레임과 그 이후 100프레임마다 로그
                            if frames_sent <= 10 or frames_sent % 100 == 0:
                                print(f"[HLS 스트림] 프레임 전송: {frames_sent}개 (영상 프레임: {video_frame_count})")
                        except BrokenPipeError:
                            print("[HLS 스트림] FFmpeg 파이프 끊김 - 프로세스가 종료되었을 수 있습니다")
                            break
                        except Exception as e:
                            print(f"[HLS 스트림] 프레임 전송 오류: {e}")
                            import traceback
                            traceback.print_exc()
                            break
                        
                        # 10분 단위 아카이브에 저장 (FFmpeg 파이프)
                        if self.current_archive_process and self.current_archive_process.poll() is None:
                            try:
                                self.current_archive_process.stdin.write(frame_bytes)  # frame_bytes는 이미 위에서 생성됨
                                self.current_archive_frame_count += 1
                                
                                # 첫 10프레임과 1000프레임마다 로그
                                if self.current_archive_frame_count <= 10 or self.current_archive_frame_count % 1000 == 0:
                                    print(f"[HLS 아카이브] 프레임 저장: {self.current_archive_frame_count}개")
                            except Exception as e:
                                print(f"[HLS 아카이브] ❌ 프레임 쓰기 오류: {e}")
                                import traceback
                                traceback.print_exc()
                                # FFmpeg 프로세스 오류 발생 시 비활성화
                                if self.current_archive_process:
                                    try:
                                        self.current_archive_process.stdin.close()
                                        self.current_archive_process.terminate()
                                    except:
                                        pass
                                    self.current_archive_process = None
                        elif self.current_archive_process is None:
                            # 아카이브 프로세스가 없으면 경고 (한 번만)
                            if not hasattr(self, '_archive_warning_shown'):
                                print(f"[HLS 아카이브] ⚠️ 아카이브 프로세스가 없습니다")
                                self._archive_warning_shown = True
                        
                        # 실시간 이벤트 탐지 (Gemini 분석 비활성화)
                        # 주의: Gemini 실시간 분석은 너무 무거워서 스트림을 블로킹함
                        # 10분 단위 VLM 분석만 사용
                        if False and detector and frame_count % detection_frame_interval == 0:
                            try:
                                events = detector.process_frame(frame)
                                if events:
                                    detector.save_events(events)
                                
                                # Gemini 분석은 별도 스레드에서 실행 (메인 루프 블로킹 방지)
                                if detector.should_run_gemini_analysis() and self.event_loop:
                                    frame_copy = frame.copy()
                                    # 별도 스레드에서 비동기 실행
                                    def run_async_gemini():
                                        asyncio.run(self._run_gemini_analysis_in_thread(detector, frame_copy))
                                    
                                    gemini_thread = threading.Thread(target=run_async_gemini, daemon=True)
                                    gemini_thread.start()
                            except Exception as e:
                                print(f"[실시간 탐지] 오류: {e}")
                        
                        frame_count += 1
                        
                        # 10분 단위 아카이브 교체
                        frames_per_archive = int(self.target_fps * 60 * self.archive_duration_minutes)
                        if self.current_archive_frame_count >= frames_per_archive:
                            self._finalize_current_archive()
                            self._start_new_archive()
                    
                    video_frame_count += 1
                
                cap.release()
                print(f"[HLS 스트림] 영상 재생 완료: {video_path.name}")
        
        except FileNotFoundError as e:
            print(f"[HLS 스트림] ❌ FFmpeg 실행 실패: {e}")
            print(f"[HLS 스트림] FFmpeg가 설치되지 않았거나 PATH에 없습니다")
        except Exception as e:
            print(f"[HLS 스트림] ❌ 예상치 못한 오류: {e}")
            import traceback
            traceback.print_exc()
        finally:
            # FFmpeg 종료
            if self.ffmpeg_process:
                self.ffmpeg_process.stdin.close()
                self.ffmpeg_process.wait()
            
            # 아카이브 완료
            self._finalize_current_archive()
            print(f"[HLS 스트림] 종료: {self.camera_id}")
=======
            # 플레이리스트 생성 대기
            for _ in range(50):
                if playlist_path.exists():
                    print(f"[통합 스트림] ✅ HLS 플레이리스트 생성 완료")
                    return
                await asyncio.sleep(0.1)
            
            print(f"[통합 스트림] ⚠️ 플레이리스트 생성 대기 시간 초과")
            
        except Exception as e:
            print(f"[통합 스트림] ❌ 프로세스 시작 실패: {e}")
            import traceback
            traceback.print_exc()
    
    def _monitor_archive_files(self):
        """
        아카이브 파일 생성 모니터링 (백그라운드 스레드)
        파일이 생성되면 S3 업로드 및 VLM 분석 Job 등록
        """
        import asyncio
        
        def monitor_loop():
            processed_files = set()
            
            while self.is_running:
                try:
                    # 아카이브 디렉토리에서 새 파일 확인
                    archive_dir = self.archive_dir
                    if archive_dir.exists():
                        current_files = set(archive_dir.glob("archive_*.mp4"))
                        new_files = current_files - processed_files
                        
                        for file_path in new_files:
                            # 파일이 완전히 생성되었는지 확인 (크기 안정화)
                            if self._is_file_stable(file_path):
                                print(f"[아카이브 모니터] ✅ 새 파일 발견: {file_path.name}")
                                
                                # S3 업로드 및 Job 등록 (비동기 이벤트 루프 안전하게 접근)
                                # asyncio.run_coroutine_threadsafe를 사용하여 메인 이벤트 루프와 충돌 방지
                                if self.event_loop and self.event_loop.is_running():
                                    # 메인 이벤트 루프가 실행 중이면 run_coroutine_threadsafe 사용
                                    try:
                                        future1 = asyncio.run_coroutine_threadsafe(
                                            self._upload_archive_to_s3_async(file_path),
                                            self.event_loop
                                        )
                                        future2 = asyncio.run_coroutine_threadsafe(
                                            self._register_analysis_job_async(file_path),
                                            self.event_loop
                                        )
                                        # 작업 완료 대기 (타임아웃 30초)
                                        future1.result(timeout=30)
                                        future2.result(timeout=30)
                                    except Exception as e:
                                        print(f"[아카이브 모니터] ⚠️ 비동기 작업 실행 오류: {e}")
                                        import traceback
                                        traceback.print_exc()
                                else:
                                    # 이벤트 루프가 없으면 새로 생성 (폴백)
                                    loop = asyncio.new_event_loop()
                                    asyncio.set_event_loop(loop)
                                    try:
                                        loop.run_until_complete(self._upload_archive_to_s3_async(file_path))
                                        loop.run_until_complete(self._register_analysis_job_async(file_path))
                                    except Exception as e:
                                        print(f"[아카이브 모니터] ⚠️ 비동기 작업 실행 오류: {e}")
                                        import traceback
                                        traceback.print_exc()
                                    finally:
                                        loop.close()
                                
                                processed_files.add(file_path)
                    
                    time.sleep(5)  # 5초마다 확인
                    
                except Exception as e:
                    print(f"[아카이브 모니터] ❌ 오류: {e}")
                    time.sleep(5)
        
        monitor_thread = threading.Thread(target=monitor_loop, daemon=True)
        monitor_thread.start()
        return monitor_thread
    
    def _is_file_stable(self, file_path: Path, check_interval: float = 2.0) -> bool:
        """파일이 완전히 생성되었는지 확인 (크기 안정화)"""
        try:
            prev_size = 0
            stable_count = 0
            
            for _ in range(5):  # 최대 5회 확인 (약 10초)
                if not file_path.exists():
                    return False
                
                current_size = file_path.stat().st_size
                if current_size == prev_size and current_size > 0:
                    stable_count += 1
                    if stable_count >= 2:  # 2회 연속 동일 크기면 안정화
                        return True
                else:
                    stable_count = 0
                    prev_size = current_size
                
                time.sleep(check_interval)
            
            return False
        except:
            return False
    
    async def _upload_archive_to_s3_async(self, file_path: Path):
        """아카이브 파일을 S3에 업로드 (비동기)"""
        try:
            from app.services.s3_service import S3Service
            
            s3_service = S3Service()
            if not s3_service.is_enabled():
                return
            
            # 파일명에서 시간 추출
            filename = file_path.name
            time_str = filename.replace('archive_', '').replace('.mp4', '')
            segment_start = datetime.strptime(time_str, '%Y%m%d_%H%M%S')
            
            s3_url = s3_service.upload_archive(
                file_path=file_path,
                camera_id=self.camera_id,
                segment_start=segment_start
            )
            
            if s3_url:
                print(f"[아카이브] ✅ S3 업로드 완료: {filename} → {s3_url}")
            else:
                print(f"[아카이브] ⚠️ S3 업로드 실패: {filename}")
                
        except Exception as e:
            print(f"[아카이브] ❌ S3 업로드 중 오류: {e}")
    
    async def _register_analysis_job_async(self, file_path: Path):
        """아카이브 파일에 대한 VLM 분석 Job 등록 (비동기)"""
        try:
            from app.services.live_monitoring.segment_analyzer import SegmentAnalysisScheduler
            
            # 파일명에서 시간 추출
            filename = file_path.name
            time_str = filename.replace('archive_', '').replace('.mp4', '')
            segment_start_naive = datetime.strptime(time_str, '%Y%m%d_%H%M%S')
            
            # KST로 변환
            kst = pytz.timezone('Asia/Seoul')
            segment_start = kst.localize(segment_start_naive)
            segment_end = segment_start + timedelta(minutes=10)
            
            # Job 등록 (기존 로직 재사용)
            db = self.db_session
            if not db:
                from app.database.session import get_db
                db = next(get_db())
            
            from app.models.live_monitoring.analysis_job import AnalysisJob, JobStatus
            
            # 이미 등록된 Job이 있는지 확인
            segment_start_utc = segment_start.astimezone(pytz.UTC).replace(tzinfo=None)
            existing_job = db.query(AnalysisJob).filter(
                AnalysisJob.camera_id == self.camera_id,
                AnalysisJob.segment_start == segment_start_utc,
                AnalysisJob.status.in_([JobStatus.PENDING, JobStatus.PROCESSING, JobStatus.COMPLETED])
            ).first()
            
            if existing_job:
                print(f"[아카이브] ⏭️ 이미 등록된 Job: {filename}")
                return
            
            # Job 등록
            segment_end_utc = segment_end.astimezone(pytz.UTC).replace(tzinfo=None)
            analysis_job = AnalysisJob(
                camera_id=self.camera_id,
                video_path=str(file_path),
                segment_start=segment_start_utc,
                segment_end=segment_end_utc,
                status=JobStatus.PENDING
            )
            db.add(analysis_job)
            db.commit()
            
            print(f"[아카이브] ✅ 분석 Job 등록: {filename} (Job ID: {analysis_job.id})")
            
        except Exception as e:
            print(f"[아카이브] ❌ Job 등록 중 오류: {e}")
            import traceback
            traceback.print_exc()
    
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
        
        print(f"[통합 스트림] 종료: {self.camera_id}")
>>>>>>> 339dc48c4d9f2d2a4a72d593e47305b717dc4c6e
    
    async def _start_real_camera_hls(self):
        """실제 홈캠으로 HLS 스트림 생성"""
        playlist_path = self.hls_dir / f"{self.camera_id}.m3u8"
        segment_pattern = str(self.hls_dir / f"{self.camera_id}_%03d.ts")
        
<<<<<<< HEAD
        # FFmpeg로 홈캠 스트림을 직접 HLS로 변환
        ffmpeg_cmd = [
            'ffmpeg',
=======
        # FFmpeg 경로 찾기
        self.ffmpeg_path = self._find_ffmpeg()
        if not self.ffmpeg_path:
            print(f"[HLS 스트림] ❌ FFmpeg를 찾을 수 없습니다")
            self.is_running = False
            return
        
        # FFmpeg로 홈캠 스트림을 직접 HLS로 변환
        ffmpeg_cmd = [
            self.ffmpeg_path,
>>>>>>> 339dc48c4d9f2d2a4a72d593e47305b717dc4c6e
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
<<<<<<< HEAD
                    # 재시작
=======
>>>>>>> 339dc48c4d9f2d2a4a72d593e47305b717dc4c6e
                    self.ffmpeg_process = subprocess.Popen(ffmpeg_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                await asyncio.sleep(1)
        
        except Exception as e:
            print(f"[HLS 스트림] 오류: {e}")
        finally:
            if self.ffmpeg_process:
                self.ffmpeg_process.terminate()
                self.ffmpeg_process.wait()
            print(f"[HLS 스트림] 종료: {self.camera_id}")
    
<<<<<<< HEAD
    def _resize_frame(self, frame):
        """프레임 크기 조정"""
        height, width = frame.shape[:2]
        if height != self.target_height or width != self.target_width:
            scale = self.target_height / height
            new_width = int(width * scale)
            frame = cv2.resize(frame, (new_width, self.target_height))
            
            if new_width > self.target_width:
                start_x = (new_width - self.target_width) // 2
                frame = frame[:, start_x:start_x + self.target_width]
            elif new_width < self.target_width:
                pad_left = (self.target_width - new_width) // 2
                pad_right = self.target_width - new_width - pad_left
                frame = cv2.copyMakeBorder(
                    frame, 0, 0, pad_left, pad_right,
                    cv2.BORDER_CONSTANT, value=(0, 0, 0)
                )
        return frame
    
    def _start_new_archive(self):
        """새 10분 단위 아카이브 시작 (FFmpeg 직접 사용)"""
        kst = pytz.timezone('Asia/Seoul')
        now = datetime.now(kst)
        self.current_archive_start = self._get_segment_start_time(now)
        filename = f"archive_{self.current_archive_start.strftime('%Y%m%d_%H%M%S')}.mp4"
        self.current_archive_path = self.archive_dir / filename
        self.current_archive_frame_count = 0
        
        # FFmpeg를 사용하여 MP4 파일 직접 생성 (moov atom 최적화)
        # AI 분석용 최적화: 매우 낮은 FPS + 강력한 압축
        try:
            ffmpeg_archive_cmd = [
                str(self.ffmpeg_path),
                '-y',  # 덮어쓰기
                '-f', 'rawvideo',
                '-pix_fmt', 'bgr24',
                '-s', f'{self.target_width}x{self.target_height}',
                '-r', str(self.target_fps),  # 입력 FPS (30)
                '-i', 'pipe:',
                '-c:v', 'libx264',
                '-preset', 'medium',        # 더 나은 압축
                '-crf', '32',               # 28 → 32 (강력한 압축, AI 분석엔 충분)
                '-r', str(self.archive_fps),  # 출력 FPS (5) - 대폭 샘플링
                '-movflags', '+faststart',  # moov atom 최적화
                str(self.current_archive_path)
            ]
            
            self.current_archive_process = subprocess.Popen(
                ffmpeg_archive_cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                bufsize=0,
                creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, 'CREATE_NO_WINDOW') else 0
            )
            print(f"[HLS 아카이브] 새 10분 구간 시작: {filename}")
        except Exception as e:
            print(f"[HLS 아카이브] ❌ FFmpeg 프로세스 시작 실패: {e}")
            self.current_archive_process = None
    
    def _finalize_current_archive(self):
        """현재 10분 단위 아카이브 완료 (FFmpeg 프로세스 종료 + S3 업로드)"""
        if self.current_archive_process:
            try:
                # FFmpeg stdin 닫기 (파일 finalize)
                self.current_archive_process.stdin.close()
                # 프로세스 종료 대기
                self.current_archive_process.wait(timeout=10)
                self.current_archive_process = None
                
                # 파일 생성 확인
                if self.current_archive_path and self.current_archive_path.exists():
                    file_size = self.current_archive_path.stat().st_size / (1024 * 1024)
                    duration_minutes = self.current_archive_frame_count / (self.target_fps * 60)
                    print(f"[HLS 아카이브] 10분 구간 저장 완료: {self.current_archive_path.name}")
                    print(f"  크기: {file_size:.2f}MB, 프레임 수: {self.current_archive_frame_count}, 실제 길이: {duration_minutes:.1f}분")
                    
                    # S3에 업로드
                    self._upload_archive_to_s3()
                else:
                    print(f"[HLS 아카이브] ⚠️ 파일 생성 실패: {self.current_archive_path}")
            except Exception as e:
                print(f"[HLS 아카이브] ❌ 종료 중 오류: {e}")
                if self.current_archive_process:
                    try:
                        self.current_archive_process.terminate()
                    except:
                        pass
                    self.current_archive_process = None
    
    def _upload_archive_to_s3(self):
        """아카이브 영상을 S3에 업로드 (로컬 파일은 VLM 분석 후 삭제)"""
        if not self.current_archive_path or not self.current_archive_path.exists():
            return
        
        try:
            from app.services.s3_service import S3Service
            
            s3_service = S3Service()
            if not s3_service.is_enabled():
                print(f"[HLS 아카이브] ℹ️ S3가 비활성화되어 있습니다. 로컬에만 저장됩니다.")
                return
            
            # S3에 업로드 (로컬 파일은 유지)
            s3_url = s3_service.upload_archive(
                file_path=self.current_archive_path,
                camera_id=self.camera_id,
                segment_start=self.current_archive_start
            )
            
            if s3_url:
                print(f"[HLS 아카이브] ✅ S3 업로드 완료: {s3_url}")
                print(f"[HLS 아카이브] 📁 로컬 파일 유지 (VLM 분석용): {self.current_archive_path.name}")
            else:
                print(f"[HLS 아카이브] ⚠️ S3 업로드 실패, 로컬 파일 유지: {self.current_archive_path.name}")
                
        except Exception as e:
            print(f"[HLS 아카이브] ❌ S3 업로드 중 오류: {e}")
            import traceback
            traceback.print_exc()
    
    def _get_segment_start_time(self, now: datetime) -> datetime:
        """현재 시간을 10분 단위로 내림"""
        minute = (now.minute // self.archive_duration_minutes) * self.archive_duration_minutes
        return now.replace(minute=minute, second=0, microsecond=0)
    
    async def _run_gemini_analysis(self, detector, frame):
        """Gemini 분석 실행 (기존 메서드 - 호환성 유지)"""
        try:
            event = await detector.analyze_with_gemini(frame)
            if event:
                detector.save_events([event])  # 리스트로 감싸기
        except Exception as e:
            print(f"[Gemini 분석] 오류: {e}")
    
    async def _run_gemini_analysis_in_thread(self, detector, frame):
        """
        Gemini 분석을 별도 스레드에서 실행
        메인 스트리밍 루프를 블로킹하지 않도록 함
        """
        try:
            print(f"[Gemini 분석] 시작 (별도 스레드)...")
            event = await detector.analyze_with_gemini(frame)
            if event:
                # DB 세션이 닫히기 전에 필요한 속성 미리 가져오기
                event_title = event.title if hasattr(event, 'title') else "이벤트"
                detector.save_events([event])
                print(f"[Gemini 분석] 완료: {event_title}")
        except Exception as e:
            # DetachedInstanceError는 무시 (이미 저장됨)
            if "DetachedInstanceError" not in str(type(e).__name__):
                print(f"[Gemini 분석] 오류: {e}")
                import traceback
                traceback.print_exc()
    
=======
>>>>>>> 339dc48c4d9f2d2a4a72d593e47305b717dc4c6e
    def stop_streaming(self):
        """스트리밍 중지"""
        print(f"[HLS 스트림] 중지 요청: {self.camera_id}")
        self.is_running = False
        
        if self.ffmpeg_process:
            self.ffmpeg_process.terminate()
    
    def get_playlist_url(self) -> str:
        """HLS 플레이리스트 URL 반환"""
        return f"/api/live-monitoring/hls/{self.camera_id}/{self.camera_id}.m3u8"
<<<<<<< HEAD

=======
>>>>>>> 339dc48c4d9f2d2a4a72d593e47305b717dc4c6e
