"""camera_videos 테이블에 s3_key 컬럼 추가 스크립트"""

import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
from pathlib import Path

# 환경 변수 로드
load_dotenv(dotenv_path=Path(__file__).parent.parent.parent / '.env')

# DB 연결 정보 (환경 변수 또는 기본값)
DB_HOST = os.getenv("MYSQL_HOST", os.getenv("DB_HOST", "localhost"))
DB_PORT = os.getenv("MYSQL_PORT", os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("MYSQL_USER", os.getenv("DB_USER", "root"))
DB_PASSWORD = os.getenv("MYSQL_PASSWORD", os.getenv("DB_PASSWORD", ""))
DB_NAME = os.getenv("MYSQL_DATABASE", os.getenv("DB_NAME", "dailycam"))

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

def add_s3_key_column():
    """camera_videos 테이블에 s3_key 컬럼 추가"""
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as connection:
        try:
            # 컬럼 존재 확인
            result = connection.execute(text(
                "SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS "
                "WHERE TABLE_SCHEMA = DATABASE() "
                "AND TABLE_NAME = 'camera_videos' "
                "AND COLUMN_NAME = 's3_key'"
            ))
            exists = result.fetchone()[0] > 0
            
            if exists:
                print("✅ 's3_key' 컬럼이 이미 존재합니다.")
                return
            
            print("📝 's3_key' 컬럼을 추가하는 중...")
            connection.execute(text(
                "ALTER TABLE camera_videos "
                "ADD COLUMN s3_key VARCHAR(1000) NULL "
                "COMMENT 'S3 키 (S3에 저장된 영상의 경우)' "
                "AFTER duration"
            ))
            connection.commit()
            print("✅ 's3_key' 컬럼이 성공적으로 추가되었습니다.")
            
        except Exception as e:
            print(f"❌ 오류 발생: {e}")
            connection.rollback()
            sys.exit(1)

if __name__ == "__main__":
    add_s3_key_column()

