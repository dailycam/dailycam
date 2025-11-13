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


class LiveMonitoringService:
    """Business logic for live monitoring."""

    def __init__(self, config: LiveMonitoringServiceConfig) -> None:
        self._config = config
        self._active_streams: dict[str, VideoStreamState] = {}

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

    async def generate_mjpeg_stream(
        self,
        camera_id: str,
        video_path: str | None = None,
        loop: bool = True,
        speed: float = 1.0,
    ) -> AsyncGenerator[bytes, None]:
        """
        녹화된 비디오 파일을 MJPEG 스트림으로 변환하여 전송합니다.

        Args:
            camera_id: 카메라 ID
            video_path: 비디오 파일 경로 (None이면 기존 스트림 사용)
            loop: 비디오 끝에 도달하면 처음부터 반복할지 여부
            speed: 재생 속도 배율 (1.0 = 정상 속도, 2.0 = 2배속)

        Yields:
            JPEG 인코딩된 프레임 바이트
        """
        # 기존 스트림이 있으면 정리
        if camera_id in self._active_streams:
            state = self._active_streams[camera_id]
            if state.cap is not None:
                state.cap.release()
            del self._active_streams[camera_id]

        # 비디오 경로가 제공되지 않으면 스트림 종료
        if video_path is None:
            return

        # 비디오 파일 확인
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"비디오 파일을 찾을 수 없습니다: {video_path}")

        # VideoCapture 생성
        cap = self._get_video_capture(video_path)
        if cap is None:
            raise ValueError(f"비디오 파일을 열 수 없습니다: {video_path}")

        # FPS 가져오기
        fps = cap.get(cv2.CAP_PROP_FPS) or self._config.default_fps
        frame_delay = 1.0 / (fps * speed)

        # 스트림 상태 저장
        state = VideoStreamState(
            video_path=video_path,
            loop=loop,
            speed=speed,
            cap=cap,
            fps=fps,
        )
        self._active_streams[camera_id] = state

        try:
            while True:
                ret, frame = cap.read()

                if not ret:
                    if loop:
                        # 루프 모드: 처음부터 다시 시작
                        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                        continue
                    else:
                        # 루프 모드가 아니면 종료
                        break

                # 프레임을 JPEG로 인코딩
                encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 85]
                _, buffer = cv2.imencode(".jpg", frame, encode_param)
                frame_bytes = buffer.tobytes()

                # MJPEG 스트림 형식으로 전송
                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
                )

                # 프레임 속도에 맞춰 대기
                await asyncio.sleep(frame_delay)

        finally:
            # 정리
            if cap is not None:
                cap.release()
            if camera_id in self._active_streams:
                del self._active_streams[camera_id]

    def stop_stream(self, camera_id: str) -> None:
        """특정 카메라의 스트림을 중지합니다."""
        if camera_id in self._active_streams:
            state = self._active_streams[camera_id]
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


