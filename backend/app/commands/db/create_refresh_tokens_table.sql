-- Refresh Token 테이블 생성
-- Access Token을 갱신하기 위한 Refresh Token 저장

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(512) NOT NULL UNIQUE,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    last_used_at TIMESTAMP NULL,
    
    INDEX idx_user_id (user_id),
    INDEX idx_token (token),
    INDEX idx_expires_at (expires_at),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 설명
-- - user_id: 사용자 ID (users 테이블 참조)
-- - token: Refresh Token (64자 랜덤 문자열)
-- - is_revoked: 무효화 여부 (로그아웃 또는 사용 시 true)
-- - created_at: 생성 시간
-- - expires_at: 만료 시간 (7일)
-- - last_used_at: 마지막 사용 시간 (Token Rotation 추적)

