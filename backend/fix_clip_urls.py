"""기존 클립 URL 수정 - 슬래시 추가"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from app.database.session import SessionLocal
from app.models.clip import HighlightClip

db = SessionLocal()

try:
    clips = db.query(HighlightClip).all()
    
    print(f"\n총 {len(clips)}개 클립 수정 시작...\n")
    
    updated = 0
    for clip in clips:
        # video_url 수정
        if clip.video_url and not clip.video_url.startswith('/'):
            old_url = clip.video_url
            clip.video_url = '/' + clip.video_url
            print(f"✅ Video URL 수정: {old_url} -> {clip.video_url}")
            updated += 1
        
        # thumbnail_url 수정
        if clip.thumbnail_url and not clip.thumbnail_url.startswith('/'):
            old_url = clip.thumbnail_url
            clip.thumbnail_url = '/' + clip.thumbnail_url
            print(f"✅ Thumbnail URL 수정: {old_url} -> {clip.thumbnail_url}")
    
    db.commit()
    print(f"\n✅ 총 {updated}개 클립 URL 수정 완료!")
    
    # 확인
    print("\n수정된 클립 샘플:")
    print("=" * 80)
    for clip in clips[:3]:
        print(f"\nID: {clip.id}")
        print(f"제목: {clip.title}")
        print(f"비디오: {clip.video_url}")
        print(f"썸네일: {clip.thumbnail_url}")
    
except Exception as e:
    print(f"❌ 오류: {e}")
    import traceback
    traceback.print_exc()
    db.rollback()
finally:
    db.close()
