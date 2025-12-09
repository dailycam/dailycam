-- Add development_score and related columns to segment_analyses table
-- Only run if segment_analyses table exists

SET @dbname = DATABASE();
SET @tablename = 'segment_analyses';

-- Check if table exists
SET @table_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename);

-- Only proceed if table exists
SET @proceed = IF(@table_exists > 0, 1, 0);

-- Add development_score if table exists and column doesn't exist
SET @column_check = IF(@proceed = 1, 
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'development_score'),
    1);
SET @sql = IF(@column_check = 0 AND @proceed = 1, 
    'ALTER TABLE segment_analyses ADD COLUMN development_score INT DEFAULT NULL COMMENT ''발달 점수 (0-100)''', 
    'SELECT ''Skipped: development_score'' AS Info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add development_radar_scores if table exists and column doesn't exist
SET @column_check = IF(@proceed = 1,
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'development_radar_scores'),
    1);
SET @sql = IF(@column_check = 0 AND @proceed = 1, 
    'ALTER TABLE segment_analyses ADD COLUMN development_radar_scores JSON DEFAULT NULL COMMENT ''발달 오각형 점수''', 
    'SELECT ''Skipped: development_radar_scores'' AS Info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add safety_incidents if table exists and column doesn't exist
SET @column_check = IF(@proceed = 1,
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'safety_incidents'),
    1);
SET @sql = IF(@column_check = 0 AND @proceed = 1, 
    'ALTER TABLE segment_analyses ADD COLUMN safety_incidents JSON DEFAULT NULL COMMENT ''안전 이벤트 리스트''', 
    'SELECT ''Skipped: safety_incidents'' AS Info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add development_milestones if table exists and column doesn't exist
SET @column_check = IF(@proceed = 1,
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'development_milestones'),
    1);
SET @sql = IF(@column_check = 0 AND @proceed = 1, 
    'ALTER TABLE segment_analyses ADD COLUMN development_milestones JSON DEFAULT NULL COMMENT ''발달 마일스톤 리스트''', 
    'SELECT ''Skipped: development_milestones'' AS Info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
