"""Dashboard schema package."""

from .request import DashboardRequest
from .response import (
    DashboardResponse,
    RecommendationItem,
    RiskItem,
    WeeklyTrendData,
)

# Analytics 호환성을 위한 별칭 (기존 코드와의 호환성 유지)
AnalyticsRequest = DashboardRequest
AnalyticsResponse = DashboardResponse

__all__ = [
    "DashboardRequest",
    "DashboardResponse",
    "WeeklyTrendData",
    "RiskItem",
    "RecommendationItem",
    # Analytics 호환성
    "AnalyticsRequest",
    "AnalyticsResponse",
]

