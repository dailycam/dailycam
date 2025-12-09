
"""데이터베이스 마이그레이션 스크립트 - SegmentAnalysis에 발달 점수 필드 추가"""

import os
import sys

from sqlalchemy import create_engine, text
from app.database import get_db_url
import os

def migrate():
    """SegmentAnalysis 테이블에 새 컬럼 추가"""
    
    db_url = get_db_url()
    engine = create_engine(db_url)
    
    print("🔄 데이터베이스 마이그레이션 시작...")
    
    with engine.connect() as conn:
        try:
            # 1. development_score 컬럼 추가
            print("  - development_score 컬럼 추가 중...")
            conn.execute(text("""
                ALTER TABLE segment_analyses 
                ADD COLUMN IF NOT EXISTS development_score INTEGER
            """))
            conn.commit()
            print("  ✅ development_score 추가 완료")
            
        except Exception as e:
            if "already exists" in str(e) or "duplicate column" in str(e).lower():
                print("  ℹ️  development_score 컬럼이 이미 존재합니다")
            else:
                print(f"  ⚠️  development_score 추가 실패: {e}")
        
        try:
            # 2. development_radar_scores 컬럼 추가
            print("  - development_radar_scores 컬럼 추가 중...")
            conn.execute(text("""
                ALTER TABLE segment_analyses 
                ADD COLUMN IF NOT EXISTS development_radar_scores JSON
            """))
            conn.commit()
            print("  ✅ development_radar_scores 추가 완료")
            
        except Exception as e:
            if "already exists" in str(e) or "duplicate column" in str(e).lower():
                print("  ℹ️  development_radar_scores 컬럼이 이미 존재합니다")
            else:
                print(f"  ⚠️  development_radar_scores 추가 실패: {e}")
        
        try:
            # 3. safety_incidents 컬럼 추가
            print("  - safety_incidents 컬럼 추가 중...")
            conn.execute(text("""
                ALTER TABLE segment_analyses 
                ADD COLUMN IF NOT EXISTS safety_incidents JSON
            """))
            conn.commit()
            print("  ✅ safety_incidents 추가 완료")
            
        except Exception as e:
            if "already exists" in str(e) or "duplicate column" in str(e).lower():
                print("  ℹ️  safety_incidents 컬럼이 이미 존재합니다")
            else:
                print(f"  ⚠️  safety_incidents 추가 실패: {e}")
        
        try:
            # 4. development_milestones 컬럼 추가
            print("  - development_milestones 컬럼 추가 중...")
            conn.execute(text("""
                ALTER TABLE segment_analyses 
                ADD COLUMN IF NOT EXISTS development_milestones JSON
            """))
            conn.commit()
            print("  ✅ development_milestones 추가 완료")
            
        except Exception as e:
            if "already exists" in str(e) or "duplicate column" in str(e).lower():
                print("  ℹ️  development_milestones 컬럼이 이미 존재합니다")
            else:
                print(f"  ⚠️  development_milestones 추가 실패: {e}")
    
    print("✅ 마이그레이션 완료!")
    print("\n다음 단계:")
    print("1. 백엔드 서버 재시작")
    print("2. 새로운 분석이 실행되면 발달 점수가 자동으로 저장됩니다")

if __name__ == "__main__":
    migrate()
