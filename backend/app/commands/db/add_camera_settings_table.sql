-- 카메라 설정 테이블 생성 (MySQL 버전)
-- 실행: mysql -u root -p dailycam < backend/app/commands/db/add_camera_settings_table.sql

CREATE TABLE IF NOT EXISTS camera_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    camera_id VARCHAR(255) NOT NULL,
    camera_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 카메라 영상 테이블 생성 (MySQL 버전)
CREATE TABLE IF NOT EXISTS camera_videos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    camera_setting_id INT NOT NULL,
    filename VARCHAR(500) NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    file_size INT,
    duration INT,
    is_active BOOLEAN DEFAULT TRUE,
    order_index INT DEFAULT 0,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (camera_setting_id) REFERENCES camera_settings(id) ON DELETE CASCADE
);

-- 인덱스 생성 (MySQL 버전)
CREATE INDEX idx_camera_settings_user_id ON camera_settings(user_id);
CREATE INDEX idx_camera_settings_camera_id ON camera_settings(camera_id);
CREATE INDEX idx_camera_videos_camera_setting_id ON camera_videos(camera_setting_id);

-- 생성 완료 메시지
SELECT 'Camera Settings Tables Created Successfully' as status;

