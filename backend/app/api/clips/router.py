"""Clip Highlights API Router"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.utils.auth_utils import get_current_user_id
from app.models.clip import HighlightClip

router = APIRouter()


@router.get("/list")
def get_clip_highlights(
    category: str = Query(None, description="필터링할 카테고리: 발달, 안전, all"),
    limit: int = Query(20, description="가져올 클립 수"),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """
    하이라이트 클립 목록 조회
    """
    # 기본 쿼리 (user_id는 없으므로 전체 클립 반환, 실제로는 user_id 추가 필요)
    query = db.query(HighlightClip).order_by(HighlightClip.created_at.desc())
    
    # 카테고리 필터링
    if category and category != "all":
        query = query.filter(HighlightClip.category == category)
    
    # 제한
    clips = query.limit(limit).all()
    
    # 응답 형식 변환
    result = []
    for clip in clips:
        result.append({
            "id": clip.id,
            "title": clip.title,
            "description": clip.description or "",
            "video_url": clip.video_url,
            "thumbnail_url": clip.thumbnail_url or "",
            "category": clip.category,
            "sub_category": clip.sub_category or "",
            "importance": clip.importance or "medium",
            "duration_seconds": clip.duration_seconds or 0,
            "created_at": clip.created_at.isoformat() if clip.created_at else None,
        })
    
    return {
        "clips": result,
        "total": len(result),
    }
