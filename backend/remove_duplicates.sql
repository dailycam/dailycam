"""중복 클립 제거 SQL 스크립트"""

-- 중복 클립 찾기 (제목, 설명, 생성시간 기준)
-- 같은 제목과 설명을 가진 클립 중 ID가 더 큰 것(나중에 생성된 것) 삭제

DELETE FROM highlight_clip
WHERE id IN (
    SELECT id FROM (
        SELECT 
            id,
            ROW_NUMBER() OVER (
                PARTITION BY title, description, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i')
                ORDER BY id ASC
            ) as rn
        FROM highlight_clip
    ) t
    WHERE rn > 1
);

-- 결과 확인
SELECT COUNT(*) as remaining_clips FROM highlight_clip;
