from fastapi import APIRouter, UploadFile, File, Query, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse, Response, FileResponse
from pathlib import Path
from datetime import datetime, timedelta
import asyncio
import cv2
import numpy as np
from typing import Dict, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc
import os
import httpx

from app.database.session import get_db
from app.utils.auth_utils import get_current_user_id
from app.models.live_monitoring.models import RealtimeEvent, HourlyAnalysis, SegmentAnalysis, DailyReport
from app.services.live_monitoring.fake_stream_generator import FakeLiveStreamGenerator
from app.services.live_monitoring.hls_stream_generator import HLSStreamGenerator
from app.services.live_monitoring.segment_analyzer import (
    start_segment_analysis_for_camera,
    stop_segment_analysis_for_camera
)

router = APIRouter()

# 전역 스트림 관리
active_streams: Dict[str, FakeLiveStreamGenerator] = {}
stream_tasks: Dict[str, asyncio.Task] = {}

# HLS 스트림 관리
active_hls_streams: Dict[str, HLSStreamGenerator] = {}
hls_stream_tasks: Dict[str, asyncio.Task] = {}


@router.post("/upload-video")
async def upload_video_for_streaming(
    camera_id: str = Query(..., description="카메라 ID"),
    video: UploadFile = File(..., description="업로드할 비디오 파일")
):
    """
    ⚠️ DEPRECATED: 이 엔드포인트는 더 이상 사용되지 않습니다.
    
    대신 다음을 사용하세요:
    POST /api/camera-settings/cameras/{camera_id}/upload-video
    
    이 엔드포인트는 하위 호환성을 위해 유지되지만, 새 엔드포인트 사용을 권장합니다.
    """
    raise HTTPException(
        status_code=410,
        detail="이 엔드포인트는 더 이상 사용되지 않습니다. Settings 페이지에서 영상을 업로드해주세요."
    )


@router.post("/start-stream/{camera_id}")
async def start_stream(
    camera_id: str,
    enable_analysis: bool = Query(True, description="1시간 단위 분석 활성화"),
    enable_realtime_detection: bool = Query(True, description="실시간 이벤트 탐지 활성화"),
    age_months: int = Query(None, description="아이의 개월 수 (실시간 분석 정확도 향상)"),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """
    가짜 라이브 스트림 시작
    영상 큐를 로드하고 1시간 단위로 버퍼링 시작
    실시간 이벤트 탐지 (하이브리드: 경량 + Gemini)
    """
    if camera_id in active_streams:
        raise HTTPException(status_code=400, detail="이미 스트림이 실행 중입니다")
    
    video_dir = Path(f"videos/{camera_id}")
    buffer_dir = Path(f"temp_videos/hourly_buffer/{camera_id}")
    
    # 영상 디렉토리 확인
    if not video_dir.exists():
        video_dir.mkdir(parents=True, exist_ok=True)
    
    # DB에서 활성화된 영상 확인
    from app.models.camera_setting import CameraSetting, CameraVideo
    
    try:
        camera_setting = db.query(CameraSetting).filter(
            CameraSetting.camera_id == camera_id,
            CameraSetting.user_id == user_id,
            CameraSetting.is_active == True
        ).first()
        
        if not camera_setting:
            raise HTTPException(
                status_code=400, 
                detail="카메라 설정을 찾을 수 없습니다. Settings 페이지에서 먼저 카메라를 설정해주세요."
            )
        
        active_videos = db.query(CameraVideo).filter(
            CameraVideo.camera_setting_id == camera_setting.id,
            CameraVideo.is_active == True
        ).count()
        
        if active_videos == 0:
            raise HTTPException(
                status_code=400, 
                detail="활성화된 영상이 없습니다. Settings 페이지에서 먼저 영상을 업로드해주세요."
            )
    except HTTPException:
        raise
    except Exception as e:
        print(f"[스트림] DB 조회 실패, 로컬 파일 시스템 사용: {e}")
        # 폴백: 로컬 파일 시스템
        user_videos = list(video_dir.glob("user_uploaded_*.mp4"))
        if not user_videos:
            raise HTTPException(
                status_code=400, 
                detail="업로드된 영상이 없습니다. Settings 페이지에서 먼저 영상을 업로드해주세요."
            )
    
    # 현재 이벤트 루프 가져오기
    loop = asyncio.get_running_loop()
    
    # 스트림 생성기 생성 (하이브리드 실시간 탐지)
    generator = FakeLiveStreamGenerator(
        camera_id, 
        video_dir, 
        buffer_dir, 
        enable_realtime_detection=enable_realtime_detection,
        age_months=age_months,
        event_loop=loop  # 이벤트 루프 전달
    )
    active_streams[camera_id] = generator
    
    # 백그라운드 태스크로 실행
    task = asyncio.create_task(generator.start_streaming())
    stream_tasks[camera_id] = task
    
    # 5분 단위 분석 스케줄러 시작 (새로운 방식)
    if enable_analysis:
        await start_segment_analysis_for_camera(camera_id)
    
    print(f"[API] 스트림 시작: {camera_id} (10분 단위 분석: {enable_analysis}, 실시간 탐지: {enable_realtime_detection}, 개월수: {age_months})")
    
    return {
        "message": f"스트림 시작: {camera_id}",
        "camera_id": camera_id,
        "status": "running",
        "analysis_enabled": enable_analysis,
        "realtime_detection_enabled": enable_realtime_detection,
        "age_months": age_months,
        "detection_mode": "gemini only (opencv disabled)",
        "gemini_interval": "45 seconds",
        "stream_url": f"/api/live-monitoring/stream/{camera_id}"
    }


def get_current_user_id_optional(request: Request) -> Optional[int]:
    """선택적 사용자 ID 가져오기 (인증 실패 시 None 반환)"""
    try:
        from app.utils.auth_utils import get_current_user_id
        # get_current_user_id는 Depends이므로 직접 호출할 수 없음
        # 대신 토큰을 직접 파싱
        from jose import jwt, JWTError
        import os
        
        # 쿠키에서 토큰 가져오기
        token = request.cookies.get("access_token")
        if not token:
            # Authorization 헤더에서 가져오기
            auth_header = request.headers.get("authorization", "")
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
        
        if token:
            secret_key = os.getenv("JWT_SECRET_KEY")
            if secret_key:
                try:
                    payload = jwt.decode(token, secret_key, algorithms=["HS256"])
                    return payload.get("user_id")
                except JWTError:
                    pass
        return None
    except Exception:
        return None


@router.post("/start-hls-stream/{camera_id}")
async def start_hls_stream(
    camera_id: str,
    request: Request,
    camera_url: str = Query(None, description="홈캠 RTSP/HTTP URL (실제 카메라인 경우)"),
    enable_analysis: bool = Query(True, description="10분 단위 분석 활성화"),
    enable_realtime_detection: bool = Query(True, description="실시간 이벤트 탐지 활성화"),
    age_months: int = Query(None, description="아이의 개월 수"),
    s3_keys: Optional[str] = Query(None, description="S3 키 목록 (쉼표로 구분, 메인 서버에서 전달 시 DB 조회 생략)"),
    db: Session = Depends(get_db)
):
    """
    HLS 스트림 시작 (진짜 실시간 스트림)
    - 백그라운드에서 계속 실행
    - 재연결 시 자동으로 현재 시간부터 재생
    - 가짜 영상 또는 실제 홈캠 지원
    """
    # 이미 실행 중인 스트림이 있으면 자동으로 중지
    if camera_id in active_hls_streams:
        print(f"[API] 기존 HLS 스트림 발견, 자동 중지 후 재시작: {camera_id}")
        
        # 기존 스트림 중지
        generator = active_hls_streams[camera_id]
        generator.stop_streaming()
        
        # 태스크 취소
        if camera_id in hls_stream_tasks:
            task = hls_stream_tasks[camera_id]
            if not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
            del hls_stream_tasks[camera_id]
        
        del active_hls_streams[camera_id]
        
        # 분석 스케줄러 중지
        await stop_segment_analysis_for_camera(camera_id)
    
    # 실제 카메라인지 가짜 영상인지 판단
    is_real_camera = camera_url is not None
    
    if is_real_camera:
        # 실제 홈캠
        video_source = camera_url
        output_dir = Path(f"temp_videos/hls_buffer/{camera_id}")
    else:
        # 사용자 업로드 영상
        from app.models.camera_setting import CameraSetting, CameraVideo
        from app.services.s3_service import S3Service
        
        video_dir = Path(f"videos/{camera_id}")
        if not video_dir.exists():
            video_dir.mkdir(parents=True, exist_ok=True)
        
        user_id = get_current_user_id_optional(request)
        s3_service = S3Service()
        active_videos_list = []
        
        # S3 키가 직접 전달된 경우 (메인 서버에서 호출, DB 조회 생략)
        if s3_keys and s3_service.is_enabled():
            print(f"[HLS 스트림 시작] S3 키 직접 전달됨 (DB 조회 생략): {s3_keys}")
            s3_key_list = [key.strip() for key in s3_keys.split(",") if key.strip()]
            
            for s3_key in s3_key_list:
                # S3 키에서 파일명 추출 (예: videos/camera-1/filename.mp4 -> filename.mp4)
                filename = s3_key.split("/")[-1]
                local_video_path = video_dir / filename
                
                # S3에서 다운로드
                if not local_video_path.exists():
                    print(f"[HLS 스트림 시작] 📥 S3에서 다운로드 중: {s3_key}")
                    success = s3_service.download_camera_video(s3_key, local_video_path)
                    if not success:
                        print(f"[HLS 스트림 시작] ❌ S3 다운로드 실패: {s3_key}")
                        continue
                else:
                    print(f"[HLS 스트림 시작] ✅ 로컬 파일 존재: {filename}")
                
                # HLSStreamGenerator에서 사용할 수 있는 형태로 저장
                active_videos_list.append({
                    'filename': filename,
                    's3_key': s3_key,
                    'local_path': local_video_path
                })
            
            if len(active_videos_list) == 0:
                raise HTTPException(
                    400,
                    "S3에서 영상을 다운로드할 수 없습니다."
                )
        else:
            # 기존 방식: DB에서 조회 (로컬 실행 또는 직접 호출 시)
            if not user_id:
                raise HTTPException(
                    401,
                    "인증이 필요합니다. S3 키를 직접 전달하거나 로그인해주세요."
                )
            
            camera_setting = db.query(CameraSetting).filter(
                CameraSetting.camera_id == camera_id,
                CameraSetting.user_id == user_id,
                CameraSetting.is_active == True
            ).first()
            
            if not camera_setting:
                raise HTTPException(
                    400, 
                    "카메라 설정을 찾을 수 없습니다. Settings 페이지에서 먼저 카메라를 설정해주세요."
                )
            
            active_videos_list = db.query(CameraVideo).filter(
                CameraVideo.camera_setting_id == camera_setting.id,
                CameraVideo.is_active == True
            ).order_by(CameraVideo.order_index).all()
            
            if len(active_videos_list) == 0:
                raise HTTPException(
                    400, 
                    "활성화된 영상이 없습니다. Settings 페이지에서 먼저 영상을 업로드해주세요."
                )
            
            # S3에서 영상 다운로드 (DB 조회 후)
            if s3_service.is_enabled():
                print(f"[HLS 스트림 시작] S3에서 영상 다운로드 시작: {camera_id}")
                for camera_video in active_videos_list:
                    if camera_video.s3_key:
                        local_video_path = video_dir / camera_video.filename
                        if not local_video_path.exists():
                            success = s3_service.download_camera_video(camera_video.s3_key, local_video_path)
                            if not success:
                                print(f"[HLS 스트림 시작] ⚠️ S3 다운로드 실패: {camera_video.s3_key}")
                    else:
                        print(f"[HLS 스트림 시작] ⚠️ S3 키 없음: {camera_video.filename}, 로컬 파일만 사용")
            else:
                print(f"[HLS 스트림 시작] ⚠️ S3가 비활성화되어 있습니다. 로컬 파일만 사용")
        
        video_source = video_dir
        output_dir = Path(f"temp_videos/hls_buffer/{camera_id}")
    
    # 현재 이벤트 루프 가져오기
    loop = asyncio.get_running_loop()
    
    # HLS 스트림 생성기 생성 (DB 세션 전달)
    # user_id 가져오기 (S3 키가 전달된 경우 None일 수 있음)
    final_user_id = get_current_user_id_optional(request)
    
    generator = HLSStreamGenerator(
        camera_id=camera_id,
        video_source=video_source,
        output_dir=output_dir,
        is_real_camera=is_real_camera,
        segment_duration=10,  # 10초 단위 HLS 세그먼트
        enable_realtime_detection=enable_realtime_detection,
        age_months=age_months,
        event_loop=loop,
        db_session=db,  # DB 세션 전달
        user_id=final_user_id  # 사용자 ID 전달 (None일 수 있음)
    )
    active_hls_streams[camera_id] = generator
    
    # 백그라운드 태스크로 실행
    task = asyncio.create_task(generator.start_streaming())
    hls_stream_tasks[camera_id] = task
    
    # 10분 단위 분석 스케줄러 시작
    if enable_analysis:
        await start_segment_analysis_for_camera(camera_id)
    
    stream_type = "실제 홈캠" if is_real_camera else "가짜 영상"
    print(f"[API] HLS 스트림 시작: {camera_id} ({stream_type}, 10분 단위 분석: {enable_analysis})")
    
    return {
        "message": f"HLS 스트림 시작: {camera_id}",
        "camera_id": camera_id,
        "status": "running",
        "stream_type": stream_type,
        "analysis_enabled": enable_analysis,
        "playlist_url": generator.get_playlist_url()
    }


@router.get("/stream-status/{camera_id}")
async def get_stream_status(camera_id: str):
    """HLS 스트림 상태 확인"""
    # 메인 서버에서는 스트리밍 서버의 상태를 확인
    enable_hls_streaming = os.getenv("ENABLE_HLS_STREAMING", "false").lower() == "true"
    
    if enable_hls_streaming:
        # 스트리밍 서버에서 직접 확인 (로컬 실행)
        is_active = camera_id in active_hls_streams
        
        if is_active:
            generator = active_hls_streams[camera_id]
            return {
                "camera_id": camera_id,
                "is_active": True,
                "is_running": generator.is_running,
                "playlist_url": f"/api/live-monitoring/hls/{camera_id}/{camera_id}.m3u8",
                "message": "스트림 실행 중"
            }
        else:
            return {
                "camera_id": camera_id,
                "is_active": False,
                "is_running": False,
                "playlist_url": None,
                "message": "스트림 중지됨"
            }
    else:
        # 메인 서버에서는 스트리밍 서버의 상태를 확인
        streaming_server_url = os.getenv("STREAMING_SERVER_URL", "https://stream.dailycam.net")
        
        try:
            async with httpx.AsyncClient(verify=False, timeout=5.0) as client:
                response = await client.get(
                    f"{streaming_server_url}/api/live-monitoring/stream-status/{camera_id}"
                )
                if response.status_code == 200:
                    return response.json()
                else:
                    print(f"[스트림 상태 확인] 스트리밍 서버 응답 오류: {response.status_code} - {response.text}")
                    return {
                        "camera_id": camera_id,
                        "is_active": False,
                        "is_running": False,
                        "playlist_url": None,
                        "message": "스트림 상태 확인 실패"
                    }
        except httpx.TimeoutException:
            print(f"[스트림 상태 확인] 스트리밍 서버 타임아웃: {camera_id}")
            return {
                "camera_id": camera_id,
                "is_active": False,
                "is_running": False,
                "playlist_url": None,
                "message": "스트림 상태 확인 타임아웃"
            }
        except Exception as e:
            print(f"[스트림 상태 확인] 스트리밍 서버 호출 실패: {e}")
            import traceback
            traceback.print_exc()
            return {
                "camera_id": camera_id,
                "is_active": False,
                "is_running": False,
                "playlist_url": None,
                "message": "스트림 상태 확인 실패"
            }


@router.post("/stop-hls-stream/{camera_id}")
async def stop_hls_stream(camera_id: str):
    """HLS 스트림 중지"""
    if camera_id not in active_hls_streams:
        raise HTTPException(status_code=404, detail="실행 중인 HLS 스트림이 없습니다")
    
    # 스트림 중지
    generator = active_hls_streams[camera_id]
    generator.stop_streaming()
    
    # 태스크 취소
    if camera_id in hls_stream_tasks:
        task = hls_stream_tasks[camera_id]
        if not task.done():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
        del hls_stream_tasks[camera_id]
    
    del active_hls_streams[camera_id]
    
    # 분석 스케줄러 중지
    await stop_segment_analysis_for_camera(camera_id)
    
    print(f"[API] HLS 스트림 중지: {camera_id}")
    
    return {
        "message": f"HLS 스트림 중지: {camera_id}",
        "camera_id": camera_id,
        "status": "stopped"
    }


@router.get("/hls/{camera_id}/{filename}")
async def serve_hls_file(camera_id: str, filename: str):
    """HLS 파일 제공 (.m3u8 플레이리스트 또는 .ts 세그먼트)"""
    file_path = Path(f"temp_videos/hls_buffer/{camera_id}/hls/{filename}")
    
    # 파일이 생성될 때까지 잠시 대기 (최대 5초)
    # FFmpeg가 파일을 생성하는 데 시간이 걸릴 수 있음
    if not file_path.exists():
        for _ in range(25):  # 0.2초 * 25 = 5초
            await asyncio.sleep(0.2)
            if file_path.exists():
                break
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다")
    
    # MIME 타입 설정
    if filename.endswith('.m3u8'):
        media_type = "application/vnd.apple.mpegurl"
        # m3u8 파일은 동적으로 업데이트되므로 파일 내용을 직접 읽어서 반환
        # FileResponse는 Content-Length를 먼저 계산하는데, 파일이 업데이트되면 길이가 달라져서 에러 발생
        try:
            # 파일 내용을 읽기 (동기 I/O를 별도 스레드에서 실행)
            def read_file():
                with open(file_path, 'rb') as f:
                    return f.read()
            
            file_content = await asyncio.to_thread(read_file)
            
            return Response(
                content=file_content,
                media_type=media_type,
                headers={
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    "Pragma": "no-cache",
                    "Expires": "0"
                }
            )
        except Exception as e:
            print(f"[HLS] m3u8 파일 읽기 실패: {e}")
            raise HTTPException(status_code=500, detail="파일을 읽을 수 없습니다")
    elif filename.endswith('.ts'):
        media_type = "video/mp2t"
        # ts 파일은 FileResponse 사용 (크기가 크고 변경이 적음)
        return FileResponse(
            file_path,
            media_type=media_type,
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        )
    else:
        media_type = "application/octet-stream"
        return FileResponse(
            file_path,
            media_type=media_type,
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        )


@router.post("/stop-stream/{camera_id}")
async def stop_stream(camera_id: str):
    """스트림 및 분석 스케줄러 중지"""
    if camera_id not in active_streams:
        raise HTTPException(status_code=404, detail="실행 중인 스트림이 없습니다")
    
    # 스트림 중지
    generator = active_streams[camera_id]
    generator.stop_streaming()
    
    # 태스크 취소
    if camera_id in stream_tasks:
        task = stream_tasks[camera_id]
        if not task.done():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
        del stream_tasks[camera_id]
    
    del active_streams[camera_id]
    
    # 분석 스케줄러 중지 (10분 단위)
    stop_segment_analysis_for_camera(camera_id)
    
    print(f"[API] 스트림 및 10분 단위 분석 중지: {camera_id}")
    
    return {
        "message": f"스트림 및 분석 중지: {camera_id}",
        "camera_id": camera_id,
        "status": "stopped"
    }

@router.get("/stream/{camera_id}")
async def stream_video(
    camera_id: str,
    loop: bool = Query(True, description="반복 재생 여부"),
    speed: float = Query(1.0, description="재생 속도"),
    video_path: str = Query(None, description="특정 비디오 경로"),
    use_segments: bool = Query(True, description="세그먼트 파일 기반 스트리밍 사용 여부"),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """
    실시간 스트림 (MJPEG 스트리밍)
    
    세그먼트 파일 기반 스트리밍 (권장):
    - FakeLiveStreamGenerator가 생성한 10분 단위 세그먼트 파일을 스트리밍
    - 재연결 시 현재 시간에 해당하는 세그먼트부터 재생 (이어서 재생 효과)
    - 홈캠 연동 시에도 동일한 구조 사용 가능
    
    원본 영상 기반 스트리밍 (fallback):
    - use_segments=False일 때 원본 영상들을 순환 재생
    """
    # 세그먼트 파일 기반 스트리밍 (권장)
    if use_segments:
        buffer_dir = Path(f"temp_videos/hourly_buffer/{camera_id}")
        
        # 완료된 세그먼트 파일만 필터링 (현재 작성 중인 파일 제외)
        def is_segment_complete(seg_file: Path) -> bool:
            """세그먼트 파일이 완료되었는지 확인"""
            try:
                # 파일이 최근 5초 이내에 수정되었으면 아직 작성 중일 수 있음
                import time
                file_mtime = seg_file.stat().st_mtime
                current_time = time.time()
                
                # 5초 이내에 수정되었으면 아직 작성 중
                if current_time - file_mtime < 5:
                    return False
                
                # 파일 크기가 너무 작으면 아직 작성 중
                if seg_file.stat().st_size < 1000:  # 1KB 미만
                    return False
                
                # VideoCapture로 열어서 확인
                cap = cv2.VideoCapture(str(seg_file))
                if not cap.isOpened():
                    cap.release()
                    return False
                
                # 최소 1프레임이라도 읽을 수 있는지 확인
                ret, _ = cap.read()
                cap.release()
                return ret
            except Exception:
                return False
        
        # 완료된 세그먼트 파일만 필터링
        all_segment_files = sorted(buffer_dir.glob("segment_*.mp4"))
        segment_files = [f for f in all_segment_files if is_segment_complete(f)]
        
        if segment_files:
            # 현재 시간에 해당하는 세그먼트 찾기
            now = datetime.now()
            current_segment = None
            current_segment_index = 0
            
            for i, seg_file in enumerate(segment_files):
                # 파일명에서 시간 추출: segment_YYYYMMDD_HHMMSS.mp4
                try:
                    time_str = seg_file.stem.replace('segment_', '')
                    seg_time = datetime.strptime(time_str, '%Y%m%d_%H%M%S')
                    seg_end = seg_time + timedelta(minutes=10)
                    
                    if seg_time <= now < seg_end:
                        current_segment = seg_file
                        current_segment_index = i
                        break
                    elif seg_time > now:
                        # 현재 시간보다 미래 세그먼트면 이전 세그먼트 사용
                        if i > 0:
                            current_segment = segment_files[i - 1]
                            current_segment_index = i - 1
                        else:
                            current_segment = segment_files[0]
                            current_segment_index = 0
                        break
                except ValueError:
                    continue
            
            # 현재 세그먼트가 없으면 가장 최근 완료된 세그먼트 사용
            if current_segment is None:
                current_segment = segment_files[-1] if segment_files else None
                current_segment_index = len(segment_files) - 1
            
            if current_segment:
                print(f"[스트림] 세그먼트 파일 기반 스트리밍: {current_segment.name} (인덱스: {current_segment_index}, 완료된 세그먼트: {len(segment_files)}개)")
                
                async def generate_frames_from_segments():
                    segment_index = current_segment_index
                    last_segment_count = len(segment_files)
                    
                    try:
                        while True:
                            # 세그먼트 파일 목록이 업데이트되었는지 확인 (새로운 세그먼트가 생성되었을 수 있음)
                            current_segment_files = sorted([f for f in buffer_dir.glob("segment_*.mp4") if is_segment_complete(f)])
                            
                            if segment_index >= len(current_segment_files):
                                if loop:
                                    segment_index = 0
                                else:
                                    break
                            
                            current_seg = current_segment_files[segment_index]
                            print(f"[스트림] 세그먼트 재생: {current_seg.name}")
                            
                            cap = cv2.VideoCapture(str(current_seg))
                            if not cap.isOpened():
                                print(f"[스트림] 세그먼트 파일을 열 수 없습니다: {current_seg}")
                                segment_index += 1
                                continue
                            
                            fps = cap.get(cv2.CAP_PROP_FPS)
                            if fps <= 0:
                                fps = 5.0  # 세그먼트는 5fps로 생성됨
                            
                            frame_count = 0
                            while True:
                                ret, frame = cap.read()
                                if not ret:
                                    break
                                
                                frame_count += 1
                                
                                # JPEG로 인코딩
                                ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
                                if not ret:
                                    continue
                                
                                frame_bytes = buffer.tobytes()
                                
                                # MJPEG 형식으로 전송
                                yield (b'--frame\r\n'
                                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
                                
                                # 속도 조절
                                if speed > 0:
                                    await asyncio.sleep(1.0 / (fps * speed))
                            
                            cap.release()
                            print(f"[스트림] 세그먼트 재생 완료: {current_seg.name} ({frame_count} 프레임)")
                            
                            segment_index += 1
                            
                    except asyncio.CancelledError:
                        print(f"[스트림] 클라이언트 연결 끊김, 스트리밍 중지")
                        raise
                    finally:
                        print(f"[스트림] 스트리밍 종료: {camera_id}")
                
                return StreamingResponse(
                    generate_frames_from_segments(),
                    media_type="multipart/x-mixed-replace; boundary=frame"
                )
            else:
                print(f"[스트림] 완료된 세그먼트 파일이 없습니다. 원본 영상 기반 스트리밍으로 전환")
    
    # 원본 영상 기반 스트리밍 (fallback)
    video_dir = Path(f"videos/{camera_id}")
    
    # 비디오 파일 찾기 (DB 기반)
    from app.models.camera_setting import CameraSetting, CameraVideo
    
    video_files = []
    if video_path:
        video_files = [Path(video_path)]
    else:
        # DB에서 활성화된 영상 조회
        try:
            camera_setting = db.query(CameraSetting).filter(
                CameraSetting.camera_id == camera_id,
                CameraSetting.user_id == user_id,
                CameraSetting.is_active == True
            ).first()
            
            if camera_setting:
                camera_videos = db.query(CameraVideo).filter(
                    CameraVideo.camera_setting_id == camera_setting.id,
                    CameraVideo.is_active == True
                ).order_by(CameraVideo.order_index).all()
                
                for video in camera_videos:
                    video_path_obj = Path(video.file_path)
                    if video_path_obj.exists():
                        video_files.append(video_path_obj)
        except Exception as e:
            print(f"[스트림] DB 조회 실패, 로컬 파일 시스템 사용: {e}")
            # 폴백: 로컬 파일 시스템
            video_files = sorted(video_dir.glob("user_uploaded_*.mp4"))
        
        if not video_files:
            raise HTTPException(
                status_code=404,
                detail=f"업로드된 영상이 없습니다. Settings 페이지에서 영상을 업로드해주세요."
            )
    
    print(f"[스트림] 원본 영상 기반 스트리밍: {camera_id}, {len(video_files)}개 파일")
    
    # MJPEG 스트리밍 생성 (여러 파일 순환 재생)
    async def generate_frames():
        import time
        video_index = 0
        
        try:
            while True:
                # 현재 비디오 파일 선택
                current_video = video_files[video_index % len(video_files)]
                
                cap = None
                try:
                    cap = cv2.VideoCapture(str(current_video))
                    
                    # VideoCapture가 제대로 열렸는지 확인
                    if not cap.isOpened():
                        print(f"[스트림] 비디오 파일을 열 수 없습니다: {current_video}")
                        video_index += 1
                        continue
                    
                    # 원본 영상의 fps 가져오기
                    original_fps = cap.get(cv2.CAP_PROP_FPS)
                    if original_fps <= 0:
                        original_fps = 30  # 기본값
                    
                    print(f"[스트림] 재생 중: {current_video.name} (fps: {original_fps})")
                    
                    frame_count = 0
                    while True:
                        ret, frame = cap.read()
                        if not ret:
                            # 현재 비디오 끝, 다음 비디오로
                            break
                        
                        frame_count += 1
                        
                        # JPEG로 인코딩
                        ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
                        if not ret:
                            continue
                        
                        frame_bytes = buffer.tobytes()
                        
                        # MJPEG 형식으로 전송
                        yield (b'--frame\r\n'
                               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
                        
                        # 속도 조절 (원본 fps 기준)
                        if speed > 0:
                            await asyncio.sleep(1.0 / (original_fps * speed))
                    
                    cap.release()
                    print(f"[스트림] 재생 완료: {current_video.name} ({frame_count} 프레임)")
                    
                    # 다음 비디오로
                    video_index += 1
                    
                    # loop가 False면 모든 비디오 재생 후 종료
                    if not loop and video_index >= len(video_files):
                        break
                        
                except Exception as e:
                    print(f"[스트림] 에러 발생: {e}")
                    if cap is not None:
                        cap.release()
                    video_index += 1
                    continue
        except asyncio.CancelledError:
            print(f"[스트림] 클라이언트 연결 끊김, 스트리밍 중지")
            raise
        finally:
            print(f"[스트림] 스트리밍 종료: {camera_id}")
    
    return StreamingResponse(
        generate_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


@router.get("/status/{camera_id}")
async def get_stream_status(camera_id: str):
    """스트림 상태 조회"""
    is_running = camera_id in active_streams
    
    buffer_dir = Path(f"temp_videos/hourly_buffer/{camera_id}")
    segment_files = list(buffer_dir.glob("segment_*.mp4"))
    hourly_files = list(buffer_dir.glob("hourly_*.mp4"))  # 레거시
    
    return {
        "camera_id": camera_id,
        "is_running": is_running,
        "segment_files_count": len(segment_files),
        "segment_files": [f.name for f in sorted(segment_files)[-10:]],  # 최근 10개 (5분 단위)
        "hourly_files_count": len(hourly_files),  # 레거시
        "hourly_files": [f.name for f in sorted(hourly_files)[-5:]]  # 레거시
    }


@router.get("/list-hourly-files/{camera_id}")
async def list_hourly_files(camera_id: str):
    """1시간 단위 버퍼 파일 목록 조회 (레거시)"""
    buffer_dir = Path(f"temp_videos/hourly_buffer/{camera_id}")
    
    if not buffer_dir.exists():
        return {"camera_id": camera_id, "files": []}
    
    hourly_files = sorted(buffer_dir.glob("hourly_*.mp4"))
    
    files_info = []
    for file_path in hourly_files:
        stat = file_path.stat()
        files_info.append({
            "filename": file_path.name,
            "path": str(file_path),
            "size_mb": round(stat.st_size / (1024 * 1024), 2),
            "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat()
        })
    
    return {
        "camera_id": camera_id,
        "total_files": len(files_info),
        "files": files_info
    }


@router.get("/list-segment-files/{camera_id}")
async def list_segment_files(camera_id: str):
    """5분 단위 버퍼 파일 목록 조회"""
    buffer_dir = Path(f"temp_videos/hourly_buffer/{camera_id}")
    
    if not buffer_dir.exists():
        return {"camera_id": camera_id, "files": []}
    
    segment_files = sorted(buffer_dir.glob("segment_*.mp4"))
    
    files_info = []
    for file_path in segment_files:
        stat = file_path.stat()
        files_info.append({
            "filename": file_path.name,
            "path": str(file_path),
            "size_mb": round(stat.st_size / (1024 * 1024), 2),
            "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat()
        })
    
    return {
        "camera_id": camera_id,
        "total_files": len(files_info),
        "files": files_info
    }


@router.delete("/reset/{camera_id}")
async def reset_monitoring_data(
    camera_id: str,
    db: Session = Depends(get_db)
):
    """
    모니터링 데이터 초기화
    - 실시간 이벤트, 5분 단위 분석 결과, 1시간 단위 분석 결과 삭제
    """
    realtime_deleted = db.query(RealtimeEvent).filter(
        RealtimeEvent.camera_id == camera_id
    ).delete(synchronize_session=False)
    
    segment_deleted = db.query(SegmentAnalysis).filter(
        SegmentAnalysis.camera_id == camera_id
    ).delete(synchronize_session=False)
    
    hourly_deleted = db.query(HourlyAnalysis).filter(
        HourlyAnalysis.camera_id == camera_id
    ).delete(synchronize_session=False)
    
    db.commit()
    
    print(f"[모니터링 초기화] {camera_id}: realtime={realtime_deleted}, segment={segment_deleted}, hourly={hourly_deleted}")
    
    return {
        "camera_id": camera_id,
        "realtime_events_deleted": realtime_deleted,
        "segment_analyses_deleted": segment_deleted,
        "hourly_analyses_deleted": hourly_deleted,
        "message": "모니터링 데이터가 초기화되었습니다."
    }


@router.get("/events/{camera_id}")
async def get_realtime_events(
    camera_id: str,
    limit: int = Query(50, description="최대 이벤트 수"),
    since: datetime = Query(None, description="이 시간 이후의 이벤트만 조회"),
    event_type: str = Query(None, description="이벤트 타입 필터 (safety/development)"),
    db: Session = Depends(get_db)
):
    """
    실시간 이벤트 조회
    """
    query = db.query(RealtimeEvent).filter(RealtimeEvent.camera_id == camera_id)
    
    if since:
        query = query.filter(RealtimeEvent.timestamp >= since)
    
    if event_type:
        query = query.filter(RealtimeEvent.event_type == event_type)
    
    events = query.order_by(desc(RealtimeEvent.timestamp)).limit(limit).all()
    
    return {
        "camera_id": camera_id,
        "total": len(events),
        "events": [
            {
                "id": event.id,
                "timestamp": event.timestamp.isoformat(),
                "event_type": event.event_type,
                "severity": event.severity,
                "title": event.title,
                "description": event.description,
                "location": event.location,
                "metadata": event.event_metadata
            }
            for event in events
        ]
    }


@router.get("/events/{camera_id}/latest")
async def get_latest_events(
    camera_id: str,
    limit: int = Query(10, description="최대 이벤트 수"),
    db: Session = Depends(get_db)
):
    """
    최신 실시간 이벤트 조회 (폴링용)
    """
    events = db.query(RealtimeEvent).filter(
        RealtimeEvent.camera_id == camera_id
    ).order_by(desc(RealtimeEvent.timestamp)).limit(limit).all()
    
    return {
        "camera_id": camera_id,
        "count": len(events),
        "events": [
            {
                "id": event.id,
                "timestamp": event.timestamp.isoformat(),
                "event_type": event.event_type,
                "severity": event.severity,
                "title": event.title,
                "description": event.description,
                "location": event.location,
                "metadata": event.event_metadata
            }
            for event in events
        ]
    }


@router.get("/stats/{camera_id}")
async def get_monitoring_stats(
    camera_id: str,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """
    모니터링 통계 조회
    - KST 기준으로 '오늘'을 정의하고, DB(UTC)에서 데이터를 조회합니다.
    - Fallback: SegmentAnalysis/RealtimeEvent가 없으면 AnalysisLog/SafetyEvent(사용자 기준)를 사용하여 추정치를 반환합니다.
    """
    from datetime import datetime, timedelta
    import pytz
    from app.models.analysis import AnalysisLog, SafetyEvent
    
    # KST 기준 오늘 0시 구하기
    korea_tz = pytz.timezone('Asia/Seoul')
    utc_tz = pytz.UTC
    
    now_kst = datetime.now(korea_tz)
    today_start_kst = now_kst.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end_kst = today_start_kst + timedelta(days=1)
    
    # DB 조회를 위해 UTC로 변환
    today_start_utc = today_start_kst.astimezone(utc_tz).replace(tzinfo=None)
    today_end_utc = today_end_kst.astimezone(utc_tz).replace(tzinfo=None)
    
    # 1. 오늘의 이벤트 수 (RealtimeEvent 기준 - 카메라 중심)
    total_events = db.query(RealtimeEvent).filter(
        RealtimeEvent.camera_id == camera_id,
        RealtimeEvent.timestamp >= today_start_utc
    ).count()
    
    danger_events = db.query(RealtimeEvent).filter(
        RealtimeEvent.camera_id == camera_id,
        RealtimeEvent.timestamp >= today_start_utc,
        RealtimeEvent.severity == 'danger'
    ).count()
    
    warning_events = db.query(RealtimeEvent).filter(
        RealtimeEvent.camera_id == camera_id,
        RealtimeEvent.timestamp >= today_start_utc,
        RealtimeEvent.severity == 'warning'
    ).count()
    
    # 최근 1시간 이벤트 수 (RealtimeEvent 기준)
    hour_ago = datetime.utcnow() - timedelta(hours=1)
    recent_events = db.query(RealtimeEvent).filter(
        RealtimeEvent.camera_id == camera_id,
        RealtimeEvent.timestamp >= hour_ago
    ).count()
    
    # 2. 오늘의 총 모니터링 시간 계산 (SegmentAnalysis 기준)
    today_segments = db.query(SegmentAnalysis).filter(
        SegmentAnalysis.camera_id == camera_id,
        SegmentAnalysis.segment_start >= today_start_utc,
        SegmentAnalysis.status == 'completed'
    ).all()
    
    total_monitoring_seconds = sum(
        (s.segment_end - s.segment_start).total_seconds() 
        for s in today_segments
    )
    total_monitoring_minutes = int(total_monitoring_seconds / 60)
    
    # === Fallback Logic (사용자 중심) ===
    # RealtimeEvent(카메라) 데이터가 없으면 AnalysisLog(사용자) 데이터 사용
    if total_events == 0 and total_monitoring_minutes == 0:
        # User ID로 AnalysisLog 조회
        fallback_logs = db.query(AnalysisLog).filter(
            AnalysisLog.user_id == user_id,
            AnalysisLog.created_at >= today_start_utc,
            AnalysisLog.created_at < today_end_utc
        ).all()
        
        if fallback_logs:
            print(f"[Stats] Fallback to AnalysisLog for user {user_id}: {len(fallback_logs)} logs")
            # 모니터링 시간 추정 (로그 개수 * 10분)
            total_monitoring_minutes = len(fallback_logs) * 10
            
            # 이벤트 수 집계 (SafetyEvent 조인)
            fallback_events = (
                db.query(SafetyEvent)
                .join(AnalysisLog, SafetyEvent.analysis_log_id == AnalysisLog.id)
                .filter(
                    AnalysisLog.user_id == user_id,
                    AnalysisLog.created_at >= today_start_utc,
                    AnalysisLog.created_at < today_end_utc
                ).all()
            )
            
            total_events = len(fallback_events)
            
            # 위험/경고 분류
            danger_count = 0
            warning_count = 0
            
            for event in fallback_events:
                # Severity check
                sev = str(event.severity)
                if '위험' in sev or 'danger' in sev or event.severity == 'danger':
                    danger_count += 1
                elif '주의' in sev or 'warning' in sev or event.severity == 'warning':
                    warning_count += 1
                
            danger_events = danger_count
            warning_events = warning_count
            
            # Recent events (AnalysisLog based estimate)
            recent_events = (
                db.query(SafetyEvent)
                .join(AnalysisLog, SafetyEvent.analysis_log_id == AnalysisLog.id)
                .filter(
                    AnalysisLog.user_id == user_id,
                    AnalysisLog.created_at >= hour_ago
                ).count()
            )

    return {
        "camera_id": camera_id,
        "today_total_events": total_events,
        "danger_events": danger_events,
        "warning_events": warning_events,
        "recent_hour_events": recent_events,
        "today_monitoring_minutes": total_monitoring_minutes,
        "is_active": camera_id in active_streams
    }



@router.get("/daily-report/{camera_id}")
async def get_daily_report(
    camera_id: str,
    date: str = Query(..., description="리포트 날짜 (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    """
    일일 리포트 조회
    - 해당 날짜의 리포트가 없으면 자동 생성
    """
    from datetime import datetime
    
    try:
        report_date = datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="날짜 형식이 올바르지 않습니다 (YYYY-MM-DD)")
    
    # 기존 리포트 조회
    report = db.query(DailyReport).filter(
        DailyReport.camera_id == camera_id,
        DailyReport.report_date == report_date
    ).first()
    
    # 리포트가 없으면 생성
    if not report:
        generator = DailyReportGenerator(camera_id, report_date)
        report = await generator.generate_report()
        
        if not report:
            raise HTTPException(
                status_code=404, 
                detail=f"{date} 날짜의 분석 데이터가 없어 리포트를 생성할 수 없습니다"
            )
    
    return {
        "camera_id": report.camera_id,
        "report_date": report.report_date.date().isoformat(),
        "total_hours_analyzed": report.total_hours_analyzed,
        "average_safety_score": report.average_safety_score,
        "total_incidents": report.total_incidents,
        "safety_summary": report.safety_summary,
        "development_summary": report.development_summary,
        "hourly_summary": report.hourly_summary,
        "timeline_events": report.timeline_events,
        "created_at": report.created_at.isoformat(),
        "updated_at": report.updated_at.isoformat()
    }


@router.get("/daily-reports/{camera_id}/list")
async def list_daily_reports(
    camera_id: str,
    limit: int = Query(30, description="최대 리포트 수"),
    db: Session = Depends(get_db)
):
    """
    일일 리포트 목록 조회 (최근 N일)
    """
    reports = db.query(DailyReport).filter(
        DailyReport.camera_id == camera_id
    ).order_by(desc(DailyReport.report_date)).limit(limit).all()
    
    return {
        "camera_id": camera_id,
        "total": len(reports),
        "reports": [
            {
                "report_date": r.report_date.date().isoformat(),
                "total_hours_analyzed": r.total_hours_analyzed,
                "average_safety_score": r.average_safety_score,
                "total_incidents": r.total_incidents,
                "created_at": r.created_at.isoformat()
            }
            for r in reports
        ]
    }


@router.get("/segment-analyses/{camera_id}")
async def get_segment_analyses(
    camera_id: str,
    date: str = Query(None, description="특정 날짜 (YYYY-MM-DD)"),
    limit: int = Query(50, description="최대 분석 수"),
    db: Session = Depends(get_db)
):
    """
    5분 단위 분석 결과 조회
    """
    query = db.query(SegmentAnalysis).filter(
        SegmentAnalysis.camera_id == camera_id,
        SegmentAnalysis.status == 'completed'
    )
    
    if date:
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d")
            day_start = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            
            query = query.filter(
                SegmentAnalysis.segment_start >= day_start,
                SegmentAnalysis.segment_start < day_end
            )
        except ValueError:
            raise HTTPException(status_code=400, detail="날짜 형식이 올바르지 않습니다 (YYYY-MM-DD)")
    
    analyses = query.order_by(desc(SegmentAnalysis.segment_start)).limit(limit).all()
    
    return {
        "camera_id": camera_id,
        "date": date,
        "total": len(analyses),
        "analyses": [
            {
                "id": a.id,
                "segment_start": a.segment_start.isoformat(),
                "segment_end": a.segment_end.isoformat(),
                "safety_score": a.safety_score,
                "incident_count": a.incident_count,
                "status": a.status,
                "completed_at": a.completed_at.isoformat() if a.completed_at else None
            }
            for a in analyses
        ]
    }
