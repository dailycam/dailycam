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
        self.ffmpeg_process = None  # 단일 FFmpeg 프로세스 (HLS + 아카이브 통합)
        
        # 실시간 이벤트 탐지
        self.enable_realtime_detection = enable_realtime_detection
        self.age_months = age_months
        self.event_loop = event_loop
        
        # 10분 단위 아카이브 설정
        self.archive_duration_minutes = 10
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
            
            # HLS 세그먼트 파일 정리 시작 (주기적으로 오래된 파일 삭제)
            self._start_hls_cleanup_task()
            
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
            
            # filter_complex를 사용하여 한 번의 인코딩으로 두 출력 생성
            # 비디오를 한 번 인코딩하고 split으로 두 스트림 생성
            # - hls_stream: HLS용 (원본 FPS)
            # - archive_stream: 아카이브용 (5fps 다운샘플링)
            
            # 비디오 인코딩 및 분기
            video_filter = (
                f"scale={self.target_width}:{self.target_height},"
                f"fps={self.target_fps},"
                f"split=2[hls_v][archive_v]"
            )
            
            # 무음 오디오 생성
            ffmpeg_cmd = [
                self.ffmpeg_path,
                '-hide_banner',
                '-loglevel', 'warning', # 로그 다이어트: warning 이상만 출력
                '-threads', '2',  # CPU 사용량 제한 (Docker 환경 최적화)
                # 입력
                '-stream_loop', '-1',
                '-re', # 실시간 속도로 읽기 (CPU 폭주 방지 핵심 옵션)
                '-f', 'concat',
                '-safe', '0',
                '-i', str(concat_file_absolute),
                
                # 무음 오디오 생성 (한 번만 입력)
                '-f', 'lavfi',
                '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
                
                # 비디오 인코딩 (한 번만 수행!)
                '-c:v', 'libx264',
                '-preset', 'ultrafast',
                '-tune', 'zerolatency',
                # 해상도 및 FPS 설정
                '-vf', f'scale={self.target_width}:{self.target_height},fps={self.target_fps}',
                '-g', str(int(self.target_fps * self.segment_duration)),
                '-keyint_min', str(int(self.target_fps * self.segment_duration)),
                '-sc_threshold', '0',
                
                # 오디오 인코딩
                '-c:a', 'aac',
                '-b:a', '128k',
                '-ar', '48000',
                
                # Tee Muxer: 인코딩된 스트림을 두 곳(HLS, Segment)으로 복제
                '-map', '0:v',  # 비디오
                '-map', '1:a',  # 오디오
                '-f', 'tee',
                (
                    f"[f=hls:hls_time={self.segment_duration}:hls_list_size=300:"
                    f"hls_flags=delete_segments+append_list+program_date_time:"
                    f"hls_segment_filename={segment_pattern_absolute}]"
                    f"{playlist_path_absolute}|"
                    
                    # fragmented mp4: segment muxer와 호환되는 형식
                    # movflags=frag_keyframe+empty_moov 로 moov atom 문제 해결
                    f"[f=segment:segment_time={self.archive_duration_minutes * 60}:"
                    f"reset_timestamps=1:strftime=1:"
                    f"segment_format_options=movflags=+frag_keyframe+empty_moov]"
                    f"{archive_dir_absolute}/archive_%Y%m%d_%H%M%S.mp4"
                )
            ]
            
            print(f"[통합 스트림] FFmpeg 명령어:")
            print(f"  입력 파일: {concat_file_absolute}")
            print(f"  HLS 출력: {playlist_path_absolute} (DVR 윈도우: 300 세그먼트)")
            print(f"  아카이브 출력: {archive_dir_absolute}/archive_%Y%m%d_%H%M%S.mp4 (10분마다 자동 생성)")
            
            self.ffmpeg_process = subprocess.Popen(
                ffmpeg_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                cwd='/app',
                creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, 'CREATE_NO_WINDOW') else 0
            )
            
            print(f"[통합 스트림] ✅ FFmpeg 프로세스 시작 (PID: {self.ffmpeg_process.pid})")
            print(f"[통합 스트림] CPU 사용량: 단일 프로세스로 약 50% 감소 예상")
            
            # stderr 모니터링 스레드 (아카이브 파일 생성 감지)
            def read_stderr():
                try:
                    while self.is_running and self.ffmpeg_process:
                        line = self.ffmpeg_process.stderr.readline()
                        if line:
                            decoded = line.decode('utf-8', errors='ignore').strip()
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
            
            stderr_thread = threading.Thread(target=read_stderr, daemon=True)
            stderr_thread.start()
            
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
                                
                                # S3 업로드 및 Job 등록 (동기적으로 실행)
                                # 비동기 함수를 동기 스레드에서 실행
                                try:
                                    if self.event_loop and self.event_loop.is_running():
                                        # 메인 루프가 실행 중이면 threadsafe하게 스케줄링
                                        future1 = asyncio.run_coroutine_threadsafe(
                                            self._upload_archive_to_s3_async(file_path), 
                                            self.event_loop
                                        )
                                        future2 = asyncio.run_coroutine_threadsafe(
                                            self._register_analysis_job_async(file_path), 
                                            self.event_loop
                                        )
                                        # 결과 대기 (선택적, 에러 로깅용)
                                        # future1.result(timeout=60)
                                    else:
                                        # 루프가 없거나 실행 중이 아니면 새 루프 사용 (주로 테스트용)
                                        loop = asyncio.new_event_loop()
                                        asyncio.set_event_loop(loop)
                                        loop.run_until_complete(self._upload_archive_to_s3_async(file_path))
                                        loop.run_until_complete(self._register_analysis_job_async(file_path))
                                        loop.close()
                                        
                                except Exception as e:
                                    print(f"[아카이브 모니터] ⚠️ 작업 스케줄링 오류: {e}")
                                
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
            # import pytz 제거 (상단에서 이미 import 됨)
            
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
            
            # 프로젝트 루트(backend) 기준 상대 경로로 변환
            # 워커가 Path(__file__).parent.parent.parent 기준으로 처리하므로
            # backend 디렉토리 기준 상대 경로를 저장해야 함
            backend_dir = Path(__file__).resolve().parents[3]  # backend 디렉토리
            try:
                # 절대 경로를 backend 기준 상대 경로로 변환
                relative_path = file_path.resolve().relative_to(backend_dir)
                video_path_str = str(relative_path)
            except ValueError:
                # backend 디렉토리 밖에 있으면 절대 경로 사용 (예외 케이스)
                video_path_str = str(file_path)
            
            analysis_job = AnalysisJob(
                camera_id=self.camera_id,
                video_path=video_path_str,
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
    
    def _start_hls_cleanup_task(self):
        """
        HLS 세그먼트 파일 정리 백그라운드 태스크 시작
        1시간 이상 된 .ts 파일을 주기적으로 삭제
        """
        def cleanup_loop():
            while self.is_running:
                try:
                    self._cleanup_old_hls_segments()
                    # 10분마다 정리 작업 실행
                    time.sleep(600)
                except Exception as e:
                    print(f"[HLS 정리] ❌ 오류: {e}")
                    time.sleep(600)
        
        cleanup_thread = threading.Thread(target=cleanup_loop, daemon=True)
        cleanup_thread.start()
        return cleanup_thread
    
    def _cleanup_old_hls_segments(self):
        """
        오래된 HLS 세그먼트 파일 삭제 (1시간 이상 된 파일)
        .m3u8 파일은 유지하고 .ts 파일만 삭제
        """
        try:
            if not self.hls_dir.exists():
                return
            
            # 현재 시간
            now = time.time()
            # 1시간 = 3600초
            max_age_seconds = 3600
            
            deleted_count = 0
            total_size = 0
            
            # .ts 파일만 검색
            for ts_file in self.hls_dir.glob("*.ts"):
                try:
                    # 파일 수정 시간 확인
                    file_mtime = ts_file.stat().st_mtime
                    file_age = now - file_mtime
                    
                    # 1시간 이상 된 파일 삭제
                    if file_age > max_age_seconds:
                        file_size = ts_file.stat().st_size
                        ts_file.unlink()
                        deleted_count += 1
                        total_size += file_size
                except Exception as e:
                    # 파일 삭제 실패 시 로그만 출력하고 계속 진행
                    print(f"[HLS 정리] ⚠️ 파일 삭제 실패 ({ts_file.name}): {e}")
            
            if deleted_count > 0:
                size_mb = total_size / (1024 * 1024)
                print(f"[HLS 정리] ✅ 오래된 세그먼트 {deleted_count}개 삭제 (총 {size_mb:.2f}MB)")
            
        except Exception as e:
            print(f"[HLS 정리] ❌ 정리 작업 오류: {e}")
    
    def _cleanup(self):
        """리소스 정리"""
        if self.ffmpeg_process:
            try:
                self.ffmpeg_process.terminate()
                self.ffmpeg_process.wait(timeout=5)
            except:
                pass
        
        print(f"[통합 스트림] 종료: {self.camera_id}")
    
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
            
            # HLS 세그먼트 파일 정리 시작
            self._start_hls_cleanup_task()
            
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
            try:
                self.ffmpeg_process.terminate()
                self.ffmpeg_process.wait(timeout=5)
            except Exception as e:
                print(f"[HLS 스트림] ⚠️ FFmpeg 프로세스 종료 중 오류: {e}")
    
    def get_playlist_url(self) -> str:
        """HLS 플레이리스트 URL 반환"""
        return f"/api/live-monitoring/hls/{self.camera_id}/{self.camera_id}.m3u8"
