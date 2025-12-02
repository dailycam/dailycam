"""FastAPI application entry-point - ê°„ë‹¨ ë²„ì „ (Gemini ë¶„ì„ + êµ¬ë…ê²°ì œ)"""

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
        description="ë¹„ë””??ë¶„ì„ API - Gemini AI",
    )

    # ----------------------------------------------------
    # ?”¥ startup: DB ì´ˆê¸°??+ ?ë™ê²°ì œ ?Œì»¤ ?œì‘
    # ----------------------------------------------------
    @app.on_event("startup")
    async def startup_event():
        """? í”Œë¦¬ì??´ì…˜ ?œì‘ ???‘ì—…??(DB ?•ì¸ + ?ë™ê²°ì œ ?Œì»¤ ?œì‘)"""
        print("\n" + "=" * 60)
        print("?? DailyCam Backend ?œì‘")
        print("=" * 60)

        # ??1) ?°ì´?°ë² ?´ìŠ¤ ?°ê²° ë°??Œì´ë¸??ì„±
        print("\n?“Š ?°ì´?°ë² ?´ìŠ¤ ?°ê²° ?•ì¸ ì¤?..")
        if test_db_connection():
            print("???°ì´?°ë² ?´ìŠ¤ ?°ê²° ?±ê³µ!")

            print("\n?“‹ ?°ì´?°ë² ?´ìŠ¤ ?Œì´ë¸??•ì¸ ì¤?..")
            try:
                Base.metadata.create_all(bind=engine)
                print("???°ì´?°ë² ?´ìŠ¤ ?Œì´ë¸?ì¤€ë¹??„ë£Œ!")

                if Base.metadata.tables:
                    print("\n?“Œ ?¬ìš© ê°€?¥í•œ ?Œì´ë¸?")
                    for table_name in Base.metadata.tables.keys():
                        print(f"   - {table_name}")
                else:
                    print("   (ëª¨ë¸???•ì˜?˜ì? ?Šì•„ ?Œì´ë¸”ì´ ?†ìŠµ?ˆë‹¤)")
            except Exception as e:
                print(f"? ï¸  ?Œì´ë¸??ì„± ì¤??¤ë¥˜: {e}")
        else:
            print("? ï¸  ?°ì´?°ë² ?´ìŠ¤ ?°ê²° ?¤íŒ¨ - ?¼ë? ê¸°ëŠ¥???œí•œ?????ˆìŠµ?ˆë‹¤")

        # ??2) ?ë™ê²°ì œ ?Œì»¤ ?œì‘
        async def billing_worker():
            while True:
                db = SessionLocal()
                try:
                    result = await process_due_subscriptions(db)
                    if result["processed"]:
                        print("[BillingJob] ?ë™ê²°ì œ ì²˜ë¦¬ ê²°ê³¼:", result)
                    else:
                        print("[BillingJob] ì²?µ¬ ?€???†ìŒ")
                except Exception as e:
                    print("[BillingJob] ?¤ë¥˜:", e)
                finally:
                    db.close()

                # ??ì§€ê¸ˆì? 1?œê°„ë§ˆë‹¤ ?¤í–‰ (?ŒìŠ¤?¸í•  ??10ì´?60ì´ˆë¡œ ì¤„ì—¬????
                await asyncio.sleep(60 * 60)

        asyncio.create_task(billing_worker())

        print("\n" + "=" * 60)
        print("???œë²„ê°€ ì¤€ë¹„ë˜?ˆìŠµ?ˆë‹¤!")
        print("   API ë¬¸ì„œ: http://localhost:8000/docs")
        print("=" * 60 + "\n")

    @app.on_event("shutdown")
    async def shutdown_event():
        """? í”Œë¦¬ì??´ì…˜ ì¢…ë£Œ ??""
        print("\n?‘‹ DailyCam Backend ì¢…ë£Œ ì¤?..")

    # ----------------------------------------------------
    # ë£¨íŠ¸ ?”ë“œ?¬ì¸??
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
    # CORS ?¤ì • (?„ë¡ ?¸ì—”?œì—???‘ê·¼ ê°€?¥í•˜?„ë¡)
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

    # ?¸ì…˜ ë¯¸ë“¤?¨ì–´ ì¶”ê? (OAuth???„ìš”)
    app.add_middleware(
        SessionMiddleware,
        secret_key=os.getenv("JWT_SECRET_KEY", "your-secret-key"),
    )

    # ----------------------------------------------------
    # ?¼ìš°???±ë¡
    # ----------------------------------------------------
    # ?¸ì¦
    app.include_router(auth_router)

    # ë¹„ë””??ë¶„ì„
    app.include_router(homecam_router, prefix="/api/homecam", tags=["homecam"])

    # ?¼ì´ë¸?ëª¨ë‹ˆ?°ë§
    app.include_router(
        live_monitoring_router,
        prefix="/api/live-monitoring",
        tags=["live-monitoring"],
    )

    # ê²°ì œ / êµ¬ë…
    app.include_router(payments_router)

    # ?€?œë³´??
    app.include_router(
        dashboard_router,
        prefix="/api/dashboard",
        tags=["dashboard"]
    )

    # ?ˆì „ ë¦¬í¬??
    app.include_router(
        safety_router,
        prefix="/api/safety",
        tags=["safety"]
    )

    # ë°œë‹¬ ë¦¬í¬??
    app.include_router(
        development_router,
        prefix="/api/development",
        tags=["development"]
    )

    # ?´ë¦½ ?˜ì´?¼ì´??
    app.include_router(
        clips_router,
        prefix="/api/clips",
        tags=["clips"]
    )

    return app


app = create_app()
