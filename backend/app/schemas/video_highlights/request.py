"""Request schemas for video highlights."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class VideoHighlightsRequest(BaseModel):
    """Request payload for listing video highlights."""

    camera_id: Optional[str] = None
    limit: Optional[int] = None


