"""Clip Highlights API Router"""

from fastapi import APIRouter, Depends, Query, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.utils.auth_utils import get_current_user_id
from app.models.clip import HighlightClip
from app.models.live_monitoring.models import SegmentAnalysis
from app.services.clip_generator import ClipGenerator, generate_clips_for_segment

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


@router.post("/generate/{camera_id}")
async def generate_clips_from_analysis(
    camera_id: str,
    segment_analysis_id: Optional[int] = Query(None, description="특정 세그먼트 분석 ID (없으면 최근 분석 사용)"),
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """
    세그먼트 분석 결과에서 클립 생성
    
    - segment_analysis_id가 주어지면 해당 분석 결과에서 클립 생성
    - 없으면 가장 최근 완료된 분석 결과 사용
    """
    # 세그먼트 분석 조회
    if segment_analysis_id:
        segment_analysis = db.query(SegmentAnalysis).filter(
            SegmentAnalysis.id == segment_analysis_id,
            SegmentAnalysis.camera_id == camera_id
        ).first()
    else:
        # 가장 최근 완료된 분석
        segment_analysis = db.query(SegmentAnalysis).filter(
            SegmentAnalysis.camera_id == camera_id,
            SegmentAnalysis.status == 'completed'
        ).order_by(SegmentAnalysis.completed_at.desc()).first()
    
    if not segment_analysis:
        raise HTTPException(status_code=404, detail="분석 결과를 찾을 수 없습니다")
    
    if segment_analysis.status != 'completed':
        raise HTTPException(status_code=400, detail="분석이 완료되지 않았습니다")
    
    # 백그라운드에서 클립 생성
    if background_tasks:
        background_tasks.add_task(
            generate_clips_for_segment,
            camera_id,
            segment_analysis.id
        )
        
        return {
            "message": "클립 생성이 시작되었습니다",
            "segment_analysis_id": segment_analysis.id,
            "segment_start": segment_analysis.segment_start.isoformat(),
            "segment_end": segment_analysis.segment_end.isoformat(),
        }
    else:
        # 동기 실행
        generator = ClipGenerator(camera_id)
        clips = await generator.generate_clips_from_segment_analysis(segment_analysis, db)
        
        return {
            "message": f"{len(clips)}개의 클립이 생성되었습니다",
            "clips_created": len(clips),
            "segment_analysis_id": segment_analysis.id,
        }


@router.delete("/{clip_id}")
async def delete_clip(
    clip_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """클립 삭제"""
    clip = db.query(HighlightClip).filter(HighlightClip.id == clip_id).first()
    
    if not clip:
        raise HTTPException(status_code=404, detail="클립을 찾을 수 없습니다")
    
    # 파일 삭제 (선택사항)
    from pathlib import Path
    try:
        if clip.video_url:
            video_path = Path("backend") / clip.video_url.lstrip("/")
            if video_path.exists():
                video_path.unlink()
        
        if clip.thumbnail_url:
            thumb_path = Path("backend") / clip.thumbnail_url.lstrip("/")
            if thumb_path.exists():
                thumb_path.unlink()
    except Exception as e:
        print(f"파일 삭제 오류: {e}")
    
    db.delete(clip)
    db.commit()
    
    return {"message": "클립이 삭제되었습니다", "clip_id": clip_id}


@router.post("/fix-existing-clips")
def fix_existing_clips(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """
    기존 클립 데이터를 아카이브 영상으로 업데이트 (임시 엔드포인트)
    """
    from pathlib import Path
    
    # 모든 클립 조회
    clips = db.query(HighlightClip).all()
    
    # 아카이브 디렉토리
    archive_dir = Path("temp_videos/hls_buffer/camera-1/archive")
    archive_videos = sorted(archive_dir.glob("archive_*.mp4"))
    
    if not archive_videos:
        raise HTTPException(status_code=404, detail="아카이브 영상이 없습니다")
    
    updated_count = 0
    for idx, clip in enumerate(clips):
        # 아카이브 영상 중 하나를 순서대로 선택
        archive_video = archive_videos[idx % len(archive_videos)]
        
        # 비디오 URL 업데이트 (슬래시 확실히 추가)
        video_url = f"/temp_videos/hls_buffer/camera-1/archive/{archive_video.name}"
        clip.video_url = video_url if video_url.startswith('/') else '/' + video_url
        
        # 썸네일 URL 업데이트 (슬래시 확실히 추가)
        thumbnail_name = archive_video.stem + ".jpg"
        thumbnail_url = f"/temp_videos/hls_buffer/camera-1/archive/thumbnails/{thumbnail_name}"
        clip.thumbnail_url = thumbnail_url if thumbnail_url.startswith('/') else '/' + thumbnail_url
        
        # 재생 시간 설정 (10분 = 600초)
        if not clip.duration_seconds or clip.duration_seconds == 0:
            clip.duration_seconds = 600
        
        updated_count += 1
    
    db.commit()
    
    return {
        "message": f"{updated_count}개의 클립이 업데이트되었습니다",
        "updated_count": updated_count,
        "archive_videos_count": len(archive_videos)
    }
