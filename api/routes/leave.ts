/**
 * Leave (Cuti) API Routes
 * Dynamic, master-data-driven leave management
 *
 * All business logic reads from master tables:
 * - leave_type_master: Leave type configuration
 * - leave_entitlement_master: Dynamic entitlement rules
 * - leave_balance: Per-employee balance tracking
 * - leave_request: Leave applications
 * - leave_approval_history: Audit trail
 */

import { Router, Request, Response } from 'express';
import { query } from '../lib/db';
import { z } from 'zod';
import { AuthenticatedRequest, UserRole, requireHRAdmin } from '../middleware/auth';

export const leaveRouter = Router();

// ============================================================================
// INTERFACES
// ============================================================================

interface LeaveType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  maxDaysPerYear: number;
  carryForwardAllowed: boolean;
  maxCarryForwardDays: number;
  requiresApproval: boolean;
  requiresDocument: boolean;
  isPaid: boolean;
  minNoticeDays: number;
}

interface LeaveBalance {
  leaveTypeId: string;
  leaveTypeCode: string;
  leaveTypeName: string;
  year: number;
  allocated: number;
  taken: number;
  pending: number;
  carryForward: number;
  remaining: number;
  isPaid: boolean;
}

interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  leaveTypeId: string;
  leaveTypeCode: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  daysRequested: number;
  reason: string | null;
  status: string;
  submittedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
}

// ============================================================================
// SCHEMAS
// ============================================================================

const ApplyLeaveSchema = z.object({
  leaveTypeCode: z.string().min(1, 'Leave type is required'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  reason: z.string().optional(),
  halfDayStart: z.boolean().optional().default(false),
  halfDayEnd: z.boolean().optional().default(false),
});

const ApproveRejectSchema = z.object({
  notes: z.string().optional(),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate working days between two dates (excludes weekends)
 */
function calculateWorkingDays(
  startDate: Date,
  endDate: Date,
  halfDayStart: boolean = false,
  halfDayEnd: boolean = false
): number {
  let count = 0;
  const current = new Date(startDate);

  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // Not Sunday (0) or Saturday (6)
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  // Adjust for half days
  if (halfDayStart && count > 0) count -= 0.5;
  if (halfDayEnd && count > 0) count -= 0.5;

  return count;
}

// ============================================================================
// RULE ENGINE: Dynamic Entitlement Calculation
// Priority order (configurable via leave_rule_priority_config):
// 1. EXCEPTION - Individual employee exception
// 2. TENURE_GRADE_DEPT - Specific combination
// 3. TENURE_GRADE - Tenure + Grade
// 4. TENURE_DEPT - Tenure + Department
// 5. TENURE - Tenure only
// 6. GRADE_DEPT - Grade + Department
// 7. GRADE - Grade only
// 8. DEPT - Department only
// 9. DEFAULT - Leave type max_days_per_year
// ============================================================================

interface EntitlementCalculation {
  days: number;
  ruleType: string;
  ruleName: string;
  ruleId: string | null;
  breakdown: {
    employeeTenureMonths: number;
    employeeGrade: string | null;
    employeeDepartment: string | null;
    matchedRule: string;
    effectiveFrom: string | null;
    priority: number;
  };
}

/**
 * Calculate entitlement for an employee based on configurable rules
 * NO HARDCODED VALUES - all rules come from database
 */
async function calculateEntitlement(
  tenantId: string,
  employeeId: string,
  leaveTypeId: string,
  year: number
): Promise<EntitlementCalculation> {
  // 1. Get employee attributes (tenure, grade, department, join_date)
  const empResult = await query<{
    id: string;
    join_date: string | null;
    grade: string | null;
    department: string | null;
    designation: string | null;
  }>(
    `SELECT id, join_date, grade, department, designation 
         FROM employee_master WHERE id = $1 AND tenant_id = $2`,
    [employeeId, tenantId]
  );

  if (empResult.rows.length === 0) {
    throw new Error('Employee not found');
  }

  const employee = empResult.rows[0];
  const joinDate = employee.join_date ? new Date(employee.join_date) : new Date();
  const tenureMonths = Math.floor(
    (Date.now() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
  );

  // 2. Check for individual exception (highest priority)
  const exceptionResult = await query<{ allocated_days: number; reason: string; id: string }>(
    `SELECT allocated_days, reason, id FROM leave_entitlement_exception 
         WHERE tenant_id = $1 AND employee_id = $2 AND leave_type_id = $3 
         AND effective_year = $4 AND is_active = true`,
    [tenantId, employeeId, leaveTypeId, year]
  );

  if (exceptionResult.rows.length > 0) {
    const ex = exceptionResult.rows[0];
    return {
      days: Number(ex.allocated_days),
      ruleType: 'EXCEPTION',
      ruleName: `Individual Exception: ${ex.reason}`,
      ruleId: ex.id,
      breakdown: {
        employeeTenureMonths: tenureMonths,
        employeeGrade: employee.grade,
        employeeDepartment: employee.department,
        matchedRule: 'Individual exception override',
        effectiveFrom: null,
        priority: 10,
      },
    };
  }

  // 3. Find matching entitlement rules (ordered by priority)
  // Try each combination in priority order
  const today = new Date().toISOString().split('T')[0];

  const rulesResult = await query<{
    id: string;
    allocated_days: number;
    rule_name: string;
    priority: number;
    min_tenure_months: number;
    max_tenure_months: number | null;
    employee_grade: string | null;
    department: string | null;
    effective_from: string;
  }>(
    `SELECT id, allocated_days, rule_name, priority, 
                min_tenure_months, max_tenure_months, employee_grade, department, effective_from
         FROM leave_entitlement_master
         WHERE tenant_id = $1 
           AND leave_type_id = $2 
           AND is_active = true
           AND effective_from <= $3
           AND (effective_to IS NULL OR effective_to >= $3)
         ORDER BY priority ASC, effective_from DESC`,
    [tenantId, leaveTypeId, today]
  );

  // Score each rule based on how well it matches the employee
  let bestMatch: { rule: (typeof rulesResult.rows)[0]; score: number; ruleType: string } | null =
    null;

  for (const rule of rulesResult.rows) {
    let score = 0;
    let ruleType = 'DEFAULT';
    let matches = true;

    // Check tenure match
    const tenureMatches =
      tenureMonths >= rule.min_tenure_months &&
      (rule.max_tenure_months === null || tenureMonths < rule.max_tenure_months);

    // Check grade match
    const gradeMatches = !rule.employee_grade || rule.employee_grade === employee.grade;

    // Check department match
    const deptMatches = !rule.department || rule.department === employee.department;

    // Must match all specified criteria
    if (rule.min_tenure_months !== null && rule.min_tenure_months > 0 && !tenureMatches)
      matches = false;
    if (rule.employee_grade && !gradeMatches) matches = false;
    if (rule.department && !deptMatches) matches = false;

    if (!matches) continue;

    // Calculate match score (more specific = higher score)
    if (tenureMatches && rule.min_tenure_months > 0) {
      score += 100;
      ruleType = 'TENURE';
    }
    if (gradeMatches && rule.employee_grade) {
      score += 50;
      ruleType = score > 50 ? 'TENURE_GRADE' : 'GRADE';
    }
    if (deptMatches && rule.department) {
      score += 25;
      if (ruleType === 'TENURE_GRADE') ruleType = 'TENURE_GRADE_DEPT';
      else if (ruleType === 'TENURE') ruleType = 'TENURE_DEPT';
      else if (ruleType === 'GRADE') ruleType = 'GRADE_DEPT';
      else ruleType = 'DEPT';
    }

    // Use priority from database, but prefer more specific matches
    const effectivePriority = rule.priority - score;

    if (!bestMatch || effectivePriority < bestMatch.score) {
      bestMatch = { rule, score: effectivePriority, ruleType };
    }
  }

  if (bestMatch) {
    return {
      days: Number(bestMatch.rule.allocated_days),
      ruleType: bestMatch.ruleType,
      ruleName: bestMatch.rule.rule_name || `${bestMatch.ruleType} Rule`,
      ruleId: bestMatch.rule.id,
      breakdown: {
        employeeTenureMonths: tenureMonths,
        employeeGrade: employee.grade,
        employeeDepartment: employee.department,
        matchedRule:
          `Tenure: ${bestMatch.rule.min_tenure_months}-${bestMatch.rule.max_tenure_months || '∞'} months` +
          (bestMatch.rule.employee_grade ? `, Grade: ${bestMatch.rule.employee_grade}` : '') +
          (bestMatch.rule.department ? `, Dept: ${bestMatch.rule.department}` : ''),
        effectiveFrom: bestMatch.rule.effective_from,
        priority: bestMatch.rule.priority,
      },
    };
  }

  // 4. Fallback to leave type default
  const leaveTypeResult = await query<{ max_days_per_year: number; name: string }>(
    `SELECT max_days_per_year, name FROM leave_type_master WHERE id = $1`,
    [leaveTypeId]
  );

  const lt = leaveTypeResult.rows[0];
  return {
    days: Number(lt?.max_days_per_year || 0),
    ruleType: 'DEFAULT',
    ruleName: `Default from ${lt?.name || 'Leave Type'}`,
    ruleId: null,
    breakdown: {
      employeeTenureMonths: tenureMonths,
      employeeGrade: employee.grade,
      employeeDepartment: employee.department,
      matchedRule: 'No specific rule matched, using leave type default',
      effectiveFrom: null,
      priority: 100,
    },
  };
}

/**
 * Get or create leave balance for current year
 * Now uses rule engine for initial allocation
 */
async function getOrCreateBalance(
  tenantId: string,
  employeeId: string,
  leaveTypeId: string,
  year: number,
  allocatedDays?: number // Optional - will calculate if not provided
): Promise<{
  id: string;
  allocated: number;
  taken: number;
  pending: number;
  carryForward: number;
}> {
  // Try to get existing balance
  const existing = await query<{
    id: string;
    allocated_days: number;
    taken_days: number;
    pending_days: number;
    carry_forward_days: number;
  }>(
    `SELECT id, allocated_days, taken_days, pending_days, carry_forward_days
     FROM leave_balance
     WHERE tenant_id = $1 AND employee_id = $2 AND leave_type_id = $3 AND year = $4`,
    [tenantId, employeeId, leaveTypeId, year]
  );

  if (existing.rowCount && existing.rowCount > 0) {
    const row = existing.rows[0];
    return {
      id: row.id,
      allocated: Number(row.allocated_days),
      taken: Number(row.taken_days),
      pending: Number(row.pending_days),
      carryForward: Number(row.carry_forward_days),
    };
  }

  // Calculate allocation if not provided
  let finalAllocation = allocatedDays;
  let entitlementSource = 'MANUAL';
  let ruleId: string | null = null;
  let breakdown: object = {};

  if (allocatedDays === undefined) {
    const calculation = await calculateEntitlement(tenantId, employeeId, leaveTypeId, year);
    finalAllocation = calculation.days;
    entitlementSource = calculation.ruleType;
    ruleId = calculation.ruleId;
    breakdown = calculation.breakdown;
  }

  // Create new balance with calculation metadata
  const insert = await query<{ id: string }>(
    `INSERT INTO leave_balance (
            tenant_id, employee_id, leave_type_id, year, allocated_days,
            entitlement_source, entitlement_rule_id, calculation_breakdown, last_recalculated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
         RETURNING id`,
    [
      tenantId,
      employeeId,
      leaveTypeId,
      year,
      finalAllocation,
      entitlementSource,
      ruleId,
      JSON.stringify(breakdown),
    ]
  );

  return {
    id: insert.rows[0].id,
    allocated: finalAllocation || 0,
    taken: 0,
    pending: 0,
    carryForward: 0,
  };
}

/**
 * Get approver from hierarchy with fallback logic
 * Returns supervisor, or fallback approver if no supervisor
 */
async function getApproverFromHierarchy(
  tenantId: string,
  employeeId: string
): Promise<{
  approverId: string | null;
  approverName: string | null;
  hierarchyLevel: number | null;
  error?: string;
}> {
  // Get employee's hierarchy info
  const hierarchyResult = await query<{
    reports_to_id: string | null;
    department_id: string | null;
    hierarchy_level: number;
    supervisor_name: string | null;
    fallback_approver_id: string | null;
    fallback_name: string | null;
  }>(
    `
        SELECT 
            h.reports_to_id,
            h.department_id,
            h.hierarchy_level,
            sup.full_name as supervisor_name,
            d.fallback_approver_id,
            fallback.full_name as fallback_name
        FROM org_hierarchy h
        LEFT JOIN employee_master sup ON h.reports_to_id = sup.id
        LEFT JOIN departments d ON h.department_id = d.id
        LEFT JOIN employee_master fallback ON d.fallback_approver_id = fallback.id
        WHERE h.employee_id = $1 AND h.tenant_id = $2
    `,
    [employeeId, tenantId]
  );

  if (hierarchyResult.rowCount === 0) {
    return {
      approverId: null,
      approverName: null,
      hierarchyLevel: null,
      error: 'No hierarchy configured for this employee',
    };
  }

  const h = hierarchyResult.rows[0];

  // Check for supervisor
  if (h.reports_to_id) {
    // Prevent self-approval
    if (h.reports_to_id === employeeId) {
      // Get next level up
      const nextLevel = await query<{ reports_to_id: string | null; full_name: string | null }>(
        `
                SELECT h.reports_to_id, sup.full_name
                FROM org_hierarchy h
                LEFT JOIN employee_master sup ON h.reports_to_id = sup.id
                WHERE h.employee_id = $1 AND h.tenant_id = $2
            `,
        [h.reports_to_id, tenantId]
      );

      if (nextLevel.rowCount && nextLevel.rows[0].reports_to_id) {
        return {
          approverId: nextLevel.rows[0].reports_to_id,
          approverName: nextLevel.rows[0].full_name,
          hierarchyLevel: h.hierarchy_level - 1,
        };
      }
    }
    return {
      approverId: h.reports_to_id,
      approverName: h.supervisor_name,
      hierarchyLevel: h.hierarchy_level - 1,
    };
  }

  // Use fallback approver if no supervisor
  if (h.fallback_approver_id && h.fallback_approver_id !== employeeId) {
    return {
      approverId: h.fallback_approver_id,
      approverName: h.fallback_name,
      hierarchyLevel: null,
    };
  }

  return {
    approverId: null,
    approverName: null,
    hierarchyLevel: null,
    error: 'No supervisor or fallback approver configured',
  };
}

/**
 * Create hierarchy snapshot for audit trail
 */
async function createHierarchySnapshot(
  tenantId: string,
  employeeId: string,
  approverId: string | null
): Promise<object> {
  const snapshot: any = {
    capturedAt: new Date().toISOString(),
    employeeId,
  };

  // Get employee's current hierarchy
  const empHierarchy = await query<{
    reports_to_id: string | null;
    department_id: string | null;
    position_title: string | null;
    hierarchy_level: number;
    dept_name: string | null;
  }>(
    `
        SELECT h.reports_to_id, h.department_id, h.position_title, h.hierarchy_level, d.name as dept_name
        FROM org_hierarchy h
        LEFT JOIN departments d ON h.department_id = d.id
        WHERE h.employee_id = $1 AND h.tenant_id = $2
    `,
    [employeeId, tenantId]
  );

  if (empHierarchy.rowCount) {
    snapshot.employee = empHierarchy.rows[0];
  }

  if (approverId) {
    const approverHierarchy = await query<{
      position_title: string | null;
      hierarchy_level: number;
      full_name: string;
    }>(
      `
            SELECT h.position_title, h.hierarchy_level, em.full_name
            FROM org_hierarchy h
            JOIN employee_master em ON h.employee_id = em.id
            WHERE h.employee_id = $1 AND h.tenant_id = $2
        `,
      [approverId, tenantId]
    );

    if (approverHierarchy.rowCount) {
      snapshot.approver = {
        id: approverId,
        ...approverHierarchy.rows[0],
      };
    }
  }

  return snapshot;
}

// ============================================================================
// GET /api/leave/types - Get leave types from master (HR Admin sees all, others see active only)
// ============================================================================

leaveRouter.get('/types', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const userRole = req.user?.role;
    if (!tenantId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // HR Admin sees all leave types (including inactive), others see only active
    const showAll = userRole === 'HR_ADMIN';
    const whereClause = showAll
      ? 'WHERE tenant_id = $1'
      : 'WHERE tenant_id = $1 AND is_active = true';

    const result = await query<{
      id: string;
      code: string;
      name: string;
      description: string | null;
      is_active: boolean;
      max_days_per_year: number;
      carry_forward_allowed: boolean;
      max_carry_forward_days: number;
      carry_forward_expiry_months: number | null;
      requires_approval: boolean;
      requires_document: boolean;
      is_paid: boolean;
      min_notice_days: number;
      max_consecutive_days: number | null;
      sort_order: number;
    }>(
      `SELECT id, code, name, description, is_active, max_days_per_year, carry_forward_allowed,
              max_carry_forward_days, carry_forward_expiry_months, requires_approval, requires_document, 
              is_paid, min_notice_days, max_consecutive_days, sort_order
       FROM leave_type_master
       ${whereClause}
       ORDER BY sort_order, name`,
      [tenantId]
    );

    // Return snake_case for frontend consistency
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Leave types GET error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// ============================================================================
// POST /api/leave/types - Create new leave type (HR Admin only)
// ============================================================================

leaveRouter.post('/types', requireHRAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    if (!tenantId || !userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const {
      code,
      name,
      description,
      is_active = true,
      max_days_per_year = 0,
      carry_forward_allowed = false,
      max_carry_forward_days = 0,
      carry_forward_expiry_months,
      requires_approval = true,
      requires_document = false,
      is_paid = true,
      min_notice_days = 0,
      max_consecutive_days,
      sort_order = 0,
    } = req.body;

    if (!code || !name) {
      return res.status(400).json({ success: false, error: 'Code and name are required' });
    }

    const result = await query(
      `INSERT INTO leave_type_master (
                tenant_id, code, name, description, is_active, max_days_per_year,
                carry_forward_allowed, max_carry_forward_days, carry_forward_expiry_months,
                requires_approval, requires_document, is_paid, min_notice_days,
                max_consecutive_days, sort_order, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING id`,
      [
        tenantId,
        code.toUpperCase(),
        name,
        description,
        is_active,
        max_days_per_year,
        carry_forward_allowed,
        max_carry_forward_days,
        carry_forward_expiry_months,
        requires_approval,
        requires_document,
        is_paid,
        min_notice_days,
        max_consecutive_days,
        sort_order,
        userId,
      ]
    );

    return res
      .status(201)
      .json({ success: true, data: { id: result.rows[0].id }, message: 'Leave type created' });
  } catch (err: any) {
    console.error('Leave type POST error:', err);
    if (err.code === '23505') {
      // Unique violation
      return res.status(400).json({ success: false, error: 'Leave type code already exists' });
    }
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// ============================================================================
// PUT /api/leave/types/:id - Update leave type (HR Admin only)
// ============================================================================

leaveRouter.put('/types/:id', requireHRAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    const { id } = req.params;
    if (!tenantId || !userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const fields = [
      'code',
      'name',
      'description',
      'is_active',
      'max_days_per_year',
      'carry_forward_allowed',
      'max_carry_forward_days',
      'carry_forward_expiry_months',
      'requires_approval',
      'requires_document',
      'is_paid',
      'min_notice_days',
      'max_consecutive_days',
      'sort_order',
    ];

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(field === 'code' ? req.body[field]?.toUpperCase() : req.body[field]);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    updates.push(`updated_by = $${paramIndex}`, `updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);
    paramIndex++;

    values.push(id, tenantId);

    await query(
      `UPDATE leave_type_master SET ${updates.join(', ')} WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}`,
      values
    );

    return res.json({ success: true, message: 'Leave type updated' });
  } catch (err: any) {
    console.error('Leave type PUT error:', err);
    if (err.code === '23505') {
      return res.status(400).json({ success: false, error: 'Leave type code already exists' });
    }
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// ============================================================================
// DELETE /api/leave/types/:id - Delete leave type (HR Admin only)
// ============================================================================

leaveRouter.delete(
  '/types/:id',
  requireHRAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      const { id } = req.params;
      if (!tenantId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      // Check if leave type is in use
      const usageCheck = await query(
        `SELECT COUNT(*) as count FROM leave_request WHERE leave_type_id = $1`,
        [id]
      );

      if (parseInt(usageCheck.rows[0].count) > 0) {
        // Soft delete - just deactivate
        await query(
          `UPDATE leave_type_master SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND tenant_id = $2`,
          [id, tenantId]
        );
        return res.json({
          success: true,
          message: 'Leave type deactivated (in use by existing requests)',
        });
      }

      // Hard delete if not in use
      await query(`DELETE FROM leave_type_master WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);

      return res.json({ success: true, message: 'Leave type deleted' });
    } catch (err) {
      console.error('Leave type DELETE error:', err);
      return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }
);

// ============================================================================
// GET /api/leave/admin/balances - Get all employee balances (HR Admin only)
// ============================================================================

leaveRouter.get(
  '/admin/balances',
  requireHRAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const year = parseInt(req.query.year as string) || new Date().getFullYear();

      const result = await query<{
        id: string;
        employee_id: string;
        employee_name: string;
        employee_code: string;
        department: string;
        leave_type_id: string;
        leave_type_code: string;
        leave_type_name: string;
        year: number;
        allocated_days: number;
        taken_days: number;
        pending_days: number;
        carry_forward_days: number;
      }>(
        `SELECT lb.id, lb.employee_id, em.full_name as employee_name, em.employee_id as employee_code,
                    em.department, lb.leave_type_id, lt.code as leave_type_code, lt.name as leave_type_name,
                    lb.year, lb.allocated_days, lb.taken_days, lb.pending_days, lb.carry_forward_days
             FROM leave_balance lb
             JOIN employee_master em ON em.id = lb.employee_id
             JOIN leave_type_master lt ON lt.id = lb.leave_type_id
             WHERE lb.tenant_id = $1 AND lb.year = $2
             ORDER BY em.full_name, lt.sort_order`,
        [tenantId, year]
      );

      return res.json({ success: true, data: result.rows, year });
    } catch (err) {
      console.error('Admin balances GET error:', err);
      return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }
);

// ============================================================================
// PUT /api/leave/admin/balances/:id - Update specific balance (HR Admin only)
// ============================================================================

leaveRouter.put(
  '/admin/balances/:id',
  requireHRAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      const { id } = req.params;
      const { allocated_days, carry_forward_days } = req.body;

      if (!tenantId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (allocated_days !== undefined) {
        updates.push(`allocated_days = $${paramIndex++}`);
        values.push(allocated_days);
      }
      if (carry_forward_days !== undefined) {
        updates.push(`carry_forward_days = $${paramIndex++}`);
        values.push(carry_forward_days);
      }

      if (updates.length === 0) {
        return res.status(400).json({ success: false, error: 'No fields to update' });
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id, tenantId);

      await query(
        `UPDATE leave_balance SET ${updates.join(', ')} WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}`,
        values
      );

      return res.json({ success: true, message: 'Balance updated' });
    } catch (err) {
      console.error('Admin balance PUT error:', err);
      return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }
);

// ============================================================================
// POST /api/leave/admin/bulk-allocate - Bulk allocate leave (HR Admin only)
// ============================================================================

leaveRouter.post(
  '/admin/bulk-allocate',
  requireHRAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { leave_type_id, department, days, year } = req.body;

      if (!leave_type_id || days === undefined || !year) {
        return res
          .status(400)
          .json({ success: false, error: 'leave_type_id, days, and year are required' });
      }

      // Get employees to allocate to
      let employeeQuery = `SELECT id FROM employee_master WHERE tenant_id = $1 AND status = 'ACTIVE'`;
      const params: any[] = [tenantId];

      if (department) {
        employeeQuery += ` AND department = $2`;
        params.push(department);
      }

      const employees = await query<{ id: string }>(employeeQuery, params);

      let created = 0;
      let updated = 0;

      for (const emp of employees.rows) {
        // Upsert balance
        const result = await query(
          `INSERT INTO leave_balance (tenant_id, employee_id, leave_type_id, year, allocated_days)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (employee_id, leave_type_id, year)
                 DO UPDATE SET allocated_days = leave_balance.allocated_days + EXCLUDED.allocated_days, updated_at = CURRENT_TIMESTAMP
                 RETURNING (xmax = 0) as inserted`,
          [tenantId, emp.id, leave_type_id, year, days]
        );

        if (result.rows[0]?.inserted) {
          created++;
        } else {
          updated++;
        }
      }

      return res.json({
        success: true,
        message: `Allocated ${days} days to ${employees.rows.length} employees`,
        created,
        updated,
      });
    } catch (err) {
      console.error('Bulk allocate error:', err);
      return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }
);

// ============================================================================
// GET /api/leave/admin/all-requests - Get all leave requests (HR Admin only)
// ============================================================================

leaveRouter.get(
  '/admin/all-requests',
  requireHRAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const result = await query<{
        id: string;
        employee_id: string;
        employee_name: string;
        employee_code: string;
        department: string;
        leave_type_id: string;
        leave_type_code: string;
        leave_type_name: string;
        start_date: string;
        end_date: string;
        days_requested: number;
        reason: string;
        status: string;
        submitted_at: string;
        current_approver_id: string | null;
        current_approver_name: string | null;
      }>(
        `SELECT lr.id, lr.employee_id, em.full_name as employee_name, em.employee_id as employee_code,
                    em.department, lr.leave_type_id, lt.code as leave_type_code, lt.name as leave_type_name,
                    lr.start_date, lr.end_date, lr.days_requested, lr.reason, lr.status, lr.submitted_at,
                    lr.current_approver_id, approver.full_name as current_approver_name
             FROM leave_request lr
             JOIN employee_master em ON em.id = lr.employee_id
             JOIN leave_type_master lt ON lt.id = lr.leave_type_id
             LEFT JOIN employee_master approver ON approver.id = lr.current_approver_id
             WHERE lr.tenant_id = $1
             ORDER BY lr.submitted_at DESC
             LIMIT 200`,
        [tenantId]
      );

      // Calculate pending days
      const data = result.rows.map(r => ({
        ...r,
        pending_since_days:
          r.status === 'PENDING'
            ? Math.floor((Date.now() - new Date(r.submitted_at).getTime()) / (1000 * 60 * 60 * 24))
            : 0,
      }));

      return res.json({ success: true, data });
    } catch (err) {
      console.error('Admin all-requests GET error:', err);
      return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }
);

// ============================================================================
// POST /api/leave/admin/override/:id - Override a pending request (HR Admin only)
// ============================================================================

leaveRouter.post(
  '/admin/override/:id',
  requireHRAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.userId;
      const { id } = req.params;
      const { action, justification } = req.body;

      if (!tenantId || !userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      if (!action || !['approve', 'reject'].includes(action)) {
        return res
          .status(400)
          .json({ success: false, error: 'Invalid action. Use "approve" or "reject"' });
      }

      if (!justification || !justification.trim()) {
        return res
          .status(400)
          .json({ success: false, error: 'Justification is required for override actions' });
      }

      // Get the request
      const requestResult = await query<{
        employee_id: string;
        days_requested: number;
        leave_type_id: string;
        status: string;
      }>(
        `SELECT employee_id, days_requested, leave_type_id, status FROM leave_request WHERE id = $1 AND tenant_id = $2`,
        [id, tenantId]
      );

      if (requestResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Request not found' });
      }

      const request = requestResult.rows[0];
      if (request.status !== 'PENDING') {
        return res
          .status(400)
          .json({ success: false, error: 'Only pending requests can be overridden' });
      }

      const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';
      const currentYear = new Date().getFullYear();

      // Update request status
      await query(
        `UPDATE leave_request SET status = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP, 
             approval_notes = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
        [newStatus, userId, `[HR ADMIN OVERRIDE] ${justification}`, id]
      );

      // If approved, update balance
      if (action === 'approve') {
        await query(
          `UPDATE leave_balance SET taken_days = taken_days + $1, pending_days = GREATEST(0, pending_days - $1), 
                 updated_at = CURRENT_TIMESTAMP
                 WHERE employee_id = $2 AND leave_type_id = $3 AND year = $4`,
          [request.days_requested, request.employee_id, request.leave_type_id, currentYear]
        );
      } else {
        // If rejected, reduce pending days
        await query(
          `UPDATE leave_balance SET pending_days = GREATEST(0, pending_days - $1), updated_at = CURRENT_TIMESTAMP
                 WHERE employee_id = $2 AND leave_type_id = $3 AND year = $4`,
          [request.days_requested, request.employee_id, request.leave_type_id, currentYear]
        );
      }

      // Log to approval history
      await query(
        `INSERT INTO leave_approval_history (tenant_id, leave_request_id, approver_id, action, notes)
             VALUES ($1, $2, $3, $4, $5)`,
        [tenantId, id, userId, newStatus, `[HR ADMIN OVERRIDE] ${justification}`]
      );

      return res.json({ success: true, message: `Request ${action}d successfully (override)` });
    } catch (err) {
      console.error('Admin override POST error:', err);
      return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }
);

// ============================================================================
// GET /api/leave/admin/audit-logs - Get leave approval audit logs (HR Admin only)
// ============================================================================

leaveRouter.get(
  '/admin/audit-logs',
  requireHRAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const limit = parseInt(req.query.limit as string) || 200;
      const from = req.query.from as string;
      const to = req.query.to as string;

      let dateFilter = '';
      const params: any[] = [tenantId];
      let paramIndex = 2;

      if (from) {
        dateFilter += ` AND lah.created_at >= $${paramIndex}`;
        params.push(from);
        paramIndex++;
      }
      if (to) {
        dateFilter += ` AND lah.created_at <= $${paramIndex}::date + interval '1 day'`;
        params.push(to);
        paramIndex++;
      }

      params.push(limit);

      const result = await query<{
        id: string;
        action: string;
        performed_by_name: string;
        performed_by_id: string;
        target_employee_name: string | null;
        target_employee_id: string | null;
        request_id: string;
        leave_type: string | null;
        notes: string | null;
        created_at: string;
      }>(
        `SELECT lah.id, lah.action, approver.full_name as performed_by_name, lah.approver_id as performed_by_id,
                    requester.full_name as target_employee_name, lr.employee_id as target_employee_id,
                    lah.leave_request_id as request_id, lt.name as leave_type, lah.notes, lah.created_at
             FROM leave_approval_history lah
             JOIN employee_master approver ON approver.id = lah.approver_id
             LEFT JOIN leave_request lr ON lr.id = lah.leave_request_id
             LEFT JOIN employee_master requester ON requester.id = lr.employee_id
             LEFT JOIN leave_type_master lt ON lt.id = lr.leave_type_id
             WHERE lah.tenant_id = $1 ${dateFilter}
             ORDER BY lah.created_at DESC
             LIMIT $${paramIndex}`,
        params
      );

      return res.json({ success: true, data: result.rows });
    } catch (err) {
      console.error('Audit logs GET error:', err);
      return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }
);

// ============================================================================
// ENTITLEMENT RULES MANAGEMENT (HR Admin)
// ============================================================================

// GET /api/leave/admin/entitlement-rules - Get all entitlement rules
leaveRouter.get(
  '/admin/entitlement-rules',
  requireHRAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const result = await query(
        `SELECT lem.*, lt.code as leave_type_code, lt.name as leave_type_name
             FROM leave_entitlement_master lem
             JOIN leave_type_master lt ON lt.id = lem.leave_type_id
             WHERE lem.tenant_id = $1
             ORDER BY lt.sort_order, lem.priority, lem.min_tenure_months`,
        [tenantId]
      );

      return res.json({ success: true, data: result.rows });
    } catch (err) {
      console.error('Entitlement rules GET error:', err);
      return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }
);

// POST /api/leave/admin/entitlement-rules - Create entitlement rule
leaveRouter.post(
  '/admin/entitlement-rules',
  requireHRAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.userId;
      if (!tenantId || !userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const {
        leave_type_id,
        rule_name,
        rule_description,
        employee_grade,
        department,
        designation,
        min_tenure_months = 0,
        max_tenure_months,
        allocated_days,
        effective_from,
        effective_to,
        priority = 100,
        change_reason,
      } = req.body;

      if (!leave_type_id || allocated_days === undefined || !effective_from) {
        return res
          .status(400)
          .json({
            success: false,
            error: 'leave_type_id, allocated_days, and effective_from are required',
          });
      }

      const result = await query(
        `INSERT INTO leave_entitlement_master (
                tenant_id, leave_type_id, rule_name, rule_description, employee_grade, department, designation,
                min_tenure_months, max_tenure_months, allocated_days, effective_from, effective_to,
                priority, change_reason, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING id`,
        [
          tenantId,
          leave_type_id,
          rule_name,
          rule_description,
          employee_grade,
          department,
          designation,
          min_tenure_months,
          max_tenure_months,
          allocated_days,
          effective_from,
          effective_to,
          priority,
          change_reason,
          userId,
        ]
      );

      // Log to history
      await query(
        `INSERT INTO leave_entitlement_history (tenant_id, entitlement_id, action, changed_by, new_values, change_reason)
             VALUES ($1, $2, 'CREATE', $3, $4, $5)`,
        [tenantId, result.rows[0].id, userId, JSON.stringify(req.body), change_reason]
      );

      return res
        .status(201)
        .json({ success: true, data: { id: result.rows[0].id }, message: 'Rule created' });
    } catch (err) {
      console.error('Entitlement rule POST error:', err);
      return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }
);

// PUT /api/leave/admin/entitlement-rules/:id - Update entitlement rule
leaveRouter.put(
  '/admin/entitlement-rules/:id',
  requireHRAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.userId;
      const { id } = req.params;
      const { change_reason } = req.body;

      if (!tenantId || !userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      // Get previous values for audit
      const previous = await query(
        `SELECT * FROM leave_entitlement_master WHERE id = $1 AND tenant_id = $2`,
        [id, tenantId]
      );
      if (previous.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Rule not found' });
      }

      const fields = [
        'rule_name',
        'rule_description',
        'employee_grade',
        'department',
        'designation',
        'min_tenure_months',
        'max_tenure_months',
        'allocated_days',
        'effective_from',
        'effective_to',
        'priority',
        'is_active',
      ];
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      for (const field of fields) {
        if (req.body[field] !== undefined) {
          updates.push(`${field} = $${paramIndex++}`);
          values.push(req.body[field]);
        }
      }

      if (updates.length === 0) {
        return res.status(400).json({ success: false, error: 'No fields to update' });
      }

      updates.push(
        `updated_by = $${paramIndex++}`,
        `updated_at = CURRENT_TIMESTAMP`,
        `change_reason = $${paramIndex++}`
      );
      values.push(userId, change_reason);
      values.push(id, tenantId);

      await query(
        `UPDATE leave_entitlement_master SET ${updates.join(', ')} WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}`,
        values
      );

      // Log to history
      await query(
        `INSERT INTO leave_entitlement_history (tenant_id, entitlement_id, action, changed_by, previous_values, new_values, change_reason)
             VALUES ($1, $2, 'UPDATE', $3, $4, $5, $6)`,
        [
          tenantId,
          id,
          userId,
          JSON.stringify(previous.rows[0]),
          JSON.stringify(req.body),
          change_reason,
        ]
      );

      return res.json({ success: true, message: 'Rule updated' });
    } catch (err) {
      console.error('Entitlement rule PUT error:', err);
      return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }
);

// DELETE /api/leave/admin/entitlement-rules/:id - Deactivate rule (soft delete)
leaveRouter.delete(
  '/admin/entitlement-rules/:id',
  requireHRAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.userId;
      const { id } = req.params;

      if (!tenantId || !userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      await query(
        `UPDATE leave_entitlement_master SET is_active = false, updated_by = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND tenant_id = $3`,
        [userId, id, tenantId]
      );

      await query(
        `INSERT INTO leave_entitlement_history (tenant_id, entitlement_id, action, changed_by, change_reason)
             VALUES ($1, $2, 'DEACTIVATE', $3, 'Rule deactivated')`,
        [tenantId, id, userId]
      );

      return res.json({ success: true, message: 'Rule deactivated' });
    } catch (err) {
      console.error('Entitlement rule DELETE error:', err);
      return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }
);

// ============================================================================
// INDIVIDUAL EXCEPTIONS MANAGEMENT (HR Admin)
// ============================================================================

// GET /api/leave/admin/exceptions - Get all exceptions
leaveRouter.get(
  '/admin/exceptions',
  requireHRAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const result = await query(
        `SELECT lee.*, em.full_name as employee_name, em.employee_id as employee_code,
                    lt.code as leave_type_code, lt.name as leave_type_name,
                    approver.full_name as approved_by_name
             FROM leave_entitlement_exception lee
             JOIN employee_master em ON em.id = lee.employee_id
             JOIN leave_type_master lt ON lt.id = lee.leave_type_id
             LEFT JOIN employee_master approver ON approver.id = lee.approved_by
             WHERE lee.tenant_id = $1
             ORDER BY lee.effective_year DESC, em.full_name`,
        [tenantId]
      );

      return res.json({ success: true, data: result.rows });
    } catch (err) {
      console.error('Exceptions GET error:', err);
      return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }
);

// POST /api/leave/admin/exceptions - Create individual exception
leaveRouter.post(
  '/admin/exceptions',
  requireHRAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.userId;
      if (!tenantId || !userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { employee_id, leave_type_id, allocated_days, reason, effective_year } = req.body;

      if (
        !employee_id ||
        !leave_type_id ||
        allocated_days === undefined ||
        !reason ||
        !effective_year
      ) {
        return res.status(400).json({ success: false, error: 'All fields are required' });
      }

      const result = await query(
        `INSERT INTO leave_entitlement_exception (
                tenant_id, employee_id, leave_type_id, allocated_days, reason, 
                approved_by, approved_at, effective_year, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7, $6)
            ON CONFLICT (employee_id, leave_type_id, effective_year)
            DO UPDATE SET allocated_days = EXCLUDED.allocated_days, reason = EXCLUDED.reason,
                         approved_by = EXCLUDED.approved_by, approved_at = CURRENT_TIMESTAMP, is_active = true
            RETURNING id`,
        [tenantId, employee_id, leave_type_id, allocated_days, reason, userId, effective_year]
      );

      // Log to history
      await query(
        `INSERT INTO leave_entitlement_history (tenant_id, exception_id, action, changed_by, new_values, change_reason)
             VALUES ($1, $2, 'CREATE', $3, $4, $5)`,
        [tenantId, result.rows[0].id, userId, JSON.stringify(req.body), reason]
      );

      return res
        .status(201)
        .json({ success: true, data: { id: result.rows[0].id }, message: 'Exception created' });
    } catch (err) {
      console.error('Exception POST error:', err);
      return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }
);

// DELETE /api/leave/admin/exceptions/:id - Deactivate exception
leaveRouter.delete(
  '/admin/exceptions/:id',
  requireHRAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.userId;
      const { id } = req.params;

      if (!tenantId || !userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      await query(
        `UPDATE leave_entitlement_exception SET is_active = false, updated_by = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND tenant_id = $3`,
        [userId, id, tenantId]
      );

      await query(
        `INSERT INTO leave_entitlement_history (tenant_id, exception_id, action, changed_by, change_reason)
             VALUES ($1, $2, 'DEACTIVATE', $3, 'Exception deactivated')`,
        [tenantId, id, userId]
      );

      return res.json({ success: true, message: 'Exception deactivated' });
    } catch (err) {
      console.error('Exception DELETE error:', err);
      return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }
);

// ============================================================================
// GET /api/leave/balance - Get current user's leave balances with calculation breakdown
// ============================================================================

leaveRouter.get('/balance', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    if (!tenantId || !userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const currentYear = new Date().getFullYear();

    // Get all active leave types
    const leaveTypesResult = await query<{
      id: string;
      code: string;
      name: string;
      max_days_per_year: number;
      is_paid: boolean;
    }>(
      `SELECT id, code, name, max_days_per_year, is_paid 
             FROM leave_type_master 
             WHERE tenant_id = $1 AND is_active = true
             ORDER BY sort_order, name`,
      [tenantId]
    );

    const balances = [];

    for (const lt of leaveTypesResult.rows) {
      // Check if balance exists
      const balanceResult = await query<{
        id: string;
        allocated_days: number;
        taken_days: number;
        pending_days: number;
        carry_forward_days: number;
        entitlement_source: string | null;
        entitlement_rule_id: string | null;
        calculation_breakdown: object | null;
      }>(
        `SELECT id, allocated_days, taken_days, pending_days, carry_forward_days,
                        entitlement_source, entitlement_rule_id, calculation_breakdown
                 FROM leave_balance 
                 WHERE tenant_id = $1 AND employee_id = $2 AND leave_type_id = $3 AND year = $4`,
        [tenantId, userId, lt.id, currentYear]
      );

      let allocated: number;
      let taken: number;
      let pending: number;
      let carryForward: number;
      let entitlementSource: string;
      let calculationBreakdown: object | null;

      if (balanceResult.rows.length > 0) {
        // Use existing balance
        const row = balanceResult.rows[0];
        allocated = Number(row.allocated_days);
        taken = Number(row.taken_days);
        pending = Number(row.pending_days);
        carryForward = Number(row.carry_forward_days);
        entitlementSource = row.entitlement_source || 'LEGACY';
        calculationBreakdown = row.calculation_breakdown;
      } else {
        // Calculate entitlement dynamically (don't create balance until leave is applied)
        const calculation = await calculateEntitlement(tenantId, userId, lt.id, currentYear);
        allocated = calculation.days;
        taken = 0;
        pending = 0;
        carryForward = 0;
        entitlementSource = calculation.ruleType;
        calculationBreakdown = {
          ...calculation.breakdown,
          ruleName: calculation.ruleName,
        };
      }

      balances.push({
        leaveTypeId: lt.id,
        leaveTypeCode: lt.code,
        leaveTypeName: lt.name,
        year: currentYear,
        allocated,
        taken,
        pending,
        carryForward,
        remaining: allocated + carryForward - taken - pending,
        isPaid: lt.is_paid,
        // Transparency: show how entitlement was calculated
        entitlementSource,
        calculationBreakdown,
      });
    }

    return res.json({ success: true, data: balances, year: currentYear });
  } catch (err) {
    console.error('Leave balance GET error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// ============================================================================
// GET /api/leave - Get current user's leave requests
// ============================================================================

leaveRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    if (!tenantId || !userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { status, year } = req.query;
    const currentYear = year ? parseInt(year as string) : new Date().getFullYear();

    let whereClause =
      'WHERE lr.tenant_id = $1 AND lr.employee_id = $2 AND EXTRACT(YEAR FROM lr.start_date) = $3';
    const params: (string | number)[] = [tenantId, userId, currentYear];

    if (status) {
      whereClause += ` AND lr.status = $4`;
      params.push(status as string);
    }

    const result = await query<{
      id: string;
      employee_id: string;
      full_name: string;
      employee_code: string;
      leave_type_id: string;
      leave_type_code: string;
      leave_type_name: string;
      start_date: string;
      end_date: string;
      days_requested: number;
      reason: string | null;
      status: string;
      submitted_at: string;
      approved_by: string | null;
      approved_at: string | null;
    }>(
      `SELECT 
        lr.id,
        lr.employee_id,
        em.full_name,
        em.employee_id as employee_code,
        lr.leave_type_id,
        lt.code as leave_type_code,
        lt.name as leave_type_name,
        lr.start_date,
        lr.end_date,
        lr.days_requested,
        lr.reason,
        lr.status,
        lr.submitted_at,
        lr.approved_by,
        lr.approved_at
       FROM leave_request lr
       JOIN employee_master em ON lr.employee_id = em.id
       JOIN leave_type_master lt ON lr.leave_type_id = lt.id
       ${whereClause}
       ORDER BY lr.submitted_at DESC`,
      params
    );

    const requests: LeaveRequest[] = result.rows.map(row => ({
      id: row.id,
      employeeId: row.employee_id,
      employeeName: row.full_name,
      employeeCode: row.employee_code,
      leaveTypeId: row.leave_type_id,
      leaveTypeCode: row.leave_type_code,
      leaveTypeName: row.leave_type_name,
      startDate: row.start_date,
      endDate: row.end_date,
      daysRequested: Number(row.days_requested),
      reason: row.reason,
      status: row.status,
      submittedAt: row.submitted_at,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at,
    }));

    return res.json({ success: true, data: requests });
  } catch (err) {
    console.error('Leave requests GET error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// ============================================================================
// POST /api/leave - Apply for leave
// ============================================================================

leaveRouter.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    if (!tenantId || !userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Validate input
    const parseResult = ApplyLeaveSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: parseResult.error.format(),
      });
    }

    const { leaveTypeCode, startDate, endDate, reason, halfDayStart, halfDayEnd } =
      parseResult.data;

    // Get leave type from master
    const leaveTypeResult = await query<{
      id: string;
      max_days_per_year: number;
      requires_approval: boolean;
      min_notice_days: number;
      max_consecutive_days: number | null;
    }>(
      `SELECT id, max_days_per_year, requires_approval, min_notice_days, max_consecutive_days
       FROM leave_type_master
       WHERE tenant_id = $1 AND code = $2 AND is_active = true`,
      [tenantId, leaveTypeCode]
    );

    if (leaveTypeResult.rowCount === 0) {
      return res.status(400).json({ success: false, error: 'Invalid leave type' });
    }

    const leaveType = leaveTypeResult.rows[0];
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Validate dates
    if (end < start) {
      return res.status(400).json({ success: false, error: 'End date must be after start date' });
    }

    // Calculate days requested
    const daysRequested = calculateWorkingDays(start, end, halfDayStart, halfDayEnd);

    if (daysRequested <= 0) {
      return res.status(400).json({ success: false, error: 'No working days in selected range' });
    }

    // Check max consecutive days
    if (leaveType.max_consecutive_days && daysRequested > leaveType.max_consecutive_days) {
      return res.status(400).json({
        success: false,
        error: `Maximum ${leaveType.max_consecutive_days} consecutive days allowed`,
      });
    }

    // Check notice days
    const today = new Date();
    const daysNotice = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysNotice < leaveType.min_notice_days) {
      return res.status(400).json({
        success: false,
        error: `Minimum ${leaveType.min_notice_days} days notice required`,
      });
    }

    // Get or create balance and check availability
    const currentYear = start.getFullYear();
    const balance = await getOrCreateBalance(
      tenantId,
      userId,
      leaveType.id,
      currentYear,
      leaveType.max_days_per_year
    );

    const available = balance.allocated + balance.carryForward - balance.taken - balance.pending;
    if (daysRequested > available) {
      return res.status(400).json({
        success: false,
        error: `Insufficient balance. Available: ${available} days, Requested: ${daysRequested} days`,
      });
    }

    // Check for overlapping leave
    const overlapResult = await query(
      `SELECT id FROM leave_request
       WHERE employee_id = $1 
         AND status IN ('pending', 'approved')
         AND (
           (start_date <= $2 AND end_date >= $2) OR
           (start_date <= $3 AND end_date >= $3) OR
           (start_date >= $2 AND end_date <= $3)
         )`,
      [userId, startDate, endDate]
    );

    if (overlapResult.rowCount && overlapResult.rowCount > 0) {
      return res
        .status(400)
        .json({ success: false, error: 'Leave dates overlap with existing request' });
    }

    // Get approver from hierarchy
    const approverInfo = await getApproverFromHierarchy(tenantId, userId);

    // Block submission if no approver configured
    if (approverInfo.error || !approverInfo.approverId) {
      return res.status(400).json({
        success: false,
        error: approverInfo.error || 'No approver configured in hierarchy. Please contact HR.',
      });
    }

    // Create hierarchy snapshot for audit
    const hierarchySnapshot = await createHierarchySnapshot(
      tenantId,
      userId,
      approverInfo.approverId
    );

    // Create leave request with hierarchy info
    const insertResult = await query<{ id: string }>(
      `
            INSERT INTO leave_request (
                tenant_id, employee_id, leave_type_id, start_date, end_date,
                days_requested, half_day_start, half_day_end, reason, status,
                current_step, total_steps, current_approver_id, hierarchy_snapshot
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', 1, 1, $10, $11)
            RETURNING id`,
      [
        tenantId,
        userId,
        leaveType.id,
        startDate,
        endDate,
        daysRequested,
        halfDayStart,
        halfDayEnd,
        reason,
        approverInfo.approverId,
        JSON.stringify(hierarchySnapshot),
      ]
    );

    const requestId = insertResult.rows[0].id;

    // Update balance pending days
    await query(
      `UPDATE leave_balance 
       SET pending_days = pending_days + $1, updated_at = NOW()
       WHERE id = $2`,
      [daysRequested, balance.id]
    );

    // Add to approval history with hierarchy info
    await query(
      `
            INSERT INTO leave_approval_history (
                leave_request_id, action, performed_by, new_status, 
                step_order, approver_role, hierarchy_snapshot_at_action
            )
            VALUES ($1, 'SUBMITTED', $2, 'pending', 1, 'EMPLOYEE', $3)`,
      [requestId, userId, JSON.stringify(hierarchySnapshot)]
    );

    return res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully',
      data: {
        id: requestId,
        daysRequested,
        status: 'pending',
        approverName: approverInfo.approverName,
      },
    });
  } catch (err) {
    console.error('Leave apply POST error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// ============================================================================
// PUT /api/leave/:id/cancel - Cancel own pending request
// ============================================================================

leaveRouter.put('/:id/cancel', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    if (!tenantId || !userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { id } = req.params;

    // Get request and verify ownership
    const requestResult = await query<{
      id: string;
      employee_id: string;
      leave_type_id: string;
      days_requested: number;
      status: string;
      start_date: string;
    }>(
      `SELECT id, employee_id, leave_type_id, days_requested, status, start_date
       FROM leave_request
       WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    if (requestResult.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Leave request not found' });
    }

    const request = requestResult.rows[0];

    if (request.employee_id !== userId) {
      return res
        .status(403)
        .json({ success: false, error: "Cannot cancel another employee's request" });
    }

    if (request.status !== 'pending') {
      return res
        .status(400)
        .json({ success: false, error: 'Only pending requests can be cancelled' });
    }

    // Update request status
    await query(`UPDATE leave_request SET status = 'withdrawn', updated_at = NOW() WHERE id = $1`, [
      id,
    ]);

    // Restore balance
    const year = new Date(request.start_date).getFullYear();
    await query(
      `UPDATE leave_balance 
       SET pending_days = pending_days - $1, updated_at = NOW()
       WHERE employee_id = $2 AND leave_type_id = $3 AND year = $4`,
      [request.days_requested, userId, request.leave_type_id, year]
    );

    // Add to history
    await query(
      `INSERT INTO leave_approval_history (leave_request_id, action, performed_by, previous_status, new_status)
       VALUES ($1, 'CANCELLED', $2, 'pending', 'withdrawn')`,
      [id, userId]
    );

    return res.json({ success: true, message: 'Leave request cancelled' });
  } catch (err) {
    console.error('Leave cancel PUT error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// ============================================================================
// GET /api/leave/pending - Get pending approvals (hierarchy-based)
// ============================================================================

leaveRouter.get('/pending', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    const role = req.user?.role;
    if (!tenantId || !userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Workers cannot view pending approvals
    if (role === 'WORKER') {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }

    // HR Admin sees all pending requests; others only see requests assigned to them
    const whereClause =
      role === 'HR_ADMIN'
        ? `lr.tenant_id = $1 AND lr.status = 'pending'`
        : `lr.tenant_id = $1 AND lr.status = 'pending' AND lr.current_approver_id = $2`;

    const params = role === 'HR_ADMIN' ? [tenantId] : [tenantId, userId];

    const result = await query<{
      id: string;
      employee_id: string;
      full_name: string;
      employee_code: string;
      department: string;
      leave_type_id: string;
      leave_type_code: string;
      leave_type_name: string;
      start_date: string;
      end_date: string;
      days_requested: number;
      reason: string | null;
      status: string;
      submitted_at: string;
      current_step: number;
      total_steps: number;
      hierarchy_snapshot: object | null;
    }>(
      `
            SELECT 
                lr.id,
                lr.employee_id,
                em.full_name,
                em.employee_id as employee_code,
                COALESCE(d.name, em.department) as department,
                lr.leave_type_id,
                lt.code as leave_type_code,
                lt.name as leave_type_name,
                lr.start_date,
                lr.end_date,
                lr.days_requested,
                lr.reason,
                lr.status,
                lr.submitted_at,
                COALESCE(lr.current_step, 1) as current_step,
                COALESCE(lr.total_steps, 1) as total_steps,
                lr.hierarchy_snapshot
            FROM leave_request lr
            JOIN employee_master em ON lr.employee_id = em.id
            JOIN leave_type_master lt ON lr.leave_type_id = lt.id
            LEFT JOIN org_hierarchy h ON em.id = h.employee_id
            LEFT JOIN departments d ON h.department_id = d.id
            WHERE ${whereClause}
            ORDER BY lr.submitted_at ASC`,
      params
    );

    const requests = result.rows.map(row => ({
      id: row.id,
      employeeId: row.employee_id,
      employeeName: row.full_name,
      employeeCode: row.employee_code,
      department: row.department,
      leaveTypeId: row.leave_type_id,
      leaveTypeCode: row.leave_type_code,
      leaveTypeName: row.leave_type_name,
      startDate: row.start_date,
      endDate: row.end_date,
      daysRequested: Number(row.days_requested),
      reason: row.reason,
      status: row.status,
      submittedAt: row.submitted_at,
      currentStep: row.current_step,
      totalSteps: row.total_steps,
      hierarchySnapshot: row.hierarchy_snapshot,
      approvedBy: null,
      approvedAt: null,
    }));

    return res.json({ success: true, data: requests, count: requests.length });
  } catch (err) {
    console.error('Leave pending GET error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// ============================================================================
// PUT /api/leave/:id/approve - Approve leave request
// ============================================================================

leaveRouter.put('/:id/approve', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    const role = req.user?.role;
    if (!tenantId || !userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (role === 'WORKER') {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }

    const { id } = req.params;
    const body = ApproveRejectSchema.safeParse(req.body);

    // Get request
    const requestResult = await query<{
      id: string;
      employee_id: string;
      leave_type_id: string;
      days_requested: number;
      status: string;
      start_date: string;
      end_date: string;
    }>(
      `SELECT id, employee_id, leave_type_id, days_requested, status, start_date, end_date
       FROM leave_request
       WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    if (requestResult.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Leave request not found' });
    }

    const request = requestResult.rows[0];

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Request is not pending' });
    }

    // Update request status
    await query(
      `UPDATE leave_request 
       SET status = 'approved', approved_by = $1, approved_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [userId, id]
    );

    // Update balance: move from pending to taken
    const year = new Date(request.start_date).getFullYear();
    await query(
      `UPDATE leave_balance 
       SET pending_days = pending_days - $1, 
           taken_days = taken_days + $1, 
           updated_at = NOW()
       WHERE employee_id = $2 AND leave_type_id = $3 AND year = $4`,
      [request.days_requested, request.employee_id, request.leave_type_id, year]
    );

    // Add attendance records for leave days
    const startDate = new Date(request.start_date);
    const endDate = new Date(request.end_date);
    const current = new Date(startDate);

    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      // Skip weekends
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        const dateStr = current.toISOString().split('T')[0];
        // Insert leave attendance record (check if not exists)
        await query(
          `INSERT INTO attendance_ledger (tenant_id, employee_id, attendance_date, remarks, is_manual_entry, manual_entry_by)
           VALUES ($1, $2, $3, 'Approved Leave', true, $4)
           ON CONFLICT DO NOTHING`,
          [tenantId, request.employee_id, dateStr, userId]
        );
      }
      current.setDate(current.getDate() + 1);
    }

    // Add to history
    await query(
      `INSERT INTO leave_approval_history (leave_request_id, action, performed_by, previous_status, new_status, notes)
       VALUES ($1, 'APPROVED', $2, 'pending', 'approved', $3)`,
      [id, userId, body.success ? body.data.notes : null]
    );

    return res.json({ success: true, message: 'Leave request approved' });
  } catch (err) {
    console.error('Leave approve PUT error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// ============================================================================
// PUT /api/leave/:id/reject - Reject leave request
// ============================================================================

leaveRouter.put('/:id/reject', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    const role = req.user?.role;
    if (!tenantId || !userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (role === 'WORKER') {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }

    const { id } = req.params;
    const body = ApproveRejectSchema.safeParse(req.body);
    const notes = body.success ? body.data.notes : undefined;

    // Get request
    const requestResult = await query<{
      id: string;
      employee_id: string;
      leave_type_id: string;
      days_requested: number;
      status: string;
      start_date: string;
    }>(
      `SELECT id, employee_id, leave_type_id, days_requested, status, start_date
       FROM leave_request
       WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    if (requestResult.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Leave request not found' });
    }

    const request = requestResult.rows[0];

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Request is not pending' });
    }

    // Update request status
    await query(
      `UPDATE leave_request 
       SET status = 'rejected', approved_by = $1, approved_at = NOW(), rejection_reason = $2, updated_at = NOW()
       WHERE id = $3`,
      [userId, notes, id]
    );

    // Restore balance (remove from pending)
    const year = new Date(request.start_date).getFullYear();
    await query(
      `UPDATE leave_balance 
       SET pending_days = pending_days - $1, updated_at = NOW()
       WHERE employee_id = $2 AND leave_type_id = $3 AND year = $4`,
      [request.days_requested, request.employee_id, request.leave_type_id, year]
    );

    // Add to history
    await query(
      `INSERT INTO leave_approval_history (leave_request_id, action, performed_by, previous_status, new_status, notes)
       VALUES ($1, 'REJECTED', $2, 'pending', 'rejected', $3)`,
      [id, userId, notes]
    );

    return res.json({ success: true, message: 'Leave request rejected' });
  } catch (err) {
    console.error('Leave reject PUT error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// ============================================================================
// REPLACEMENT LEAVE (TOIL) MODULE
// All rules and logic are configurable - NO HARDCODED VALUES
// ============================================================================

// GET /api/leave/replacement-rules - Get all TOIL rules
leaveRouter.get('/replacement-rules', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const userRole = req.user?.role;
    if (!tenantId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // HR Admin sees all, others see only active
    const activeOnly = userRole !== 'HR_ADMIN';
    const whereClause = activeOnly
      ? 'WHERE tenant_id = $1 AND is_active = true AND effective_from <= CURRENT_DATE AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)'
      : 'WHERE tenant_id = $1';

    const result = await query(
      `SELECT * FROM replacement_leave_rule ${whereClause} ORDER BY trigger_type, rule_name`,
      [tenantId]
    );

    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('TOIL rules GET error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST /api/leave/replacement-rules - Create TOIL rule (HR Admin)
leaveRouter.post(
  '/replacement-rules',
  requireHRAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.userId;
      if (!tenantId || !userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const {
        rule_code,
        rule_name,
        description,
        trigger_type,
        credit_type = 'FIXED',
        credit_days = 1,
        min_hours_required,
        max_days_per_event,
        max_days_per_month,
        max_days_per_year,
        expiry_days,
        carry_forward_allowed = false,
        max_carry_forward_days,
        eligible_departments,
        eligible_grades,
        eligible_employment_types,
        requires_approval = true,
        auto_credit_on_approval = true,
        effective_from = new Date().toISOString().split('T')[0],
        effective_to,
      } = req.body;

      if (!rule_code || !rule_name || !trigger_type) {
        return res
          .status(400)
          .json({ success: false, error: 'rule_code, rule_name, and trigger_type are required' });
      }

      const result = await query(
        `INSERT INTO replacement_leave_rule (
                tenant_id, rule_code, rule_name, description, trigger_type,
                credit_type, credit_days, min_hours_required,
                max_days_per_event, max_days_per_month, max_days_per_year,
                expiry_days, carry_forward_allowed, max_carry_forward_days,
                eligible_departments, eligible_grades, eligible_employment_types,
                requires_approval, auto_credit_on_approval, effective_from, effective_to, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
            RETURNING id`,
        [
          tenantId,
          rule_code.toUpperCase(),
          rule_name,
          description,
          trigger_type,
          credit_type,
          credit_days,
          min_hours_required,
          max_days_per_event,
          max_days_per_month,
          max_days_per_year,
          expiry_days,
          carry_forward_allowed,
          max_carry_forward_days,
          eligible_departments,
          eligible_grades,
          eligible_employment_types,
          requires_approval,
          auto_credit_on_approval,
          effective_from,
          effective_to,
          userId,
        ]
      );

      return res
        .status(201)
        .json({ success: true, data: { id: result.rows[0].id }, message: 'Rule created' });
    } catch (err: any) {
      console.error('TOIL rule POST error:', err);
      if (err.code === '23505') {
        return res.status(400).json({ success: false, error: 'Rule code already exists' });
      }
      return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }
);

// PUT /api/leave/replacement-rules/:id - Update TOIL rule (HR Admin)
leaveRouter.put(
  '/replacement-rules/:id',
  requireHRAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.userId;
      const { id } = req.params;
      if (!tenantId || !userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const fields = [
        'rule_name',
        'description',
        'trigger_type',
        'credit_type',
        'credit_days',
        'min_hours_required',
        'max_days_per_event',
        'max_days_per_month',
        'max_days_per_year',
        'expiry_days',
        'carry_forward_allowed',
        'max_carry_forward_days',
        'eligible_departments',
        'eligible_grades',
        'eligible_employment_types',
        'requires_approval',
        'auto_credit_on_approval',
        'effective_from',
        'effective_to',
        'is_active',
      ];
      const updates: string[] = [];
      const values: any[] = [];
      let idx = 1;

      for (const field of fields) {
        if (req.body[field] !== undefined) {
          updates.push(`${field} = $${idx++}`);
          values.push(req.body[field]);
        }
      }

      if (updates.length === 0) {
        return res.status(400).json({ success: false, error: 'No fields to update' });
      }

      updates.push(`updated_by = $${idx++}`, `updated_at = CURRENT_TIMESTAMP`);
      values.push(userId, id, tenantId);

      await query(
        `UPDATE replacement_leave_rule SET ${updates.join(', ')} WHERE id = $${idx} AND tenant_id = $${idx + 1}`,
        values
      );

      return res.json({ success: true, message: 'Rule updated' });
    } catch (err) {
      console.error('TOIL rule PUT error:', err);
      return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }
);

// DELETE /api/leave/replacement-rules/:id - Deactivate TOIL rule (HR Admin)
leaveRouter.delete(
  '/replacement-rules/:id',
  requireHRAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.userId;
      const { id } = req.params;
      if (!tenantId || !userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      await query(
        `UPDATE replacement_leave_rule SET is_active = false, updated_by = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND tenant_id = $3`,
        [userId, id, tenantId]
      );

      return res.json({ success: true, message: 'Rule deactivated' });
    } catch (err) {
      console.error('TOIL rule DELETE error:', err);
      return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }
);

// ============================================================================
// TOIL CREDITS MANAGEMENT
// ============================================================================

// GET /api/leave/replacement-credits - Get my TOIL credits (Employee)
leaveRouter.get('/replacement-credits', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    if (!tenantId || !userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const result = await query(
      `SELECT c.*, r.rule_name, r.trigger_type as rule_trigger_type
             FROM replacement_leave_credit c
             LEFT JOIN replacement_leave_rule r ON r.id = c.rule_id
             WHERE c.tenant_id = $1 AND c.employee_id = $2
             ORDER BY c.trigger_date DESC`,
      [tenantId, userId]
    );

    // Calculate totals
    const summary = {
      total_earned: 0,
      total_used: 0,
      total_pending: 0,
      total_expired: 0,
      total_available: 0,
    };

    for (const credit of result.rows) {
      if (credit.status === 'APPROVED') {
        summary.total_earned += Number(credit.days_credited);
        summary.total_used += Number(credit.days_used || 0);
        summary.total_available += Number(credit.days_remaining || credit.days_credited);
      } else if (credit.status === 'PENDING') {
        summary.total_pending += Number(credit.days_credited);
      } else if (credit.status === 'EXPIRED') {
        summary.total_expired += Number(credit.days_remaining || 0);
      }
    }

    return res.json({ success: true, data: result.rows, summary });
  } catch (err) {
    console.error('TOIL credits GET error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// GET /api/leave/admin/replacement-credits - Get all TOIL credits (HR Admin)
leaveRouter.get(
  '/admin/replacement-credits',
  requireHRAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { status, employee_id } = req.query;
      let whereClause = 'WHERE c.tenant_id = $1';
      const params: any[] = [tenantId];

      if (status) {
        params.push(status);
        whereClause += ` AND c.status = $${params.length}`;
      }
      if (employee_id) {
        params.push(employee_id);
        whereClause += ` AND c.employee_id = $${params.length}`;
      }

      const result = await query(
        `SELECT c.*, 
                    e.full_name as employee_name, e.employee_id as employee_code, e.department,
                    r.rule_name, r.trigger_type as rule_trigger_type,
                    approver.full_name as approved_by_name
             FROM replacement_leave_credit c
             JOIN employee_master e ON e.id = c.employee_id
             LEFT JOIN replacement_leave_rule r ON r.id = c.rule_id
             LEFT JOIN employee_master approver ON approver.id = c.approved_by
             ${whereClause}
             ORDER BY c.status = 'PENDING' DESC, c.trigger_date DESC
             LIMIT 200`,
        params
      );

      return res.json({ success: true, data: result.rows });
    } catch (err) {
      console.error('Admin TOIL credits GET error:', err);
      return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }
);

// POST /api/leave/replacement-credits - Request TOIL credit
leaveRouter.post('/replacement-credits', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    if (!tenantId || !userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const {
      employee_id, // Optional - HR can create for others
      rule_id,
      trigger_type,
      trigger_date,
      trigger_end_date,
      trigger_description,
      trigger_reference,
      hours_worked,
      days_credited, // Optional - will calculate from rule if not provided
    } = req.body;

    const targetEmployeeId = employee_id || userId;

    // Prevent non-HR from creating for others
    if (employee_id && employee_id !== userId && userRole !== 'HR_ADMIN') {
      return res
        .status(403)
        .json({ success: false, error: 'Cannot create credit for other employees' });
    }

    if (!trigger_type || !trigger_date || !trigger_description) {
      return res
        .status(400)
        .json({
          success: false,
          error: 'trigger_type, trigger_date, and trigger_description are required',
        });
    }

    // Find matching rule
    let ruleId = rule_id;
    let creditDays = days_credited;
    let expiryDate: string | null = null;

    if (!rule_id) {
      // Auto-find rule by trigger type
      const ruleResult = await query(
        `SELECT * FROM replacement_leave_rule 
                 WHERE tenant_id = $1 AND trigger_type = $2 AND is_active = true
                 AND effective_from <= $3 AND (effective_to IS NULL OR effective_to >= $3)
                 ORDER BY effective_from DESC LIMIT 1`,
        [tenantId, trigger_type, trigger_date]
      );

      if (ruleResult.rows.length > 0) {
        const rule = ruleResult.rows[0];
        ruleId = rule.id;

        // Calculate credit if not provided
        if (!creditDays) {
          if (rule.credit_type === 'FIXED') {
            creditDays = Number(rule.credit_days);
          } else if (rule.credit_type === 'RATIO' && hours_worked) {
            const hoursPerDay = Number(rule.hours_per_day) || 8;
            creditDays = (Number(hours_worked) / hoursPerDay) * Number(rule.credit_days);
          } else {
            creditDays = Number(rule.credit_days);
          }
        }

        // Apply max limits
        if (rule.max_days_per_event && creditDays > Number(rule.max_days_per_event)) {
          creditDays = Number(rule.max_days_per_event);
        }

        // Calculate expiry
        if (rule.expiry_days) {
          const expiry = new Date(trigger_date);
          expiry.setDate(expiry.getDate() + Number(rule.expiry_days));
          expiryDate = expiry.toISOString().split('T')[0];
        }
      }
    }

    if (!creditDays || creditDays <= 0) {
      creditDays = 1; // Default if no rule found
    }

    const result = await query(
      `INSERT INTO replacement_leave_credit (
                tenant_id, employee_id, rule_id, trigger_type, trigger_date, trigger_end_date,
                trigger_description, trigger_reference, hours_worked, days_credited,
                expiry_date, days_remaining, requested_by, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $10, $12, $13)
            RETURNING id`,
      [
        tenantId,
        targetEmployeeId,
        ruleId,
        trigger_type,
        trigger_date,
        trigger_end_date,
        trigger_description,
        trigger_reference,
        hours_worked,
        creditDays,
        expiryDate,
        userId,
        userRole === 'HR_ADMIN' ? 'APPROVED' : 'PENDING',
      ]
    );

    // If HR Admin creates, auto-approve
    if (userRole === 'HR_ADMIN') {
      await query(
        `UPDATE replacement_leave_credit SET approved_by = $1, approved_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [userId, result.rows[0].id]
      );

      // Log history
      await query(
        `INSERT INTO replacement_leave_credit_history (tenant_id, credit_id, action, action_by, notes, new_status)
                 VALUES ($1, $2, 'APPROVED', $3, 'Auto-approved by HR Admin', 'APPROVED')`,
        [tenantId, result.rows[0].id, userId]
      );
    } else {
      await query(
        `INSERT INTO replacement_leave_credit_history (tenant_id, credit_id, action, action_by, notes, new_status)
                 VALUES ($1, $2, 'CREATED', $3, 'Credit requested', 'PENDING')`,
        [tenantId, result.rows[0].id, userId]
      );
    }

    return res.status(201).json({
      success: true,
      data: { id: result.rows[0].id, days_credited: creditDays, expiry_date: expiryDate },
      message:
        userRole === 'HR_ADMIN' ? 'Credit approved' : 'Credit request submitted for approval',
    });
  } catch (err) {
    console.error('TOIL credit POST error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST /api/leave/replacement-credits/:id/approve - Approve TOIL credit
leaveRouter.post(
  '/replacement-credits/:id/approve',
  requireHRAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.userId;
      const { id } = req.params;
      const { notes, days_credited } = req.body; // HR can adjust days

      if (!tenantId || !userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      // Get credit details
      const creditResult = await query(
        `SELECT * FROM replacement_leave_credit WHERE id = $1 AND tenant_id = $2`,
        [id, tenantId]
      );

      if (creditResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Credit not found' });
      }

      const credit = creditResult.rows[0];
      if (credit.status !== 'PENDING') {
        return res
          .status(400)
          .json({ success: false, error: 'Only pending credits can be approved' });
      }

      // Prevent self-approval
      if (credit.employee_id === userId) {
        return res
          .status(400)
          .json({ success: false, error: 'Cannot approve your own credit request' });
      }

      const finalDays = days_credited !== undefined ? days_credited : credit.days_credited;

      await query(
        `UPDATE replacement_leave_credit 
             SET status = 'APPROVED', approved_by = $1, approved_at = CURRENT_TIMESTAMP, 
                 approval_notes = $2, days_credited = $3, days_remaining = $3, updated_at = CURRENT_TIMESTAMP
             WHERE id = $4`,
        [userId, notes, finalDays, id]
      );

      // Log history
      await query(
        `INSERT INTO replacement_leave_credit_history (tenant_id, credit_id, action, action_by, notes, previous_status, new_status, days_affected)
             VALUES ($1, $2, 'APPROVED', $3, $4, 'PENDING', 'APPROVED', $5)`,
        [tenantId, id, userId, notes, finalDays]
      );

      return res.json({ success: true, message: 'Credit approved', days_credited: finalDays });
    } catch (err) {
      console.error('TOIL credit approve error:', err);
      return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }
);

// POST /api/leave/replacement-credits/:id/reject - Reject TOIL credit
leaveRouter.post(
  '/replacement-credits/:id/reject',
  requireHRAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.userId;
      const { id } = req.params;
      const { reason } = req.body;

      if (!tenantId || !userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      if (!reason) {
        return res.status(400).json({ success: false, error: 'Rejection reason is required' });
      }

      const creditResult = await query(
        `SELECT * FROM replacement_leave_credit WHERE id = $1 AND tenant_id = $2`,
        [id, tenantId]
      );

      if (creditResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Credit not found' });
      }

      const credit = creditResult.rows[0];
      if (credit.status !== 'PENDING') {
        return res
          .status(400)
          .json({ success: false, error: 'Only pending credits can be rejected' });
      }

      await query(
        `UPDATE replacement_leave_credit 
             SET status = 'REJECTED', rejected_by = $1, rejected_at = CURRENT_TIMESTAMP, 
                 rejection_reason = $2, updated_at = CURRENT_TIMESTAMP
             WHERE id = $3`,
        [userId, reason, id]
      );

      await query(
        `INSERT INTO replacement_leave_credit_history (tenant_id, credit_id, action, action_by, notes, previous_status, new_status)
             VALUES ($1, $2, 'REJECTED', $3, $4, 'PENDING', 'REJECTED')`,
        [tenantId, id, userId, reason]
      );

      return res.json({ success: true, message: 'Credit rejected' });
    } catch (err) {
      console.error('TOIL credit reject error:', err);
      return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }
);

// GET /api/leave/replacement-balance - Get current TOIL balance
leaveRouter.get('/replacement-balance', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    if (!tenantId || !userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const result = await query(
      `SELECT 
                COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN days_credited ELSE 0 END), 0) as total_earned,
                COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN days_used ELSE 0 END), 0) as total_used,
                COALESCE(SUM(CASE WHEN status = 'APPROVED' AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE) THEN days_remaining ELSE 0 END), 0) as available,
                COALESCE(SUM(CASE WHEN status = 'PENDING' THEN days_credited ELSE 0 END), 0) as pending_approval
             FROM replacement_leave_credit
             WHERE tenant_id = $1 AND employee_id = $2`,
      [tenantId, userId]
    );

    // Get upcoming expiry
    const expiryResult = await query(
      `SELECT expiry_date, days_remaining 
             FROM replacement_leave_credit
             WHERE tenant_id = $1 AND employee_id = $2 AND status = 'APPROVED' 
             AND expiry_date IS NOT NULL AND expiry_date >= CURRENT_DATE AND days_remaining > 0
             ORDER BY expiry_date ASC LIMIT 5`,
      [tenantId, userId]
    );

    return res.json({
      success: true,
      data: {
        ...result.rows[0],
        upcoming_expiry: expiryResult.rows,
      },
    });
  } catch (err) {
    console.error('TOIL balance GET error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

export default leaveRouter;
