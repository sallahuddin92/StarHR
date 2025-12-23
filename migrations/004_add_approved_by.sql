-- Migration: Add approved_by column to attendance_ledger
-- This column is required to track who approved the request

ALTER TABLE attendance_ledger 
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES employee_master(id);

COMMENT ON COLUMN attendance_ledger.approved_by IS 'Employee ID of the manager who approved the request';
