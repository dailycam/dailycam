"""Safety Report API Router"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List, Dict, Any

from app.database import get_db
from app.utils.auth_utils import get_current_user_id
from app.models.analysis import AnalysisLog, SafetyEvent

router = APIRouter()


@router.get("/summary")
def get_safety_report_summary(
    period_type: str = Query("week", description="기간 타입 (week, month)"),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
) -> Dict[str, Any]:
    """
    안전 리포트용 요약 데이터 조회
    """
    # 기간 설정
    if period_type == "week":
        days = 7
    else:  # month
        days = 30
    
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    # 기간 내 분석 로그들
    logs = (
        db.query(AnalysisLog)
        .filter(
            AnalysisLog.user_id == user_id,
            AnalysisLog.created_at >= start_date
        )
        .order_by(AnalysisLog.created_at.desc())
        .all()
    )
    
    # 주간/월간 안전도 추이 데이터
    trend_data: List[Dict[str, Any]] = []
    
    if period_type == "week":
        # 주간: 날짜별
        for i in range(7):
            day_start = start_date + timedelta(days=i)
            day_end = day_start + timedelta(days=1)
            
            day_stats = (
                db.query(func.avg(AnalysisLog.safety_score).label("avg_safety"))
                .filter(
                    AnalysisLog.user_id == user_id,
                    AnalysisLog.created_at >= day_start,
                    AnalysisLog.created_at < day_end
                )
                .first()
            )
            
            day_names = ["월", "화", "수", "목", "금", "토", "일"]
            trend_data.append({
                "date": day_names[i],
                "안전도": int(day_stats.avg_safety or 0) if day_stats.avg_safety else 0
            })
    else:
        # 월간: 주별
        for week in range(4):
            week_start = start_date + timedelta(weeks=week)
            week_end = week_start + timedelta(weeks=1)
            
            week_stats = (
                db.query(func.avg(AnalysisLog.safety_score).label("avg_safety"))
                .filter(
                    AnalysisLog.user_id == user_id,
                    AnalysisLog.created_at >= week_start,
                    AnalysisLog.created_at < week_end
                )
                .first()
            )
            
            trend_data.append({
                "date": f"{week + 1}주",
                "안전도": int(week_stats.avg_safety or 0) if week_stats.avg_safety else 0
            })
    
    # 안전사고 유형별 통계
    all_safety_events = (
        db.query(SafetyEvent)
        .join(AnalysisLog, SafetyEvent.analysis_log_id == AnalysisLog.id)
        .filter(
            AnalysisLog.user_id == user_id,
            AnalysisLog.created_at >= start_date
        )
        .all()
    )
    
    # 사고 유형별 카운트 (title 기반으로 분류)
    incident_type_counts: Dict[str, int] = {}
    for event in all_safety_events:
        # title에서 사고 유형 추출 (간단한 키워드 매칭)
        title = event.title or ""
        if "낙상" in title or "넘어" in title:
            incident_type_counts["낙상"] = incident_type_counts.get("낙상", 0) + 1
        elif "충돌" in title or "부딛" in title:
            incident_type_counts["충돌/부딛힘"] = incident_type_counts.get("충돌/부딛힘", 0) + 1
        elif "끼임" in title:
            incident_type_counts["끼임"] = incident_type_counts.get("끼임", 0) + 1
        elif "전도" in title or "넘어짐" in title:
            incident_type_counts["전도(가구 넘어짐)"] = incident_type_counts.get("전도(가구 넘어짐)", 0) + 1
        elif "감전" in title:
            incident_type_counts["감전"] = incident_type_counts.get("감전", 0) + 1
        elif "질식" in title:
            incident_type_counts["질식"] = incident_type_counts.get("질식", 0) + 1
    
    incident_type_data = [
        {"name": "낙상", "value": 35, "color": "#fca5a5", "count": incident_type_counts.get("낙상", 0)},
        {"name": "충돌/부딛힘", "value": 25, "color": "#fdba74", "count": incident_type_counts.get("충돌/부딛힘", 0)},
        {"name": "끼임", "value": 15, "color": "#fde047", "count": incident_type_counts.get("끼임", 0)},
        {"name": "전도(가구 넘어짐)", "value": 10, "color": "#86efac", "count": incident_type_counts.get("전도(가구 넘어짐)", 0)},
        {"name": "감전", "value": 10, "color": "#7dd3fc", "count": incident_type_counts.get("감전", 0)},
        {"name": "질식", "value": 5, "color": "#c4b5fd", "count": incident_type_counts.get("질식", 0)},
    ]
    
    # 24시간 시계 데이터 (오늘 날짜 기준)
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = datetime.now().replace(hour=23, minute=59, second=59, microsecond=999999)
    
    today_logs = (
        db.query(AnalysisLog)
        .filter(
            AnalysisLog.user_id == user_id,
            AnalysisLog.created_at >= today_start,
            AnalysisLog.created_at <= today_end
        )
        .all()
    )
    
    clock_data = []
    for hour in range(24):
        # 해당 시간대의 이벤트 조회
        hour_start = today_start + timedelta(hours=hour)
        hour_end = hour_start + timedelta(hours=1)
        
        hour_events = (
            db.query(SafetyEvent)
            .join(AnalysisLog, SafetyEvent.analysis_log_id == AnalysisLog.id)
            .filter(
                AnalysisLog.user_id == user_id,
                AnalysisLog.created_at >= hour_start,
                AnalysisLog.created_at < hour_end
            )
            .all()
        )
        
        safety_level: str = "safe"
        safety_score = 95
        
        for event in hour_events:
            severity = event.severity.value if hasattr(event.severity, 'value') else str(event.severity)
            if severity == "위험":
                safety_level = "danger"
                safety_score = 60
            elif severity == "주의":
                safety_level = "warning"
                safety_score = min(safety_score, 75)
        
        # 수면 시간대는 안전
        if hour >= 0 and hour < 6 or hour >= 20:
            if safety_level == "safe":
                safety_score = 98
        
        clock_data.append({
            "hour": hour,
            "safetyLevel": safety_level,
            "safetyScore": safety_score
        })
    
    
    # 최신 분석 로그 (요약용)
    latest_log = logs[0] if logs else None
    
    # 오늘 분석된 모든 영상의 평균 안전 점수
    today_safety_scores = [log.safety_score for log in today_logs if log.safety_score is not None]
    avg_safety_score = int(sum(today_safety_scores) / len(today_safety_scores)) if today_safety_scores else 0
    
    return {
        "trendData": trend_data,
        "incidentTypeData": incident_type_data,
        "clockData": clock_data,
        "safetySummary": latest_log.safety_summary if latest_log else "아직 분석된 데이터가 없습니다.",
        "safetyScore": avg_safety_score  # 오늘 분석된 모든 영상의 평균 안전 점수
    }

