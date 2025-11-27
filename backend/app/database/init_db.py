"""데이터베이스 초기화 스크립트 - 테이블 자동 생성"""

import sys
from pathlib import Path

# 프로젝트 루트를 경로에 추가
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from app.database import Base, engine, test_connection
# ⭐ 모든 모델 임포트 (테이블 생성을 위해 필수!)
from app.models import (
    User, Child, VideoAnalysis, DevelopmentSkill, SkillExample,
    SafetyIncident, EnvironmentRisk, IncidentSummary,
    StageEvidence, AnalysisRawJson, TokenBlacklist
)


def init_database():
    """데이터베이스 테이블 생성"""
    print("=" * 80)
    print("DailyCam Database Initialization")
    print("=" * 80)
    print(f"Database: {engine.url.database}")
    print()
    
    # 1. 연결 테스트
    print("Step 1: Testing database connection...")
    if not test_connection():
        print("❌ Database connection failed!")
        sys.exit(1)
    print()
    
    # 2. 테이블 생성
    print("Step 2: Creating tables...")
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Table creation completed!")
        print()
        print("Created tables:")
        for table_name in sorted(Base.metadata.tables.keys()):
            print(f"  - {table_name}")
        print()
        print("=" * 80)
        print("✅ Database initialization successful!")
        print("=" * 80)
    except Exception as e:
        print(f"❌ Table creation failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    init_database()
