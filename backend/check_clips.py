"""클립 데이터 확인 스크립트"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from app.database.session import get_db
from app.models.clip import HighlightClip

db = next(get_db())

try:
    clips = db.query(HighlightClip).limit(5).all()
    
    print(f"\n총 클립 개수: {db.query(HighlightClip).count()}개\n")
    print("=" * 80)
    
    for clip in clips:
        print(f"ID: {clip.id}")
        print(f"제목: {clip.title}")
        print(f"카테고리: {clip.category}")
        print(f"비디오 URL: {clip.video_url}")
        print(f"썸네일 URL: {clip.thumbnail_url}")
        print(f"재생 시간: {clip.duration_seconds}초")
        print(f"생성 시간: {clip.created_at}")
        
        # 파일 존재 확인
        if clip.video_url:
            video_path = Path("backend") / clip.video_url.lstrip("/")
            print(f"비디오 파일 존재: {video_path.exists()}")
        
        if clip.thumbnail_url:
            thumb_path = Path("backend") / clip.thumbnail_url.lstrip("/")
            print(f"썸네일 파일 존재: {thumb_path.exists()}")
        
        print("-" * 80)
        
finally:
    db.close()
