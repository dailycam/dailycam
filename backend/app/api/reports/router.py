from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from datetime import date, datetime

from app.database.session import get_db
from app.services.report_service import ReportService
from app.models.analysis import AnalysisLog

router = APIRouter()
report_service = ReportService()

@router.get("/daily-summary")
async def get_daily_parenting_report(
    target_date: str = Query(..., description="조회할 날짜 (YYYY-MM-DD)", regex=r"^\d{4}-\d{2}-\d{2}$"),
    user_id: int = Query(1, description="사용자 ID (현재는 기본값 1)"),
    db: Session = Depends(get_db)
):
    """
    [일일 육아 통찰 리포트] 생성 API
    
    특정 날짜의 분석 데이터를 종합하여, 전문가(AI)가 작성한 에세이 형식의 리포트를 반환합니다.
    """
    try:
        # 날짜 파싱
        parsed_date = datetime.strptime(target_date, "%Y-%m-%d").date()
        
        # 리포트 생성
        report_text = await report_service.generate_daily_report(db, user_id, parsed_date)
        
        return {
            "date": target_date,
            "report_text": report_text
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"리포트 생성 중 오류 발생: {str(e)}")
