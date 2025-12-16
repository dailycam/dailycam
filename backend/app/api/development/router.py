"""Development Report API Router"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, selectinload
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
    target_date: str = Query(None, description="조회할 날짜 (YYYY-MM-DD), 기본값은 오늘"),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """
    발달 리포트용 요약 데이터 조회
    
    특정 날짜(00:00~23:59) 분석된 모든 영상의 데이터를 집계하여 반환합니다.
    최근 7일 이내의 날짜만 조회 가능합니다.
    """
    import time
    start_time = time.time()
    
    # 0. 사용자 정보 조회 및 현재 개월 수 계산
    user = db.query(User).filter(User.id == user_id).first()
    
    # 생년월일로부터 현재 개월 수 계산
    age_months = 7  # 기본값
    if user and user.child_birthdate:
        age_months = calculate_age_months(user.child_birthdate)
    
    # 1. 조회할 날짜 설정 (기본값: 오늘)
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
    
    # 2. 해당 날짜의 모든 분석 로그 조회 (하루치)
    today_start = query_date.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = query_date.replace(hour=23, minute=59, second=59, microsecond=999999)
    
    # AnalysisLog에서 조회 (관련 이벤트를 함께 로드하여 N+1 쿼리 방지)
    today_logs = (
        db.query(AnalysisLog)
        .options(selectinload(AnalysisLog.development_events))  # DevelopmentEvent를 미리 로드
        .filter(
            AnalysisLog.user_id == user_id,
            AnalysisLog.created_at >= today_start,
            AnalysisLog.created_at <= today_end
        )
        .all()
    )
    
    # SegmentAnalysis에서도 조회 (HLS 스트리밍 시스템)
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
    
    # 데이터가 없으면 기본값 반환
    if not today_logs and not today_segments:
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
            "development_insights": [],
        }
    
    # 3. 오늘 분석된 영상들의 평균 발달 점수
    # AnalysisLog + SegmentAnalysis 모두 포함
    # AnalysisLog와 SegmentAnalysis 중복 합산 방지 (SegmentAnalysis 기준)
    today_dev_scores = []
    
    # AnalysisLog에서 점수 수집 (중복 제거를 위해 주석 처리)
    # for log in today_logs:
    #     if log.development_score is not None:
    #         today_dev_scores.append(log.development_score)
    
    # SegmentAnalysis에서 점수 수집
    for segment in today_segments:
        if segment.development_score is not None:
            today_dev_scores.append(segment.development_score)
    
    avg_dev_score = int(sum(today_dev_scores) / len(today_dev_scores)) if today_dev_scores else 0
    
    # 4. 발달 오각형 점수 - 누적 추적 시스템 사용
    try:
        from app.services.development_tracking_service import DevelopmentTrackingService
        radar_scores = DevelopmentTrackingService.get_category_scores(db, user_id)
    except Exception as e:
        # Fallback: VLM 평균 점수 계산
        all_radar_scores = {
            "언어": [],
            "운동": [],
            "인지": [],
            "사회성": [],
            "정서": []
        }
        
        # AnalysisLog에서 수집
        for log in today_logs:
            if log.development_radar_scores:
                for category in all_radar_scores.keys():
                    score = log.development_radar_scores.get(category, 0)
                    if score:
                        all_radar_scores[category].append(score)
        
        # SegmentAnalysis에서도 수집
        for segment in today_segments:
            if segment.development_radar_scores:
                for category in all_radar_scores.keys():
                    score = segment.development_radar_scores.get(category, 0)
                    if score:
                        all_radar_scores[category].append(score)
        # 카테고리별 평균 계산
        radar_scores = {}
        for category, scores in all_radar_scores.items():
            radar_scores[category] = int(sum(scores) / len(scores)) if scores else 0
    
    
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
    # 카테고리별 색상 매핑 (파스텔톤)
    category_colors = {
        "언어": "#a2d2ff", # Light Blue
        "운동": "#b0f2c2", # Light Green (레거시)
        "대근육": "#b0f2c2", # Light Green (대근육 - 운동과 동일 색상)
        "대근육운동": "#90e0a0", # Light Green (대근육)
        "소근육운동": "#b0f2c2", # Light Green (소근육)
        "인지": "#ffc77d", # Light Orange
        "사회성": "#d4a2ff", # Light Purple
        "사회정서": "#d4a2ff", # Light Purple
        "정서": "#ffb0bb", # Light Pink
    }
    
    daily_frequency = []
    for cat, count in category_counts:
        cat_name = cat.value if hasattr(cat, 'value') else str(cat)
        
        # '운동'을 '대근육'으로 변경
        display_name = "대근육" if cat_name == "운동" else cat_name
        
        daily_frequency.append({
            "category": display_name,
            "count": count,
            "color": category_colors.get(display_name, category_colors.get(cat_name, "#6b7280"))
        })
    
    # 7. 텍스트 데이터는 HourlyReport에서 가져오기 (선택한 날짜의 최신 리포트)
    camera_id = "camera-1"  # 추후 사용자별 카메라 매핑으로 변경
    
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
    
    # 발달 요약 (선택한 날짜의 HourlyReport 또는 AnalysisLog에서 가져오기)
    latest_log = today_logs[0] if today_logs else None
    if latest_hourly_report and latest_hourly_report.development_summary:
        development_summary = latest_hourly_report.development_summary
    elif latest_log and latest_log.development_summary:
        development_summary = latest_log.development_summary
    else:
        development_summary = "아직 분석된 데이터가 없습니다."
    
    # 추천 활동 (선택한 날짜의 HourlyReport 또는 AnalysisLog에서 가져오기)
    if latest_hourly_report and latest_hourly_report.recommended_activities:
        recommendations = latest_hourly_report.recommended_activities
    elif latest_log and latest_log.recommendations:
        recommendations = latest_log.recommendations
    else:
        recommendations = []
    
    # 8. 감지된 발달 단계 (Detected Stage) - 최신 분석 결과 기준
    detected_stage = None
    
    # AnalysisLog 확인
    # created_at이 None일 경우 대비
    sorted_logs = sorted(today_logs, key=lambda x: x.created_at or datetime.min, reverse=True)
    latest_log_with_stage = next((log for log in sorted_logs if log.assumed_stage), None)
    if latest_log_with_stage:
        detected_stage = latest_log_with_stage.assumed_stage
        
    # SegmentAnalysis 확인
    if not detected_stage and today_segments:
        sorted_segments = sorted(today_segments, key=lambda x: x.segment_start, reverse=True)
        for seg in sorted_segments:
            # analysis_result가 딕셔너리인지 확인
            if seg.analysis_result and isinstance(seg.analysis_result, dict):
                meta = seg.analysis_result.get('meta', {})
                if meta and isinstance(meta, dict) and meta.get('assumed_stage'):
                    detected_stage = meta.get('assumed_stage')
                    break
    
    # 8-1. 단계별 월령 범위 매핑 (config.yaml 기준)
    STAGE_AGE_MAP = {
        "1": "0~2개월",
        "2": "3~5개월",
        "3": "6~8개월",
        "4": "9~11개월",
        "5": "12~17개월",
        "6": "18~23개월",
        "7": "24~29개월",
        "8": "30~35개월",
        "9": "36~47개월",
        "10": "48~59개월",
        "11": "60~71개월"
    }

    if detected_stage:
        # 숫자만 추출 (예: "5단계" -> "5")
        import re
        match = re.search(r'\d+', str(detected_stage))
        if match:
            stage_num = match.group()
            if stage_num in STAGE_AGE_MAP:
                age_range = STAGE_AGE_MAP[stage_num]
                # 이미 괄호가 있는지 확인 (중복 방지)
                if "(" not in str(detected_stage):
                    # "5" -> "5단계 (12~17개월)"
                    # "5단계" -> "5단계 (12~17개월)"
                    if "단계" not in str(detected_stage):
                        detected_stage = f"{detected_stage}단계 ({age_range})"
                    else:
                        detected_stage = f"{detected_stage} ({age_range})"

    # 9. 최종 응답 (사용자 생년월일 기반 age_months 사용)

    # 발달 인사이트 (선택한 날짜의 HourlyReport 또는 AnalysisLog에서 가져오기)
    if latest_hourly_report and latest_hourly_report.development_insights:
        development_insights = latest_hourly_report.development_insights
    elif latest_log and latest_log.development_insights:
        development_insights = latest_log.development_insights
    else:
        development_insights = []
    
    # 인사이트는 프롬프트에서 50자 이내로 생성되도록 지시됨 (백엔드 제한 제거)
    
    elapsed_time = time.time() - start_time
    
    return {
        "age_months": age_months,
        "detected_stage": detected_stage,  # 감지된 발달 단계 추가
        "development_summary": development_summary,  # HourlyReport에서 가져온 종합 요약
        "development_score": avg_dev_score,  # 평균 발달 점수 (실시간)
        "development_radar_scores": radar_scores,  # 평균 오각형 점수 (실시간)
        "strongest_area": strongest_area,
        "daily_development_frequency": daily_frequency,  # 모든 이벤트 집계 (실시간)
        "recommended_activities": recommendations,  # HourlyReport에서 가져온 종합 추천
        "development_insights": development_insights,  # HourlyReport에서 가져온 종합 인사이트
    }

