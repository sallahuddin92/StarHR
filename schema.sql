-- ============================================================================
-- Enterprise HR Portal - Production Schema
-- Database: PostgreSQL with Supabase
-- Date: 2025-12-19
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE approval_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'withdrawn'
);

CREATE TYPE epf_status AS ENUM (
  'Mandatory',
  'Voluntary'
);

CREATE TYPE ewa_request_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'cancelled',
  'processed'
);

CREATE TYPE payroll_status AS ENUM (
  'draft',
  'locked',
  'processed',
  'paid',
  'cancelled'
);

-- ============================================================================
-- TENANTS & ORGANIZATION
-- ============================================================================

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  address JSONB,
  industry VARCHAR(100),
  employee_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tenants_slug ON tenants(slug);

-- ============================================================================
-- EMPLOYEE MASTER
-- ============================================================================

CREATE TABLE employee_master (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id VARCHAR(50) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  nric BYTEA,
  phone_number VARCHAR(20),
  department VARCHAR(100),
  designation VARCHAR(100),
  employment_type VARCHAR(50),
  date_of_joining DATE,
  date_of_birth DATE,
  epf_status epf_status DEFAULT 'Mandatory',
  epf_member_number VARCHAR(50),
  approval_chain UUID[] DEFAULT ARRAY[]::UUID[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT employee_unique_per_tenant UNIQUE(tenant_id, employee_id)
);

CREATE INDEX idx_employee_tenant_id ON employee_master(tenant_id);
CREATE INDEX idx_employee_email ON employee_master(email);
CREATE INDEX idx_employee_phone_number ON employee_master(phone_number);
CREATE INDEX idx_employee_is_active ON employee_master(is_active);
CREATE INDEX idx_employee_approval_chain ON employee_master USING GIN(approval_chain);

-- ============================================================================
-- SALARY CONFIGURATION
-- ============================================================================

CREATE TABLE salary_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employee_master(id) ON DELETE CASCADE,
  basic_salary NUMERIC(12, 2) NOT NULL DEFAULT 0,
  daily_rate NUMERIC(12, 2),
  hourly_rate NUMERIC(12, 2),
  marital_status VARCHAR(20) DEFAULT 'single',
  children INTEGER DEFAULT 0,
  is_foreigner BOOLEAN DEFAULT false,
  tax_category VARCHAR(2) DEFAULT 'B',
  ot_rate_multiplier NUMERIC(5, 2) DEFAULT 1.5,
  monthly_ewa_limit NUMERIC(12, 2) DEFAULT 5000,
  is_active BOOLEAN DEFAULT true,
  effective_date DATE NOT NULL,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT salary_config_unique_employee UNIQUE(employee_id, effective_date)
);

CREATE INDEX idx_salary_config_tenant_id ON salary_config(tenant_id);
CREATE INDEX idx_salary_config_employee_id ON salary_config(employee_id);
CREATE INDEX idx_salary_config_is_active ON salary_config(is_active);

-- ============================================================================
-- ATTENDANCE LEDGER
-- ============================================================================

CREATE TABLE attendance_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employee_master(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  raw_clock_in TIMESTAMP WITH TIME ZONE,
  verified_clock_in TIMESTAMP WITH TIME ZONE,
  raw_clock_out TIMESTAMP WITH TIME ZONE,
  verified_clock_out TIMESTAMP WITH TIME ZONE,
  working_hours NUMERIC(5, 2),
  ot_requested_hours NUMERIC(5, 2),
  ot_approved_hours NUMERIC(5, 2),
  ot_approval_status approval_status DEFAULT 'pending',
  remarks TEXT,
  is_manual_entry BOOLEAN DEFAULT false,
  manual_entry_by UUID REFERENCES employee_master(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_attendance_tenant_id ON attendance_ledger(tenant_id);
CREATE INDEX idx_attendance_employee_id ON attendance_ledger(employee_id);
CREATE INDEX idx_attendance_date ON attendance_ledger(attendance_date);
CREATE INDEX idx_attendance_employee_date ON attendance_ledger(employee_id, attendance_date);
CREATE INDEX idx_attendance_ot_status ON attendance_ledger(ot_approval_status);

-- ============================================================================
-- EARNED WAGE ACCESS (EWA)
-- ============================================================================

CREATE TABLE ewa_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employee_master(id) ON DELETE CASCADE,
  request_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  requested_amount NUMERIC(12, 2) NOT NULL,
  approved_amount NUMERIC(12, 2),
  safe_limit_snapshot NUMERIC(12, 2) NOT NULL,
  monthly_limit NUMERIC(12, 2) NOT NULL,
  ytd_amount_withdrawn NUMERIC(12, 2),
  status ewa_request_status DEFAULT 'pending',
  approval_date TIMESTAMP WITH TIME ZONE,
  processing_date TIMESTAMP WITH TIME ZONE,
  rejected_reason TEXT,
  settlement_date TIMESTAMP WITH TIME ZONE,
  settlement_method VARCHAR(50),
  transaction_reference VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ewa_tenant_id ON ewa_transactions(tenant_id);
CREATE INDEX idx_ewa_employee_id ON ewa_transactions(employee_id);
CREATE INDEX idx_ewa_request_date ON ewa_transactions(request_date);
CREATE INDEX idx_ewa_status ON ewa_transactions(status);

-- ============================================================================
-- PAYROLL ENGINE
-- ============================================================================

CREATE TABLE payroll_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  payroll_month DATE NOT NULL,
  run_date TIMESTAMP WITH TIME ZONE NOT NULL,
  basic_start_date DATE NOT NULL,
  basic_end_date DATE NOT NULL,
  ot_start_date DATE NOT NULL,
  ot_end_date DATE NOT NULL,
  status payroll_status DEFAULT 'draft',
  processed_by UUID REFERENCES employee_master(id),
  processed_date TIMESTAMP WITH TIME ZONE,
  total_employees INTEGER,
  total_gross_amount NUMERIC(15, 2),
  total_deductions NUMERIC(15, 2),
  total_net_amount NUMERIC(15, 2),
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT payroll_unique_per_tenant UNIQUE(tenant_id, payroll_month)
);

CREATE INDEX idx_payroll_runs_tenant_id ON payroll_runs(tenant_id);
CREATE INDEX idx_payroll_runs_month ON payroll_runs(payroll_month);
CREATE INDEX idx_payroll_runs_status ON payroll_runs(status);

CREATE TABLE payroll_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employee_master(id) ON DELETE CASCADE,
  basic_salary NUMERIC(12, 2) NOT NULL DEFAULT 0,
  allowances NUMERIC(12, 2) DEFAULT 0,
  overtime_hours NUMERIC(5, 2) DEFAULT 0,
  overtime_amount NUMERIC(12, 2) DEFAULT 0,
  bonus NUMERIC(12, 2) DEFAULT 0,
  other_earnings NUMERIC(12, 2) DEFAULT 0,
  gross_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  epf_employee NUMERIC(12, 2) DEFAULT 0,
  socso NUMERIC(12, 2) DEFAULT 0,
  pcb_tax NUMERIC(12, 2) DEFAULT 0,
  ewa_deductions NUMERIC(12, 2) DEFAULT 0,
  loan_deductions NUMERIC(12, 2) DEFAULT 0,
  other_deductions NUMERIC(12, 2) DEFAULT 0,
  total_deductions NUMERIC(12, 2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  payment_status VARCHAR(50) DEFAULT 'pending',
  payment_date TIMESTAMP WITH TIME ZONE,
  payment_method VARCHAR(50),
  bank_reference VARCHAR(100),
  calculated_by UUID REFERENCES employee_master(id),
  calculated_date TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES employee_master(id),
  approved_date TIMESTAMP WITH TIME ZONE,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payroll_items_tenant_id ON payroll_items(tenant_id);
CREATE INDEX idx_payroll_items_payroll_run_id ON payroll_items(payroll_run_id);
CREATE INDEX idx_payroll_items_employee_id ON payroll_items(employee_id);

-- ============================================================================
-- STATUTORY CONFIGURATION
-- ============================================================================

CREATE TABLE statutory_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  config_name VARCHAR(100) NOT NULL,
  version VARCHAR(20) DEFAULT '1.0',
  effective_date DATE NOT NULL,
  end_date DATE,
  pcb_tax_table JSONB,
  epf_rules JSONB,
  socso_rates JSONB,
  other_rules JSONB,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT statutory_unique_per_tenant UNIQUE(tenant_id, config_name)
);

CREATE INDEX idx_statutory_config_tenant_id ON statutory_config(tenant_id);
CREATE INDEX idx_statutory_config_effective_date ON statutory_config(effective_date);

-- ============================================================================
-- AUDIT & LOGGING
-- ============================================================================

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  old_values JSONB,
  new_values JSONB,
  performed_by UUID REFERENCES employee_master(id),
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_log_tenant_id ON audit_log(tenant_id);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_master_updated_at BEFORE UPDATE ON employee_master
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_salary_config_updated_at BEFORE UPDATE ON salary_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_ledger_updated_at BEFORE UPDATE ON attendance_ledger
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ewa_transactions_updated_at BEFORE UPDATE ON ewa_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_runs_updated_at BEFORE UPDATE ON payroll_runs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_items_updated_at BEFORE UPDATE ON payroll_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_statutory_config_updated_at BEFORE UPDATE ON statutory_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA FOR DEVELOPMENT
-- ============================================================================

INSERT INTO tenants (id, name, slug, contact_email, industry, is_active)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Demo Company Sdn Bhd',
  'demo-company',
  'admin@democompany.com',
  'Technology',
  true
);

INSERT INTO employee_master (id, tenant_id, employee_id, full_name, email, department, designation, epf_status, is_active)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'EMP001',
  'Ahmad bin Abdullah',
  'ahmad@democompany.com',
  'Engineering',
  'Software Engineer',
  'Mandatory',
  true
);

INSERT INTO salary_config (tenant_id, employee_id, basic_salary, marital_status, children, tax_category, effective_date)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  5000.00,
  'married',
  2,
  'C',
  '2025-01-01'
);

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
