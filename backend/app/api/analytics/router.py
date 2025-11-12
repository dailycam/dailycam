"""API routes for analytics features."""

from fastapi import APIRouter, Depends

from app.schemas.analytics import AnalyticsRequest, AnalyticsResponse
from app.services.analytics import AnalyticsService, get_analytics_service

router = APIRouter()


@router.post("/summary", response_model=AnalyticsResponse)
async def get_analytics_summary(
    payload: AnalyticsRequest,
    service: AnalyticsService = Depends(get_analytics_service),
) -> AnalyticsResponse:
    """Return an analytics summary for the requested time range."""
    return await service.summarize(payload)


