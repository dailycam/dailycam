-- camera_videos 테이블에 s3_key 컬럼 추가
-- 이 스크립트를 MySQL에서 실행하세요

USE dailycam;

-- s3_key 컬럼이 이미 존재하는지 확인 후 추가
SET @dbname = DATABASE();
SET @tablename = 'camera_videos';
SET @columnname = 's3_key';

-- 테이블 존재 확인
SET @table_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename);

-- 컬럼 존재 확인
SET @column_exists = IF(@table_exists > 0,
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = @dbname 
        AND TABLE_NAME = @tablename 
        AND COLUMN_NAME = @columnname),
    1);

-- 컬럼이 없으면 추가
SET @sql = IF(@column_exists = 0 AND @table_exists > 0,
    'ALTER TABLE camera_videos ADD COLUMN s3_key VARCHAR(1000) NULL COMMENT ''S3 키 (S3에 저장된 영상의 경우)'' AFTER duration',
    'SELECT ''Skipped: s3_key column already exists or table does not exist'' AS Info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 완료 확인
SELECT 's3_key 컬럼 추가 완료!' AS status;

