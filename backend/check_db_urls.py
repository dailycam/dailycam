"""현재 DB 상태 확인"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from app.database.session import SessionLocal
from sqlalchemy import text

db = SessionLocal()

try:
    # 클립 개수 확인
    count = db.execute(text("SELECT COUNT(*) FROM highlight_clip")).scalar()
    print(f"\n📊 총 클립 개수: {count}개\n")
    
    # 상위 5개 클립 확인
    result = db.execute(text("""
        SELECT id, title, video_url, thumbnail_url, duration_seconds 
        FROM highlight_clip 
        ORDER BY id 
        LIMIT 5
    """))
    
    print("=" * 100)
    print("현재 DB에 저장된 클립 URL:")
    print("=" * 100)
    
    for row in result:
        print(f"\nID: {row.id}")
        print(f"제목: {row.title}")
        print(f"비디오 URL: '{row.video_url}'")
        print(f"썸네일 URL: '{row.thumbnail_url}'")
        print(f"재생시간: {row.duration_seconds}초")
        
        # 슬래시 체크
        if row.video_url:
            if row.video_url.startswith('/'):
                print("  ✅ 비디오 URL: 슬래시 있음 (정상)")
            else:
                print("  ❌ 비디오 URL: 슬래시 없음 (문제!)")
        
        print("-" * 100)
    
    print("\n" + "=" * 100)
    
except Exception as e:
    print(f"❌ 오류: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
