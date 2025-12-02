"""Development Tracking models - 발달 점수 추적 테이블들"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


# ============================================================================
# DevelopmentScoreTracking (발달 점수 추적 테이블)
# ============================================================================

class DevelopmentScoreTracking(Base):
    """사용자별 영역별 발달 점수 누적 추적"""
    __tablename__ = "development_score_tracking"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    
    # 5개 영역 점수 (0-100, 기본값 50)
    language_score = Column(Integer, default=50, nullable=False)      # 언어
    motor_score = Column(Integer, default=50, nullable=False)         # 운동
    cognitive_score = Column(Integer, default=50, nullable=False)     # 인지
    social_score = Column(Integer, default=50, nullable=False)        # 사회성
    emotional_score = Column(Integer, default=50, nullable=False)     # 정서
    
    # 마지막 업데이트 시각
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 관계
    user = relationship("User", backref="development_tracking")
    
    def __repr__(self):
        return f"<DevelopmentScoreTracking(user_id={self.user_id}, language={self.language_score}, motor={self.motor_score})>"


# ============================================================================
# DevelopmentMilestoneTracking (발달 이정표 추적 테이블)
# ============================================================================

class DevelopmentMilestoneTracking(Base):
    """나이대별 필수 행동(milestone) 달성 추적"""
    __tablename__ = "development_milestone_tracking"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    age_months = Column(Integer, nullable=False, index=True)      # 12, 15, 18...
    
    # Milestone 정보
    category = Column(String(20), nullable=False, index=True)     # "언어", "운동", "인지", "사회성", "정서"
    milestone_name = Column(String(255), nullable=False)          # "혼자 걷기", "단어 10개 사용", ...
    
    # 달성 여부
    achieved = Column(Boolean, default=False, nullable=False)
    first_achieved_at = Column(DateTime(timezone=True), nullable=True)
    
    # 미달성 추적
    days_unachieved = Column(Integer, default=0, nullable=False)  # 미달성 일수
    penalty_applied = Column(Integer, default=0, nullable=False)  # 적용된 감점 (-1, -2, -3, ...)
    last_checked_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 생성 시각
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 관계
    user = relationship("User", backref="milestone_tracking")
    
    def __repr__(self):
        return f"<DevelopmentMilestoneTracking(user_id={self.user_id}, milestone={self.milestone_name}, achieved={self.achieved})>"
