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
from app.models.live_monitoring.models import SegmentAnalysis, HourlyReport
from datetime import datetime, timedelta

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
    
    # AnalysisLog와 SegmentAnalysis 모두 조회 (실시간 수치 데이터)
    today_logs = (
        db.query(AnalysisLog)
        .filter(
            AnalysisLog.user_id == user_id,
            AnalysisLog.created_at >= today_start,
            AnalysisLog.created_at <= today_end
        )
        .all()
    )
    
    # SegmentAnalysis도 조회 (10분 단위 분석 결과)
    # TODO: user_id와 camera_id 매핑 필요 (현재는 camera-1 고정)
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
    
    print(f"[Dashboard] 오늘 분석된 로그 개수: {len(today_logs)}")
    print(f"[Dashboard] 오늘 분석된 세그먼트 개수: {len(today_segments)}")
    
    # 2-1. 오늘 분석된 데이터의 평균 안전 점수 및 발달 점수
    # AnalysisLog와 SegmentAnalysis 모두에서 수집
    today_safety_scores = [log.safety_score for log in today_logs if log.safety_score is not None]
    today_safety_scores.extend([s.safety_score for s in today_segments if s.safety_score is not None])
    
    today_dev_scores = [log.development_score for log in today_logs if log.development_score is not None]
    # SegmentAnalysis에는 development_score가 없으므로 AnalysisLog만 사용
    
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
    # AnalysisLog 기반 이벤트
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
    
    # SegmentAnalysis 기반 이벤트도 추가
    segment_incident_count = sum(s.incident_count or 0 for s in today_segments)
    incident_count += segment_incident_count
    
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

    
    # 8. 타임라인 이벤트 (AnalysisLog + SegmentAnalysis 모두 포함)
    
    timeline_events: List[Dict[str, Any]] = []
    
    # AnalysisLog의 이벤트들을 타임라인에 추가
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
                "timestamp_range": event.timestamp_range,
                "safety_score": log.safety_score  # 해당 시간대의 실제 안전 점수
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
                "isSleep": event.is_sleep,
                "development_score": log.development_score  # 해당 시간대의 실제 발달 점수
            })
    
    # SegmentAnalysis의 발달 이벤트도 타임라인에 추가
    for segment in today_segments:
        segment_hour = segment.segment_start.hour
        time_str = segment.segment_start.strftime("%H:%M")
        
        # SegmentAnalysis의 analysis_result에서 발달 데이터 추출
        analysis_result = segment.analysis_result
        if analysis_result:
            development_analysis = analysis_result.get('development_analysis', {})
            skills = development_analysis.get('skills', [])
            
            # 각 skill을 발달 이벤트로 추가
            for skill in skills:
                if not skill.get('present', False):
                    continue
                
                category_str = skill.get('category', '')
                # category 매핑
                category_map = {
                    "대근육운동": "대근육운동 발달",
                    "소근육운동": "소근육운동 발달",
                    "언어": "언어 발달",
                    "인지": "인지 발달",
                    "사회정서": "사회성 발달"
                }
                category = category_map.get(category_str, "발달")
                
                timeline_events.append({
                    "time": time_str,
                    "hour": segment_hour,
                    "type": "development",
                    "title": skill.get('name', '발달 행동'),
                    "description": f"{skill.get('level', '')} 수준, 빈도: {skill.get('frequency', 0)}회",
                    "hasClip": False,
                    "category": category,
                    "isSleep": False,
                    "development_score": None  # SegmentAnalysis에는 development_score가 없음
                })
    
    # 시간순으로 정렬 (최신순)
    timeline_events.sort(key=lambda x: x["hour"], reverse=True)
    
    # 9. 시간대별 통계 (hourly_stats) 생성
    hourly_stats: List[Dict[str, Any]] = []
    
    # 0-23시 각각의 통계 초기화 (데이터 없는 시간은 0/0)
    hourly_data = {i: {
        "hour": i, 
        "safetyScore": 0, 
        "developmentScore": 0, 
        "eventCount": 0,
        "analysisCount": 0  # 분석 횟수 추가
    } for i in range(24)}
    
    # AnalysisLog를 시간대별로 집계
    for log in today_logs:
        hour = log.created_at.hour
        
        # 해당 시간대에 이벤트가 있으면 점수 업데이트
        if log.safety_score is not None:
            # 여러 영상이 같은 시간대에 있을 경우 평균 사용
            if hourly_data[hour]["analysisCount"] == 0:
                hourly_data[hour]["safetyScore"] = log.safety_score
                hourly_data[hour]["developmentScore"] = log.development_score or 0
            else:
                # 평균 계산
                count = hourly_data[hour]["analysisCount"]
                hourly_data[hour]["safetyScore"] = int((hourly_data[hour]["safetyScore"] * count + log.safety_score) / (count + 1))
                hourly_data[hour]["developmentScore"] = int((hourly_data[hour]["developmentScore"] * count + (log.development_score or 0)) / (count + 1))
        
        hourly_data[hour]["analysisCount"] += 1
        hourly_data[hour]["eventCount"] += 1
    
    # SegmentAnalysis도 시간대별로 집계 (실시간 VLM 분석 결과)
    for segment in today_segments:
        hour = segment.segment_start.hour
        
        # 해당 시간대에 세그먼트가 있으면 점수 업데이트
        if segment.safety_score is not None:
            if hourly_data[hour]["analysisCount"] == 0:
                hourly_data[hour]["safetyScore"] = segment.safety_score
            else:
                # 평균 계산
                count = hourly_data[hour]["analysisCount"]
                hourly_data[hour]["safetyScore"] = int((hourly_data[hour]["safetyScore"] * count + segment.safety_score) / (count + 1))
        
        hourly_data[hour]["analysisCount"] += 1
        # SegmentAnalysis의 incident_count도 이벤트로 카운트
        if segment.incident_count:
            hourly_data[hour]["eventCount"] += segment.incident_count
    
    # 리스트로 변환
    hourly_stats = list(hourly_data.values())
    
    
    # 텍스트 데이터는 HourlyReport에서 가져오기 (최신 1시간 리포트)
    # 현재 시간 기준 가장 최근 완료된 1시간 리포트 조회
    now = datetime.now()
    current_hour_start = now.replace(minute=0, second=0, microsecond=0)
    previous_hour_start = current_hour_start - timedelta(hours=1)
    
    # 최신 HourlyReport 조회 (현재 시간 이전의 가장 최근 리포트)
    latest_hourly_report = (
        db.query(HourlyReport)
        .filter(
            HourlyReport.hour_start < current_hour_start
        )
        .order_by(HourlyReport.hour_start.desc())
        .first()
    )
    
    # 텍스트 요약 (HourlyReport에서 가져오거나, 없으면 기본값)
    summary_text = "아직 분석된 데이터가 없습니다."
    if latest_hourly_report and latest_hourly_report.safety_summary:
        summary_text = latest_hourly_report.safety_summary
    elif latest_log and latest_log.safety_summary:
        summary_text = latest_log.safety_summary
    
    # 기본 응답 구조 (프론트엔드 DashboardData 인터페이스와 일치)
    return {
        "summary": summary_text,  # HourlyReport에서 가져온 종합 요약
        "rangeDays": range_days,
        "safetyScore": avg_safety_score,  # 오늘 분석된 모든 영상의 평균 안전 점수 (실시간)
        "developmentScore": avg_dev_score,  # 오늘 분석된 모든 영상의 평균 발달 점수 (실시간)
        "incidentCount": incident_count,  # 오늘 분석된 모든 영상의 이벤트 카운트 (실시간)
        "monitoringHours": float(len(today_logs) + len(today_segments)) * 0.1,  # 분석된 영상 개수 * 10분 (실시간)
        "totalAnalysisCount": len(today_logs) + len(today_segments),  # 총 분석 횟수 (실시간)
        "activityPattern": latest_log.main_activity if latest_log and latest_log.main_activity else "데이터 없음",
        "weeklyTrend": weekly_trend,
        "risks": risks,
        "recommendations": recommendations,
        "timelineEvents": timeline_events,  # 오늘 분석된 모든 이벤트 (실시간)
        "hourly_stats": hourly_stats  # 시간대별 통계 추가 (실시간)
    }

