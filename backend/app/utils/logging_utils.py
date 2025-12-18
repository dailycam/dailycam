"""로깅 유틸리티 - 환경별 로그 레벨 제어"""

import os

IS_PRODUCTION = os.getenv("ENVIRONMENT") == "production"


def dev_log(*args, **kwargs):
    """개발 환경에서만 로그 출력"""
    if not IS_PRODUCTION:
        print(*args, **kwargs)


def prod_log(*args, **kwargs):
    """프로덕션에서도 로그 출력 (중요한 정보만)"""
    print(*args, **kwargs)


def security_log(*args, **kwargs):
    """보안 관련 로그 (항상 출력)"""
    print("[SECURITY]", *args, **kwargs)

