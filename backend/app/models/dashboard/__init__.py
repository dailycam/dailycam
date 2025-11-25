"""Dashboard domain models."""

from .dashboard_statistics import DashboardStatistics
from .dashboard_weekly_trend import DashboardWeeklyTrend
from .dashboard_risk import DashboardRisk
from .dashboard_recommendation import DashboardRecommendation

__all__ = [
    "DashboardStatistics",
    "DashboardWeeklyTrend",
    "DashboardRisk",
    "DashboardRecommendation",
]

