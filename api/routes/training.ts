/**
 * Training Management API Routes
 *
 * Implements:
 * - Training course CRUD
 * - Training event management
 * - Worker allocation
 * - Attendance marking
 * - Completion confirmation (triggers RL credit)
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { query } from '../lib/db';
import { AuthenticatedRequest, requireHRAdmin } from '../middleware/auth';

const trainingRouter = Router();

// ============================================================================
// SCHEMAS
// ============================================================================

const CourseSchema = z.object({
  code: z.string().min(1).max(50),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  category: z.string().max(100).optional(),
  duration_hours: z.number().positive().optional(),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
  instructor: z.string().max(200).optional(),
  max_capacity: z.number().int().positive().optional(),
  is_mandatory: z.boolean().optional(),
  rl_eligible: z.boolean().optional(),
  rl_rule_id: z.string().uuid().nullable().optional(),
  is_test: z.boolean().optional(),
  eligible_departments: z.array(z.string()).optional(),
  eligible_grades: z.array(z.string()).optional(),
  eligible_roles: z.array(z.string()).optional(),
});

// ============================================================================
// AUDIT LOGGING HELPER
// ============================================================================

async function logAudit(
  tenantId: string,
  userId: string,
  actionType: string,
  entityType: string,
  entityId: string,
  description: string,
  details?: Record<string, any>,
  isTest: boolean = false
): Promise<void> {
  try {
    await query(
      `
            INSERT INTO training_audit_log (
                tenant_id, action_type, entity_type, entity_id,
                description, details, performed_by, is_test
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
      [
        tenantId,
        actionType,
        entityType,
        entityId,
        description,
        details ? JSON.stringify(details) : null,
        userId,
        isTest,
      ]
    );
  } catch (err) {
    console.error('Audit log error:', err);
    // Don't throw - audit failures shouldn't block operations
  }
}

const EventSchema = z.object({
  training_id: z.string().uuid(),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  event_end_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  event_time_start: z.string().optional(),
  event_time_end: z.string().optional(),
  location: z.string().max(200).optional(),
  location_type: z.enum(['ONSITE', 'OFFSITE', 'ONLINE', 'HYBRID']).optional(),
  day_type: z.enum(['WORKING_DAY', 'OFF_DAY', 'REST_DAY', 'PUBLIC_HOLIDAY']),
  rl_eligible: z.boolean().optional(),
  max_participants: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

const AllocationSchema = z.object({
  employee_ids: z.array(z.string().uuid()).min(1),
  rl_eligible: z.boolean().optional(),
});

const AttendanceSchema = z.object({
  attendance_status: z.enum(['PENDING', 'ATTENDED', 'NO_SHOW', 'PARTIAL', 'EXCUSED']),
  hours_attended: z.number().positive().optional(),
});

const CompletionSchema = z.object({
  completion_status: z.enum(['COMPLETED', 'INCOMPLETE', 'FAILED']),
  completion_notes: z.string().optional(),
});

// ============================================================================
// COURSES ENDPOINTS
// ============================================================================

/**
 * GET /api/training/courses
 * List all training courses
 */
trainingRouter.get('/courses', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { category, is_active, is_test, is_archived } = req.query;

    let sql = `
      SELECT 
        tm.*,
        rlr.rule_name as rl_rule_name,
        COUNT(DISTINCT te.id) as event_count,
        COUNT(DISTINCT ta.id) as total_allocations
      FROM training_master tm
      LEFT JOIN replacement_leave_rule rlr ON tm.rl_rule_id = rlr.id
      LEFT JOIN training_event te ON te.training_id = tm.id
      LEFT JOIN training_allocation ta ON ta.training_event_id = te.id
      WHERE tm.tenant_id = $1
    `;
    const params: any[] = [tenantId];

    if (category) {
      params.push(category);
      sql += ` AND tm.category = $${params.length}`;
    }

    if (is_active !== undefined) {
      params.push(is_active === 'true');
      sql += ` AND tm.is_active = $${params.length}`;
    }

    // Filter by test flag
    if (is_test !== undefined) {
      params.push(is_test === 'true');
      sql += ` AND COALESCE(tm.is_test, false) = $${params.length}`;
    }

    // Filter by archived flag (default: hide archived)
    if (is_archived !== undefined) {
      params.push(is_archived === 'true');
      sql += ` AND COALESCE(tm.is_archived, false) = $${params.length}`;
    } else {
      // By default, hide archived
      sql += ` AND COALESCE(tm.is_archived, false) = false`;
    }

    sql += ` GROUP BY tm.id, rlr.rule_name ORDER BY tm.is_test DESC, tm.title`;

    const result = await query(sql, params);

    return res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    console.error('Error fetching courses:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET /api/training/courses/:id
 * Get single course details
 */
trainingRouter.get('/courses/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const result = await query(
      `
      SELECT 
        tm.*,
        rlr.rule_name as rl_rule_name,
        rlr.credit_days as rl_credit_days
      FROM training_master tm
      LEFT JOIN replacement_leave_rule rlr ON tm.rl_rule_id = rlr.id
      WHERE tm.id = $1 AND tm.tenant_id = $2
    `,
      [id, tenantId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    return res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    console.error('Error fetching course:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * POST /api/training/courses
 * Create new training course (HR Admin only)
 */
trainingRouter.post(
  '/courses',
  requireHRAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.userId;

      const parseResult = CourseSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res
          .status(400)
          .json({ error: 'Validation Error', details: parseResult.error.format() });
      }

      const data = parseResult.data;

      const result = await query<{ id: string }>(
        `
      INSERT INTO training_master (
        tenant_id, code, title, description, category,
        duration_hours, level, instructor, max_capacity,
        is_mandatory, rl_eligible, rl_rule_id, created_by,
        is_test, eligible_departments, eligible_grades, eligible_roles
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING id
    `,
        [
          tenantId,
          data.code,
          data.title,
          data.description || null,
          data.category || null,
          data.duration_hours || null,
          data.level || null,
          data.instructor || null,
          data.max_capacity || null,
          data.is_mandatory ?? false,
          data.rl_eligible ?? true,
          data.rl_rule_id || null,
          userId,
          data.is_test ?? false,
          data.eligible_departments || null,
          data.eligible_grades || null,
          data.eligible_roles || null,
        ]
      );

      const courseId = result.rows[0].id;

      // Audit log
      await logAudit(
        tenantId,
        userId,
        'CREATE',
        'TRAINING',
        courseId,
        `Created training: ${data.title} (${data.code})${data.is_test ? ' [TEST]' : ''}`,
        { code: data.code, title: data.title, is_test: data.is_test ?? false },
        data.is_test ?? false
      );

      return res.status(201).json({
        success: true,
        message: `Training course created${data.is_test ? ' (TEST)' : ''}`,
        id: courseId,
      });
    } catch (err: any) {
      if (err.code === '23505') {
        return res.status(409).json({ error: 'Course code already exists' });
      }
      console.error('Error creating course:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

/**
 * PUT /api/training/courses/:id
 * Update training course (HR Admin only)
 */
trainingRouter.put(
  '/courses/:id',
  requireHRAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.userId;
      const { id } = req.params;

      const parseResult = CourseSchema.partial().safeParse(req.body);
      if (!parseResult.success) {
        return res
          .status(400)
          .json({ error: 'Validation Error', details: parseResult.error.format() });
      }

      const data = parseResult.data;
      const fields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          fields.push(`${key} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      });

      if (fields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      fields.push(`updated_by = $${paramCount}`);
      values.push(userId);
      paramCount++;

      values.push(id, tenantId);

      const result = await query(
        `
      UPDATE training_master 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount} AND tenant_id = $${paramCount + 1}
      RETURNING id
    `,
        values
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Course not found' });
      }

      return res.json({
        success: true,
        message: 'Training course updated',
      });
    } catch (err) {
      console.error('Error updating course:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

/**
 * DELETE /api/training/courses/:id
 * Soft-delete training course (HR Admin only)
 */
trainingRouter.delete(
  '/courses/:id',
  requireHRAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const { id } = req.params;

      const result = await query(
        `
      UPDATE training_master 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND tenant_id = $2
      RETURNING id
    `,
        [id, tenantId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Course not found' });
      }

      return res.json({
        success: true,
        message: 'Training course deactivated',
      });
    } catch (err) {
      console.error('Error deleting course:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

// ============================================================================
// EVENTS ENDPOINTS
// ============================================================================

/**
 * GET /api/training/events
 * List training events
 */
trainingRouter.get('/events', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { training_id, status, from_date, to_date } = req.query;

    let sql = `
      SELECT 
        te.*,
        tm.code as training_code,
        tm.title as training_title,
        tm.category as training_category,
        tm.duration_hours,
        tm.rl_eligible as training_rl_eligible,
        tm.rl_rule_id,
        rlr.rule_name as rl_rule_name,
        rlr.credit_days as rl_credit_days,
        COUNT(ta.id) as allocation_count,
        COUNT(CASE WHEN ta.attendance_status = 'ATTENDED' THEN 1 END) as attended_count,
        COUNT(CASE WHEN ta.completion_status = 'COMPLETED' THEN 1 END) as completed_count
      FROM training_event te
      JOIN training_master tm ON te.training_id = tm.id
      LEFT JOIN replacement_leave_rule rlr ON tm.rl_rule_id = rlr.id
      LEFT JOIN training_allocation ta ON ta.training_event_id = te.id
      WHERE te.tenant_id = $1
    `;
    const params: any[] = [tenantId];

    if (training_id) {
      params.push(training_id);
      sql += ` AND te.training_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      sql += ` AND te.status = $${params.length}`;
    }

    if (from_date) {
      params.push(from_date);
      sql += ` AND te.event_date >= $${params.length}`;
    }

    if (to_date) {
      params.push(to_date);
      sql += ` AND te.event_date <= $${params.length}`;
    }

    sql += ` GROUP BY te.id, tm.code, tm.title, tm.category, tm.duration_hours, tm.rl_eligible, tm.rl_rule_id, rlr.rule_name, rlr.credit_days
             ORDER BY te.event_date DESC`;

    const result = await query(sql, params);

    return res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    console.error('Error fetching events:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * POST /api/training/events
 * Create training event (HR Admin only)
 */
trainingRouter.post('/events', requireHRAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;

    const parseResult = EventSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res
        .status(400)
        .json({ error: 'Validation Error', details: parseResult.error.format() });
    }

    const data = parseResult.data;

    // Verify training exists
    const trainingCheck = await query(
      `SELECT id FROM training_master WHERE id = $1 AND tenant_id = $2`,
      [data.training_id, tenantId]
    );

    if (trainingCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Training course not found' });
    }

    const result = await query<{ id: string }>(
      `
      INSERT INTO training_event (
        tenant_id, training_id, event_date, event_end_date,
        event_time_start, event_time_end, location, location_type,
        day_type, rl_eligible, max_participants, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id
    `,
      [
        tenantId,
        data.training_id,
        data.event_date,
        data.event_end_date || null,
        data.event_time_start || null,
        data.event_time_end || null,
        data.location || null,
        data.location_type || null,
        data.day_type,
        data.rl_eligible ?? true,
        data.max_participants || null,
        data.notes || null,
        userId,
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Training event created',
      id: result.rows[0].id,
    });
  } catch (err) {
    console.error('Error creating event:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * PUT /api/training/events/:id/status
 * Update event status (HR Admin only)
 */
trainingRouter.put(
  '/events/:id/status',
  requireHRAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ['DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const result = await query(
        `
      UPDATE training_event 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND tenant_id = $3
      RETURNING id
    `,
        [status, id, tenantId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Event not found' });
      }

      return res.json({
        success: true,
        message: 'Event status updated',
      });
    } catch (err) {
      console.error('Error updating event status:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

// ============================================================================
// ALLOCATION ENDPOINTS
// ============================================================================

/**
 * GET /api/training/events/:id/allocations
 * Get allocations for an event
 */
trainingRouter.get('/events/:id/allocations', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const result = await query(
      `
      SELECT 
        ta.*,
        em.employee_id as employee_code,
        em.full_name as employee_name,
        em.department,
        em.designation,
        allocator.full_name as allocated_by_name,
        completer.full_name as completion_confirmed_by_name,
        rlc.id as rl_credit_id,
        rlc.status as rl_credit_status,
        rlc.days_credited as rl_days_credited
      FROM training_allocation ta
      JOIN employee_master em ON ta.employee_id = em.id
      LEFT JOIN employee_master allocator ON ta.allocated_by = allocator.id
      LEFT JOIN employee_master completer ON ta.completion_confirmed_by = completer.id
      LEFT JOIN replacement_leave_credit rlc ON ta.rl_credit_id = rlc.id
      WHERE ta.training_event_id = $1 AND ta.tenant_id = $2
      ORDER BY em.full_name
    `,
      [id, tenantId]
    );

    return res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    console.error('Error fetching allocations:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * POST /api/training/events/:id/allocate
 * Allocate workers to training event (HR Admin only)
 */
trainingRouter.post(
  '/events/:id/allocate',
  requireHRAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.userId;
      const eventId = req.params.id;

      const parseResult = AllocationSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res
          .status(400)
          .json({ error: 'Validation Error', details: parseResult.error.format() });
      }

      const { employee_ids, rl_eligible } = parseResult.data;

      // Get event details including RL rule
      const eventResult = await query<{
        id: string;
        rl_eligible: boolean;
        training_id: string;
        day_type: string;
      }>(
        `
      SELECT te.id, te.rl_eligible, te.training_id, te.day_type,
             tm.rl_rule_id, rlr.credit_days
      FROM training_event te
      JOIN training_master tm ON te.training_id = tm.id
      LEFT JOIN replacement_leave_rule rlr ON tm.rl_rule_id = rlr.id
      WHERE te.id = $1 AND te.tenant_id = $2
    `,
        [eventId, tenantId]
      );

      if (eventResult.rowCount === 0) {
        return res.status(404).json({ error: 'Training event not found' });
      }

      const event = eventResult.rows[0];
      const potentialRlDays = (event as any).credit_days || 1;

      // Insert allocations
      const inserted: string[] = [];
      const skipped: string[] = [];

      for (const employeeId of employee_ids) {
        try {
          await query(
            `
          INSERT INTO training_allocation (
            tenant_id, training_event_id, employee_id, allocated_by,
            rl_eligible, rl_days_potential
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `,
            [
              tenantId,
              eventId,
              employeeId,
              userId,
              rl_eligible ?? event.rl_eligible,
              potentialRlDays,
            ]
          );
          inserted.push(employeeId);
        } catch (err: any) {
          if (err.code === '23505') {
            skipped.push(employeeId);
          } else {
            throw err;
          }
        }
      }

      return res.status(201).json({
        success: true,
        message: `Allocated ${inserted.length} worker(s)`,
        allocated: inserted.length,
        skipped: skipped.length,
        skipped_ids: skipped,
      });
    } catch (err) {
      console.error('Error allocating workers:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

/**
 * DELETE /api/training/allocations/:id
 * Remove allocation (HR Admin only)
 */
trainingRouter.delete(
  '/allocations/:id',
  requireHRAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const { id } = req.params;

      // Check if already has RL credit
      const check = await query(
        `SELECT rl_credit_id FROM training_allocation WHERE id = $1 AND tenant_id = $2`,
        [id, tenantId]
      );

      if (check.rowCount === 0) {
        return res.status(404).json({ error: 'Allocation not found' });
      }

      if (check.rows[0].rl_credit_id) {
        return res
          .status(400)
          .json({ error: 'Cannot remove allocation with RL credit already granted' });
      }

      await query(`DELETE FROM training_allocation WHERE id = $1 AND tenant_id = $2`, [
        id,
        tenantId,
      ]);

      return res.json({
        success: true,
        message: 'Allocation removed',
      });
    } catch (err) {
      console.error('Error removing allocation:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

/**
 * PUT /api/training/allocations/:id/attendance
 * Mark attendance (HR Admin only)
 */
trainingRouter.put(
  '/allocations/:id/attendance',
  requireHRAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.userId;
      const { id } = req.params;

      const parseResult = AttendanceSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res
          .status(400)
          .json({ error: 'Validation Error', details: parseResult.error.format() });
      }

      const { attendance_status, hours_attended } = parseResult.data;

      const result = await query(
        `
      UPDATE training_allocation 
      SET attendance_status = $1, 
          hours_attended = $2,
          attendance_marked_by = $3,
          attendance_marked_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 AND tenant_id = $5
      RETURNING id
    `,
        [attendance_status, hours_attended || null, userId, id, tenantId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Allocation not found' });
      }

      return res.json({
        success: true,
        message: 'Attendance marked',
      });
    } catch (err) {
      console.error('Error marking attendance:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

/**
 * POST /api/training/allocations/:id/complete
 * Confirm completion and grant RL credit (HR Admin only)
 *
 * CRITICAL: This is the trigger for RL credit creation
 * - Validates attendance was marked
 * - Prevents self-approval
 * - Creates approved RL credit linked to this allocation
 */
trainingRouter.post(
  '/allocations/:id/complete',
  requireHRAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.userId;
      const { id } = req.params;

      const parseResult = CompletionSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res
          .status(400)
          .json({ error: 'Validation Error', details: parseResult.error.format() });
      }

      const { completion_status, completion_notes } = parseResult.data;

      // Get allocation with event and training details
      const allocationResult = await query<{
        id: string;
        employee_id: string;
        tenant_id: string;
        training_event_id: string;
        rl_eligible: boolean;
        rl_days_potential: number;
        attendance_status: string;
        completion_status: string;
        rl_credit_id: string | null;
        event_date: string;
        day_type: string;
        training_title: string;
        training_code: string;
        rl_rule_id: string | null;
        credit_days: number;
        expiry_days: number | null;
      }>(
        `
      SELECT 
        ta.id, ta.employee_id, ta.tenant_id, ta.training_event_id,
        ta.rl_eligible, ta.rl_days_potential, ta.attendance_status,
        ta.completion_status, ta.rl_credit_id,
        te.event_date, te.day_type,
        tm.title as training_title, tm.code as training_code,
        tm.rl_rule_id, 
        COALESCE(rlr.credit_days, 1) as credit_days,
        rlr.expiry_days
      FROM training_allocation ta
      JOIN training_event te ON ta.training_event_id = te.id
      JOIN training_master tm ON te.training_id = tm.id
      LEFT JOIN replacement_leave_rule rlr ON tm.rl_rule_id = rlr.id
      WHERE ta.id = $1 AND ta.tenant_id = $2
    `,
        [id, tenantId]
      );

      if (allocationResult.rowCount === 0) {
        return res.status(404).json({ error: 'Allocation not found' });
      }

      const allocation = allocationResult.rows[0];

      // Validation 1: Self-approval prevention
      if (allocation.employee_id === userId) {
        return res.status(403).json({
          error: 'Self-approval not allowed',
          message:
            'You cannot confirm your own training completion. Please have another HR admin confirm.',
        });
      }

      // Validation 2: Check attendance was marked
      if (allocation.attendance_status === 'PENDING') {
        return res.status(400).json({
          error: 'Attendance not marked',
          message: 'Attendance must be marked before confirming completion',
        });
      }

      // Validation 3: Prevent double completion
      if (allocation.rl_credit_id) {
        return res.status(400).json({
          error: 'Already completed',
          message: 'RL credit has already been granted for this training',
        });
      }

      // Update completion status
      await query(
        `
      UPDATE training_allocation 
      SET completion_status = $1,
          completion_confirmed_by = $2,
          completion_confirmed_at = CURRENT_TIMESTAMP,
          completion_notes = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `,
        [completion_status, userId, completion_notes || null, id]
      );

      // If completed AND RL eligible AND attended → Create RL credit
      let rlCreditId: string | null = null;

      if (
        completion_status === 'COMPLETED' &&
        allocation.rl_eligible &&
        (allocation.attendance_status === 'ATTENDED' || allocation.attendance_status === 'PARTIAL')
      ) {
        // Calculate expiry date
        let expiryDate: string | null = null;
        if (allocation.expiry_days) {
          const expiry = new Date();
          expiry.setDate(expiry.getDate() + allocation.expiry_days);
          expiryDate = expiry.toISOString().split('T')[0];
        }

        // Create RL credit (auto-approved since HR confirmed completion)
        const creditResult = await query<{ id: string }>(
          `
        INSERT INTO replacement_leave_credit (
          tenant_id, employee_id, rule_id,
          trigger_type, trigger_date, trigger_description, trigger_reference,
          days_credited, days_remaining, status,
          expiry_date,
          requested_by, approved_by, approved_at,
          calculation_notes, training_allocation_id
        ) VALUES (
          $1, $2, $3,
          'TRAINING', $4, $5, $6,
          $7, $7, 'APPROVED',
          $8,
          $9, $9, CURRENT_TIMESTAMP,
          $10, $11
        )
        RETURNING id
      `,
          [
            tenantId,
            allocation.employee_id,
            allocation.rl_rule_id,
            allocation.event_date,
            `Training: ${allocation.training_title} (${allocation.training_code})`,
            `TRAINING-${allocation.training_code}-${id}`,
            allocation.credit_days,
            expiryDate,
            userId,
            `Auto-credited upon completion confirmation. Day type: ${allocation.day_type}. Rule applied: ${allocation.rl_rule_id || 'Default'}`,
            id,
          ]
        );

        rlCreditId = creditResult.rows[0].id;

        // Link credit to allocation
        await query(
          `
        UPDATE training_allocation 
        SET rl_credit_id = $1, rl_credited_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `,
          [rlCreditId, id]
        );

        // Record in credit history
        await query(
          `
        INSERT INTO replacement_leave_credit_history (
          tenant_id, credit_id, action, action_by, 
          days_affected, notes, previous_status, new_status
        ) VALUES ($1, $2, 'CREATED', $3, $4, $5, NULL, 'APPROVED')
      `,
          [
            tenantId,
            rlCreditId,
            userId,
            allocation.credit_days,
            `Training completion confirmed for ${allocation.training_title}`,
          ]
        );
      }

      return res.json({
        success: true,
        message:
          completion_status === 'COMPLETED'
            ? `Training completion confirmed${rlCreditId ? ` - ${allocation.credit_days} day(s) RL credited` : ''}`
            : 'Training marked as incomplete',
        rl_credited: !!rlCreditId,
        rl_credit_id: rlCreditId,
        rl_days: rlCreditId ? allocation.credit_days : 0,
      });
    } catch (err) {
      console.error('Error confirming completion:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

// ============================================================================
// EMPLOYEE-FACING ENDPOINTS
// ============================================================================

/**
 * GET /api/training/my-trainings
 * Get trainings assigned to current user
 */
trainingRouter.get('/my-trainings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;

    const result = await query(
      `
      SELECT 
        ta.id as allocation_id,
        ta.attendance_status,
        ta.completion_status,
        ta.hours_attended,
        ta.rl_eligible,
        ta.rl_days_potential,
        te.event_date,
        te.event_end_date,
        te.event_time_start,
        te.event_time_end,
        te.location,
        te.day_type,
        te.status as event_status,
        tm.code as training_code,
        tm.title as training_title,
        tm.description as training_description,
        tm.category,
        tm.duration_hours,
        tm.level,
        tm.instructor,
        tm.is_mandatory,
        rlc.id as rl_credit_id,
        rlc.days_credited as rl_days_credited,
        rlc.status as rl_credit_status,
        rlc.expiry_date as rl_expiry_date
      FROM training_allocation ta
      JOIN training_event te ON ta.training_event_id = te.id
      JOIN training_master tm ON te.training_id = tm.id
      LEFT JOIN replacement_leave_credit rlc ON ta.rl_credit_id = rlc.id
      WHERE ta.employee_id = $1 AND ta.tenant_id = $2
      ORDER BY te.event_date DESC
    `,
      [userId, tenantId]
    );

    return res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    console.error('Error fetching my trainings:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET /api/training/categories
 * Get list of training categories
 */
trainingRouter.get('/categories', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;

    const result = await query(
      `
      SELECT DISTINCT category 
      FROM training_master 
      WHERE tenant_id = $1 AND category IS NOT NULL AND is_active = true
      ORDER BY category
    `,
      [tenantId]
    );

    return res.json({
      success: true,
      data: result.rows.map(r => r.category),
    });
  } catch (err) {
    console.error('Error fetching categories:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ============================================================================
// BULK ASSIGNMENT ENDPOINT
// ============================================================================

/**
 * POST /api/training/events/:id/allocate-by-department
 * Bulk allocate workers by department (HR Admin only)
 */
trainingRouter.post(
  '/events/:id/allocate-by-department',
  requireHRAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.userId;
      const eventId = req.params.id;
      const { departments, rl_eligible } = req.body;

      if (!departments || !Array.isArray(departments) || departments.length === 0) {
        return res.status(400).json({ error: 'departments array is required' });
      }

      // Get event details
      const eventResult = await query<{
        id: string;
        rl_eligible: boolean;
        is_test: boolean;
        credit_days: number;
      }>(
        `
      SELECT te.id, te.rl_eligible, COALESCE(tm.is_test, false) as is_test,
             COALESCE(rlr.credit_days, 1) as credit_days
      FROM training_event te
      JOIN training_master tm ON te.training_id = tm.id
      LEFT JOIN replacement_leave_rule rlr ON tm.rl_rule_id = rlr.id
      WHERE te.id = $1 AND te.tenant_id = $2
    `,
        [eventId, tenantId]
      );

      if (eventResult.rowCount === 0) {
        return res.status(404).json({ error: 'Training event not found' });
      }

      const event = eventResult.rows[0];

      // Get employees in specified departments
      const employeesResult = await query<{ id: string; department: string }>(
        `
      SELECT id, department 
      FROM employee_master 
      WHERE tenant_id = $1 AND department = ANY($2) AND status = 'ACTIVE'
    `,
        [tenantId, departments]
      );

      if (employeesResult.rowCount === 0) {
        return res
          .status(400)
          .json({ error: 'No active employees found in specified departments' });
      }

      // Insert allocations
      const inserted: string[] = [];
      const skipped: string[] = [];

      for (const emp of employeesResult.rows) {
        try {
          await query(
            `
          INSERT INTO training_allocation (
            tenant_id, training_event_id, employee_id, allocated_by,
            rl_eligible, rl_days_potential
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `,
            [tenantId, eventId, emp.id, userId, rl_eligible ?? event.rl_eligible, event.credit_days]
          );
          inserted.push(emp.id);
        } catch (err: any) {
          if (err.code === '23505') {
            skipped.push(emp.id);
          } else {
            throw err;
          }
        }
      }

      // Audit log
      await logAudit(
        tenantId,
        userId,
        'ASSIGN',
        'EVENT',
        eventId,
        `Bulk assigned ${inserted.length} workers from departments: ${departments.join(', ')}`,
        { departments, allocated: inserted.length, skipped: skipped.length },
        event.is_test
      );

      return res.status(201).json({
        success: true,
        message: `Allocated ${inserted.length} worker(s) from ${departments.length} department(s)`,
        allocated: inserted.length,
        skipped: skipped.length,
        departments_searched: departments,
      });
    } catch (err) {
      console.error('Error bulk allocating workers:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

// ============================================================================
// ARCHIVE/UNARCHIVE ENDPOINTS
// ============================================================================

/**
 * POST /api/training/courses/:id/archive
 * Archive training course (soft delete) (HR Admin only)
 */
trainingRouter.post(
  '/courses/:id/archive',
  requireHRAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.userId;
      const { id } = req.params;

      // Get training info
      const trainingResult = await query<{ code: string; title: string; is_test: boolean }>(
        `
      SELECT code, title, COALESCE(is_test, false) as is_test
      FROM training_master WHERE id = $1 AND tenant_id = $2
    `,
        [id, tenantId]
      );

      if (trainingResult.rowCount === 0) {
        return res.status(404).json({ error: 'Course not found' });
      }

      const training = trainingResult.rows[0];

      // Archive
      await query(
        `
      UPDATE training_master 
      SET is_archived = true, archived_at = CURRENT_TIMESTAMP, archived_by = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND tenant_id = $3
    `,
        [userId, id, tenantId]
      );

      // Audit log
      await logAudit(
        tenantId,
        userId,
        'ARCHIVE',
        'TRAINING',
        id,
        `Archived training: ${training.title} (${training.code})`,
        { code: training.code, title: training.title },
        training.is_test
      );

      return res.json({
        success: true,
        message: 'Training archived successfully',
      });
    } catch (err) {
      console.error('Error archiving course:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

/**
 * POST /api/training/courses/:id/unarchive
 * Restore archived training course (HR Admin only)
 */
trainingRouter.post(
  '/courses/:id/unarchive',
  requireHRAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.userId;
      const { id } = req.params;

      const result = await query(
        `
      UPDATE training_master 
      SET is_archived = false, archived_at = NULL, archived_by = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND tenant_id = $2
      RETURNING code, title
    `,
        [id, tenantId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Course not found' });
      }

      const training = result.rows[0];

      // Audit log
      await logAudit(
        tenantId,
        userId,
        'UNARCHIVE',
        'TRAINING',
        id,
        `Restored training: ${training.title} (${training.code})`,
        { code: training.code, title: training.title },
        false
      );

      return res.json({
        success: true,
        message: 'Training restored successfully',
      });
    } catch (err) {
      console.error('Error unarchiving course:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

// ============================================================================
// AUDIT LOG ENDPOINT
// ============================================================================

/**
 * GET /api/training/audit-logs
 * Get training audit logs (HR Admin only)
 */
trainingRouter.get(
  '/audit-logs',
  requireHRAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const { entity_type, entity_id, action_type, is_test, limit = '50' } = req.query;

      let sql = `
      SELECT 
        tal.*,
        em.full_name as performed_by_name,
        em.employee_id as performed_by_code
      FROM training_audit_log tal
      LEFT JOIN employee_master em ON tal.performed_by = em.id
      WHERE tal.tenant_id = $1
    `;
      const params: any[] = [tenantId];

      if (entity_type) {
        params.push(entity_type);
        sql += ` AND tal.entity_type = $${params.length}`;
      }

      if (entity_id) {
        params.push(entity_id);
        sql += ` AND tal.entity_id = $${params.length}`;
      }

      if (action_type) {
        params.push(action_type);
        sql += ` AND tal.action_type = $${params.length}`;
      }

      if (is_test !== undefined) {
        params.push(is_test === 'true');
        sql += ` AND tal.is_test = $${params.length}`;
      }

      params.push(Math.min(parseInt(limit as string) || 50, 500));
      sql += ` ORDER BY tal.performed_at DESC LIMIT $${params.length}`;

      const result = await query(sql, params);

      return res.json({
        success: true,
        data: result.rows,
      });
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

export default trainingRouter;
