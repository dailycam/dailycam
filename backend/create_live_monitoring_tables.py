"""
데이터베이스 테이블 생성 스크립트
사용자, 인증, 라이브 모니터링 등 모든 필요한 테이블을 생성합니다.
"""

import sys
from pathlib import Path

# 프로젝트 루트를 Python 경로에 추가
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from app.database.base import Base
from app.database.session import engine

# 모든 모델 import (Base.metadata에 등록하기 위해)
from app.models.live_monitoring.models import (
    RealtimeEvent,
    HourlyAnalysis,
    SegmentAnalysis,
    DailyReport
)
from app.models.user import User
from app.models.token_blacklist import TokenBlacklist

def create_all_tables():
    """모든 데이터베이스 테이블 생성"""
    print("[DB] 데이터베이스 테이블 생성 중...")
    
    try:
        # 모든 테이블 생성 (이미 존재하는 테이블은 건너뜀)
        # tables 인자를 생략하면 Base를 상속받은 모든 모델의 테이블을 생성합니다.
        Base.metadata.create_all(bind=engine)
        
        print("[DB] 테이블 생성 완료:")
        print("  - users (사용자)")
        print("  - token_blacklist (토큰 블랙리스트)")
        print("  - realtime_events (실시간 이벤트)")
        print("  - hourly_analyses (시간별 분석)")
        print("  - segment_analyses (5분 단위 분석)")
        print("  - daily_reports (일일 리포트)")
        
    except Exception as e:
        print(f"[DB] 테이블 생성 실패: {e}")
        raise


if __name__ == "__main__":
    create_all_tables()
