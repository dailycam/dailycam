"""Dashboard API Router"""

from fastapi import APIRouter, Depends, Body
<<<<<<< HEAD
from sqlalchemy.orm import Session
=======
from sqlalchemy.orm import Session, joinedload, selectinload
>>>>>>> 339dc48c4d9f2d2a4a72d593e47305b717dc4c6e
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import pytz

from app.database import get_db
from app.utils.auth_utils import get_current_user_id
from app.models.analysis import AnalysisLog, SafetyEvent, DevelopmentEvent
from app.models.live_monitoring.models import SegmentAnalysis, HourlyReport

router = APIRouter()


class DashboardSummaryRequest(BaseModel):
    range_days: int = 7
    target_date: Optional[str] = None  # YYYY-MM-DD 형식


@router.post("/summary")
def get_dashboard_summary(
    request: DashboardSummaryRequest = Body(...),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
) -> Dict[str, Any]:
    """
    대시보드용 요약 데이터 조회
    
    특정 날짜(00:00~23:59) 분석된 모든 영상의 데이터를 집계하여 반환합니다.
    최근 7일 이내의 날짜만 조회 가능합니다.
    """
<<<<<<< HEAD
=======
    import time
    start_time = time.time()
    print(f"\n[Dashboard API] 🚀 요청 시작 - User: {user_id}, Date: {request.target_date}")
    
>>>>>>> 339dc48c4d9f2d2a4a72d593e47305b717dc4c6e
    # 조회할 날짜 설정 (기본값: 오늘)
    if request.target_date:
        try:
            query_date = datetime.strptime(request.target_date, "%Y-%m-%d")
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
    
    # 1. 날짜 범위 설정
    range_days = request.range_days
    end_date = datetime.now()
    start_date = end_date - timedelta(days=range_days)
    
<<<<<<< HEAD
    # 2. 조회할 날짜의 모든 분석 로그 조회 (일일 집계)
    # KST 기준 조회 날짜 설정 (target_date 사용)
    kst = pytz.timezone('Asia/Seoul')
    
    # query_date를 KST로 변환 (target_date가 있으면 사용, 없으면 오늘)
    if request.target_date:
        # query_date는 이미 파싱된 naive datetime이므로 KST로 변환
        query_date_kst = kst.localize(query_date)
    else:
        # 기본값: 오늘 (KST)
        query_date_kst = datetime.now(kst)
    
    # 조회할 날짜의 시작/끝 시간 설정
    target_start_kst = query_date_kst.replace(hour=0, minute=0, second=0, microsecond=0)
    target_end_kst = query_date_kst.replace(hour=23, minute=59, second=59, microsecond=999999)
    
    # UTC로 변환 (데이터베이스는 UTC로 저장됨)
    target_start_utc = target_start_kst.astimezone(pytz.UTC).replace(tzinfo=None)
    target_end_utc = target_end_kst.astimezone(pytz.UTC).replace(tzinfo=None)
    
    print(f"[Dashboard] 조회 날짜 (KST): {target_start_kst} ~ {target_end_kst}")
    print(f"[Dashboard] 조회 날짜 (UTC): {target_start_utc} ~ {target_end_utc}")
    print(f"[Dashboard] User ID: {user_id}")
    
    # AnalysisLog 조회
    today_logs = (
        db.query(AnalysisLog)
        .filter(
            AnalysisLog.user_id == user_id,
            AnalysisLog.created_at >= target_start_utc,
            AnalysisLog.created_at <= target_end_utc
=======
    # 2. 선택한 날짜의 모든 분석 로그 조회 (일일 집계)
    # KST 기준 선택한 날짜 (query_date 사용!)
    kst = pytz.timezone('Asia/Seoul')
    
    # query_date를 KST로 변환 (query_date는 naive datetime)
    query_date_kst = kst.localize(query_date.replace(hour=0, minute=0, second=0, microsecond=0))
    selected_day_start_kst = query_date_kst
    selected_day_end_kst = query_date_kst.replace(hour=23, minute=59, second=59, microsecond=999999)
    
    # UTC로 변환 (데이터베이스는 UTC로 저장됨)
    selected_day_start_utc = selected_day_start_kst.astimezone(pytz.UTC).replace(tzinfo=None)
    selected_day_end_utc = selected_day_end_kst.astimezone(pytz.UTC).replace(tzinfo=None)
    
    print(f"[Dashboard] 선택한 날짜: {request.target_date}")
    print(f"[Dashboard] 날짜 범위 (KST): {selected_day_start_kst} ~ {selected_day_end_kst}")
    print(f"[Dashboard] 날짜 범위 (UTC): {selected_day_start_utc} ~ {selected_day_end_utc}")
    print(f"[Dashboard] User ID: {user_id}")
    
    # AnalysisLog 조회 (관련 이벤트들을 함께 로드하여 N+1 쿼리 방지)
    today_logs = (
        db.query(AnalysisLog)
        .options(
            selectinload(AnalysisLog.safety_events),  # SafetyEvent를 미리 로드
            selectinload(AnalysisLog.development_events)  # DevelopmentEvent를 미리 로드
        )
        .filter(
            AnalysisLog.user_id == user_id,
            AnalysisLog.created_at >= selected_day_start_utc,
            AnalysisLog.created_at <= selected_day_end_utc
>>>>>>> 339dc48c4d9f2d2a4a72d593e47305b717dc4c6e
        )
        .all()
    )
    
    # SegmentAnalysis 조회 (실시간 수치 데이터)
    # TODO: user_id와 camera_id 매핑 필요 (현재는 camera-1 고정)
    camera_id = "camera-1"  # 추후 사용자별 카메라 매핑으로 변경
    today_segments = (
        db.query(SegmentAnalysis)
        .filter(
            SegmentAnalysis.camera_id == camera_id,
<<<<<<< HEAD
            SegmentAnalysis.segment_start >= target_start_utc,
            SegmentAnalysis.segment_start <= target_end_utc,
=======
            SegmentAnalysis.segment_start >= selected_day_start_utc,
            SegmentAnalysis.segment_start <= selected_day_end_utc,
>>>>>>> 339dc48c4d9f2d2a4a72d593e47305b717dc4c6e
            SegmentAnalysis.status == 'completed'
        )
        .all()
    )
    
<<<<<<< HEAD
    print(f"[Dashboard] 조회 날짜 분석된 로그 개수: {len(today_logs)}")
    print(f"[Dashboard] 조회 날짜 분석된 세그먼트 개수: {len(today_segments)}")
    
    # 2-1. 조회 날짜 분석된 데이터의 평균 안전 점수 및 발달 점수
=======
    print(f"[Dashboard] 선택한 날짜 분석된 로그 개수: {len(today_logs)}")
    print(f"[Dashboard] 선택한 날짜 분석된 세그먼트 개수: {len(today_segments)}")
    
    # 2-1. 선택한 날짜 분석된 데이터의 평균 안전 점수 및 발달 점수
>>>>>>> 339dc48c4d9f2d2a4a72d593e47305b717dc4c6e
    # AnalysisLog와 SegmentAnalysis 모두에서 수집
    today_safety_scores = [log.safety_score for log in today_logs if log.safety_score is not None]
    today_safety_scores.extend([s.safety_score for s in today_segments if s.safety_score is not None])
    
    today_dev_scores = [log.development_score for log in today_logs if log.development_score is not None]
    today_dev_scores.extend([s.development_score for s in today_segments if s.development_score is not None])
    
    print(f"[Dashboard] 안전 점수들: {today_safety_scores}")
    print(f"[Dashboard] 발달 점수들: {today_dev_scores}")
    
    avg_safety_score = int(sum(today_safety_scores) / len(today_safety_scores)) if today_safety_scores else 0
    print(f"[Dashboard] 평균 안전 점수: {avg_safety_score}")
    avg_dev_score = int(sum(today_dev_scores) / len(today_dev_scores)) if today_dev_scores else 0
    print(f"[Dashboard] 평균 발달 점수: {avg_dev_score}")
    
    # 2-2. 최신 로그 및 세그먼트 (요약 텍스트용)
    latest_log = today_logs[0] if today_logs else None
    latest_segment = today_segments[0] if today_segments else None
    
    # 3. 기간 내 안전 점수 평균 및 이벤트 수
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
    
<<<<<<< HEAD
    # 4. 조회 날짜의 위험 이벤트 카운트 (일일 집계)
=======
    # 4. 선택한 날짜의 위험 이벤트 카운트 (일일 집계)
>>>>>>> 339dc48c4d9f2d2a4a72d593e47305b717dc4c6e
    # AnalysisLog 기반 이벤트
    incident_count = (
        db.query(SafetyEvent)
        .join(AnalysisLog, SafetyEvent.analysis_log_id == AnalysisLog.id)
        .filter(
            AnalysisLog.user_id == user_id,
<<<<<<< HEAD
            AnalysisLog.created_at >= target_start_utc,
            AnalysisLog.created_at <= target_end_utc,
=======
            AnalysisLog.created_at >= selected_day_start_utc,
            AnalysisLog.created_at <= selected_day_end_utc,
>>>>>>> 339dc48c4d9f2d2a4a72d593e47305b717dc4c6e
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
    elif latest_log and latest_log.recommendations:
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
            "description": "스트리밍을 시작하면 AI가 자동으로 분석합니다."
        })

    # 8. 타임라인 이벤트 (AnalysisLog + SegmentAnalysis 모두 포함)
    timeline_events: List[Dict[str, Any]] = []
    
<<<<<<< HEAD
    # AnalysisLog의 이벤트들을 타임라인에 추가
    for log in today_logs:
        # SafetyEvent 추가
        safety_events = (
            db.query(SafetyEvent)
            .filter(SafetyEvent.analysis_log_id == log.id)
            .all()
        )
        
        for event in safety_events:
=======
    # AnalysisLog의 이벤트들을 타임라인에 추가 (이미 로드된 관계 사용)
    for log in today_logs:
        # SafetyEvent 추가 (selectinload로 이미 로드됨, 추가 쿼리 없음)
        for event in log.safety_events:
>>>>>>> 339dc48c4d9f2d2a4a72d593e47305b717dc4c6e
            # UTC를 KST로 변환
            log_time_kst = log.created_at.replace(tzinfo=pytz.UTC).astimezone(kst)
            time_str = log_time_kst.strftime("%H:%M")
            hour = log_time_kst.hour
            
            # severity를 severity level로 매핑
            severity_map = {
                "위험": "danger",
                "주의": "warning",
                "권장": "info"
            }
            severity = severity_map.get(event.severity.value if hasattr(event.severity, 'value') else str(event.severity), "info")
            
            timeline_events.append({
                "time": time_str or log_time_kst.strftime("%H:%M"),
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
        
<<<<<<< HEAD
        # DevelopmentEvent 추가
        development_events = (
            db.query(DevelopmentEvent)
            .filter(DevelopmentEvent.analysis_log_id == log.id)
            .all()
        )
        
        for event in development_events:
=======
        # DevelopmentEvent 추가 (selectinload로 이미 로드됨, 추가 쿼리 없음)
        for event in log.development_events:
>>>>>>> 339dc48c4d9f2d2a4a72d593e47305b717dc4c6e
            # UTC를 KST로 변환
            log_time_kst = log.created_at.replace(tzinfo=pytz.UTC).astimezone(kst)
            time_str = log_time_kst.strftime("%H:%M")
            hour = log_time_kst.hour
            
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
    
    # SegmentAnalysis의 이벤트들을 타임라인에 추가
    for segment in today_segments:
        # UTC를 KST로 변환
        segment_start_kst = segment.segment_start.replace(tzinfo=pytz.UTC).astimezone(kst)
        segment_hour = segment_start_kst.hour
        time_str = segment_start_kst.strftime("%H:%M")
        
        # SegmentAnalysis의 analysis_result에서 데이터 추출
        analysis_result = segment.analysis_result
        if not analysis_result:
            continue
            
            # Development Analysis extraction
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
        
        # [추가] SegmentAnalysis의 안전 이벤트도 타임라인에 추가
        if analysis_result:
            safety_analysis = analysis_result.get('safety_analysis', {})
            has_safety_event = False
            
            # 1. safety_events (UI 표시용 안전 이벤트 - 우선 사용)
            ui_safety_events = safety_analysis.get('safety_events', [])
            
            if isinstance(ui_safety_events, list) and len(ui_safety_events) > 0:
                for event in ui_safety_events:
                    if not isinstance(event, dict): 
                        continue
                        
                    severity_kr = event.get('severity', '권장')
                    # severity 매핑
                    severity_map = {
                        "위험": "danger",
                        "주의": "warning",
                        "권장": "info",
                        "안전": "info",
                        "사고": "danger",
                        "사고발생": "danger"
                    }
                    severity = severity_map.get(severity_kr, "info")
                    
                    # 카테고리 설정 (location 활용)
                    category = event.get('location', '안전')
                    
                    timeline_events.append({
                        "time": time_str, # 세그먼트 시작 시간
                        "hour": segment_hour,
                        "type": "safety",
                        "severity": severity,
                        "title": event.get('title', '안전 이벤트'),
                        "description": event.get('description', ''),
                        "hasClip": False,
                        "category": category,
                        "safety_score": segment.safety_score
                    })
                    has_safety_event = True
            
            # 2. incident_events (감점용 이벤트 - safety_events가 없을 때 Fallback)
            elif 'incident_events' in safety_analysis: 
                incident_events = safety_analysis.get('incident_events', [])
                if isinstance(incident_events, list):
                    for event in incident_events:
                        if not isinstance(event, dict): 
                            continue
                            
                        severity_kr = event.get('severity', '권장')
                        severity_map = { "위험": "danger", "주의": "warning", "권장": "info", "안전": "info", "사고": "danger", "사고발생": "danger" }
                        severity = severity_map.get(severity_kr, "info")
                        
                        # 권장/확인 카테고리 구분
                        category = "안전"
                        if severity == 'info':
                            if '권장' in event.get('description', '') or '권장' in severity_kr:
                                category = '안전 권장'
                            else:
                                category = '안전 확인'
                        
                        # Title 생성 (description 활용)
                        title = event.get('description', '안전 이벤트')
                        if len(title) > 20:
                            title = title[:20] + "..."
                        
                        timeline_events.append({
                            "time": time_str,
                            "hour": segment_hour,
                            "type": "safety",
                            "severity": severity,
                            "title": title,
                            "description": event.get('description', ''),
                            "hasClip": False,
                            "category": category,
                            "safety_score": segment.safety_score
                        })
                        has_safety_event = True

            # 3. environment_risks (환경 위험 요소)
            env_risks = safety_analysis.get('environment_risks', [])
            if isinstance(env_risks, list):
                for risk in env_risks:
                    if not isinstance(risk, dict): 
                        continue
                        
                    severity_kr = risk.get('severity', '주의')
                    severity_map = {
                        "위험": "danger",
                        "주의": "warning",
                        "권장": "info"
                    }
                    severity = severity_map.get(severity_kr, "warning")
                    
                    # Title 생성: risk_type + environment_factor
                    risk_type = risk.get('risk_type', '환경 위험')
                    env_factor = risk.get('environment_factor', '')
                    title = risk_type
                    if env_factor:
                        title = f"{risk_type} ({env_factor})"
                    
                    timeline_events.append({
                        "time": time_str,
                        "hour": segment_hour,
                        "type": "safety",
                        "severity": severity,
                        "title": title,
                        "description": risk.get('comment', risk.get('description', '위험 요소가 감지되었습니다.')),
                        "hasClip": False,
                        "category": "환경 안전",
                        "safety_score": segment.safety_score
                    })
                    has_safety_event = True
            
            # 4. 이벤트가 없으면 '안전함' 이벤트 추가
            if not has_safety_event:
                timeline_events.append({
                    "time": time_str,
                    "hour": segment_hour,
                    "type": "safety",
                    "severity": "info",
                    "title": "안전하게 활동 중",
                    "description": "특이사항 없이 안전한 상태입니다.",
                    "hasClip": False,
                    "category": "안전 확인",
                    "safety_score": segment.safety_score or 100
                })
    
    # 시간순으로 정렬 (최신순)
    timeline_events.sort(key=lambda x: x["hour"], reverse=True)
    
    # 디버깅: 안전 이벤트 개수 확인
    safety_events = [e for e in timeline_events if e["type"] == "safety"]
    danger_events = [e for e in safety_events if e["severity"] == "danger"]
    warning_events = [e for e in safety_events if e["severity"] == "warning"]
    info_events = [e for e in safety_events if e["severity"] == "info"]
    
    print(f"[Dashboard] 타임라인 이벤트 총 {len(timeline_events)}개")
    print(f"[Dashboard] 안전 이벤트: {len(safety_events)}개 (위험: {len(danger_events)}, 주의: {len(warning_events)}, 정보: {len(info_events)})")
    if safety_events:
        print(f"[Dashboard] 샘플 안전 이벤트: severity={safety_events[0]['severity']}, title={safety_events[0]['title'][:50]}, category={safety_events[0]['category']}")
    
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
        # UTC를 KST로 변환
        log_time_kst = log.created_at.replace(tzinfo=pytz.UTC).astimezone(kst)
        hour = log_time_kst.hour
        
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
    
    # 10. 실제 모니터링 분석된 시간 구간 (Monitoring Ranges) 계산
    # SegmentAnalysis와 AnalysisLog의 시간 구간을 합쳐서 계산
    raw_ranges = []
    
    # 10-1. SegmentAnalysis 구간 추가
    for segment in today_segments:
        # segment_end가 있으면 사용, 없으면 start + 10분
        s_start = segment.segment_start
        s_end = segment.segment_end if segment.segment_end else s_start + timedelta(minutes=10)
        raw_ranges.append((s_start, s_end))
        
    # 10-2. AnalysisLog 구간 추가
    # AnalysisLog는 duration이 없으므로, 이벤트가 있으면 이벤트 범위, 없으면 created_at + 10분으로 추정
    for log in today_logs:
<<<<<<< HEAD
        # 연결된 이벤트들 조회
        log_events_timestamps = []
        
        # SafetyEvent
        s_events = db.query(SafetyEvent.event_timestamp).filter(SafetyEvent.analysis_log_id == log.id).all()
        for e in s_events:
            if e.event_timestamp:
                log_events_timestamps.append(e.event_timestamp)
                
        # DevelopmentEvent
        d_events = db.query(DevelopmentEvent.event_timestamp).filter(DevelopmentEvent.analysis_log_id == log.id).all()
        for e in d_events:
=======
        # 이미 로드된 이벤트들에서 타임스탬프 수집 (추가 쿼리 없음)
        log_events_timestamps = []
        
        # SafetyEvent (이미 로드됨)
        for e in log.safety_events:
            if e.event_timestamp:
                log_events_timestamps.append(e.event_timestamp)
                
        # DevelopmentEvent (이미 로드됨)
        for e in log.development_events:
>>>>>>> 339dc48c4d9f2d2a4a72d593e47305b717dc4c6e
            if e.event_timestamp:
                log_events_timestamps.append(e.event_timestamp)
        
        if log_events_timestamps:
            log_start = min(log_events_timestamps)
            log_end = max(log_events_timestamps)
            # 종료 시간이 시작 시간과 같으면 최소 5분 추가
            if log_end == log_start:
                log_end = log_start + timedelta(minutes=5)
            raw_ranges.append((log_start, log_end))
        else:
            # 이벤트가 없으면 created_at ~ 10분 후로 가정
            l_start = log.created_at
            l_end = l_start + timedelta(minutes=10)
            raw_ranges.append((l_start, l_end))
            
    # 10-3. 구간 병합 수행
    merged_ranges = []
    if raw_ranges:
        # 시작 시간 순으로 정렬
        raw_ranges.sort(key=lambda x: x[0])
        
        current_start, current_end = raw_ranges[0]
        
        for i in range(1, len(raw_ranges)):
            next_start, next_end = raw_ranges[i]
            
            # 구간이 겹치거나 연결되면 병합 (1분 정도의 오차는 허용해서 연결 - timedelta)
            if next_start <= current_end + timedelta(minutes=1): 
                current_end = max(current_end, next_end)
            else:
                merged_ranges.append({
                    "start": current_start.strftime("%H:%M"),
                    "end": current_end.strftime("%H:%M")
                })
                current_start, current_end = next_start, next_end
        
        # 마지막 구간 추가
        merged_ranges.append({
            "start": current_start.strftime("%H:%M"),
            "end": current_end.strftime("%H:%M")
        })
    
    
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
    elif latest_log and latest_log.safety_summary:
        summary_text = latest_log.safety_summary
    
    # 기본 응답 구조 (프론트엔드 DashboardData 인터페이스와 일치)
<<<<<<< HEAD
=======
    elapsed_time = time.time() - start_time
    print(f"[Dashboard API] ✅ 요청 완료 - 소요 시간: {elapsed_time:.3f}초")
    
>>>>>>> 339dc48c4d9f2d2a4a72d593e47305b717dc4c6e
    return {
        "summary": summary_text,  # HourlyReport에서 가져온 종합 요약
        "rangeDays": range_days,
        "safetyScore": avg_safety_score,  # 오늘 분석된 모든 영상의 평균 안전 점수 (실시간)
        "developmentScore": avg_dev_score,  # 오늘 분석된 모든 영상의 평균 발달 점수 (실시간)
        "incidentCount": incident_count,  # 오늘 분석된 모든 영상의 이벤트 카운트 (실시간)
        "monitoringHours": float(len(today_logs) + len(today_segments)) * 0.17,  # 분석된 영상 개수 * 10분 (실시간)
        "totalAnalysisCount": len(today_logs) + len(today_segments),  # 총 분석 횟수 (실시간)
        "activityPattern": "모니터링 중" if (today_logs or today_segments) else "데이터 없음",
        "weeklyTrend": weekly_trend,
        "risks": risks,
        "recommendations": recommendations,
        "timelineEvents": timeline_events,  # 오늘 분석된 모든 이벤트 (실시간)
        "hourlyStats": hourly_stats,  # 시간대별 통계 추가 (실시간)
        "monitoringRanges": merged_ranges # 실제 분석된 시간 구간 (start, end)
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
                    segment.development_radar_scores = dev_analysis.get('development_radar_scores', {})
                    
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
