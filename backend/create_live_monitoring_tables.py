"""
실시간 모니터링 테이블 생성 스크립트
"""

from app.database.base import Base, engine
from app.models.live_monitoring.models import RealtimeEvent, HourlyAnalysis, DailyReport

def create_tables():
    """실시간 모니터링 관련 테이블 생성"""
    print("실시간 모니터링 테이블 생성 중...")
    
    # 테이블 생성
    Base.metadata.create_all(bind=engine, tables=[
        RealtimeEvent.__table__,
        HourlyAnalysis.__table__,
        DailyReport.__table__
    ])
    
    print("✅ 테이블 생성 완료:")
    print("  - realtime_events")
    print("  - hourly_analyses")
    print("  - daily_reports")

if __name__ == "__main__":
    create_tables()

