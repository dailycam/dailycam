"""API router package - 간단 버전"""

from .homecam import router as homecam_router

__all__ = [
    "homecam_router",
]
