/**
 * Attendance API Routes
 * POST /api/attendance/clock-in
 */

import { Router, Request, Response } from 'express';
import { query } from '../lib/db';
import { 
  ClockInSchema, 
  ClockInRequest, 
  validateRequest, 
  formatZodErrors 
} from '../lib/validation';

export const attendanceRouter = Router();

// ============================================================================
// CONSTANTS
// ============================================================================

/** Debounce window for double punch detection (in minutes) */
const DOUBLE_PUNCH_DEBOUNCE_MINUTES = 5;

// ============================================================================
// INTERFACES
// ============================================================================

interface AttendanceRecord {
  id: string;
  employee_id: string;
  attendance_date: string;
  raw_clock_in: string;
  verified_clock_in: string;
  raw_clock_out: string | null;
  verified_clock_out: string | null;
  working_hours: number | null;
}

interface ClockInResponse {
  success: boolean;
  message: string;
  data?: {
    attendanceId: string;
    workerId: string;
    clockInTime: string;
    clockOutTime?: string;
    totalHours?: number;
    isNewEntry: boolean;
  };
  error?: string;
  code?: string;
}

// ============================================================================
// GET /api/attendance - List attendance records
// ============================================================================

attendanceRouter.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Unauthorized' });

    const { date, startDate, endDate, limit = 100 } = req.query;

    let whereClause = 'WHERE al.tenant_id = $1';
    const params: any[] = [tenantId];
    let idx = 2;

    if (date) {
      whereClause += ` AND al.attendance_date = $${idx}`;
      params.push(date);
      idx++;
    } else if (startDate && endDate) {
      whereClause += ` AND al.attendance_date BETWEEN $${idx} AND $${idx + 1}`;
      params.push(startDate, endDate);
      idx += 2;
    }

    params.push(Number(limit));

    const result = await query(
      `SELECT al.id, al.employee_id, em.employee_id as emp_code, em.full_name,
              al.attendance_date, al.raw_clock_in, al.verified_clock_in,
              al.raw_clock_out, al.verified_clock_out, al.working_hours,
              al.ot_requested_hours, al.ot_approved_hours, al.ot_approval_status
       FROM attendance_ledger al
       JOIN employee_master em ON al.employee_id = em.id
       ${whereClause}
       ORDER BY al.attendance_date DESC, al.raw_clock_in DESC
       LIMIT $${idx}`,
      params
    );

    return res.json({ success: true, data: result.rows, count: result.rowCount });
  } catch (err) {
    console.error('Attendance GET error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ============================================================================
// POST /api/attendance/clock-in
// ============================================================================

/**
 * Clock-In Endpoint
 * 
 * Accepts: { workerId, timestamp, gps, deviceId }
 * Inserts a record into attendance_ledger
 * 
 * CRUCIAL: Implements 'Double Punch' detection (debounce within 5 minutes)
 */
attendanceRouter.post('/clock-in', async (req: Request, res: Response) => {
  try {
    // ========================================================================
    // Step 1: Validate Input with Zod
    // ========================================================================
    const validation = validateRequest(ClockInSchema, req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: formatZodErrors(validation.errors),
      });
    }

    const { workerId, timestamp, gps, deviceId } = validation.data as ClockInRequest;
    const clockInTime = new Date(timestamp);
    const attendanceDate = clockInTime.toISOString().split('T')[0]; // YYYY-MM-DD

    // ========================================================================
    // Step 2: Get Employee and Tenant Info
    // ========================================================================
    const employeeResult = await query<{ id: string; tenant_id: string; full_name: string }>(
      `SELECT id, tenant_id, full_name 
       FROM employee_master 
       WHERE id = $1 AND is_active = true`,
      [workerId]
    );

    if (employeeResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found or inactive',
        code: 'EMPLOYEE_NOT_FOUND',
      });
    }

    const employee = employeeResult.rows[0];

    // ========================================================================
    // Step 3: Double Punch Detection (5-minute debounce)
    // ========================================================================
    const debounceWindowStart = new Date(clockInTime.getTime() - DOUBLE_PUNCH_DEBOUNCE_MINUTES * 60 * 1000);
    
    const recentPunchResult = await query<AttendanceRecord>(
      `SELECT id, raw_clock_in, raw_clock_out 
       FROM attendance_ledger 
       WHERE employee_id = $1 
         AND attendance_date = $2
         AND (
           (raw_clock_in >= $3 AND raw_clock_in <= $4)
           OR 
           (raw_clock_out >= $3 AND raw_clock_out <= $4)
         )
       ORDER BY raw_clock_in DESC
       LIMIT 1`,
      [workerId, attendanceDate, debounceWindowStart.toISOString(), clockInTime.toISOString()]
    );

    if (recentPunchResult.rowCount && recentPunchResult.rowCount > 0) {
      const recentPunch = recentPunchResult.rows[0];
      const lastPunchTime = recentPunch.raw_clock_out || recentPunch.raw_clock_in;
      const timeSinceLastPunch = Math.floor(
        (clockInTime.getTime() - new Date(lastPunchTime).getTime()) / (1000 * 60)
      );

      return res.status(429).json({
        success: false,
        error: 'Double Punch Detected',
        message: `A punch was recorded ${timeSinceLastPunch} minute(s) ago. Please wait ${DOUBLE_PUNCH_DEBOUNCE_MINUTES - timeSinceLastPunch} more minute(s).`,
        code: 'DOUBLE_PUNCH',
        data: {
          lastPunchTime,
          debounceWindowMinutes: DOUBLE_PUNCH_DEBOUNCE_MINUTES,
          attendanceId: recentPunch.id,
        },
      });
    }

    // ========================================================================
    // Step 4: Check for existing attendance record for today
    // ========================================================================
    const existingAttendanceResult = await query<AttendanceRecord>(
      `SELECT id, raw_clock_in, raw_clock_out 
       FROM attendance_ledger 
       WHERE employee_id = $1 AND attendance_date = $2
       ORDER BY raw_clock_in DESC
       LIMIT 1`,
      [workerId, attendanceDate]
    );

    let attendanceId: string;
    let isNewEntry: boolean;
    let responseMessage: string;

    if (existingAttendanceResult.rowCount && existingAttendanceResult.rowCount > 0) {
      const existingRecord = existingAttendanceResult.rows[0];
      
      // If there's an existing record without clock-out, treat this as clock-out
      if (!existingRecord.raw_clock_out) {
        // Update with clock-out time
        const updateResult = await query<{ id: string }>(
          `UPDATE attendance_ledger 
           SET raw_clock_out = $1,
               verified_clock_out = $1,
               working_hours = EXTRACT(EPOCH FROM ($1::timestamp - verified_clock_in)) / 3600,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2
           RETURNING id`,
          [clockInTime.toISOString(), existingRecord.id]
        );

        attendanceId = updateResult.rows[0].id;
        isNewEntry = false;
        responseMessage = 'Clock-out recorded successfully';
      } else {
        // Employee already has complete clock-in/out for today
        // Create a new attendance entry (for split shifts)
        const insertResult = await query<{ id: string }>(
          `INSERT INTO attendance_ledger (
            tenant_id, employee_id, attendance_date,
            raw_clock_in, verified_clock_in,
            remarks, created_at
          ) VALUES ($1, $2, $3, $4, $4, $5, CURRENT_TIMESTAMP)
          RETURNING id`,
          [
            employee.tenant_id,
            workerId,
            attendanceDate,
            clockInTime.toISOString(),
            `Device: ${deviceId}${gps ? ` | GPS: ${gps.latitude},${gps.longitude}` : ''}`,
          ]
        );

        attendanceId = insertResult.rows[0].id;
        isNewEntry = true;
        responseMessage = 'New shift clock-in recorded successfully';
      }
    } else {
      // ======================================================================
      // Step 5: Insert New Attendance Record
      // ======================================================================
      const insertResult = await query<{ id: string }>(
        `INSERT INTO attendance_ledger (
          tenant_id, employee_id, attendance_date,
          raw_clock_in, verified_clock_in,
          remarks, created_at
        ) VALUES ($1, $2, $3, $4, $4, $5, CURRENT_TIMESTAMP)
        RETURNING id`,
        [
          employee.tenant_id,
          workerId,
          attendanceDate,
          clockInTime.toISOString(),
          `Device: ${deviceId}${gps ? ` | GPS: ${gps.latitude},${gps.longitude}` : ''}`,
        ]
      );

      attendanceId = insertResult.rows[0].id;
      isNewEntry = true;
      responseMessage = 'Clock-in recorded successfully';
    }

    // ========================================================================
    // Step 6: Return Success Response
    // ========================================================================
    const response: ClockInResponse = {
      success: true,
      message: responseMessage,
      data: {
        attendanceId,
        workerId,
        clockInTime: clockInTime.toISOString(),
        isNewEntry,
      },
    };

    return res.status(isNewEntry ? 201 : 200).json(response);

  } catch (error) {
    console.error('Clock-in error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
});

// ============================================================================
// GET /api/attendance/status/:workerId
// ============================================================================

/**
 * Get current attendance status for a worker
 */
attendanceRouter.get('/status/:workerId', async (req: Request, res: Response) => {
  try {
    const { workerId } = req.params;
    const today = new Date().toISOString().split('T')[0];

    const result = await query<AttendanceRecord>(
      `SELECT id, attendance_date, raw_clock_in, verified_clock_in, 
              raw_clock_out, verified_clock_out, working_hours
       FROM attendance_ledger 
       WHERE employee_id = $1 AND attendance_date = $2
       ORDER BY raw_clock_in DESC`,
      [workerId, today]
    );

    if (result.rowCount === 0) {
      return res.json({
        success: true,
        status: 'NOT_CLOCKED_IN',
        message: 'No attendance record for today',
        data: null,
      });
    }

    const latestRecord = result.rows[0];
    const status = latestRecord.raw_clock_out ? 'CLOCKED_OUT' : 'CLOCKED_IN';

    return res.json({
      success: true,
      status,
      message: status === 'CLOCKED_IN' ? 'Currently clocked in' : 'Already clocked out',
      data: {
        attendanceId: latestRecord.id,
        clockIn: latestRecord.verified_clock_in,
        clockOut: latestRecord.verified_clock_out,
        totalShifts: result.rowCount,
      },
    });

  } catch (error) {
    console.error('Status check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
    });
  }
});

// ============================================================================
// PUT /api/attendance/:id/approve-ot - Approve overtime for a record
// ============================================================================

/**
 * Approve OT hours for an attendance record
 * Used by the Attendance Intervention screen
 */
attendanceRouter.put('/:id/approve-ot', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    
    if (!tenantId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { approvedHours } = req.body;

    // Validate approvedHours
    if (typeof approvedHours !== 'number' || approvedHours < 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid approved hours. Must be a non-negative number.',
      });
    }

    // Update the attendance record with approved OT hours
    // Note: approved_by is set to NULL since the user may not be in employee_master
    const result = await query(
      `UPDATE attendance_ledger 
       SET ot_approved_hours = $1,
           ot_approval_status = 'approved',
           updated_at = NOW()
       WHERE id = $2 AND tenant_id = $3
       RETURNING id, ot_requested_hours, ot_approved_hours, ot_approval_status`,
      [approvedHours, id, tenantId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Attendance record not found',
      });
    }

    const updated = result.rows[0];

    return res.json({
      success: true,
      message: 'OT approved successfully',
      data: {
        id: updated.id,
        requestedHours: updated.ot_requested_hours,
        approvedHours: updated.ot_approved_hours,
        status: updated.ot_approval_status,
      },
    });

  } catch (error) {
    console.error('Approve OT error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
    });
  }
});

export default attendanceRouter;
