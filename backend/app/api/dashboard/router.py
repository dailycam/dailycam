"""API routes for dashboard features - 대시보드 데이터 조회 및 관리."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.dashboard import DashboardRequest, DashboardResponse
from app.services.dashboard.service import get_dashboard_service

router = APIRouter()


@router.post("/summary", response_model=DashboardResponse)
async def get_dashboard_summary(
    payload: DashboardRequest,
    db: Session = Depends(get_db),
) -> DashboardResponse:
    """
    대시보드 통계를 반환합니다.
    비디오 분석 결과가 저장된 대시보드 테이블에서 데이터를 조회합니다.
    """
    service = get_dashboard_service(db)
    return await service.summarize(payload)


@router.post("/dummy-data")
async def create_dummy_data(
    user_id: str = "default_user",
    db: Session = Depends(get_db),
) -> dict:
    """
    대시보드에 더미 데이터를 생성합니다.
    로그인 기능이 없을 때 테스트용으로 사용합니다.
    
    - **user_id**: 사용자 ID (기본값: "default_user")
    - 반환: 생성된 데이터 개수
    """
    try:
        dashboard_service = get_dashboard_service(db)
        result = dashboard_service.create_dummy_data(user_id=user_id)
        return {
            "success": True,
            "message": "더미 데이터가 생성되었습니다.",
            "created": result,
        }
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"❌ 더미 데이터 생성 오류: {str(e)}")
        print(f"상세 에러:\n{error_trace}")
        raise HTTPException(
            status_code=500,
            detail=f"더미 데이터 생성 중 오류가 발생했습니다: {str(e)}"
        )

