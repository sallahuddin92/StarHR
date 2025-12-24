-- ============================================================================
-- Migration: 006_entitlement_rule_engine.sql
-- Description: Full rule-based entitlement system with no hardcoded logic
-- Date: 2025-12-24
-- ============================================================================

-- ============================================================================
-- PHASE 1: Enhance leave_entitlement_master
-- Add department, designation, priority, and audit fields
-- ============================================================================

-- Add new columns to leave_entitlement_master
ALTER TABLE leave_entitlement_master
  ADD COLUMN IF NOT EXISTS department VARCHAR(100),
  ADD COLUMN IF NOT EXISTS designation VARCHAR(100),
  ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS rule_name VARCHAR(200),
  ADD COLUMN IF NOT EXISTS rule_description TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES employee_master(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES employee_master(id),
  ADD COLUMN IF NOT EXISTS change_reason TEXT;

-- Index for faster rule lookup
CREATE INDEX IF NOT EXISTS idx_entitlement_priority ON leave_entitlement_master(priority);
CREATE INDEX IF NOT EXISTS idx_entitlement_effective ON leave_entitlement_master(effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_entitlement_department ON leave_entitlement_master(department);
CREATE INDEX IF NOT EXISTS idx_entitlement_grade ON leave_entitlement_master(employee_grade);

-- ============================================================================
-- PHASE 2: Individual Exception Table
-- For overriding standard entitlements for specific employees
-- ============================================================================

CREATE TABLE IF NOT EXISTS leave_entitlement_exception (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employee_master(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_type_master(id) ON DELETE CASCADE,
  allocated_days NUMERIC(5,2) NOT NULL,
  reason TEXT NOT NULL,
  approved_by UUID REFERENCES employee_master(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  effective_year INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES employee_master(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES employee_master(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT exception_unique UNIQUE(employee_id, leave_type_id, effective_year)
);

CREATE INDEX IF NOT EXISTS idx_exception_employee ON leave_entitlement_exception(employee_id);
CREATE INDEX IF NOT EXISTS idx_exception_leave_type ON leave_entitlement_exception(leave_type_id);
CREATE INDEX IF NOT EXISTS idx_exception_year ON leave_entitlement_exception(effective_year);

CREATE TRIGGER update_leave_exception_updated_at 
  BEFORE UPDATE ON leave_entitlement_exception
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PHASE 3: Entitlement History Table (Rule Versioning & Audit)
-- Tracks all changes to entitlement rules
-- ============================================================================

CREATE TABLE IF NOT EXISTS leave_entitlement_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entitlement_id UUID REFERENCES leave_entitlement_master(id) ON DELETE SET NULL,
  exception_id UUID REFERENCES leave_entitlement_exception(id) ON DELETE SET NULL,
  action VARCHAR(20) NOT NULL, -- 'CREATE', 'UPDATE', 'DEACTIVATE', 'DELETE'
  changed_by UUID REFERENCES employee_master(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  previous_values JSONB,
  new_values JSONB,
  change_reason TEXT,
  affected_employees INTEGER -- Number of employees affected by this change
);

CREATE INDEX IF NOT EXISTS idx_entitlement_history_rule ON leave_entitlement_history(entitlement_id);
CREATE INDEX IF NOT EXISTS idx_entitlement_history_exception ON leave_entitlement_history(exception_id);
CREATE INDEX IF NOT EXISTS idx_entitlement_history_changed_at ON leave_entitlement_history(changed_at);

-- ============================================================================
-- PHASE 4: Rule Priority Configuration Table
-- Allows HR Admin to configure rule priority order
-- ============================================================================

CREATE TABLE IF NOT EXISTS leave_rule_priority_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  rule_type VARCHAR(50) NOT NULL, -- 'EXCEPTION', 'TENURE_GRADE_DEPT', 'TENURE_GRADE', 'TENURE', 'GRADE', 'DEFAULT'
  priority INTEGER NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT priority_unique UNIQUE(tenant_id, rule_type)
);

-- Seed default priority order
INSERT INTO leave_rule_priority_config (tenant_id, rule_type, priority, description)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'EXCEPTION', 10, 'Individual employee exception (highest priority)'),
  ('11111111-1111-1111-1111-111111111111', 'TENURE_GRADE_DEPT', 20, 'Specific tenure + grade + department combination'),
  ('11111111-1111-1111-1111-111111111111', 'TENURE_GRADE', 30, 'Tenure + grade combination'),
  ('11111111-1111-1111-1111-111111111111', 'TENURE_DEPT', 35, 'Tenure + department combination'),
  ('11111111-1111-1111-1111-111111111111', 'TENURE', 40, 'Tenure-based only'),
  ('11111111-1111-1111-1111-111111111111', 'GRADE_DEPT', 45, 'Grade + department combination'),
  ('11111111-1111-1111-1111-111111111111', 'GRADE', 50, 'Grade-based only'),
  ('11111111-1111-1111-1111-111111111111', 'DEPT', 55, 'Department-based only'),
  ('11111111-1111-1111-1111-111111111111', 'DEFAULT', 100, 'Default from leave type master (fallback)')
ON CONFLICT (tenant_id, rule_type) DO NOTHING;

-- ============================================================================
-- PHASE 5: Add columns to leave_balance for tracking calculation source
-- ============================================================================

ALTER TABLE leave_balance
  ADD COLUMN IF NOT EXISTS entitlement_source VARCHAR(50), -- Rule type that determined allocation
  ADD COLUMN IF NOT EXISTS entitlement_rule_id UUID, -- Reference to the rule used
  ADD COLUMN IF NOT EXISTS calculation_breakdown JSONB, -- Full breakdown for transparency
  ADD COLUMN IF NOT EXISTS last_recalculated_at TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- PHASE 6: Add sample entitlement rules (Malaysian EA 1955 compliant)
-- ============================================================================

-- Update existing rules with names and priorities
UPDATE leave_entitlement_master 
SET 
  rule_name = 'Junior Staff Annual Leave (<2 years)',
  rule_description = 'Based on Employment Act 1955: 8 days for employees with less than 2 years service',
  priority = 40
WHERE min_tenure_months = 0 AND max_tenure_months = 24
  AND tenant_id = '11111111-1111-1111-1111-111111111111';

UPDATE leave_entitlement_master 
SET 
  rule_name = 'Mid-Level Staff Annual Leave (2-5 years)',
  rule_description = 'Based on Employment Act 1955: 12 days for employees with 2-5 years service',
  priority = 40
WHERE min_tenure_months = 24 AND max_tenure_months = 60
  AND tenant_id = '11111111-1111-1111-1111-111111111111';

UPDATE leave_entitlement_master 
SET 
  rule_name = 'Senior Staff Annual Leave (>5 years)',
  rule_description = 'Based on Employment Act 1955: 16 days for employees with more than 5 years service',
  priority = 40
WHERE min_tenure_months = 60 AND max_tenure_months IS NULL
  AND tenant_id = '11111111-1111-1111-1111-111111111111';

-- Add MC entitlement rules (EA 1955: 14 days general, 60 days hospitalization)
INSERT INTO leave_entitlement_master (
  tenant_id, leave_type_id, min_tenure_months, max_tenure_months, 
  allocated_days, effective_from, rule_name, rule_description, priority
)
SELECT 
  '11111111-1111-1111-1111-111111111111',
  id,
  0, NULL,
  14,
  '2025-01-01',
  'Standard MC Entitlement',
  'Based on Employment Act 1955: 14 days medical leave per year',
  40
FROM leave_type_master 
WHERE code = 'MC' AND tenant_id = '11111111-1111-1111-1111-111111111111'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

COMMENT ON TABLE leave_entitlement_exception IS 
  'Individual employee entitlement overrides. Used for special cases like medical conditions, contract terms, etc.';

COMMENT ON TABLE leave_entitlement_history IS 
  'Audit trail for all entitlement rule changes. Supports compliance and rollback.';

COMMENT ON TABLE leave_rule_priority_config IS 
  'Configurable priority order for entitlement rule matching. Lower number = higher priority.';
