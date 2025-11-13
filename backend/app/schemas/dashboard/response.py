"""Response schemas for dashboard."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class WeeklyTrendData(BaseModel):
    """주간 추이 데이터."""

    day: str
    score: float
    incidents: int


class RiskItem(BaseModel):
    """위험 항목."""

    level: Literal["high", "medium", "low"]
    title: str
    time: str
    count: int


class RecommendationItem(BaseModel):
    """추천 항목."""

    priority: Literal["high", "medium", "low"]
    title: str
    description: str


class DashboardResponse(BaseModel):
    """Dashboard summary response."""

    summary: str
    range_days: int
    # 대시보드 통계
    safety_score: float = 0.0
    incident_count: int = 0
    monitoring_hours: float = 0.0
    activity_pattern: str = "정상"
    # 주간 추이
    weekly_trend: list[WeeklyTrendData] = []
    # 위험 항목
    risks: list[RiskItem] = []
    # 추천 항목
    recommendations: list[RecommendationItem] = []

