"""Request schemas for analytics."""

from __future__ import annotations

from datetime import date
from typing import Optional

from pydantic import BaseModel


class AnalyticsRequest(BaseModel):
    """Request payload for analytics summary."""

    user_id: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    range_days: Optional[int] = None


