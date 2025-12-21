-- Migration: Add Pending OT Requests for Testing
-- Run this against the existing database to add pending OT approvals
-- Execute: docker exec -i hr-portal-db psql -U postgres -d hr_portal < migrations/001_add_pending_ot.sql

-- Insert Pending OT Requests (Recent days - Mondays and Wednesdays)
-- These will show up in the Recent Activities and Pending Approvals
UPDATE attendance_ledger
SET 
  ot_requested_hours = CASE 
    WHEN EXTRACT(DOW FROM attendance_date) = 1 THEN 1.5  -- Mondays: 1.5 hours
    WHEN EXTRACT(DOW FROM attendance_date) = 3 THEN 2.0  -- Wednesdays: 2 hours
    ELSE 1.0 
  END,
  ot_approved_hours = 0,
  ot_approval_status = 'pending',
  remarks = 'Urgent project deadline'
WHERE 
  attendance_date >= CURRENT_DATE - interval '14 days'
  AND EXTRACT(DOW FROM attendance_date) IN (1, 3)  -- Mondays and Wednesdays
  AND tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  AND (ot_approval_status IS NULL OR ot_approval_status != 'approved');

-- Insert Sample EWA Requests (Pending) if they don't exist
INSERT INTO ewa_transactions (tenant_id, employee_id, amount, status, disbursement_date)
SELECT 
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  emp.id,
  CASE 
    WHEN emp.employee_id = 'EMP001' THEN 1500.00
    WHEN emp.employee_id = 'EMP002' THEN 800.00
    ELSE 500.00
  END,
  'pending',
  NULL
FROM employee_master emp
WHERE emp.tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  AND emp.employee_id IN ('EMP001', 'EMP002', 'EMP003')
  AND NOT EXISTS (
    SELECT 1 FROM ewa_transactions et 
    WHERE et.employee_id = emp.id AND et.status = 'pending'
  );

-- Show summary of what was updated
SELECT 
  'Pending OT Requests' as type,
  COUNT(*) as count
FROM attendance_ledger 
WHERE ot_approval_status = 'pending' 
  AND ot_requested_hours > 0
  AND tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
UNION ALL
SELECT 
  'Pending EWA Requests' as type,
  COUNT(*) as count
FROM ewa_transactions 
WHERE status = 'pending'
  AND tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
