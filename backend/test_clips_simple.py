import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from app.database.session import SessionLocal
from app.models.clip import HighlightClip

db = SessionLocal()
clips = db.query(HighlightClip).limit(3).all()

print(f"총 클립: {db.query(HighlightClip).count()}개\n")

for c in clips:
    print(f"ID: {c.id}")
    print(f"제목: {c.title}")
    print(f"비디오: {c.video_url}")
    print(f"썸네일: {c.thumbnail_url}")
    print(f"시간: {c.duration_seconds}초")
    print("-" * 50)

db.close()
