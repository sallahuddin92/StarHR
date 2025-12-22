import { Router, Request, Response } from 'express';
import { query } from '../lib/db';

export const statsRouter = Router();

statsRouter.get('/summary', async (req: Request, res: Response) => {
    try {
        const tenantId = (req as any).user?.tenantId;
        if (!tenantId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const employeeCountResult = await query('SELECT COUNT(*) as count FROM employee_master WHERE tenant_id = $1 AND is_active = true', [tenantId]);
        const totalEmployees = parseInt(employeeCountResult.rows[0].count, 10);

        const missingPunchResult = await query(
            `SELECT COUNT(*) as count 
             FROM attendance_ledger 
             WHERE tenant_id = $1 
               AND attendance_date = CURRENT_DATE 
               AND (verified_clock_in IS NULL OR verified_clock_out IS NULL)`,
            [tenantId]
        );
        const missingPunchCount = parseInt(missingPunchResult.rows[0].count, 10);

        const pendingEwaResult = await query(
            `SELECT COUNT(*) as count 
             FROM ewa_transactions 
             WHERE tenant_id = $1 
               AND status = 'pending'`,
            [tenantId]
        );
        const pendingEwaCount = parseInt(pendingEwaResult.rows[0].count, 10);

        const nextPayrollDateResult = await query(
            `SELECT MIN(payroll_month) as next_payroll_date
             FROM payroll_runs
             WHERE tenant_id = $1 AND status = 'draft'`,
            [tenantId]
        );
        const nextPayrollDate = nextPayrollDateResult.rows[0].next_payroll_date;

        const newEmployeesThisMonthResult = await query(
            `SELECT COUNT(*) as count
             FROM employee_master
             WHERE tenant_id = $1 AND date_of_joining >= date_trunc('month', CURRENT_DATE)`,
            [tenantId]
        );

        const newEmployeesThisMonth = parseInt(newEmployeesThisMonthResult.rows[0].count, 10);
        
        const payrollCutoffDateResult = await query(
            `SELECT (date_trunc('month', MIN(payroll_month)) + interval '24 days') as cutoff_date
             FROM payroll_runs
             WHERE tenant_id = $1 AND status = 'draft'`,
            [tenantId]
        );
        const payrollCutoffDate = payrollCutoffDateResult.rows[0].cutoff_date;


        const pendingLeave = 0; // TODO: Implement this when leave module is added

        res.json({
            success: true,
            data: {
                totalEmployees,
                pendingLeave,
                pendingAttendance: missingPunchCount,
                pendingEwa: pendingEwaCount,
                nextPayrollDate: nextPayrollDate,
                newEmployeesThisMonth: newEmployeesThisMonth,
                payrollCutoffDate: payrollCutoffDate

            },
        });
    } catch (err) {
        console.error('Stats summary GET error:', err);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});