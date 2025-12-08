"""Development Report API Router"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta, date

from app.database import get_db
from app.utils.auth_utils import get_current_user_id
from app.models.analysis import AnalysisLog, DevelopmentEvent
from app.models.user import User
from app.models.live_monitoring.models import SegmentAnalysis, HourlyReport


router = APIRouter()


def calculate_age_months(birth_date: date) -> int:
    """생년월일로부터 현재 개월 수 계산"""
    today = datetime.now().date()
    months = (today.year - birth_date.year) * 12 + (today.month - birth_date.month)
    
    # 일자가 지나지 않았으면 1개월 차감
    if today.day < birth_date.day:
        months -= 1
    
    return max(0, months)  # 음수 방지


@router.get("/summary")
def get_development_summary(
    days: int = Query(7, description="조회할 일수"),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """
    발달 리포트용 요약 데이터 조회
    
    오늘(00:00~23:59) 분석된 모든 영상의 데이터를 집계하여 반환합니다.
    """
    # 0. 사용자 정보 조회 및 현재 개월 수 계산
    user = db.query(User).filter(User.id == user_id).first()
    
    # 생년월일로부터 현재 개월 수 계산
    age_months = 7  # 기본값
    if user and user.child_birthdate:
        age_months = calculate_age_months(user.child_birthdate)
    
    # 1. 날짜 범위 설정
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    # 2. 오늘 날짜의 모든 분석 로그 조회 (일일 집계)
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
    
    if not today_logs:
        # 데이터가 없으면 기본값 반환 (계산된 age_months 사용)
        return {
            "age_months": age_months,
            "development_summary": "아직 분석된 데이터가 없습니다.",
            "development_score": 0,
            "development_radar_scores": {
                "언어": 0,
                "운동": 0,
                "인지": 0,
                "사회성": 0,
                "정서": 0,
            },
            "strongest_area": "운동",
            "daily_development_frequency": [],
            "recommended_activities": [],
        }
    
    # 3. 오늘 분석된 영상들의 평균 발달 점수
    today_dev_scores = [log.development_score for log in today_logs if log.development_score is not None]
    avg_dev_score = int(sum(today_dev_scores) / len(today_dev_scores)) if today_dev_scores else 0
    
    
    # 4. 발달 오각형 점수 - 누적 추적 시스템 사용
    try:
        from app.services.development_tracking_service import DevelopmentTrackingService
        radar_scores = DevelopmentTrackingService.get_category_scores(db, user_id)
        print(f"[Development] 누적 추적 점수 사용: {radar_scores}")
    except Exception as e:
        print(f"⚠️ 누적 점수 조회 실패, VLM 평균 점수 사용: {e}")
        # Fallback: VLM 평균 점수 계산
        all_radar_scores = {
            "언어": [],
            "운동": [],
            "인지": [],
            "사회성": [],
            "정서": []
        }
        
        for log in today_logs:
            if log.development_radar_scores:
                print(f"[Development] Log ID: {log.id}, Radar Scores: {log.development_radar_scores}")
                for category in all_radar_scores.keys():
                    score = log.development_radar_scores.get(category, 0)
                    if score:
                        all_radar_scores[category].append(score)
        
        # 카테고리별 평균 계산
        radar_scores = {}
        for category, scores in all_radar_scores.items():
            radar_scores[category] = int(sum(scores) / len(scores)) if scores else 0
        
        print(f"[Development] 평균 Radar Scores: {radar_scores}")
    
    # 5. 가장 높은 점수의 영역 찾기
    strongest_area = max(radar_scores, key=radar_scores.get) if radar_scores else "운동"
    
    # 6. 오늘 발달 행동 빈도 (모든 DevelopmentEvent 카테고리별 카운트)
    category_counts = (
        db.query(
            DevelopmentEvent.category,
            func.count(DevelopmentEvent.id).label("count")
        )
        .join(AnalysisLog, DevelopmentEvent.analysis_log_id == AnalysisLog.id)
        .filter(
            AnalysisLog.user_id == user_id,
            AnalysisLog.created_at >= today_start,
            AnalysisLog.created_at <= today_end
        )
        .group_by(DevelopmentEvent.category)
        .all()
    )
    
    # 카테고리별 색상 매핑 (파스텔톤)
    category_colors = {
        "언어": "#a2d2ff", # Light Blue
        "운동": "#b0f2c2", # Light Green (레거시)
        "대근육운동": "#90e0a0", # Light Green (대근육)
        "소근육운동": "#b0f2c2", # Light Green (소근육)
        "인지": "#ffc77d", # Light Orange
        "사회성": "#d4a2ff", # Light Purple
        "사회정서": "#d4a2ff", # Light Purple
        "정서": "#ffb0bb", # Light Pink
    }
    
    daily_frequency = [
        {
            "category": cat.value if hasattr(cat, 'value') else str(cat),
            "count": count,
            "color": category_colors.get(cat.value if hasattr(cat, 'value') else str(cat), "#6b7280")
        }
        for cat, count in category_counts
    ]
    
    # 7. 텍스트 데이터는 HourlyReport에서 가져오기 (최신 1시간 리포트)
    now = datetime.now()
    current_hour_start = now.replace(minute=0, second=0, microsecond=0)
    
    # 최신 HourlyReport 조회
    camera_id = "camera-1"  # 추후 사용자별 카메라 매핑으로 변경
    latest_hourly_report = (
        db.query(HourlyReport)
        .filter(
            HourlyReport.camera_id == camera_id,
            HourlyReport.hour_start < current_hour_start
        )
        .order_by(HourlyReport.hour_start.desc())
        .first()
    )
    
    # 발달 요약 (HourlyReport에서 가져오거나, 없으면 최신 로그 사용)
    latest_log = today_logs[0] if today_logs else None
    if latest_hourly_report and latest_hourly_report.development_summary:
        development_summary = latest_hourly_report.development_summary
    elif latest_log and latest_log.development_summary:
        development_summary = latest_log.development_summary
    else:
        development_summary = "아직 분석된 데이터가 없습니다."
    
    # 추천 활동 (HourlyReport에서 가져오거나, 없으면 최신 로그 사용)
    if latest_hourly_report and latest_hourly_report.recommended_activities:
        recommendations = latest_hourly_report.recommended_activities
    elif latest_log and latest_log.recommendations:
        recommendations = latest_log.recommendations
    else:
        recommendations = []
    
    # 9. 최종 응답 (사용자 생년월일 기반 age_months 사용)

    # 발달 인사이트 (HourlyReport에서 가져오거나, 없으면 최신 로그 사용)
    if latest_hourly_report and latest_hourly_report.development_insights:
        development_insights = latest_hourly_report.development_insights
    elif latest_log and latest_log.development_insights:
        development_insights = latest_log.development_insights
    else:
        development_insights = []
    
    # 월령은 위에서 계산된 값(user.child_birthdate 기반)을 그대로 사용합니다.
    # age_months = latest_log.age_months if latest_log and latest_log.age_months else 7
    
    return {
        "age_months": age_months,
        "development_summary": development_summary,  # HourlyReport에서 가져온 종합 요약
        "development_score": avg_dev_score,  # 평균 발달 점수 (실시간)
        "development_radar_scores": radar_scores,  # 평균 오각형 점수 (실시간)
        "strongest_area": strongest_area,
        "daily_development_frequency": daily_frequency,  # 모든 이벤트 집계 (실시간)
        "recommended_activities": recommendations,  # HourlyReport에서 가져온 종합 추천
        "development_insights": development_insights,  # HourlyReport에서 가져온 종합 인사이트
    }

