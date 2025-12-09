"""Clip Highlights API Router"""

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime, timedelta
from typing import Optional

from app.database import get_db
from app.utils.auth_utils import get_current_user_id
from app.models.clip import HighlightClip, ClipCategory

router = APIRouter()


@router.get("/list")
async def get_highlight_clips(
    category: Optional[str] = Query(None, description="클립 카테고리 (발달/안전/all)"),
    limit: int = Query(50, description="최대 클립 수"),
    offset: int = Query(0, description="오프셋"),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """
    하이라이트 클립 목록 조회
    
    - category: "발달", "안전", 또는 "all" (선택사항)
    - limit: 최대 클립 수 (기본 50개)
    - offset: 페이지네이션용 오프셋
    """
    query = db.query(HighlightClip)
    
    # 카테고리 필터링 (all이 아닌 경우에만)
    if category and category != "all":
        try:
            clip_category = ClipCategory(category)
            query = query.filter(HighlightClip.category == clip_category)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"유효하지 않은 카테고리입니다. '발달', '안전', 또는 'all'을 사용하세요."
            )
    
    # 최신순 정렬
    query = query.order_by(desc(HighlightClip.created_at))
    
    # 전체 개수
    total = query.count()
    
    # 페이지네이션
    clips = query.offset(offset).limit(limit).all()
    
    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "clips": [
            {
                "id": clip.id,
                "title": clip.title,
                "description": clip.description,
                "video_url": clip.video_url,
                "thumbnail_url": clip.thumbnail_url,
                "category": clip.category.value if clip.category else None,
                "sub_category": clip.sub_category,
                "importance": clip.importance,
                "duration_seconds": clip.duration_seconds,
                "created_at": clip.created_at.isoformat() if clip.created_at else None,
                "analysis_log_id": clip.analysis_log_id
            }
            for clip in clips
        ]
    }


@router.get("/highlights/{clip_id}")
async def get_highlight_clip(
    clip_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """
    특정 하이라이트 클립 상세 조회
    """
    clip = db.query(HighlightClip).filter(HighlightClip.id == clip_id).first()
    
    if not clip:
        raise HTTPException(status_code=404, detail="클립을 찾을 수 없습니다")
    
    return {
        "id": clip.id,
        "title": clip.title,
        "description": clip.description,
        "video_url": clip.video_url,
        "thumbnail_url": clip.thumbnail_url,
        "category": clip.category.value if clip.category else None,
        "sub_category": clip.sub_category,
        "importance": clip.importance,
        "duration_seconds": clip.duration_seconds,
        "created_at": clip.created_at.isoformat() if clip.created_at else None,
        "analysis_log_id": clip.analysis_log_id
    }


@router.get("/recent")
async def get_recent_clips(
    days: int = Query(7, description="최근 N일"),
    limit: int = Query(10, description="최대 클립 수"),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """
    최근 N일 내의 하이라이트 클립 조회
    """
    since = datetime.now() - timedelta(days=days)
    
    clips = db.query(HighlightClip).filter(
        HighlightClip.created_at >= since
    ).order_by(desc(HighlightClip.created_at)).limit(limit).all()
    
    return {
        "days": days,
        "total": len(clips),
        "clips": [
            {
                "id": clip.id,
                "title": clip.title,
                "description": clip.description,
                "video_url": clip.video_url,
                "thumbnail_url": clip.thumbnail_url,
                "category": clip.category.value if clip.category else None,
                "sub_category": clip.sub_category,
                "importance": clip.importance,
                "duration_seconds": clip.duration_seconds,
                "created_at": clip.created_at.isoformat() if clip.created_at else None
            }
            for clip in clips
        ]
    }
