"""FastAPI application entry-point - 간단 버전 (Gemini 분석만)"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.homecam import router as homecam_router
from .api.live_monitoring import router as live_monitoring_router


def create_app() -> FastAPI:
    """Create and configure the FastAPI application instance."""
    
    app = FastAPI(
        title="DailyCam Backend", 
        version="0.1.0",
        description="비디오 분석 API - Gemini AI"
    )
    
    # 루트 엔드포인트
    @app.get("/")
    async def root():
        return {
            "message": "DailyCam Backend API",
            "version": "0.1.0",
            "docs": "/docs",
            "endpoints": {
                "analyze_video": "/api/homecam/analyze-video"
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
    
    # 비디오 분석 라우터만 등록
    app.include_router(homecam_router, prefix="/api/homecam", tags=["homecam"])
    
    # 라이브 모니터링 라우터 등록
    app.include_router(live_monitoring_router, prefix="/api/live-monitoring", tags=["live-monitoring"])
    
    return app


app = create_app()
