"""Response schemas for the HomeCam domain."""

from __future__ import annotations

from pydantic import BaseModel


class HomeCamEvent(BaseModel):
    """Structured output describing an observed event."""

    label: str
    confidence: float
    summary: str


class HomeCamAnalysisResponse(BaseModel):
    """Response payload for an analyzed home camera clip."""

    summary: str
    events: list[HomeCamEvent]
    model: str = "gemini-2.5-flash"


