import { Router, Response } from 'express';
import { z } from 'zod';
import { query } from '../lib/db';
import { formatZodErrors } from '../lib/validation';
import { AuthenticatedRequest } from '../middleware/auth';

export const employeesRouter = Router();

const CreateEmployeeSchema = z.object({
  employeeId: z.string().min(1),
  fullName: z.string().min(1),
  email: z.string().email(),
  phoneNumber: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  employmentType: z.string().optional(),
  dateOfJoining: z
    .string()
    .regex(/\d{4}-\d{2}-\d{2}/, 'YYYY-MM-DD format expected')
    .optional(),
  isActive: z.boolean().optional(),
});

const UpdateEmployeeSchema = CreateEmployeeSchema.partial();

// GET /api/employees
employeesRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await query(
      `SELECT id, tenant_id, employee_id, full_name, email, phone_number, department, designation, employment_type, date_of_joining, is_active
       FROM employee_master
       WHERE tenant_id = $1
       ORDER BY full_name ASC`,
      [tenantId]
    );

    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Employees GET error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/employees
employeesRouter.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Unauthorized' });

    const parsed = CreateEmployeeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: 'Validation Error', details: formatZodErrors(parsed.error.errors) });
    }

    const {
      employeeId,
      fullName,
      email,
      phoneNumber,
      department,
      designation,
      employmentType,
      dateOfJoining,
      isActive = true,
    } = parsed.data;

    try {
      const insert = await query<{ id: string }>(
        `INSERT INTO employee_master (
          tenant_id, employee_id, full_name, email, phone_number, department, designation, employment_type, date_of_joining, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id`,
        [
          tenantId,
          employeeId,
          fullName,
          email,
          phoneNumber,
          department,
          designation,
          employmentType,
          dateOfJoining,
          isActive,
        ]
      );

      return res.status(201).json({ success: true, data: { id: insert.rows[0].id } });
    } catch (dbErr: any) {
      const message = dbErr?.message || '';
      if (message.includes('employee_unique_per_tenant')) {
        return res.status(409).json({ error: 'Employee already exists for this tenant' });
      }
      throw dbErr;
    }
  } catch (err) {
    console.error('Employees POST error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT /api/employees/:id
employeesRouter.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Unauthorized' });

    const employeeId = req.params.id;
    const parsed = UpdateEmployeeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: 'Validation Error', details: formatZodErrors(parsed.error.errors) });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    const mapField = (column: string, value: unknown) => {
      updates.push(`${column} = $${idx}`);
      values.push(value);
      idx += 1;
    };

    const data = parsed.data;
    if (data.employeeId) mapField('employee_id', data.employeeId);
    if (data.fullName) mapField('full_name', data.fullName);
    if (data.email) mapField('email', data.email);
    if (data.phoneNumber !== undefined) mapField('phone_number', data.phoneNumber);
    if (data.department !== undefined) mapField('department', data.department);
    if (data.designation !== undefined) mapField('designation', data.designation);
    if (data.employmentType !== undefined) mapField('employment_type', data.employmentType);
    if (data.dateOfJoining !== undefined) mapField('date_of_joining', data.dateOfJoining);
    if (data.isActive !== undefined) mapField('is_active', data.isActive);

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields provided to update' });
    }

    // tenant guard
    values.push(tenantId);
    const tenantParam = idx;
    idx += 1;
    values.push(employeeId);
    const idParam = idx;

    const updateSql = `UPDATE employee_master
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $${tenantParam} AND id = $${idParam}
      RETURNING id`;

    const result = await query(updateSql, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Employee not found for this tenant' });
    }

    return res.json({ success: true, data: { id: result.rows[0].id } });
  } catch (err) {
    console.error('Employees PUT error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default employeesRouter;
