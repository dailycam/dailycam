"""API routes for analytics features."""

from datetime import date, timedelta
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.analytics.models import DailyStat, Incident, AnalyticsSummary

router = APIRouter()


@router.get("/weekly-trend")
async def get_weekly_trend(db: Session = Depends(get_db)):
    """주간 트렌드 데이터 조회"""
    end_date = date.today()
    start_date = end_date - timedelta(days=7)
    
    stats = db.query(DailyStat).filter(
        DailyStat.date.between(start_date, end_date)
    ).order_by(DailyStat.date).all()
    
    return {
        "weekly_trend": [
            {
                "date": stat.date.strftime("%m/%d"),
                "safety": stat.safety_score,
                "incidents": stat.incident_count,
                "activity": stat.activity_level
            }
            for stat in stats
        ]
    }


@router.get("/incident-distribution")
async def get_incident_distribution(db: Session = Depends(get_db)):
    """위험 유형별 분포 조회"""
    end_date = date.today()
    start_date = end_date - timedelta(days=7)
    
    results = db.query(
        Incident.incident_type,
        func.count(Incident.id).label('count')
    ).filter(
        Incident.occurred_date.between(start_date, end_date)
    ).group_by(Incident.incident_type).all()
    
    color_map = {
        '데드존 접근': '#ef4444',
        '낙상 위험': '#f59e0b',
        '넘어짐': '#fb923c',
        '부딪힘': '#f97316',
        '질식 위험': '#9ca3af'
    }
    
    return {
        "incident_distribution": [
            {
                "name": row.incident_type,
                "value": row.count,
                "color": color_map.get(row.incident_type, '#6b7280')
            }
            for row in results
        ]
    }


@router.get("/summary")
async def get_analytics_summary(db: Session = Depends(get_db)):
    """통계 요약 조회"""
    summary = db.query(AnalyticsSummary).filter(
        AnalyticsSummary.period == 'week'
    ).first()
    
    if not summary:
        return {
            "avg_safety_score": 0,
            "total_incidents": 0,
            "safe_zone_percentage": 0,
            "incident_reduction_percentage": 0
        }
    
    return {
        "avg_safety_score": float(summary.avg_safety_score),
        "total_incidents": summary.total_incidents,
        "safe_zone_percentage": float(summary.safe_zone_percentage),
        "incident_reduction_percentage": float(summary.incident_reduction_percentage)
    }


@router.get("/all")
async def get_all_analytics(db: Session = Depends(get_db)):
    """모든 Analytics 데이터 한번에 조회 (비교 데이터 포함)"""
    end_date = date.today()
    start_date = end_date - timedelta(days=7)
    
    # 이전 주 날짜 범위
    prev_end_date = start_date - timedelta(days=1)
    prev_start_date = prev_end_date - timedelta(days=7)
    
    # 1. 현재 주 트렌드
    stats = db.query(DailyStat).filter(
        DailyStat.date.between(start_date, end_date)
    ).order_by(DailyStat.date).all()
    
    weekly_trend = [
        {
            "date": stat.date.strftime("%m/%d"),
            "safety": stat.safety_score,
            "incidents": stat.incident_count,
            "activity": stat.activity_level
        }
        for stat in stats
    ]
    
    # 2. 위험 유형별 분포
    incident_results = db.query(
        Incident.incident_type,
        func.count(Incident.id).label('count')
    ).filter(
        Incident.occurred_date.between(start_date, end_date)
    ).group_by(Incident.incident_type).all()
    
    color_map = {
        '데드존 접근': '#ef4444',
        '낙상 위험': '#f59e0b',
        '넘어짐': '#fb923c',
        '부딪힘': '#f97316',
        '질식 위험': '#9ca3af'
    }
    
    incident_distribution = [
        {
            "name": row.incident_type,
            "value": row.count,
            "color": color_map.get(row.incident_type, '#6b7280')
        }
        for row in incident_results
    ]
    
    # 3. 현재 주 통계 계산
    current_avg_safety = sum(s.safety_score for s in stats) / len(stats) if stats else 0
    current_total_incidents = sum(s.incident_count for s in stats) if stats else 0
    
    # 4. 이전 주 통계 계산
    prev_stats = db.query(DailyStat).filter(
        DailyStat.date.between(prev_start_date, prev_end_date)
    ).all()
    
    prev_avg_safety = sum(s.safety_score for s in prev_stats) / len(prev_stats) if prev_stats else 0
    prev_total_incidents = sum(s.incident_count for s in prev_stats) if prev_stats else 0
    
    # 5. 변화율 계산
    safety_change = current_avg_safety - prev_avg_safety
    safety_change_percent = (safety_change / prev_avg_safety * 100) if prev_avg_safety > 0 else 0
    
    incident_change = current_total_incidents - prev_total_incidents
    incident_change_percent = (incident_change / prev_total_incidents * 100) if prev_total_incidents > 0 else 0
    
    # 6. 세이프존 비율 (통계 요약에서)
    summary = db.query(AnalyticsSummary).filter(
        AnalyticsSummary.period == 'week'
    ).first()
    
    safe_zone_percentage = float(summary.safe_zone_percentage) if summary else 91.0
    
    summary_data = {
        "avg_safety_score": current_avg_safety,
        "total_incidents": int(current_total_incidents),
        "safe_zone_percentage": safe_zone_percentage,
        "incident_reduction_percentage": abs(incident_change_percent),
        
        # 비교 데이터
        "prev_avg_safety": prev_avg_safety,
        "prev_total_incidents": int(prev_total_incidents),
        "safety_change": safety_change,
        "safety_change_percent": safety_change_percent,
        "incident_change": incident_change,
        "incident_change_percent": incident_change_percent
    }
    
    return {
        "weekly_trend": weekly_trend,
        "incident_distribution": incident_distribution,
        "summary": summary_data
    }
