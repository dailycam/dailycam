"""하이라이트 클립 API 라우터 - 실제 영상 자르기 및 다운로드 기능"""

from fastapi import APIRouter, Depends, Query, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional
from pathlib import Path
from datetime import timezone, timedelta, datetime

from app.database import get_db
from app.utils.auth_utils import get_current_user_id
from app.models.clip import HighlightClip
from app.models.live_monitoring.models import SegmentAnalysis
from app.services.highlight_clip_service import HighlightClipService

router = APIRouter()

# KST 타임존 정의
KST = timezone(timedelta(hours=9))


@router.get("/list")
def get_clip_highlights(
    category: Optional[str] = Query("all", description="카테고리 필터 (all/안전/발달)"),
    limit: int = Query(20, description="최대 클립 수"),
    target_date: Optional[str] = Query(None, description="조회할 날짜 (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    """
    하이라이트 클립 목록 조회 (인증 불필요)
    
    - target_date: 특정 날짜의 클립만 조회 (예: 2025-12-09)
    """
    import time
    start_time = time.time()
    
    # 기본 쿼리
    query = db.query(HighlightClip).order_by(HighlightClip.created_at.desc())
    
    # 날짜 필터링
    if target_date:
        try:
            from datetime import datetime
            target_dt = datetime.strptime(target_date, "%Y-%m-%d")
            # 해당 날짜의 00:00:00 ~ 23:59:59
            start_of_day = target_dt.replace(hour=0, minute=0, second=0, microsecond=0)
            end_of_day = target_dt.replace(hour=23, minute=59, second=59, microsecond=999999)
            
            # KST를 UTC로 변환 (DB는 UTC로 저장됨)
            from datetime import timedelta
            utc_start = start_of_day - timedelta(hours=9)
            utc_end = end_of_day - timedelta(hours=9)
            
            query = query.filter(
                HighlightClip.created_at >= utc_start,
                HighlightClip.created_at <= utc_end
            )
        except ValueError:
            raise HTTPException(status_code=400, detail="잘못된 날짜 형식입니다. YYYY-MM-DD 형식을 사용하세요.")
    
    # 카테고리 필터링
    if category and category != "all":
        query = query.filter(HighlightClip.category == category)
    
    # 제한
    clips = query.limit(limit).all()
    
    # 응답 형식 변환
    result = []
    for clip in clips:
        # UTC → KST 변환
        created_at_kst = None
        if clip.created_at:
            # naive datetime을 UTC로 간주
            if clip.created_at.tzinfo is None:
                created_at_utc = clip.created_at.replace(tzinfo=timezone.utc)
            else:
                created_at_utc = clip.created_at
            # KST로 변환
            created_at_kst = created_at_utc.astimezone(KST).isoformat()
        
        result.append({
            "id": clip.id,
            "title": clip.title,
            "description": clip.description or "",
            "video_url": clip.video_url,
            "thumbnail_url": clip.thumbnail_url or "",
            "download_url": f"/api/clips/download/{clip.id}",  # 다운로드 URL 추가
            "category": clip.category,
            "sub_category": clip.sub_category or "",
            "importance": clip.importance or "medium",
            "duration_seconds": clip.duration_seconds or 0,
            "created_at": created_at_kst,
        })
    
    elapsed_time = time.time() - start_time
    
    return {
        "total": len(result),
        "clips": result
    }


@router.post("/remove-duplicates")
def remove_duplicate_clips(
    db: Session = Depends(get_db)
):
    """중복 클립 제거 (제목, 설명, 생성시간 기준)"""
    all_clips = db.query(HighlightClip).order_by(HighlightClip.created_at.desc()).all()
    
    seen = set()
    duplicates = []
    
    for clip in all_clips:
        # 생성시간을 분 단위로 반올림
        created_minute = clip.created_at.replace(second=0, microsecond=0) if clip.created_at else None
        key = (clip.title, clip.description, created_minute)
        
        if key in seen:
            duplicates.append(clip)
        else:
            seen.add(key)
    
    # 중복 삭제
    for clip in duplicates:
        db.delete(clip)
    db.commit()
    
    return {
        "message": f"{len(duplicates)}개의 중복 클립 삭제 완료",
        "deleted_count": len(duplicates),
        "remaining_count": len(all_clips) - len(duplicates)
    }


@router.get("/download/{clip_id}")
async def download_clip(
    clip_id: int,
    db: Session = Depends(get_db)
):
    """
    클립 다운로드 (정적 파일로 직접 제공)
    
    - 인증 없이 직접 다운로드 가능
    - Content-Disposition: attachment 헤더 포함
    """
    clip = db.query(HighlightClip).filter(HighlightClip.id == clip_id).first()
    
    if not clip:
        raise HTTPException(status_code=404, detail="클립을 찾을 수 없습니다")
    
    # 파일 경로 (video_url에서 앞의 / 제거)
    file_path = Path(clip.video_url.lstrip('/'))
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="클립 파일이 존재하지 않습니다")
    
    # 파일명 생성
    safe_filename = f"{clip.title.replace(' ', '_').replace('/', '_')}_{clip_id}.mp4"
    
    return FileResponse(
        path=str(file_path),
        media_type="video/mp4",
        filename=safe_filename,
        headers={
            "Content-Disposition": f'attachment; filename="{safe_filename}"'
        }
    )


@router.delete("/{clip_id}")
async def delete_clip(
    clip_id: int,
    db: Session = Depends(get_db)
):
    """클립 삭제 (DB + 파일)"""
    clip = db.query(HighlightClip).filter(HighlightClip.id == clip_id).first()
    
    if not clip:
        raise HTTPException(status_code=404, detail="클립을 찾을 수 없습니다")
    
    # 파일 삭제
    try:
        if clip.video_url:
            video_path = Path(clip.video_url.lstrip("/"))
            if video_path.exists():
                video_path.unlink()
                print(f"[클립 삭제] ✅ 비디오 파일 삭제: {video_path}")
        
        if clip.thumbnail_url:
            thumb_path = Path(clip.thumbnail_url.lstrip("/"))
            if thumb_path.exists():
                thumb_path.unlink()
                print(f"[클립 삭제] ✅ 썸네일 파일 삭제: {thumb_path}")
    except Exception as e:
        print(f"[클립 삭제] ⚠️  파일 삭제 오류: {e}")
    
    # DB에서 삭제
    db.delete(clip)
    db.commit()
    
    return {"message": "클립이 삭제되었습니다", "clip_id": clip_id}


@router.get("/test-create")
async def test_create_clip(
    db: Session = Depends(get_db)
):
    """
    테스트용 클립 생성 엔드포인트
    
    - 완전히 생성된 아카이브 영상에서 10초~40초 구간을 잘라서 클립 생성
    - 가장 최근 파일은 아직 생성 중일 수 있으므로 두 번째로 최근 파일 사용
    """
    # 아카이브 디렉토리에서 완성된 영상 찾기
    archive_dir = Path("temp_videos/hls_buffer/camera-1/archive")
    
    if not archive_dir.exists():
        raise HTTPException(status_code=404, detail="아카이브 디렉토리가 없습니다")
    
    archive_videos = sorted(archive_dir.glob("archive_*.mp4"), reverse=True)
    
    if len(archive_videos) < 2:
        raise HTTPException(
            status_code=404, 
            detail=f"완성된 아카이브 영상이 부족합니다 (최소 2개 필요, 현재 {len(archive_videos)}개)"
        )
    
    # 가장 최근 파일은 아직 생성 중일 수 있으므로 두 번째 파일 사용
    source_video = archive_videos[1]
    
    
    # 클립 생성
    service = HighlightClipService()
    result = service.create_highlight_clip(
        source_video_path=str(source_video),
        start_time=10,  # 10초부터
        duration=30,    # 30초 길이
        title="테스트 하이라이트 클립",
        description="자동 생성된 테스트 클립입니다",
        category="safety",
        db=db
    )
    
    if not result:
        raise HTTPException(status_code=500, detail="클립 생성에 실패했습니다")
    
    return {
        "message": "테스트 클립이 생성되었습니다",
        "source_video": str(source_video),
        "clip": result
    }
