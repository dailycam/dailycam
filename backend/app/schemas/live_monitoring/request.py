"""Request schemas for live monitoring."""

from __future__ import annotations

from pydantic import BaseModel


class LiveMonitoringRequest(BaseModel):
    """Request payload for live monitoring status."""

    camera_id: str


