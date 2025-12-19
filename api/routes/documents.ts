/**
 * Documents API Routes
 * Handles payslip generation, EA forms, and document management
 */

import { Router, Request, Response } from 'express';
import { query } from '../lib/db';
import { z } from 'zod';

export const documentsRouter = Router();

// ============================================================================
// INTERFACES
// ============================================================================

interface EmployeeDocument {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  avatarUrl: string | null;
  netPay: number;
  status: 'Ready' | 'Generating' | 'Pending' | 'Error';
  documentType: 'payslip' | 'ea-form';
  period: string;
  generatedAt: string | null;
}

interface DocumentBatch {
  id: string;
  batchType: 'payslip' | 'ea-form';
  period: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  totalEmployees: number;
  processedCount: number;
  createdAt: string;
  completedAt: string | null;
}

// ============================================================================
// SCHEMAS
// ============================================================================

const GenerateBatchSchema = z.object({
  type: z.enum(['payslip', 'ea-form']),
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Period must be YYYY-MM format'),
  employeeIds: z.array(z.string().uuid()).optional(),
});

// ============================================================================
// GET /api/documents/employees - Get employees with document status
// ============================================================================

documentsRouter.get('/employees', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { type = 'payslip', period, limit = 100, offset = 0 } = req.query;

    // Get employees with their latest salary config
    const result = await query(
      `SELECT 
        em.id as "employeeId",
        em.full_name as "employeeName",
        em.employee_id as "employeeCode",
        COALESCE(em.department, 'General') as department,
        COALESCE(sc.basic_salary, 0) as "basicSalary"
       FROM employee_master em
       LEFT JOIN salary_config sc ON em.id = sc.employee_id AND sc.is_current = true
       WHERE em.tenant_id = $1 AND em.status = 'ACTIVE'
       ORDER BY em.full_name
       LIMIT $2 OFFSET $3`,
      [tenantId, Number(limit), Number(offset)]
    );

    // Transform to document format with simulated status
    const documents: EmployeeDocument[] = result.rows.map((row: any, idx: number) => {
      // Simulate document generation status based on index
      let status: EmployeeDocument['status'] = 'Ready';
      if (idx === 2) status = 'Generating';
      if (idx === 3) status = 'Pending';

      return {
        id: `doc-${row.employeeId}`,
        employeeId: row.employeeId,
        employeeName: row.employeeName,
        employeeCode: row.employeeCode,
        department: row.department,
        avatarUrl: idx % 3 === 0 ? null : `https://picsum.photos/id/${342 + idx}/100/100`,
        netPay: row.basicSalary * 0.85, // Approximate after deductions
        status,
        documentType: type as 'payslip' | 'ea-form',
        period: (period as string) || new Date().toISOString().slice(0, 7),
        generatedAt: status === 'Ready' ? new Date().toISOString() : null,
      };
    });

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM employee_master WHERE tenant_id = $1 AND status = 'ACTIVE'`,
      [tenantId]
    );

    return res.json({
      success: true,
      data: documents,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (err) {
    console.error('Documents employees GET error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// ============================================================================
// GET /api/documents/batches - Get document generation batches
// ============================================================================

documentsRouter.get('/batches', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // For now, return simulated batch data
    // In production, this would query a document_batches table
    const batches: DocumentBatch[] = [
      {
        id: 'batch-001',
        batchType: 'payslip',
        period: '2023-11',
        status: 'COMPLETED',
        totalEmployees: 142,
        processedCount: 142,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        completedAt: new Date(Date.now() - 82800000).toISOString(),
      },
      {
        id: 'batch-002',
        batchType: 'ea-form',
        period: '2023',
        status: 'PENDING',
        totalEmployees: 142,
        processedCount: 0,
        createdAt: new Date().toISOString(),
        completedAt: null,
      },
    ];

    return res.json({
      success: true,
      data: batches,
    });
  } catch (err) {
    console.error('Documents batches GET error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// ============================================================================
// POST /api/documents/generate - Generate documents batch
// ============================================================================

documentsRouter.post('/generate', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const validation = GenerateBatchSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const { type, period, employeeIds } = validation.data;

    // Count employees to process
    let employeeCount: number;
    if (employeeIds && employeeIds.length > 0) {
      employeeCount = employeeIds.length;
    } else {
      const countResult = await query(
        `SELECT COUNT(*) as total FROM employee_master WHERE tenant_id = $1 AND status = 'ACTIVE'`,
        [tenantId]
      );
      employeeCount = parseInt(countResult.rows[0].total);
    }

    // Create a simulated batch (in production, this would create a record and queue a job)
    const batchId = `batch-${Date.now()}`;
    const batch: DocumentBatch = {
      id: batchId,
      batchType: type,
      period,
      status: 'PROCESSING',
      totalEmployees: employeeCount,
      processedCount: 0,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };

    return res.status(201).json({
      success: true,
      message: `Started generating ${type} documents for ${employeeCount} employees`,
      data: batch,
    });
  } catch (err) {
    console.error('Documents generate error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// ============================================================================
// GET /api/documents/:employeeId/payslip/:period - Get payslip for employee
// ============================================================================

documentsRouter.get('/:employeeId/payslip/:period', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { employeeId, period } = req.params;

    // Get employee and salary info
    const empResult = await query(
      `SELECT 
        em.id, em.full_name, em.employee_id, em.department, em.designation, em.email,
        sc.basic_salary, sc.housing_allowance, sc.transport_allowance
       FROM employee_master em
       LEFT JOIN salary_config sc ON em.id = sc.employee_id AND sc.is_current = true
       WHERE em.id = $1 AND em.tenant_id = $2`,
      [employeeId, tenantId]
    );

    if (empResult.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    const emp = empResult.rows[0];
    const basicSalary = emp.basic_salary || 0;
    const housingAllowance = emp.housing_allowance || 0;
    const transportAllowance = emp.transport_allowance || 0;
    const grossSalary = basicSalary + housingAllowance + transportAllowance;

    // Calculate deductions (simplified)
    const epf = Math.round(basicSalary * 0.11 * 100) / 100;
    const socso = Math.min(Math.round(basicSalary * 0.005 * 100) / 100, 29.75);
    const eis = Math.min(Math.round(basicSalary * 0.002 * 100) / 100, 12);
    const pcb = Math.round(basicSalary * 0.05 * 100) / 100; // Simplified
    const totalDeductions = epf + socso + eis + pcb;
    const netPay = grossSalary - totalDeductions;

    return res.json({
      success: true,
      data: {
        employeeId,
        employeeName: emp.full_name,
        employeeCode: emp.employee_id,
        department: emp.department,
        designation: emp.designation,
        email: emp.email,
        period,
        earnings: {
          basicSalary,
          housingAllowance,
          transportAllowance,
          overtime: 0,
          bonus: 0,
          total: grossSalary,
        },
        deductions: {
          epf,
          socso,
          eis,
          pcb,
          total: totalDeductions,
        },
        netPay,
        payDate: `${period}-25`,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('Payslip GET error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// ============================================================================
// POST /api/documents/broadcast - Send documents via WhatsApp/Email
// ============================================================================

documentsRouter.post('/broadcast', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { channel = 'whatsapp', employeeIds } = req.body;

    // Simulate broadcast (in production, this would queue messages)
    const recipientCount = employeeIds?.length || 142;

    return res.json({
      success: true,
      message: `Documents queued for broadcast to ${recipientCount} employees via ${channel}`,
      data: {
        channel,
        recipientCount,
        queuedAt: new Date().toISOString(),
        estimatedDelivery: new Date(Date.now() + 300000).toISOString(), // 5 minutes
      },
    });
  } catch (err) {
    console.error('Broadcast error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});
