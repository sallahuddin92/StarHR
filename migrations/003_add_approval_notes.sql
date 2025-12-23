-- Migration: Add approval_notes column to attendance_ledger
-- This column is required for storing notes when approving/rejecting requests

ALTER TABLE attendance_ledger 
ADD COLUMN IF NOT EXISTS approval_notes TEXT;

COMMENT ON COLUMN attendance_ledger.approval_notes IS 'Notes provided by manager during approval/rejection';
