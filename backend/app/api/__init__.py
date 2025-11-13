"""API router package."""

from .analytics import router as analytics_router
from .dashboard import router as dashboard_router
from .daily_report import router as daily_report_router
from .homecam import router as homecam_router
from .live_monitoring import router as live_monitoring_router
from .video_highlights import router as video_highlights_router
from .image_classification import image_classification_router

__all__ = [
    "analytics_router",
    "dashboard_router",
    "daily_report_router",
    "homecam_router",
    "live_monitoring_router",
    "video_highlights_router",
    "image_classification_router",
]

