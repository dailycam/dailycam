"""Service layer for video highlights features."""

from __future__ import annotations

from dataclasses import dataclass

from app.schemas.video_highlights import (
    VideoHighlight,
    VideoHighlightsRequest,
    VideoHighlightsResponse,
)


@dataclass(slots=True)
class VideoHighlightsServiceConfig:
    """Configuration for video highlights service."""

    max_highlights: int = 5


class VideoHighlightsService:
    """Business logic for video highlights."""

    def __init__(self, config: VideoHighlightsServiceConfig) -> None:
        self._config = config

    async def list_highlights(self, payload: VideoHighlightsRequest) -> VideoHighlightsResponse:
        """Return video highlights. Placeholder implementation."""
        dummy_highlight = VideoHighlight(
            title="Placeholder Highlight",
            timestamp_seconds=0,
            description="Video highlights service not yet implemented.",
        )
        return VideoHighlightsResponse(
            highlights=[dummy_highlight],
            limit=self._config.max_highlights,
        )


def get_video_highlights_service() -> VideoHighlightsService:
    """FastAPI dependency injector for VideoHighlightsService."""
    config = VideoHighlightsServiceConfig()
    return VideoHighlightsService(config=config)


