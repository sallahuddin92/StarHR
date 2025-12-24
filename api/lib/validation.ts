/**
 * Zod Validation Schemas
 * Centralized validation for all API endpoints
 */

import { z } from 'zod';

// ============================================================================
// ATTENDANCE SCHEMAS
// ============================================================================

/**
 * GPS Coordinates Schema
 */
export const GPSSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
  altitude: z.number().optional(),
});

/**
 * Clock-In Request Schema
 * POST /api/attendance/clock-in
 */
export const ClockInSchema = z.object({
  workerId: z.string().uuid('Invalid worker ID format'),
  timestamp: z.string().datetime('Invalid timestamp format (ISO 8601 required)'),
  gps: GPSSchema.optional(),
  deviceId: z.string().min(1, 'Device ID is required').max(255),
});

export type ClockInRequest = z.infer<typeof ClockInSchema>;

// ============================================================================
// PAYROLL SCHEMAS
// ============================================================================

/**
 * Run Draft Payroll Request Schema
 * POST /api/payroll/run-draft
 */
export const RunDraftPayrollSchema = z
  .object({
    basicStartDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD required)'),
    basicEndDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD required)'),
    otStartDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD required)'),
    otEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD required)'),
  })
  .refine(data => new Date(data.basicStartDate) <= new Date(data.basicEndDate), {
    message: 'basicStartDate must be before or equal to basicEndDate',
    path: ['basicStartDate'],
  })
  .refine(data => new Date(data.otStartDate) <= new Date(data.otEndDate), {
    message: 'otStartDate must be before or equal to otEndDate',
    path: ['otStartDate'],
  });

export type RunDraftPayrollRequest = z.infer<typeof RunDraftPayrollSchema>;

// ============================================================================
// EWA (EARNED WAGE ACCESS) SCHEMAS
// ============================================================================

/**
 * EWA Request Schema
 * POST /api/ewa/request
 */
export const EWARequestSchema = z.object({
  employeeId: z.string().uuid('Invalid employee ID format'),
  amount: z
    .number()
    .positive('Amount must be positive')
    .max(100000, 'Amount exceeds maximum limit'),
});

export type EWARequestInput = z.infer<typeof EWARequestSchema>;

/**
 * EWA Approve Schema
 * PUT /api/ewa/:id/approve
 */
export const EWAApproveSchema = z.object({
  approvedAmount: z
    .number()
    .positive('Approved amount must be positive')
    .max(100000, 'Amount exceeds maximum limit')
    .optional(), // If not provided, uses requested amount
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional(),
});

export type EWAApproveInput = z.infer<typeof EWAApproveSchema>;

/**
 * EWA Reject Schema
 * PUT /api/ewa/:id/reject
 */
export const EWARejectSchema = z.object({
  reason: z
    .string()
    .min(5, 'Rejection reason must be at least 5 characters')
    .max(500, 'Rejection reason cannot exceed 500 characters')
    .transform(val => val.trim()) // Sanitize whitespace
    .refine(val => !/<[^>]*>/.test(val), 'HTML tags are not allowed'), // Prevent XSS
});

export type EWARejectInput = z.infer<typeof EWARejectSchema>;

// ============================================================================
// VALIDATION HELPER
// ============================================================================

interface ValidationSuccess<T> {
  success: true;
  data: T;
}

interface ValidationFailure {
  success: false;
  errors: z.ZodError['errors'];
}

type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

/**
 * Validate request body against a Zod schema
 * Returns parsed data or throws formatted error
 */
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, errors: result.error.errors };
}

/**
 * Format Zod errors for API response
 */
export function formatZodErrors(errors: z.ZodError['errors']): {
  field: string;
  message: string;
}[] {
  return errors.map(error => ({
    field: error.path.join('.'),
    message: error.message,
  }));
}
