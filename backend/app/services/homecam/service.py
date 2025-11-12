"""Service responsible for home camera integration logic."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from app.schemas.homecam import (
    HomeCamAnalysisRequest,
    HomeCamAnalysisResponse,
    HomeCamEvent,
)


class GenerativeClient(Protocol):
    """Protocol describing the methods required from a generative AI client."""

    async def analyze_clip(self, payload: HomeCamAnalysisRequest) -> HomeCamAnalysisResponse:
        """Analyze a video/image payload and return structured results."""


@dataclass(slots=True)
class HomeCamServiceConfig:
    """Configuration values required by the HomeCamService."""

    model_name: str = "gemini-2.5-flash"
    max_events: int = 5


class HomeCamService:
    """Business logic for the home camera integration."""

    def __init__(self, config: HomeCamServiceConfig, client: GenerativeClient | None = None) -> None:
        self._config = config
        self._client = client

    async def analyze(self, payload: HomeCamAnalysisRequest) -> HomeCamAnalysisResponse:
        """
        Analyze a home camera clip or image.

        If a generative client is configured, delegate to it. Otherwise, return
        a placeholder response so that the frontend can be developed without
        dependency on the external service.
        """
        if self._client:
            return await self._client.analyze_clip(payload)

        # Placeholder response for early integration/testing.
        events: list[HomeCamEvent] = [
            HomeCamEvent(label="placeholder-event", confidence=0.5, summary="No backend client configured yet.")
        ]
        return HomeCamAnalysisResponse(
            summary="HomeCam analysis not yet implemented.",
            events=events,
            model=self._config.model_name,
        )


def get_homecam_service() -> HomeCamService:
    """
    FastAPI dependency that returns a HomeCamService instance.

    In production this could be wired to an actual generative client (Gemini,
    etc.) and configuration loaded from environment variables.
    """
    config = HomeCamServiceConfig()
    return HomeCamService(config=config)


