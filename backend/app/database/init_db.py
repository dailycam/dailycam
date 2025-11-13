"""데이터베이스 초기화 스크립트"""

import sys
from pathlib import Path

# 프로젝트 루트를 경로에 추가
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from app.database import Base, engine
from app.models.daily_report.models import (
    Video,
    VideoAnalysis,
    TimelineEvent,
    AnalysisRecommendation,
    DailyReport,
    ReportTimeSlot,
    ReportRiskPriority,
    ReportActionRecommendation,
    Highlight,
)


def init_database():
    """데이터베이스 테이블 생성"""
    print("데이터베이스 테이블을 생성합니다...")
    print(f"데이터베이스: {engine.url.database}")
    
    try:
        # 모든 테이블 생성
        Base.metadata.create_all(bind=engine)
        print("✅ 테이블 생성 완료!")
        print("\n생성된 테이블:")
        for table_name in Base.metadata.tables.keys():
            print(f"  - {table_name}")
    except Exception as e:
        print(f"❌ 테이블 생성 실패: {e}")
        sys.exit(1)


if __name__ == "__main__":
    init_database()

