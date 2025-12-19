-- ============================================================================
-- Seed Data for Development
-- Enterprise HR Portal
-- ============================================================================

-- Insert Test Tenant
INSERT INTO tenants (id, name, slug, description, contact_email, industry, employee_count, is_active)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'TechCorp Malaysia Sdn Bhd',
  'techcorp-my',
  'Technology solutions company',
  'hr@techcorp.my',
  'Technology',
  50,
  true
) ON CONFLICT (slug) DO NOTHING;

-- salary_config table is created in schema.sql, no need to create here

-- Insert Test Employees
INSERT INTO employee_master (id, tenant_id, employee_id, full_name, email, phone_number, department, designation, employment_type, date_of_joining, is_active)
VALUES 
  ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'EMP001', 'Ahmad bin Abdullah', 'ahmad@techcorp.my', '+60123456789', 'Engineering', 'Senior Developer', 'Full-time', '2023-01-15', true),
  ('b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'EMP002', 'Siti Nurhaliza', 'siti@techcorp.my', '+60123456790', 'Engineering', 'Developer', 'Full-time', '2023-03-01', true),
  ('b3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'EMP003', 'Raj Kumar', 'raj@techcorp.my', '+60123456791', 'Operations', 'Manager', 'Full-time', '2022-06-15', true),
  ('b4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'EMP004', 'Lee Wei Ming', 'wei@techcorp.my', '+60123456792', 'Finance', 'Accountant', 'Full-time', '2023-06-01', true),
  ('b5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'EMP005', 'Fatimah Hassan', 'fatimah@techcorp.my', '+60123456793', 'HR', 'HR Executive', 'Full-time', '2024-01-10', true)
ON CONFLICT DO NOTHING;

-- Insert Salary Configurations (with required tenant_id and effective_date)
INSERT INTO salary_config (tenant_id, employee_id, basic_salary, daily_rate, marital_status, children, tax_category, monthly_ewa_limit, effective_date)
VALUES 
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 8000.00, 307.69, 'married', 2, 'C', 4000, '2025-01-01'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 5000.00, 192.31, 'single', 0, 'B', 2500, '2025-01-01'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 10000.00, 384.62, 'married', 3, 'C', 5000, '2025-01-01'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 6000.00, 230.77, 'married', 1, 'C', 3000, '2025-01-01'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 4500.00, 173.08, 'single', 0, 'B', 2250, '2025-01-01')
ON CONFLICT DO NOTHING;

-- Insert Sample Attendance Records (Current Month)
INSERT INTO attendance_ledger (tenant_id, employee_id, attendance_date, raw_clock_in, verified_clock_in, raw_clock_out, verified_clock_out, working_hours)
SELECT 
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  emp.id,
  d::date,
  (d + interval '8 hours' + (random() * interval '30 minutes'))::timestamp with time zone,
  (d + interval '8 hours' + (random() * interval '30 minutes'))::timestamp with time zone,
  (d + interval '17 hours' + (random() * interval '30 minutes'))::timestamp with time zone,
  (d + interval '17 hours' + (random() * interval '30 minutes'))::timestamp with time zone,
  8 + (random() * 2)
FROM employee_master emp
CROSS JOIN generate_series(
  date_trunc('month', CURRENT_DATE),
  CURRENT_DATE - interval '1 day',
  interval '1 day'
) d
WHERE emp.tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  AND EXTRACT(DOW FROM d) NOT IN (0, 6)  -- Exclude weekends
ON CONFLICT DO NOTHING;

-- Insert Sample Approved OT
UPDATE attendance_ledger
SET 
  ot_requested_hours = 2,
  ot_approved_hours = 2,
  ot_approval_status = 'approved'
WHERE 
  EXTRACT(DOW FROM attendance_date) = 5  -- Fridays
  AND tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Seed data inserted successfully!';
END $$;
