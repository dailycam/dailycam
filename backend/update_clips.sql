-- 기존 클립 데이터를 아카이브 영상으로 업데이트

-- 1. 비디오 URL 업데이트 (첫 번째 아카이브 영상 사용)
UPDATE highlight_clip 
SET video_url = '/temp_videos/hls_buffer/camera-1/archive/archive_20251206_165000.mp4',
    duration_seconds = 600
WHERE duration_seconds IS NULL OR duration_seconds = 0;

-- 2. 썸네일 URL 업데이트 (아카이브 썸네일 사용)
UPDATE highlight_clip 
SET thumbnail_url = '/temp_videos/hls_buffer/camera-1/archive/thumbnails/archive_20251206_165000.jpg'
WHERE thumbnail_url IS NULL OR thumbnail_url = '';

-- 확인
SELECT id, title, category, video_url, thumbnail_url, duration_seconds 
FROM highlight_clip 
LIMIT 5;
