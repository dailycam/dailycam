"""API routes for daily report features."""

from fastapi import APIRouter, Depends

from app.schemas.daily_report import DailyReportRequest, DailyReportResponse
from app.services.daily_report import DailyReportService, get_daily_report_service

router = APIRouter()


@router.post("/", response_model=DailyReportResponse)
async def generate_daily_report(
    payload: DailyReportRequest,
    service: DailyReportService = Depends(get_daily_report_service),
) -> DailyReportResponse:
    """Generate a daily report for the requested date."""
    return await service.generate(payload)


