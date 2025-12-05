-- HourlyReport 테이블 생성
-- 1시간 단위 텍스트 데이터 종합 분석 결과 저장용

CREATE TABLE IF NOT EXISTS `hourly_reports` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `camera_id` VARCHAR(50) NOT NULL,
    `hour_start` DATETIME NOT NULL,
    `hour_end` DATETIME NOT NULL,
    
    -- 수치 데이터 (실시간 집계용)
    `average_safety_score` FLOAT NULL,
    `total_incidents` INT NULL,
    `segment_count` INT NULL,
    
    -- 텍스트 데이터 (1시간마다 Gemini로 종합 분석)
    `safety_summary` TEXT NULL,
    `safety_insights` JSON NULL,
    `development_summary` TEXT NULL,
    `development_insights` JSON NULL,
    `recommended_activities` JSON NULL,
    
    -- 메타데이터
    `segment_analyses_ids` JSON NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX `idx_camera_id` (`camera_id`),
    INDEX `idx_hour_start` (`hour_start`),
    UNIQUE KEY `unique_camera_hour` (`camera_id`, `hour_start`)
) CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

