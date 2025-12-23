import { Router, Request, Response } from 'express';
import { query } from '../lib/db';

export const statsRouter = Router();

statsRouter.get('/summary', async (req: Request, res: Response) => {
    try {
        // Cast to any to access user attached by middleware
        const user = (req as any).user;
        const tenantId = user?.tenantId;
        const role = user?.role || 'WORKER';
        const userId = user?.userId;

        if (!tenantId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        let data: any = {};

        // 1. GLOBAL STATS (Common to some, primarily Admin)
        const nextPayrollDateResult = await query(
            `SELECT MIN(payroll_month) as next_payroll_date
             FROM payroll_runs
             WHERE tenant_id = $1 AND status = 'draft'`,
            [tenantId]
        );
        data.nextPayrollDate = nextPayrollDateResult.rows[0]?.next_payroll_date || null;

        const payrollCutoffDateResult = await query(
            `SELECT (date_trunc('month', MIN(payroll_month)) + interval '24 days') as cutoff_date
             FROM payroll_runs
             WHERE tenant_id = $1 AND status = 'draft'`,
            [tenantId]
        );
        data.payrollCutoffDate = payrollCutoffDateResult.rows[0]?.cutoff_date || null;


        // 2. ROLE SPECIFIC BRANCHING
        if (role === 'HR_ADMIN') {
            // --- ADMIN VIEW: TOTAL ORG OVERVIEW ---
            const employeeCountResult = await query('SELECT COUNT(*) as count FROM employee_master WHERE tenant_id = $1 AND is_active = true', [tenantId]);
            data.totalEmployees = parseInt(employeeCountResult.rows[0].count, 10);

            const newEmployeesThisMonthResult = await query(
                `SELECT COUNT(*) as count
                 FROM employee_master
                 WHERE tenant_id = $1 AND date_of_joining >= date_trunc('month', CURRENT_DATE)`,
                [tenantId]
            );
            data.newEmployeesThisMonth = parseInt(newEmployeesThisMonthResult.rows[0].count, 10);

            const missingPunchResult = await query(
                `SELECT COUNT(*) as count 
                 FROM attendance_ledger 
                 WHERE tenant_id = $1 
                   AND attendance_date = CURRENT_DATE 
                   AND (verified_clock_in IS NULL OR verified_clock_out IS NULL)`,
                [tenantId]
            );
            data.pendingAttendance = parseInt(missingPunchResult.rows[0].count, 10);

            const pendingEwaResult = await query(
                `SELECT COUNT(*) as count FROM ewa_transactions WHERE tenant_id = $1 AND status = 'pending'`,
                [tenantId]
            );
            data.pendingEwa = parseInt(pendingEwaResult.rows[0].count, 10);
            data.pendingLeave = 0;

        } else if (role === 'MANAGER') {
            // --- MANAGER VIEW: TEAM OVERVIEW ---
            // Get Manager's Department
            const mgrResult = await query(`SELECT department FROM employee_master WHERE id = $1`, [userId]);
            const department = mgrResult.rows[0]?.department;

            if (department) {
                const teamCountResult = await query(
                    `SELECT COUNT(*) as count FROM employee_master WHERE tenant_id = $1 AND department = $2 AND is_active = true`,
                    [tenantId, department]
                );
                data.totalEmployees = parseInt(teamCountResult.rows[0].count, 10); // "My Team" Size
            } else {
                data.totalEmployees = 0;
            }

            // Pending Approvals assigned to this manager (or their dept)
            // For now, assuming managers see all pending approvals for their dept
            const pendingResult = await query(
                `SELECT COUNT(*) as count 
                 FROM approval_requests ar
                 JOIN employee_master em ON ar.employee_id = em.employee_id
                 WHERE em.department = $1 AND ar.status = 'PENDING'`,
                [department]
            );
            data.pendingAttendance = parseInt(pendingResult.rows[0].count, 10); // Reusing field for "Pending Approvals"
            data.newEmployeesThisMonth = 0;
            data.pendingEwa = 0;

        } else {
            // --- WORKER VIEW: PERSONAL OVERVIEW ---
            data.totalEmployees = 1; // Just "Me"

            // Check own missing punches
            const myMissingPunch = await query(
                `SELECT COUNT(*) as count 
                 FROM attendance_ledger 
                 WHERE employee_id = $1 
                   AND (verified_clock_in IS NULL OR verified_clock_out IS NULL)
                   AND attendance_date < CURRENT_DATE`,
                [userId]
            );
            data.pendingAttendance = parseInt(myMissingPunch.rows[0].count, 10); // "My Issues"
            data.newEmployeesThisMonth = 0;
            data.pendingEwa = 0;
        }

        res.json({
            success: true,
            data
        });
    } catch (err) {
        console.error('Stats summary GET error:', err);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});