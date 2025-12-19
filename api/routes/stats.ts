/**
 * Dashboard Stats API Routes
 * GET /api/stats/summary
 */

import { Router, Response } from 'express';
import { query } from '../lib/db';
import { AuthenticatedRequest } from '../middleware/auth';

export const statsRouter = Router();

// ============================================================================
// INTERFACES
// ============================================================================

interface DashboardSummary {
  totalEmployees: number;
  newEmployeesThisMonth: number;
  pendingLeave: number;
  pendingAttendance: number;
  pendingEwa: number;
  nextPayrollDate: string | null;
  payrollCutoffDate: string | null;
}

// ============================================================================
// GET /api/stats/summary
// ============================================================================

/**
 * Get dashboard summary statistics
 */
statsRouter.get('/summary', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Missing tenant information',
      });
    }

    // Get total active employees
    const employeesResult = await query<{ count: number }>(
      `SELECT COUNT(*) as count 
       FROM employee_master 
       WHERE tenant_id = $1 AND is_active = true`,
      [tenantId]
    );
    const totalEmployees = Number(employeesResult.rows[0]?.count) || 0;

    // Get new employees this month
    const newEmployeesResult = await query<{ count: number }>(
      `SELECT COUNT(*) as count 
       FROM employee_master 
       WHERE tenant_id = $1 
         AND is_active = true 
         AND date_of_joining >= date_trunc('month', CURRENT_DATE)`,
      [tenantId]
    );
    const newEmployeesThisMonth = Number(newEmployeesResult.rows[0]?.count) || 0;

    // Get pending attendance interventions (missing punch or pending OT)
    const pendingAttendanceResult = await query<{ count: number }>(
      `SELECT COUNT(*) as count 
       FROM attendance_ledger 
       WHERE tenant_id = $1 
         AND (raw_clock_out IS NULL OR ot_approval_status = 'pending')
         AND attendance_date >= CURRENT_DATE - INTERVAL '30 days'`,
      [tenantId]
    );
    const pendingAttendance = Number(pendingAttendanceResult.rows[0]?.count) || 0;

    // Get pending EWA requests
    const pendingEwaResult = await query<{ count: number }>(
      `SELECT COUNT(*) as count 
       FROM ewa_transactions 
       WHERE tenant_id = $1 AND status = 'pending'`,
      [tenantId]
    );
    const pendingEwa = Number(pendingEwaResult.rows[0]?.count) || 0;

    // Calculate next payroll date (assume 28th of each month)
    const today = new Date();
    let nextPayrollDate = new Date(today.getFullYear(), today.getMonth(), 28);
    if (today.getDate() > 28) {
      nextPayrollDate = new Date(today.getFullYear(), today.getMonth() + 1, 28);
    }

    // Calculate cutoff date (3 days before payroll)
    const cutoffDate = new Date(nextPayrollDate);
    cutoffDate.setDate(cutoffDate.getDate() - 3);

    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    const summary: DashboardSummary = {
      totalEmployees,
      newEmployeesThisMonth,
      pendingLeave: 0, // TODO: Implement leave module
      pendingAttendance,
      pendingEwa,
      nextPayrollDate: formatDate(nextPayrollDate),
      payrollCutoffDate: formatDate(cutoffDate),
    };

    return res.json({
      success: true,
      data: summary,
    });

  } catch (error) {
    console.error('Get dashboard summary error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
    });
  }
});

export default statsRouter;
