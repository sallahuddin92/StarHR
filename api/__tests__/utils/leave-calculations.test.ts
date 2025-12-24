/**
 * Leave Calculation Unit Tests
 * Pure function tests for leave entitlement calculations
 */

import { describe, it, expect } from '@jest/globals';

// ============================================================================
// LEAVE CALCULATION FUNCTIONS (extracted for testing)
// ============================================================================

/**
 * Calculate prorated leave entitlement based on join date
 */
function calculateProratedLeave(
  annualEntitlement: number,
  joinDate: Date,
  yearEnd: Date = new Date(new Date().getFullYear(), 11, 31)
): number {
  const startOfYear = new Date(yearEnd.getFullYear(), 0, 1);
  const effectiveStart = joinDate > startOfYear ? joinDate : startOfYear;

  const totalDaysInYear =
    Math.ceil((yearEnd.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const daysWorked =
    Math.ceil((yearEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const prorated = (annualEntitlement * daysWorked) / totalDaysInYear;
  return Math.round(prorated * 2) / 2; // Round to nearest 0.5
}

/**
 * Calculate replacement leave credit days based on day type
 */
function calculateReplacementLeaveCredit(
  hoursWorked: number,
  dayType: 'WORKING_DAY' | 'OFF_DAY' | 'REST_DAY' | 'PUBLIC_HOLIDAY',
  threshold: number = 4
): number {
  if (hoursWorked < threshold) return 0;

  const creditRates: Record<string, number> = {
    WORKING_DAY: 0,
    OFF_DAY: 0.5,
    REST_DAY: 1,
    PUBLIC_HOLIDAY: 1.5,
  };

  return creditRates[dayType] || 0;
}

/**
 * Calculate overtime hours from regular hours
 */
function calculateOvertimeHours(
  totalHours: number,
  regularLimit: number = 8
): { regular: number; overtime: number } {
  if (totalHours <= regularLimit) {
    return { regular: totalHours, overtime: 0 };
  }
  return {
    regular: regularLimit,
    overtime: totalHours - regularLimit,
  };
}

/**
 * Validate leave dates
 */
function validateLeaveDates(
  startDate: Date,
  endDate: Date,
  maxDays: number = 14
): { valid: boolean; error?: string } {
  if (startDate > endDate) {
    return { valid: false, error: 'Start date must be before end date' };
  }

  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  if (days > maxDays) {
    return { valid: false, error: `Leave duration cannot exceed ${maxDays} days` };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (startDate < today) {
    return { valid: false, error: 'Cannot apply for leave in the past' };
  }

  return { valid: true };
}

// ============================================================================
// TESTS
// ============================================================================

describe('Leave Calculation Functions', () => {
  describe('calculateProratedLeave', () => {
    it('should return full entitlement for employee joining Jan 1', () => {
      const joinDate = new Date('2024-01-01');
      const yearEnd = new Date('2024-12-31');
      const result = calculateProratedLeave(14, joinDate, yearEnd);
      expect(result).toBe(14);
    });

    it('should return half entitlement for employee joining July 1', () => {
      const joinDate = new Date('2024-07-01');
      const yearEnd = new Date('2024-12-31');
      const result = calculateProratedLeave(14, joinDate, yearEnd);
      expect(result).toBeGreaterThan(6);
      expect(result).toBeLessThan(8);
    });

    it('should return prorated amount for mid-year join', () => {
      const joinDate = new Date('2024-04-01');
      const yearEnd = new Date('2024-12-31');
      const result = calculateProratedLeave(12, joinDate, yearEnd);
      expect(result).toBeGreaterThan(8);
      expect(result).toBeLessThan(12);
    });

    it('should handle edge case of joining near year end', () => {
      const joinDate = new Date('2024-12-01');
      const yearEnd = new Date('2024-12-31');
      const result = calculateProratedLeave(14, joinDate, yearEnd);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(2);
    });
  });

  describe('calculateReplacementLeaveCredit', () => {
    it('should return 0 for working day', () => {
      const result = calculateReplacementLeaveCredit(8, 'WORKING_DAY');
      expect(result).toBe(0);
    });

    it('should return 0.5 for off day', () => {
      const result = calculateReplacementLeaveCredit(8, 'OFF_DAY');
      expect(result).toBe(0.5);
    });

    it('should return 1 for rest day', () => {
      const result = calculateReplacementLeaveCredit(8, 'REST_DAY');
      expect(result).toBe(1);
    });

    it('should return 1.5 for public holiday', () => {
      const result = calculateReplacementLeaveCredit(8, 'PUBLIC_HOLIDAY');
      expect(result).toBe(1.5);
    });

    it('should return 0 if hours below threshold', () => {
      const result = calculateReplacementLeaveCredit(3, 'PUBLIC_HOLIDAY');
      expect(result).toBe(0);
    });
  });

  describe('calculateOvertimeHours', () => {
    it('should return no overtime for 8 hours', () => {
      const result = calculateOvertimeHours(8);
      expect(result).toEqual({ regular: 8, overtime: 0 });
    });

    it('should calculate overtime for 10 hours', () => {
      const result = calculateOvertimeHours(10);
      expect(result).toEqual({ regular: 8, overtime: 2 });
    });

    it('should handle partial hours', () => {
      const result = calculateOvertimeHours(8.5);
      expect(result).toEqual({ regular: 8, overtime: 0.5 });
    });

    it('should handle custom regular limit', () => {
      const result = calculateOvertimeHours(10, 9);
      expect(result).toEqual({ regular: 9, overtime: 1 });
    });
  });

  describe('validateLeaveDates', () => {
    it('should reject if start date after end date', () => {
      const result = validateLeaveDates(new Date('2025-01-10'), new Date('2025-01-05'));
      expect(result.valid).toBe(false);
      expect(result.error).toContain('before');
    });

    it('should reject if duration exceeds max', () => {
      const result = validateLeaveDates(new Date('2025-01-01'), new Date('2025-01-20'), 14);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceed');
    });

    it('should accept valid future dates', () => {
      const futureStart = new Date();
      futureStart.setDate(futureStart.getDate() + 7);
      const futureEnd = new Date();
      futureEnd.setDate(futureEnd.getDate() + 10);

      const result = validateLeaveDates(futureStart, futureEnd);
      expect(result.valid).toBe(true);
    });
  });
});
