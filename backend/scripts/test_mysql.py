"""MySQL/MariaDB 연결 테스트"""

import pymysql
import os
from dotenv import load_dotenv
from pathlib import Path

# .env 파일 로드
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# 연결 정보 출력
print("=" * 60)
print("🔍 MySQL/MariaDB 연결 테스트")
print("=" * 60)
print(f"호스트: {os.getenv('DB_HOST', 'localhost')}")
print(f"포트: {os.getenv('DB_PORT', 3306)}")
print(f"사용자: {os.getenv('DB_USER', 'root')}")
print(f"데이터베이스: {os.getenv('DB_NAME', 'dailycam')}")
print("=" * 60)

try:
    # MySQL 연결 시도
    connection = pymysql.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        port=int(os.getenv('DB_PORT', 3306)),
        user=os.getenv('DB_USER', 'root'),
        password=os.getenv('DB_PASSWORD', ''),
        database=os.getenv('DB_NAME', 'dailycam'),
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )
    
    print("\n✅ 연결 성공!\n")
    
    # 서버 정보 확인
    with connection.cursor() as cursor:
        cursor.execute("SELECT VERSION()")
        version = cursor.fetchone()
        print(f"📌 서버 버전: {version['VERSION()']}")
        
        cursor.execute("SELECT DATABASE()")
        db = cursor.fetchone()
        print(f"📌 현재 데이터베이스: {db['DATABASE()']}")
        
        cursor.execute("SHOW TABLES")
        tables = cursor.fetchall()
        print(f"📌 테이블 수: {len(tables)}개")
        if tables:
            print("   테이블 목록:")
            for table in tables:
                table_name = list(table.values())[0]
                print(f"   - {table_name}")
    
    connection.close()
    print("\n✅ 연결 종료 완료")
    
except pymysql.err.OperationalError as e:
    print(f"\n❌ 연결 실패 (OperationalError):")
    print(f"   {e}")
    print("\n💡 확인사항:")
    print("   1. MySQL/MariaDB 서버가 실행 중인지 확인")
    print("   2. .env 파일의 DB_HOST, DB_PORT가 올바른지 확인")
    print("   3. 방화벽이 포트를 차단하고 있지 않은지 확인")
    
except pymysql.err.InternalError as e:
    print(f"\n❌ 데이터베이스 오류:")
    print(f"   {e}")
    print("\n💡 확인사항:")
    print("   1. 데이터베이스 'dailycam'이 생성되어 있는지 확인")
    print("      MySQL에서: CREATE DATABASE dailycam;")
    
except pymysql.err.ProgrammingError as e:
    print(f"\n❌ 접근 권한 오류:")
    print(f"   {e}")
    print("\n💡 확인사항:")
    print("   1. .env 파일의 DB_USER, DB_PASSWORD가 올바른지 확인")
    print("   2. MySQL 사용자 권한 확인")
    
except Exception as e:
    print(f"\n❌ 예상치 못한 오류:")
    print(f"   {type(e).__name__}: {e}")

print("\n" + "=" * 60)