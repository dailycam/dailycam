"""API routes for home camera integration."""

from fastapi import APIRouter, Depends, File, UploadFile, HTTPException

from app.schemas.homecam import HomeCamAnalysisRequest, HomeCamAnalysisResponse
from app.schemas.homecam.video_analysis import VideoAnalysisResponse
from app.services.homecam import HomeCamService, get_homecam_service
from app.services.gemini_service import GeminiService, get_gemini_service

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


@router.post("/analyze-video", response_model=VideoAnalysisResponse)
async def analyze_video(
    video: UploadFile = File(..., description="분석할 비디오 파일"),
    gemini_service: GeminiService = Depends(get_gemini_service),
) -> VideoAnalysisResponse:
    """
    비디오 파일을 업로드하여 Gemini 2.5 Flash로 안전 분석을 수행합니다.
    
    - **video**: 비디오 파일 (mp4, mov, avi 등)
    - 반환: 넘어짐, 위험 행동 등의 분석 결과
    """
    # 비디오 파일 타입 검증
    if not video.content_type or not video.content_type.startswith('video/'):
        raise HTTPException(
            status_code=400,
            detail="비디오 파일만 업로드 가능합니다."
        )
    
    try:
        # Gemini로 비디오 분석
        result = await gemini_service.analyze_video(video)
        return VideoAnalysisResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"비디오 분석 중 오류가 발생했습니다: {str(e)}")


