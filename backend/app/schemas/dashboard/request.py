"""Request schemas for dashboard."""

from __future__ import annotations

from datetime import date
from typing import Optional

from pydantic import BaseModel


class DashboardRequest(BaseModel):
    """Request payload for dashboard summary."""

    user_id: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    range_days: Optional[int] = None

