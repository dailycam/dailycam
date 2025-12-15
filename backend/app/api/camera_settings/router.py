"""Camera settings API routes"""

from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, Query, Request
from starlette.requests import Request
from sqlalchemy.orm import Session
from pathlib import Path
from datetime import datetime
from typing import List
import cv2
import shutil
import os
import httpx

from app.database import get_db
from app.utils.auth_utils import get_current_user_id
from app.models.camera_setting import CameraSetting, CameraVideo
from app.services.cleanup_service import get_cleanup_service

router = APIRouter()


@router.get("/cameras")
async def get_user_cameras(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """
    사용자의 카메라 설정 목록 조회
    """
    cameras = db.query(CameraSetting).filter(
        CameraSetting.user_id == user_id
    ).all()
    
    result = []
    for camera in cameras:
        videos = db.query(CameraVideo).filter(
            CameraVideo.camera_setting_id == camera.id,
            CameraVideo.is_active == True
        ).order_by(CameraVideo.order_index).all()
        
        result.append({
            "id": camera.id,
            "camera_id": camera.camera_id,
            "camera_name": camera.camera_name,
            "is_active": camera.is_active,
            "video_count": len(videos),
            "videos": [
                {
                    "id": v.id,
                    "filename": v.filename,
                    "file_size": v.file_size,
                    "duration": v.duration,
                    "order_index": v.order_index,
                    "uploaded_at": v.uploaded_at.isoformat()
                }
                for v in videos
            ]
        })
    
    return {"cameras": result}


@router.post("/cameras")
async def create_camera(
    camera_id: str = Query(..., description="카메라 ID (예: camera-1)"),
    camera_name: str = Query(None, description="카메라 이름"),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """
    새 카메라 설정 생성
    """
    # 이미 존재하는지 확인
    existing = db.query(CameraSetting).filter(
        CameraSetting.user_id == user_id,
        CameraSetting.camera_id == camera_id
    ).first()
    
    if existing:
        return {
            "id": existing.id,
            "camera_id": existing.camera_id,
            "camera_name": existing.camera_name,
            "message": "이미 존재하는 카메라입니다"
        }
    
    # 새 카메라 생성
    camera = CameraSetting(
        user_id=user_id,
        camera_id=camera_id,
        camera_name=camera_name or f"카메라 {camera_id}"
    )
    db.add(camera)
    db.commit()
    db.refresh(camera)
    
    return {
        "id": camera.id,
        "camera_id": camera.camera_id,
        "camera_name": camera.camera_name,
        "message": "카메라가 생성되었습니다"
    }


@router.post("/cameras/{camera_id}/upload-video")
async def upload_camera_video(
    request: Request,
    camera_id: str,
    video: UploadFile = File(..., description="업로드할 비디오 파일"),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """
    카메라에 영상 업로드
    - 개별 파일: 최대 500MB
    - 사용자 전체: 최대 5GB
    """
    # camera_id 검증
    if not camera_id or camera_id.strip() == "":
        raise HTTPException(status_code=400, detail="camera_id가 필요합니다.")
    
    # 비디오 파일 검증
    if not video.content_type or not video.content_type.startswith('video/'):
        raise HTTPException(status_code=400, detail="비디오 파일만 업로드 가능합니다")
    
    # 파일 크기 제한 (500MB)
    content = await video.read()
    if len(content) > 500 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="파일 크기는 500MB 이하여야 합니다")
    
    # 사용자 전체 용량 확인 (5GB 제한)
    user_cameras = db.query(CameraSetting).filter(
        CameraSetting.user_id == user_id
    ).all()
    
    total_size = 0
    for camera in user_cameras:
        videos = db.query(CameraVideo).filter(
            CameraVideo.camera_setting_id == camera.id
        ).all()
        total_size += sum(v.file_size or 0 for v in videos)
    
    # 새 파일 추가 시 용량 초과 확인
    max_total_size = 5 * 1024 * 1024 * 1024  # 5GB
    if total_size + len(content) > max_total_size:
        current_gb = total_size / (1024 * 1024 * 1024)
        raise HTTPException(
            status_code=400,
            detail=f"전체 용량 제한 초과 (현재: {current_gb:.2f}GB / 최대: 5GB). 기존 영상을 삭제한 후 다시 시도해주세요."
        )
    
    # 카메라 설정 조회 또는 생성
    camera_setting = db.query(CameraSetting).filter(
        CameraSetting.user_id == user_id,
        CameraSetting.camera_id == camera_id
    ).first()
    
    if not camera_setting:
        camera_setting = CameraSetting(
            user_id=user_id,
            camera_id=camera_id,
            camera_name=f"카메라 {camera_id}"
        )
        db.add(camera_setting)
        db.commit()
        db.refresh(camera_setting)
    
    # 파일 저장 경로
    video_dir = Path(f"videos/{camera_id}")
    video_dir.mkdir(parents=True, exist_ok=True)
    
    # 타임스탬프를 포함한 파일명 생성
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"user_uploaded_{timestamp}_{video.filename}"
    file_path = video_dir / safe_filename
    
    # 파일 저장 (로컬에 임시 저장)
    with open(file_path, "wb") as f:
        f.write(content)
    
    # 영상 정보 추출
    duration = None
    try:
        cap = cv2.VideoCapture(str(file_path))
        if cap.isOpened():
            fps = cap.get(cv2.CAP_PROP_FPS)
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            if fps > 0:
                duration = int(frame_count / fps)
        cap.release()
    except Exception as e:
        print(f"[영상 정보 추출 오류] {e}")
    
    # S3에 업로드 (두 서버 간 공유를 위해)
    s3_key = None
    from app.services.s3_service import S3Service
    s3_service = S3Service()
    if s3_service.is_enabled():
        s3_key = s3_service.upload_camera_video(file_path, camera_id, safe_filename)
        if s3_key:
            print(f"[비디오 업로드] ✅ S3 업로드 완료: {s3_key}")
            # 로컬 파일 삭제 (선택사항 - S3에 저장되었으므로)
            # file_path.unlink()  # 필요시 주석 해제
    
    # 기존 영상들의 order_index 가져오기
    max_order = db.query(CameraVideo).filter(
        CameraVideo.camera_setting_id == camera_setting.id
    ).count()
    
    # DB에 저장
    camera_video = CameraVideo(
        camera_setting_id=camera_setting.id,
        filename=safe_filename,
        file_path=str(file_path),  # 로컬 경로 또는 S3 URL
        file_size=len(content),
        duration=duration,
        s3_key=s3_key,  # S3 키 저장
        order_index=max_order
    )
    db.add(camera_video)
    db.commit()
    db.refresh(camera_video)
    
    print(f"[비디오 업로드] {camera_id}: {safe_filename} ({len(content)/1024/1024:.2f}MB, {duration}초, S3: {s3_key or '없음'})")
    
    # 영상 업로드 후 자동으로 HLS 스트림 시작
    enable_hls_streaming = os.getenv("ENABLE_HLS_STREAMING", "false").lower() == "true"
    streaming_server_url = os.getenv("STREAMING_SERVER_URL", "https://stream.dailycam.net")
    
    if enable_hls_streaming:
        # 스트리밍 서버에서 직접 시작 (로컬 실행)
        try:
            from app.api.live_monitoring.router import active_hls_streams, hls_stream_tasks
            import asyncio
            
            # 이미 스트림이 실행 중이면 재시작 (새 영상 반영)
            if camera_id in active_hls_streams:
                print(f"[비디오 업로드] 기존 스트림 재시작 중: {camera_id}")
                generator = active_hls_streams[camera_id]
                generator.stop_streaming()
                
                if camera_id in hls_stream_tasks:
                    task = hls_stream_tasks[camera_id]
                    if not task.done():
                        task.cancel()
                    del hls_stream_tasks[camera_id]
                del active_hls_streams[camera_id]
            
            # 새 스트림 시작 (백그라운드 태스크)
            from app.services.live_monitoring.hls_stream_generator import HLSStreamGenerator
            
            video_dir = Path(f"videos/{camera_id}")
            output_dir = Path(f"temp_videos/hls_buffer/{camera_id}")
            
            # 이벤트 루프 가져오기 (비동기 컨텍스트에서)
            try:
                loop = asyncio.get_running_loop()
            except RuntimeError:
                # 실행 중인 루프가 없으면 새로 생성
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
            
            generator = HLSStreamGenerator(
                camera_id=camera_id,
                video_source=video_dir,
                output_dir=output_dir,
                is_real_camera=False,
                segment_duration=10,
                enable_realtime_detection=True,
                event_loop=loop,
                db_session=db,
                user_id=user_id
            )
            
            active_hls_streams[camera_id] = generator
            task = asyncio.create_task(generator.start_streaming())
            hls_stream_tasks[camera_id] = task
            
            print(f"[비디오 업로드] ✅ HLS 스트림 자동 시작됨 (백그라운드 실행): {camera_id}")
            
        except Exception as e:
            print(f"[비디오 업로드] ⚠️ HLS 스트림 자동 시작 실패 (수동 시작 가능): {e}")
            import traceback
            traceback.print_exc()
    else:
        # 메인 서버에서는 스트리밍 서버의 API를 호출
        try:
            import asyncio
            
            async def call_streaming_server():
                """스트리밍 서버의 HLS 시작 API 호출"""
                try:
                    url = f"{streaming_server_url}/api/live-monitoring/start-hls-stream/{camera_id}"
                    
                    # 활성화된 모든 영상의 S3 키 가져오기
                    active_videos = db.query(CameraVideo).filter(
                        CameraVideo.camera_setting_id == camera_setting.id,
                        CameraVideo.is_active == True
                    ).order_by(CameraVideo.order_index).all()
                    
                    s3_key_list = []
                    for video in active_videos:
                        if video.s3_key:
                            s3_key_list.append(video.s3_key)
                    
                    params = {
                        "enable_analysis": True,
                        "enable_realtime_detection": True
                    }
                    
                    # S3 키가 있으면 파라미터로 전달 (DB 조회 생략)
                    if s3_key_list:
                        params["s3_keys"] = ",".join(s3_key_list)
                        print(f"[비디오 업로드] 📤 S3 키 전달: {len(s3_key_list)}개")
                    
                    # 쿠키 가져오기 (인증용, S3 키가 없을 경우를 대비)
                    cookies = dict(request.cookies)
                    
                    headers = {}
                    if "authorization" in request.headers:
                        headers["authorization"] = request.headers["authorization"]
                    
                    async with httpx.AsyncClient(verify=False, timeout=30.0) as client:
                        response = await client.post(
                            url, 
                            params=params,
                            cookies=cookies,
                            headers=headers
                        )
                        if response.status_code == 200:
                            result = response.json()
                            print(f"[비디오 업로드] ✅ 스트리밍 서버에서 HLS 스트림 시작 요청 성공: {camera_id}")
                            print(f"[비디오 업로드]   - 플레이리스트 URL: {result.get('playlist_url', 'N/A')}")
                        else:
                            error_detail = response.text[:200] if response.text else "응답 없음"
                            print(f"[비디오 업로드] ⚠️ 스트리밍 서버 HLS 시작 요청 실패: {response.status_code}")
                            print(f"[비디오 업로드]   - 오류 내용: {error_detail}")
                except httpx.TimeoutException:
                    print(f"[비디오 업로드] ⚠️ 스트리밍 서버 호출 타임아웃: {camera_id}")
                except httpx.ConnectError as e:
                    print(f"[비디오 업로드] ⚠️ 스트리밍 서버 연결 실패: {e}")
                except Exception as e:
                    print(f"[비디오 업로드] ⚠️ 스트리밍 서버 호출 실패: {e}")
                    import traceback
                    traceback.print_exc()
            
            # 비동기로 실행 (백그라운드)
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
            
            # 백그라운드 태스크로 실행
            asyncio.create_task(call_streaming_server())
            print(f"[비디오 업로드] 📡 스트리밍 서버로 HLS 시작 요청 전송: {camera_id}")
            
        except Exception as e:
            print(f"[비디오 업로드] ⚠️ 스트리밍 서버 호출 설정 실패: {e}")
            import traceback
            traceback.print_exc()
    
    return {
        "id": camera_video.id,
        "camera_id": camera_id,
        "filename": safe_filename,
        "file_path": str(file_path),
        "file_size": len(content),
        "duration": duration,
        "message": "비디오가 업로드되었고 스트림이 자동으로 시작되었습니다"
    }


@router.delete("/videos/{video_id}")
async def delete_camera_video(
    video_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """
    업로드한 영상 삭제
    - 해당 영상이 속한 카메라의 스트림이 실행 중이면 자동으로 중지됩니다
    """
    # 영상 조회 및 권한 확인
    video = db.query(CameraVideo).filter(
        CameraVideo.id == video_id
    ).first()
    
    if not video:
        raise HTTPException(status_code=404, detail="영상을 찾을 수 없습니다")
    
    # 카메라 설정의 소유자 확인
    camera_setting = db.query(CameraSetting).filter(
        CameraSetting.id == video.camera_setting_id,
        CameraSetting.user_id == user_id
    ).first()
    
    if not camera_setting:
        raise HTTPException(status_code=403, detail="권한이 없습니다")
    
    # ⚠️ 중요: 해당 카메라의 HLS 스트림이 실행 중이면 중지
    camera_id = camera_setting.camera_id
    file_path = Path(video.file_path)
    
    # S3 파일 삭제 (s3_key가 있는 경우)
    if video.s3_key:
        try:
            from app.services.s3_service import S3Service
            s3_service = S3Service()
            
            if s3_service.is_enabled():
                try:
                    s3_service.s3_client.delete_object(
                        Bucket=s3_service.bucket_name,
                        Key=video.s3_key
                    )
                    print(f"[비디오 삭제] ✅ S3 파일 삭제 완료: {video.s3_key}")
                except Exception as e:
                    print(f"[비디오 삭제] ⚠️ S3 파일 삭제 실패 ({video.s3_key}): {e}")
            else:
                print(f"[비디오 삭제] ⚠️ S3가 비활성화되어 있어 S3 파일 삭제 스킵: {video.s3_key}")
        except Exception as e:
            print(f"[비디오 삭제] ⚠️ S3 삭제 처리 중 오류: {e}")
    else:
        print(f"[비디오 삭제] ℹ️ s3_key가 없어 S3 삭제 스킵")
    
    # 로컬 파일 삭제
    if file_path.exists():
        try:
            file_path.unlink()
            print(f"[비디오 삭제] ✅ 로컬 파일 삭제 완료: {file_path}")
        except Exception as e:
            print(f"[비디오 삭제] ⚠️ 로컬 파일 삭제 실패: {e}")
    else:
        print(f"[비디오 삭제] ℹ️ 로컬 파일이 존재하지 않음: {file_path}")
    
    from app.api.live_monitoring.router import active_hls_streams, hls_stream_tasks
    
    if camera_id in active_hls_streams:
        print(f"[비디오 삭제] 경고: {camera_id} 카메라의 스트림이 실행 중입니다. 스트림을 중지합니다.")
        
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
                except Exception:
                    pass
            del hls_stream_tasks[camera_id]
        
        del active_hls_streams[camera_id]
        print(f"[비디오 삭제] {camera_id} 카메라의 스트림이 중지되었습니다.")
    
    # DB에서 삭제 (위에서 이미 S3와 로컬 파일 삭제 완료)
    db.delete(video)
    db.commit()
    
    return {
        "message": "영상이 삭제되었습니다",
        "stream_stopped": camera_id in locals() and camera_id in active_hls_streams
    }


@router.patch("/videos/{video_id}/toggle")
async def toggle_video_active(
    video_id: int,
    is_active: bool = Query(..., description="활성화 여부"),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """
    영상 활성화/비활성화
    """
    # 영상 조회 및 권한 확인
    video = db.query(CameraVideo).filter(
        CameraVideo.id == video_id
    ).first()
    
    if not video:
        raise HTTPException(status_code=404, detail="영상을 찾을 수 없습니다")
    
    # 카메라 설정의 소유자 확인
    camera_setting = db.query(CameraSetting).filter(
        CameraSetting.id == video.camera_setting_id,
        CameraSetting.user_id == user_id
    ).first()
    
    if not camera_setting:
        raise HTTPException(status_code=403, detail="권한이 없습니다")
    
    # 활성화 상태 변경
    video.is_active = is_active
    db.commit()
    
    return {
        "id": video.id,
        "is_active": video.is_active,
        "message": f"영상이 {'활성화' if is_active else '비활성화'}되었습니다"
    }


@router.patch("/cameras/{camera_id}/reorder")
async def reorder_videos(
    camera_id: str,
    video_ids: List[int] = Query(..., description="재정렬된 비디오 ID 순서"),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """
    영상 재생 순서 변경
    """
    # 카메라 설정 조회
    camera_setting = db.query(CameraSetting).filter(
        CameraSetting.user_id == user_id,
        CameraSetting.camera_id == camera_id
    ).first()
    
    if not camera_setting:
        raise HTTPException(status_code=404, detail="카메라를 찾을 수 없습니다")
    
    # 순서 업데이트
    for index, video_id in enumerate(video_ids):
        video = db.query(CameraVideo).filter(
            CameraVideo.id == video_id,
            CameraVideo.camera_setting_id == camera_setting.id
        ).first()
        
        if video:
            video.order_index = index
    
    db.commit()
    
    return {"message": "영상 순서가 변경되었습니다"}


@router.post("/cleanup/run")
async def run_cleanup_manually(
    user_id: int = Depends(get_current_user_id)
):
    """
    수동 정리 실행 (관리자용)
    - 아카이브 파일 정리
    - 하이라이트 클립 정리
    - 임시 파일 정리
    """
    cleanup_service = get_cleanup_service()
    await cleanup_service.run_cleanup()
    
    return {
        "message": "정리 작업이 완료되었습니다",
        "timestamp": datetime.now().isoformat()
    }


@router.get("/storage/usage")
async def get_storage_usage(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """
    사용자의 저장 공간 사용량 조회
    """
    # 사용자의 모든 카메라 조회
    user_cameras = db.query(CameraSetting).filter(
        CameraSetting.user_id == user_id
    ).all()
    
    total_size = 0
    video_count = 0
    
    for camera in user_cameras:
        videos = db.query(CameraVideo).filter(
            CameraVideo.camera_setting_id == camera.id
        ).all()
        
        for video in videos:
            total_size += video.file_size or 0
            video_count += 1
    
    max_size = 5 * 1024 * 1024 * 1024  # 5GB
    usage_percent = (total_size / max_size) * 100
    
    return {
        "total_size_bytes": total_size,
        "total_size_mb": round(total_size / (1024 * 1024), 2),
        "total_size_gb": round(total_size / (1024 * 1024 * 1024), 2),
        "max_size_gb": 5,
        "usage_percent": round(usage_percent, 2),
        "video_count": video_count,
        "remaining_bytes": max_size - total_size,
        "remaining_gb": round((max_size - total_size) / (1024 * 1024 * 1024), 2)
    }

