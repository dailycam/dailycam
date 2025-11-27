import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Add backend directory to path to import app modules if needed, 
# but here we just need DB connection
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "dailycam")

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(DATABASE_URL)

def add_column():
    with engine.connect() as connection:
        try:
            # Check if column exists
            result = connection.execute(text("SHOW COLUMNS FROM users LIKE 'is_subscribed'"))
            if result.fetchone():
                print("Column 'is_subscribed' already exists.")
                return

            print("Adding 'is_subscribed' column to 'users' table...")
            connection.execute(text("ALTER TABLE users ADD COLUMN is_subscribed INTEGER DEFAULT 0"))
            connection.commit()
            print("Column added successfully.")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    add_column()
