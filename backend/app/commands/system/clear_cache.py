"""캐시 삭제 스크립트"""
import sys
from pathlib import Path

from app.services.content_cache import clear_cache, get_cache_stats

print("🗑️ 캐시 삭제 전 상태:")
print(get_cache_stats())

clear_cache()

print("\n✅ 캐시 삭제 완료!")
print("🗑️ 캐시 삭제 후 상태:")
print(get_cache_stats())
