"""API routes for live monitoring features."""

from fastapi import APIRouter, Depends

from app.schemas.live_monitoring import LiveMonitoringRequest, LiveMonitoringResponse
from app.services.live_monitoring import LiveMonitoringService, get_live_monitoring_service

router = APIRouter()


@router.post("/status", response_model=LiveMonitoringResponse)
async def get_live_status(
    payload: LiveMonitoringRequest,
    service: LiveMonitoringService = Depends(get_live_monitoring_service),
) -> LiveMonitoringResponse:
    """Return the live monitoring status."""
    return await service.status(payload)


