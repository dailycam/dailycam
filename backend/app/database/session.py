"""데이터베이스 세션 및 엔진 설정"""

# .env 파일을 먼저 로드 (다른 import 전에)
from dotenv import load_dotenv
load_dotenv()

# 이 아래에 다른 import 구문들
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from pathlib import Path

# .env 파일 경로 확인 (선택사항)
env_path = Path(__file__).parent.parent.parent / '.env'
if env_path.exists():
    load_dotenv(dotenv_path=env_path, override=True)

# 데이터베이스 연결 정보 (Docker와 로컬 모두 지원)
DB_HOST = os.getenv("MYSQL_HOST") or os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("MYSQL_PORT") or os.getenv("DB_PORT", "3306")
DB_USER = os.getenv("MYSQL_USER") or os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("MYSQL_PASSWORD") or os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("MYSQL_DATABASE") or os.getenv("DB_NAME", "dailycam")

# 데이터베이스 URL 생성
# dailycam 데이터베이스 사용
DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?charset=utf8mb4"

# SQLAlchemy 엔진 생성
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600,
    echo=False  # SQL 쿼리 로깅 (개발 시 True로 변경 가능)
)

# 세션 팩토리 생성
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """데이터베이스 세션 의존성"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_db_connection() -> bool:
    """데이터베이스 연결 테스트
    
    Returns:
        bool: 연결 성공 시 True, 실패 시 False
    """
    try:
        # 연결 테스트
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        return True
    except Exception as e:
        print(f"❌ 데이터베이스 연결 실패: {e}")
        print(f"   연결 URL: mysql://{DB_USER}:***@{DB_HOST}:{DB_PORT}/{DB_NAME}")
        print("\n💡 확인사항:")
        print("   1. MySQL/MariaDB 서버가 실행 중인지 확인")
        print("   2. .env 파일의 DB_HOST, DB_PORT, DB_USER, DB_PASSWORD가 올바른지 확인")
        print("   3. 데이터베이스가 생성되어 있는지 확인 (CREATE DATABASE dailycam;)")
        return False

