"""클립 URL 즉시 수정"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from app.database.session import SessionLocal
from app.models.clip import HighlightClip

db = SessionLocal()

try:
    clips = db.query(HighlightClip).all()
    
    print(f"\n📊 총 {len(clips)}개 클립 발견\n")
    print("=" * 80)
    
    updated = 0
    for clip in clips:
        print(f"\n클립 ID: {clip.id}")
        print(f"제목: {clip.title}")
        
        # video_url 수정
        if clip.video_url:
            old_video = clip.video_url
            # 슬래시로 시작하지 않으면 추가
            if not clip.video_url.startswith('/'):
                clip.video_url = '/' + clip.video_url
                print(f"  ✅ Video: {old_video} -> {clip.video_url}")
                updated += 1
            else:
                print(f"  ✓ Video: {clip.video_url} (이미 정상)")
        
        # thumbnail_url 수정
        if clip.thumbnail_url:
            old_thumb = clip.thumbnail_url
            if not clip.thumbnail_url.startswith('/'):
                clip.thumbnail_url = '/' + clip.thumbnail_url
                print(f"  ✅ Thumb: {old_thumb} -> {clip.thumbnail_url}")
            else:
                print(f"  ✓ Thumb: {clip.thumbnail_url} (이미 정상)")
    
    if updated > 0:
        db.commit()
        print("\n" + "=" * 80)
        print(f"✅ {updated}개 URL 수정 완료!")
    else:
        print("\n" + "=" * 80)
        print("ℹ️  수정할 URL이 없습니다 (모두 정상)")
    
    # 최종 확인
    print("\n최종 상태 (샘플 3개):")
    print("=" * 80)
    for clip in clips[:3]:
        print(f"\nID {clip.id}: {clip.title}")
        print(f"  Video: {clip.video_url}")
        print(f"  Thumb: {clip.thumbnail_url}")
        print(f"  Duration: {clip.duration_seconds}초")
    
except Exception as e:
    print(f"\n❌ 오류 발생: {e}")
    import traceback
    traceback.print_exc()
    db.rollback()
finally:
    db.close()

print("\n" + "=" * 80)
print("완료! 브라우저를 새로고침하세요.")
print("=" * 80)
