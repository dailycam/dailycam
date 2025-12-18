
import os
import sys
from datetime import datetime, timedelta
import pytz
from sqlalchemy import create_engine, desc
from sqlalchemy.orm import sessionmaker

# Add current directory to path to allow importing app modules
sys.path.append(os.getcwd())

from app.database.base import Base
from app.models.live_monitoring.models import RealtimeEvent, SegmentAnalysis
# Assuming you have a way to get the DB URL, otherwise hardcode or get from env
# from app.core.config import settings 
# For this script, I'll assume standard local dev connection string or use get_db if possible, 
# but direct connection is easier for script.
# Let's try to load from env or default
database_url = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/dbname") 
# WAIT, I don't know the user's DB URL. I should check `backend/app/core/config.py` or similar, 
# or just try to import `SessionLocal` from `app.database.session`.

from app.database.session import SessionLocal

def check_stats():
    db = SessionLocal()
    try:
        camera_id = 'camera-1' # Default in Monitoring.tsx
        
        # KST Time setup
        korea_tz = pytz.timezone('Asia/Seoul')
        utc_tz = pytz.UTC
        
        now_kst = datetime.now(korea_tz)
        today_start_kst = now_kst.replace(hour=0, minute=0, second=0, microsecond=0)
        today_start_utc = today_start_kst.astimezone(utc_tz).replace(tzinfo=None)
        
        print(f"Checking stats for Camera: {camera_id}")
        print(f"Now (KST): {now_kst}")
        print(f"Today Start (KST): {today_start_kst}")
        print(f"Today Start (UTC for query): {today_start_utc}")
        
        # Check RealtimeEvents
        events_count = db.query(RealtimeEvent).filter(
            RealtimeEvent.camera_id == camera_id,
            RealtimeEvent.timestamp >= today_start_utc
        ).count()
        
        print(f"\n[RealtimeEvent]")
        print(f"Count since {today_start_utc}: {events_count}")
        
        latest_event = db.query(RealtimeEvent).filter(
            RealtimeEvent.camera_id == camera_id
        ).order_by(desc(RealtimeEvent.timestamp)).first()
        
        if latest_event:
            print(f"Latest Event: {latest_event.timestamp} (UTC) - {latest_event.title}")
        else:
            print("No events found at all.")

        # Check SegmentAnalysis
        segments = db.query(SegmentAnalysis).filter(
            SegmentAnalysis.camera_id == camera_id,
            SegmentAnalysis.segment_start >= today_start_utc,
            SegmentAnalysis.status == 'completed'
        ).all()
        
        print(f"\n[SegmentAnalysis]")
        print(f"Completed count since {today_start_utc}: {len(segments)}")
        
        last_segment = db.query(SegmentAnalysis).filter(
            SegmentAnalysis.camera_id == camera_id
        ).order_by(desc(SegmentAnalysis.segment_start)).first()
        
        if last_segment:
            print(f"Latest Segment: {last_segment.segment_start} (UTC) - Status: {last_segment.status}")
        else:
            print("No segments found at all.")
            
        total_seconds = sum((s.segment_end - s.segment_start).total_seconds() for s in segments)
        print(f"Total calculated monitoring minutes: {int(total_seconds / 60)}")

    finally:
        db.close()

if __name__ == "__main__":
    check_stats()
