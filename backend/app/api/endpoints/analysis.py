"""
Analysis API Endpoints
비디오 업로드 및 분석 요청을 처리하는 API
"""

from typing import Optional
from fastapi import APIRouter, Depends, File, UploadFile, Form, HTTPException, status
from sqlalchemy.orm import Session

from app.api import deps
from app.models.user import User
from app.services.gemini_service import get_gemini_service, GeminiService
from app.crud.analysis import save_analysis_result

router = APIRouter()


@router.post(
    "/vlm", 
    status_code=status.HTTP_201_CREATED,
    summary="VLM 비디오 분석 요청",
    description="비디오 파일을 업로드하여 안전 및 발달 분석을 수행하고 결과를 DB에 저장합니다."
)
async def analyze_video(
    file: UploadFile = File(..., description="분석할 비디오 파일 (MP4, MOV 등)"),
    stage: Optional[str] = Form(None, description="강제 지정할 발달 단계 (예: '5'). 미입력 시 자동 추정"),
    age_months: Optional[int] = Form(None, description="아이의 개월 수 (예: 15)"),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    [비디오 분석 프로세스]
    1. 비디오 파일 수신 및 유효성 검사
    2. Gemini VLM 서비스 호출 (순차적 안전/발달 분석)
    3. 분석 결과 파싱 및 DB 저장 (AnalysisLog, SafetyEvent, DevelopmentEvent 등)
    4. 저장된 로그 정보 반환
    """
    
    # 1. 파일 유효성 검사
    if not file.content_type.startswith("video/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미지나 텍스트가 아닌 비디오 파일만 업로드 가능합니다."
        )
    
    try:
        # 2. 파일 읽기 (메모리에 로드)
        # 주의: 대용량 파일의 경우 청크 단위로 읽거나 임시 파일로 저장하는 방식 권장
        video_content = await file.read()
        
        if len(video_content) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="비어 있는 파일입니다."
            )

        # 3. Gemini VLM 서비스 호출
        service: GeminiService = get_gemini_service()
        
        # 실제 분석 수행 (오래 걸릴 수 있음 - 비동기 처리 권장)
        ai_result = await service.analyze_video_vlm(
            video_bytes=video_content,
            content_type=file.content_type,
            stage=stage,
            age_months=age_months
        )
        
        # 4. 분석 결과 DB 저장
        # TODO: 실제 운영 환경에서는 파일을 S3/GCS에 업로드하고 그 URL을 video_path로 사용해야 함
        # 현재는 로컬 테스트용으로 가상의 경로 저장
        dummy_video_path = f"/uploads/{current_user.id}/{file.filename}"
        
        saved_log = save_analysis_result(
            db=db,
            user_id=current_user.id,
            video_path=dummy_video_path, 
            video_filename=file.filename,
            ai_result=ai_result
        )
        
        return {
            "message": "분석이 성공적으로 완료되었습니다.",
            "analysis_id": saved_log.id,
            "safety_score": saved_log.safety_score,
            "overall_safety_level": saved_log.overall_safety_level,
            "main_activity": saved_log.main_activity,
            "created_at": saved_log.created_at
        }

    except ValueError as ve:
        # 분석 서비스 내부의 값 오류 (파싱 실패 등)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"AI 분석 실패: {str(ve)}"
        )
    except Exception as e:
        # 기타 서버 오류
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"서버 내부 오류: {str(e)}"
        )
