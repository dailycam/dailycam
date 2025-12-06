-- highlight_clip 테이블에 created_at 컬럼 추가
ALTER TABLE highlight_clip 
ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;

-- 인덱스 추가
CREATE INDEX ix_highlight_clip_created_at ON highlight_clip(created_at);
