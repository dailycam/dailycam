"""API routes for video highlights features."""

from fastapi import APIRouter, Depends

from app.schemas.video_highlights import (
    VideoHighlightsRequest,
    VideoHighlightsResponse,
)
from app.services.video_highlights import (
    VideoHighlightsService,
    get_video_highlights_service,
)

router = APIRouter()


@router.post("/", response_model=VideoHighlightsResponse)
async def list_video_highlights(
    payload: VideoHighlightsRequest,
    service: VideoHighlightsService = Depends(get_video_highlights_service),
) -> VideoHighlightsResponse:
    """Return a list of generated or detected video highlights."""
    return await service.list_highlights(payload)


