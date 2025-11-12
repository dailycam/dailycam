"""Service layer for live monitoring features."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

from app.schemas.live_monitoring import (
    LiveMonitoringRequest,
    LiveMonitoringResponse,
)


@dataclass(slots=True)
class LiveMonitoringServiceConfig:
    """Configuration for live monitoring service."""

    heartbeat_seconds: int = 30


class LiveMonitoringService:
    """Business logic for live monitoring."""

    def __init__(self, config: LiveMonitoringServiceConfig) -> None:
        self._config = config

    async def status(self, payload: LiveMonitoringRequest) -> LiveMonitoringResponse:
        """Return the live monitoring status. Placeholder implementation."""
        return LiveMonitoringResponse(
            camera_id=payload.camera_id,
            status="offline",
            last_heartbeat=datetime.now(tz=timezone.utc),
            heartbeat_interval=self._config.heartbeat_seconds,
        )


def get_live_monitoring_service() -> LiveMonitoringService:
    """FastAPI dependency injector for LiveMonitoringService."""
    config = LiveMonitoringServiceConfig()
    return LiveMonitoringService(config=config)


