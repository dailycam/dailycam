USE dailycam;

CREATE TABLE IF NOT EXISTS hourly_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    camera_id VARCHAR(50) NOT NULL,
    hour_start DATETIME NOT NULL,
    hour_end DATETIME NOT NULL,
    average_safety_score FLOAT,
    total_incidents INT,
    segment_count INT,
    safety_summary TEXT,
    safety_insights JSON,
    development_summary TEXT,
    development_insights JSON,
    recommended_activities JSON,
    segment_analyses_ids JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX ix_hourly_reports_camera_id (camera_id),
    INDEX ix_hourly_reports_hour_start (hour_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
