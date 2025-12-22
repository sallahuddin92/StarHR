-- Migration: Add password_hash column to employee_master
-- Run this migration before deploying to production

-- Add password_hash column
ALTER TABLE employee_master 
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) DEFAULT NULL;

-- Add role column for RBAC
ALTER TABLE employee_master 
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'WORKER' 
CHECK (role IN ('HR_ADMIN', 'MANAGER', 'WORKER'));

-- Create index for faster login lookups
CREATE INDEX IF NOT EXISTS idx_employee_master_login 
ON employee_master(employee_id, email) WHERE is_active = true;

-- Example: Set a bcrypt-hashed password for admin user (hash of 'password123')
-- In production, use a secure password and generate hash with bcrypt
-- UPDATE employee_master SET password_hash = '$2b$10$...' WHERE employee_id = 'EMP001';

COMMENT ON COLUMN employee_master.password_hash IS 'Bcrypt hashed password. NULL means use development fallback.';
