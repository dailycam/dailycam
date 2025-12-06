"""기존 클립 데이터 수정 - 아카이브 영상을 직접 사용"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from app.database.session import get_db
from app.models.clip import HighlightClip
from datetime import datetime

db = next(get_db())

try:
    # 모든 클립 조회
    clips = db.query(HighlightClip).all()
    
    print(f"\n총 {len(clips)}개의 클립 발견")
    print("=" * 80)
    
    # 아카이브 디렉토리
    archive_dir = Path("temp_videos/hls_buffer/camera-1/archive")
    archive_videos = sorted(archive_dir.glob("archive_*.mp4"))
    
    if not archive_videos:
        print("❌ 아카이브 영상이 없습니다!")
        sys.exit(1)
    
    print(f"✅ 아카이브 영상 {len(archive_videos)}개 발견\n")
    
    # 각 클립 업데이트
    updated_count = 0
    for idx, clip in enumerate(clips):
        # 아카이브 영상 중 하나를 랜덤하게 선택 (또는 순서대로)
        archive_video = archive_videos[idx % len(archive_videos)]
        
        # 비디오 URL 업데이트 (아카이브 영상 직접 사용)
        clip.video_url = f"/temp_videos/hls_buffer/camera-1/archive/{archive_video.name}"
        
        # 썸네일 URL 업데이트 (아카이브 썸네일 사용)
        thumbnail_name = archive_video.stem + ".jpg"
        clip.thumbnail_url = f"/temp_videos/hls_buffer/camera-1/archive/thumbnails/{thumbnail_name}"
        
        # 재생 시간 설정 (10분 = 600초)
        if not clip.duration_seconds or clip.duration_seconds == 0:
            clip.duration_seconds = 600
        
        updated_count += 1
        print(f"✅ 클립 #{clip.id} 업데이트: {clip.title[:30]}...")
    
    # DB 커밋
    db.commit()
    
    print("\n" + "=" * 80)
    print(f"✅ 총 {updated_count}개 클립 업데이트 완료!")
    print("\n업데이트된 클립 샘플:")
    print("-" * 80)
    
    sample_clips = db.query(HighlightClip).limit(3).all()
    for clip in sample_clips:
        print(f"\nID: {clip.id}")
        print(f"제목: {clip.title}")
        print(f"비디오: {clip.video_url}")
        print(f"썸네일: {clip.thumbnail_url}")
        print(f"재생시간: {clip.duration_seconds}초")
    
except Exception as e:
    print(f"❌ 오류 발생: {e}")
    import traceback
    traceback.print_exc()
    db.rollback()
finally:
    db.close()
