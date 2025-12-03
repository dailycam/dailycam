from fastapi import APIRouter, UploadFile, File, Query, HTTPException, Depends
from fastapi.responses import StreamingResponse, Response, FileResponse
from pathlib import Path
from datetime import datetime, timedelta
import asyncio
import cv2
import numpy as np
from typing import Dict
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database.session import get_db
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
    enable_analysis: bool = Query(True, description="1시간 단위 분석 활성화"),
    enable_realtime_detection: bool = Query(True, description="실시간 이벤트 탐지 활성화"),
    age_months: int = Query(None, description="아이의 개월 수 (실시간 분석 정확도 향상)")
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
        raise HTTPException(
            status_code=404, 
            detail=f"영상 디렉토리가 없습니다: {video_dir}"
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


@router.post("/start-hls-stream/{camera_id}")
async def start_hls_stream(
    camera_id: str,
    camera_url: str = Query(None, description="홈캠 RTSP/HTTP URL (실제 카메라인 경우)"),
    enable_analysis: bool = Query(True, description="10분 단위 분석 활성화"),
    enable_realtime_detection: bool = Query(True, description="실시간 이벤트 탐지 활성화"),
    age_months: int = Query(None, description="아이의 개월 수")
):
    """
    HLS 스트림 시작 (진짜 실시간 스트림)
    - 백그라운드에서 계속 실행
    - 재연결 시 자동으로 현재 시간부터 재생
    - 가짜 영상 또는 실제 홈캠 지원
    """
    if camera_id in active_hls_streams:
        raise HTTPException(status_code=400, detail="이미 HLS 스트림이 실행 중입니다")
    
    # 실제 카메라인지 가짜 영상인지 판단
    is_real_camera = camera_url is not None
    
    if is_real_camera:
        # 실제 홈캠
        video_source = camera_url
        output_dir = Path(f"temp_videos/hls_buffer/{camera_id}")
    else:
        # 가짜 영상
        video_dir = Path(f"videos/{camera_id}")
        if not video_dir.exists():
            raise HTTPException(404, f"영상 디렉토리가 없습니다: {video_dir}")
        video_source = video_dir
        output_dir = Path(f"temp_videos/hls_buffer/{camera_id}")
    
    # 현재 이벤트 루프 가져오기
    loop = asyncio.get_running_loop()
    
    # HLS 스트림 생성기 생성
    generator = HLSStreamGenerator(
        camera_id=camera_id,
        video_source=video_source,
        output_dir=output_dir,
        is_real_camera=is_real_camera,
        segment_duration=10,  # 10초 단위 HLS 세그먼트
        enable_realtime_detection=enable_realtime_detection,
        age_months=age_months,
        event_loop=loop
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
    stop_segment_analysis_for_camera(camera_id)
    
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
    
    # 파일이 생성될 때까지 잠시 대기 (최대 2초)
    # FFmpeg가 파일을 생성하는 데 시간이 걸릴 수 있음
    if not file_path.exists():
        for _ in range(10):  # 0.2초 * 10 = 2초
            await asyncio.sleep(0.2)
            if file_path.exists():
                break
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다")
    
    # MIME 타입 설정
    if filename.endswith('.m3u8'):
        media_type = "application/vnd.apple.mpegurl"
    elif filename.endswith('.ts'):
        media_type = "video/mp2t"
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
    use_segments: bool = Query(True, description="세그먼트 파일 기반 스트리밍 사용 여부")
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
    db: Session = Depends(get_db)
):
    """
    모니터링 통계 조회
    """
    from datetime import datetime, timedelta
    
    now = datetime.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # 오늘의 이벤트 수
    total_events = db.query(RealtimeEvent).filter(
        RealtimeEvent.camera_id == camera_id,
        RealtimeEvent.timestamp >= today_start
    ).count()
    
    # 위험 이벤트 수
    danger_events = db.query(RealtimeEvent).filter(
        RealtimeEvent.camera_id == camera_id,
        RealtimeEvent.timestamp >= today_start,
        RealtimeEvent.severity == 'danger'
    ).count()
    
    # 경고 이벤트 수
    warning_events = db.query(RealtimeEvent).filter(
        RealtimeEvent.camera_id == camera_id,
        RealtimeEvent.timestamp >= today_start,
        RealtimeEvent.severity == 'warning'
    ).count()
    
    # 최근 1시간 이벤트 수
    hour_ago = now - timedelta(hours=1)
    recent_events = db.query(RealtimeEvent).filter(
        RealtimeEvent.camera_id == camera_id,
        RealtimeEvent.timestamp >= hour_ago
    ).count()
    
    return {
        "camera_id": camera_id,
        "today_total_events": total_events,
        "danger_events": danger_events,
        "warning_events": warning_events,
        "recent_hour_events": recent_events,
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
