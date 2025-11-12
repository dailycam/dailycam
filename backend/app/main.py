"""FastAPI application entry-point for the DailyCam backend."""

from fastapi import FastAPI

from .api import (
    analytics_router,
    daily_report_router,
    homecam_router,
    live_monitoring_router,
    video_highlights_router,
)


def create_app() -> FastAPI:
    """Create and configure the FastAPI application instance."""
    app = FastAPI(title="DailyCam Backend", version="0.1.0")
    app.include_router(homecam_router, prefix="/api/homecam", tags=["homecam"])
    app.include_router(analytics_router, prefix="/api/analytics", tags=["analytics"])
    app.include_router(
        daily_report_router, prefix="/api/daily-report", tags=["daily-report"]
    )
    app.include_router(
        live_monitoring_router,
        prefix="/api/live-monitoring",
        tags=["live-monitoring"],
    )
    app.include_router(
        video_highlights_router,
        prefix="/api/video-highlights",
        tags=["video-highlights"],
    )
    return app


app = create_app()


