import sys
import os
from pathlib import Path

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import Base, engine
# Import all models to register them with Base.metadata
from app.models import (
    User, TokenBlacklist, RefreshToken, AnalysisLog, SafetyEvent, DevelopmentEvent,
    DailySummary, HighlightClip, CameraSetting, CameraVideo,
    DevelopmentScoreTracking, DevelopmentMilestoneTracking,
    RealtimeEvent, HourlyAnalysis, SegmentAnalysis, DailyReport,
    AnalysisJob, JobStatus
)

def init_db():
    print("Creating database tables...")
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created successfully.")
        
        # Verify
        if Base.metadata.tables:
            print(f"Created tables: {list(Base.metadata.tables.keys())}")
        else:
            print("⚠️ No tables found in metadata.")
            
    except Exception as e:
        print(f"❌ Error creating tables: {e}")

if __name__ == "__main__":
    init_db()
