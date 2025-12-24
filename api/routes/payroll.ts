/**
 * Payroll API Routes
 * POST /api/payroll/run-draft
 */

import { Router, Response } from 'express';
import { query } from '../lib/db';
import {
  RunDraftPayrollSchema,
  RunDraftPayrollRequest,
  validateRequest,
  formatZodErrors,
} from '../lib/validation';
import { calculateAllDeductions } from '../lib/statutory-kernel';
import { AuthenticatedRequest } from '../middleware/auth';

export const payrollRouter = Router();

// ============================================================================
// INTERFACES
// ============================================================================

interface Employee {
  id: string;
  employee_id: string;
  full_name: string;
  basic_salary: number;
  marital_status: string;
  children: number;
  is_foreigner: boolean;
  tax_category: string;
  ot_rate_multiplier: number;
}

interface AttendanceHours {
  employee_id: string;
  regular_hours: number;
  ot_approved_hours: number;
}

interface PayrollItemDraft {
  employeeId: string;
  employeeName: string;
  basicSalary: number;
  regularHours: number;
  overtimeHours: number;
  overtimeAmount: number;
  grossAmount: number;
  deductions: {
    pcb: number;
    epf: number;
    socso: number;
    total: number;
  };
  netAmount: number;
}

interface DraftPayrollResponse {
  success: boolean;
  message: string;
  data: {
    tenantId: string;
    payrollRunId: string;
    payrollPeriod: {
      basicStart: string;
      basicEnd: string;
      otStart: string;
      otEnd: string;
    };
    summary: {
      totalEmployees: number;
      totalGross: number;
      totalDeductions: number;
      totalNet: number;
      totalPCB: number;
      totalEPF: number;
      totalSOCSO: number;
    };
    employees: PayrollItemDraft[];
    generatedAt: string;
  };
}

// ============================================================================
// POST /api/payroll/run-draft
// ============================================================================

/**
 * Run Draft Payroll Endpoint
 *
 * Accepts: { tenantId, basicStartDate, basicEndDate, otStartDate, otEndDate }
 *
 * Logic:
 * 1. Query attendance_ledger for verified hours within the date ranges
 * 2. Call statutory-kernel to calculate Tax/EPF/SOCSO
 * 3. Return JSON summary of draft payroll
 */
payrollRouter.post('/run-draft', async (req: AuthenticatedRequest, res: Response) => {
  try {
    // ========================================================================
    // Step 1: Get tenant from authenticated user
    // ========================================================================
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    if (!tenantId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // ========================================================================
    // Step 2: Validate Input with Zod
    // ========================================================================
    const validation = validateRequest(RunDraftPayrollSchema, req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: formatZodErrors(validation.errors),
      });
    }

    const { basicStartDate, basicEndDate, otStartDate, otEndDate } =
      validation.data as RunDraftPayrollRequest;

    // ========================================================================
    // Step 3: Verify Tenant Exists
    // ========================================================================
    const tenantResult = await query<{ id: string; name: string }>(
      `SELECT id, name FROM tenants WHERE id = $1 AND is_active = true`,
      [tenantId]
    );

    if (tenantResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found or inactive',
        code: 'TENANT_NOT_FOUND',
      });
    }

    // ========================================================================
    // Step 3: Get All Active Employees for Tenant
    // ========================================================================
    const employeesResult = await query<Employee>(
      `SELECT 
        em.id,
        em.employee_id,
        em.full_name,
        COALESCE(sc.basic_salary, 0) as basic_salary,
        COALESCE(sc.marital_status, 'single') as marital_status,
        COALESCE(sc.children, 0) as children,
        COALESCE(sc.is_foreigner, false) as is_foreigner,
        COALESCE(sc.tax_category, 'B') as tax_category,
        COALESCE(sc.ot_rate_multiplier, 1.5) as ot_rate_multiplier
       FROM employee_master em
       LEFT JOIN salary_config sc ON em.id = sc.employee_id AND sc.is_active = true
       WHERE em.tenant_id = $1 AND em.is_active = true
       ORDER BY em.full_name`,
      [tenantId]
    );

    if (employeesResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'No active employees found for tenant',
        code: 'NO_EMPLOYEES',
      });
    }

    const employees = employeesResult.rows;

    // ========================================================================
    // Step 4: Get Verified Attendance Hours for Basic Salary Period
    // ========================================================================
    const regularHoursResult = await query<AttendanceHours>(
      `SELECT 
        employee_id,
        SUM(working_hours) as regular_hours,
        0 as ot_approved_hours
       FROM attendance_ledger
       WHERE tenant_id = $1
         AND attendance_date BETWEEN $2 AND $3
         AND verified_clock_in IS NOT NULL
         AND verified_clock_out IS NOT NULL
       GROUP BY employee_id`,
      [tenantId, basicStartDate, basicEndDate]
    );

    // ========================================================================
    // Step 5: Get Approved Overtime Hours for OT Period
    // ========================================================================
    const overtimeResult = await query<AttendanceHours>(
      `SELECT 
        employee_id,
        0 as regular_hours,
        SUM(COALESCE(ot_approved_hours, 0)) as ot_approved_hours
       FROM attendance_ledger
       WHERE tenant_id = $1
         AND attendance_date BETWEEN $2 AND $3
         AND ot_approval_status = 'approved'
       GROUP BY employee_id`,
      [tenantId, otStartDate, otEndDate]
    );

    // Create lookup maps for hours
    const regularHoursMap = new Map<string, number>();
    const overtimeHoursMap = new Map<string, number>();

    regularHoursResult.rows.forEach(row => {
      regularHoursMap.set(row.employee_id, Number(row.regular_hours) || 0);
    });

    overtimeResult.rows.forEach(row => {
      overtimeHoursMap.set(row.employee_id, Number(row.ot_approved_hours) || 0);
    });

    // ========================================================================
    // Step 6: Calculate Payroll for Each Employee
    // ========================================================================
    const payrollItems: PayrollItemDraft[] = [];
    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;
    let totalPCB = 0;
    let totalEPF = 0;
    let totalSOCSO = 0;

    for (const employee of employees) {
      const regularHours = regularHoursMap.get(employee.id) || 0;
      const overtimeHours = overtimeHoursMap.get(employee.id) || 0;

      // Calculate basic salary (prorated if needed based on hours)
      const basicSalary = Number(employee.basic_salary) || 0;

      // Calculate overtime amount
      // OT Rate = (Basic Salary / 26 days / 8 hours) * OT Multiplier
      const hourlyRate = basicSalary / 26 / 8;
      const otMultiplier = Number(employee.ot_rate_multiplier) || 1.5;
      const overtimeAmount = Math.round(overtimeHours * hourlyRate * otMultiplier * 100) / 100;

      // Calculate gross
      const grossAmount = basicSalary + overtimeAmount;

      // ======================================================================
      // Step 7: Calculate Statutory Deductions using statutory-kernel
      // ======================================================================
      const deductions = calculateAllDeductions(
        grossAmount,
        employee.marital_status || 'single',
        Number(employee.children) || 0,
        employee.is_foreigner || false,
        false, // isForeignerMandateActive
        0, // previousPCB
        employee.tax_category || 'B'
      );

      // Calculate net amount
      const netAmount = Math.round((grossAmount - deductions.totalDeductions) * 100) / 100;

      // Add to totals
      totalGross += grossAmount;
      totalDeductions += deductions.totalDeductions;
      totalNet += netAmount;
      totalPCB += deductions.pcb;
      totalEPF += deductions.epf;
      totalSOCSO += deductions.socso;

      // Add payroll item
      payrollItems.push({
        employeeId: employee.id,
        employeeName: employee.full_name,
        basicSalary,
        regularHours,
        overtimeHours,
        overtimeAmount,
        grossAmount,
        deductions: {
          pcb: deductions.pcb,
          epf: deductions.epf,
          socso: deductions.socso,
          total: deductions.totalDeductions,
        },
        netAmount,
      });
    }

    // ========================================================================
    // Step 8: Save Draft to Database
    // ========================================================================

    // Derive payroll_month from basic start date (first of that month)
    const payrollMonth = basicStartDate.substring(0, 7) + '-01'; // e.g., "2023-09-01"

    // Delete any existing draft for this tenant/month to allow re-generation
    await query(
      `DELETE FROM payroll_runs WHERE tenant_id = $1 AND payroll_month = $2 AND status = 'draft'`,
      [tenantId, payrollMonth]
    );

    // Insert payroll run
    const runResult = await query<{ id: string }>(
      `INSERT INTO payroll_runs (
        tenant_id, payroll_month, run_date, basic_start_date, basic_end_date,
        ot_start_date, ot_end_date, status, processed_by, processed_date,
        total_employees, total_gross_amount, total_deductions, total_net_amount
      ) VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5, $6, 'draft', $7, CURRENT_TIMESTAMP, $8, $9, $10, $11)
      RETURNING id`,
      [
        tenantId,
        payrollMonth,
        basicStartDate,
        basicEndDate,
        otStartDate,
        otEndDate,
        userId,
        payrollItems.length,
        Math.round(totalGross * 100) / 100,
        Math.round(totalDeductions * 100) / 100,
        Math.round(totalNet * 100) / 100,
      ]
    );

    const payrollRunId = runResult.rows[0].id;

    // Insert payroll items
    for (const item of payrollItems) {
      await query(
        `INSERT INTO payroll_items (
          tenant_id, payroll_run_id, employee_id, basic_salary,
          overtime_hours, overtime_amount, gross_amount,
          epf_employee, socso, pcb_tax, total_deductions, net_amount,
          calculated_by, calculated_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP)`,
        [
          tenantId,
          payrollRunId,
          item.employeeId,
          item.basicSalary,
          item.overtimeHours,
          item.overtimeAmount,
          item.grossAmount,
          item.deductions.epf,
          item.deductions.socso,
          item.deductions.pcb,
          item.deductions.total,
          item.netAmount,
          userId,
        ]
      );
    }

    // ========================================================================
    // Step 9: Return Draft Payroll Summary
    // ========================================================================
    const response: DraftPayrollResponse = {
      success: true,
      message: 'Draft payroll generated and saved successfully',
      data: {
        tenantId,
        payrollRunId,
        payrollPeriod: {
          basicStart: basicStartDate,
          basicEnd: basicEndDate,
          otStart: otStartDate,
          otEnd: otEndDate,
        },
        summary: {
          totalEmployees: payrollItems.length,
          totalGross: Math.round(totalGross * 100) / 100,
          totalDeductions: Math.round(totalDeductions * 100) / 100,
          totalNet: Math.round(totalNet * 100) / 100,
          totalPCB: Math.round(totalPCB * 100) / 100,
          totalEPF: Math.round(totalEPF * 100) / 100,
          totalSOCSO: Math.round(totalSOCSO * 100) / 100,
        },
        employees: payrollItems,
        generatedAt: new Date().toISOString(),
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Run draft payroll error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
});

// ============================================================================
// GET /api/payroll/runs/:tenantId
// ============================================================================

/**
 * Get payroll runs for a tenant
 */
payrollRouter.get('/runs/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { status, limit = 10 } = req.query;

    let queryText = `
      SELECT id, payroll_month, run_date, status, 
             total_employees, total_gross_amount, total_net_amount,
             processed_by, processed_date
      FROM payroll_runs 
      WHERE tenant_id = $1
    `;
    const params: any[] = [tenantId];

    if (status) {
      queryText += ` AND status = $2`;
      params.push(status);
    }

    queryText += ` ORDER BY run_date DESC LIMIT $${params.length + 1}`;
    params.push(Number(limit));

    const result = await query(queryText, params);

    return res.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
    });
  } catch (error) {
    console.error('Get payroll runs error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
    });
  }
});

export default payrollRouter;
