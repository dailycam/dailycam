"""Request schemas for daily reports."""

from __future__ import annotations

from datetime import date
from typing import Optional

from pydantic import BaseModel


class DailyReportRequest(BaseModel):
    """Request payload to generate a daily report."""

    user_id: Optional[str] = None
    date: date


