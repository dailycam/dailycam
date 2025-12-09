-- 기존 구버전 클립 데이터 삭제 (아카이브 참조 클립)
-- 새로 생성된 FFmpeg 클립만 유지

-- 1. 현재 클립 확인
SELECT id, title, video_url, created_at 
FROM highlight_clip 
ORDER BY id DESC 
LIMIT 10;

-- 2. 구버전 클립 삭제 (video_url이 temp_videos로 시작하는 것)
DELETE FROM highlight_clip 
WHERE video_url LIKE '/temp_videos/%';

-- 3. 새로운 클립만 남았는지 확인
SELECT id, title, video_url, duration_seconds, created_at 
FROM highlight_clip 
ORDER BY created_at DESC;

-- 4. 통계
SELECT 
    category,
    COUNT(*) as count,
    AVG(duration_seconds) as avg_duration
FROM highlight_clip 
GROUP BY category;
