/**
 * Approvals API Routes
 * Handles OT requests, leave requests, and other approval workflows
 */

import { Router, Request, Response } from 'express';
import { query } from '../lib/db';
import { z } from 'zod';

export const approvalsRouter = Router();

// ============================================================================
// INTERFACES
// ============================================================================

interface ApprovalRequest {
  id: string;
  type: 'OT' | 'LEAVE' | 'CLAIM';
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  designation: string;
  avatarUrl: string | null;
  submittedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  currentStep: number;
  totalSteps: number;
  details: Record<string, unknown>;
}

// ============================================================================
// SCHEMAS
// ============================================================================

const ApproveRequestSchema = z.object({
  notes: z.string().optional(),
});

const RejectRequestSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required'),
});

// ============================================================================
// GET /api/approvals/pending - Get pending approval requests
// ============================================================================

approvalsRouter.get('/pending', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { type, limit = 50 } = req.query;

    // Query OT approval requests from attendance_ledger
    let whereClause = `WHERE al.tenant_id = $1 AND al.ot_approval_status = 'PENDING' AND al.ot_requested_hours > 0`;
    const params: any[] = [tenantId];

    if (type && type !== 'ALL') {
      // Future: filter by type (OT, LEAVE, CLAIM)
    }

    params.push(Number(limit));

    const result = await query(
      `SELECT 
        al.id,
        'OT' as type,
        al.employee_id as "employeeId",
        em.full_name as "employeeName",
        em.employee_id as "employeeCode",
        COALESCE(em.department, 'General') as department,
        COALESCE(em.designation, 'Staff') as designation,
        al.created_at as "submittedAt",
        al.ot_approval_status as status,
        1 as "currentStep",
        3 as "totalSteps",
        al.attendance_date,
        al.raw_clock_in,
        al.raw_clock_out,
        al.ot_requested_hours as "requestedHours",
        al.notes
       FROM attendance_ledger al
       JOIN employee_master em ON al.employee_id = em.id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT $2`,
      params
    );

    // Transform rows to ApprovalRequest format
    const approvals: ApprovalRequest[] = result.rows.map((row: any, idx: number) => ({
      id: row.id,
      type: row.type,
      employeeId: row.employeeId,
      employeeName: row.employeeName,
      employeeCode: row.employeeCode,
      department: row.department,
      designation: row.designation,
      avatarUrl: `https://picsum.photos/id/${342 + idx}/140/140`,
      submittedAt: row.submittedAt,
      status: row.status,
      currentStep: row.currentStep,
      totalSteps: row.totalSteps,
      details: {
        attendanceDate: row.attendance_date,
        clockIn: row.raw_clock_in,
        clockOut: row.raw_clock_out,
        requestedHours: row.requestedHours,
        notes: row.notes,
      },
    }));

    return res.json({
      success: true,
      data: approvals,
      count: approvals.length,
    });
  } catch (err) {
    console.error('Approvals GET error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// ============================================================================
// GET /api/approvals/:id - Get single approval request details
// ============================================================================

approvalsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { id } = req.params;

    const result = await query(
      `SELECT 
        al.id,
        'OT' as type,
        al.employee_id as "employeeId",
        em.full_name as "employeeName",
        em.employee_id as "employeeCode",
        COALESCE(em.department, 'General') as department,
        COALESCE(em.designation, 'Staff') as designation,
        al.created_at as "submittedAt",
        al.ot_approval_status as status,
        1 as "currentStep",
        3 as "totalSteps",
        al.attendance_date,
        al.raw_clock_in,
        al.raw_clock_out,
        al.ot_requested_hours as "requestedHours",
        al.ot_approved_hours as "approvedHours",
        al.notes,
        al.updated_at
       FROM attendance_ledger al
       JOIN employee_master em ON al.employee_id = em.id
       WHERE al.id = $1 AND al.tenant_id = $2`,
      [id, tenantId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Request not found' });
    }

    const row = result.rows[0];
    const approval: ApprovalRequest = {
      id: row.id,
      type: row.type,
      employeeId: row.employeeId,
      employeeName: row.employeeName,
      employeeCode: row.employeeCode,
      department: row.department,
      designation: row.designation,
      avatarUrl: `https://picsum.photos/id/342/140/140`,
      submittedAt: row.submittedAt,
      status: row.status,
      currentStep: row.currentStep,
      totalSteps: row.totalSteps,
      details: {
        attendanceDate: row.attendance_date,
        clockIn: row.raw_clock_in,
        clockOut: row.raw_clock_out,
        requestedHours: row.requestedHours,
        approvedHours: row.approvedHours,
        notes: row.notes,
        updatedAt: row.updated_at,
      },
    };

    return res.json({ success: true, data: approval });
  } catch (err) {
    console.error('Approval GET by ID error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// ============================================================================
// PUT /api/approvals/:id/approve - Approve a request
// ============================================================================

approvalsRouter.put('/:id/approve', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const userId = (req as any).user?.id;
    if (!tenantId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { id } = req.params;
    const validation = ApproveRequestSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const { notes } = validation.data;

    // Update the attendance record to approved
    const result = await query(
      `UPDATE attendance_ledger 
       SET ot_approval_status = 'APPROVED',
           ot_approved_hours = ot_requested_hours,
           approved_by = $1,
           approval_notes = $2,
           updated_at = NOW()
       WHERE id = $3 AND tenant_id = $4 AND ot_approval_status = 'PENDING'
       RETURNING id, ot_requested_hours, ot_approved_hours`,
      [userId, notes || null, id, tenantId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Request not found or already processed',
      });
    }

    return res.json({
      success: true,
      message: 'Request approved successfully',
      data: {
        id,
        status: 'APPROVED',
        approvedHours: result.rows[0].ot_approved_hours,
      },
    });
  } catch (err) {
    console.error('Approval APPROVE error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// ============================================================================
// PUT /api/approvals/:id/reject - Reject a request
// ============================================================================

approvalsRouter.put('/:id/reject', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const userId = (req as any).user?.id;
    if (!tenantId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { id } = req.params;
    const validation = RejectRequestSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const { reason } = validation.data;

    // Update the attendance record to rejected
    const result = await query(
      `UPDATE attendance_ledger 
       SET ot_approval_status = 'REJECTED',
           ot_approved_hours = 0,
           approved_by = $1,
           approval_notes = $2,
           updated_at = NOW()
       WHERE id = $3 AND tenant_id = $4 AND ot_approval_status = 'PENDING'
       RETURNING id`,
      [userId, reason, id, tenantId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Request not found or already processed',
      });
    }

    return res.json({
      success: true,
      message: 'Request rejected',
      data: {
        id,
        status: 'REJECTED',
        reason,
      },
    });
  } catch (err) {
    console.error('Approval REJECT error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// ============================================================================
// GET /api/approvals/history - Get approval history
// ============================================================================

approvalsRouter.get('/history/all', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { status, limit = 50, offset = 0 } = req.query;

    let whereClause = `WHERE al.tenant_id = $1 AND al.ot_approval_status != 'PENDING'`;
    const params: any[] = [tenantId];
    let idx = 2;

    if (status && status !== 'ALL') {
      whereClause += ` AND al.ot_approval_status = $${idx}`;
      params.push(status);
      idx++;
    }

    params.push(Number(limit), Number(offset));

    const result = await query(
      `SELECT 
        al.id,
        'OT' as type,
        em.full_name as "employeeName",
        em.employee_id as "employeeCode",
        al.ot_approval_status as status,
        al.ot_requested_hours as "requestedHours",
        al.ot_approved_hours as "approvedHours",
        al.attendance_date,
        al.updated_at as "processedAt",
        al.approval_notes as notes
       FROM attendance_ledger al
       JOIN employee_master em ON al.employee_id = em.id
       ${whereClause}
       ORDER BY al.updated_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    return res.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
    });
  } catch (err) {
    console.error('Approvals history error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});
