"""API routes for home camera integration."""

from pathlib import Path
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from sqlalchemy.orm import Session

from app.schemas.homecam import HomeCamAnalysisRequest, HomeCamAnalysisResponse
from app.schemas.homecam.video_analysis import VideoAnalysisResponse
from app.services.homecam import HomeCamService, get_homecam_service
from app.services.gemini_service import GeminiService, get_gemini_service
from app.services.video_storage import VideoStorage
from app.services.daily_report.repository import DailyReportRepository
from app.database import get_db

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
    db: Session = Depends(get_db),
) -> VideoAnalysisResponse:
    """
    비디오 파일을 업로드하여 Gemini 2.5 Flash로 안전 분석을 수행합니다.
    
    - **video**: 비디오 파일 (mp4, mov, avi 등)
    - 반환: 넘어짐, 위험 행동 등의 분석 결과 (analysis_id 포함)
    """
    # 비디오 파일 타입 검증
    if not video.content_type or not video.content_type.startswith('video/'):
        raise HTTPException(
            status_code=400,
            detail="비디오 파일만 업로드 가능합니다."
        )
    
    try:
        # 비디오 파일 저장
        storage = VideoStorage()
        await video.seek(0)  # 파일 포인터 초기화
        video_path = await storage.save_video(video)
        
        # 파일 크기 계산
        file_size = Path(video_path).stat().st_size if Path(video_path).exists() else None
        
        # DB에 비디오 정보 저장
        repository = DailyReportRepository(db)
        saved_video = repository.save_video(
            filename=video.filename or "unknown",
            file_path=video_path,
            file_size=file_size,
            mime_type=video.content_type
        )
        
        # Gemini로 비디오 분석
        await video.seek(0)  # 파일 포인터 초기화
        result, _ = await gemini_service.analyze_video(video, save_video=False)
        
        # DB에 분석 결과 저장
        saved_analysis = repository.save_video_analysis(
            video_id=saved_video.id,
            analysis_data=result
        )
        
        # 분석 ID와 비디오 경로를 결과에 포함
        result['analysis_id'] = saved_analysis.id
        result['video_id'] = saved_video.id
        result['video_path'] = video_path
        
        return VideoAnalysisResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"비디오 분석 중 오류가 발생했습니다: {str(e)}")
