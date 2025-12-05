-- SafetyEvent와 DevelopmentEvent 테이블에 event_timestamp 컬럼 추가
-- 이 스크립트를 MySQL에서 실행하세요

USE dailycam;

-- 1. SafetyEvent 테이블에 event_timestamp 추가
ALTER TABLE safety_event 
ADD COLUMN event_timestamp DATETIME DEFAULT NULL AFTER resolved;

-- 인덱스 추가 (성능 향상)
CREATE INDEX idx_safety_event_timestamp ON safety_event(event_timestamp);

-- 2. DevelopmentEvent 테이블에 event_timestamp 추가
ALTER TABLE development_event 
ADD COLUMN event_timestamp DATETIME DEFAULT NULL AFTER is_sleep;

-- 인덱스 추가 (성능 향상)
CREATE INDEX idx_development_event_timestamp ON development_event(event_timestamp);

-- 완료 확인
SELECT 'event_timestamp 컬럼 추가 완료!' AS status;
