"""Live monitoring API routes"""

from fastapi import APIRouter, UploadFile, File, Query, HTTPException
from fastapi.responses import StreamingResponse, Response
from pathlib import Path
from datetime import datetime, timedelta
import asyncio
import cv2
import numpy as np
from typing import Dict

from app.services.live_monitoring.fake_stream_generator import FakeLiveStreamGenerator
from app.services.live_monitoring.hourly_analyzer import (
    start_hourly_analysis_for_camera,
    stop_hourly_analysis_for_camera
)

router = APIRouter()

# 전역 스트림 관리
active_streams: Dict[str, FakeLiveStreamGenerator] = {}
stream_tasks: Dict[str, asyncio.Task] = {}


@router.post("/upload-video")
async def upload_video_for_streaming(
    camera_id: str = Query(..., description="카메라 ID"),
    video: UploadFile = File(..., description="업로드할 비디오 파일")
):
    """
    비디오 파일 업로드 (기존 영상 저장용)
    업로드된 영상을 short 또는 medium 폴더에 저장
    """
    if not video.content_type or not video.content_type.startswith('video/'):
        raise HTTPException(status_code=400, detail="비디오 파일만 업로드 가능합니다")
    
    # 비디오 길이에 따라 short 또는 medium 폴더에 저장
    # 여기서는 기본적으로 short에 저장
    video_dir = Path(f"videos/{camera_id}/short")
    video_dir.mkdir(parents=True, exist_ok=True)
    
    # 타임스탬프를 포함한 파일명 생성
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"uploaded_{timestamp}_{video.filename}"
    file_path = video_dir / filename
    
    # 파일 저장
    content = await video.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    print(f"[비디오 업로드] {camera_id}: {filename} ({len(content)/1024/1024:.2f}MB)")
    
    return {
        "camera_id": camera_id,
        "video_path": str(file_path),
        "filename": filename,
        "message": "비디오 업로드 완료",
        "stream_url": f"/api/live-monitoring/stream/{camera_id}"
    }


@router.post("/start-stream/{camera_id}")
async def start_stream(
    camera_id: str,
    enable_analysis: bool = Query(True, description="1시간 단위 분석 활성화")
):
    """
    가짜 라이브 스트림 시작
    영상 큐를 로드하고 1시간 단위로 버퍼링 시작
    """
    if camera_id in active_streams:
        raise HTTPException(status_code=400, detail="이미 스트림이 실행 중입니다")
    
    video_dir = Path(f"videos/{camera_id}")
    buffer_dir = Path(f"temp_videos/hourly_buffer/{camera_id}")
    
    # 영상 디렉토리 확인
    if not video_dir.exists():
        raise HTTPException(
            status_code=404, 
            detail=f"영상 디렉토리가 없습니다: {video_dir}"
        )
    
    # 스트림 생성기 생성
    generator = FakeLiveStreamGenerator(camera_id, video_dir, buffer_dir)
    active_streams[camera_id] = generator
    
    # 백그라운드 태스크로 실행
    task = asyncio.create_task(generator.start_streaming())
    stream_tasks[camera_id] = task
    
    # 1시간 단위 분석 스케줄러 시작
    if enable_analysis:
        await start_hourly_analysis_for_camera(camera_id)
    
    print(f"[API] 스트림 시작: {camera_id} (분석: {enable_analysis})")
    
    return {
        "message": f"스트림 시작: {camera_id}",
        "camera_id": camera_id,
        "status": "running",
        "analysis_enabled": enable_analysis
    }


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
    
    # 분석 스케줄러 중지
    stop_hourly_analysis_for_camera(camera_id)
    
    print(f"[API] 스트림 및 분석 중지: {camera_id}")
    
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
    video_path: str = Query(None, description="특정 비디오 경로")
):
    """
    실시간 스트림 (MJPEG 스트리밍)
    
    원본 영상들을 순환 재생하여 스트리밍합니다.
    """
    video_dir = Path(f"videos/{camera_id}")
    
    # 비디오 파일 찾기
    if video_path:
        video_files = [Path(video_path)]
    else:
        # 원본 영상 파일들 로드
        video_files = []
        
        # short 디렉토리의 영상들
        short_dir = video_dir / "short"
        if short_dir.exists():
            video_files.extend(sorted(short_dir.glob("*.mp4")))
        
        # medium 디렉토리의 영상들
        medium_dir = video_dir / "medium"
        if medium_dir.exists():
            video_files.extend(sorted(medium_dir.glob("*.mp4")))
        
        # 루트 디렉토리의 영상들
        video_files.extend(sorted(video_dir.glob("*.mp4")))
        
        if not video_files:
            raise HTTPException(
                status_code=404,
                detail=f"스트림 파일이 없습니다. {video_dir}에 영상을 업로드하세요"
            )
    
    print(f"[스트림] 스트리밍 시작: {camera_id}, {len(video_files)}개 파일")
    
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
    hourly_files = list(buffer_dir.glob("hourly_*.mp4"))
    
    return {
        "camera_id": camera_id,
        "is_running": is_running,
        "hourly_files_count": len(hourly_files),
        "hourly_files": [f.name for f in sorted(hourly_files)[-5:]]  # 최근 5개
    }


@router.get("/list-hourly-files/{camera_id}")
async def list_hourly_files(camera_id: str):
    """1시간 단위 버퍼 파일 목록 조회"""
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

