"""Content caching system"""

from typing import Optional, Any
from datetime import datetime, timedelta

# 간단한 메모리 캐시 (프로덕션에서는 Redis 사용 권장)
_cache: dict[str, tuple[Any, datetime]] = {}


def get_from_cache(key: str) -> Optional[Any]:
    """
    캐시에서 데이터 가져오기
    
    Args:
        key: 캐시 키
        
    Returns:
        캐시된 데이터 또는 None
    """
    if key in _cache:
        data, expires_at = _cache[key]
        if datetime.utcnow() < expires_at:
            print(f"[Cache] HIT: {key}")
            return data
        else:
            # 만료된 캐시 삭제
            del _cache[key]
            print(f"[Cache] EXPIRED: {key}")
    else:
        print(f"[Cache] MISS: {key}")
    
    return None


def save_to_cache(key: str, data: Any, ttl: int = 86400):
    """
    캐시에 데이터 저장
    
    Args:
        key: 캐시 키
        data: 저장할 데이터
        ttl: Time To Live (초 단위, 기본 24시간)
    """
    expires_at = datetime.utcnow() + timedelta(seconds=ttl)
    _cache[key] = (data, expires_at)
    print(f"[Cache] SAVE: {key} (TTL: {ttl}s)")


def clear_cache():
    """캐시 전체 삭제"""
    global _cache
    _cache = {}
    print("[Cache] CLEARED")


def get_cache_stats() -> dict:
    """캐시 통계 반환"""
    total_items = len(_cache)
    expired_items = sum(
        1 for _, (_, expires_at) in _cache.items()
        if datetime.utcnow() >= expires_at
    )
    
    return {
        "total_items": total_items,
        "active_items": total_items - expired_items,
        "expired_items": expired_items
    }
