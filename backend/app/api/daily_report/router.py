"""API routes for daily report features."""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.schemas.daily_report import DailyReportRequest, DailyReportResponse
from app.services.daily_report import DailyReportService, get_daily_report_service
from app.database import get_db

router = APIRouter()


@router.post("/", response_model=DailyReportResponse)
async def generate_daily_report(
    payload: DailyReportRequest,
    service: DailyReportService = Depends(get_daily_report_service),
) -> DailyReportResponse:
    """Generate a daily report for the requested date."""
    return await service.generate(payload)


@router.post("/from-analysis")
async def generate_daily_report_from_analysis(
    analysis_data: Dict[str, Any],
    service: DailyReportService = Depends(get_daily_report_service),
    db: Session = Depends(get_db),
):
    """
    비디오 분석 결과를 기반으로 일일 리포트를 생성합니다.
    
    - **analysis_data**: 비디오 분석 결과 (VideoAnalysisResponse 형식, analysis_id 포함, video_path 포함 가능)
    - 반환: 리포트 데이터 (시간대별 활동, 위험도 우선순위, 추천 사항, 하이라이트 영상 등, report_id 포함)
    """
    try:
        analysis_id = analysis_data.get("analysis_id")
        if not analysis_id:
            raise HTTPException(status_code=400, detail="analysis_id가 필요합니다.")
        
        # video_path는 analysis_data에서 가져오거나, 별도로 전달될 수 있음
        video_path = analysis_data.get("video_path")
        
        print(f"[요청] 리포트 생성: analysis_id={analysis_id}, video_path={video_path}")
        
        report_data = await service.generate_from_analysis(
            analysis_data,
            video_path=video_path,
            analysis_id=analysis_id,
            db=db
        )
        
        # 리포트 ID 확인 및 로그
        report_id = report_data.get('report_id')
        print(f"[성공] 리포트 생성 완료: report_id={report_id}")
        print(f"[디버그] 리포트 데이터 키: {list(report_data.keys())}")
        print(f"[디버그] 리포트 데이터 타입: {type(report_data)}")
        
        if not report_id:
            print(f"[경고] 리포트 ID가 없습니다! 리포트 데이터: {report_data}")
        
        # 응답을 명시적으로 딕셔너리로 변환하여 반환
        # FastAPI가 자동으로 JSON으로 직렬화하지만, 딕셔너리로 확실히 변환
        if not isinstance(report_data, dict):
            if hasattr(report_data, 'dict'):
                report_data = report_data.dict()
            elif hasattr(report_data, '__dict__'):
                report_data = report_data.__dict__
            else:
                report_data = dict(report_data)
        
        # report_id가 없으면 경고만 출력 (팀원의 DB 구조에서는 analysis_id가 없으므로 복구 불가)
        if 'report_id' not in report_data or report_data.get('report_id') is None:
            print(f"[경고] 리포트 ID가 응답에 없습니다! 리포트 데이터: {report_data}")
        
        print(f"[최종] 반환할 리포트 데이터: report_id={report_data.get('report_id')}, keys={list(report_data.keys())}")
        
        return report_data
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        print(f"[오류] 리포트 생성 중 오류: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"리포트 생성 중 오류가 발생했습니다: {str(e)}")


@router.get("/{report_id}")
async def get_daily_report(
    report_id: int,
    service: DailyReportService = Depends(get_daily_report_service),
    db: Session = Depends(get_db),
):
    """
    리포트 ID로 리포트를 조회합니다.
    
    - **report_id**: 리포트 ID
    - 반환: 리포트 데이터 (없으면 404)
    """
    try:
        report = service.get_report_by_id(report_id, db)
        if report is None:
            raise HTTPException(status_code=404, detail="리포트를 찾을 수 없습니다.")
        return report
    except HTTPException as he:
        raise he
    except Exception as e:
        import traceback
        print(f"리포트 조회 중 오류 (ID: {report_id}): {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"리포트 조회 중 오류가 발생했습니다: {str(e)}")


@router.get("/latest")
async def get_latest_daily_report(
    service: DailyReportService = Depends(get_daily_report_service),
    db: Session = Depends(get_db),
):
    """
    가장 최근 리포트를 조회합니다.
    
    - 반환: 가장 최근 리포트 데이터 (없으면 404)
    """
    import traceback
    print("=" * 60)
    print("[요청] 최신 리포트 조회 시작 - 엔드포인트 도달 확인")
    print("=" * 60)
    try:
        
        report = service.get_latest_report(db)
        
        if report is None:
            print("[실패] 리포트가 없어서 404 반환")
            # 명확하게 404 반환
            from fastapi.responses import JSONResponse
            return JSONResponse(
                status_code=404,
                content={"detail": "리포트를 찾을 수 없습니다."}
            )
        
        print(f"[성공] 리포트 반환 준비: report_id={report.get('report_id')}")
        print(f"[디버그] 리포트 키: {list(report.keys())}")
        
        # JSON 직렬화 가능한지 확인
        import json
        try:
            json_str = json.dumps(report, ensure_ascii=False, default=str)  # 직렬화 테스트
            print(f"[디버그] JSON 직렬화 성공 (길이: {len(json_str)})")
        except Exception as json_err:
            print(f"[오류] JSON 직렬화 실패: {json_err}")
            print(f"[오류] 리포트 데이터 타입: {type(report)}")
            print(f"[오류] 리포트 데이터: {report}")
            print(traceback.format_exc())
            raise HTTPException(status_code=500, detail=f"리포트 데이터 직렬화 실패: {str(json_err)}")
        
        print("=" * 60)
        print("[성공] 리포트 반환 완료")
        print("=" * 60)
        return report
        
    except HTTPException as he:
        # HTTPException은 그대로 전달
        print(f"[HTTPException] {he.status_code}: {he.detail}")
        raise he
    except Exception as e:
        # 예상치 못한 오류는 500으로 처리
        print(f"[오류] 리포트 조회 중 예상치 못한 오류: {str(e)}")
        print(f"[오류] 오류 타입: {type(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"리포트 조회 중 오류가 발생했습니다: {str(e)}")


