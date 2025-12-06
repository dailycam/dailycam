"""
highlight_clip 테이블 전체 마이그레이션
모델과 데이터베이스 스키마 동기화
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import engine

def migrate():
    with engine.connect() as conn:
        try:
            print("🔍 현재 테이블 구조 확인 중...")
            
            # 테이블이 존재하는지 확인
            result = conn.execute(text("SHOW TABLES LIKE 'highlight_clip'"))
            if not result.fetchone():
                print("❌ highlight_clip 테이블이 존재하지 않습니다.")
                print("📝 테이블을 새로 생성합니다...")
                
                conn.execute(text("""
                    CREATE TABLE highlight_clip (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        title VARCHAR(255) NOT NULL,
                        description TEXT,
                        video_url VARCHAR(512) NOT NULL,
                        thumbnail_url VARCHAR(512),
                        category ENUM('발달', '안전') NOT NULL,
                        sub_category VARCHAR(100),
                        importance VARCHAR(20),
                        duration_seconds INT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        analysis_log_id INT,
                        INDEX ix_highlight_clip_id (id),
                        INDEX ix_highlight_clip_created_at (created_at),
                        INDEX ix_highlight_clip_analysis_log_id (analysis_log_id),
                        FOREIGN KEY (analysis_log_id) REFERENCES analysis_log(id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """))
                print("✅ 테이블 생성 완료")
                conn.commit()
                return
            
            # 기존 컬럼 확인
            result = conn.execute(text("DESCRIBE highlight_clip"))
            existing_columns = {row[0] for row in result}
            print(f"📋 기존 컬럼: {existing_columns}")
            
            # 필요한 컬럼 정의
            required_columns = {
                'description': "ADD COLUMN description TEXT",
                'created_at': "ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP",
                'sub_category': "ADD COLUMN sub_category VARCHAR(100)",
                'importance': "ADD COLUMN importance VARCHAR(20)",
                'duration_seconds': "ADD COLUMN duration_seconds INT",
                'analysis_log_id': "ADD COLUMN analysis_log_id INT"
            }
            
            # 누락된 컬럼 추가
            for col_name, alter_sql in required_columns.items():
                if col_name not in existing_columns:
                    print(f"➕ {col_name} 컬럼 추가 중...")
                    conn.execute(text(f"ALTER TABLE highlight_clip {alter_sql}"))
                    print(f"✅ {col_name} 추가 완료")
            
            # 인덱스 추가 (이미 존재하면 무시)
            try:
                conn.execute(text("CREATE INDEX ix_highlight_clip_created_at ON highlight_clip(created_at)"))
                print("✅ created_at 인덱스 추가 완료")
            except:
                print("ℹ️ created_at 인덱스 이미 존재")
            
            try:
                conn.execute(text("CREATE INDEX ix_highlight_clip_analysis_log_id ON highlight_clip(analysis_log_id)"))
                print("✅ analysis_log_id 인덱스 추가 완료")
            except:
                print("ℹ️ analysis_log_id 인덱스 이미 존재")
            
            # 외래 키 추가 (이미 존재하면 무시)
            try:
                conn.execute(text("""
                    ALTER TABLE highlight_clip 
                    ADD CONSTRAINT fk_highlight_clip_analysis_log 
                    FOREIGN KEY (analysis_log_id) REFERENCES analysis_log(id)
                """))
                print("✅ 외래 키 추가 완료")
            except:
                print("ℹ️ 외래 키 이미 존재")
            
            conn.commit()
            print("\n✅ 마이그레이션 완료!")
            print("📋 최종 테이블 구조:")
            result = conn.execute(text("DESCRIBE highlight_clip"))
            for row in result:
                print(f"  - {row[0]}: {row[1]}")
            
        except Exception as e:
            print(f"❌ 마이그레이션 실패: {e}")
            import traceback
            traceback.print_exc()
            conn.rollback()

if __name__ == "__main__":
    migrate()
