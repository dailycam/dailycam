"""Dashboard API - 실제 분석 데이터 기반 대시보드"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List, Dict

from app.database import get_db
from app.models import VideoAnalysis, SafetyIncident, DevelopmentSkill, Child

router = APIRouter()


@router.post("/dashboard/summary")
async def get_dashboard_summary(
    child_id: int = 1,
    range_days: int = 7,
    db: Session = Depends(get_db)
) -> dict:
    """
    대시보드 요약 정보 조회 (실제 DB 데이터 기반)
    
    - **child_id**: 아이 ID (기본값: 1)
    - **range_days**: 조회 기간 (일) (기본값: 7)
    """
    # 기간 계산
    end_date = datetime.now()
    start_date = end_date - timedelta(days=range_days)
    
    # 전체 분석 데이터 조회
    analyses = db.query(VideoAnalysis)\
        .filter(VideoAnalysis.child_id == child_id)\
        .filter(VideoAnalysis.created_at >= start_date)\
        .order_by(VideoAnalysis.created_at.desc())\
        .all()
    
    if not analyses:
        # 데이터가 없으면 기본값 반환
        return {
            "summary": "분석 데이터가 없습니다. 비디오를 업로드하여 분석을 시작하세요.",
            "range_days": range_days,
            "safety_score": 0,
            "incident_count": 0,
            "monitoring_hours": 0,
            "activity_pattern": "데이터 없음",
            "weekly_trend": [],
            "risks": [],
            "recommendations": []
        }
    
    # 안전 점수 평균
    safety_scores = [a.safety_score for a in analyses if a.safety_score is not None]
    avg_safety_score = round(sum(safety_scores) / len(safety_scores)) if safety_scores else 0
    
    # 총 사고 수
    total_incidents = sum(len(a.safety_incidents) for a in analyses)
    
    # 총 모니터링 시간 (분 → 시간)
    total_minutes = sum(a.observation_duration_minutes or 0 for a in analyses)
    monitoring_hours = round(total_minutes / 60, 1)
    
    # 최근 7일 트렌드
    weekly_trend = []
    for i in range(range_days):
        day_date = end_date - timedelta(days=range_days - 1 - i)
        day_analyses = [a for a in analyses if a.created_at.date() == day_date.date()]
        
        if day_analyses:
            day_safety = round(sum(a.safety_score or 0 for a in day_analyses) / len(day_analyses))
            day_incidents = sum(len(a.safety_incidents) for a in day_analyses)
        else:
            day_safety = 0
            day_incidents = 0
        
        weekly_trend.append({
            "day": ["월", "화", "수", "목", "금", "토", "일"][day_date.weekday()],
            "score": day_safety,
            "incidents": day_incidents,
            "activity": day_safety,  # 임시로 safety와 동일
            "safety": day_safety
        })
    
    # 최근 분석의 위험 요소 추출
    latest_analysis = analyses[0]
    risks = []
    
    for incident in latest_analysis.safety_incidents[:3]:  # 상위 3개
        severity_level = "high" if incident.severity.value in ["사고발생", "위험"] else \
                        "medium" if incident.severity.value == "주의" else "low"
        
        risks.append({
            "level": severity_level,
            "title": incident.description[:50] if incident.description else "안전 이벤트",
            "time": incident.timestamp_start or "시간 미상",
            "count": 1
        })
    
    # 환경 위험 기반 권장사항
    recommendations = []
    
    for risk in latest_analysis.environment_risks[:3]:  # 상위 3개
        priority_level = "high" if risk.severity.value in ["사고발생", "위험"] else \
                        "medium" if risk.severity.value == "주의" else "low"
        
        recommendations.append({
            "priority": priority_level,
            "title": risk.risk_type or "안전 조치 필요",
            "description": risk.comment or risk.description or "안전 장치 설치를 권장합니다."
        })
    
    # AI 요약 생성
    summary = f"최근 {range_days}일간 {len(analyses)}건의 분석이 수행되었습니다. "
    summary += f"평균 안전 점수는 {avg_safety_score}점이며, "
    summary += f"총 {total_incidents}건의 안전 이벤트가 감지되었습니다. "
    
    if latest_analysis.development_summary:
        summary += latest_analysis.development_summary[:100] + "..."
    
    return {
        "summary": summary,
        "range_days": range_days,
        "safety_score": avg_safety_score,
        "incident_count": total_incidents,
        "monitoring_hours": monitoring_hours,
        "activity_pattern": latest_analysis.match_level.value if latest_analysis.match_level else "정상",
        "weekly_trend": weekly_trend,
        "risks": risks,
        "recommendations": recommendations
    }


@router.get("/analytics/all")
async def get_analytics_data(
    child_id: int = 1,
    db: Session = Depends(get_db)
) -> dict:
    """
    Analytics 페이지 데이터 조회 (실제 DB 데이터 기반)
    
    - **child_id**: 아이 ID (기본값: 1)
    """
    # 최근 7일 분석 데이터
    end_date = datetime.now()
    start_date = end_date - timedelta(days=7)
    
    analyses = db.query(VideoAnalysis)\
        .filter(VideoAnalysis.child_id == child_id)\
        .filter(VideoAnalysis.created_at >= start_date)\
        .order_by(VideoAnalysis.created_at)\
        .all()
    
    # Weekly Trend
    weekly_trend = []
    for i in range(7):
        day_date = start_date + timedelta(days=i)
        day_analyses = [a for a in analyses if a.created_at.date() == day_date.date()]
        
        if day_analyses:
            day_safety = round(sum(a.safety_score or 0 for a in day_analyses) / len(day_analyses))
            day_incidents = sum(len(a.safety_incidents) for a in day_analyses)
            activity = day_safety  # 임시
        else:
            day_safety = 0
            day_incidents = 0
            activity = 0
        
        weekly_trend.append({
            "date": day_date.strftime("%Y-%m-%d"),
            "safety": day_safety,
            "incidents": day_incidents,
            "activity": activity
        })
    
    # Incident Distribution (사고 유형별)
    incident_types = {}
    for analysis in analyses:
        for incident in analysis.safety_incidents:
            risk_type = incident.risk_type or "기타"
            incident_types[risk_type] = incident_types.get(risk_type, 0) + 1
    
    colors = {
        "낙상": "#ef4444",
        "충돌": "#f59e0b",
        "끼임": "#fb923c",
        "질식/삼킴": "#dc2626",
        "화상": "#ff6b6b",
        "기타": "#9ca3af"
    }
    
    incident_distribution = [
        {
            "name": risk_type,
            "value": count,
            "color": colors.get(risk_type, "#9ca3af")
        }
        for risk_type, count in incident_types.items()
    ]
    
    # Summary
    safety_scores = [a.safety_score for a in analyses if a.safety_score is not None]
    avg_safety = round(sum(safety_scores) / len(safety_scores)) if safety_scores else 0
    total_incidents = sum(len(a.safety_incidents) for a in analyses)
    
    return {
        "weekly_trend": weekly_trend,
        "incident_distribution": incident_distribution,
        "summary": {
            "avg_safety_score": avg_safety,
            "total_incidents": total_incidents,
            "safe_zone_percentage": 90.0,  # TODO: 실제 계산 필요
            "incident_reduction_percentage": 0.0,  # TODO: 이전 기간과 비교 필요
            "prev_avg_safety": 0,
            "prev_total_incidents": 0,
            "safety_change": 0,
            "safety_change_percent": 0,
            "incident_change": 0,
            "incident_change_percent": 0
        }
    }
