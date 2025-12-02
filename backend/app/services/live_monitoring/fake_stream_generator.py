"""가짜 라이브 스트림 생성기 (5분 단위 버퍼링)"""

import cv2
import numpy as np
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional
import asyncio
from app.services.live_monitoring.video_queue import VideoQueue
from app.services.live_monitoring.realtime_detector import RealtimeEventDetector


class FakeLiveStreamGenerator:
    """
    짧은 영상들을 연속 재생하여 "가짜 라이브 스트림" 생성
    5분마다 자동으로 잘라서 저장
    """
    
    def __init__(self, camera_id: str, video_dir: Path, buffer_dir: Path, enable_realtime_detection: bool = True, age_months: Optional[int] = None, event_loop: Optional[asyncio.AbstractEventLoop] = None):
        self.camera_id = camera_id
        self.video_queue = VideoQueue(camera_id, video_dir)
        self.buffer_dir = buffer_dir
        self.buffer_dir.mkdir(parents=True, exist_ok=True)
        
        self.current_writer: Optional[cv2.VideoWriter] = None
        self.current_segment_start: Optional[datetime] = None
        self.current_file_path: Optional[Path] = None
        self.is_running = False
        
        # 10분 단위 설정
        self.segment_duration_minutes = 10
        
        # 프레임 크기 (480p)
        self.target_width = 640
        self.target_height = 480
        self.target_fps = 5.0  # 분석용 5fps (1fps에서 증가)
        
        # 프레임 카운트 기반 버퍼링
        self.frames_per_segment = int(self.target_fps * 60 * self.segment_duration_minutes)  # 10분 * 60초 * 5fps = 3000 프레임
        self.current_segment_frame_count = 0
        
        # 실시간 이벤트 탐지기 (하이브리드)
        self.enable_realtime_detection = enable_realtime_detection
        self.detector = RealtimeEventDetector(camera_id, age_months=age_months) if enable_realtime_detection else None
        self.detection_frame_interval = 30  # 30프레임마다 경량 탐지 (약 1초마다)
        
        # 이벤트 루프 저장 (스레드에서 비동기 작업 실행용)
        self.event_loop = event_loop
        self.gemini_future = None  # Future 객체 저장
        
    async def start_streaming(self):
        """스트리밍 시작 (비동기)"""
        # 영상 큐 로드 (60분 분량)
        self.video_queue.load_videos(shuffle=True, target_duration_minutes=60)
        
        if self.video_queue.get_queue_size() == 0:
            print(f"[스트림 생성기] 오류: 재생할 영상이 없습니다")
            return
        
        self.is_running = True
        
        # 현재 시간 기준으로 첫 10분 구간 시작
        now = datetime.now()
        self.current_segment_start = self._get_segment_start_time(now)
        self.current_segment_frame_count = 0
        self._start_new_segment_file()
        
        print(f"[스트림 생성기] 시작: {self.camera_id} (10분 단위 버퍼링, {self.target_fps}fps)")
        
        # 영상 재생 루프
        while self.is_running:
            video_path = self.video_queue.get_next_video()
            if not video_path:
                print(f"[스트림 생성기] 경고: 다음 영상이 없습니다")
                break
            
            await self._play_video_async(video_path)
            
            # 5분 구간이 바뀌었는지 확인
            now = datetime.now()
            segment_start = self._get_segment_start_time(now)
            if segment_start != self.current_segment_start:
                self._finalize_current_segment()
                self.current_segment_start = segment_start
                self._start_new_segment_file()
        
        # 종료 시 현재 파일 닫기
        self._finalize_current_segment()
        print(f"[스트림 생성기] 종료: {self.camera_id}")
    
    async def _play_video_async(self, video_path: Path):
        """
        단일 영상을 비동기로 재생하여 버퍼에 추가
        """
        # CPU 블로킹 작업을 별도 스레드에서 실행
        await asyncio.to_thread(self._play_video, video_path)
    
    def _play_video(self, video_path: Path):
        """단일 영상을 재생하여 버퍼에 추가"""
        cap = cv2.VideoCapture(str(video_path))
        
        if not cap.isOpened():
            print(f"[스트림 생성기] 오류: 영상 열기 실패 - {video_path.name}")
            return
        
        fps = cap.get(cv2.CAP_PROP_FPS)
        if fps <= 0:
            fps = 30.0  # 기본값
        
        # 프레임 샘플링 (1fps로 다운샘플링)
        frame_skip = int(fps / self.target_fps) if fps > self.target_fps else 1
        
        frame_count = 0
        frames_written = 0
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            # 실시간 이벤트 탐지 (하이브리드)
            if self.enable_realtime_detection and self.detector and frame_count % self.detection_frame_interval == 0:
                try:
                    # 1. 경량 탐지 (즉시)
                    events = self.detector.process_frame(frame)
                    if events:
                        self.detector.save_events(events)
                    
                    # 2. Gemini 분석 (45초마다, 비동기)
                    if self.detector.should_run_gemini_analysis() and self.event_loop:
                        # 기존 Future가 없거나 완료되었으면 새로 실행
                        if self.gemini_future is None or self.gemini_future.done():
                            # 메인 이벤트 루프에서 코루틴 실행
                            self.gemini_future = asyncio.run_coroutine_threadsafe(
                                self._run_gemini_analysis(frame.copy()),
                                self.event_loop
                            )
                except Exception as e:
                    print(f"[실시간 탐지] 오류: {e}")
            
            # 프레임 샘플링
            if frame_count % frame_skip == 0:
                # 프레임 카운트 기반 10분 구간 확인
                if self.current_segment_frame_count >= self.frames_per_segment:
                    print(f"[스트림 생성기] 10분 분량 완료 ({self.current_segment_frame_count} 프레임), 새 구간 시작")
                    self._finalize_current_segment()
                    now = datetime.now()
                    self.current_segment_start = self._get_segment_start_time(now)
                    self._start_new_segment_file()
                    self.current_segment_frame_count = 0
                
                # 프레임 크기 조정 (480p)
                height, width = frame.shape[:2]
                if height != self.target_height or width != self.target_width:
                    # 비율 유지하면서 리사이즈
                    scale = self.target_height / height
                    new_width = int(width * scale)
                    frame = cv2.resize(frame, (new_width, self.target_height))
                    
                    # 중앙 크롭 또는 패딩
                    if new_width > self.target_width:
                        # 크롭
                        start_x = (new_width - self.target_width) // 2
                        frame = frame[:, start_x:start_x + self.target_width]
                    elif new_width < self.target_width:
                        # 패딩
                        pad_left = (self.target_width - new_width) // 2
                        pad_right = self.target_width - new_width - pad_left
                        frame = cv2.copyMakeBorder(
                            frame, 0, 0, pad_left, pad_right,
                            cv2.BORDER_CONSTANT, value=(0, 0, 0)
                        )
                
                # 프레임을 현재 시간대 버퍼에 쓰기
                if self.current_writer and self.is_running:
                    self.current_writer.write(frame)
                    frames_written += 1
                    self.current_segment_frame_count += 1
            
            frame_count += 1
        
        cap.release()
        print(f"[스트림 생성기] 영상 재생 완료: {video_path.name} ({frames_written} 프레임)")
    
    def _get_segment_start_time(self, current_time: datetime) -> datetime:
        """
        현재 시간을 10분 단위로 내림
        예: 14:03:45 → 14:00:00, 14:17:30 → 14:10:00
        """
        minutes = (current_time.minute // self.segment_duration_minutes) * self.segment_duration_minutes
        return current_time.replace(minute=minutes, second=0, microsecond=0)
    
    def _start_new_segment_file(self):
        """새로운 10분 분량 파일 시작"""
        if self.current_writer:
            self.current_writer.release()
        
        filename = f"segment_{self.current_segment_start.strftime('%Y%m%d_%H%M%S')}.mp4"
        self.current_file_path = self.buffer_dir / filename
        
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        self.current_writer = cv2.VideoWriter(
            str(self.current_file_path),
            fourcc,
            self.target_fps,
            (self.target_width, self.target_height)
        )
        
        if not self.current_writer.isOpened():
            print(f"[스트림 생성기] 오류: VideoWriter 열기 실패")
            self.current_writer = None
        else:
            segment_end = self.current_segment_start + timedelta(minutes=self.segment_duration_minutes)
            print(f"[스트림 생성기] 새 10분 구간 파일 시작: {filename}")
            print(f"  구간: {self.current_segment_start.strftime('%H:%M:%S')} ~ {segment_end.strftime('%H:%M:%S')}")
            print(f"  목표 프레임 수: {self.frames_per_segment} 프레임 ({self.target_fps}fps × {self.segment_duration_minutes}분)")
    
    def _finalize_current_segment(self):
        """현재 10분 구간 파일 완료"""
        if self.current_writer:
            self.current_writer.release()
            self.current_writer = None
            
            if self.current_file_path and self.current_file_path.exists():
                file_size = self.current_file_path.stat().st_size / (1024 * 1024)  # MB
                duration_minutes = self.current_segment_frame_count / (self.target_fps * 60)
                print(f"[스트림 생성기] 10분 구간 파일 저장 완료: {self.current_file_path.name}")
                print(f"  크기: {file_size:.2f}MB, 프레임 수: {self.current_segment_frame_count}, 실제 길이: {duration_minutes:.1f}분")
            else:
                print(f"[스트림 생성기] 경고: 파일이 생성되지 않았습니다")
    
    async def _run_gemini_analysis(self, frame: np.ndarray):
        """Gemini 분석 실행 (비동기)"""
        try:
            if self.detector:
                gemini_event = await self.detector.analyze_with_gemini(frame)
                if gemini_event:
                    self.detector.save_events([gemini_event])
        except Exception as e:
            print(f"[Gemini 분석 태스크] 오류: {e}")
    
    def stop_streaming(self):
        """스트리밍 중지"""
        print(f"[스트림 생성기] 중지 요청: {self.camera_id}")
        self.is_running = False
        
        # Gemini 분석 Future 취소
        if self.gemini_future and not self.gemini_future.done():
            self.gemini_future.cancel()
        
        self._finalize_current_segment()

