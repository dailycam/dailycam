"""Request schemas for the HomeCam domain."""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, HttpUrl, field_validator


class HomeCamAnalysisRequest(BaseModel):
    """Input payload describing a clip or snapshot for analysis."""

    source_type: Literal["video", "image"] = "video"
    source_url: HttpUrl
    user_id: Optional[str] = None
    prompt: Optional[str] = None

    @field_validator("prompt")
    @classmethod
    def _strip_prompt(cls, value: Optional[str]) -> Optional[str]:
        return value.strip() or None if value else None


