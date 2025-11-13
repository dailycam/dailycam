"""Service layer for the DailyCam backend."""

from .analytics import AnalyticsService, get_analytics_service
from .dashboard import (
    DashboardService,
    DashboardServiceConfig,
    get_dashboard_service,
)
from .daily_report import (
    DailyReportService,
    get_daily_report_service,
)
from .homecam import HomeCamService, HomeCamServiceConfig, get_homecam_service
from .live_monitoring import (
    LiveMonitoringService,
    LiveMonitoringServiceConfig,
    get_live_monitoring_service,
)
from .video_highlights import (
    VideoHighlightsService,
    VideoHighlightsServiceConfig,
    get_video_highlights_service,
)

__all__ = [
    "AnalyticsService",
    "get_analytics_service",
    "DashboardService",
    "DashboardServiceConfig",
    "get_dashboard_service",
    "DailyReportService",
    "get_daily_report_service",
    "HomeCamService",
    "HomeCamServiceConfig",
    "get_homecam_service",
    "LiveMonitoringService",
    "LiveMonitoringServiceConfig",
    "get_live_monitoring_service",
    "VideoHighlightsService",
    "VideoHighlightsServiceConfig",
    "get_video_highlights_service",
]

