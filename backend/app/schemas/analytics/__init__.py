"""Analytics schema package."""

from .request import AnalyticsRequest
from .response import (
    AnalyticsResponse,
    RecommendationItem,
    RiskItem,
    WeeklyTrendData,
)

__all__ = [
    "AnalyticsRequest",
    "AnalyticsResponse",
    "WeeklyTrendData",
    "RiskItem",
    "RecommendationItem",
]


