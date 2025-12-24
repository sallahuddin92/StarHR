/**
 * Statutory Kernel Module
 * Deployment: Google Cloud Function
 * Purpose: Calculate statutory deductions for Malaysian payroll
 * Author: Enterprise HR Portal
 * Date: 2025-12-19
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface TaxBracket {
  minIncome: number;
  maxIncome: number;
  baseRate: number;
  taxRate: number;
}

interface TaxSchedule {
  [category: string]: TaxBracket[];
}

interface MaritalRelief {
  single: number;
  married: number;
  widowed: number;
}

interface ChildrenRelief {
  perChild: number;
  maxChildren: number;
}

// ============================================================================
// TAX SCHEDULE - 2025 MALAYSIAN PCB TAX BRACKETS
// ============================================================================

/**
 * 2025 Malaysia Personal Income Tax Schedule
 * Categories B-J (Resident Individuals)
 * Gross monthly income-based brackets
 */
const TAX_SCHEDULE: TaxSchedule = {
  // Category B: Unmarried Residents
  B: [
    { minIncome: 0, maxIncome: 2150, baseRate: 0, taxRate: 0 },
    { minIncome: 2150, maxIncome: 2600, baseRate: 0, taxRate: 0.01 },
    { minIncome: 2600, maxIncome: 3200, baseRate: 4.5, taxRate: 0.03 },
    { minIncome: 3200, maxIncome: 4000, baseRate: 22.5, taxRate: 0.05 },
    { minIncome: 4000, maxIncome: 5500, baseRate: 62.5, taxRate: 0.08 },
    { minIncome: 5500, maxIncome: 7000, baseRate: 182.5, taxRate: 0.11 },
    { minIncome: 7000, maxIncome: 8500, baseRate: 347.5, taxRate: 0.135 },
    { minIncome: 8500, maxIncome: 10000, baseRate: 549.25, taxRate: 0.16 },
    { minIncome: 10000, maxIncome: Infinity, baseRate: 789.25, taxRate: 0.19 },
  ],

  // Category C: Married Residents (One Income)
  C: [
    { minIncome: 0, maxIncome: 2150, baseRate: 0, taxRate: 0 },
    { minIncome: 2150, maxIncome: 2800, baseRate: 0, taxRate: 0.01 },
    { minIncome: 2800, maxIncome: 3500, baseRate: 7, taxRate: 0.03 },
    { minIncome: 3500, maxIncome: 4500, baseRate: 28, taxRate: 0.05 },
    { minIncome: 4500, maxIncome: 6500, baseRate: 78, taxRate: 0.08 },
    { minIncome: 6500, maxIncome: 8500, baseRate: 238, taxRate: 0.11 },
    { minIncome: 8500, maxIncome: 10500, baseRate: 458, taxRate: 0.135 },
    { minIncome: 10500, maxIncome: 12500, baseRate: 727, taxRate: 0.16 },
    { minIncome: 12500, maxIncome: Infinity, baseRate: 1047, taxRate: 0.19 },
  ],

  // Category D: Married Residents (Dual Income)
  D: [
    { minIncome: 0, maxIncome: 2150, baseRate: 0, taxRate: 0 },
    { minIncome: 2150, maxIncome: 2800, baseRate: 0, taxRate: 0.01 },
    { minIncome: 2800, maxIncome: 3500, baseRate: 7, taxRate: 0.03 },
    { minIncome: 3500, maxIncome: 4500, baseRate: 28, taxRate: 0.05 },
    { minIncome: 4500, maxIncome: 6500, baseRate: 78, taxRate: 0.08 },
    { minIncome: 6500, maxIncome: 8500, baseRate: 238, taxRate: 0.11 },
    { minIncome: 8500, maxIncome: 10500, baseRate: 458, taxRate: 0.135 },
    { minIncome: 10500, maxIncome: 12500, baseRate: 727, taxRate: 0.16 },
    { minIncome: 12500, maxIncome: Infinity, baseRate: 1047, taxRate: 0.19 },
  ],

  // Category E: Single Parent with Children
  E: [
    { minIncome: 0, maxIncome: 2150, baseRate: 0, taxRate: 0 },
    { minIncome: 2150, maxIncome: 2650, baseRate: 0, taxRate: 0.01 },
    { minIncome: 2650, maxIncome: 3300, baseRate: 5, taxRate: 0.03 },
    { minIncome: 3300, maxIncome: 4200, baseRate: 24.5, taxRate: 0.05 },
    { minIncome: 4200, maxIncome: 5800, baseRate: 69.5, taxRate: 0.08 },
    { minIncome: 5800, maxIncome: 7500, baseRate: 197.5, taxRate: 0.11 },
    { minIncome: 7500, maxIncome: 9200, baseRate: 384.5, taxRate: 0.135 },
    { minIncome: 9200, maxIncome: 11000, baseRate: 612.7, taxRate: 0.16 },
    { minIncome: 11000, maxIncome: Infinity, baseRate: 880.7, taxRate: 0.19 },
  ],

  // Category F: Young Workers (Age < 21)
  F: [
    { minIncome: 0, maxIncome: 2000, baseRate: 0, taxRate: 0 },
    { minIncome: 2000, maxIncome: 2500, baseRate: 0, taxRate: 0.01 },
    { minIncome: 2500, maxIncome: 3000, baseRate: 5, taxRate: 0.03 },
    { minIncome: 3000, maxIncome: 3800, baseRate: 20, taxRate: 0.05 },
    { minIncome: 3800, maxIncome: 5000, baseRate: 60, taxRate: 0.08 },
    { minIncome: 5000, maxIncome: 6500, baseRate: 156, taxRate: 0.11 },
    { minIncome: 6500, maxIncome: 8000, baseRate: 321, taxRate: 0.135 },
    { minIncome: 8000, maxIncome: 9500, baseRate: 527.75, taxRate: 0.16 },
    { minIncome: 9500, maxIncome: Infinity, baseRate: 767.75, taxRate: 0.19 },
  ],

  // Category G: Foreign Nationals
  G: [
    { minIncome: 0, maxIncome: 3000, baseRate: 0, taxRate: 0 },
    { minIncome: 3000, maxIncome: 4000, baseRate: 0, taxRate: 0.03 },
    { minIncome: 4000, maxIncome: 5000, baseRate: 30, taxRate: 0.06 },
    { minIncome: 5000, maxIncome: 6500, baseRate: 90, taxRate: 0.09 },
    { minIncome: 6500, maxIncome: 8000, baseRate: 225, taxRate: 0.12 },
    { minIncome: 8000, maxIncome: 10000, baseRate: 405, taxRate: 0.15 },
    { minIncome: 10000, maxIncome: Infinity, baseRate: 705, taxRate: 0.19 },
  ],

  // Category H: Directors/Company Owners
  H: [
    { minIncome: 0, maxIncome: 2400, baseRate: 0, taxRate: 0 },
    { minIncome: 2400, maxIncome: 3000, baseRate: 0, taxRate: 0.01 },
    { minIncome: 3000, maxIncome: 3700, baseRate: 6, taxRate: 0.03 },
    { minIncome: 3700, maxIncome: 4600, baseRate: 27, taxRate: 0.05 },
    { minIncome: 4600, maxIncome: 6300, baseRate: 72, taxRate: 0.08 },
    { minIncome: 6300, maxIncome: 8200, baseRate: 208, taxRate: 0.11 },
    { minIncome: 8200, maxIncome: 10000, baseRate: 417, taxRate: 0.135 },
    { minIncome: 10000, maxIncome: 12200, baseRate: 660.7, taxRate: 0.16 },
    { minIncome: 12200, maxIncome: Infinity, baseRate: 992.7, taxRate: 0.19 },
  ],

  // Category I: Non-Resident Employees
  I: [
    { minIncome: 0, maxIncome: 3500, baseRate: 0, taxRate: 0 },
    { minIncome: 3500, maxIncome: 5000, baseRate: 0, taxRate: 0.03 },
    { minIncome: 5000, maxIncome: 6500, baseRate: 45, taxRate: 0.06 },
    { minIncome: 6500, maxIncome: 8500, baseRate: 135, taxRate: 0.09 },
    { minIncome: 8500, maxIncome: 10500, baseRate: 315, taxRate: 0.12 },
    { minIncome: 10500, maxIncome: 12500, baseRate: 555, taxRate: 0.15 },
    { minIncome: 12500, maxIncome: Infinity, baseRate: 855, taxRate: 0.19 },
  ],

  // Category J: Deferred / Special Cases
  J: [
    { minIncome: 0, maxIncome: 2500, baseRate: 0, taxRate: 0 },
    { minIncome: 2500, maxIncome: 3100, baseRate: 0, taxRate: 0.01 },
    { minIncome: 3100, maxIncome: 3800, baseRate: 6, taxRate: 0.03 },
    { minIncome: 3800, maxIncome: 4700, baseRate: 27, taxRate: 0.05 },
    { minIncome: 4700, maxIncome: 6300, baseRate: 72, taxRate: 0.08 },
    { minIncome: 6300, maxIncome: 8100, baseRate: 205, taxRate: 0.11 },
    { minIncome: 8100, maxIncome: 9900, baseRate: 403, taxRate: 0.135 },
    { minIncome: 9900, maxIncome: 12000, baseRate: 651.7, taxRate: 0.16 },
    { minIncome: 12000, maxIncome: Infinity, baseRate: 969.7, taxRate: 0.19 },
  ],
};

// ============================================================================
// RELIEF & ALLOWANCES - 2025
// ============================================================================

const MARITAL_RELIEF: MaritalRelief = {
  single: 9000,
  married: 18000,
  widowed: 13500,
};

const CHILDREN_RELIEF: ChildrenRelief = {
  perChild: 3000,
  maxChildren: 4,
};

const BASIC_PERSONAL_RELIEF = 9000;

// ============================================================================
// EPF CONFIGURATION - 2025
// ============================================================================

const EPF_EMPLOYEE_RATE = 0.11; // 11% for standard
const EPF_EMPLOYEE_RATE_FOREIGNER = 0.02; // 2% for foreigners with mandate
const EPF_WAGE_CEILING = 15000; // Monthly wage ceiling

// ============================================================================
// SOCSO CONFIGURATION - 2025
// ============================================================================

const SOCSO_EMPLOYEE_RATE = 0.0325; // 3.25%
const SOCSO_WAGE_CEILING = 6000; // Maximum insurable wage

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get applicable tax bracket for given income
 */
function getTaxBracket(monthlyGross: number, category: string = 'B'): TaxBracket {
  const brackets = TAX_SCHEDULE[category] || TAX_SCHEDULE['B'];

  for (const bracket of brackets) {
    if (monthlyGross >= bracket.minIncome && monthlyGross < bracket.maxIncome) {
      return bracket;
    }
  }

  return brackets[brackets.length - 1];
}

/**
 * Calculate monthly relief based on marital status and children
 */
function calculateMonthlyRelief(maritalStatus: string, children: number): number {
  const basicRelief = BASIC_PERSONAL_RELIEF / 12;

  let maritalRelief = 0;
  if (maritalStatus === 'married') {
    maritalRelief = MARITAL_RELIEF.married / 12;
  } else if (maritalStatus === 'widowed') {
    maritalRelief = MARITAL_RELIEF.widowed / 12;
  } else {
    maritalRelief = MARITAL_RELIEF.single / 12;
  }

  const validChildren = Math.min(children, CHILDREN_RELIEF.maxChildren);
  const childrenRelief = (validChildren * CHILDREN_RELIEF.perChild) / 12;

  return basicRelief + maritalRelief + childrenRelief;
}

/**
 * Calculate tax for given income and tax bracket
 */
function calculateTaxFromBracket(income: number, bracket: TaxBracket): number {
  const taxableIncome = income - bracket.minIncome;
  return bracket.baseRate + taxableIncome * bracket.taxRate;
}

// ============================================================================
// PUBLIC FUNCTIONS
// ============================================================================

/**
 * Calculate Malaysian PCB Tax (Personal Income Tax) for 2025
 */
export function calculatePCB2025(
  monthlyGross: number,
  previousPCB: number = 0,
  maritalStatus: string = 'single',
  children: number = 0,
  category: string = 'B',
  cumulativeMonths: number = 1,
  categoryForBracket?: string
): number {
  if (monthlyGross <= 0) return 0;

  const bracketCategory = categoryForBracket || category;
  const monthlyRelief = calculateMonthlyRelief(maritalStatus, children);
  const cumulativeIncome = monthlyGross * cumulativeMonths;
  const cumulativeRelief = monthlyRelief * cumulativeMonths;
  const taxableIncome = cumulativeIncome - cumulativeRelief;

  if (taxableIncome <= 0) return 0;

  const bracket = getTaxBracket(cumulativeIncome / cumulativeMonths, bracketCategory);
  const totalTaxYTD = calculateTaxFromBracket(taxableIncome, bracket);
  const currentMonthPCB = totalTaxYTD - previousPCB;
  const finalPCB = Math.max(0, currentMonthPCB);

  return Math.round(finalPCB * 100) / 100;
}

/**
 * Calculate EPF Contribution (Employees Provident Fund)
 */
export function calculateEPF(
  wages: number,
  isForeigner: boolean = false,
  isForeignerMandateActive: boolean = false
): number {
  if (wages <= 0) return 0;

  const insureableWages = Math.min(wages, EPF_WAGE_CEILING);
  let rate = EPF_EMPLOYEE_RATE;

  if (isForeigner && isForeignerMandateActive) {
    rate = EPF_EMPLOYEE_RATE_FOREIGNER;
  }

  const contribution = insureableWages * rate;
  return Math.round(contribution * 100) / 100;
}

/**
 * Calculate SOCSO Contribution (Social Security)
 */
export function calculateSOCSO(wages: number): number {
  if (wages <= 0) return 0;

  const insureableWages = Math.min(wages, SOCSO_WAGE_CEILING);
  const contribution = insureableWages * SOCSO_EMPLOYEE_RATE;

  return Math.round(contribution * 100) / 100;
}

// ============================================================================
// AGGREGATE CALCULATION
// ============================================================================

/**
 * Calculate all statutory deductions for an employee
 */
export function calculateAllDeductions(
  monthlyGross: number,
  maritalStatus: string = 'single',
  children: number = 0,
  isForeigner: boolean = false,
  isForeignerMandateActive: boolean = false,
  previousPCB: number = 0,
  category: string = 'B'
): {
  pcb: number;
  epf: number;
  socso: number;
  totalDeductions: number;
} {
  const pcb = calculatePCB2025(monthlyGross, previousPCB, maritalStatus, children, category);
  const epf = calculateEPF(monthlyGross, isForeigner, isForeignerMandateActive);
  const socso = calculateSOCSO(monthlyGross);

  return {
    pcb,
    epf,
    socso,
    totalDeductions: pcb + epf + socso,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  TAX_SCHEDULE,
  MARITAL_RELIEF,
  CHILDREN_RELIEF,
  EPF_EMPLOYEE_RATE,
  EPF_WAGE_CEILING,
  SOCSO_EMPLOYEE_RATE,
  SOCSO_WAGE_CEILING,
};

export default {
  calculatePCB2025,
  calculateEPF,
  calculateSOCSO,
  calculateAllDeductions,
};
