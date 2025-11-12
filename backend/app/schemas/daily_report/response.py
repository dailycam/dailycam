"""Response schemas for daily reports."""

from __future__ import annotations

from pydantic import BaseModel


class DailyReportResponse(BaseModel):
    """Generated daily report."""

    date: str
    sections: list[str]
    summary: str


