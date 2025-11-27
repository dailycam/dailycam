"""더미 데이터 생성 스크립트 - 아이 데이터"""

import sys
from pathlib import Path
from datetime import date

# 프로젝트 루트를 경로에 추가
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from app.database import SessionLocal
from app.models import User, Child


def create_dummy_child():
    """더미 아이 데이터 생성"""
    db = SessionLocal()
    
    try:
        print("=" * 80)
        print("Creating Dummy Child Data")
        print("=" * 80)
        print()
        
        # 1. user_id=1 확인
        user = db.query(User).filter(User.id == 1).first()
        if not user:
            print("❌ Error: user_id=1 not found!")
            print("Please create a user first.")
            return False
        
        print(f"✅ Found user: {user.name} ({user.email})")
        print()
        
        # 2. 이미 아이 데이터가 있는지 확인
        existing_child = db.query(Child).filter(Child.user_id == 1).first()
        if existing_child:
            print(f"⚠️  Child already exists: {existing_child.name} (ID: {existing_child.id})")
            print("Skipping creation...")
            return True
        
        # 3. 더미 아이 데이터 생성
        print("Creating dummy child data...")
        
        child = Child(
            user_id=1,
            name="지원이",
            birth_date=date(2024, 4, 27),  # 7개월 아기 (2024년 11월 기준)
            gender="F",
            profile_image_url=None
        )
        
        db.add(child)
        db.commit()
        db.refresh(child)
        
        print()
        print("✅ Dummy child data created successfully!")
        print()
        print(f"Child ID: {child.id}")
        print(f"Name: {child.name}")
        print(f"Birth Date: {child.birth_date}")
        print(f"Gender: {child.gender}")
        print(f"User ID: {child.user_id}")
        print()
        print("=" * 80)
        print("💡 You can now use this child_id for video analysis!")
        print(f"Example: child_id={child.id}, user_id={child.user_id}")
        print("=" * 80)
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        return False
    finally:
        db.close()


if __name__ == "__main__":
    success = create_dummy_child()
    sys.exit(0 if success else 1)
