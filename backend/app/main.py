"""FastAPI application entry-point - 간단 버전 (Gemini 분석 + 구독결제)"""

import os
import asyncio

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from .api.homecam import router as homecam_router
from .api.live_monitoring import router as live_monitoring_router
from .api.auth.router import router as auth_router
from .api.payments.router import router as payments_router, process_due_subscriptions
from .api.dashboard.router import router as dashboard_router
from .api.safety.router import router as safety_router
from .api.development.router import router as development_router
from .api.clips.router import router as clips_router

from .database import Base, engine
from .database.session import test_db_connection
from app.database import SessionLocal


def create_app() -> FastAPI:
    """Create and configure the FastAPI application instance."""
    
    app = FastAPI(
        title="DailyCam Backend",
        version="0.1.0",
        description="비디오 분석 API - Gemini AI",
    )

    # ----------------------------------------------------
    # 🔥 startup: DB 초기화 + 자동결제 워커 시작
    # ----------------------------------------------------
    @app.on_event("startup")
    async def startup_event():
        """애플리케이션 시작 시 작업들 (DB 확인 + 자동결제 워커 시작)"""
        print("\n" + "=" * 60)
        print("🚀 DailyCam Backend 시작")
        print("=" * 60)

        # ✅ 1) 데이터베이스 연결 및 테이블 생성
        print("\n📊 데이터베이스 연결 확인 중...")
        if test_db_connection():
            print("✅ 데이터베이스 연결 성공!")

            print("\n📋 데이터베이스 테이블 확인 중...")
            try:
                Base.metadata.create_all(bind=engine)
                print("✅ 데이터베이스 테이블 준비 완료!")

                if Base.metadata.tables:
                    print("\n📌 사용 가능한 테이블:")
                    for table_name in Base.metadata.tables.keys():
                        print(f"   - {table_name}")
                else:
                    print("   (모델이 정의되지 않아 테이블이 없습니다)")
            except Exception as e:
                print(f"⚠️  테이블 생성 중 오류: {e}")
        else:
            print("⚠️  데이터베이스 연결 실패 - 일부 기능이 제한될 수 있습니다")

        # ✅ 2) 자동결제 워커 시작
        async def billing_worker():
            while True:
                db = SessionLocal()
                try:
                    result = await process_due_subscriptions(db)
                    if result["processed"]:
                        print("[BillingJob] 자동결제 처리 결과:", result)
                    else:
                        print("[BillingJob] 청구 대상 없음")
                except Exception as e:
                    print("[BillingJob] 오류:", e)
                finally:
                    db.close()

                # ⏰ 지금은 1시간마다 실행 (테스트할 땐 10초/60초로 줄여도 됨)
                await asyncio.sleep(60 * 60)

        asyncio.create_task(billing_worker())

        print("\n" + "=" * 60)
        print("✨ 서버가 준비되었습니다!")
        print("   API 문서: http://localhost:8000/docs")
        print("=" * 60 + "\n")

    @app.on_event("shutdown")
    async def shutdown_event():
        """애플리케이션 종료 시"""
        print("\n👋 DailyCam Backend 종료 중...")

    # ----------------------------------------------------
    # 루트 엔드포인트
    # ----------------------------------------------------
    @app.get("/")
    async def root():
        return {
            "message": "DailyCam Backend API",
            "version": "0.1.0",
            "docs": "/docs",
            "endpoints": {
                "analyze_video": "/api/homecam/analyze-video",
                "live_monitoring": "/api/live-monitoring"
            }
        }

    # ----------------------------------------------------
    # CORS 설정 (프론트엔드에서 접근 가능하도록)
    # ----------------------------------------------------
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://[::1]:5173",  # IPv6 localhost
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # 세션 미들웨어 추가 (OAuth에 필요)
    app.add_middleware(
        SessionMiddleware,
        secret_key=os.getenv("JWT_SECRET_KEY", "your-secret-key"),
    )

    # ----------------------------------------------------
    # 라우터 등록
    # ----------------------------------------------------
    # 인증
    app.include_router(auth_router)

    # 비디오 분석
    app.include_router(homecam_router, prefix="/api/homecam", tags=["homecam"])

    # 라이브 모니터링
    app.include_router(
        live_monitoring_router,
        prefix="/api/live-monitoring",
        tags=["live-monitoring"],
    )

    # 결제 / 구독
    app.include_router(payments_router)
<<<<<<< HEAD
=======

    # 대시보드
    app.include_router(
        dashboard_router,
        prefix="/api/dashboard",
        tags=["dashboard"]
    )

    # 안전 리포트
    app.include_router(
        safety_router,
        prefix="/api/safety",
        tags=["safety"]
    )

    # 발달 리포트
    app.include_router(
        development_router,
        prefix="/api/development",
        tags=["development"]
    )

    # 클립 하이라이트
    app.include_router(
        clips_router,
        prefix="/api/clips",
        tags=["clips"]
    )

>>>>>>> origin/dev
    return app


app = create_app()
