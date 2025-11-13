"""Database models package."""

from app.database import Base

# 모델 import (테이블 생성에 필요)
# Dashboard만 사용
from app.models.dashboard import (
    DashboardStatistics,
    DashboardWeeklyTrend,
    DashboardRisk,
    DashboardRecommendation,
)

__all__ = [
    "Base",
    "DashboardStatistics",
    "DashboardWeeklyTrend",
    "DashboardRisk",
    "DashboardRecommendation",
]

