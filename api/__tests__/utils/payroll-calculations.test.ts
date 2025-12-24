/**
 * Payroll Calculation Unit Tests
 * Pure function tests for salary and statutory deductions
 */

import { describe, it, expect } from '@jest/globals';

// ============================================================================
// PAYROLL CALCULATION FUNCTIONS (extracted for testing)
// ============================================================================

interface SalaryComponents {
  basic: number;
  allowances: number;
  overtime: number;
  deductions: number;
}

interface EPFRates {
  employeeRate: number;
  employerRate: number;
}

/**
 * Calculate gross salary
 */
function calculateGrossSalary(components: SalaryComponents): number {
  return components.basic + components.allowances + components.overtime;
}

/**
 * Calculate net salary after deductions
 */
function calculateNetSalary(components: SalaryComponents): number {
  return calculateGrossSalary(components) - components.deductions;
}

/**
 * Calculate EPF contributions (Malaysia)
 */
function calculateEPF(
  basicSalary: number,
  rates: EPFRates = { employeeRate: 0.11, employerRate: 0.12 }
): { employee: number; employer: number } {
  return {
    employee: Math.round(basicSalary * rates.employeeRate * 100) / 100,
    employer: Math.round(basicSalary * rates.employerRate * 100) / 100,
  };
}

/**
 * Calculate SOCSO contribution (Malaysia)
 * Simplified - actual rates are based on salary bands
 */
function calculateSOCSO(salary: number): { employee: number; employer: number } {
  if (salary <= 0) return { employee: 0, employer: 0 };
  if (salary > 5000) return { employee: 29.65, employer: 69.05 };
  if (salary > 4000) return { employee: 24.75, employer: 57.75 };
  if (salary > 3000) return { employee: 19.75, employer: 46.05 };
  if (salary > 2000) return { employee: 14.75, employer: 34.45 };
  return { employee: 9.75, employer: 22.75 };
}

/**
 * Calculate overtime pay
 */
function calculateOvertimePay(
  hourlyRate: number,
  overtimeHours: number,
  multiplier: number = 1.5
): number {
  return Math.round(hourlyRate * overtimeHours * multiplier * 100) / 100;
}

/**
 * Calculate daily rate from monthly salary
 */
function calculateDailyRate(monthlySalary: number, workingDays: number = 26): number {
  return Math.round((monthlySalary / workingDays) * 100) / 100;
}

/**
 * Calculate hourly rate from monthly salary
 */
function calculateHourlyRate(monthlySalary: number, hoursPerMonth: number = 208): number {
  return Math.round((monthlySalary / hoursPerMonth) * 100) / 100;
}

/**
 * Calculate unpaid leave deduction
 */
function calculateUnpaidLeaveDeduction(dailyRate: number, unpaidDays: number): number {
  return Math.round(dailyRate * unpaidDays * 100) / 100;
}

// ============================================================================
// TESTS
// ============================================================================

describe('Payroll Calculation Functions', () => {
  describe('calculateGrossSalary', () => {
    it('should calculate gross salary correctly', () => {
      const result = calculateGrossSalary({
        basic: 5000,
        allowances: 500,
        overtime: 300,
        deductions: 0,
      });
      expect(result).toBe(5800);
    });

    it('should handle zero values', () => {
      const result = calculateGrossSalary({
        basic: 3000,
        allowances: 0,
        overtime: 0,
        deductions: 0,
      });
      expect(result).toBe(3000);
    });
  });

  describe('calculateNetSalary', () => {
    it('should subtract deductions from gross', () => {
      const result = calculateNetSalary({
        basic: 5000,
        allowances: 500,
        overtime: 300,
        deductions: 550,
      });
      expect(result).toBe(5250); // (5000 + 500 + 300) - 550
    });
  });

  describe('calculateEPF', () => {
    it('should calculate 11% employee and 12% employer at default rates', () => {
      const result = calculateEPF(5000);
      expect(result.employee).toBe(550);
      expect(result.employer).toBe(600);
    });

    it('should handle custom rates', () => {
      const result = calculateEPF(5000, { employeeRate: 0.13, employerRate: 0.14 });
      expect(result.employee).toBe(650);
      expect(result.employer).toBe(700);
    });

    it('should handle decimal results', () => {
      const result = calculateEPF(3333);
      expect(result.employee).toBe(366.63);
      expect(result.employer).toBe(399.96);
    });
  });

  describe('calculateSOCSO', () => {
    it('should return max rate for salary > 5000', () => {
      const result = calculateSOCSO(6000);
      expect(result.employee).toBe(29.65);
      expect(result.employer).toBe(69.05);
    });

    it('should return appropriate rate for mid-range salary', () => {
      const result = calculateSOCSO(3500);
      expect(result.employee).toBe(19.75);
      expect(result.employer).toBe(46.05);
    });

    it('should return zero for zero salary', () => {
      const result = calculateSOCSO(0);
      expect(result.employee).toBe(0);
      expect(result.employer).toBe(0);
    });
  });

  describe('calculateOvertimePay', () => {
    it('should calculate at 1.5x multiplier by default', () => {
      const result = calculateOvertimePay(30, 10); // RM30/hour, 10 hours
      expect(result).toBe(450); // 30 * 10 * 1.5
    });

    it('should handle custom multiplier (weekend 2x)', () => {
      const result = calculateOvertimePay(30, 8, 2);
      expect(result).toBe(480); // 30 * 8 * 2
    });

    it('should round to 2 decimal places', () => {
      const result = calculateOvertimePay(33.33, 3);
      expect(result).toBe(149.98); // 33.33 * 3 * 1.5 = 149.985 → rounds to 149.98
    });
  });

  describe('calculateDailyRate', () => {
    it('should divide monthly by 26 working days by default', () => {
      const result = calculateDailyRate(5200);
      expect(result).toBe(200);
    });

    it('should handle custom working days', () => {
      const result = calculateDailyRate(5000, 25);
      expect(result).toBe(200);
    });
  });

  describe('calculateHourlyRate', () => {
    it('should divide monthly by 208 hours by default', () => {
      const result = calculateHourlyRate(4160);
      expect(result).toBe(20);
    });
  });

  describe('calculateUnpaidLeaveDeduction', () => {
    it('should multiply daily rate by unpaid days', () => {
      const result = calculateUnpaidLeaveDeduction(200, 3);
      expect(result).toBe(600);
    });

    it('should return zero for zero unpaid days', () => {
      const result = calculateUnpaidLeaveDeduction(200, 0);
      expect(result).toBe(0);
    });
  });
});
