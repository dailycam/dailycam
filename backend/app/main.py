"""FastAPI application entry-point - 간단 버전 (Gemini 분석만)"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
import os

from .api.homecam import router as homecam_router
from .api.live_monitoring import router as live_monitoring_router
from .api.auth.router import router as auth_router
from .api.children.router import router as children_router
from .api.analysis.router import router as analysis_router
from .api.dashboard.router import router as dashboard_router
from .database import Base, engine
from .database.session import test_db_connection


def create_app() -> FastAPI:
    """Create and configure the FastAPI application instance."""
    
    app = FastAPI(
        title="DailyCam Backend", 
        version="0.1.0",
        description="비디오 분석 API - Gemini AI"
    )
    
    # 데이터베이스 초기화 이벤트
    @app.on_event("startup")
    async def startup_event():
        """애플리케이션 시작 시 데이터베이스 연결 및 테이블 생성"""
        print("\n" + "=" * 60)
        print("🚀 DailyCam Backend 시작")
        print("=" * 60)
        
        # 데이터베이스 연결 테스트
        print("\n📊 데이터베이스 연결 확인 중...")
        if test_db_connection():
            print("✅ 데이터베이스 연결 성공!")
            
            # 테이블 생성
            print("\n📋 데이터베이스 테이블 확인 중...")
            try:
                # 모든 모델 import (테이블 생성을 위해 필수!)
                from .models import (
                    User, Child, VideoAnalysis, DevelopmentSkill, SkillExample,
                    SafetyIncident, EnvironmentRisk, IncidentSummary,
                    StageEvidence, AnalysisRawJson, TokenBlacklist
                )
                
                Base.metadata.create_all(bind=engine)
                print("✅ 데이터베이스 테이블 준비 완료!")
                
                # 생성된 테이블 목록 출력
                if Base.metadata.tables:
                    print("\n📌 사용 가능한 테이블:")
                    for table_name in sorted(Base.metadata.tables.keys()):
                        print(f"   - {table_name}")
                else:
                    print("   (모델이 정의되지 않아 테이블이 없습니다)")
            except Exception as e:
                print(f"⚠️  테이블 생성 중 오류: {e}")
        else:
            print("⚠️  데이터베이스 연결 실패 - 일부 기능이 제한될 수 있습니다")
        
        print("\n" + "=" * 60)
        print("✨ 서버가 준비되었습니다!")
        print("   API 문서: http://localhost:8000/docs")
        print("==" * 60 + "\n")
    
    @app.on_event("shutdown")
    async def shutdown_event():
        """애플리케이션 종료 시"""
        print("\n👋 DailyCam Backend 종료 중...")
    
    # 루트 엔드포인트
    @app.get("/")
    async def root():
        return {
            "message": "DailyCam Backend API",
            "version": "0.1.0",
            "docs": "/docs",
            "endpoints": {
                "analyze_video": "/api/homecam/analyze-video",
                "get_analyses": "/api/analysis/analyses",
                "get_children": "/api/children/children"
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
    
    # 세션 미들웨어 추가 (OAuth에 필요)
    app.add_middleware(
        SessionMiddleware,
        secret_key=os.getenv("JWT_SECRET_KEY", "your-secret-key")
    )
    
    # 라우터 등록
    app.include_router(auth_router)
    app.include_router(homecam_router, prefix="/api/homecam", tags=["homecam"])
    app.include_router(live_monitoring_router, prefix="/api/live-monitoring", tags=["live-monitoring"])
    app.include_router(children_router, prefix="/api/children", tags=["children"])
    app.include_router(analysis_router, prefix="/api/analysis", tags=["analysis"])
    app.include_router(dashboard_router, prefix="/api", tags=["dashboard"])
    
    return app


app = create_app()
