"""모든 클립 삭제 후 새로 생성"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from app.database.session import SessionLocal
from app.models.clip import HighlightClip, ClipCategory
from app.models.live_monitoring.models import SegmentAnalysis

db = SessionLocal()

try:
    # 1. 기존 클립 모두 삭제
    old_count = db.query(HighlightClip).count()
    db.query(HighlightClip).delete()
    db.commit()
    print(f"✅ 기존 클립 {old_count}개 삭제 완료\n")
    
    # 2. 아카이브 영상 목록 가져오기
    archive_dir = Path("temp_videos/hls_buffer/camera-1/archive")
    archive_videos = sorted(archive_dir.glob("archive_*.mp4"))[:10]  # 최근 10개만
    
    print(f"📁 아카이브 영상 {len(archive_videos)}개 발견\n")
    
    # 3. 최근 완료된 분석 결과 가져오기
    segments = db.query(SegmentAnalysis).filter(
        SegmentAnalysis.status == 'completed',
        SegmentAnalysis.camera_id == 'camera-1'
    ).order_by(SegmentAnalysis.completed_at.desc()).limit(10).all()
    
    print(f"📊 완료된 분석 {len(segments)}개 발견\n")
    print("=" * 80)
    
    # 4. 각 분석 결과에서 클립 생성
    total_clips = 0
    
    for idx, segment in enumerate(segments):
        if idx >= len(archive_videos):
            break
            
        archive_video = archive_videos[idx]
        
        # 안전 이벤트 클립
        if segment.safety_incidents:
            for incident in segment.safety_incidents:
                severity = incident.get('severity', '').lower()
                if severity in ['danger', 'warning', '위험', '주의']:
                    clip = HighlightClip(
                        title=incident.get('title', '안전 이벤트'),
                        description=incident.get('description', ''),
                        video_url=f"/temp_videos/hls_buffer/camera-1/archive/{archive_video.name}",
                        thumbnail_url=f"/temp_videos/hls_buffer/camera-1/archive/thumbnails/{archive_video.stem}.jpg",
                        category=ClipCategory.SAFETY,
                        sub_category=incident.get('category', '안전'),
                        importance='high' if severity in ['danger', '위험'] else 'medium',
                        duration_seconds=600
                    )
                    db.add(clip)
                    total_clips += 1
                    print(f"✅ 안전 클립 생성: {clip.title}")
        
        # 발달 이벤트 클립
        if segment.development_milestones:
            for milestone in segment.development_milestones:
                if milestone.get('present', False) and milestone.get('frequency', 0) >= 1:
                    title = milestone.get('name', '발달 행동')
                    category_name = milestone.get('category', '발달')
                    
                    clip = HighlightClip(
                        title=f"[{category_name}] {title}",
                        description=f"빈도: {milestone.get('frequency', 0)}회",
                        video_url=f"/temp_videos/hls_buffer/camera-1/archive/{archive_video.name}",
                        thumbnail_url=f"/temp_videos/hls_buffer/camera-1/archive/thumbnails/{archive_video.stem}.jpg",
                        category=ClipCategory.DEVELOPMENT,
                        sub_category=category_name,
                        importance='high' if milestone.get('frequency', 0) >= 3 else 'medium',
                        duration_seconds=600
                    )
                    db.add(clip)
                    total_clips += 1
                    print(f"✅ 발달 클립 생성: {clip.title}")
    
    # 5. 커밋
    db.commit()
    
    print("\n" + "=" * 80)
    print(f"✅ 총 {total_clips}개 클립 생성 완료!")
    print("=" * 80)
    
    # 6. 확인
    clips = db.query(HighlightClip).limit(3).all()
    print("\n생성된 클립 샘플:")
    for clip in clips:
        print(f"\nID: {clip.id}")
        print(f"제목: {clip.title}")
        print(f"비디오: {clip.video_url}")
        print(f"썸네일: {clip.thumbnail_url}")
    
    print("\n✅ 완료! 브라우저를 새로고침하세요.")
    
except Exception as e:
    print(f"\n❌ 오류: {e}")
    import traceback
    traceback.print_exc()
    db.rollback()
finally:
    db.close()
