"""API routes for live monitoring features."""

import asyncio
import os
import time
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse

from app.schemas.live_monitoring import LiveMonitoringRequest, LiveMonitoringResponse
from app.services.live_monitoring import LiveMonitoringService, get_live_monitoring_service

router = APIRouter()

# 업로드된 비디오 파일을 임시 저장할 디렉토리
TEMP_VIDEO_DIR = Path("temp_videos")
TEMP_VIDEO_DIR.mkdir(exist_ok=True)


@router.post("/status", response_model=LiveMonitoringResponse)
async def get_live_status(
    payload: LiveMonitoringRequest,
    service: LiveMonitoringService = Depends(get_live_monitoring_service),
) -> LiveMonitoringResponse:
    """Return the live monitoring status."""
    return await service.status(payload)


@router.post("/upload-video")
async def upload_video_for_streaming(
    camera_id: str = Query(..., description="카메라 ID"),
    video: UploadFile = File(..., description="스트리밍할 비디오 파일"),
    service: LiveMonitoringService = Depends(get_live_monitoring_service),
):
    """
    비디오 파일을 업로드하여 스트리밍 준비를 합니다.
    
    업로드된 파일은 임시 디렉토리에 저장되며, 스트리밍 엔드포인트에서 사용할 수 있습니다.
    """
    import logging
    
    logger = logging.getLogger(__name__)
    
    logger.info(f"비디오 업로드 요청 받음: camera_id={camera_id}, filename={video.filename}")
    
    # 비디오 파일인지 확인
    if not video.content_type or not video.content_type.startswith("video/"):
        logger.warning(f"비디오 파일이 아님: content_type={video.content_type}")
        raise HTTPException(status_code=400, detail="비디오 파일만 업로드 가능합니다.")

    # 임시 파일로 저장
    file_extension = Path(video.filename or "video.mp4").suffix
    temp_file_path = TEMP_VIDEO_DIR / f"{camera_id}_{video.filename or 'video'}{file_extension}"

    try:
        logger.info(f"파일 저장 시작: {temp_file_path}")
        
        # 기존 파일이 있으면 삭제 (스트림이 사용 중일 수 있으므로 먼저 스트림 중지)
        if temp_file_path.exists():
            logger.info(f"기존 파일 발견: {temp_file_path}")
            
            # 해당 카메라의 스트림이 활성화되어 있으면 먼저 중지
            if camera_id in service.get_active_streams():
                logger.info(f"기존 스트림 중지 중: {camera_id}")
                await service.stop_stream(camera_id)
                # 스트림이 완전히 종료될 때까지 잠시 대기
                await asyncio.sleep(0.5)
            
            # 파일 삭제 시도
            try:
                temp_file_path.unlink()
                logger.info(f"기존 파일 삭제 완료: {temp_file_path}")
            except PermissionError as e:
                logger.warning(f"파일 삭제 실패 (사용 중): {e}")
                # 파일이 사용 중이면 다른 이름으로 저장
                timestamp = int(time.time())
                temp_file_path = TEMP_VIDEO_DIR / f"{camera_id}_{timestamp}_{video.filename or 'video'}{file_extension}"
                logger.info(f"새 파일명으로 저장: {temp_file_path}")
            except Exception as e:
                logger.error(f"파일 삭제 중 오류: {e}")
                # 파일 삭제 실패해도 계속 진행 (덮어쓰기 시도)
                pass

        # 파일 저장 (청크 단위로 읽어서 메모리 효율성 향상)
        total_size = 0
        with open(temp_file_path, "wb") as f:
            while True:
                chunk = await video.read(8192)  # 8KB 청크
                if not chunk:
                    break
                f.write(chunk)
                total_size += len(chunk)
                logger.debug(f"파일 저장 중: {total_size} bytes")

        logger.info(f"파일 저장 완료: {temp_file_path}, 크기: {total_size} bytes ({total_size / 1024 / 1024:.2f} MB)")

        # 절대 경로로 변환
        absolute_path = str(temp_file_path.resolve())

        return {
            "camera_id": camera_id,
            "video_path": absolute_path,
            "filename": video.filename,
            "message": "비디오 파일이 업로드되었습니다. 스트리밍 엔드포인트를 사용하세요.",
            "stream_url": f"/api/live-monitoring/stream/{camera_id}",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"파일 저장 중 오류 발생: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"파일 저장 중 오류 발생: {str(e)}")


@router.get("/stream/{camera_id}")
async def stream_video(
    camera_id: str,
    video_path: str | None = Query(None, description="비디오 파일 경로 (절대 경로 또는 상대 경로)"),
    loop: bool = Query(True, description="비디오 끝에 도달하면 처음부터 반복"),
    speed: float = Query(1.0, description="재생 속도 배율 (1.0 = 정상 속도)"),
    service: LiveMonitoringService = Depends(get_live_monitoring_service),
):
    """
    녹화된 비디오 파일을 MJPEG 스트림으로 제공합니다.
    
    사용 방법:
    1. /upload-video 엔드포인트로 비디오 파일 업로드
    2. 이 엔드포인트에 접속하여 스트림 받기
    
    또는 video_path 쿼리 파라미터로 직접 비디오 파일 경로 지정 가능
    """
    # video_path가 제공되지 않으면 임시 디렉토리에서 찾기
    if video_path is None:
        # 카메라 ID로 임시 파일 찾기
        temp_files = list(TEMP_VIDEO_DIR.glob(f"{camera_id}_*"))
        if not temp_files:
            raise HTTPException(
                status_code=404,
                detail=f"카메라 {camera_id}에 대한 비디오 파일을 찾을 수 없습니다. 먼저 /upload-video로 파일을 업로드하세요.",
            )
        # 수정 시간으로 정렬하여 가장 최근 파일 선택 (최신 파일이 먼저)
        temp_files.sort(key=lambda p: p.stat().st_mtime, reverse=True)
        video_path = str(temp_files[0])
        
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"파일 선택: {video_path} (수정 시간: {temp_files[0].stat().st_mtime})")
    else:
        # 절대 경로가 아니면 현재 작업 디렉토리 기준으로 해석
        if not os.path.isabs(video_path):
            video_path = os.path.abspath(video_path)

        if not os.path.exists(video_path):
            raise HTTPException(status_code=404, detail=f"비디오 파일을 찾을 수 없습니다: {video_path}")

    try:
        # 백그라운드 스트림이 실행 중이 아니면 시작
        if camera_id not in service.get_active_streams():
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"백그라운드 스트림 시작: {camera_id}")
            await service.start_background_stream(
                camera_id=camera_id,
                video_path=video_path,
                loop=loop,
                speed=speed,
            )
        
        return StreamingResponse(
            service.generate_mjpeg_stream(
                camera_id=camera_id,
                video_path=None,  # 이미 백그라운드에서 실행 중
                loop=loop,
                speed=speed,
            ),
            media_type="multipart/x-mixed-replace; boundary=frame",
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"스트리밍 중 오류 발생: {str(e)}")


@router.post("/stop-stream/{camera_id}")
async def stop_stream(
    camera_id: str,
    service: LiveMonitoringService = Depends(get_live_monitoring_service),
):
    """특정 카메라의 스트림을 중지합니다."""
    await service.stop_stream(camera_id)
    return {"message": f"카메라 {camera_id}의 스트림이 중지되었습니다."}


@router.get("/active-streams")
async def get_active_streams(
    service: LiveMonitoringService = Depends(get_live_monitoring_service),
):
    """현재 활성화된 스트림 목록을 반환합니다."""
    return {"active_streams": service.get_active_streams()}


