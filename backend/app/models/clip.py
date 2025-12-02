"""HighlightClip model - 하이라이트 테이블"""

from sqlalchemy import Column, Integer, String, Enum
from app.database import Base
import enum


class ClipCategory(str, enum.Enum):
    """클립 대분류"""
    DEVELOPMENT = "발달"
    SAFETY = "안전"


class HighlightClip(Base):
    """하이라이트 클립 모델 - ClipHighlights.tsx의 카드 리스트"""
    __tablename__ = "highlight_clip"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)  # "배밀이 2미터 이동 성공!"
    video_url = Column(String(512), nullable=False)  # 영상 주소 (재생 버튼 클릭 시)
    thumbnail_url = Column(String(512), nullable=True)  # 썸네일 (카드 이미지)
    category = Column(Enum(ClipCategory), nullable=False)  # "발달", "안전" (탭 구분용)
    
    def __repr__(self):
        return f"<HighlightClip(id={self.id}, title={self.title}, category={self.category})>"

