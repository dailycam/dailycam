"""
DB 초기화 스크립트 - 테이블 생성
개발용으로 사용, 프로덕션에서는 Alembic 마이그레이션 사용 권장
"""

from app.database import engine, Base
from app.models import *  # 모든 모델 import

def init_db():
    """모든 테이블 생성"""
    print("데이터베이스 테이블 생성 중...")
    Base.metadata.create_all(bind=engine)
    print("✅ 테이블 생성 완료!")

if __name__ == "__main__":
    init_db()
