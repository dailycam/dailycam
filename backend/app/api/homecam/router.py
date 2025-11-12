"""API routes for home camera integration."""

from fastapi import APIRouter, Depends

from app.schemas.homecam import HomeCamAnalysisRequest, HomeCamAnalysisResponse
from app.services.homecam import HomeCamService, get_homecam_service

router = APIRouter()


@router.post("/analyze", response_model=HomeCamAnalysisResponse)
async def analyze_homecam_feed(
    payload: HomeCamAnalysisRequest,
    service: HomeCamService = Depends(get_homecam_service),
) -> HomeCamAnalysisResponse:
    """
    Analyze a home camera feed snapshot or clip and derive structured insights.

    This endpoint is intentionally lightweight so that frontend work can start
    before the Gemini integration is complete.
    """
    return await service.analyze(payload)


