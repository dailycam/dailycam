"""Service layer for analytics features - 기본 구조만 유지."""

from __future__ import annotations

from sqlalchemy.orm import Session


class AnalyticsService:
    """Analytics 서비스 - 기본 구조만 유지 (실제 기능은 dashboard로 이동됨)"""

    def __init__(self, db: Session) -> None:
        self.db = db


def get_analytics_service(db: Session) -> AnalyticsService:
    """FastAPI dependency injector for AnalyticsService."""
    return AnalyticsService(db)
