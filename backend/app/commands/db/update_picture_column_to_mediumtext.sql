-- 프로필 사진 컬럼을 MEDIUMTEXT로 변경
-- MEDIUMTEXT는 최대 16MB까지 저장 가능 (Base64 인코딩된 10MB 이미지 저장 가능)

ALTER TABLE users MODIFY COLUMN picture MEDIUMTEXT;
