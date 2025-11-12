"""Service layer for daily report features."""

from __future__ import annotations

from dataclasses import dataclass

from app.schemas.daily_report import DailyReportRequest, DailyReportResponse


@dataclass(slots=True)
class DailyReportServiceConfig:
    """Configuration for the daily report service."""

    default_sections: tuple[str, ...] = ("summary", "events", "recommendations")


class DailyReportService:
    """Business logic for daily reports."""

    def __init__(self, config: DailyReportServiceConfig) -> None:
        self._config = config

    async def generate(self, payload: DailyReportRequest) -> DailyReportResponse:
        """Generate a daily report. Placeholder for future implementation."""
        return DailyReportResponse(
            date=payload.date,
            sections=list(self._config.default_sections),
            summary="Daily report service not yet implemented.",
        )


def get_daily_report_service() -> DailyReportService:
    """FastAPI dependency injector for DailyReportService."""
    config = DailyReportServiceConfig()
    return DailyReportService(config=config)


