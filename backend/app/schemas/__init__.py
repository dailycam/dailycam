"""Pydantic schemas for the DailyCam backend."""

from .analytics import AnalyticsRequest, AnalyticsResponse
from .daily_report import DailyReportRequest, DailyReportResponse
from .homecam import HomeCamAnalysisRequest, HomeCamAnalysisResponse, HomeCamEvent
from .live_monitoring import LiveMonitoringRequest, LiveMonitoringResponse
from .video_highlights import (
    VideoHighlight,
    VideoHighlightsRequest,
    VideoHighlightsResponse,
)

__all__ = [
    "AnalyticsRequest",
    "AnalyticsResponse",
    "DailyReportRequest",
    "DailyReportResponse",
    "HomeCamAnalysisRequest",
    "HomeCamAnalysisResponse",
    "HomeCamEvent",
    "LiveMonitoringRequest",
    "LiveMonitoringResponse",
    "VideoHighlight",
    "VideoHighlightsRequest",
    "VideoHighlightsResponse",
]

