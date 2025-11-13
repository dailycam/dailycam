-- DailyCam 일일 리포트 데이터베이스 스키마
-- MariaDB 10.11 / MySQL 8.0 호환

-- 비디오 파일 정보
CREATE TABLE IF NOT EXISTS videos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    filename VARCHAR(255) NOT NULL COMMENT '원본 파일명',
    file_path VARCHAR(500) NOT NULL COMMENT '저장된 파일 경로',
    file_size INT COMMENT '파일 크기 (bytes)',
    duration FLOAT COMMENT '비디오 길이 (초)',
    mime_type VARCHAR(100) COMMENT 'MIME 타입',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='비디오 파일 정보';

-- 비디오 분석 결과
CREATE TABLE IF NOT EXISTS video_analyses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    video_id INT NOT NULL COMMENT '비디오 ID',
    total_incidents INT NOT NULL DEFAULT 0 COMMENT '전체 사건 수',
    falls INT NOT NULL DEFAULT 0 COMMENT '넘어짐 횟수',
    dangerous_actions INT NOT NULL DEFAULT 0 COMMENT '위험한 행동 횟수',
    safety_score INT NOT NULL COMMENT '안전도 점수 (0-100)',
    summary TEXT NOT NULL COMMENT '전체 요약',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    INDEX idx_video_id (video_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='비디오 분석 결과';

-- 타임라인 이벤트
CREATE TABLE IF NOT EXISTS timeline_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    analysis_id INT NOT NULL COMMENT '분석 ID',
    timestamp VARCHAR(20) NOT NULL COMMENT '이벤트 발생 시간 (예: 00:00:05)',
    type ENUM('fall', 'danger', 'warning', 'safe') NOT NULL COMMENT '이벤트 타입',
    description TEXT NOT NULL COMMENT '이벤트 설명',
    severity ENUM('high', 'medium', 'low') NOT NULL COMMENT '심각도',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (analysis_id) REFERENCES video_analyses(id) ON DELETE CASCADE,
    INDEX idx_analysis_id (analysis_id),
    INDEX idx_type (type),
    INDEX idx_severity (severity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='타임라인 이벤트';

-- 분석 추천 사항
CREATE TABLE IF NOT EXISTS analysis_recommendations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    analysis_id INT NOT NULL COMMENT '분석 ID',
    recommendation TEXT NOT NULL COMMENT '추천 사항 내용',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (analysis_id) REFERENCES video_analyses(id) ON DELETE CASCADE,
    INDEX idx_analysis_id (analysis_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='분석 추천 사항';

-- 일일 리포트
CREATE TABLE IF NOT EXISTS daily_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    analysis_id INT NOT NULL COMMENT '분석 ID',
    report_date DATETIME NOT NULL COMMENT '리포트 날짜',
    overall_summary TEXT NOT NULL COMMENT '종합 요약',
    total_monitoring_time VARCHAR(50) COMMENT '총 모니터링 시간',
    safe_zone_percentage INT COMMENT '세이프존 체류율',
    activity_level VARCHAR(50) COMMENT '활동 지수',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (analysis_id) REFERENCES video_analyses(id) ON DELETE CASCADE,
    INDEX idx_analysis_id (analysis_id),
    INDEX idx_report_date (report_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='일일 리포트';

-- 리포트 시간대별 활동
CREATE TABLE IF NOT EXISTS report_time_slots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_id INT NOT NULL COMMENT '리포트 ID',
    time_range VARCHAR(50) NOT NULL COMMENT '시간대 (예: 09:00 - 12:00)',
    activity VARCHAR(50) COMMENT '활동량 (낮은/중간/높은)',
    safety_score INT NOT NULL COMMENT '안전도 점수',
    incidents INT NOT NULL DEFAULT 0 COMMENT '사건 수',
    summary TEXT COMMENT '시간대별 요약',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES daily_reports(id) ON DELETE CASCADE,
    INDEX idx_report_id (report_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='리포트 시간대별 활동';

-- 리포트 위험도 우선순위
CREATE TABLE IF NOT EXISTS report_risk_priorities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_id INT NOT NULL COMMENT '리포트 ID',
    level ENUM('high', 'medium', 'low') NOT NULL COMMENT '위험도 레벨',
    title VARCHAR(255) NOT NULL COMMENT '위험 제목',
    description TEXT NOT NULL COMMENT '설명',
    location VARCHAR(255) COMMENT '위치',
    time_range VARCHAR(50) COMMENT '시간 범위',
    count INT NOT NULL DEFAULT 1 COMMENT '반복 횟수',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES daily_reports(id) ON DELETE CASCADE,
    INDEX idx_report_id (report_id),
    INDEX idx_level (level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='리포트 위험도 우선순위';

-- 리포트 실행 리스트
CREATE TABLE IF NOT EXISTS report_action_recommendations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_id INT NOT NULL COMMENT '리포트 ID',
    priority ENUM('high', 'medium', 'low') NOT NULL COMMENT '우선순위',
    title VARCHAR(255) NOT NULL COMMENT '제목',
    description TEXT NOT NULL COMMENT '설명',
    estimated_cost VARCHAR(100) COMMENT '예상 비용',
    difficulty VARCHAR(50) COMMENT '난이도',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES daily_reports(id) ON DELETE CASCADE,
    INDEX idx_report_id (report_id),
    INDEX idx_priority (priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='리포트 실행 리스트';

-- 하이라이트 영상
CREATE TABLE IF NOT EXISTS highlights (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_id INT COMMENT '리포트 ID',
    event_id INT COMMENT '이벤트 ID',
    title VARCHAR(255) NOT NULL COMMENT '제목',
    timestamp VARCHAR(20) NOT NULL COMMENT '발생 시각',
    duration VARCHAR(20) NOT NULL COMMENT '영상 길이',
    location VARCHAR(255) COMMENT '위치',
    severity ENUM('high', 'medium', 'low') NOT NULL COMMENT '심각도',
    description TEXT NOT NULL COMMENT '설명',
    video_url VARCHAR(500) COMMENT '비디오 URL',
    thumbnail_url VARCHAR(500) COMMENT '썸네일 URL',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES daily_reports(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES timeline_events(id) ON DELETE SET NULL,
    INDEX idx_report_id (report_id),
    INDEX idx_event_id (event_id),
    INDEX idx_severity (severity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='하이라이트 영상';

