"""FastAPI application entry-point for the DailyCam backend."""

from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .api import (
    analytics_router,
    daily_report_router,
    homecam_router,
    live_monitoring_router,
    video_highlights_router,
    image_classification_router,
)


def create_app() -> FastAPI:
    """Create and configure the FastAPI application instance."""
    from app.database import Base, engine
    
    # 모델 import (테이블 생성에 필요)
    from app.models.daily_report.models import (
        Video,
        VideoAnalysis,
        TimelineEvent,
        AnalysisRecommendation,
        DailyReport,
        ReportTimeSlot,
        ReportRiskPriority,
        ReportActionRecommendation,
        Highlight,
    )
    
    # 데이터베이스 테이블 자동 생성 (dailycam 데이터베이스에)
    Base.metadata.create_all(bind=engine)
    
    app = FastAPI(
        title="DailyCam Backend", 
        version="0.1.0",
        description="영유아 안전 모니터링 시스템 - Gemini AI 통합"
    )
    
    # 루트 엔드포인트
    @app.get("/")
    async def root():
        return {
            "message": "DailyCam Backend API",
            "version": "0.1.0",
            "docs": "/docs",
            "endpoints": {
                "image_classification": "/api/image-classification",
                "health": "/api/image-classification/health"
            }
        }
    
    # CORS 설정 (프론트엔드에서 접근 가능하도록)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173"],  # Vite 개발 서버
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    app.include_router(homecam_router, prefix="/api/homecam", tags=["homecam"])
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
    app.include_router(
        image_classification_router,
        prefix="/api/image-classification",
        tags=["image-classification"],
    )
    
    # 정적 파일 서빙 (하이라이트 영상)
    storage_path = Path(__file__).parent.parent / "storage"
    highlights_path = storage_path / "highlights"
    highlights_path.mkdir(parents=True, exist_ok=True)
    
    app.mount("/api/highlights", StaticFiles(directory=str(highlights_path)), name="highlights")
    
    return app


app = create_app()


