"""Database configuration and session management."""

from __future__ import annotations

import os
from pathlib import Path

import pymysql
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# .env 파일 로드
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

# 데이터베이스 연결 정보
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "dailycam")

# MySQL 연결 URL 생성 (데이터베이스 이름 제외 - 먼저 연결 확인용)
BASE_DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}?charset=utf8mb4"
DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?charset=utf8mb4"


def create_database_if_not_exists():
    """데이터베이스가 없으면 생성합니다."""
    try:
        # 데이터베이스 이름 없이 연결
        connection = pymysql.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            charset="utf8mb4",
        )
        
        with connection.cursor() as cursor:
            # 데이터베이스 존재 여부 확인
            cursor.execute(f"SHOW DATABASES LIKE '{DB_NAME}'")
            result = cursor.fetchone()
            
            if not result:
                # 데이터베이스 생성
                cursor.execute(f"CREATE DATABASE {DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
                print(f"✅ 데이터베이스 '{DB_NAME}' 생성 완료")
            else:
                print(f"✅ 데이터베이스 '{DB_NAME}' 이미 존재합니다")
        
        connection.close()
    except Exception as e:
        print(f"⚠️ 데이터베이스 생성 중 오류 발생: {e}")
        print(f"   수동으로 다음 명령어를 실행해주세요:")
        print(f"   CREATE DATABASE {DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")


# 데이터베이스가 없으면 생성
create_database_if_not_exists()

# SQLAlchemy 엔진 생성
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # 연결 유효성 검사
    pool_recycle=3600,  # 1시간마다 연결 재생성
    echo=False,  # SQL 쿼리 로깅 (개발 시 True로 설정 가능)
)

# 세션 팩토리 생성
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base 클래스 (모든 모델이 상속받을 클래스)
Base = declarative_base()


def get_db():
    """
    데이터베이스 세션 의존성 함수.
    
    FastAPI의 Depends에서 사용하여 각 요청마다 DB 세션을 제공합니다.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """데이터베이스 테이블 생성."""
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ 데이터베이스 테이블 생성 완료")
    except Exception as e:
        print(f"⚠️ 데이터베이스 테이블 생성 중 오류 발생: {e}")
        print("   데이터베이스 연결 정보를 확인해주세요.")


