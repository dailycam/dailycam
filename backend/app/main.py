"""FastAPI application entry-point for the DailyCam backend."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import (
    analytics_router,
    dashboard_router,
    daily_report_router,
    homecam_router,
    live_monitoring_router,
    video_highlights_router,
)
from .database import init_db


def create_app() -> FastAPI:
    """Create and configure the FastAPI application instance."""
    app = FastAPI(
        title="DailyCam Backend", 
        version="0.1.0",
        description="영유아 안전 모니터링 시스템 - Gemini AI 통합"
    )
    
    # CORS 설정 (프론트엔드에서 접근 가능하도록)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173"],  # Vite 개발 서버
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # 데이터베이스 초기화 (앱 시작 시 테이블 생성)
    @app.on_event("startup")
    async def startup_event():
        try:
            init_db()
        except Exception as e:
            print(f"⚠️ 데이터베이스 초기화 실패: {e}")
            print("   앱은 계속 실행되지만 데이터베이스 기능이 제한될 수 있습니다.")
    
    app.include_router(homecam_router, prefix="/api/homecam", tags=["homecam"])
    app.include_router(dashboard_router, prefix="/api/dashboard", tags=["dashboard"])
    app.include_router(analytics_router, prefix="/api/analytics", tags=["analytics"])
    app.include_router(
        daily_report_router, prefix="/api/daily-report", tags=["daily-report"]
    )
    app.include_router(
        live_monitoring_router,
        prefix="/api/live-monitoring",
        tags=["live-monitoring"],
    )
    app.include_router(
        video_highlights_router,
        prefix="/api/video-highlights",
        tags=["video-highlights"],
    )
    return app


app = create_app()


