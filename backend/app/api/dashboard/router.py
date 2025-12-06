"""Dashboard API Router"""

from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import pytz

from app.database import get_db
from app.utils.auth_utils import get_current_user_id
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
    
    # SegmentAnalysis만 조회 (실시간 수치 데이터)
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
    
    print(f"[Dashboard] 오늘 분석된 세그먼트 개수: {len(today_segments)}")
    
    # 2-1. 오늘 분석된 데이터의 평균 안전 점수 및 발달 점수
    # SegmentAnalysis에서만 수집
    today_safety_scores = [s.safety_score for s in today_segments if s.safety_score is not None]
    today_dev_scores = [s.development_score for s in today_segments if s.development_score is not None]
    
    print(f"[Dashboard] 안전 점수들: {today_safety_scores}")
    print(f"[Dashboard] 발달 점수들: {today_dev_scores}")
    
    avg_safety_score = int(sum(today_safety_scores) / len(today_safety_scores)) if today_safety_scores else 0
    print(f"[Dashboard] 평균 안전 점수: {avg_safety_score}")
    avg_dev_score = int(sum(today_dev_scores) / len(today_dev_scores)) if today_dev_scores else 0
    print(f"[Dashboard] 평균 발달 점수: {avg_dev_score}")
    
    # 2-2. 최신 세그먼트 (요약 텍스트용)
    latest_segment = today_segments[0] if today_segments else None
    
    # 3. 기간 내 안전 점수 평균 및 이벤트 수 (SegmentAnalysis 기반)
    stats = (
        db.query(
            func.avg(SegmentAnalysis.safety_score).label("avg_safety"),
            func.count(SegmentAnalysis.id).label("total_logs")
        )
        .filter(
            SegmentAnalysis.camera_id == camera_id,
            SegmentAnalysis.segment_start >= start_date,
            SegmentAnalysis.status == 'completed'
        )
        .first()
    )
    
    # 4. 오늘 날짜의 위험 이벤트 카운트 (일일 집계)
    # SegmentAnalysis 기반 이벤트만 사용
    incident_count = sum(s.incident_count or 0 for s in today_segments)
    
    # 5. 주간 트렌드 (최근 7일) - 날짜별 그룹화 (SegmentAnalysis 기반)
    weekly_trend: List[Dict[str, Any]] = []
    for i in range(7):
        day_start = start_date + timedelta(days=i)
        day_end = day_start + timedelta(days=1)
        
        day_stats = (
            db.query(
                func.avg(SegmentAnalysis.safety_score).label("avg_safety"),
                func.count(SegmentAnalysis.id).label("total_logs")
            )
            .filter(
                SegmentAnalysis.camera_id == camera_id,
                SegmentAnalysis.segment_start >= day_start,
                SegmentAnalysis.segment_start < day_end,
                SegmentAnalysis.status == 'completed'
            )
            .first()
        )
        
        # SegmentAnalysis의 incident_count 합산
        day_segments = (
            db.query(SegmentAnalysis)
            .filter(
                SegmentAnalysis.camera_id == camera_id,
                SegmentAnalysis.segment_start >= day_start,
                SegmentAnalysis.segment_start < day_end,
                SegmentAnalysis.status == 'completed'
            )
            .all()
        )
        day_incidents = sum(s.incident_count or 0 for s in day_segments)
        
        weekly_trend.append({
            "day": day_start.strftime("%a"),  # 월, 화, 수...
            "score": int(day_stats.avg_safety or 0) if day_stats.avg_safety else 0,
            "incidents": day_incidents,
            "activity": 0,  # 추후 추가 가능
            "safety": int(day_stats.avg_safety or 0) if day_stats.avg_safety else 0,
        })
    
    # 6. 최근 위험 감지 목록 (SegmentAnalysis의 safety_incidents에서 추출)
    risks: List[Dict[str, Any]] = []
    
    # 최근 세그먼트들에서 위험 이벤트 추출
    recent_segments = (
        db.query(SegmentAnalysis)
        .filter(
            SegmentAnalysis.camera_id == camera_id,
            SegmentAnalysis.status == 'completed'
        )
        .order_by(SegmentAnalysis.segment_start.desc())
        .limit(10)
        .all()
    )
    
    for segment in recent_segments:
        if segment.safety_incidents:
            for incident in segment.safety_incidents:
                severity = incident.get('severity', '').lower()
                if severity in ['danger', 'warning', '위험', '주의']:
                    level_map = {
                        "danger": "high",
                        "warning": "medium",
                        "위험": "high",
                        "주의": "medium"
                    }
                    level = level_map.get(severity, "medium")
                    
                    risks.append({
                        "level": level,
                        "title": incident.get('title', '위험 감지'),
                        "time": segment.segment_start.strftime('%H:%M'),
                        "count": 1
                    })
                    
                    if len(risks) >= 5:
                        break
        if len(risks) >= 5:
            break
    
    # 7. 추천 사항 (HourlyReport에서 가져오기)
    recommendations: List[Dict[str, Any]] = []
    
    # 최신 HourlyReport에서 추천 활동 가져오기
    latest_hourly_report = (
        db.query(HourlyReport)
        .filter(HourlyReport.camera_id == camera_id)
        .order_by(HourlyReport.hour_start.desc())
        .first()
    )
    
    if latest_hourly_report and latest_hourly_report.recommended_activities:
        if isinstance(latest_hourly_report.recommended_activities, list):
            for rec in latest_hourly_report.recommended_activities[:3]:  # 최대 3개
                if isinstance(rec, dict):
                    recommendations.append({
                        "priority": "medium",
                        "title": rec.get("title", "추천 활동"),
                        "description": rec.get("description", "") or rec.get("benefit", "")
                    })
    
    # 기본 추천사항이 없으면 기본값 추가
    if not recommendations:
        recommendations.append({
            "priority": "high",
            "title": "분석을 시작해보세요",
            "description": "스트리밍을 시작하면 AI가 자동으로 분석합니다."
        })

    # 8. 타임라인 이벤트 (SegmentAnalysis만 사용)
    timeline_events: List[Dict[str, Any]] = []
    
    # SegmentAnalysis의 이벤트들을 타임라인에 추가
    kst = pytz.timezone('Asia/Seoul')
    for segment in today_segments:
        # UTC를 KST로 변환
        segment_start_kst = segment.segment_start.replace(tzinfo=pytz.UTC).astimezone(kst)
        segment_hour = segment_start_kst.hour
        time_str = segment_start_kst.strftime("%H:%M")
        
        # SegmentAnalysis의 analysis_result에서 데이터 추출
        analysis_result = segment.analysis_result
        if not analysis_result:
            continue
            
        # 안전 이벤트 추가
        safety_analysis = analysis_result.get('safety_analysis', {})
        safety_incidents = safety_analysis.get('incident_events', [])
        
        for incident in safety_incidents:
            severity_raw = incident.get('severity', '')
            
            # severity 매핑 (한글 → 영문)
            severity_map = {
                "사고": "danger",
                "사고발생": "danger",
                "위험": "danger",
                "주의": "warning",
                "권장": "info"
            }
            
            # 대소문자 구분 없이 매핑
            mapped_severity = severity_map.get(severity_raw, severity_map.get(severity_raw.lower(), "info"))
            
            # category는 risk_type에서 가져오기 (없으면 severity 기반으로 설정)
            risk_type = incident.get('risk_type', '')
            if risk_type:
                category = risk_type
            elif severity_raw in ["사고", "사고발생", "위험"]:
                category = "위험"
            elif severity_raw == "주의":
                category = "주의"
            elif severity_raw == "권장":
                category = "권장"
            else:
                category = "안전"
            
            timeline_events.append({
                "time": time_str,
                "hour": segment_hour,
                "type": "safety",
                "severity": mapped_severity,
                "title": incident.get('title', '') or incident.get('description', '안전 이벤트')[:50],
                "description": incident.get('description', ''),
                "resolved": False,
                "hasClip": False,
                "category": category,
                "timestamp_range": incident.get('timestamp_range', ''),
                "safety_score": segment.safety_score
            })
        
        # 발달 이벤트 추가
        development_analysis = analysis_result.get('development_analysis', {})
        skills = development_analysis.get('skills', [])
        
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
                "development_score": segment.development_score
            })
    
    # 시간순으로 정렬 (최신순)
    timeline_events.sort(key=lambda x: x["hour"], reverse=True)
    
    # 9. 시간대별 통계 (hourly_stats) 생성 (SegmentAnalysis만 사용)
    hourly_stats: List[Dict[str, Any]] = []
    
    # 0-23시 각각의 통계 초기화 (데이터 없는 시간은 0/0)
    hourly_data = {i: {
        "hour": i, 
        "safetyScore": 0, 
        "developmentScore": 0, 
        "eventCount": 0,
        "analysisCount": 0  # 분석 횟수 추가
    } for i in range(24)}
    
    # SegmentAnalysis를 시간대별로 집계 (실시간 VLM 분석 결과)
    for segment in today_segments:
        # UTC를 KST로 변환
        segment_start_kst = segment.segment_start.replace(tzinfo=pytz.UTC).astimezone(kst)
        hour = segment_start_kst.hour
        
        # 해당 시간대에 세그먼트가 있으면 점수 업데이트
        if segment.safety_score is not None:
            if hourly_data[hour]["analysisCount"] == 0:
                hourly_data[hour]["safetyScore"] = segment.safety_score
                hourly_data[hour]["developmentScore"] = segment.development_score or 0
            else:
                # 평균 계산
                count = hourly_data[hour]["analysisCount"]
                hourly_data[hour]["safetyScore"] = int((hourly_data[hour]["safetyScore"] * count + segment.safety_score) / (count + 1))
                hourly_data[hour]["developmentScore"] = int((hourly_data[hour]["developmentScore"] * count + (segment.development_score or 0)) / (count + 1))
        
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
    
    # 최신 HourlyReport 조회 (현재 시간 이전의 가장 최근 리포트)
    latest_hourly_report = (
        db.query(HourlyReport)
        .filter(
            HourlyReport.camera_id == camera_id,
            HourlyReport.hour_start < current_hour_start
        )
        .order_by(HourlyReport.hour_start.desc())
        .first()
    )
    
    # 텍스트 요약 (HourlyReport에서 가져오거나, 없으면 기본값)
    summary_text = "아직 분석된 데이터가 없습니다."
    if latest_hourly_report and latest_hourly_report.safety_summary:
        summary_text = latest_hourly_report.safety_summary
    elif latest_segment and latest_segment.analysis_result:
        # SegmentAnalysis의 analysis_result에서 요약 추출
        safety_analysis = latest_segment.analysis_result.get('safety_analysis', {})
        if safety_analysis.get('summary'):
            summary_text = safety_analysis.get('summary')
    
    # 기본 응답 구조 (프론트엔드 DashboardData 인터페이스와 일치)
    return {
        "summary": summary_text,  # HourlyReport에서 가져온 종합 요약
        "rangeDays": range_days,
        "safetyScore": avg_safety_score,  # 오늘 분석된 모든 영상의 평균 안전 점수 (실시간)
        "developmentScore": avg_dev_score,  # 오늘 분석된 모든 영상의 평균 발달 점수 (실시간)
        "incidentCount": incident_count,  # 오늘 분석된 모든 영상의 이벤트 카운트 (실시간)
        "monitoringHours": float(len(today_segments)) * 0.17,  # 분석된 영상 개수 * 10분 (실시간)
        "totalAnalysisCount": len(today_segments),  # 총 분석 횟수 (실시간)
        "activityPattern": "모니터링 중" if today_segments else "데이터 없음",
        "weeklyTrend": weekly_trend,
        "risks": risks,
        "recommendations": recommendations,
        "timelineEvents": timeline_events,  # 오늘 분석된 모든 이벤트 (실시간)
        "hourlyStats": hourly_stats  # 시간대별 통계 추가 (실시간) - camelCase로 변경
    }


@router.post("/fix-development-scores")
def fix_development_scores(db: Session = Depends(get_db)):
    """기존 SegmentAnalysis의 development_score 업데이트"""
    try:
        segments = db.query(SegmentAnalysis).filter(
            SegmentAnalysis.status == 'completed',
            SegmentAnalysis.analysis_result.isnot(None)
        ).all()
        
        updated_count = 0
        for segment in segments:
            try:
                result = segment.analysis_result
                if not result:
                    continue
                
                dev_analysis = result.get('development_analysis', {})
                dev_score = dev_analysis.get('development_score')
                
                if dev_score is not None and (segment.development_score is None or segment.development_score == 0):
                    segment.development_score = dev_score
                    segment.development_radar_scores = dev_analysis.get('radar_scores', {})
                    
                    safety_analysis = result.get('safety_analysis', {})
                    segment.safety_incidents = safety_analysis.get('incident_events', [])
                    
                    updated_count += 1
            except Exception as e:
                print(f"Error updating segment {segment.id}: {e}")
                continue
        
        db.commit()
        return {"success": True, "updated": updated_count, "message": f"{updated_count}개 레코드 업데이트 완료"}
    except Exception as e:
        return {"success": False, "error": str(e)}

