"""Service layer for live monitoring features."""

from __future__ import annotations

import asyncio
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import AsyncGenerator

import cv2
import numpy as np

from app.schemas.live_monitoring import (
    LiveMonitoringRequest,
    LiveMonitoringResponse,
)


@dataclass(slots=True)
class LiveMonitoringServiceConfig:
    """Configuration for live monitoring service."""

    heartbeat_seconds: int = 30
    default_fps: int = 30
    video_cache_dir: Path = Path("temp_videos")


@dataclass(slots=True)
class VideoStreamState:
    """State for video streaming."""

    video_path: str
    loop: bool = True
    speed: float = 1.0  # 재생 속도 배율 (1.0 = 정상 속도)
    cap: cv2.VideoCapture | None = None
    fps: float = 30.0
    current_frame: bytes | None = None  # 현재 프레임 (JPEG 인코딩된 바이트)
    task: asyncio.Task | None = None  # 백그라운드 태스크


class LiveMonitoringService:
    """Business logic for live monitoring."""

    def __init__(self, config: LiveMonitoringServiceConfig) -> None:
        self._config = config
        self._active_streams: dict[str, VideoStreamState] = {}
        self._lock = asyncio.Lock()  # 스트림 상태 접근 동기화

    async def status(self, payload: LiveMonitoringRequest) -> LiveMonitoringResponse:
        """Return the live monitoring status. Placeholder implementation."""
        return LiveMonitoringResponse(
            camera_id=payload.camera_id,
            status="offline",
            last_heartbeat=datetime.now(tz=timezone.utc),
            heartbeat_interval=self._config.heartbeat_seconds,
        )

    def _get_video_capture(self, video_path: str) -> cv2.VideoCapture | None:
        """비디오 파일을 열고 VideoCapture 객체를 반환합니다."""
        if not os.path.exists(video_path):
            return None

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return None

        return cap

    async def _background_stream_task(
        self,
        camera_id: str,
        video_path: str,
        loop: bool,
        speed: float,
    ) -> None:
        """백그라운드에서 비디오를 읽고 현재 프레임을 업데이트하는 태스크."""
        cap = None
        try:
            cap = self._get_video_capture(video_path)
            if cap is None:
                return

            fps = cap.get(cv2.CAP_PROP_FPS) or self._config.default_fps
            frame_delay = 1.0 / (fps * speed)

            while True:
                ret, frame = cap.read()

                if not ret:
                    if loop:
                        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                        continue
                    else:
                        break

                # 프레임을 JPEG로 인코딩
                encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 85]
                _, buffer = cv2.imencode(".jpg", frame, encode_param)
                frame_bytes = buffer.tobytes()

                # 현재 프레임 업데이트 (동기화)
                async with self._lock:
                    if camera_id in self._active_streams:
                        self._active_streams[camera_id].current_frame = frame_bytes

                await asyncio.sleep(frame_delay)

        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"백그라운드 스트림 태스크 오류 ({camera_id}): {e}")
        finally:
            if cap is not None:
                cap.release()
            async with self._lock:
                if camera_id in self._active_streams:
                    del self._active_streams[camera_id]

    async def start_background_stream(
        self,
        camera_id: str,
        video_path: str,
        loop: bool = True,
        speed: float = 1.0,
    ) -> None:
        """백그라운드 스트림을 시작합니다. 클라이언트 연결과 무관하게 계속 실행됩니다."""
        async with self._lock:
            # 기존 스트림이 있으면 중지
            if camera_id in self._active_streams:
                await self.stop_stream(camera_id)

            # 비디오 파일 확인
            if not os.path.exists(video_path):
                raise FileNotFoundError(f"비디오 파일을 찾을 수 없습니다: {video_path}")

            # VideoCapture 생성 (태스크에서 사용)
            cap = self._get_video_capture(video_path)
            if cap is None:
                raise ValueError(f"비디오 파일을 열 수 없습니다: {video_path}")

            fps = cap.get(cv2.CAP_PROP_FPS) or self._config.default_fps
            cap.release()  # 태스크에서 다시 열 것임

            # 스트림 상태 저장
            state = VideoStreamState(
                video_path=video_path,
                loop=loop,
                speed=speed,
                cap=None,  # 태스크에서 관리
                fps=fps,
                current_frame=None,
                task=None,
            )
            self._active_streams[camera_id] = state

            # 백그라운드 태스크 시작
            task = asyncio.create_task(
                self._background_stream_task(camera_id, video_path, loop, speed)
            )
            state.task = task

    def get_current_frame(self, camera_id: str) -> bytes | None:
        """현재 프레임을 가져옵니다. (동기 함수)"""
        # 동기 함수이므로 직접 접근 (current_frame은 자주 읽히므로 lock 없이 접근)
        if camera_id in self._active_streams:
            return self._active_streams[camera_id].current_frame
        return None

    async def generate_mjpeg_stream(
        self,
        camera_id: str,
        video_path: str | None = None,
        loop: bool = True,
        speed: float = 1.0,
    ) -> AsyncGenerator[bytes, None]:
        """
        녹화된 비디오 파일을 MJPEG 스트림으로 변환하여 전송합니다.
        백그라운드 태스크가 실행 중이면 현재 프레임을 전송합니다.

        Args:
            camera_id: 카메라 ID
            video_path: 비디오 파일 경로 (None이면 기존 스트림 사용)
            loop: 비디오 끝에 도달하면 처음부터 반복할지 여부
            speed: 재생 속도 배율 (1.0 = 정상 속도, 2.0 = 2배속)

        Yields:
            JPEG 인코딩된 프레임 바이트
        """
        # 백그라운드 스트림이 실행 중이면 현재 프레임을 전송
        if camera_id in self._active_streams:
            state = self._active_streams[camera_id]
            if state.task is not None and not state.task.done():
                # 백그라운드 태스크가 실행 중이면 현재 프레임을 계속 전송
                last_frame = None
                while True:
                    current_frame = state.current_frame
                    if current_frame is not None and current_frame != last_frame:
                        yield (
                            b"--frame\r\n"
                            b"Content-Type: image/jpeg\r\n\r\n" + current_frame + b"\r\n"
                        )
                        last_frame = current_frame
                    await asyncio.sleep(0.033)  # 약 30 FPS
                return

        # 백그라운드 스트림이 없으면 시작
        if video_path is None:
            return

        # 백그라운드 스트림 시작
        await self.start_background_stream(camera_id, video_path, loop, speed)

        # 현재 프레임을 전송
        last_frame = None
        while True:
            current_frame = self.get_current_frame(camera_id)
            if current_frame is not None and current_frame != last_frame:
                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n" + current_frame + b"\r\n"
                )
                last_frame = current_frame
            await asyncio.sleep(0.033)  # 약 30 FPS

    async def stop_stream(self, camera_id: str) -> None:
        """특정 카메라의 스트림을 중지합니다."""
        async with self._lock:
            if camera_id in self._active_streams:
                state = self._active_streams[camera_id]
                # 백그라운드 태스크 취소
                if state.task is not None and not state.task.done():
                    state.task.cancel()
                    try:
                        await state.task
                    except asyncio.CancelledError:
                        pass
                # VideoCapture 정리
                if state.cap is not None:
                    state.cap.release()
                del self._active_streams[camera_id]

    def get_active_streams(self) -> list[str]:
        """현재 활성화된 스트림의 카메라 ID 목록을 반환합니다."""
        return list(self._active_streams.keys())


def get_live_monitoring_service() -> LiveMonitoringService:
    """FastAPI dependency injector for LiveMonitoringService."""
    config = LiveMonitoringServiceConfig()
    return LiveMonitoringService(config=config)


