-- ============================================================================
-- Migration: 007_replacement_leave.sql
-- Description: Replacement Leave (Time-Off-in-Lieu) module
-- All rules configurable - NO HARDCODED VALUES
-- Date: 2025-12-24
-- ============================================================================

-- ============================================================================
-- TABLE 1: Replacement Leave Rules (HR Admin configurable)
-- ============================================================================

CREATE TABLE IF NOT EXISTS replacement_leave_rule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Rule identification
  rule_code VARCHAR(50) NOT NULL,
  rule_name VARCHAR(200) NOT NULL,
  description TEXT,
  
  -- Trigger type: What event grants replacement leave
  trigger_type VARCHAR(50) NOT NULL, -- 'TRAINING', 'PUBLIC_HOLIDAY_WORK', 'REST_DAY_WORK', 'OVERTIME', 'OFFICIAL_DUTY', 'CUSTOM'
  
  -- Credit calculation
  credit_type VARCHAR(20) NOT NULL DEFAULT 'FIXED', -- 'FIXED', 'RATIO'
  credit_days NUMERIC(5,2) NOT NULL DEFAULT 1, -- Days credited per event (or ratio multiplier)
  min_hours_required NUMERIC(5,2) DEFAULT 4, -- Minimum hours worked to qualify (optional)
  
  -- Limits (NULL = no limit)
  max_days_per_event NUMERIC(5,2), -- Max days from single event
  max_days_per_month NUMERIC(5,2), -- Monthly cap
  max_days_per_year NUMERIC(5,2), -- Annual cap
  
  -- Expiry rules
  expiry_days INTEGER, -- Days until credit expires (NULL = no expiry)
  carry_forward_allowed BOOLEAN DEFAULT false,
  max_carry_forward_days NUMERIC(5,2),
  
  -- Eligibility filters (NULL = all eligible)
  eligible_departments TEXT[], -- Array of department names
  eligible_grades TEXT[], -- Array of grades
  eligible_employment_types TEXT[], -- 'PERMANENT', 'CONTRACT', 'PROBATION'
  
  -- Approval settings
  requires_approval BOOLEAN DEFAULT true,
  auto_credit_on_approval BOOLEAN DEFAULT true, -- Auto add to balance when approved
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  
  -- Audit
  created_by UUID REFERENCES employee_master(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES employee_master(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT unique_rule_code UNIQUE(tenant_id, rule_code)
);

CREATE INDEX IF NOT EXISTS idx_rl_rule_tenant ON replacement_leave_rule(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rl_rule_trigger ON replacement_leave_rule(trigger_type);
CREATE INDEX IF NOT EXISTS idx_rl_rule_active ON replacement_leave_rule(is_active);

-- ============================================================================
-- TABLE 2: Replacement Leave Credits (Individual employee credits)
-- ============================================================================

CREATE TABLE IF NOT EXISTS replacement_leave_credit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employee_master(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES replacement_leave_rule(id) ON DELETE SET NULL,
  
  -- Trigger event details
  trigger_type VARCHAR(50) NOT NULL,
  trigger_date DATE NOT NULL, -- Date of the event (e.g., training date, holiday worked)
  trigger_end_date DATE, -- For multi-day events
  trigger_description TEXT NOT NULL, -- e.g., "Safety Training Course", "CNY Public Holiday"
  trigger_reference VARCHAR(100), -- Reference ID (training ID, etc.)
  
  -- Hours/Days worked (for calculation)
  hours_worked NUMERIC(5,2), -- Optional: actual hours
  
  -- Credit calculation result
  days_credited NUMERIC(5,2) NOT NULL,
  calculation_notes TEXT, -- How it was calculated
  
  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'USED', 'CANCELLED'
  
  -- Expiry
  expiry_date DATE, -- When this credit expires
  days_used NUMERIC(5,2) DEFAULT 0, -- How much has been used
  days_remaining NUMERIC(5,2), -- Cached for performance
  
  -- Request/Approval workflow
  requested_by UUID REFERENCES employee_master(id), -- Who submitted (employee or HR)
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  approved_by UUID REFERENCES employee_master(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  approval_notes TEXT,
  
  rejected_by UUID REFERENCES employee_master(id),
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rl_credit_employee ON replacement_leave_credit(employee_id);
CREATE INDEX IF NOT EXISTS idx_rl_credit_status ON replacement_leave_credit(status);
CREATE INDEX IF NOT EXISTS idx_rl_credit_expiry ON replacement_leave_credit(expiry_date);
CREATE INDEX IF NOT EXISTS idx_rl_credit_trigger_date ON replacement_leave_credit(trigger_date);

CREATE TRIGGER update_rl_credit_updated_at 
  BEFORE UPDATE ON replacement_leave_credit
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABLE 3: Credit History (Audit trail for usage)
-- ============================================================================

CREATE TABLE IF NOT EXISTS replacement_leave_credit_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  credit_id UUID NOT NULL REFERENCES replacement_leave_credit(id) ON DELETE CASCADE,
  
  action VARCHAR(50) NOT NULL, -- 'CREATED', 'APPROVED', 'REJECTED', 'USED', 'EXPIRED', 'CANCELLED', 'ADJUSTED'
  action_by UUID REFERENCES employee_master(id),
  action_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- For USED action
  leave_request_id UUID REFERENCES leave_request(id),
  days_affected NUMERIC(5,2),
  
  -- Details
  notes TEXT,
  previous_status VARCHAR(20),
  new_status VARCHAR(20)
);

CREATE INDEX IF NOT EXISTS idx_rl_history_credit ON replacement_leave_credit_history(credit_id);

-- ============================================================================
-- Ensure "Replacement Leave" exists as a leave type
-- ============================================================================

INSERT INTO leave_type_master (
  tenant_id, code, name, description, 
  max_days_per_year, carry_forward_allowed, requires_approval,
  requires_document, is_paid, is_active, sort_order
)
SELECT 
  '11111111-1111-1111-1111-111111111111',
  'RL',
  'Replacement Leave',
  'Time-Off-in-Lieu for work performed outside normal hours (training, public holidays, etc.)',
  0, -- No fixed max - earned dynamically
  true, -- Can carry forward
  true, -- Requires approval to use
  false, -- No document required
  true, -- Paid leave
  true,
  50
WHERE NOT EXISTS (
  SELECT 1 FROM leave_type_master 
  WHERE code = 'RL' AND tenant_id = '11111111-1111-1111-1111-111111111111'
);

-- ============================================================================
-- Seed default replacement leave rules (examples)
-- ============================================================================

INSERT INTO replacement_leave_rule (
  tenant_id, rule_code, rule_name, description, trigger_type,
  credit_type, credit_days, expiry_days, requires_approval, effective_from
) VALUES
-- Training on off-day: 1 day per training
(
  '11111111-1111-1111-1111-111111111111',
  'TRAINING_OFFDAY',
  'Training on Off-Day',
  'Replacement leave for attending mandatory training on rest day or public holiday',
  'TRAINING',
  'FIXED', 1, 90, true, CURRENT_DATE
),
-- Public holiday work: 1 day
(
  '11111111-1111-1111-1111-111111111111',
  'PH_WORK',
  'Public Holiday Work',
  'Replacement leave for working on a gazetted public holiday',
  'PUBLIC_HOLIDAY_WORK',
  'FIXED', 1, 90, true, CURRENT_DATE
),
-- Rest day work: 0.5 day per half-day, 1 day for full day
(
  '11111111-1111-1111-1111-111111111111',
  'REST_DAY_WORK',
  'Rest Day Work',
  'Replacement leave for working on regular rest day (Saturday/Sunday)',
  'REST_DAY_WORK',
  'FIXED', 1, 60, true, CURRENT_DATE
)
ON CONFLICT (tenant_id, rule_code) DO NOTHING;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE replacement_leave_rule IS 
  'Configurable rules for granting replacement leave. All values are admin-configurable.';

COMMENT ON TABLE replacement_leave_credit IS 
  'Individual replacement leave credits earned by employees with full audit trail.';

COMMENT ON COLUMN replacement_leave_rule.trigger_type IS 
  'Event type: TRAINING, PUBLIC_HOLIDAY_WORK, REST_DAY_WORK, OVERTIME, OFFICIAL_DUTY, CUSTOM';

COMMENT ON COLUMN replacement_leave_credit.status IS 
  'PENDING=awaiting approval, APPROVED=credited, REJECTED=denied, EXPIRED=past expiry, USED=fully consumed, CANCELLED=voided';
