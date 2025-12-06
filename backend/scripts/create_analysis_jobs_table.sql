-- VLM 분석 작업 큐 테이블 생성
-- 실행: mysql -u root -p dailycam < scripts/create_analysis_jobs_table.sql

CREATE TABLE IF NOT EXISTS analysis_jobs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    camera_id VARCHAR(50) NOT NULL,
    video_path VARCHAR(500) NOT NULL,
    segment_start DATETIME NOT NULL,
    segment_end DATETIME NOT NULL,
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending' NOT NULL,
    
    -- 결과 저장
    analysis_result JSON,
    safety_score INT,
    incident_count INT,
    
    -- 오류 정보
    error_message TEXT,
    
    -- 시간 정보
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    started_at DATETIME,
    completed_at DATETIME,
    
    -- 재시도 정보
    retry_count INT DEFAULT 0 NOT NULL,
    max_retries INT DEFAULT 3 NOT NULL,
    
    -- 워커 정보
    worker_id VARCHAR(100),
    
    -- 인덱스
    INDEX idx_camera_status (camera_id, status),
    INDEX idx_segment_start (segment_start),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 테이블 생성 확인
SELECT 'analysis_jobs 테이블이 생성되었습니다.' AS message;
DESCRIBE analysis_jobs;

