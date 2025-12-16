
import os
import sys
from datetime import timedelta
from app.core.security import create_access_token
from app.core.config import settings

# Mock settings if needed or just use default
# Ensure valid environment
os.environ["JWT_SECRET_KEY"] = "super-secret-key-for-dev" # Assuming dev default or I should load .env

# Need to load .env actually to match server
from dotenv import load_dotenv
load_dotenv(".env")

try:
    token = create_access_token(
        data={"user_id": 1, "sub": "shghwhs123@gmail.com"},
        expires_delta=timedelta(days=1)
    )
    print(f"NEW_TOKEN={token}")
except Exception as e:
    print(f"Error: {e}")
