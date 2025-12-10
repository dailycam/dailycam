"""로그 설정 유틸리티"""
import os

# 환경 변수로 디버그 모드 제어 (기본값: False)
DEBUG_MODE = os.getenv("DEBUG_MODE", "false").lower() == "true"
VERBOSE_LOGGING = os.getenv("VERBOSE_LOGGING", "false").lower() == "true"

def debug_print(*args, **kwargs):
    """디버그 모드일 때만 출력"""
    if DEBUG_MODE or VERBOSE_LOGGING:
        print(*args, **kwargs)

def info_print(*args, **kwargs):
    """중요한 정보만 출력 (항상 표시)"""
    print(*args, **kwargs)
