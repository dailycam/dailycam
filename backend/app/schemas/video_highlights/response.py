"""Response schemas for video highlights."""

from __future__ import annotations

from pydantic import BaseModel


class VideoHighlight(BaseModel):
    """Individual video highlight entry."""

    title: str
    timestamp_seconds: int
    description: str


class VideoHighlightsResponse(BaseModel):
    """Video highlights list response."""

    highlights: list[VideoHighlight]
    limit: int


