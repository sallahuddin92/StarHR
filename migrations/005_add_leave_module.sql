-- ============================================================================
-- Migration: 005_add_leave_module.sql
-- Description: Add dynamic Leave (Cuti) management tables
-- Date: 2025-12-24
-- ============================================================================

-- ============================================================================
-- LEAVE TYPE MASTER (Dynamic Configuration)
-- All leave types are defined here. Adding/modifying rows instantly
-- affects all leave logic without code changes.
-- ============================================================================
CREATE TABLE IF NOT EXISTS leave_type_master (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  max_days_per_year INTEGER DEFAULT 0,
  carry_forward_allowed BOOLEAN DEFAULT false,
  max_carry_forward_days INTEGER DEFAULT 0,
  carry_forward_expiry_months INTEGER,
  requires_approval BOOLEAN DEFAULT true,
  requires_document BOOLEAN DEFAULT false,
  is_paid BOOLEAN DEFAULT true,
  min_notice_days INTEGER DEFAULT 0,
  max_consecutive_days INTEGER,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES employee_master(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES employee_master(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT leave_type_unique_code UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_leave_type_tenant ON leave_type_master(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leave_type_active ON leave_type_master(is_active);

-- ============================================================================
-- LEAVE ENTITLEMENT MASTER (Dynamic Rules per Grade/Tenure)
-- Defines how many days each employee group gets per leave type.
-- Supports grade-based, tenure-based, and employment-type-based allocation.
-- ============================================================================
CREATE TABLE IF NOT EXISTS leave_entitlement_master (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_type_master(id) ON DELETE CASCADE,
  employee_grade VARCHAR(50),
  min_tenure_months INTEGER DEFAULT 0,
  max_tenure_months INTEGER,
  employment_type VARCHAR(50),
  allocated_days NUMERIC(5,2) NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_entitlement_leave_type ON leave_entitlement_master(leave_type_id);
CREATE INDEX IF NOT EXISTS idx_entitlement_tenant ON leave_entitlement_master(tenant_id);

-- ============================================================================
-- LEAVE BALANCE (Employee-specific tracking)
-- Tracks each employee's leave balance per type per year.
-- Updated when leave is approved/cancelled.
-- ============================================================================
CREATE TABLE IF NOT EXISTS leave_balance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employee_master(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_type_master(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  allocated_days NUMERIC(5,2) DEFAULT 0,
  taken_days NUMERIC(5,2) DEFAULT 0,
  pending_days NUMERIC(5,2) DEFAULT 0,
  carry_forward_days NUMERIC(5,2) DEFAULT 0,
  carry_forward_expiry DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT leave_balance_unique UNIQUE(employee_id, leave_type_id, year)
);

CREATE INDEX IF NOT EXISTS idx_balance_employee ON leave_balance(employee_id);
CREATE INDEX IF NOT EXISTS idx_balance_year ON leave_balance(year);

-- ============================================================================
-- LEAVE REQUEST
-- Stores all leave applications.
-- ============================================================================
CREATE TABLE IF NOT EXISTS leave_request (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employee_master(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_type_master(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_requested NUMERIC(5,2) NOT NULL,
  half_day_start BOOLEAN DEFAULT false,
  half_day_end BOOLEAN DEFAULT false,
  reason TEXT,
  document_url TEXT,
  status approval_status DEFAULT 'pending',
  approved_by UUID REFERENCES employee_master(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_request_employee ON leave_request(employee_id);
CREATE INDEX IF NOT EXISTS idx_request_status ON leave_request(status);
CREATE INDEX IF NOT EXISTS idx_request_dates ON leave_request(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_request_tenant ON leave_request(tenant_id);

-- ============================================================================
-- LEAVE APPROVAL HISTORY (Audit Trail)
-- Tracks all approval/rejection actions for compliance and audit.
-- ============================================================================
CREATE TABLE IF NOT EXISTS leave_approval_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  leave_request_id UUID NOT NULL REFERENCES leave_request(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL,
  performed_by UUID NOT NULL REFERENCES employee_master(id),
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  previous_status approval_status,
  new_status approval_status
);

CREATE INDEX IF NOT EXISTS idx_approval_history_request ON leave_approval_history(leave_request_id);

-- ============================================================================
-- TRIGGERS for updated_at
-- ============================================================================
CREATE TRIGGER update_leave_type_master_updated_at 
  BEFORE UPDATE ON leave_type_master
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_entitlement_master_updated_at 
  BEFORE UPDATE ON leave_entitlement_master
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_balance_updated_at 
  BEFORE UPDATE ON leave_balance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_request_updated_at 
  BEFORE UPDATE ON leave_request
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA: Default Malaysian Leave Types
-- ============================================================================
INSERT INTO leave_type_master (
  tenant_id, code, name, description, max_days_per_year, 
  carry_forward_allowed, max_carry_forward_days, is_paid, requires_document, sort_order
)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'ANNUAL', 'Annual Leave', 
   'Paid annual leave entitlement', 14, true, 5, true, false, 1),
  ('11111111-1111-1111-1111-111111111111', 'MC', 'Medical Leave (MC)', 
   'Sick leave with medical certificate', 14, false, 0, true, true, 2),
  ('11111111-1111-1111-1111-111111111111', 'EMERGENCY', 'Emergency Leave', 
   'Urgent personal matters', 3, false, 0, true, false, 3),
  ('11111111-1111-1111-1111-111111111111', 'UNPAID', 'Unpaid Leave', 
   'Leave without pay', 30, false, 0, false, false, 4),
  ('11111111-1111-1111-1111-111111111111', 'MATERNITY', 'Maternity Leave', 
   'Paid maternity leave for mothers', 98, false, 0, true, true, 5),
  ('11111111-1111-1111-1111-111111111111', 'PATERNITY', 'Paternity Leave', 
   'Paid paternity leave for fathers', 7, false, 0, true, false, 6),
  ('11111111-1111-1111-1111-111111111111', 'HOSPITALIZATION', 'Hospitalization Leave', 
   'Extended medical leave for hospitalization', 60, false, 0, true, true, 7),
  ('11111111-1111-1111-1111-111111111111', 'REPLACEMENT', 'Replacement Leave', 
   'Leave in lieu of working on public holidays', 0, false, 0, true, false, 8)
ON CONFLICT (tenant_id, code) DO NOTHING;

-- ============================================================================
-- SEED DATA: Default Entitlements (Based on Employment Act 1955)
-- ============================================================================
-- Annual Leave: 8 days (< 2 years), 12 days (2-5 years), 16 days (> 5 years)
INSERT INTO leave_entitlement_master (
  tenant_id, leave_type_id, min_tenure_months, max_tenure_months, allocated_days, effective_from
)
SELECT 
  '11111111-1111-1111-1111-111111111111',
  id,
  0, 24,
  8,
  '2025-01-01'
FROM leave_type_master WHERE code = 'ANNUAL' AND tenant_id = '11111111-1111-1111-1111-111111111111'
ON CONFLICT DO NOTHING;

INSERT INTO leave_entitlement_master (
  tenant_id, leave_type_id, min_tenure_months, max_tenure_months, allocated_days, effective_from
)
SELECT 
  '11111111-1111-1111-1111-111111111111',
  id,
  24, 60,
  12,
  '2025-01-01'
FROM leave_type_master WHERE code = 'ANNUAL' AND tenant_id = '11111111-1111-1111-1111-111111111111'
ON CONFLICT DO NOTHING;

INSERT INTO leave_entitlement_master (
  tenant_id, leave_type_id, min_tenure_months, max_tenure_months, allocated_days, effective_from
)
SELECT 
  '11111111-1111-1111-1111-111111111111',
  id,
  60, NULL,
  16,
  '2025-01-01'
FROM leave_type_master WHERE code = 'ANNUAL' AND tenant_id = '11111111-1111-1111-1111-111111111111'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
