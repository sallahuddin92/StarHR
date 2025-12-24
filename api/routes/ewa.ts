/**
 * EWA (Earned Wage Access) API Routes
 * POST /api/ewa/request
 * GET /api/ewa/pending
 * PUT /api/ewa/:id/approve
 * PUT /api/ewa/:id/reject
 */

import { Router, Response } from 'express';
import { query, withTransaction } from '../lib/db';
import {
  EWARequestSchema,
  EWARequestInput,
  EWAApproveSchema,
  EWARejectSchema,
  validateRequest,
  formatZodErrors,
} from '../lib/validation';
import { AuthenticatedRequest } from '../middleware/auth';

export const ewaRouter = Router();

// ============================================================================
// CONSTANTS
// ============================================================================

/** Safe limit percentage of accrued salary (50%) */
const SAFE_LIMIT_PERCENTAGE = 0.5;

/** Maximum EWA requests per month */
const MAX_MONTHLY_REQUESTS = 4;

// ============================================================================
// INTERFACES
// ============================================================================

interface Employee {
  id: string;
  tenant_id: string;
  employee_id: string;
  full_name: string;
  daily_rate: number;
  monthly_ewa_limit: number;
}

interface AccruedSalaryInfo {
  days_worked: number;
  daily_rate: number;
  accrued_salary: number;
  safe_limit: number;
}

interface EWATransaction {
  id: string;
  employee_id: string;
  requested_amount: number;
  status: string;
  request_date: string;
}

interface EWARequestResponse {
  success: boolean;
  message: string;
  data?: {
    transactionId: string;
    employeeId: string;
    requestedAmount: number;
    accruedSalary: number;
    safeLimit: number;
    status: string;
    createdAt: string;
  };
  error?: string;
  code?: string;
}

// ============================================================================
// POST /api/ewa/request
// ============================================================================

/**
 * EWA Request Endpoint
 *
 * Accepts: { employeeId, amount }
 *
 * Logic:
 * 1. Calculate AccruedSalary = DailyRate * DaysWorked
 * 2. Check SafeLimit = AccruedSalary * 0.50
 * 3. If amount <= SafeLimit: Insert into ewa_transactions with status 'PENDING'
 * 4. Else: Return 400 'Insufficient Funds'
 */
ewaRouter.post('/request', async (req: Request, res: Response) => {
  try {
    // ========================================================================
    // Step 1: Validate Input with Zod
    // ========================================================================
    const validation = validateRequest(EWARequestSchema, req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: formatZodErrors(validation.errors),
      });
    }

    const { employeeId, amount } = validation.data as EWARequestInput;

    // ========================================================================
    // Step 2: Get Employee Information
    // ========================================================================
    const employeeResult = await query<Employee>(
      `SELECT 
        em.id,
        em.tenant_id,
        em.employee_id,
        em.full_name,
        COALESCE(sc.daily_rate, sc.basic_salary / 26, 0) as daily_rate,
        COALESCE(sc.monthly_ewa_limit, 5000) as monthly_ewa_limit
       FROM employee_master em
       LEFT JOIN salary_config sc ON em.id = sc.employee_id AND sc.is_active = true
       WHERE em.id = $1 AND em.is_active = true`,
      [employeeId]
    );

    if (employeeResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found or inactive',
        code: 'EMPLOYEE_NOT_FOUND',
      });
    }

    const employee = employeeResult.rows[0];
    const dailyRate = Number(employee.daily_rate) || 0;

    if (dailyRate === 0) {
      return res.status(400).json({
        success: false,
        error: 'Employee salary configuration not found',
        code: 'NO_SALARY_CONFIG',
      });
    }

    // ========================================================================
    // Step 3: Calculate Days Worked This Month
    // ========================================================================
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstDayStr = firstDayOfMonth.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    const attendanceResult = await query<{ days_worked: number }>(
      `SELECT COUNT(DISTINCT attendance_date) as days_worked
       FROM attendance_ledger
       WHERE employee_id = $1
         AND attendance_date BETWEEN $2 AND $3
         AND verified_clock_in IS NOT NULL
         AND verified_clock_out IS NOT NULL`,
      [employeeId, firstDayStr, todayStr]
    );

    const daysWorked = Number(attendanceResult.rows[0]?.days_worked) || 0;

    // ========================================================================
    // Step 4: Calculate Accrued Salary and Safe Limit
    // ========================================================================
    const accruedSalary = Math.round(dailyRate * daysWorked * 100) / 100;
    const safeLimit = Math.round(accruedSalary * SAFE_LIMIT_PERCENTAGE * 100) / 100;

    // ========================================================================
    // Step 5: Check YTD EWA Withdrawals This Month
    // ========================================================================
    const ytdEwaResult = await query<{ total_withdrawn: number; request_count: number }>(
      `SELECT 
        COALESCE(SUM(requested_amount), 0) as total_withdrawn,
        COUNT(*) as request_count
       FROM ewa_transactions
       WHERE employee_id = $1
         AND request_date >= $2
         AND status IN ('pending', 'approved', 'processed')`,
      [employeeId, firstDayStr]
    );

    const ytdWithdrawn = Number(ytdEwaResult.rows[0]?.total_withdrawn) || 0;
    const requestCount = Number(ytdEwaResult.rows[0]?.request_count) || 0;

    // Check monthly request limit
    if (requestCount >= MAX_MONTHLY_REQUESTS) {
      return res.status(400).json({
        success: false,
        error: 'Monthly request limit exceeded',
        message: `You have reached the maximum of ${MAX_MONTHLY_REQUESTS} EWA requests this month.`,
        code: 'MAX_REQUESTS_EXCEEDED',
        data: {
          currentRequests: requestCount,
          maxRequests: MAX_MONTHLY_REQUESTS,
        },
      });
    }

    // Calculate remaining available amount
    const remainingLimit = safeLimit - ytdWithdrawn;

    // ========================================================================
    // Step 6: Validate Amount Against Safe Limit
    // ========================================================================
    if (amount > remainingLimit) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient Funds',
        message: `Requested amount (RM ${amount.toFixed(2)}) exceeds your available limit (RM ${remainingLimit.toFixed(2)}).`,
        code: 'INSUFFICIENT_FUNDS',
        data: {
          requestedAmount: amount,
          daysWorked,
          dailyRate,
          accruedSalary,
          safeLimit,
          ytdWithdrawn,
          remainingLimit,
          safePercentage: SAFE_LIMIT_PERCENTAGE * 100,
        },
      });
    }

    // ========================================================================
    // Step 7: Insert EWA Transaction with Status 'PENDING'
    // ========================================================================
    const insertResult = await query<{ id: string; request_date: string }>(
      `INSERT INTO ewa_transactions (
        tenant_id,
        employee_id,
        request_date,
        requested_amount,
        safe_limit_snapshot,
        monthly_limit,
        ytd_amount_withdrawn,
        status,
        created_at
      ) VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5, $6, 'pending', CURRENT_TIMESTAMP)
      RETURNING id, request_date`,
      [
        employee.tenant_id,
        employeeId,
        amount,
        safeLimit,
        employee.monthly_ewa_limit,
        ytdWithdrawn + amount,
      ]
    );

    const transaction = insertResult.rows[0];

    // ========================================================================
    // Step 8: Return Success Response
    // ========================================================================
    const response: EWARequestResponse = {
      success: true,
      message: 'EWA request submitted successfully and pending approval',
      data: {
        transactionId: transaction.id,
        employeeId,
        requestedAmount: amount,
        accruedSalary,
        safeLimit,
        status: 'PENDING',
        createdAt: transaction.request_date,
      },
    };

    return res.status(201).json(response);
  } catch (error) {
    console.error('EWA request error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
});

// ============================================================================
// GET /api/ewa/balance/:employeeId
// ============================================================================

/**
 * Get EWA balance and eligibility for an employee
 */
ewaRouter.get('/balance/:employeeId', async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;

    // Get employee info
    const employeeResult = await query<Employee>(
      `SELECT 
        em.id,
        em.full_name,
        COALESCE(sc.daily_rate, sc.basic_salary / 26, 0) as daily_rate,
        COALESCE(sc.monthly_ewa_limit, 5000) as monthly_ewa_limit
       FROM employee_master em
       LEFT JOIN salary_config sc ON em.id = sc.employee_id AND sc.is_active = true
       WHERE em.id = $1 AND em.is_active = true`,
      [employeeId]
    );

    if (employeeResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found',
      });
    }

    const employee = employeeResult.rows[0];
    const dailyRate = Number(employee.daily_rate) || 0;

    // Calculate days worked this month
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstDayStr = firstDayOfMonth.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    const attendanceResult = await query<{ days_worked: number }>(
      `SELECT COUNT(DISTINCT attendance_date) as days_worked
       FROM attendance_ledger
       WHERE employee_id = $1
         AND attendance_date BETWEEN $2 AND $3
         AND verified_clock_in IS NOT NULL`,
      [employeeId, firstDayStr, todayStr]
    );

    const daysWorked = Number(attendanceResult.rows[0]?.days_worked) || 0;
    const accruedSalary = Math.round(dailyRate * daysWorked * 100) / 100;
    const safeLimit = Math.round(accruedSalary * SAFE_LIMIT_PERCENTAGE * 100) / 100;

    // Get YTD withdrawals
    const ytdResult = await query<{ total_withdrawn: number; request_count: number }>(
      `SELECT 
        COALESCE(SUM(requested_amount), 0) as total_withdrawn,
        COUNT(*) as request_count
       FROM ewa_transactions
       WHERE employee_id = $1
         AND request_date >= $2
         AND status IN ('pending', 'approved', 'processed')`,
      [employeeId, firstDayStr]
    );

    const ytdWithdrawn = Number(ytdResult.rows[0]?.total_withdrawn) || 0;
    const requestCount = Number(ytdResult.rows[0]?.request_count) || 0;
    const availableBalance = Math.max(0, safeLimit - ytdWithdrawn);

    return res.json({
      success: true,
      data: {
        employeeId,
        employeeName: employee.full_name,
        daysWorked,
        dailyRate,
        accruedSalary,
        safeLimit,
        ytdWithdrawn,
        availableBalance,
        monthlyRequestCount: requestCount,
        maxMonthlyRequests: MAX_MONTHLY_REQUESTS,
        remainingRequests: Math.max(0, MAX_MONTHLY_REQUESTS - requestCount),
        isEligible: availableBalance > 0 && requestCount < MAX_MONTHLY_REQUESTS,
      },
    });
  } catch (error) {
    console.error('Get EWA balance error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
    });
  }
});

// ============================================================================
// GET /api/ewa/history/:employeeId
// ============================================================================

/**
 * Get EWA transaction history for an employee
 */
ewaRouter.get('/history/:employeeId', async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const result = await query<EWATransaction>(
      `SELECT id, requested_amount, approved_amount, status, 
              request_date, approval_date, processing_date,
              rejected_reason, settlement_date
       FROM ewa_transactions
       WHERE employee_id = $1
       ORDER BY request_date DESC
       LIMIT $2 OFFSET $3`,
      [employeeId, Number(limit), Number(offset)]
    );

    return res.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
    });
  } catch (error) {
    console.error('Get EWA history error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
    });
  }
});

// ============================================================================
// GET /api/ewa/pending
// ============================================================================

/**
 * Get all pending EWA requests for the tenant (for managers to approve)
 */
ewaRouter.get('/pending', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Missing tenant information',
      });
    }

    // Get pending requests with employee details
    const result = await query<{
      id: string;
      employee_id: string;
      employee_name: string;
      department: string;
      requested_amount: number;
      safe_limit_snapshot: number;
      request_date: string;
      daily_rate: number;
      days_worked: number;
      accrued_salary: number;
    }>(
      `SELECT 
        et.id,
        et.employee_id,
        em.full_name as employee_name,
        em.department,
        et.requested_amount,
        et.safe_limit_snapshot,
        et.request_date,
        COALESCE(sc.daily_rate, sc.basic_salary / 26, 0) as daily_rate,
        -- Calculate days worked this month
        (SELECT COUNT(DISTINCT attendance_date) 
         FROM attendance_ledger al 
         WHERE al.employee_id = et.employee_id 
           AND al.attendance_date >= date_trunc('month', CURRENT_DATE)
           AND al.verified_clock_in IS NOT NULL
           AND al.verified_clock_out IS NOT NULL) as days_worked,
        -- Calculate accrued salary
        COALESCE(sc.daily_rate, sc.basic_salary / 26, 0) * 
          (SELECT COUNT(DISTINCT attendance_date) 
           FROM attendance_ledger al 
           WHERE al.employee_id = et.employee_id 
             AND al.attendance_date >= date_trunc('month', CURRENT_DATE)
             AND al.verified_clock_in IS NOT NULL
             AND al.verified_clock_out IS NOT NULL) as accrued_salary
       FROM ewa_transactions et
       JOIN employee_master em ON et.employee_id = em.id
       LEFT JOIN salary_config sc ON em.id = sc.employee_id AND sc.is_active = true
       WHERE et.tenant_id = $1 
         AND et.status = 'pending'
       ORDER BY et.request_date ASC`,
      [tenantId]
    );

    // Transform for frontend
    const pendingRequests = result.rows.map(row => ({
      id: row.id,
      employeeId: row.employee_id,
      name: row.employee_name,
      department: row.department || 'General',
      accruedSalary: Number(row.accrued_salary) || Number(row.safe_limit_snapshot) * 2,
      safeLimit: Number(row.safe_limit_snapshot),
      requestedAmount: Number(row.requested_amount),
      requestDate: row.request_date,
      daysWorked: Number(row.days_worked),
    }));

    return res.json({
      success: true,
      data: pendingRequests,
      count: result.rowCount,
    });
  } catch (error) {
    console.error('Get pending EWA requests error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
    });
  }
});

// ============================================================================
// PUT /api/ewa/:id/approve
// ============================================================================

/**
 * Approve an EWA request - sets status to 'disbursed'
 */
ewaRouter.put('/:id/approve', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;

    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Missing tenant information',
      });
    }

    // Verify the transaction exists and belongs to tenant
    const existing = await query<{ id: string; status: string; requested_amount: number }>(
      `SELECT id, status, requested_amount 
       FROM ewa_transactions 
       WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    if (existing.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'EWA transaction not found',
      });
    }

    if (existing.rows[0].status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Invalid Status',
        message: `Cannot approve transaction with status: ${existing.rows[0].status}`,
      });
    }

    // Update to approved/processed
    await query(
      `UPDATE ewa_transactions 
       SET status = 'approved',
           approved_amount = requested_amount,
           approval_date = CURRENT_TIMESTAMP,
           processing_date = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    return res.json({
      success: true,
      message: 'EWA request approved',
      data: {
        transactionId: id,
        status: 'approved',
        approvedAmount: existing.rows[0].requested_amount,
        approvedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Approve EWA request error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
    });
  }
});

// ============================================================================
// PUT /api/ewa/:id/reject
// ============================================================================

/**
 * Reject an EWA request
 */
ewaRouter.put('/:id/reject', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Missing tenant information',
      });
    }

    // Validate request body
    const validation = validateRequest(EWARejectSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: formatZodErrors(validation.errors),
      });
    }

    const { reason } = validation.data;

    // Verify the transaction exists and belongs to tenant
    const existing = await query<{ id: string; status: string }>(
      `SELECT id, status FROM ewa_transactions WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    if (existing.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'EWA transaction not found',
      });
    }

    if (existing.rows[0].status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Invalid Status',
        message: `Cannot reject transaction with status: ${existing.rows[0].status}`,
      });
    }

    // Update to rejected
    await query(
      `UPDATE ewa_transactions 
       SET status = 'rejected',
           rejected_reason = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId, reason]
    );

    return res.json({
      success: true,
      message: 'EWA request rejected',
      data: {
        transactionId: id,
        status: 'rejected',
        reason: reason,
        rejectedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Reject EWA request error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
    });
  }
});

export default ewaRouter;
