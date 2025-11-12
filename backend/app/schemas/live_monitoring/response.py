"""Response schemas for live monitoring."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class LiveMonitoringResponse(BaseModel):
    """Live monitoring status response."""

    camera_id: str
    status: str
    last_heartbeat: datetime
    heartbeat_interval: int


