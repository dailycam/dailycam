"""Response schemas for video highlights."""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel


class VideoHighlight(BaseModel):
    """Individual video highlight entry."""

    id: str
    title: str
    timestamp: str  # "오후 2:23" 형식
    duration: str  # "0:32" 형식
    location: str
    severity: Literal["high", "medium", "low"]
    description: str
    ai_analysis: str
    thumbnail_url: Optional[str] = None
    video_url: Optional[str] = None


class VideoHighlightsResponse(BaseModel):
    """Video highlights list response."""

    highlights: list[VideoHighlight]
    limit: int


