"""Analysis and safety event models for AI video analysis"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, Float, Boolean, Enum as SQLEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class EventSeverity(str, enum.Enum):
    """사건 심각도"""
    ACCIDENT = "사고"      # 실제 사고 발생
    DANGER = "위험"        # 위험 상황
    WARNING = "주의"       # 주의 필요
    RECOMMEND = "권장"     # 권장 사항


class EventType(str, enum.Enum):
    """사건 유형"""
    FALL = "낙상"
    COLLISION = "충돌"
    EDGE_APPROACH = "침대가장자리"
    ACTIVE_MOVEMENT = "활발한움직임"
    SLEEP_POSTURE = "수면자세"
    OTHER = "기타"


class DevelopmentCategory(str, enum.Enum):
    """발달 카테고리"""
    MOTOR = "신체/운동"        # 소근육, 대근육
    COGNITIVE = "인지/사고"    # 문제해결, 탐구
    LANGUAGE = "언어/의사소통"
    SOCIAL = "사회/정서"
    CREATIVE = "창의성"
    OTHER = "기타"


class AnalysisLog(Base):
    """VLM 비디오 분석 결과 저장 모델"""
    __tablename__ = "analysis_logs"
    
    # 기본 컬럼
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # 영상 정보
    video_filename = Column(String(500), nullable=True)
    video_path = Column(String(1000), nullable=True)
    video_duration_seconds = Column(Float, nullable=True)
    
    # VLM 분석 원본 데이터 (JSON) - 필요 시 참고용
    analysis_result = Column(JSON, nullable=True)
    
    # 핵심 메타데이터 (빠른 조회를 위해 별도 컬럼으로 저장)
    assumed_stage = Column(String(50), nullable=True, index=True)
    age_months = Column(Integer, nullable=True)
    
    # --- Group A: 안전 관련 컬럼 ---
    safety_score = Column(Integer, nullable=True, index=True)
    overall_safety_level = Column(String(50), nullable=True)
    safety_summary = Column(Text, nullable=True)  # 부모님께 보여줄 안전 요약 텍스트
    
    # --- Group B: 발달 관련 컬럼 ---
    development_score = Column(Integer, nullable=True)  # 발달 점수
    main_activity = Column(String(100), nullable=True)  # 주요 활동 (예: "블록 쌓기", "낮잠")
    development_summary = Column(Text, nullable=True)   # 부모님께 보여줄 발달 요약 텍스트
    
    # AI 설정 파라미터
    ai_temperature = Column(Float, nullable=True)
    ai_top_k = Column(Integer, nullable=True)
    ai_top_p = Column(Float, nullable=True)
    
    # 타임스탬프
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", backref="analysis_logs")
    
    def __repr__(self):
        return f"<AnalysisLog(id={self.id}, user_id={self.user_id}, stage={self.assumed_stage}, safety={self.safety_score})>"


class SafetyEvent(Base):
    """안전 사건/이벤트 모델 (타임라인용)"""
    __tablename__ = "safety_events"
    
    # 기본 컬럼
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    analysis_log_id = Column(Integer, ForeignKey("analysis_logs.id", ondelete="CASCADE"), nullable=True)
    
    # 사건 정보
    severity = Column(SQLEnum(EventSeverity), nullable=False, index=True)
    event_type = Column(SQLEnum(EventType), nullable=False, index=True)
    description = Column(Text, nullable=False)
    
    # 시간 정보
    timestamp_range = Column(String(50), nullable=True)
    event_hour = Column(Integer, nullable=True, index=True)
    event_timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    
    # 안전 장치 및 결과
    has_safety_device = Column(Boolean, nullable=True)
    estimated_outcome = Column(String(200), nullable=True)
    resolved = Column(Boolean, default=False)
    
    # 클립 연동
    has_clip = Column(Boolean, default=False)
    
    # 타임스탬프
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", backref="safety_events")
    analysis_log = relationship("AnalysisLog", backref="safety_events")
    
    def __repr__(self):
        return f"<SafetyEvent(id={self.id}, type={self.event_type}, severity={self.severity})>"


class DevelopmentEvent(Base):
    """발달 관련 주요 행동/이벤트 모델"""
    __tablename__ = "development_events"
    
    # 기본 컬럼
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    analysis_log_id = Column(Integer, ForeignKey("analysis_logs.id", ondelete="CASCADE"), nullable=True)
    
    # 발달 정보
    category = Column(SQLEnum(DevelopmentCategory), nullable=False, index=True)
    activity_name = Column(String(100), nullable=False)  # 행동 이름 (예: "블록 3개 쌓기")
    description = Column(Text, nullable=False)  # 상세 설명 (칭찬 멘트 등)
    
    # 시간 정보
    event_timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    
    # 클립 연동 (하이라이트 여부)
    is_highlight_candidate = Column(Boolean, default=False)  # 하이라이트로 쓸만한가?
    has_clip = Column(Boolean, default=False)
    
    # 타임스탬프
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", backref="development_events")
    analysis_log = relationship("AnalysisLog", backref="development_events")
    
    def __repr__(self):
        return f"<DevelopmentEvent(id={self.id}, category={self.category}, activity={self.activity_name})>"
