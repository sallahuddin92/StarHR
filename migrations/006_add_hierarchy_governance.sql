-- ============================================================================
-- Migration: 006_add_hierarchy_governance.sql
-- Description: Add organizational hierarchy and enhanced leave governance
-- Date: 2025-12-24
-- ============================================================================

-- ============================================================================
-- DEPARTMENTS TABLE (Organizational Structure)
-- Hierarchical department structure with fallback approvers
-- ============================================================================
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  head_employee_id UUID REFERENCES employee_master(id) ON DELETE SET NULL,
  fallback_approver_id UUID REFERENCES employee_master(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT dept_unique_code UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_dept_tenant ON departments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dept_parent ON departments(parent_id);
CREATE INDEX IF NOT EXISTS idx_dept_head ON departments(head_employee_id);

-- ============================================================================
-- ORGANIZATIONAL HIERARCHY (Employee Position & Reporting Lines)
-- Links each employee to their supervisor and department
-- ============================================================================
CREATE TABLE IF NOT EXISTS org_hierarchy (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employee_master(id) ON DELETE CASCADE,
  reports_to_id UUID REFERENCES employee_master(id) ON DELETE SET NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  position_title VARCHAR(100),
  hierarchy_level INTEGER NOT NULL DEFAULT 99, -- 1=CEO, 2=Director, 3=Manager, etc.
  can_approve_leave BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_by UUID REFERENCES employee_master(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT org_hierarchy_unique_employee UNIQUE(employee_id)
);

CREATE INDEX IF NOT EXISTS idx_hierarchy_tenant ON org_hierarchy(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hierarchy_reports_to ON org_hierarchy(reports_to_id);
CREATE INDEX IF NOT EXISTS idx_hierarchy_dept ON org_hierarchy(department_id);
CREATE INDEX IF NOT EXISTS idx_hierarchy_level ON org_hierarchy(hierarchy_level);

-- ============================================================================
-- HIERARCHY HISTORY (Audit Trail for Org Changes)
-- Preserves historical state for compliance
-- ============================================================================
CREATE TABLE IF NOT EXISTS org_hierarchy_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employee_master(id) ON DELETE CASCADE,
  reports_to_employee_id UUID REFERENCES employee_master(id),
  department_id UUID,
  department_name VARCHAR(100),
  hierarchy_level INTEGER,
  position_title VARCHAR(100),
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
  valid_to TIMESTAMP WITH TIME ZONE,
  snapshot_reason VARCHAR(50) NOT NULL, -- INITIAL, MANUAL_CHANGE, REORG, PROMOTION
  changed_by UUID REFERENCES employee_master(id),
  change_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_hierarchy_history_employee ON org_hierarchy_history(employee_id);
CREATE INDEX IF NOT EXISTS idx_hierarchy_history_valid ON org_hierarchy_history(valid_from, valid_to);

-- ============================================================================
-- HIERARCHY LEVELS MASTER (Configurable Level Names)
-- Allows HR to define custom hierarchy level names
-- ============================================================================
CREATE TABLE IF NOT EXISTS hierarchy_levels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  level_number INTEGER NOT NULL,
  level_name VARCHAR(50) NOT NULL,
  description TEXT,
  CONSTRAINT hierarchy_level_unique UNIQUE(tenant_id, level_number)
);

-- ============================================================================
-- LEAVE APPROVAL FLOW MASTER (Configurable Approval Chains)
-- Define approval requirements per leave type
-- ============================================================================
CREATE TABLE IF NOT EXISTS leave_approval_flow_master (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_type_master(id) ON DELETE CASCADE,
  flow_name VARCHAR(100),
  step_order INTEGER NOT NULL,
  approver_type VARCHAR(30) NOT NULL, -- DIRECT_SUPERVISOR, DEPT_HEAD, HR_ADMIN, SPECIFIC_EMPLOYEE
  specific_approver_id UUID REFERENCES employee_master(id),
  min_hierarchy_level INTEGER, -- If set, only approvers at this level or above
  is_required BOOLEAN DEFAULT true,
  can_skip_if_missing BOOLEAN DEFAULT false,
  max_days_threshold NUMERIC(5,2), -- Only apply this step if days >= threshold
  conditions JSONB, -- Additional conditions as JSON
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT flow_step_unique UNIQUE(leave_type_id, step_order)
);

CREATE INDEX IF NOT EXISTS idx_approval_flow_leave_type ON leave_approval_flow_master(leave_type_id);

-- ============================================================================
-- MODIFY LEAVE_REQUEST: Add hierarchy tracking
-- ============================================================================
ALTER TABLE leave_request 
  ADD COLUMN IF NOT EXISTS current_step INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS total_steps INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS current_approver_id UUID REFERENCES employee_master(id),
  ADD COLUMN IF NOT EXISTS approval_chain_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS hierarchy_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS is_hr_override BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS hr_override_by UUID REFERENCES employee_master(id),
  ADD COLUMN IF NOT EXISTS hr_override_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS hr_override_reason TEXT;

-- ============================================================================
-- MODIFY LEAVE_APPROVAL_HISTORY: Enhanced audit trail
-- ============================================================================
ALTER TABLE leave_approval_history
  ADD COLUMN IF NOT EXISTS step_order INTEGER,
  ADD COLUMN IF NOT EXISTS approver_role VARCHAR(30),
  ADD COLUMN IF NOT EXISTS approver_position VARCHAR(100),
  ADD COLUMN IF NOT EXISTS approver_hierarchy_level INTEGER,
  ADD COLUMN IF NOT EXISTS is_hr_override BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS hierarchy_snapshot_at_action JSONB;

-- ============================================================================
-- LEAVE ALLOCATION LOG (Audit for HR Balance Changes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS leave_allocation_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employee_master(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_type_master(id) ON DELETE CASCADE,
  action VARCHAR(30) NOT NULL, -- ALLOCATE, ADJUST, RESET, CARRY_FORWARD, FORFEIT
  year INTEGER NOT NULL,
  days_before NUMERIC(5,2),
  days_after NUMERIC(5,2),
  adjustment_amount NUMERIC(5,2),
  reason TEXT,
  performed_by UUID NOT NULL REFERENCES employee_master(id),
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_backdated BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_allocation_log_employee ON leave_allocation_log(employee_id);
CREATE INDEX IF NOT EXISTS idx_allocation_log_type ON leave_allocation_log(leave_type_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_departments_updated_at ON departments;
CREATE TRIGGER update_departments_updated_at 
  BEFORE UPDATE ON departments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_org_hierarchy_updated_at ON org_hierarchy;
CREATE TRIGGER update_org_hierarchy_updated_at 
  BEFORE UPDATE ON org_hierarchy
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TRIGGER: Auto-snapshot hierarchy changes
-- ============================================================================
CREATE OR REPLACE FUNCTION snapshot_hierarchy_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Close previous history record
  UPDATE org_hierarchy_history 
  SET valid_to = CURRENT_TIMESTAMP
  WHERE employee_id = NEW.employee_id AND valid_to IS NULL;
  
  -- Insert new history record
  INSERT INTO org_hierarchy_history (
    tenant_id, employee_id, reports_to_employee_id, department_id,
    hierarchy_level, position_title, valid_from, snapshot_reason, changed_by
  ) VALUES (
    NEW.tenant_id, NEW.employee_id, NEW.reports_to_id, NEW.department_id,
    NEW.hierarchy_level, NEW.position_title, CURRENT_TIMESTAMP, 
    CASE WHEN TG_OP = 'INSERT' THEN 'INITIAL' ELSE 'MANUAL_CHANGE' END,
    NEW.created_by
  );
  
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS snapshot_hierarchy_on_change ON org_hierarchy;
CREATE TRIGGER snapshot_hierarchy_on_change
  AFTER INSERT OR UPDATE ON org_hierarchy
  FOR EACH ROW EXECUTE FUNCTION snapshot_hierarchy_change();

-- ============================================================================
-- SEED: Default Hierarchy Levels
-- ============================================================================
INSERT INTO hierarchy_levels (tenant_id, level_number, level_name, description)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 1, 'Executive', 'C-Level / Directors'),
  ('11111111-1111-1111-1111-111111111111', 2, 'Senior Manager', 'Department Heads'),
  ('11111111-1111-1111-1111-111111111111', 3, 'Manager', 'Team Leads'),
  ('11111111-1111-1111-1111-111111111111', 4, 'Supervisor', 'Supervisors'),
  ('11111111-1111-1111-1111-111111111111', 5, 'Senior Staff', 'Senior Individual Contributors'),
  ('11111111-1111-1111-1111-111111111111', 6, 'Staff', 'Individual Contributors'),
  ('11111111-1111-1111-1111-111111111111', 99, 'Unassigned', 'Not yet placed in hierarchy')
ON CONFLICT (tenant_id, level_number) DO NOTHING;

-- ============================================================================
-- SEED: Default Departments
-- ============================================================================
INSERT INTO departments (tenant_id, code, name, description, sort_order)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'EXEC', 'Executive Office', 'C-Suite and Directors', 1),
  ('11111111-1111-1111-1111-111111111111', 'HR', 'Human Resources', 'HR and Administration', 2),
  ('11111111-1111-1111-1111-111111111111', 'FIN', 'Finance', 'Finance and Accounting', 3),
  ('11111111-1111-1111-1111-111111111111', 'OPS', 'Operations', 'Operations and Production', 4),
  ('11111111-1111-1111-1111-111111111111', 'SALES', 'Sales', 'Sales and Business Development', 5),
  ('11111111-1111-1111-1111-111111111111', 'IT', 'Information Technology', 'IT and Engineering', 6)
ON CONFLICT (tenant_id, code) DO NOTHING;

-- ============================================================================
-- SEED: Default Approval Flows (Manager-Only for most types)
-- ============================================================================
INSERT INTO leave_approval_flow_master (
  tenant_id, leave_type_id, flow_name, step_order, approver_type, is_required
)
SELECT 
  t.tenant_id,
  t.id,
  t.name || ' Approval',
  1,
  'DIRECT_SUPERVISOR',
  true
FROM leave_type_master t
WHERE t.tenant_id = '11111111-1111-1111-1111-111111111111'
ON CONFLICT (leave_type_id, step_order) DO NOTHING;

-- For Unpaid Leave: Add HR approval as step 2
INSERT INTO leave_approval_flow_master (
  tenant_id, leave_type_id, flow_name, step_order, approver_type, is_required
)
SELECT 
  t.tenant_id,
  t.id,
  'HR Review',
  2,
  'HR_ADMIN',
  true
FROM leave_type_master t
WHERE t.code = 'UNPAID' AND t.tenant_id = '11111111-1111-1111-1111-111111111111'
ON CONFLICT (leave_type_id, step_order) DO NOTHING;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
