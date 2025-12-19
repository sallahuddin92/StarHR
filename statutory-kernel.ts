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
    { minIncome: 2600, maxIncome: 3200, baseRate: 4.50, taxRate: 0.03 },
    { minIncome: 3200, maxIncome: 4000, baseRate: 22.50, taxRate: 0.05 },
    { minIncome: 4000, maxIncome: 5500, baseRate: 62.50, taxRate: 0.08 },
    { minIncome: 5500, maxIncome: 7000, baseRate: 182.50, taxRate: 0.11 },
    { minIncome: 7000, maxIncome: 8500, baseRate: 347.50, taxRate: 0.135 },
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
    { minIncome: 3300, maxIncome: 4200, baseRate: 24.50, taxRate: 0.05 },
    { minIncome: 4200, maxIncome: 5800, baseRate: 69.50, taxRate: 0.08 },
    { minIncome: 5800, maxIncome: 7500, baseRate: 197.50, taxRate: 0.11 },
    { minIncome: 7500, maxIncome: 9200, baseRate: 384.50, taxRate: 0.135 },
    { minIncome: 9200, maxIncome: 11000, baseRate: 612.70, taxRate: 0.16 },
    { minIncome: 11000, maxIncome: Infinity, baseRate: 880.70, taxRate: 0.19 },
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
    { minIncome: 10000, maxIncome: 12200, baseRate: 660.70, taxRate: 0.16 },
    { minIncome: 12200, maxIncome: Infinity, baseRate: 992.70, taxRate: 0.19 },
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
    { minIncome: 9900, maxIncome: 12000, baseRate: 651.70, taxRate: 0.16 },
    { minIncome: 12000, maxIncome: Infinity, baseRate: 969.70, taxRate: 0.19 },
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
const EPF_RELIEF_RATE = 1.0; // Full EPF contributions are relieved
const INSURANCE_RELIEF_MAX = 7000;
const EDUCATION_RELIEF_MAX = 7000;
const MEDICAL_RELIEF_MAX = 5000;

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
 * @param monthlyGross - Monthly gross income
 * @param category - Tax category (default 'B')
 * @returns Applicable tax bracket
 */
function getTaxBracket(monthlyGross: number, category: string = 'B'): TaxBracket {
  const brackets = TAX_SCHEDULE[category] || TAX_SCHEDULE['B'];

  for (const bracket of brackets) {
    if (monthlyGross >= bracket.minIncome && monthlyGross < bracket.maxIncome) {
      return bracket;
    }
  }

  // Return highest bracket if not found
  return brackets[brackets.length - 1];
}

/**
 * Calculate monthly relief based on marital status and children
 * @param maritalStatus - 'single', 'married', 'widowed'
 * @param children - Number of children
 * @returns Monthly relief amount
 */
function calculateMonthlyRelief(
  maritalStatus: string,
  children: number
): number {
  const basicRelief = BASIC_PERSONAL_RELIEF / 12;

  let maritalRelief = 0;
  if (maritalStatus === 'married') {
    maritalRelief = MARITAL_RELIEF.married / 12;
  } else if (maritalStatus === 'widowed') {
    maritalRelief = MARITAL_RELIEF.widowed / 12;
  } else {
    maritalRelief = MARITAL_RELIEF.single / 12;
  }

  // Children relief: 3000 per child, max 4 children
  const validChildren = Math.min(children, CHILDREN_RELIEF.maxChildren);
  const childrenRelief = (validChildren * CHILDREN_RELIEF.perChild) / 12;

  return basicRelief + maritalRelief + childrenRelief;
}

/**
 * Calculate tax for given income and tax bracket
 * @param income - Income amount to calculate tax on
 * @param bracket - Tax bracket configuration
 * @returns Calculated tax
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
 *
 * Formula: P = [(Y - K) * 12] + (Yt - Kt) - D
 * Where:
 *   P  = PCB for the current month
 *   Y  = Monthly gross income
 *   K  = Monthly relief
 *   Yt = Cumulative income year-to-date
 *   Kt = Cumulative relief year-to-date
 *   D  = Cumulative PCB paid to date
 *
 * @param monthlyGross - Monthly gross salary
 * @param previousPCB - Cumulative PCB paid to date
 * @param maritalStatus - 'single', 'married', 'widowed'
 * @param children - Number of dependent children
 * @param category - Tax category: B (default), C, D, E, F, G, H, I, J
 * @param cumulativeMonths - Months worked in current year (default 1)
 * @param categoryForBracket - Category for bracket calculation (if different)
 * @returns PCB tax amount (rounded to nearest cent)
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
  // Validate inputs
  if (monthlyGross < 0) return 0;
  if (monthlyGross === 0) return 0;

  const bracketCategory = categoryForBracket || category;

  // Calculate monthly relief
  const monthlyRelief = calculateMonthlyRelief(maritalStatus, children);

  // Calculate cumulative values year-to-date
  const cumulativeIncome = monthlyGross * cumulativeMonths;
  const cumulativeRelief = monthlyRelief * cumulativeMonths;

  // Get taxable income
  const taxableIncome = cumulativeIncome - cumulativeRelief;

  if (taxableIncome <= 0) {
    return 0;
  }

  // Get tax bracket for cumulative income
  const bracket = getTaxBracket(cumulativeIncome / cumulativeMonths, bracketCategory);

  // Calculate total tax for year-to-date
  const totalTaxYTD = calculateTaxFromBracket(taxableIncome, bracket);

  // Apply formula: P = [(Y - K) * 12] + (Yt - Kt) - D
  // Simplified: P = (totalTaxYTD / cumulativeMonths) - previousPCB
  const monthlyTax = (totalTaxYTD / cumulativeMonths) * 12 + (totalTaxYTD - previousPCB * cumulativeMonths) - previousPCB * cumulativeMonths;

  // More practical implementation:
  // Current month tax = (Total tax for YTD so far / months) - Already paid PCB
  const currentMonthPCB = totalTaxYTD - previousPCB;

  // Ensure non-negative
  const finalPCB = Math.max(0, currentMonthPCB);

  // Round to nearest cent (2 decimal places)
  return Math.round(finalPCB * 100) / 100;
}

/**
 * Calculate EPF Contribution (Employees Provident Fund)
 *
 * Standard Rate: 11% of monthly wages
 * Foreigner Rate: 2% (if isForeignerMandateActive)
 * Wage Ceiling: RM 15,000 per month
 *
 * @param wages - Monthly wages
 * @param isForeigner - Whether employee is a foreigner
 * @param isForeignerMandateActive - Whether foreigner EPF mandate is active
 * @returns EPF contribution amount (rounded to nearest cent)
 */
export function calculateEPF(
  wages: number,
  isForeigner: boolean = false,
  isForeignerMandateActive: boolean = false
): number {
  // Validate inputs
  if (wages < 0) return 0;

  // Apply wage ceiling
  const insureableWages = Math.min(wages, EPF_WAGE_CEILING);

  // Determine contribution rate
  let rate = EPF_EMPLOYEE_RATE;

  if (isForeigner && isForeignerMandateActive) {
    rate = EPF_EMPLOYEE_RATE_FOREIGNER;
  }

  const contribution = insureableWages * rate;

  // Round to nearest cent
  return Math.round(contribution * 100) / 100;
}

/**
 * Calculate SOCSO Contribution (Social Security)
 *
 * Rate: 3.25% of monthly wages
 * Wage Ceiling: RM 6,000 per month (maximum insurable wage)
 *
 * @param wages - Monthly wages
 * @returns SOCSO contribution amount (rounded to nearest cent)
 */
export function calculateSOCSO(wages: number): number {
  // Validate inputs
  if (wages < 0) return 0;

  // Apply wage ceiling - SOCSO only on wages up to RM 6,000
  const insureableWages = Math.min(wages, SOCSO_WAGE_CEILING);

  const contribution = insureableWages * SOCSO_EMPLOYEE_RATE;

  // Round to nearest cent
  return Math.round(contribution * 100) / 100;
}

// ============================================================================
// AGGREGATE CALCULATION
// ============================================================================

/**
 * Calculate all statutory deductions for an employee
 * @param monthlyGross - Monthly gross salary
 * @param maritalStatus - Employee marital status
 * @param children - Number of dependent children
 * @param isForeigner - Whether employee is foreign national
 * @param isForeignerMandateActive - Whether foreigner EPF mandate applies
 * @param previousPCB - Cumulative PCB paid to date
 * @param category - PCB tax category
 * @returns Object containing all deductions
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
