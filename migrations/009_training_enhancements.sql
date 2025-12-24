-- ============================================================================
-- Migration: 009_training_enhancements.sql
-- Description: Enhancements for Training Management module
-- - Add test training flag
-- - Add eligibility criteria
-- - Add audit logging
-- Date: 2025-12-24
-- ============================================================================

-- ============================================================================
-- 1. Add is_test flag to training_master (distinguish test/demo trainings)
-- ============================================================================

ALTER TABLE training_master 
ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT false;

COMMENT ON COLUMN training_master.is_test IS 
  'Flag to mark training as test/demo data. Test trainings follow same rules but are visually distinguished.';

-- ============================================================================
-- 2. Add eligibility criteria columns to training_master
-- ============================================================================

ALTER TABLE training_master 
ADD COLUMN IF NOT EXISTS eligible_departments TEXT[],
ADD COLUMN IF NOT EXISTS eligible_grades TEXT[],
ADD COLUMN IF NOT EXISTS eligible_roles TEXT[];

COMMENT ON COLUMN training_master.eligible_departments IS 
  'Array of department names eligible for this training. NULL = all departments eligible.';
COMMENT ON COLUMN training_master.eligible_grades IS 
  'Array of grades eligible for this training. NULL = all grades eligible.';
COMMENT ON COLUMN training_master.eligible_roles IS 
  'Array of roles/designations eligible for this training. NULL = all roles eligible.';

-- ============================================================================
-- 3. Add is_test flag to training_event as well
-- ============================================================================

ALTER TABLE training_event 
ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT false;

-- ============================================================================
-- 4. Create training audit log table
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- What was done
  action_type VARCHAR(50) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'ASSIGN', 'UNASSIGN', 'ATTENDANCE', 'COMPLETE', 'ARCHIVE'
  
  -- What entity was affected
  entity_type VARCHAR(50) NOT NULL, -- 'TRAINING', 'EVENT', 'ALLOCATION'
  entity_id UUID NOT NULL,
  
  -- Human-readable description
  description TEXT NOT NULL,
  
  -- Details as JSON for flexibility
  details JSONB,
  
  -- Who did it
  performed_by UUID NOT NULL REFERENCES employee_master(id) ON DELETE SET NULL,
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- For filtering
  is_test BOOLEAN DEFAULT false, -- Inherits from training
  
  -- IP/User agent for security audits (optional)
  ip_address VARCHAR(45),
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_training_audit_tenant ON training_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_training_audit_entity ON training_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_training_audit_performer ON training_audit_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_training_audit_date ON training_audit_log(performed_at);
CREATE INDEX IF NOT EXISTS idx_training_audit_action ON training_audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_training_audit_test ON training_audit_log(is_test);

COMMENT ON TABLE training_audit_log IS 
  'Full audit trail for all training module operations. Entries are never deleted.';

-- ============================================================================
-- 5. Add archived status to training_master for soft-delete
-- ============================================================================

ALTER TABLE training_master 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES employee_master(id);

COMMENT ON COLUMN training_master.is_archived IS 
  'Soft-delete flag. Archived trainings are hidden but preserved for audit.';

-- ============================================================================
-- 6. Mark existing seeded trainings as non-test (production data)
-- ============================================================================

UPDATE training_master SET is_test = false WHERE is_test IS NULL;

-- ============================================================================
-- 7. Insert sample test training for verification
-- ============================================================================

INSERT INTO training_master (
  tenant_id, code, title, description, category, 
  duration_hours, level, instructor, max_capacity, 
  is_mandatory, rl_eligible, is_test
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'TEST-001',
  'Sample Test Training',
  'This is a test training for verifying the system workflow. Can be safely archived after testing.',
  'Test',
  2.0, 'BEGINNER', 'System Admin', 10,
  false, true, true
)
ON CONFLICT (tenant_id, code) DO NOTHING;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON COLUMN training_audit_log.action_type IS 
  'CREATE=new record, UPDATE=modified, DELETE=removed, ASSIGN=worker assigned, UNASSIGN=worker removed, ATTENDANCE=attendance marked, COMPLETE=completion confirmed, ARCHIVE=soft-deleted';

COMMENT ON COLUMN training_audit_log.details IS 
  'JSON object with action-specific details: old_value, new_value, affected_employee_ids, etc.';
