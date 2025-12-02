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
        # 주간: 오늘을 기준으로 지난 7일
        today = datetime.now()
        day_names_ko = ["월", "화", "수", "목", "금", "토", "일"]
        
        for i in range(6, -1, -1): # 6일 전부터 오늘까지 (오름차순으로 추가)
            day_to_query = today - timedelta(days=i)
            
            day_start = day_to_query.replace(hour=0, minute=0, second=0, microsecond=0)
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
            
            # 요일 이름 가져오기
            day_label = day_names_ko[day_to_query.weekday()]
            
            trend_data.append({
                "date": day_label,
                "안전도": int(day_stats.avg_safety or 0) if day_stats.avg_safety else 0
            })
    else: # month
        # 월간: 오늘을 기준으로 지난 4주간의 주간 평균
        today = datetime.now()
        
        for i in range(3, -1, -1): # 3주 전부터 이번 주까지 (오름차순으로 추가)
            # 각 주의 끝나는 날짜 (이번 주, 1주 전, 2주 전, 3주 전)
            end_of_week = today - timedelta(weeks=i)
            
            # 각 주의 시작 날짜 (끝나는 날짜로부터 6일 전)
            start_of_week = end_of_week - timedelta(days=6)
            
            # DB 쿼리를 위한 시간 범위 설정
            week_start_query = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
            week_end_query = end_of_week.replace(hour=23, minute=59, second=59, microsecond=999999)

            week_stats = (
                db.query(func.avg(AnalysisLog.safety_score).label("avg_safety"))
                .filter(
                    AnalysisLog.user_id == user_id,
                    AnalysisLog.created_at >= week_start_query,
                    AnalysisLog.created_at <= week_end_query
                )
                .first()
            )
            
            # 주차 라벨링 (예: "3주 전", "2주 전", "지난주", "이번 주")
            if i == 0:
                week_label = "이번 주"
            elif i == 1:
                week_label = "지난주"
            else:
                week_label = f"{i}주 전"

            trend_data.append({
                "date": week_label,
                "안전도": int(week_stats.avg_safety or 0) if week_stats.avg_safety else 0
            })
    
    # 안전사고 유형별 통계 (오늘 기준)
    today_start_for_incidents = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    all_safety_events = (
        db.query(SafetyEvent)
        .join(AnalysisLog, SafetyEvent.analysis_log_id == AnalysisLog.id)
        .filter(
            AnalysisLog.user_id == user_id,
            AnalysisLog.created_at >= today_start_for_incidents
        )
        .all()
    )
    
    # 사고 유형별 카운트 (title 기반으로 분류)
    incident_type_counts: Dict[str, int] = {}
    for event in all_safety_events:
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
        elif "질식" in title or "삼킴" in title: # '삼킴' 추가
            incident_type_counts["질식"] = incident_type_counts.get("질식", 0) + 1
        elif "화상" in title: # '화상' 추가
            incident_type_counts["화상"] = incident_type_counts.get("화상", 0) + 1
    
    incident_type_data = [
        {"name": "낙상", "value": 35, "color": "#fca5a5", "count": incident_type_counts.get("낙상", 0)},
        {"name": "충돌/부딛힘", "value": 25, "color": "#fdba74", "count": incident_type_counts.get("충돌/부딛힘", 0)},
        {"name": "끼임", "value": 15, "color": "#fde047", "count": incident_type_counts.get("끼임", 0)},
        {"name": "전도(가구 넘어짐)", "value": 10, "color": "#86efac", "count": incident_type_counts.get("전도(가구 넘어짐)", 0)},
        {"name": "감전", "value": 10, "color": "#7dd3fc", "count": incident_type_counts.get("감전", 0)},
        {"name": "질식", "value": 5, "color": "#c4b5fd", "count": incident_type_counts.get("질식", 0)},
        {"name": "화상", "value": 5, "color": "#ff7043", "count": incident_type_counts.get("화상", 0)}, # 화상 색상 및 value 추가
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
    
    # 체크리스트 데이터 생성 (SafetyEvent 기반)
    checklist = []
    
    # 최근 안전 이벤트 조회 (최대 10개)
    recent_safety_events = (
        db.query(SafetyEvent)
        .join(AnalysisLog, SafetyEvent.analysis_log_id == AnalysisLog.id)
        .filter(
            AnalysisLog.user_id == user_id,
            AnalysisLog.created_at >= start_date
        )
        .order_by(SafetyEvent.event_timestamp.desc())
        .limit(10)
        .all()
    )

    for event in recent_safety_events:
        # 이미 해결된 이벤트는 체크리스트에서 제외
        if event.resolved:
            continue

        severity_val = event.severity.value if hasattr(event.severity, 'value') else str(event.severity)
        
        # 우선순위 매핑
        priority = "medium"
        if severity_val == "위험":
            priority = "high"
        elif severity_val == "권장":
            priority = "권장"
            
        # 아이콘 매핑 (제목 키워드 기반)
        icon = "Shield"
        title = event.title or ""
        if "전기" in title or "콘센트" in title or "감전" in title:
            icon = "Zap"
        elif "침대" in title or "낙상" in title:
            icon = "Bed"
        elif "장난감" in title or "물건" in title or "정리" in title:
            icon = "Blocks"
            
        # 그라디언트 매핑
        gradient = "from-primary-100/40 to-primary-50"
        if priority == "high":
            gradient = "from-danger-light/30 to-pink-50"
        elif priority == "권장":
            gradient = "from-blue-100/40 to-cyan-50"
            
        checklist.append({
            "id": event.id,
            "title": title,
            "icon": icon,
            "description": event.description or "안전 확인이 필요합니다.",
            "priority": priority,
            "gradient": gradient,
            "checked": event.resolved or False
        })
        
    # 체크리스트 정렬 (위험 > 주의 > 권장 순, 그 다음 최신순)
    def get_priority_score(item):
        if item['priority'] == 'high': return 3
        if item['priority'] == 'medium': return 2
        return 1

    checklist.sort(key=lambda x: (get_priority_score(x), x['title']), reverse=True)
    
    # 프론트엔드에서 완료 시 다음 항목을 보여주기 위해 넉넉하게 10개 반환
    checklist = checklist[:10]

    return {
        "trendData": trend_data,
        "incidentTypeData": incident_type_data,
        "clockData": clock_data,
        "safetySummary": latest_log.safety_summary if latest_log else "아직 분석된 데이터가 없습니다.",
        "safetyScore": avg_safety_score,  # 오늘 분석된 모든 영상의 평균 안전 점수
        "checklist": checklist,
        "insights": latest_log.safety_insights if latest_log and latest_log.safety_insights else [] # AI로부터 직접 받아옴
    }

@router.post("/events/{event_id}/resolve")
def resolve_safety_event(
    event_id: int,
    resolved: bool,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    # 해당 사용자의 이벤트인지 확인하는 로직이 필요하다면 여기에 추가 (현재는 생략)
    event = db.query(SafetyEvent).filter(SafetyEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Safety event not found")
    
    event.resolved = resolved
    db.commit()
    
    return {"message": "Event updated successfully", "resolved": resolved}

