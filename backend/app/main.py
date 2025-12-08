"""FastAPI application entry-point - 간단 버전 (Gemini 분석 + 구독결제)"""

import os
import asyncio
from dotenv import load_dotenv

# .env 파일 명시적 로드
load_dotenv()

# LangChain 호환성을 위해 GEMINI_API_KEY를 GOOGLE_API_KEY로 설정
if os.getenv("GEMINI_API_KEY") and not os.getenv("GOOGLE_API_KEY"):
    os.environ["GOOGLE_API_KEY"] = os.getenv("GEMINI_API_KEY")



from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles  # 👈 추가
from starlette.middleware.sessions import SessionMiddleware

from .api.homecam import router as homecam_router
from .api.live_monitoring import router as live_monitoring_router
from .api.auth.router import router as auth_router
from .api.payments.router import router as payments_router, process_due_subscriptions
from .api.dashboard.router import router as dashboard_router
from .api.safety.router import router as safety_router
from .api.development.router import router as development_router
from .api.clips.router import router as clips_router
from .api.profile.router import router as profile_router
from .api.content.router import router as content_router
from .api.reports.router import router as report_router

from .database import Base, engine
from .database.session import test_db_connection
from app.database import SessionLocal

# HLS 스트림 자동 시작을 위한 import
from pathlib import Path
from .services.live_monitoring.hls_stream_generator import HLSStreamGenerator
from .services.live_monitoring.segment_analyzer import start_segment_analysis_for_camera
from .services.live_monitoring.hourly_aggregator import start_hourly_aggregation_for_camera


def create_app() -> FastAPI:
    """Create and configure the FastAPI application instance."""
    
    app = FastAPI(
        title="DailyCam Backend",
        version="0.1.0",
        description="비디오 분석 API - Gemini AI",
    )

    # ----------------------------------------------------
    # CORS 설정 (라우터 등록 전에 먼저 설정해야 함)
    # ----------------------------------------------------
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ],  # Vite 개발 서버
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"],
        allow_headers=["*"],
        expose_headers=["*"],
    )

    # 세션 미들웨어 추가 (OAuth에 필요)
    app.add_middleware(
        SessionMiddleware,
        secret_key=os.getenv("JWT_SECRET_KEY", "your-secret-key"),
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

        # ✅ 3) HLS 스트림 자동 시작 (camera-1)
        async def auto_start_hls_stream():
            """서버 시작 시 자동으로 HLS 스트림 시작"""
            camera_id = "camera-1"
            video_dir = Path(f"videos/{camera_id}")
            
            # 영상 디렉토리가 있는지 확인
            if not video_dir.exists():
                print(f"⚠️  HLS 자동 시작 실패: 영상 디렉토리가 없습니다 ({video_dir})")
                return
            
            # 짧은 대기 후 시작 (다른 초기화 작업 완료 대기)
            await asyncio.sleep(2)
            
            try:
                print(f"\n🎥 HLS 스트림 자동 시작 중: {camera_id}")
                
                output_dir = Path(f"temp_videos/hls_buffer/{camera_id}")
                loop = asyncio.get_running_loop()
                
                generator = HLSStreamGenerator(
                    camera_id=camera_id,
                    video_source=video_dir,
                    output_dir=output_dir,
                    is_real_camera=False,
                    segment_duration=10,
                    enable_realtime_detection=True,
                    age_months=None,
                    event_loop=loop
                )
                
                # 전역 스트림 관리에 등록 (router.py와 공유)
                from .api.live_monitoring.router import active_hls_streams, hls_stream_tasks
                active_hls_streams[camera_id] = generator
                
                # 백그라운드 태스크로 실행
                task = asyncio.create_task(generator.start_streaming())
                hls_stream_tasks[camera_id] = task
                
                # 10분 단위 분석 스케줄러 시작
                await start_segment_analysis_for_camera(camera_id)
                
                # 1시간 단위 텍스트 데이터 종합 분석 스케줄러 시작
                await start_hourly_aggregation_for_camera(camera_id)
                
                print(f"✅ HLS 스트림 자동 시작 완료: {camera_id}")
                print(f"   스트림 URL: http://localhost:8000/api/live-monitoring/hls/{camera_id}/{camera_id}.m3u8")
                
            except Exception as e:
                print(f"❌ HLS 자동 시작 실패: {e}")
                import traceback
                print(traceback.format_exc())
        
        asyncio.create_task(auto_start_hls_stream())

        print("\n" + "=" * 60)
        print("✨ 서버가 준비되었습니다!")
        print("   API 문서: http://localhost:8000/docs")
        print("   HLS 스트림: 자동 시작 중...")
        print("=" * 60 + "\n")

    @app.on_event("shutdown")
    async def shutdown_event():
        """애플리케이션 종료 시 HLS 스트림 정리"""
        print("\n👋 DailyCam Backend 종료 중...")
        
        # HLS 스트림 정리
        from .api.live_monitoring.router import active_hls_streams, hls_stream_tasks
        from .services.live_monitoring.segment_analyzer import stop_segment_analysis_for_camera
        
        for camera_id, generator in list(active_hls_streams.items()):
            print(f"   HLS 스트림 중지: {camera_id}")
            generator.stop_streaming()
            await stop_segment_analysis_for_camera(camera_id)
        
        # 태스크 취소
        for camera_id, task in list(hls_stream_tasks.items()):
            if not task.done():
                task.cancel()
        
        print("✅ HLS 스트림 정리 완료")

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
            },
        }

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

    # 프로필 관리
    app.include_router(profile_router)

    # AI 콘텐츠 추천
    app.include_router(content_router)

    # 일일 육아 리포트 (추가)
    app.include_router(report_router, prefix="/api/reports", tags=["reports"])

    # ----------------------------------------------------
    # 정적 파일 마운트 (비디오 및 썸네일 서빙용)
    # ----------------------------------------------------
    # /videos 경로로 요청이 오면 videos 디렉토리의 파일 제공
    video_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "videos")
    os.makedirs(video_path, exist_ok=True)
    app.mount("/videos", StaticFiles(directory=video_path), name="videos")

    # /temp_videos 경로 (HLS 스트리밍용)
    temp_video_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "temp_videos")
    os.makedirs(temp_video_path, exist_ok=True)
    app.mount("/temp_videos", StaticFiles(directory=temp_video_path), name="temp_videos")

    return app


app = create_app()
