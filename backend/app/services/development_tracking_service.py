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
        
        # 2. VLM에서 관찰된 발달 행동 분석
        development_events = analysis_result.get("development_analysis", {}).get("development_events", [])
        
        if not development_events:
            print(f"[DevelopmentTracking] User {user_id}: 발달 이벤트 없음")
            return
        
        # 3. 카테고리별 이벤트 수 집계
        category_counts = {
            "언어": 0,
            "운동": 0,
            "인지": 0,
            "사회성": 0,
            "정서": 0,
        }
        
        for event in development_events:
            category = event.get("category", "")
            # 카테고리 매핑 (운동/언어/인지/사회성 → 한글)
            if category in ["운동", "대근육운동", "소근육운동"]:
                category_counts["운동"] += 1
            elif category in ["언어", "LANGUAGE"]:
                category_counts["언어"] += 1
            elif category in ["인지", "COGNITIVE"]:
                category_counts["인지"] += 1
            elif category in ["사회성", "SOCIAL"]:
                category_counts["사회성"] += 1
            elif category in ["정서", "EMOTIONAL"]:
                category_counts["정서"] += 1
        
        # 4. 카테고리별 가점 적용 (각 이벤트당 +1점, 최대 +10점)
        updates = {}
        if category_counts["언어"] > 0:
            points = min(10, category_counts["언어"])
            tracking.language_score = min(100, tracking.language_score + points)
            updates["언어"] = f"+{points}"
        
        if category_counts["운동"] > 0:
            points = min(10, category_counts["운동"])
            tracking.motor_score = min(100, tracking.motor_score + points)
            updates["운동"] = f"+{points}"
        
        if category_counts["인지"] > 0:
            points = min(10, category_counts["인지"])
            tracking.cognitive_score = min(100, tracking.cognitive_score + points)
            updates["인지"] = f"+{points}"
        
        if category_counts["사회성"] > 0:
            points = min(10, category_counts["사회성"])
            tracking.social_score = min(100, tracking.social_score + points)
            updates["사회성"] = f"+{points}"
        
        if category_counts["정서"] > 0:
            points = min(10, category_counts["정서"])
            tracking.emotional_score = min(100, tracking.emotional_score + points)
            updates["정서"] = f"+{points}"
        
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
            # 초기값 (모두 50점)
            return {
                "언어": 50,
                "운동": 50,
                "인지": 50,
                "사회성": 50,
                "정서": 50,
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
