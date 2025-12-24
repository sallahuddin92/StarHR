-- ============================================================================
-- Migration: 008_training_management.sql
-- Description: Training Management module with RL integration
-- Implements:
--   - Training course definitions
--   - Training events/sessions
--   - Worker allocation with RL eligibility
--   - Completion confirmation → RL credit flow
-- Date: 2025-12-24
-- ============================================================================

-- ============================================================================
-- TABLE 1: Training Master (Course definitions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_master (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Course identification
  code VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  
  -- Course details
  duration_hours NUMERIC(5,2), -- e.g., 4.5 hours
  level VARCHAR(20) CHECK (level IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')),
  instructor VARCHAR(200),
  max_capacity INTEGER,
  
  -- Flags
  is_mandatory BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Replacement Leave linkage (configurable per course)
  rl_eligible BOOLEAN DEFAULT true, -- Does this course grant RL?
  rl_rule_id UUID REFERENCES replacement_leave_rule(id) ON DELETE SET NULL, -- Which rule to apply
  
  -- Audit
  created_by UUID REFERENCES employee_master(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES employee_master(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT unique_training_code UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_training_master_tenant ON training_master(tenant_id);
CREATE INDEX IF NOT EXISTS idx_training_master_category ON training_master(category);
CREATE INDEX IF NOT EXISTS idx_training_master_active ON training_master(is_active);

CREATE TRIGGER update_training_master_updated_at 
  BEFORE UPDATE ON training_master
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABLE 2: Training Event (Scheduled training sessions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_event (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  training_id UUID NOT NULL REFERENCES training_master(id) ON DELETE CASCADE,
  
  -- Event schedule
  event_date DATE NOT NULL, -- Start date
  event_end_date DATE, -- End date (for multi-day events)
  event_time_start TIME,
  event_time_end TIME,
  
  -- Location
  location VARCHAR(200),
  location_type VARCHAR(50) CHECK (location_type IN ('ONSITE', 'OFFSITE', 'ONLINE', 'HYBRID')),
  
  -- Day type (critical for RL eligibility)
  day_type VARCHAR(30) NOT NULL CHECK (day_type IN (
    'WORKING_DAY', 'OFF_DAY', 'REST_DAY', 'PUBLIC_HOLIDAY'
  )),
  
  -- RL override for this specific event
  rl_eligible BOOLEAN DEFAULT true, -- Can override training_master setting
  
  -- Event status
  status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN (
    'DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
  )),
  
  -- Additional info
  max_participants INTEGER, -- Can override training_master.max_capacity
  notes TEXT,
  
  -- Audit
  created_by UUID REFERENCES employee_master(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES employee_master(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_training_event_tenant ON training_event(tenant_id);
CREATE INDEX IF NOT EXISTS idx_training_event_training ON training_event(training_id);
CREATE INDEX IF NOT EXISTS idx_training_event_date ON training_event(event_date);
CREATE INDEX IF NOT EXISTS idx_training_event_status ON training_event(status);

CREATE TRIGGER update_training_event_updated_at 
  BEFORE UPDATE ON training_event
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABLE 3: Training Allocation (Workers assigned to training)
-- Two-stage validation: Attendance → Completion
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_allocation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  training_event_id UUID NOT NULL REFERENCES training_event(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employee_master(id) ON DELETE CASCADE,
  
  -- Allocation details
  allocated_by UUID NOT NULL REFERENCES employee_master(id) ON DELETE SET NULL,
  allocated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- RL eligibility override (per employee, per event)
  rl_eligible BOOLEAN DEFAULT true,
  rl_days_potential NUMERIC(5,2), -- Pre-calculated potential RL days based on rule
  
  -- Stage 1: Attendance
  attendance_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (attendance_status IN (
    'PENDING', 'ATTENDED', 'NO_SHOW', 'PARTIAL', 'EXCUSED'
  )),
  attendance_marked_by UUID REFERENCES employee_master(id) ON DELETE SET NULL,
  attendance_marked_at TIMESTAMP WITH TIME ZONE,
  hours_attended NUMERIC(5,2), -- Actual hours (for partial attendance)
  
  -- Stage 2: Completion (required for RL credit)
  completion_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (completion_status IN (
    'PENDING', 'COMPLETED', 'INCOMPLETE', 'FAILED'
  )),
  completion_confirmed_by UUID REFERENCES employee_master(id) ON DELETE SET NULL,
  completion_confirmed_at TIMESTAMP WITH TIME ZONE,
  completion_notes TEXT,
  
  -- RL Credit linkage (after completion approval)
  rl_credit_id UUID REFERENCES replacement_leave_credit(id) ON DELETE SET NULL,
  rl_credited_at TIMESTAMP WITH TIME ZONE,
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Prevent duplicate allocations
  CONSTRAINT unique_allocation UNIQUE(training_event_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_training_alloc_tenant ON training_allocation(tenant_id);
CREATE INDEX IF NOT EXISTS idx_training_alloc_event ON training_allocation(training_event_id);
CREATE INDEX IF NOT EXISTS idx_training_alloc_employee ON training_allocation(employee_id);
CREATE INDEX IF NOT EXISTS idx_training_alloc_attendance ON training_allocation(attendance_status);
CREATE INDEX IF NOT EXISTS idx_training_alloc_completion ON training_allocation(completion_status);

CREATE TRIGGER update_training_allocation_updated_at 
  BEFORE UPDATE ON training_allocation
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Add training_allocation_id to replacement_leave_credit for traceability
-- ============================================================================

ALTER TABLE replacement_leave_credit 
ADD COLUMN IF NOT EXISTS training_allocation_id UUID REFERENCES training_allocation(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_rl_credit_training ON replacement_leave_credit(training_allocation_id);

-- ============================================================================
-- Seed sample training courses
-- ============================================================================

INSERT INTO training_master (
  tenant_id, code, title, description, category, 
  duration_hours, level, instructor, max_capacity, 
  is_mandatory, rl_eligible
) VALUES
(
  '11111111-1111-1111-1111-111111111111',
  'WSC-001',
  'Workplace Safety & Compliance',
  'Comprehensive workplace safety training covering emergency procedures, hazard identification, and compliance requirements',
  'Compliance',
  2.0, 'BEGINNER', 'HR Department', 100,
  true, true
),
(
  '11111111-1111-1111-1111-111111111111',
  'LEP-001',
  'Leadership Excellence Program',
  'Advanced leadership development program for managers and senior staff',
  'Leadership',
  8.0, 'ADVANCED', 'John Maxwell', 20,
  false, true
),
(
  '11111111-1111-1111-1111-111111111111',
  'EXL-001',
  'Microsoft Excel Advanced',
  'Advanced Excel skills including pivot tables, VLOOKUP, macros, and data analysis',
  'Technical',
  4.0, 'INTERMEDIATE', 'Tech Academy', 50,
  false, true
),
(
  '11111111-1111-1111-1111-111111111111',
  'PDPA-001',
  'Data Protection & PDPA',
  'Personal Data Protection Act compliance training',
  'Compliance',
  1.5, 'BEGINNER', 'Legal Team', 100,
  true, true
)
ON CONFLICT (tenant_id, code) DO NOTHING;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE training_master IS 
  'Training course definitions with RL eligibility configuration';

COMMENT ON TABLE training_event IS 
  'Scheduled training sessions with date, location, and day type for RL calculation';

COMMENT ON TABLE training_allocation IS 
  'Worker allocation to training with two-stage validation (attendance → completion) before RL credit';

COMMENT ON COLUMN training_allocation.rl_days_potential IS 
  'Pre-calculated potential RL days based on rule - actual credit may differ based on hours attended';

COMMENT ON COLUMN training_allocation.completion_confirmed_by IS 
  'HR/Manager who confirmed completion - MUST be different from employee_id (self-approval prevention)';

COMMENT ON COLUMN replacement_leave_credit.training_allocation_id IS 
  'Links RL credit to specific training allocation for full traceability';
