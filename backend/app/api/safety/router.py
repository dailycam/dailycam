"""Safety Report API Router"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List, Dict, Any

from app.database import get_db
from app.utils.auth_utils import get_current_user_id
from app.models.analysis import AnalysisLog, SafetyEvent
from app.models.live_monitoring.models import SegmentAnalysis, HourlyReport

router = APIRouter()


@router.get("/summary")
def get_safety_report_summary(
    target_date: str = Query(None, description="조회할 날짜 (YYYY-MM-DD), 기본값은 오늘"),
    period_type: str = Query("week", description="기간 타입 (week, month) - 트렌드 차트용"),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
) -> Dict[str, Any]:
    """
    안전 리포트용 요약 데이터 조회
    
    특정 날짜의 하루치 데이터를 조회합니다. (최근 7일 이내)
    period_type은 트렌드 차트의 기간을 결정합니다.
    """
    import time
    start_time = time.time()
    
    # 조회할 날짜 설정 (기본값: 오늘)
    if target_date:
        try:
            query_date = datetime.strptime(target_date, "%Y-%m-%d")
        except ValueError:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    else:
        query_date = datetime.now()
    
    # 최근 7일 이내인지 확인
    days_ago = (datetime.now() - query_date).days
    if days_ago < 0 or days_ago > 6:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Only data from the last 7 days can be queried")
    # 기간 설정
    if period_type == "week":
        days = 7
    else:  # month
        days = 30
    
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    # 기간 내 분석 로그들 (관련 이벤트를 함께 로드하여 N+1 쿼리 방지)
    logs = (
        db.query(AnalysisLog)
        .options(selectinload(AnalysisLog.safety_events))  # SafetyEvent를 미리 로드
        .filter(
            AnalysisLog.user_id == user_id,
            AnalysisLog.created_at >= start_date
        )
        .order_by(AnalysisLog.created_at.desc())
        .all()
    )
    
    # 주간/월간 안전도 추이 데이터
    # 👉 화면 상단 "오늘의 종합 안전 점수"와 일관성을 유지하기 위해
    #    모두 SegmentAnalysis.safety_score 기준으로 계산한다.
    #    Fallback: 데이터가 없으면 AnalysisLog(사용자 기준)를 사용한다.
    trend_data: List[Dict[str, Any]] = []

    # 현재 구현에서는 camera_id를 고정값으로 사용
    # TODO: 추후 사용자별 카메라 매핑으로 확장
    trend_camera_id = "camera-1"
    
    if period_type == "week":
        # 주간: 오늘을 기준으로 지난 7일 (6일 전 ~ 오늘)
        today = datetime.now()
        day_names_ko = ["월", "화", "수", "목", "금", "토", "일"]
        
        for i in range(6, -1, -1):  # 6일 전부터 오늘까지 (오름차순)
            day_to_query = today - timedelta(days=i)
            day_start = day_to_query.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)

            # 1. SegmentAnalysis 조회 (카메라 기준)
            day_segments = (
                db.query(func.avg(SegmentAnalysis.safety_score).label("avg_safety"))
                .filter(
                    SegmentAnalysis.camera_id == trend_camera_id,
                    SegmentAnalysis.segment_start >= day_start,
                    SegmentAnalysis.segment_start < day_end,
                    SegmentAnalysis.status == "completed",
                )
                .first()
            )

            day_avg = int(day_segments.avg_safety or 0) if day_segments and day_segments.avg_safety else 0
            
            # 2. Fallback: AnalysisLog 조회 (사용자 기준)
            if day_avg == 0:
                user_logs_avg = (
                    db.query(func.avg(AnalysisLog.safety_score).label("avg_safety"))
                    .filter(
                        AnalysisLog.user_id == user_id,
                        AnalysisLog.created_at >= day_start,
                        AnalysisLog.created_at < day_end
                    )
                    .first()
                )
                if user_logs_avg and user_logs_avg.avg_safety:
                    day_avg = int(user_logs_avg.avg_safety)

            day_label = day_names_ko[day_to_query.weekday()]
            
            trend_data.append({
                "date": day_label,
                "안전도": day_avg,
            })
    else:  # month
        # 월간: 오늘을 기준으로 지난 4주간의 "주간 평균 안전 점수"
        today = datetime.now()
        
        for i in range(3, -1, -1):  # 3주 전부터 이번 주까지 (오름차순)
            # 각 주의 끝나는 날짜 (이번 주, 1주 전, 2주 전, 3주 전)
            end_of_week = today - timedelta(weeks=i)
            # 각 주의 시작 날짜 (끝나는 날짜로부터 6일 전)
            start_of_week = end_of_week - timedelta(days=6)

            week_start_query = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
            week_end_query = end_of_week.replace(hour=23, minute=59, second=59, microsecond=999999)

            # 1. SegmentAnalysis 조회
            week_stats = (
                db.query(func.avg(SegmentAnalysis.safety_score).label("avg_safety"))
                .filter(
                    SegmentAnalysis.camera_id == trend_camera_id,
                    SegmentAnalysis.segment_start >= week_start_query,
                    SegmentAnalysis.segment_start <= week_end_query,
                    SegmentAnalysis.status == "completed",
                )
                .first()
            )
            
            week_avg = int(week_stats.avg_safety or 0) if week_stats and week_stats.avg_safety else 0

            # 2. Fallback: AnalysisLog 조회
            if week_avg == 0:
                 user_logs_avg = (
                    db.query(func.avg(AnalysisLog.safety_score).label("avg_safety"))
                    .filter(
                        AnalysisLog.user_id == user_id,
                        AnalysisLog.created_at >= week_start_query,
                        AnalysisLog.created_at <= week_end_query
                    )
                    .first()
                )
                 if user_logs_avg and user_logs_avg.avg_safety:
                    week_avg = int(user_logs_avg.avg_safety)

            if i == 0:
                week_label = "이번 주"
            elif i == 1:
                week_label = "지난주"
            else:
                week_label = f"{i}주 전"

            trend_data.append({
                "date": week_label,
                "안전도": week_avg,
            })
    
    # 선택한 날짜의 하루치 데이터 조회 기준
    today_start = query_date.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = query_date.replace(hour=23, minute=59, second=59, microsecond=999999)
    
    # 안전사고 유형별 통계 (선택한 날짜 기준)
    all_safety_events = (
        db.query(SafetyEvent)
        .join(AnalysisLog, SafetyEvent.analysis_log_id == AnalysisLog.id)
        .filter(
            AnalysisLog.user_id == user_id,
            AnalysisLog.created_at >= today_start,
            AnalysisLog.created_at <= today_end
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
    
    # 24시간 시계 데이터 (선택한 날짜 기준)
    
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
    # AnalysisLog와 SegmentAnalysis 모두에서 수집
    camera_id = "camera-1"  # 추후 사용자별 카메라 매핑으로 변경
    today_segments = (
        db.query(SegmentAnalysis)
        .filter(
            SegmentAnalysis.camera_id == camera_id,
            SegmentAnalysis.segment_start >= today_start,
            SegmentAnalysis.segment_start <= today_end,
            SegmentAnalysis.status == 'completed'
        )
        .all()
    )
    
    # AnalysisLog와 SegmentAnalysis 중복 합산 방지 (SegmentAnalysis 기준)
    # today_safety_scores = [log.safety_score for log in today_logs if log.safety_score is not None]
    today_safety_scores = [s.safety_score for s in today_segments if s.safety_score is not None]
    
    # Fallback: SegmentAnalysis 데이터가 없으면 AnalysisLog 데이터 사용
    if not today_safety_scores and today_logs:
        today_safety_scores = [log.safety_score for log in today_logs if log.safety_score is not None]

    avg_safety_score = int(sum(today_safety_scores) / len(today_safety_scores)) if today_safety_scores else 0
    
    # 체크리스트 데이터 생성 (SafetyEvent 기반)
    # 날짜 무관하게 전체 미해결 이슈를 조회 (항상 최신 상태 유지)
    checklist = []
    
    # 전체 기간의 미해결 안전 이벤트 조회 (위험도 높은 순으로 10개)
    recent_safety_events = (
        db.query(SafetyEvent)
        .join(AnalysisLog, SafetyEvent.analysis_log_id == AnalysisLog.id)
        .filter(
            AnalysisLog.user_id == user_id,
            # 날짜 필터 제거 - 전체 기간의 미해결 이슈 표시
            (SafetyEvent.resolved == False) | (SafetyEvent.resolved == None)  # 미해결 건만 조회
        )
        .order_by(SafetyEvent.event_timestamp.desc())
        .limit(50)  # 중복 제거 전 충분히 조회
        .all()
    )

    seen_titles = set()
    for event in recent_safety_events:
        # DB에서 이미 필터링했으므로 여기서는 체크 불필요
        
        title = event.title or ""
        
        # 중복 제거: 이미 추가된 제목이면 건너뜀
        if title in seen_titles:
            continue
        seen_titles.add(title)
        
        severity_val = event.severity.value if hasattr(event.severity, 'value') else str(event.severity)
        
        # 우선순위 매핑
        priority = "medium"
        if severity_val == "위험":
            priority = "high"
        elif severity_val == "권장":
            priority = "권장"
            
        # 아이콘 매핑 (제목 키워드 기반)
        icon = "Shield"
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

    # 선택한 날짜의 분석 로그들 조회 (요약용)
    selected_date_logs = (
        db.query(AnalysisLog)
        .filter(
            AnalysisLog.user_id == user_id,
            AnalysisLog.created_at >= today_start,
            AnalysisLog.created_at <= today_end
        )
        .order_by(AnalysisLog.created_at.desc())
        .all()
    )
    
    latest_log = selected_date_logs[0] if selected_date_logs else None
    
    # 텍스트 데이터는 HourlyReport에서 가져오기 (선택한 날짜의 최신 리포트)
    # 선택한 날짜의 HourlyReport 조회
    latest_hourly_report = (
        db.query(HourlyReport)
        .filter(
            HourlyReport.camera_id == camera_id,
            HourlyReport.hour_start >= today_start,
            HourlyReport.hour_start <= today_end
        )
        .order_by(HourlyReport.hour_start.desc())
        .first()
    )
    
    # 안전 요약 (선택한 날짜의 HourlyReport 또는 AnalysisLog에서 가져오기)
    if latest_hourly_report and latest_hourly_report.safety_summary:
        safety_summary = latest_hourly_report.safety_summary
    elif latest_log and latest_log.safety_summary:
        safety_summary = latest_log.safety_summary
    else:
        safety_summary = "아직 분석된 데이터가 없습니다."
    
    # 안전 인사이트 (선택한 날짜의 HourlyReport 또는 AnalysisLog에서 가져오기)
    if latest_hourly_report and latest_hourly_report.safety_insights:
        safety_insights = latest_hourly_report.safety_insights
    elif latest_log and latest_log.safety_insights:
        safety_insights = latest_log.safety_insights
    else:
        safety_insights = []
    
    # 인사이트는 프롬프트에서 50자 이내로 생성되도록 지시됨 (백엔드 제한 제거)
    
    elapsed_time = time.time() - start_time
    
    return {
        "trendData": trend_data,  # 실시간
        "incidentTypeData": incident_type_data,  # 실시간
        "clockData": clock_data,  # 실시간
        "safetySummary": safety_summary,  # HourlyReport에서 가져온 종합 요약
        "safetyScore": avg_safety_score,  # 오늘 분석된 모든 영상의 평균 안전 점수 (실시간)
        "checklist": checklist,  # 실시간 (SafetyEvent 기반)
        "insights": safety_insights  # HourlyReport에서 가져온 종합 인사이트
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

