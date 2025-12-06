"""SQL로 직접 클립 URL 업데이트"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from app.database.session import SessionLocal
from sqlalchemy import text

db = SessionLocal()

try:
    # 1. 현재 상태 확인
    result = db.execute(text("SELECT id, title, video_url, thumbnail_url FROM highlight_clip LIMIT 3"))
    print("\n현재 상태:")
    print("=" * 80)
    for row in result:
        print(f"ID {row.id}: {row.title}")
        print(f"  Video: {row.video_url}")
        print(f"  Thumb: {row.thumbnail_url}")
        print()
    
    # 2. video_url 업데이트 (슬래시로 시작하지 않는 것만)
    update_video = text("""
        UPDATE highlight_clip 
        SET video_url = '/' || video_url 
        WHERE video_url NOT LIKE '/%'
    """)
    result_video = db.execute(update_video)
    print(f"✅ Video URL 업데이트: {result_video.rowcount}개")
    
    # 3. thumbnail_url 업데이트 (슬래시로 시작하지 않는 것만)
    update_thumb = text("""
        UPDATE highlight_clip 
        SET thumbnail_url = '/' || thumbnail_url 
        WHERE thumbnail_url NOT LIKE '/%' AND thumbnail_url != ''
    """)
    result_thumb = db.execute(update_thumb)
    print(f"✅ Thumbnail URL 업데이트: {result_thumb.rowcount}개")
    
    # 4. 커밋
    db.commit()
    print("\n✅ DB 커밋 완료!")
    
    # 5. 최종 확인
    result = db.execute(text("SELECT id, title, video_url, thumbnail_url FROM highlight_clip LIMIT 3"))
    print("\n최종 상태:")
    print("=" * 80)
    for row in result:
        print(f"ID {row.id}: {row.title}")
        print(f"  Video: {row.video_url}")
        print(f"  Thumb: {row.thumbnail_url}")
        print()
    
    print("=" * 80)
    print("✅ 완료! 브라우저를 새로고침하세요.")
    print("=" * 80)
    
except Exception as e:
    print(f"\n❌ 오류: {e}")
    import traceback
    traceback.print_exc()
    db.rollback()
finally:
    db.close()
