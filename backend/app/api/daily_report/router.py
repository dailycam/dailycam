"""일일 리포트 API 라우터 - 팀원 구조 기반으로 새로 작성"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.database import get_db
from app.services.daily_report.service import get_daily_report_service

router = APIRouter()


@router.post("/generate")
async def generate_daily_report(
    analysis_data: Dict[str, Any],
    db: Session = Depends(get_db),
):
    """
    비디오 분석 결과를 기반으로 일일 리포트를 생성하고 DB에 저장합니다.
    
    - **analysis_data**: 비디오 분석 결과
    - 반환: 리포트 데이터 (report_id 포함)
    """
    try:
        service = get_daily_report_service(db)
        report_data = await service.generate_from_analysis(analysis_data, db=db)
        return report_data
    except Exception as e:
        import traceback
        print(f"[오류] 리포트 생성 실패: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"리포트 생성 중 오류가 발생했습니다: {str(e)}")


@router.get("/latest")
async def get_latest_daily_report(
    db: Session = Depends(get_db),
):
    """
    가장 최근 일일 리포트를 조회합니다.
    
    - 반환: 가장 최근 리포트 데이터 (없으면 404)
    """
    try:
        service = get_daily_report_service(db)
        report = service.get_latest_report(db)
        
        if report is None:
            raise HTTPException(status_code=404, detail="리포트를 찾을 수 없습니다.")
        
        return report
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"[오류] 리포트 조회 실패: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"리포트 조회 중 오류가 발생했습니다: {str(e)}")


@router.get("/{report_id}")
async def get_daily_report_by_id(
    report_id: int,
    db: Session = Depends(get_db),
):
    """
    리포트 ID로 일일 리포트를 조회합니다.
    
    - **report_id**: 리포트 ID
    - 반환: 리포트 데이터 (없으면 404)
    """
    try:
        service = get_daily_report_service(db)
        report = service.get_report_by_id(report_id, db)
        
        if report is None:
            raise HTTPException(status_code=404, detail="리포트를 찾을 수 없습니다.")
        
        return report
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"[오류] 리포트 조회 실패: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"리포트 조회 중 오류가 발생했습니다: {str(e)}")
