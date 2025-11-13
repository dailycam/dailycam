"""API routes for analytics features - 기본 구조만 유지."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def analytics_root():
    """Analytics API 기본 엔드포인트 - 기본 구조만 유지."""
    return {"message": "Analytics API - 기본 구조만 유지 (실제 기능은 /api/dashboard로 이동됨)"}
