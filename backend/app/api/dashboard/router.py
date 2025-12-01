"""Dashboard API Router"""

from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

from app.database import get_db
from app.utils.auth_utils import get_current_user_id
from app.models.analysis import AnalysisLog, SafetyEvent, DevelopmentEvent

router = APIRouter()


class DashboardSummaryRequest(BaseModel):
    range_days: int = 7


@router.post("/summary")
def get_dashboard_summary(
    request: DashboardSummaryRequest = Body(...),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
) -> Dict[str, Any]:
    """
    대시보드용 요약 데이터 조회
    
    오늘(00:00~23:59) 분석된 모든 영상의 데이터를 집계하여 반환합니다.
    """
    # 1. 날짜 범위 설정
    range_days = request.range_days
    end_date = datetime.now()
    start_date = end_date - timedelta(days=range_days)
    
    # 2. 오늘 날짜의 모든 분석 로그 조회 (일일 집계)
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = datetime.now().replace(hour=23, minute=59, second=59, microsecond=999999)
    
    print(f"[Dashboard] 오늘 날짜 범위: {today_start} ~ {today_end}")
    print(f"[Dashboard] User ID: {user_id}")
    
    today_logs = (
        db.query(AnalysisLog)
        .filter(
            AnalysisLog.user_id == user_id,
            AnalysisLog.created_at >= today_start,
            AnalysisLog.created_at <= today_end
        )
        .all()
    )
    
    print(f"[Dashboard] 오늘 분석된 로그 개수: {len(today_logs)}")
    for log in today_logs:
        print(f"  - Log ID: {log.id}, Created: {log.created_at}, Safety: {log.safety_score}")
    
    # 2-1. 오늘 분석된 데이터의 평균 안전 점수 및 발달 점수
    today_safety_scores = [log.safety_score for log in today_logs if log.safety_score is not None]
    today_dev_scores = [log.development_score for log in today_logs if log.development_score is not None]
    
    print(f"[Dashboard] 안전 점수들: {today_safety_scores}")
    
    avg_safety_score = int(sum(today_safety_scores) / len(today_safety_scores)) if today_safety_scores else 0
    print(f"[Dashboard] 평균 안전 점수: {avg_safety_score}")
    avg_dev_score = int(sum(today_dev_scores) / len(today_dev_scores)) if today_dev_scores else 0
    
    # 2-2. 최신 로그 (요약 텍스트용)
    latest_log = today_logs[0] if today_logs else None
    
    # 3. 기간 내 안전 점수 평균 및 이벤트 수
    stats = (
        db.query(
            func.avg(AnalysisLog.safety_score).label("avg_safety"),
            func.count(AnalysisLog.id).label("total_logs")
        )
        .filter(
            AnalysisLog.user_id == user_id,
            AnalysisLog.created_at >= start_date
        )
        .first()
    )
    
    # 4. 오늘 날짜의 위험 이벤트 카운트 (일일 집계)
    incident_count = (
        db.query(SafetyEvent)
        .join(AnalysisLog, SafetyEvent.analysis_log_id == AnalysisLog.id)
        .filter(
            AnalysisLog.user_id == user_id,
            AnalysisLog.created_at >= today_start,
            AnalysisLog.created_at <= today_end,
            SafetyEvent.severity.in_(["위험", "주의"])
        )
        .count()
    )
    
    # 5. 주간 트렌드 (최근 7일) - 날짜별 그룹화
    weekly_trend: List[Dict[str, Any]] = []
    for i in range(7):
        day_start = start_date + timedelta(days=i)
        day_end = day_start + timedelta(days=1)
        
        day_stats = (
            db.query(
                func.avg(AnalysisLog.safety_score).label("avg_safety"),
                func.count(AnalysisLog.id).label("total_logs")
            )
            .filter(
                AnalysisLog.user_id == user_id,
                AnalysisLog.created_at >= day_start,
                AnalysisLog.created_at < day_end
            )
            .first()
        )
        
        day_incidents = (
            db.query(SafetyEvent)
            .join(AnalysisLog, SafetyEvent.analysis_log_id == AnalysisLog.id)
            .filter(
                AnalysisLog.user_id == user_id,
                AnalysisLog.created_at >= day_start,
                AnalysisLog.created_at < day_end,
                SafetyEvent.severity.in_(["위험", "주의"])
            )
            .count()
        )
        
        weekly_trend.append({
            "day": day_start.strftime("%a"),  # 월, 화, 수...
            "score": int(day_stats.avg_safety or 0) if day_stats.avg_safety else 0,
            "incidents": day_incidents,
            "activity": 0,  # 추후 추가 가능
            "safety": int(day_stats.avg_safety or 0) if day_stats.avg_safety else 0,
        })
    
    # 6. 최근 위험 감지 목록
    recent_risks = (
        db.query(SafetyEvent)
        .join(AnalysisLog, SafetyEvent.analysis_log_id == AnalysisLog.id)
        .filter(AnalysisLog.user_id == user_id)
        .order_by(AnalysisLog.created_at.desc())
        .limit(5)
        .all()
    )
    
    risks: List[Dict[str, Any]] = []
    for event in recent_risks:
        # severity를 level로 매핑
        level_map = {
            "위험": "high",
            "주의": "medium",
            "권장": "low"
        }
        level = level_map.get(event.severity.value if hasattr(event.severity, 'value') else str(event.severity), "medium")
        
        risks.append({
            "level": level,
            "title": event.title or "위험 감지",
            "time": event.timestamp_range or "시간 정보 없음",
            "count": 1
        })
    
    # 7. 추천 사항
    recommendations: List[Dict[str, Any]] = []
    if latest_log and latest_log.recommendations:
        if isinstance(latest_log.recommendations, list):
            for rec in latest_log.recommendations:
                if isinstance(rec, dict):
                    recommendations.append({
                        "priority": "medium",
                        "title": rec.get("title", "추천 활동"),
                        "description": rec.get("benefit", "") or f"{rec.get('title', '')} 활동을 권장합니다."
                    })
    
    # 기본 추천사항이 없으면 기본값 추가
    if not recommendations:
        recommendations.append({
            "priority": "high",
            "title": "분석을 시작해보세요",
            "description": "영상을 업로드하면 AI가 분석합니다."
        })

    
    # 8. 타임라인 이벤트 (이미 위에서 정의된 today_start, today_end, today_logs 사용)
    
    timeline_events: List[Dict[str, Any]] = []
    
    # 각 분석 로그의 이벤트들을 타임라인에 추가
    for log in today_logs:
        # SafetyEvent 추가
        safety_events = (
            db.query(SafetyEvent)
            .filter(SafetyEvent.analysis_log_id == log.id)
            .all()
        )
        
        for event in safety_events:
            # 발달 이벤트와 동일하게 처리: log.created_at 사용
            time_str = log.created_at.strftime("%H:%M")
            hour = log.created_at.hour
            
            # severity를 severity level로 매핑
            severity_map = {
                "위험": "danger",
                "주의": "warning",
                "권장": "info"
            }
            severity = severity_map.get(event.severity.value if hasattr(event.severity, 'value') else str(event.severity), "info")
            
            timeline_events.append({
                "time": time_str or log.created_at.strftime("%H:%M"),
                "hour": hour,
                "type": "safety",
                "severity": severity,
                "title": event.title or "안전 이벤트",
                "description": event.description or "",
                "resolved": event.resolved,
                "hasClip": False,  # 추후 HighlightClip과 연결 가능
                "category": event.location or "안전",
                "timestamp_range": event.timestamp_range
            })
        
        # DevelopmentEvent 추가
        development_events = (
            db.query(DevelopmentEvent)
            .filter(DevelopmentEvent.analysis_log_id == log.id)
            .all()
        )
        
        for event in development_events:
            # created_at에서 시간 추출
            time_str = log.created_at.strftime("%H:%M")
            hour = log.created_at.hour
            
            # category를 한글로 매핑
            category_map = {
                "운동": "운동 발달",
                "언어": "언어 발달",
                "인지": "인지 발달",
                "사회성": "사회성 발달"
            }
            category = category_map.get(event.category.value if hasattr(event.category, 'value') else str(event.category), "발달")
            
            timeline_events.append({
                "time": time_str,
                "hour": hour,
                "type": "development",
                "title": event.title or "발달 이벤트",
                "description": event.description or "",
                "hasClip": False,
                "category": category,
                "isSleep": event.is_sleep
            })
    
    # 시간순으로 정렬 (최신순)
    timeline_events.sort(key=lambda x: x["hour"], reverse=True)
    
    
    # 기본 응답 구조 (프론트엔드 DashboardData 인터페이스와 일치)
    return {
        "summary": latest_log.safety_summary if latest_log and latest_log.safety_summary else "아직 분석된 데이터가 없습니다.",
        "rangeDays": range_days,
        "safetyScore": avg_safety_score,  # 오늘 분석된 모든 영상의 평균 안전 점수
        "developmentScore": avg_dev_score,  # 오늘 분석된 모든 영상의 평균 발달 점수
        "incidentCount": incident_count,  # 오늘 분석된 모든 영상의 이벤트 카운트
        "monitoringHours": float(len(today_logs)) * 0.1,  # 분석된 영상 개수 * 10분
        "activityPattern": latest_log.main_activity if latest_log and latest_log.main_activity else "데이터 없음",
        "weeklyTrend": weekly_trend,
        "risks": risks,
        "recommendations": recommendations,
        "timelineEvents": timeline_events  # 오늘 분석된 모든 이벤트
    }

