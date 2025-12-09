USE dailycam;

CREATE TABLE IF NOT EXISTS analysis_jobs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    camera_id VARCHAR(50) NOT NULL,
    video_path VARCHAR(500) NOT NULL,
    segment_start DATETIME NOT NULL,
    segment_end DATETIME NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL,
    analysis_result JSON,
    safety_score INT,
    incident_count INT,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    started_at DATETIME,
    completed_at DATETIME,
    retry_count INT DEFAULT 0 NOT NULL,
    max_retries INT DEFAULT 3 NOT NULL,
    worker_id VARCHAR(100),
    INDEX ix_analysis_jobs_camera_id (camera_id),
    INDEX ix_analysis_jobs_segment_start (segment_start),
    INDEX ix_analysis_jobs_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
