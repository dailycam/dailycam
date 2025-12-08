"""하이라이트 클립 API 라우터 - 실제 영상 자르기 및 다운로드 기능"""

from fastapi import APIRouter, Depends, Query, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional
from pathlib import Path
from datetime import timezone, timedelta

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
    category: str = Query(None, description="필터링할 카테고리: 발달, 안전, all"),
    limit: int = Query(20, description="가져올 클립 수"),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """
    하이라이트 클립 목록 조회
    """
    # 기본 쿼리
    query = db.query(HighlightClip).order_by(HighlightClip.created_at.desc())
    
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
    
    return {
        "clips": result,
        "total": len(result),
    }


@router.post("/remove-duplicates")
def remove_duplicate_clips(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
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



@router.post("/create")
async def create_highlight_clip(
    source_video: str = Query(..., description="원본 비디오 파일 경로"),
    start_time: float = Query(..., description="시작 시간 (초)"),
    duration: float = Query(30, description="클립 길이 (초)"),
    title: str = Query(..., description="클립 제목"),
    description: str = Query("", description="클립 설명"),
    category: str = Query("safety", description="카테고리 (safety/development)"),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """
    하이라이트 클립 생성 (FFmpeg로 실제 영상 자르기)
    
    예시:
    - source_video: "temp_videos/hls_buffer/camera-1/archive/archive_20251208_120000.mp4"
    - start_time: 10.5 (10.5초부터 시작)
    - duration: 30 (30초 길이)
    - title: "위험 행동 감지"
    """
    service = HighlightClipService()
    
    result = service.create_highlight_clip(
        source_video_path=source_video,
        start_time=start_time,
        duration=duration,
        title=title,
        description=description,
        category=category,
        db=db
    )
    
    if not result:
        raise HTTPException(status_code=500, detail="클립 생성에 실패했습니다")
    
    return {
        "message": "클립이 생성되었습니다",
        "clip": result
    }


@router.post("/generate-from-segment/{segment_id}")
async def generate_clip_from_segment(
    segment_id: int,
    event_index: int = Query(0, description="이벤트 인덱스 (0부터 시작)"),
    event_type: str = Query("safety", description="이벤트 타입 (safety/development)"),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """
    세그먼트 분석 결과에서 자동으로 클립 생성
    
    - 안전 이벤트 또는 발달 마일스톤에서 클립 추출
    - 이벤트 전후 15초씩, 총 30초 클립 생성
    """
    # 세그먼트 분석 조회
    segment_analysis = db.query(SegmentAnalysis).filter(
        SegmentAnalysis.id == segment_id,
        SegmentAnalysis.status == 'completed'
    ).first()
    
    if not segment_analysis:
        raise HTTPException(status_code=404, detail="분석 결과를 찾을 수 없습니다")
    
    # 이벤트 데이터 가져오기
    if event_type == "safety":
        events = segment_analysis.safety_incidents or []
    else:
        events = segment_analysis.development_milestones or []
    
    if not events or event_index >= len(events):
        raise HTTPException(status_code=404, detail="해당 이벤트를 찾을 수 없습니다")
    
    event_data = events[event_index]
    
    # 클립 생성
    service = HighlightClipService(camera_id=segment_analysis.camera_id)
    result = service.create_clip_from_segment_analysis(
        segment_analysis=segment_analysis,
        event_data=event_data,
        event_type=event_type,
        db=db
    )
    
    if not result:
        raise HTTPException(status_code=500, detail="클립 생성에 실패했습니다")
    
    return {
        "message": "클립이 생성되었습니다",
        "clip": result
    }


@router.get("/download/{clip_id}")
async def download_clip(
    clip_id: int,
    token: str = Query(None, description="인증 토큰 (URL 파라미터)"),
    db: Session = Depends(get_db)
):
    """
    클립 다운로드
    
    - 브라우저에서 파일로 다운로드
    - Content-Disposition: attachment 헤더 포함
    - URL 파라미터로 토큰 전달 가능 (?token=...)
    """
    # URL 파라미터로 토큰이 전달된 경우 검증
    if token:
        from app.utils.auth_utils import verify_token
        from jose import JWTError
        try:
            payload = verify_token(token, db=None)  # 블랙리스트 체크 스킵
            print(f"[다운로드] 토큰 검증 성공: user_id={payload.get('user_id')}")
        except JWTError as e:
            print(f"[다운로드] JWT 오류: {e}")
            raise HTTPException(status_code=401, detail=f"유효하지 않은 토큰입니다: {str(e)}")
        except Exception as e:
            print(f"[다운로드] 토큰 검증 오류: {e}")
            raise HTTPException(status_code=401, detail=f"토큰 검증 실패: {str(e)}")
    else:
        raise HTTPException(status_code=401, detail="토큰이 필요합니다")
    
    clip = db.query(HighlightClip).filter(HighlightClip.id == clip_id).first()
    
    if not clip:
        raise HTTPException(status_code=404, detail="클립을 찾을 수 없습니다")
    
    # 파일 경로 (video_url에서 앞의 / 제거)
    file_path = Path(clip.video_url.lstrip('/'))
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="클립 파일이 존재하지 않습니다")
    
    # 파일명 생성 (한글 제목 -> 영문 변환)
    safe_filename = f"dailycam_highlight_{clip_id}.mp4"
    
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
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
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
    
    print(f"[테스트 클립] 원본 영상 선택: {source_video.name}")
    print(f"[테스트 클립] 파일 크기: {source_video.stat().st_size / (1024*1024):.2f} MB")
    
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


@router.post("/cleanup-old-clips")
async def cleanup_old_clips(
    db: Session = Depends(get_db)
):
    """
    구버전 클립 데이터 삭제 (인증 불필요)
    
    - video_url이 /temp_videos/로 시작하는 것 (아카이브 참조) 삭제
    - 신버전 /videos/highlights/ 클립만 유지
    """
    # 구버전 클립 찾기
    old_clips = db.query(HighlightClip).filter(
        HighlightClip.video_url.like('/temp_videos/%')
    ).all()
    
    # 신버전 클립 개수
    new_clips_count = db.query(HighlightClip).filter(
        HighlightClip.video_url.like('/videos/highlights/%')
    ).count()
    
    old_count = len(old_clips)
    
    # 삭제
    for clip in old_clips:
        db.delete(clip)
    
    db.commit()
    
    return {
        "message": f"구버전 클립 {old_count}개 삭제 완료",
        "deleted_count": old_count,
        "remaining_count": new_clips_count
    }

