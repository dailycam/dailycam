"""데이터베이스 초기화 - 간단 버전"""

from app.database import engine, Base


def init_db():
    """테이블 생성"""
    print("[CREATE] Creating Tables...")
    try:
        Base.metadata.create_all(bind=engine)
        print("[OK] Database tables created successfully")
        return True
    except Exception as e:
        print(f"[ERROR] Database connection failed: {e}")
        print("   Check .env DB settings.")
        return False


if __name__ == "__main__":
    print("=" * 60)
    print("[START] Database Initialization")
    print("=" * 60)
    print()
    
    init_db()
    print("=" * 60)
    print("[DONE] Database Ready!")
    print("=" * 60)

