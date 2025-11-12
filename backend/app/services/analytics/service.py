"""Service layer for analytics features."""

from __future__ import annotations

from dataclasses import dataclass

from app.schemas.analytics import AnalyticsRequest, AnalyticsResponse


@dataclass(slots=True)
class AnalyticsServiceConfig:
    """Configuration for the analytics service."""

    default_range_days: int = 7


class AnalyticsService:
    """Business logic for analytics."""

    def __init__(self, config: AnalyticsServiceConfig) -> None:
        self._config = config

    async def summarize(self, payload: AnalyticsRequest) -> AnalyticsResponse:
        """Return an analytics summary. Placeholder for future implementation."""
        return AnalyticsResponse(
            summary="Analytics service not yet implemented.",
            range_days=payload.range_days or self._config.default_range_days,
        )


def get_analytics_service() -> AnalyticsService:
    """FastAPI dependency injector for AnalyticsService."""
    config = AnalyticsServiceConfig()
    return AnalyticsService(config=config)


