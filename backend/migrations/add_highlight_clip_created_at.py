"""
highlight_clip 테이블에 created_at 컬럼 추가 마이그레이션
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import engine

def migrate():
    with engine.connect() as conn:
        try:
            # created_at 컬럼 추가
            conn.execute(text("""
                ALTER TABLE highlight_clip 
                ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            """))
            print("✅ created_at 컬럼 추가 완료")
            
            # 인덱스 추가
            conn.execute(text("""
                CREATE INDEX ix_highlight_clip_created_at ON highlight_clip(created_at)
            """))
            print("✅ 인덱스 추가 완료")
            
            conn.commit()
            print("✅ 마이그레이션 완료!")
            
        except Exception as e:
            print(f"❌ 마이그레이션 실패: {e}")
            conn.rollback()

if __name__ == "__main__":
    migrate()
