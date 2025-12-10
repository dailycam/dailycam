"""Development score tracking service - 발달 점수 추적 서비스"""

from datetime import datetime, timedelta
from typing import Dict, List
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models.development_tracking import DevelopmentScoreTracking, DevelopmentMilestoneTracking


class DevelopmentTrackingService:
    """발달 점수 누적 추적 서비스"""
    
    @staticmethod
    def get_or_create_tracking(db: Session, user_id: int) -> DevelopmentScoreTracking:
        """사용자의 발달 점수 추적 레코드 조회 또는 생성"""
        tracking = db.query(DevelopmentScoreTracking).filter_by(user_id=user_id).first()
        if not tracking:
            tracking = DevelopmentScoreTracking(user_id=user_id)
            db.add(tracking)
            db.flush()
        return tracking
    
    @staticmethod
    def update_scores_from_analysis(
        db: Session,
        user_id: int,
        analysis_result: Dict
    ):
        """
        분석 결과를 바탕으로 영역별 발달 점수 업데이트
        
        Args:
            db: 데이터베이스 세션
            user_id: 사용자 ID
            analysis_result: Gemini 분석 결과 JSON
        """
        # 1. 사용자의 현재 점수 조회 (없으면 생성)
        tracking = DevelopmentTrackingService.get_or_create_tracking(db, user_id)
        
        # 2. VLM에서 계산된 development_radar_scores 사용
        vlm_radar_scores = analysis_result.get("development_analysis", {}).get("development_radar_scores", {})
        
        if not vlm_radar_scores:
            print(f"[DevelopmentTracking] User {user_id}: VLM 레이더 점수 없음. 업데이트 건너뜀.")
            return

        updates = {}
        for category, score in vlm_radar_scores.items():
            if category == "언어":
                tracking.language_score = score
            elif category == "운동":
                tracking.motor_score = score
            elif category == "인지":
                tracking.cognitive_score = score
            elif category == "사회성":
                tracking.social_score = score
            elif category == "정서":
                tracking.emotional_score = score
            updates[category] = score
        
        db.commit()
        
        print(f"[DevelopmentTracking] User {user_id} 점수 업데이트: {updates}")
        print(f"  → 언어: {tracking.language_score}, 운동: {tracking.motor_score}, "
              f"인지: {tracking.cognitive_score}, 사회성: {tracking.social_score}, 정서: {tracking.emotional_score}")
    
    @staticmethod
    def get_category_scores(db: Session, user_id: int) -> Dict[str, int]:
        """사용자의 현재 영역별 점수 조회"""
        tracking = db.query(DevelopmentScoreTracking).filter_by(user_id=user_id).first()
        
        if tracking:
            return {
                "언어": tracking.language_score,
                "운동": tracking.motor_score,
                "인지": tracking.cognitive_score,
                "사회성": tracking.social_score,
                "정서": tracking.emotional_score,
            }
        else:
            # 초기값 (모두 70점)
            return {
                "언어": 70,
                "운동": 70,
                "인지": 70,
                "사회성": 70,
                "정서": 70,
            }
    
    @staticmethod
    def check_milestones(
        db: Session,
        user_id: int,
        age_months: int,
        development_events: List[Dict]
    ):
        """
        나이대별 Milestone 달성 여부 체크
        
        (향후 구현 예정 - Milestone 정의 필요)
        """
        # TODO: Milestone 정의 및 달성 여부 체크
        pass
    
    @staticmethod
    def apply_milestone_penalties(db: Session):
        """
        모든 사용자의 Milestone 미달성 기간 체크 및 감점 적용
        (일일 배치 작업용)
        
        (향후 구현 예정)
        """
        # TODO: 3-4일마다 미달성 Milestone에 대한 감점 적용
        pass
