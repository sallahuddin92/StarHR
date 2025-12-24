/**
 * StarHR Statutory Rules Module
 *
 * Contains all Malaysian statutory contribution rates and calculations
 * for EPF, SOCSO, EIS, and PCB.
 *
 * @version 2024.12
 * @lastUpdated 2024-12-24
 *
 * IMPORTANT: Update this file when statutory rates change.
 * Always verify with official government sources.
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface StatutoryContribution {
  employee: number;
  employer: number;
}

export interface EPFRates {
  below60: {
    employee: number;
    employerLow: number; // For wages ≤ RM5,000
    employerHigh: number; // For wages > RM5,000
  };
  above60: {
    employee: number;
    employer: number;
  };
}

export interface SOCSOBand {
  maxWage: number;
  employee: number;
  employer: number;
}

export interface PCBBracket {
  from: number;
  to: number;
  rate: number;
}

// ============================================================================
// EPF (KWSP) RATES - Effective 2024
// ============================================================================

export const EPF_RATES: EPFRates = {
  below60: {
    employee: 0.11, // 11%
    employerLow: 0.12, // 12% for wages ≤ RM5,000
    employerHigh: 0.13, // 13% for wages > RM5,000
  },
  above60: {
    employee: 0, // Optional 5.5%
    employer: 0.04, // 4%
  },
};

/**
 * Calculate EPF contribution based on salary and age
 *
 * @param basicSalary - Monthly basic salary
 * @param age - Employee age
 * @returns Employee and employer contributions
 *
 * @example
 * const epf = calculateEPF(5000, 35);
 * // Returns: { employee: 550, employer: 600 }
 */
export function calculateEPF(basicSalary: number, age: number): StatutoryContribution {
  if (age >= 60) {
    return {
      employee: Math.round(basicSalary * EPF_RATES.above60.employee * 100) / 100,
      employer: Math.round(basicSalary * EPF_RATES.above60.employer * 100) / 100,
    };
  }

  const employerRate =
    basicSalary > 5000 ? EPF_RATES.below60.employerHigh : EPF_RATES.below60.employerLow;

  return {
    employee: Math.round(basicSalary * EPF_RATES.below60.employee * 100) / 100,
    employer: Math.round(basicSalary * employerRate * 100) / 100,
  };
}

// ============================================================================
// SOCSO (PERKESO) RATES - Effective 2024
// ============================================================================

export const SOCSO_BANDS: SOCSOBand[] = [
  { maxWage: 30, employee: 0.1, employer: 0.4 },
  { maxWage: 50, employee: 0.15, employer: 0.6 },
  { maxWage: 70, employee: 0.25, employer: 0.85 },
  { maxWage: 100, employee: 0.35, employer: 1.25 },
  { maxWage: 140, employee: 0.5, employer: 1.75 },
  { maxWage: 200, employee: 0.7, employer: 2.45 },
  { maxWage: 300, employee: 1.05, employer: 3.65 },
  { maxWage: 400, employee: 1.4, employer: 4.9 },
  { maxWage: 500, employee: 1.75, employer: 6.15 },
  { maxWage: 600, employee: 2.1, employer: 7.35 },
  { maxWage: 700, employee: 2.45, employer: 8.6 },
  { maxWage: 800, employee: 2.8, employer: 9.8 },
  { maxWage: 900, employee: 3.15, employer: 11.05 },
  { maxWage: 1000, employee: 3.5, employer: 12.25 },
  { maxWage: 1100, employee: 3.85, employer: 13.5 },
  { maxWage: 1200, employee: 4.2, employer: 14.7 },
  { maxWage: 1300, employee: 4.55, employer: 15.95 },
  { maxWage: 1400, employee: 4.9, employer: 17.15 },
  { maxWage: 1500, employee: 5.25, employer: 18.4 },
  { maxWage: 1600, employee: 5.6, employer: 19.6 },
  { maxWage: 1700, employee: 5.95, employer: 20.85 },
  { maxWage: 1800, employee: 6.3, employer: 22.05 },
  { maxWage: 1900, employee: 6.65, employer: 23.3 },
  { maxWage: 2000, employee: 7.0, employer: 24.5 },
  { maxWage: 2100, employee: 7.35, employer: 25.75 },
  { maxWage: 2200, employee: 7.7, employer: 26.95 },
  { maxWage: 2300, employee: 8.05, employer: 28.2 },
  { maxWage: 2400, employee: 8.4, employer: 29.4 },
  { maxWage: 2500, employee: 8.75, employer: 30.65 },
  { maxWage: 2600, employee: 9.1, employer: 31.85 },
  { maxWage: 2700, employee: 9.45, employer: 33.1 },
  { maxWage: 2800, employee: 9.8, employer: 34.3 },
  { maxWage: 2900, employee: 10.15, employer: 35.55 },
  { maxWage: 3000, employee: 10.5, employer: 36.75 },
  { maxWage: 3100, employee: 10.85, employer: 37.95 },
  { maxWage: 3200, employee: 11.2, employer: 39.2 },
  { maxWage: 3300, employee: 11.55, employer: 40.4 },
  { maxWage: 3400, employee: 11.9, employer: 41.65 },
  { maxWage: 3500, employee: 12.25, employer: 42.85 },
  { maxWage: 3600, employee: 12.6, employer: 44.1 },
  { maxWage: 3700, employee: 12.95, employer: 45.3 },
  { maxWage: 3800, employee: 13.3, employer: 46.55 },
  { maxWage: 3900, employee: 13.65, employer: 47.75 },
  { maxWage: 4000, employee: 14.0, employer: 49.0 },
  { maxWage: 4100, employee: 14.35, employer: 50.2 },
  { maxWage: 4200, employee: 14.7, employer: 51.45 },
  { maxWage: 4300, employee: 15.05, employer: 52.65 },
  { maxWage: 4400, employee: 15.4, employer: 53.9 },
  { maxWage: 4500, employee: 15.75, employer: 55.1 },
  { maxWage: 4600, employee: 16.1, employer: 56.35 },
  { maxWage: 4700, employee: 16.45, employer: 57.55 },
  { maxWage: 4800, employee: 16.8, employer: 58.8 },
  { maxWage: 4900, employee: 17.15, employer: 60.0 },
  { maxWage: 5000, employee: 17.5, employer: 61.25 },
  { maxWage: Infinity, employee: 17.5, employer: 61.25 }, // Capped at RM5,000
];

/**
 * Calculate SOCSO contribution based on salary
 *
 * @param monthlyWage - Monthly wages
 * @returns Employee and employer contributions
 */
export function calculateSOCSO(monthlyWage: number): StatutoryContribution {
  if (monthlyWage <= 0) {
    return { employee: 0, employer: 0 };
  }

  const band = SOCSO_BANDS.find(b => monthlyWage <= b.maxWage);
  if (band) {
    return { employee: band.employee, employer: band.employer };
  }

  // Fallback to max band
  const maxBand = SOCSO_BANDS[SOCSO_BANDS.length - 1];
  return { employee: maxBand.employee, employer: maxBand.employer };
}

// ============================================================================
// EIS RATES - Effective 2024
// ============================================================================

export const EIS_RATE = 0.002; // 0.2%
export const EIS_MAX_WAGE = 5000;

/**
 * Calculate EIS contribution
 *
 * @param monthlyWage - Monthly wages (capped at RM5,000)
 * @returns Employee and employer contributions
 */
export function calculateEIS(monthlyWage: number): StatutoryContribution {
  const cappedWage = Math.min(monthlyWage, EIS_MAX_WAGE);
  const contribution = Math.round(cappedWage * EIS_RATE * 100) / 100;
  return { employee: contribution, employer: contribution };
}

// ============================================================================
// PCB (MTD) TAX BRACKETS - Effective 2024
// ============================================================================

export const PCB_BRACKETS: PCBBracket[] = [
  { from: 0, to: 5000, rate: 0 },
  { from: 5001, to: 20000, rate: 0.01 },
  { from: 20001, to: 35000, rate: 0.03 },
  { from: 35001, to: 50000, rate: 0.06 },
  { from: 50001, to: 70000, rate: 0.11 },
  { from: 70001, to: 100000, rate: 0.19 },
  { from: 100001, to: 400000, rate: 0.25 },
  { from: 400001, to: 600000, rate: 0.26 },
  { from: 600001, to: 2000000, rate: 0.28 },
  { from: 2000001, to: Infinity, rate: 0.3 },
];

/**
 * Calculate PCB (simplified - for estimation only)
 *
 * Note: Actual PCB calculation is more complex and depends on
 * reliefs, deductions, and personal circumstances.
 *
 * @param annualIncome - Annual taxable income
 * @returns Estimated annual tax
 */
export function calculatePCB(annualIncome: number): number {
  let tax = 0;
  let remainingIncome = annualIncome;

  for (const bracket of PCB_BRACKETS) {
    if (remainingIncome <= 0) break;

    const bracketSize = bracket.to - bracket.from + 1;
    const taxableInBracket = Math.min(remainingIncome, bracketSize);
    tax += taxableInBracket * bracket.rate;
    remainingIncome -= bracketSize;
  }

  return Math.round(tax * 100) / 100;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get all statutory contributions for an employee
 */
export function getAllContributions(
  basicSalary: number,
  age: number
): {
  epf: StatutoryContribution;
  socso: StatutoryContribution;
  eis: StatutoryContribution;
  totalEmployee: number;
  totalEmployer: number;
} {
  const epf = calculateEPF(basicSalary, age);
  const socso = calculateSOCSO(basicSalary);
  const eis = calculateEIS(basicSalary);

  return {
    epf,
    socso,
    eis,
    totalEmployee: epf.employee + socso.employee + eis.employee,
    totalEmployer: epf.employer + socso.employer + eis.employer,
  };
}

/**
 * Get the current statutory config version
 */
export function getStatutoryVersion(): string {
  return '2024.12';
}
