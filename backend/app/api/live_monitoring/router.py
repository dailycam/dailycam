from fastapi import APIRouter, UploadFile, File, Query, HTTPException
from fastapi.responses import FileResponse
import shutil
import os
from pathlib import Path
import time

router = APIRouter()

# Define the directory for temporary videos
# Using absolute path relative to the backend root if possible, or just relative to execution
# backend/temp_videos seems to be where files are
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent # backend/app/api/live_monitoring -> backend
TEMP_VIDEO_DIR = BASE_DIR / "temp_videos"
TEMP_VIDEO_DIR.mkdir(exist_ok=True)

@router.post("/upload-video")
async def upload_video(
    camera_id: str = Query(..., description="Camera ID"),
    video: UploadFile = File(...)
):
    try:
        # Create a unique filename to avoid collisions
        timestamp = int(time.time())
        # Clean filename
        safe_filename = "".join(c for c in video.filename if c.isalnum() or c in "._-")
        filename = f"{camera_id}_{timestamp}_{safe_filename}"
        file_path = TEMP_VIDEO_DIR / filename
        
        # Save the file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(video.file, buffer)
            
        return {
            "camera_id": camera_id,
            "video_path": str(file_path),
            "filename": filename,
            "message": "Video uploaded successfully",
            "stream_url": f"/api/live-monitoring/stream/{camera_id}"
        }
    except Exception as e:
        print(f"Error uploading video: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload video: {str(e)}")

@router.get("/stream/{camera_id}")
async def stream_video(
    camera_id: str,
    loop: bool = True,
    speed: float = 1.0,
    t: int = None,
    video_path: str = None
):
    """
    Simple video streaming endpoint.
    If video_path is provided, streams that specific file.
    Otherwise, tries to find the latest video for the camera.
    """
    target_path = None
    
    if video_path:
        # Security check: ensure path is within temp_videos
        # This is a basic check; in production, use more robust path validation
        p = Path(video_path)
        if TEMP_VIDEO_DIR in p.resolve().parents or p.parent == TEMP_VIDEO_DIR:
             target_path = p
    
    if not target_path or not target_path.exists():
        # Try to find latest video for this camera
        files = list(TEMP_VIDEO_DIR.glob(f"{camera_id}_*"))
        if files:
            # Sort by modification time, newest first
            files.sort(key=lambda x: x.stat().st_mtime, reverse=True)
            target_path = files[0]
    
    if not target_path or not target_path.exists():
        raise HTTPException(status_code=404, detail="No video found for this camera")
        
    return FileResponse(target_path, media_type="video/mp4")

@router.post("/stop-stream/{camera_id}")
async def stop_stream(camera_id: str):
    return {"message": f"Stream for {camera_id} stopped"}
