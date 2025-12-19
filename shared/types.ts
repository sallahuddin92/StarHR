// Shared TypeScript interfaces aligned to PostgreSQL schema

export type EpfStatus = 'Mandatory' | 'Voluntary';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn';
export type PayrollStatus = 'draft' | 'locked' | 'processed' | 'paid' | 'cancelled';

export interface Employee {
  id: string;
  tenantId: string;
  employeeId: string;
  fullName: string;
  email: string;
  nric: Buffer | null;
  phoneNumber: string | null;
  department: string | null;
  designation: string | null;
  employmentType: string | null;
  dateOfJoining: string | null;
  dateOfBirth: string | null;
  epfStatus: EpfStatus;
  epfMemberNumber: string | null;
  approvalChain: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceLedger {
  id: string;
  tenantId: string;
  employeeId: string;
  attendanceDate: string; // YYYY-MM-DD
  rawClockIn: string | null;
  verifiedClockIn: string | null;
  rawClockOut: string | null;
  verifiedClockOut: string | null;
  workingHours: number | null;
  otRequestedHours: number | null;
  otApprovedHours: number | null;
  otApprovalStatus: ApprovalStatus;
  remarks: string | null;
  isManualEntry: boolean;
  manualEntryBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollRun {
  id: string;
  tenantId: string;
  payrollMonth: string; // YYYY-MM-01
  runDate: string;
  basicStartDate: string;
  basicEndDate: string;
  otStartDate: string;
  otEndDate: string;
  status: PayrollStatus;
  processedBy: string | null;
  processedDate: string | null;
  totalEmployees: number | null;
  totalGrossAmount: number | null;
  totalDeductions: number | null;
  totalNetAmount: number | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
}
