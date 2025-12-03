"""HLS 스트림 생성기 - 진짜 실시간 스트림"""

import cv2
import numpy as np
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional
import asyncio
import subprocess
import shutil
import os
import threading
import time

class HLSStreamGenerator:
    """
    HLS 스트림 생성기
    - 백그라운드에서 계속 실행되는 진짜 라이브 스트림
    - 재연결 시 자동으로 현재 시간부터 재생
    - 10초 단위 .ts 파일 + .m3u8 플레이리스트
    """
    
    def __init__(
        self, 
        camera_id: str, 
        video_source,  # Path (가짜 영상) 또는 str (홈캠 URL)
        output_dir: Path,
        is_real_camera: bool = False,
        segment_duration: int = 10,  # HLS 세그먼트 길이 (초)
        enable_realtime_detection: bool = True,
        age_months: Optional[int] = None,
        event_loop: Optional[asyncio.AbstractEventLoop] = None
    ):
        self.camera_id = camera_id
        self.video_source = video_source
        self.output_dir = output_dir
        self.is_real_camera = is_real_camera
        self.segment_duration = segment_duration
        
        # HLS 출력 디렉토리
        self.hls_dir = output_dir / "hls"
        self.hls_dir.mkdir(parents=True, exist_ok=True)
        
        # 10분 단위 세그먼트 저장 디렉토리 (메타데이터 추출용)
        self.archive_dir = output_dir / "archive"
        self.archive_dir.mkdir(parents=True, exist_ok=True)
        
        self.is_running = False
        self.ffmpeg_process = None
        
        # 실시간 이벤트 탐지
        self.enable_realtime_detection = enable_realtime_detection
        self.age_months = age_months
        self.event_loop = event_loop
        
        # 10분 단위 아카이브 설정
        self.archive_duration_minutes = 10
        self.target_fps = 5.0
        self.target_width = 640
        self.target_height = 480
        
        self.current_archive_writer = None
        self.current_archive_path = None
        self.current_archive_start = None
        self.current_archive_frame_count = 0
        
    async def start_streaming(self):
        """HLS 스트리밍 시작"""
        self.is_running = True
        
        if self.is_real_camera:
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
        
        # FFmpeg 설치 확인 (여러 경로 시도)
        ffmpeg_path = None
        
        # 0. 프로젝트 내부 bin 폴더 확인 (최우선)
        # backend/app/services/live_monitoring/hls_stream_generator.py -> backend/
        backend_dir = Path(__file__).resolve().parents[3]
        local_ffmpeg = backend_dir / "bin" / "ffmpeg.exe"
        
        if local_ffmpeg.exists():
            ffmpeg_path = str(local_ffmpeg)
            print(f"[HLS 스트림] ✅ 프로젝트 내부 bin에서 찾음: {ffmpeg_path}")
        
        # 1. 환경 변수에서 직접 경로 확인
        if not ffmpeg_path:
            env_path = os.getenv('FFMPEG_PATH')
            if env_path and Path(env_path).exists():
                ffmpeg_path = env_path
                print(f"[HLS 스트림] ✅ FFMPEG_PATH 환경 변수에서 찾음: {ffmpeg_path}")
        
        # 2. PATH에서 찾기
        if not ffmpeg_path:
            ffmpeg_path = shutil.which('ffmpeg')
            if ffmpeg_path:
                print(f"[HLS 스트림] ✅ PATH에서 찾음: {ffmpeg_path}")
        
        # 3. PATH에서 못 찾으면 일반적인 경로들 시도
        if not ffmpeg_path:
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
        video_queue = VideoQueue(self.camera_id, self.video_source)
        video_queue.load_videos(shuffle=True, target_duration_minutes=60)
        
        if video_queue.get_queue_size() == 0:
            print(f"[HLS 스트림] 오류: 재생할 영상이 없습니다")
            print(f"[HLS 스트림] 영상 경로: {self.video_source}")
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
            def read_stderr():
                try:
                    while self.is_running and self.ffmpeg_process:
                        line = self.ffmpeg_process.stderr.readline()
                        if line:
                            decoded = line.decode('utf-8', errors='ignore').strip()
                            if decoded and not decoded.startswith('frame='):  # 일반적인 프레임 정보는 제외
                                print(f"[FFmpeg] {decoded}")
                except Exception as e:
                    print(f"[FFmpeg stderr 읽기 오류] {e}")
            
            stderr_thread = threading.Thread(target=read_stderr, daemon=True)
            stderr_thread.start()
            
            # HLS 플레이리스트 파일이 생성될 때까지 대기 (최대 5초)
            print(f"[HLS 스트림] HLS 플레이리스트 생성 대기 중...")
            playlist_created = False
            for _ in range(50):  # 0.1초씩 50번 = 5초
                if playlist_path.exists():
                    playlist_created = True
                    print(f"[HLS 스트림] ✅ HLS 플레이리스트 생성 완료: {playlist_path}")
                    break
                await asyncio.sleep(0.1)
            
            if not playlist_created:
                print(f"[HLS 스트림] ⚠️ 경고: HLS 플레이리스트가 생성되지 않았습니다. 계속 진행합니다...")
            
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
                        
                        # 10분 단위 아카이브에 저장
                        if self.current_archive_writer:
                            self.current_archive_writer.write(frame)
                            self.current_archive_frame_count += 1
                        
                        # 실시간 이벤트 탐지
                        if detector and frame_count % detection_frame_interval == 0:
                            try:
                                events = detector.process_frame(frame)
                                if events:
                                    detector.save_events(events)
                                
                                if detector.should_run_gemini_analysis() and self.event_loop:
                                    asyncio.run_coroutine_threadsafe(
                                        self._run_gemini_analysis(detector, frame.copy()),
                                        self.event_loop
                                    )
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
    
    async def _start_real_camera_hls(self):
        """실제 홈캠으로 HLS 스트림 생성"""
        playlist_path = self.hls_dir / f"{self.camera_id}.m3u8"
        segment_pattern = str(self.hls_dir / f"{self.camera_id}_%03d.ts")
        
        # FFmpeg로 홈캠 스트림을 직접 HLS로 변환
        ffmpeg_cmd = [
            'ffmpeg',
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
                    # 재시작
                    self.ffmpeg_process = subprocess.Popen(ffmpeg_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                await asyncio.sleep(1)
        
        except Exception as e:
            print(f"[HLS 스트림] 오류: {e}")
        finally:
            if self.ffmpeg_process:
                self.ffmpeg_process.terminate()
                self.ffmpeg_process.wait()
            print(f"[HLS 스트림] 종료: {self.camera_id}")
    
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
        """새 10분 단위 아카이브 시작"""
        now = datetime.now()
        self.current_archive_start = self._get_segment_start_time(now)
        filename = f"archive_{self.current_archive_start.strftime('%Y%m%d_%H%M%S')}.mp4"
        self.current_archive_path = self.archive_dir / filename
        self.current_archive_frame_count = 0
        
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        self.current_archive_writer = cv2.VideoWriter(
            str(self.current_archive_path),
            fourcc,
            self.target_fps,
            (self.target_width, self.target_height)
        )
        
        if self.current_archive_writer.isOpened():
            print(f"[HLS 아카이브] 새 10분 구간 시작: {filename}")
    
    def _finalize_current_archive(self):
        """현재 10분 단위 아카이브 완료"""
        if self.current_archive_writer:
            self.current_archive_writer.release()
            self.current_archive_writer = None
            
            if self.current_archive_path and self.current_archive_path.exists():
                file_size = self.current_archive_path.stat().st_size / (1024 * 1024)
                duration_minutes = self.current_archive_frame_count / (self.target_fps * 60)
                print(f"[HLS 아카이브] 10분 구간 저장 완료: {self.current_archive_path.name}")
                print(f"  크기: {file_size:.2f}MB, 프레임 수: {self.current_archive_frame_count}, 실제 길이: {duration_minutes:.1f}분")
    
    def _get_segment_start_time(self, now: datetime) -> datetime:
        """현재 시간을 10분 단위로 내림"""
        minute = (now.minute // self.archive_duration_minutes) * self.archive_duration_minutes
        return now.replace(minute=minute, second=0, microsecond=0)
    
    async def _run_gemini_analysis(self, detector, frame):
        """Gemini 분석 실행"""
        try:
            events = await detector.analyze_with_gemini(frame)
            if events:
                detector.save_events(events)
        except Exception as e:
            print(f"[Gemini 분석] 오류: {e}")
    
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

