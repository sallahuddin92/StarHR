import { Router, Response } from 'express';
import { z } from 'zod';
import { query } from '../lib/db';
import { AuthenticatedRequest, authenticateToken, UserRole } from '../middleware/auth';

const router = Router();

// ============================================================================
// MIDDLEWARE: Require HR Admin role
// ============================================================================
function requireHRAdmin(req: AuthenticatedRequest, res: Response, next: () => void) {
  if (req.user?.role !== 'HR_ADMIN') {
    return res.status(403).json({ error: 'Forbidden', message: 'HR Admin access required' });
  }
  next();
}

// ============================================================================
// SCHEMAS
// ============================================================================
const DepartmentSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  parentId: z.string().uuid().optional().nullable(),
  headEmployeeId: z.string().uuid().optional().nullable(),
  fallbackApproverId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

const HierarchyNodeSchema = z.object({
  employeeId: z.string().uuid(),
  reportsToId: z.string().uuid().optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  positionTitle: z.string().max(100).optional(),
  hierarchyLevel: z.number().min(1).max(99),
  canApproveLeave: z.boolean().optional(),
});

const BulkHierarchyUpdateSchema = z.object({
  updates: z.array(HierarchyNodeSchema),
});

// ============================================================================
// GET /api/hierarchy - Full organizational tree
// ============================================================================
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;

    // Get all employees with their hierarchy info
    const result = await query(
      `
      SELECT 
        e.id,
        e.employee_id as employee_code,
        e.full_name,
        e.email,
        e.department as legacy_department,
        e.designation,
        e.is_active,
        h.id as hierarchy_id,
        h.reports_to_id,
        h.department_id,
        h.position_title,
        h.hierarchy_level,
        h.can_approve_leave,
        d.code as dept_code,
        d.name as dept_name,
        hl.level_name,
        sup.full_name as supervisor_name
      FROM employee_master e
      LEFT JOIN org_hierarchy h ON e.id = h.employee_id
      LEFT JOIN departments d ON h.department_id = d.id
      LEFT JOIN hierarchy_levels hl ON h.hierarchy_level = hl.level_number AND hl.tenant_id = $1
      LEFT JOIN employee_master sup ON h.reports_to_id = sup.id
      WHERE e.tenant_id = $1 AND e.is_active = true
      ORDER BY COALESCE(h.hierarchy_level, 99), e.full_name
    `,
      [tenantId]
    );

    // Get departments
    const depts = await query(
      `
      SELECT 
        d.id, d.code, d.name, d.description, d.parent_id,
        d.head_employee_id, d.fallback_approver_id, d.sort_order, d.is_active,
        head.full_name as head_name,
        fallback.full_name as fallback_name
      FROM departments d
      LEFT JOIN employee_master head ON d.head_employee_id = head.id
      LEFT JOIN employee_master fallback ON d.fallback_approver_id = fallback.id
      WHERE d.tenant_id = $1
      ORDER BY d.sort_order, d.name
    `,
      [tenantId]
    );

    // Get hierarchy levels
    const levels = await query(
      `
      SELECT level_number, level_name, description
      FROM hierarchy_levels
      WHERE tenant_id = $1
      ORDER BY level_number
    `,
      [tenantId]
    );

    return res.json({
      success: true,
      data: {
        employees: result.rows.map(row => ({
          id: row.id,
          employeeCode: row.employee_code,
          fullName: row.full_name,
          email: row.email,
          designation: row.designation,
          isActive: row.is_active,
          hierarchy: row.hierarchy_id
            ? {
                id: row.hierarchy_id,
                reportsToId: row.reports_to_id,
                supervisorName: row.supervisor_name,
                departmentId: row.department_id,
                deptCode: row.dept_code,
                deptName: row.dept_name,
                positionTitle: row.position_title,
                hierarchyLevel: row.hierarchy_level,
                levelName: row.level_name,
                canApproveLeave: row.can_approve_leave,
              }
            : null,
        })),
        departments: depts.rows.map(d => ({
          id: d.id,
          code: d.code,
          name: d.name,
          description: d.description,
          parentId: d.parent_id,
          headEmployeeId: d.head_employee_id,
          headName: d.head_name,
          fallbackApproverId: d.fallback_approver_id,
          fallbackName: d.fallback_name,
          sortOrder: d.sort_order,
          isActive: d.is_active,
        })),
        hierarchyLevels: levels.rows,
      },
    });
  } catch (err: any) {
    console.error('[Hierarchy] Error fetching:', err);
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// ============================================================================
// GET /api/hierarchy/tree - Tree structure for visualization
// ============================================================================
router.get('/tree', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;

    const result = await query(
      `
      WITH RECURSIVE hierarchy_tree AS (
        -- Root nodes (no supervisor)
        SELECT 
          e.id, e.full_name, e.designation, h.reports_to_id, h.hierarchy_level,
          h.position_title, d.name as dept_name, 0 as depth,
          ARRAY[e.id] as path
        FROM employee_master e
        LEFT JOIN org_hierarchy h ON e.id = h.employee_id
        LEFT JOIN departments d ON h.department_id = d.id
        WHERE e.tenant_id = $1 AND e.is_active = true AND h.reports_to_id IS NULL
        
        UNION ALL
        
        -- Child nodes
        SELECT 
          e.id, e.full_name, e.designation, h.reports_to_id, h.hierarchy_level,
          h.position_title, d.name as dept_name, ht.depth + 1,
          ht.path || e.id
        FROM employee_master e
        JOIN org_hierarchy h ON e.id = h.employee_id
        JOIN hierarchy_tree ht ON h.reports_to_id = ht.id
        LEFT JOIN departments d ON h.department_id = d.id
        WHERE e.tenant_id = $1 AND e.is_active = true
      )
      SELECT * FROM hierarchy_tree ORDER BY path
    `,
      [tenantId]
    );

    return res.json({ success: true, data: result.rows });
  } catch (err: any) {
    console.error('[Hierarchy] Tree error:', err);
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// ============================================================================
// PUT /api/hierarchy/:employeeId - Update single employee's position
// ============================================================================
router.put(
  '/:employeeId',
  authenticateToken,
  requireHRAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { employeeId } = req.params;
      const tenantId = req.user!.tenantId;
      const userId = req.user!.userId;

      const validation = HierarchyNodeSchema.omit({ employeeId: true }).safeParse(req.body);
      if (!validation.success) {
        return res
          .status(400)
          .json({ error: 'Validation error', details: validation.error.errors });
      }

      const { reportsToId, departmentId, positionTitle, hierarchyLevel, canApproveLeave } =
        validation.data;

      // Prevent self-reporting
      if (reportsToId === employeeId) {
        return res
          .status(400)
          .json({ error: 'Invalid hierarchy', message: 'Employee cannot report to themselves' });
      }

      // Upsert hierarchy record
      const result = await query(
        `
      INSERT INTO org_hierarchy (
        tenant_id, employee_id, reports_to_id, department_id, 
        position_title, hierarchy_level, can_approve_leave, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (employee_id) DO UPDATE SET
        reports_to_id = EXCLUDED.reports_to_id,
        department_id = EXCLUDED.department_id,
        position_title = EXCLUDED.position_title,
        hierarchy_level = EXCLUDED.hierarchy_level,
        can_approve_leave = EXCLUDED.can_approve_leave,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `,
        [
          tenantId,
          employeeId,
          reportsToId || null,
          departmentId || null,
          positionTitle || null,
          hierarchyLevel,
          canApproveLeave ?? false,
          userId,
        ]
      );

      return res.json({
        success: true,
        message: 'Hierarchy updated',
        data: result.rows[0],
      });
    } catch (err: any) {
      console.error('[Hierarchy] Update error:', err);
      return res.status(500).json({ error: 'Internal server error', message: err.message });
    }
  }
);

// ============================================================================
// POST /api/hierarchy/bulk - Bulk update hierarchy (drag-drop save)
// ============================================================================
router.post(
  '/bulk',
  authenticateToken,
  requireHRAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.userId;

      const validation = BulkHierarchyUpdateSchema.safeParse(req.body);
      if (!validation.success) {
        return res
          .status(400)
          .json({ error: 'Validation error', details: validation.error.errors });
      }

      const { updates } = validation.data;
      let successCount = 0;

      for (const update of updates) {
        // Prevent self-reporting
        if (update.reportsToId === update.employeeId) continue;

        await query(
          `
        INSERT INTO org_hierarchy (
          tenant_id, employee_id, reports_to_id, department_id, 
          position_title, hierarchy_level, can_approve_leave, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (employee_id) DO UPDATE SET
          reports_to_id = EXCLUDED.reports_to_id,
          department_id = EXCLUDED.department_id,
          position_title = EXCLUDED.position_title,
          hierarchy_level = EXCLUDED.hierarchy_level,
          can_approve_leave = EXCLUDED.can_approve_leave,
          updated_at = CURRENT_TIMESTAMP
      `,
          [
            tenantId,
            update.employeeId,
            update.reportsToId || null,
            update.departmentId || null,
            update.positionTitle || null,
            update.hierarchyLevel,
            update.canApproveLeave ?? false,
            userId,
          ]
        );

        successCount++;
      }

      return res.json({
        success: true,
        message: `Updated ${successCount} hierarchy records`,
      });
    } catch (err: any) {
      console.error('[Hierarchy] Bulk update error:', err);
      return res.status(500).json({ error: 'Internal server error', message: err.message });
    }
  }
);

// ============================================================================
// DEPARTMENTS CRUD
// ============================================================================

// GET /api/hierarchy/departments
router.get('/departments', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;

    const result = await query(
      `
      SELECT 
        d.*, 
        head.full_name as head_name,
        fallback.full_name as fallback_name,
        parent.name as parent_name,
        (SELECT COUNT(*) FROM org_hierarchy h WHERE h.department_id = d.id) as employee_count
      FROM departments d
      LEFT JOIN employee_master head ON d.head_employee_id = head.id
      LEFT JOIN employee_master fallback ON d.fallback_approver_id = fallback.id
      LEFT JOIN departments parent ON d.parent_id = parent.id
      WHERE d.tenant_id = $1
      ORDER BY d.sort_order, d.name
    `,
      [tenantId]
    );

    return res.json({ success: true, data: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// POST /api/hierarchy/departments
router.post(
  '/departments',
  authenticateToken,
  requireHRAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;

      const validation = DepartmentSchema.safeParse(req.body);
      if (!validation.success) {
        return res
          .status(400)
          .json({ error: 'Validation error', details: validation.error.errors });
      }

      const { code, name, description, parentId, headEmployeeId, fallbackApproverId, sortOrder } =
        validation.data;

      const result = await query(
        `
      INSERT INTO departments (tenant_id, code, name, description, parent_id, head_employee_id, fallback_approver_id, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `,
        [
          tenantId,
          code,
          name,
          description || null,
          parentId || null,
          headEmployeeId || null,
          fallbackApproverId || null,
          sortOrder || 0,
        ]
      );

      return res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err: any) {
      if (err.constraint === 'dept_unique_code') {
        return res
          .status(409)
          .json({ error: 'Conflict', message: 'Department code already exists' });
      }
      return res.status(500).json({ error: 'Internal server error', message: err.message });
    }
  }
);

// PUT /api/hierarchy/departments/:id
router.put(
  '/departments/:id',
  authenticateToken,
  requireHRAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;

      const validation = DepartmentSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res
          .status(400)
          .json({ error: 'Validation error', details: validation.error.errors });
      }

      const data = validation.data;

      const result = await query(
        `
      UPDATE departments SET
        code = COALESCE($3, code),
        name = COALESCE($4, name),
        description = COALESCE($5, description),
        parent_id = $6,
        head_employee_id = $7,
        fallback_approver_id = $8,
        is_active = COALESCE($9, is_active),
        sort_order = COALESCE($10, sort_order),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND tenant_id = $2
      RETURNING *
    `,
        [
          id,
          tenantId,
          data.code,
          data.name,
          data.description,
          data.parentId,
          data.headEmployeeId,
          data.fallbackApproverId,
          data.isActive,
          data.sortOrder,
        ]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Not found', message: 'Department not found' });
      }

      return res.json({ success: true, data: result.rows[0] });
    } catch (err: any) {
      return res.status(500).json({ error: 'Internal server error', message: err.message });
    }
  }
);

// ============================================================================
// GET /api/hierarchy/my-supervisor - Get current user's supervisor
// ============================================================================
router.get(
  '/my-supervisor',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const tenantId = req.user!.tenantId;

      const result = await query(
        `
      SELECT 
        h.reports_to_id,
        sup.id as supervisor_id,
        sup.full_name as supervisor_name,
        sup.email as supervisor_email,
        sup.designation as supervisor_designation,
        h.hierarchy_level,
        d.id as dept_id,
        d.name as dept_name,
        d.fallback_approver_id,
        fallback.full_name as fallback_name
      FROM org_hierarchy h
      LEFT JOIN employee_master sup ON h.reports_to_id = sup.id
      LEFT JOIN departments d ON h.department_id = d.id
      LEFT JOIN employee_master fallback ON d.fallback_approver_id = fallback.id
      WHERE h.employee_id = $1 AND h.tenant_id = $2
    `,
        [userId, tenantId]
      );

      if (result.rowCount === 0) {
        return res.json({
          success: true,
          data: null,
          message: 'No hierarchy configured for this employee',
        });
      }

      const row = result.rows[0];
      return res.json({
        success: true,
        data: {
          supervisorId: row.supervisor_id,
          supervisorName: row.supervisor_name,
          supervisorEmail: row.supervisor_email,
          hierarchyLevel: row.hierarchy_level,
          departmentId: row.dept_id,
          departmentName: row.dept_name,
          fallbackApproverId: row.fallback_approver_id,
          fallbackName: row.fallback_name,
          hasSupervisor: !!row.supervisor_id,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Internal server error', message: err.message });
    }
  }
);

// ============================================================================
// GET /api/hierarchy/my-reports - Get employees reporting to current user
// ============================================================================
router.get('/my-reports', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const tenantId = req.user!.tenantId;

    const result = await query(
      `
      SELECT 
        e.id, e.employee_id as employee_code, e.full_name, e.email, e.designation,
        h.position_title, h.hierarchy_level,
        d.name as dept_name
      FROM org_hierarchy h
      JOIN employee_master e ON h.employee_id = e.id
      LEFT JOIN departments d ON h.department_id = d.id
      WHERE h.reports_to_id = $1 AND h.tenant_id = $2 AND e.is_active = true
      ORDER BY h.hierarchy_level, e.full_name
    `,
      [userId, tenantId]
    );

    return res.json({ success: true, data: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// ============================================================================
// GET /api/hierarchy/export - Export hierarchy data as CSV for departments
// ============================================================================
router.get('/export', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;

    // Get all employees with their hierarchy info
    const result = await query(
      `
            SELECT 
                e.employee_id as "Employee_Code",
                e.full_name as "Full_Name",
                e.email as "Email",
                e.designation as "Current_Designation",
                COALESCE(d.code, '') as "Department_Code",
                COALESCE(d.name, e.department) as "Department_Name",
                COALESCE(h.position_title, '') as "Position_Title",
                COALESCE(h.hierarchy_level, 6) as "Hierarchy_Level",
                COALESCE(sup.employee_id, '') as "Reports_To_Code",
                COALESCE(sup.full_name, '') as "Reports_To_Name",
                CASE WHEN h.can_approve_leave THEN 'Yes' ELSE 'No' END as "Can_Approve_Leave",
                e.id as "System_Employee_ID"
            FROM employee_master e
            LEFT JOIN org_hierarchy h ON e.id = h.employee_id
            LEFT JOIN departments d ON h.department_id = d.id
            LEFT JOIN employee_master sup ON h.reports_to_id = sup.id
            WHERE e.tenant_id = $1 AND e.is_active = true
            ORDER BY COALESCE(h.hierarchy_level, 99), e.full_name
        `,
      [tenantId]
    );

    // Build CSV
    const headers = [
      'Employee_Code',
      'Full_Name',
      'Email',
      'Current_Designation',
      'Department_Code',
      'Department_Name',
      'Position_Title',
      'Hierarchy_Level',
      'Reports_To_Code',
      'Reports_To_Name',
      'Can_Approve_Leave',
      'System_Employee_ID',
    ];

    let csv = headers.join(',') + '\n';

    for (const row of result.rows) {
      const values = headers.map(h => {
        const val = (row as any)[h];
        // Escape quotes and wrap in quotes if contains comma
        const strVal = String(val || '');
        if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n')) {
          return '"' + strVal.replace(/"/g, '""') + '"';
        }
        return strVal;
      });
      csv += values.join(',') + '\n';
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=hierarchy_template.csv');
    return res.send(csv);
  } catch (err: any) {
    console.error('[Hierarchy] Export error:', err);
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// ============================================================================
// GET /api/hierarchy/template - Download empty template for departments
// ============================================================================
router.get('/template', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;

    // Get all employees for reference
    const employees = await query(
      `
            SELECT employee_id, full_name FROM employee_master 
            WHERE tenant_id = $1 AND is_active = true 
            ORDER BY full_name
        `,
      [tenantId]
    );

    // Get departments
    const depts = await query(
      `
            SELECT code, name FROM departments WHERE tenant_id = $1 ORDER BY name
        `,
      [tenantId]
    );

    // Get hierarchy levels
    const levels = await query(
      `
            SELECT level_number, level_name FROM hierarchy_levels WHERE tenant_id = $1 ORDER BY level_number
        `,
      [tenantId]
    );

    // Build CSV with instructions
    let csv = '# ═══════════════════════════════════════════════════════════════════════════\n';
    csv += '# HIERARCHY IMPORT TEMPLATE\n';
    csv += '# ═══════════════════════════════════════════════════════════════════════════\n';
    csv += '#\n';
    csv += '# HOW TO USE:\n';
    csv += '# 1. Fill in the columns below for each employee\n';
    csv += '# 2. Delete these instruction lines (starting with #) before importing\n';
    csv += '# 3. Keep the header row and all employee data rows\n';
    csv += '#\n';
    csv += '# COLUMN GUIDE:\n';
    csv += '# - Employee_Code    : Required - must match existing employee ID\n';
    csv += '# - Full_Name        : For reference only (not imported)\n';
    csv +=
      '# - Department_Code  : Use one of: ' +
      (depts.rows.length > 0
        ? depts.rows.map((d: any) => d.code).join(', ')
        : 'IT, HR, FIN, OPS, SALES') +
      '\n';
    csv += '# - Position_Title   : Job title (e.g., "Software Engineer", "HR Manager")\n';
    csv +=
      '# - Hierarchy_Level  : ' +
      (levels.rows.length > 0
        ? levels.rows.map((l: any) => `${l.level_number}=${l.level_name}`).join(', ')
        : '1=CEO, 2=VP, 3=Director, 4=Manager, 5=Lead, 6=Staff') +
      '\n';
    csv += '# - Reports_To_Code  : Employee code of supervisor (leave empty for CEO/top level)\n';
    csv += '# - Can_Approve_Leave: Yes or No - can this person approve leave requests?\n';
    csv += '#\n';
    csv += '# ═══════════════════════════════════════════════════════════════════════════\n';
    csv += '# EXAMPLES (delete these before importing):\n';
    csv += '# ═══════════════════════════════════════════════════════════════════════════\n';
    csv +=
      '# EMP001,John Smith,IT,Chief Technology Officer,1,,Yes      ← CEO/Top level (no supervisor)\n';
    csv +=
      '# EMP002,Jane Doe,IT,Engineering Manager,4,EMP001,Yes       ← Reports to EMP001, can approve\n';
    csv +=
      '# EMP003,Bob Wilson,IT,Senior Developer,5,EMP002,No         ← Reports to EMP002, cannot approve\n';
    csv +=
      '# EMP004,Alice Brown,HR,HR Director,3,EMP001,Yes            ← Different department, reports to CEO\n';
    csv += '#\n';
    csv += '# ═══════════════════════════════════════════════════════════════════════════\n';
    csv += '# YOUR DATA STARTS BELOW:\n';
    csv += '# ═══════════════════════════════════════════════════════════════════════════\n';

    const headers = [
      'Employee_Code',
      'Full_Name',
      'Department_Code',
      'Position_Title',
      'Hierarchy_Level',
      'Reports_To_Code',
      'Can_Approve_Leave',
    ];
    csv += headers.join(',') + '\n';

    // Add sample rows with current employee data
    for (const emp of employees.rows as any[]) {
      csv += `${emp.employee_id},${emp.full_name},,,6,,No\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=hierarchy_import_template.csv');
    return res.send(csv);
  } catch (err: any) {
    console.error('[Hierarchy] Template error:', err);
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// ============================================================================
// POST /api/hierarchy/validate - Validate import data and return summary
// ============================================================================
router.post(
  '/validate',
  authenticateToken,
  requireHRAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const { data } = req.body;

      if (!Array.isArray(data) || data.length === 0) {
        return res
          .status(400)
          .json({ error: 'Invalid data', message: 'Expected array of hierarchy records' });
      }

      // Get employee lookup map
      const empResult = await query(
        `
            SELECT id, employee_id FROM employee_master WHERE tenant_id = $1 AND is_active = true
        `,
        [tenantId]
      );
      const employeeMap = new Map<string, string>();
      for (const emp of empResult.rows as any[]) {
        employeeMap.set(emp.employee_id, emp.id);
      }

      // Get existing hierarchy records
      const existingResult = await query(
        `
            SELECT employee_id FROM org_hierarchy WHERE tenant_id = $1
        `,
        [tenantId]
      );
      const existingHierarchy = new Set((existingResult.rows as any[]).map(r => r.employee_id));

      // Get department lookup
      const deptResult = await query(`SELECT id, code FROM departments WHERE tenant_id = $1`, [
        tenantId,
      ]);
      const deptMap = new Map<string, string>();
      for (const dept of deptResult.rows as any[]) {
        deptMap.set(dept.code, dept.id);
      }

      // Validation results
      const validation = {
        totalRecords: data.length,
        newRecords: 0,
        updateRecords: 0,
        duplicatesInFile: 0,
        missingEmployee: [] as string[],
        missingSupervisor: [] as string[],
        invalidDepartment: [] as string[],
        selfReporting: [] as string[],
        valid: true,
      };

      const seenEmployees = new Set<string>();

      for (const row of data) {
        const empCode = row.Employee_Code || row.employee_code;

        // Check for duplicates in file
        if (seenEmployees.has(empCode)) {
          validation.duplicatesInFile++;
          continue;
        }
        seenEmployees.add(empCode);

        const employeeId = employeeMap.get(empCode);
        if (!employeeId) {
          validation.missingEmployee.push(empCode);
          validation.valid = false;
          continue;
        }

        // Check if updating existing or new
        if (existingHierarchy.has(employeeId)) {
          validation.updateRecords++;
        } else {
          validation.newRecords++;
        }

        // Check supervisor
        const reportsToCode = row.Reports_To_Code || row.reports_to_code;
        if (reportsToCode) {
          const reportsToId = employeeMap.get(reportsToCode);
          if (!reportsToId) {
            validation.missingSupervisor.push(`${empCode} → ${reportsToCode}`);
          }
          if (reportsToId === employeeId) {
            validation.selfReporting.push(empCode);
          }
        }

        // Check department
        const deptCode = row.Department_Code || row.department_code;
        if (deptCode && !deptMap.has(deptCode)) {
          validation.invalidDepartment.push(`${empCode}: ${deptCode}`);
        }
      }

      // Only block import for critical errors
      validation.valid = validation.missingEmployee.length === 0;

      return res.json({
        success: true,
        data: validation,
      });
    } catch (err: any) {
      console.error('[Hierarchy] Validate error:', err);
      return res.status(500).json({ error: 'Internal server error', message: err.message });
    }
  }
);

// ============================================================================
// POST /api/hierarchy/import - Bulk import hierarchy from CSV data
// ============================================================================
router.post(
  '/import',
  authenticateToken,
  requireHRAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.userId;
      const { data } = req.body; // Expecting array of row objects

      if (!Array.isArray(data) || data.length === 0) {
        return res
          .status(400)
          .json({ error: 'Invalid data', message: 'Expected array of hierarchy records' });
      }

      // Get employee lookup map
      const empResult = await query(
        `
            SELECT id, employee_id FROM employee_master WHERE tenant_id = $1 AND is_active = true
        `,
        [tenantId]
      );
      const employeeMap = new Map<string, string>();
      for (const emp of empResult.rows as any[]) {
        employeeMap.set(emp.employee_id, emp.id);
      }

      // Get department lookup map
      const deptResult = await query(`SELECT id, code FROM departments WHERE tenant_id = $1`, [
        tenantId,
      ]);
      const deptMap = new Map<string, string>();
      for (const dept of deptResult.rows as any[]) {
        deptMap.set(dept.code, dept.id);
      }

      let successCount = 0;
      let updateCount = 0;
      let newCount = 0;
      let errorCount = 0;
      const errors: string[] = [];
      const processedEmployees = new Set<string>();

      // Get existing hierarchy to track updates vs new
      const existingResult = await query(
        `SELECT employee_id FROM org_hierarchy WHERE tenant_id = $1`,
        [tenantId]
      );
      const existingHierarchy = new Set((existingResult.rows as any[]).map(r => r.employee_id));

      for (const row of data) {
        const empCode = row.Employee_Code || row.employee_code;

        // Skip duplicates in file
        if (processedEmployees.has(empCode)) continue;
        processedEmployees.add(empCode);

        const employeeId = employeeMap.get(empCode);

        if (!employeeId) {
          errors.push(`Employee ${empCode} not found`);
          errorCount++;
          continue;
        }

        const reportsToCode = row.Reports_To_Code || row.reports_to_code;
        const reportsToId = reportsToCode ? employeeMap.get(reportsToCode) : null;

        if (reportsToCode && !reportsToId) {
          errors.push(`Supervisor ${reportsToCode} not found for ${empCode}`);
          errorCount++;
          continue;
        }

        // Prevent self-reporting
        if (reportsToId === employeeId) {
          errors.push(`${empCode} cannot report to themselves`);
          errorCount++;
          continue;
        }

        const deptCode = row.Department_Code || row.department_code;
        const departmentId = deptCode ? deptMap.get(deptCode) : null;

        const positionTitle = row.Position_Title || row.position_title || null;
        const hierarchyLevel = parseInt(row.Hierarchy_Level || row.hierarchy_level || '6');
        const canApproveStr = row.Can_Approve_Leave || row.can_approve_leave || 'No';
        const canApproveLeave =
          canApproveStr.toLowerCase() === 'yes' ||
          canApproveStr === 'true' ||
          canApproveStr === '1';

        try {
          await query(
            `
                    INSERT INTO org_hierarchy (
                        tenant_id, employee_id, reports_to_id, department_id,
                        position_title, hierarchy_level, can_approve_leave, created_by
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (employee_id) DO UPDATE SET
                        reports_to_id = EXCLUDED.reports_to_id,
                        department_id = EXCLUDED.department_id,
                        position_title = EXCLUDED.position_title,
                        hierarchy_level = EXCLUDED.hierarchy_level,
                        can_approve_leave = EXCLUDED.can_approve_leave,
                        updated_at = CURRENT_TIMESTAMP
                `,
            [
              tenantId,
              employeeId,
              reportsToId,
              departmentId,
              positionTitle,
              hierarchyLevel,
              canApproveLeave,
              userId,
            ]
          );

          successCount++;
          if (existingHierarchy.has(employeeId)) {
            updateCount++;
          } else {
            newCount++;
          }
        } catch (dbErr: any) {
          errors.push(`Failed to update ${empCode}: ${dbErr.message}`);
          errorCount++;
        }
      }

      return res.json({
        success: true,
        message: `Imported ${successCount} records (${newCount} new, ${updateCount} updated)`,
        details: {
          total: data.length,
          success: successCount,
          new: newCount,
          updated: updateCount,
          errors: errorCount,
          errorDetails: errors.slice(0, 10),
        },
      });
    } catch (err: any) {
      console.error('[Hierarchy] Import error:', err);
      return res.status(500).json({ error: 'Internal server error', message: err.message });
    }
  }
);

export default router;
