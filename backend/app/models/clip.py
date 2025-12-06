"""HighlightClip model - 하이라이트 테이블"""

from sqlalchemy import Column, Integer, String, Text, Enum, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class ClipCategory(str, enum.Enum):
    """클립 대분류"""
    DEVELOPMENT = "발달"
    SAFETY = "안전"


class HighlightClip(Base):
    """하이라이트 클립 모델 - ClipHighlights.tsx의 카드 리스트"""
    __tablename__ = "highlight_clip"
    
    # 기본 필드
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)  # "배밀이 2미터 이동 성공!"
    description = Column(Text, nullable=True)  # 클립 상세 설명
    video_url = Column(String(512), nullable=False)  # 영상 주소 (재생 버튼 클릭 시)
    thumbnail_url = Column(String(512), nullable=True)  # 썸네일 (카드 이미지)
    category = Column(Enum(ClipCategory), nullable=False)  # "발달", "안전" (탭 구분용)
    
    # 추가 메타데이터
    sub_category = Column(String(100), nullable=True)  # "운동 발달", "주방 접근" 등
    importance = Column(String(20), nullable=True)  # "high", "medium", "low"
    duration_seconds = Column(Integer, nullable=True)  # 클립 재생 시간 (초)
    
    # 타임스탬프
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # 관계: 어느 분석에서 생성되었는지 추적
    analysis_log_id = Column(Integer, ForeignKey("analysis_log.id"), nullable=True, index=True)
    analysis_log = relationship("AnalysisLog", backref="highlight_clips")
    
    def __repr__(self):
        return f"<HighlightClip(id={self.id}, title={self.title}, category={self.category})>"

