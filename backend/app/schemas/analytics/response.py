"""Response schemas for analytics."""

from __future__ import annotations

from pydantic import BaseModel


class AnalyticsResponse(BaseModel):
    """Analytics summary response."""

    summary: str
    range_days: int


