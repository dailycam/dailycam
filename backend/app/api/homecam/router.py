"""API routes for home camera integration."""

from pathlib import Path
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.homecam import HomeCamAnalysisRequest, HomeCamAnalysisResponse
from app.schemas.homecam.video_analysis import VideoAnalysisResponse
from app.services.dashboard.service import get_dashboard_service
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
    user_id: str = "default_user",  # TODO: 실제 인증에서 가져오기
    gemini_service: GeminiService = Depends(get_gemini_service),
    db: Session = Depends(get_db),
) -> VideoAnalysisResponse:
    """
    비디오 파일을 업로드하여 Gemini 2.5 Flash로 안전 분석을 수행하고,
    결과를 대시보드 및 일일 리포트 테이블에 자동 저장합니다.
    
    - **video**: 비디오 파일 (mp4, mov, avi 등)
    - 반환: 넘어짐, 위험 행동 등의 분석 결과 (analysis_id, report_id 포함)
    """
    # 비디오 파일 타입 검증
    if not video.content_type or not video.content_type.startswith('video/'):
        raise HTTPException(
            status_code=400,
            detail="비디오 파일만 업로드 가능합니다."
        )
    
    try:
        print("=" * 80)
        print("[비디오 분석 시작]")
        print("=" * 80)
        
        # 비디오 파일 읽기
        video_content = await video.read()
        file_size = len(video_content)
        
        # 대략적인 비디오 길이 추정 (1MB ≈ 1분 가정, 매우 근사치)
        estimated_duration_seconds = (file_size / (1024 * 1024)) * 60
        
        # Gemini로 비디오 분석 (bytes 직접 전달)
        print("[1단계] Gemini 비디오 분석 시작...")
        result = await gemini_service.analyze_video(
            video_bytes=video_content,
            content_type=video.content_type or "video/mp4",
        )
        print(f"[1단계 완료] Gemini 분석 완료 - 사건 수: {result.get('total_incidents', 0)}")
        
        # 대시보드 테이블에 저장
        print("[2단계] 대시보드 데이터 저장...")
        try:
            dashboard_service = get_dashboard_service(db)
            dashboard_service.save_video_analysis_to_dashboard(
                user_id=user_id,
                video_analysis_result=result,
                video_duration_seconds=estimated_duration_seconds,
            )
            print("[2단계 완료] 대시보드 저장 완료")
        except Exception as db_error:
            import traceback
            error_trace = traceback.format_exc()
            print(f"[2단계 경고] 대시보드 데이터 저장 실패: {db_error}")
            print(f"상세 에러:\n{error_trace}")
        
        # 일일 리포트 자동 생성 및 저장
        print("[3단계] 일일 리포트 자동 생성...")
        try:
            from app.services.daily_report.service import get_daily_report_service
            
            daily_report_service = get_daily_report_service(db)
            report_data = await daily_report_service.generate_from_analysis(
                analysis_data=result,
                db=db,
            )
            
            # 리포트 ID를 분석 결과에 추가
            result["report_id"] = report_data.get("report_id")
            print(f"[3단계 완료] 일일 리포트 생성 완료 - report_id: {result.get('report_id')}")
        except Exception as report_error:
            import traceback
            error_trace = traceback.format_exc()
            print(f"[3단계 경고] 일일 리포트 생성 실패: {report_error}")
            print(f"상세 에러:\n{error_trace}")
            # 리포트 생성 실패해도 분석 결과는 반환
        
        print("=" * 80)
        print("[비디오 분석 완료]")
        print("=" * 80)
        
        return VideoAnalysisResponse(**result)
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
