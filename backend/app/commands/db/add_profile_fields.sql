-- Migration: Add profile fields to users table
-- Date: 2025-12-03

ALTER TABLE users ADD COLUMN phone VARCHAR(20);
ALTER TABLE users ADD COLUMN child_name VARCHAR(100);
ALTER TABLE users ADD COLUMN child_birthdate DATE;
