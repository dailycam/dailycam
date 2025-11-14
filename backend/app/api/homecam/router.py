"""API routes for home camera integration - 간단 버전 (Gemini 분석만)"""

from fastapi import APIRouter, Depends, File, UploadFile, HTTPException

from app.services.gemini_service import GeminiService, get_gemini_service

router = APIRouter()


@router.post("/analyze-video")
async def analyze_video(
    video: UploadFile = File(..., description="분석할 비디오 파일"),
    gemini_service: GeminiService = Depends(get_gemini_service),
) -> dict:
    """
    비디오 파일을 업로드하여 Gemini 2.5 Flash로 분석하고 텍스트 결과를 반환합니다.
    
    - **video**: 비디오 파일 (mp4, mov, avi 등)
    - 반환: 분석 결과 (텍스트)
    """
    # 비디오 파일 타입 검증
    if not video.content_type or not video.content_type.startswith('video/'):
        raise HTTPException(
            status_code=400,
            detail="비디오 파일만 업로드 가능합니다."
        )
    
    try:
        print("[비디오 분석 시작]")
        
        # 비디오 파일 읽기
        video_content = await video.read()
        
        # Gemini로 비디오 분석
        result = await gemini_service.analyze_video(
            video_bytes=video_content,
            content_type=video.content_type or "video/mp4",
        )
        
        print("[비디오 분석 완료]")
        
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        error_msg = str(e)
        print(f"❌ 비디오 분석 오류: {error_msg}")
        print(f"상세 에러:\n{error_trace}")
        raise HTTPException(
            status_code=500,
            detail=f"비디오 분석 중 오류가 발생했습니다: {error_msg}"
        )
