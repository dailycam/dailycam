import sys
import os

# 현재 디렉토리를 path에 추가하여 app 모듈을 찾을 수 있게 함
sys.path.append(os.getcwd())

from sqlalchemy import create_engine, inspect
from app.database import SQLALCHEMY_DATABASE_URL

def check_schema():
    print(f"Checking database at: {SQLALCHEMY_DATABASE_URL}")
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    inspector = inspect(engine)
    
    if not inspector.has_table("users"):
        print("Error: 'users' table not found!")
        return

    columns = inspector.get_columns("users")
    print("\nColumns in 'users' table:")
    found_subscription_columns = False
    for column in columns:
        print(f"- {column['name']} ({column['type']})")
        if column['name'] == 'subscription_customer_uid':
            found_subscription_columns = True
            
    print("\nAnalysis:")
    if found_subscription_columns:
        print("✅ 'subscription_customer_uid' column exists.")
    else:
        print("❌ 'subscription_customer_uid' column is MISSING!")
        print("   This is likely the cause of the InternalErrorException.")

if __name__ == "__main__":
    check_schema()
