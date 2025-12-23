/**
 * Frontend API Client
 * Centralized API calls with automatic JWT handling
 * 
 * Usage:
 *   import { api } from '@/lib/api';
 *   const { data } = await api.employees.getAll();
 *   await api.auth.login({ identifier, password });
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const TOKEN_KEY = 'authToken';
const LOGIN_PATH = '/login';

// ============================================================================
// TYPES
// ============================================================================

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  details?: Array<{ field: string; message: string }>;
}

interface LoginCredentials {
  identifier: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
    tenantId: string;
  };
}

interface Employee {
  id: string;
  employee_id: string;
  full_name: string;
  email: string;
  department: string | null;
  designation: string | null;
  phone_number?: string;
  date_of_joining?: string;
}

interface PayrollDraftParams {
  basicStartDate: string;
  basicEndDate: string;
  otStartDate: string;
  otEndDate: string;
}

interface PayrollDraftResponse {
  tenantId: string;
  payrollRunId: string;
  payrollPeriod: {
    basicStart: string;
    basicEnd: string;
    otStart: string;
    otEnd: string;
  };
  summary: {
    totalEmployees: number;
    totalGross: number;
    totalDeductions: number;
    totalNet: number;
    totalPCB: number;
    totalEPF: number;
    totalSOCSO: number;
  };
  employees: Array<{
    employeeId: string;
    employeeName: string;
    basicSalary: number;
    overtimeHours: number;
    overtimeAmount: number;
    grossAmount: number;
    deductions: {
      pcb: number;
      epf: number;
      socso: number;
      total: number;
    };
    netAmount: number;
  }>;
  generatedAt: string;
}

interface EWARequest {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  accruedSalary: number;
  safeLimit: number;
  requestedAmount: number;
  requestDate: string;
  daysWorked: number;
}

interface EWARequestParams {
  employeeId: string;
  amount: number;
}

interface DashboardSummary {
  totalEmployees: number;
  newEmployeesThisMonth: number;
  pendingLeave: number;
  pendingAttendance: number;
  pendingEwa: number;
  nextPayrollDate: string | null;
  payrollCutoffDate: string | null;
}

interface AttendanceRecord {
  id: string;
  employee_id: string;
  full_name: string;
  emp_code: string;
  attendance_date: string;
  raw_clock_in: string | null;
  raw_clock_out: string | null;
  verified_clock_in: string | null;
  verified_clock_out: string | null;
  working_hours: number | null;
  ot_requested_hours: number;
  ot_approved_hours: number;
  ot_approval_status: string;
}

interface ClockInParams {
  workerId: string;
  timestamp: string;
  deviceId: string;
  gps?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
}

interface ApprovalRequest {
  id: string;
  type: 'OT' | 'LEAVE' | 'CLAIM';
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  designation: string;
  avatarUrl: string | null;
  submittedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  currentStep: number;
  totalSteps: number;
  details: {
    attendanceDate?: string;
    clockIn?: string;
    clockOut?: string;
    requestedHours?: number;
    approvedHours?: number;
    notes?: string;
  };
}

interface EmployeeDocument {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  avatarUrl: string | null;
  netPay: number;
  status: 'Ready' | 'Generating' | 'Pending' | 'Error';
  documentType: 'payslip' | 'ea-form';
  period: string;
  generatedAt: string | null;
}

interface DocumentBatch {
  id: string;
  batchType: 'payslip' | 'ea-form';
  period: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  totalEmployees: number;
  processedCount: number;
  createdAt: string;
  completedAt: string | null;
}

interface PayslipData {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  designation: string;
  email: string;
  period: string;
  earnings: {
    basicSalary: number;
    housingAllowance: number;
    transportAllowance: number;
    overtime: number;
    bonus: number;
    total: number;
  };
  deductions: {
    epf: number;
    socso: number;
    eis: number;
    pcb: number;
    total: number;
  };
  netPay: number;
  payDate: string;
  generatedAt: string;
}

interface PayslipPdfData {
  type: 'payslip';
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  designation: string;
  period: string;
  periodDisplay: string;
  earnings: {
    basicSalary: number;
    allowances: number;
    overtime: number;
    bonus: number;
    grossTotal: number;
  };
  deductions: {
    epfEmployee: number;
    socsoEmployee: number;
    eisEmployee: number;
    pcb: number;
    totalDeductions: number;
  };
  employerContributions: {
    epfEmployer: number;
    socsoEmployer: number;
    eisEmployer: number;
  };
  netPay: number;
  paymentDate: string;
  bankAccount: string;
  generatedAt: string;
  companyName: string;
  companyAddress: string;
}

interface EaFormData {
  type: 'ea-form';
  year: number;
  // Part A - Employer Details
  employerNo: string;
  employerName: string;
  employerAddress: string;
  // Part B - Employee Details
  employeeNo: string;
  employeeName: string;
  icNo: string;
  dateOfBirth: string | null;
  // Part C - Employment Details
  category: string;
  commencementDate: string | null;
  // Part D - Remuneration
  salaryWages: number;
  bonus: number;
  directorsFee: number;
  commission: number;
  allowances: number;
  gratuity: number;
  otherPerquisites: number;
  totalGrossRemuneration: number;
  // Part E - Deductions
  epfContribution: number;
  socsoContribution: number;
  zakat: number;
  totalDeductions: number;
  // Part F - Tax
  pcbDeducted: number;
  cp38Deducted: number;
  totalTaxDeducted: number;
  // Metadata
  generatedAt: string;
  formNo: string;
}

// ============================================================================
// HTTP CLIENT
// ============================================================================

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Get the JWT token from localStorage
 */
function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Set the JWT token in localStorage
 */
function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Remove the JWT token from localStorage
 */
function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Redirect to login page
 */
function redirectToLogin(): void {
  removeToken();
  // Only redirect if not already on login page
  if (window.location.pathname !== LOGIN_PATH) {
    window.location.href = LOGIN_PATH;
  }
}

/**
 * Core fetch wrapper with auth handling
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

  // Build headers with auth token
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const token = getToken();
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle 401 Unauthorized - redirect to login
    if (response.status === 401) {
      redirectToLogin();
      throw new ApiError('Session expired. Please log in again.', 401);
    }

    // Parse response
    const data = await response.json();

    // Handle other error status codes
    if (!response.ok) {
      throw new ApiError(
        data.message || data.error || `Request failed with status ${response.status}`,
        response.status,
        data
      );
    }

    return data;
  } catch (error) {
    // Network errors
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      error instanceof Error ? error.message : 'Network error',
      0
    );
  }
}

// ============================================================================
// API METHODS
// ============================================================================

export const api = {
  /**
   * Authentication endpoints
   */
  auth: {
    /**
     * Login with email and password
     */
    async login(credentials: LoginCredentials): Promise<LoginResponse> {
      const response = await request<LoginResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      // Auto-store token on successful login
      if (response.success && response.data?.token) {
        setToken(response.data.token);
      } else if ((response as unknown as LoginResponse).token) {
        // Handle case where token is at root level
        setToken((response as unknown as LoginResponse).token);
      }

      return response as unknown as LoginResponse;
    },

    /**
     * Logout - clear token and redirect
     */
    logout(): void {
      redirectToLogin();
    },

    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean {
      return !!getToken();
    },

    /**
     * Get current token
     */
    getToken,
  },

  /**
   * Employee endpoints
   */
  employees: {
    /**
     * Get all employees for the tenant
     */
    async getAll(): Promise<ApiResponse<Employee[]>> {
      return request<Employee[]>('/api/employees');
    },

    /**
     * Get employee by ID
     */
    async getById(id: string): Promise<ApiResponse<Employee>> {
      return request<Employee>(`/api/employees/${id}`);
    },

    /**
     * Create new employee
     */
    async create(employee: Partial<Employee>): Promise<ApiResponse<Employee>> {
      return request<Employee>('/api/employees', {
        method: 'POST',
        body: JSON.stringify(employee),
      });
    },

    /**
     * Update employee
     */
    async update(id: string, employee: Partial<Employee>): Promise<ApiResponse<Employee>> {
      return request<Employee>(`/api/employees/${id}`, {
        method: 'PUT',
        body: JSON.stringify(employee),
      });
    },
  },

  /**
   * Payroll endpoints
   */
  payroll: {
    /**
     * Generate draft payroll
     */
    async runDraft(params: PayrollDraftParams): Promise<ApiResponse<PayrollDraftResponse>> {
      return request<PayrollDraftResponse>('/api/payroll/run-draft', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },

    /**
     * Get payroll runs
     */
    async getRuns(status?: string, limit?: number): Promise<ApiResponse<unknown[]>> {
      const queryParams = new URLSearchParams();
      if (status) queryParams.set('status', status);
      if (limit) queryParams.set('limit', String(limit));

      const query = queryParams.toString();
      return request<unknown[]>(`/api/payroll/runs${query ? `?${query}` : ''}`);
    },

    /**
     * Finalize payroll run
     */
    async finalize(runId: string): Promise<ApiResponse<unknown>> {
      return request<unknown>(`/api/payroll/runs/${runId}/finalize`, {
        method: 'POST',
      });
    },
  },

  /**
   * Attendance endpoints
   */
  attendance: {
    /**
     * Get all attendance records
     */
    async getAll(): Promise<ApiResponse<AttendanceRecord[]>> {
      return request<AttendanceRecord[]>('/api/attendance');
    },

    /**
     * Clock in
     */
    async clockIn(params: ClockInParams): Promise<ApiResponse<unknown>> {
      return request<unknown>('/api/attendance/clock-in', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },

    /**
     * Clock out
     */
    async clockOut(attendanceId: string): Promise<ApiResponse<unknown>> {
      return request<unknown>(`/api/attendance/${attendanceId}/clock-out`, {
        method: 'PUT',
      });
    },

    /**
     * Approve overtime
     */
    async approveOT(attendanceId: string, hours: number): Promise<ApiResponse<unknown>> {
      return request<unknown>(`/api/attendance/${attendanceId}/approve-ot`, {
        method: 'PUT',
        body: JSON.stringify({ approvedHours: hours }),
      });
    },

    /**
     * Fix missing punch - manually set clock-out time
     */
    async fixMissingPunch(attendanceId: string, clockOutTime: string, remarks?: string): Promise<ApiResponse<{
      id: string;
      clockIn: string;
      clockOut: string;
      workingHours: number;
      isManualEntry: boolean;
    }>> {
      return request(`/api/attendance/${attendanceId}/fix-missing-punch`, {
        method: 'PUT',
        body: JSON.stringify({ clockOutTime, remarks }),
      });
    },
  },

  /**
   * EWA (Earned Wage Access) endpoints
   */
  ewa: {
    /**
     * Get pending EWA requests
     */
    async getPending(): Promise<ApiResponse<EWARequest[]>> {
      return request<EWARequest[]>('/api/ewa/pending');
    },

    /**
     * Submit EWA request
     */
    async request(params: EWARequestParams): Promise<ApiResponse<unknown>> {
      return request<unknown>('/api/ewa/request', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },

    /**
     * Get EWA balance for employee
     */
    async getBalance(employeeId: string): Promise<ApiResponse<unknown>> {
      return request<unknown>(`/api/ewa/balance/${employeeId}`);
    },

    /**
     * Approve EWA request
     */
    async approve(
      id: string,
      params?: { approvedAmount?: number; notes?: string }
    ): Promise<ApiResponse<unknown>> {
      return request<unknown>(`/api/ewa/${id}/approve`, {
        method: 'PUT',
        body: JSON.stringify(params || {}),
      });
    },

    /**
     * Reject EWA request
     */
    async reject(id: string, reason: string): Promise<ApiResponse<unknown>> {
      return request<unknown>(`/api/ewa/${id}/reject`, {
        method: 'PUT',
        body: JSON.stringify({ reason }),
      });
    },

    /**
     * Get EWA history for employee
     */
    async getHistory(
      employeeId: string,
      options?: { limit?: number; offset?: number }
    ): Promise<ApiResponse<unknown[]>> {
      const queryParams = new URLSearchParams();
      if (options?.limit) queryParams.set('limit', String(options.limit));
      if (options?.offset) queryParams.set('offset', String(options.offset));

      const query = queryParams.toString();
      return request<unknown[]>(`/api/ewa/history/${employeeId}${query ? `?${query}` : ''}`);
    },
  },

  /**
   * Dashboard stats endpoints
   */
  stats: {
    /**
     * Get dashboard summary statistics
     */
    async getSummary(): Promise<ApiResponse<DashboardSummary>> {
      return request<DashboardSummary>('/api/stats/summary');
    },
  },

  /**
   * Approvals endpoints
   */
  approvals: {
    /**
     * Get pending approval requests
     */
    async getPending(type?: 'OT' | 'LEAVE' | 'CLAIM' | 'ALL'): Promise<ApiResponse<ApprovalRequest[]>> {
      const params = type ? `?type=${type}` : '';
      return request<ApprovalRequest[]>(`/api/approvals/pending${params}`);
    },

    /**
     * Get approval request by ID
     */
    async getById(id: string): Promise<ApiResponse<ApprovalRequest>> {
      return request<ApprovalRequest>(`/api/approvals/${id}`);
    },

    /**
     * Approve a request
     */
    async approve(id: string, notes?: string): Promise<ApiResponse<{ id: string; status: string; approvedHours?: number }>> {
      return request(`/api/approvals/${id}/approve`, {
        method: 'PUT',
        body: JSON.stringify({ notes }),
      });
    },

    /**
     * Reject a request
     */
    async reject(id: string, reason: string): Promise<ApiResponse<{ id: string; status: string; reason: string }>> {
      return request(`/api/approvals/${id}/reject`, {
        method: 'PUT',
        body: JSON.stringify({ reason }),
      });
    },

    /**
     * Get approval history
     */
    async getHistory(options?: { status?: string; limit?: number; offset?: number }): Promise<ApiResponse<unknown[]>> {
      const params = new URLSearchParams();
      if (options?.status) params.set('status', options.status);
      if (options?.limit) params.set('limit', String(options.limit));
      if (options?.offset) params.set('offset', String(options.offset));
      const query = params.toString();
      return request<unknown[]>(`/api/approvals/history/all${query ? `?${query}` : ''}`);
    },
  },

  /**
   * Documents endpoints
   */
  documents: {
    /**
     * Get employees with document status
     */
    async getEmployees(options?: { type?: string; period?: string; limit?: number; offset?: number }): Promise<ApiResponse<EmployeeDocument[]>> {
      const params = new URLSearchParams();
      if (options?.type) params.set('type', options.type);
      if (options?.period) params.set('period', options.period);
      if (options?.limit) params.set('limit', String(options.limit));
      if (options?.offset) params.set('offset', String(options.offset));
      const query = params.toString();
      return request<EmployeeDocument[]>(`/api/documents/employees${query ? `?${query}` : ''}`);
    },

    /**
     * Get document batches
     */
    async getBatches(): Promise<ApiResponse<DocumentBatch[]>> {
      return request<DocumentBatch[]>('/api/documents/batches');
    },

    /**
     * Generate document batch
     */
    async generate(params: { type: 'payslip' | 'ea-form'; period: string; employeeIds?: string[] }): Promise<ApiResponse<DocumentBatch>> {
      return request<DocumentBatch>('/api/documents/generate', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },

    /**
     * Get payslip for employee
     */
    async getPayslip(employeeId: string, period: string): Promise<ApiResponse<PayslipData>> {
      return request<PayslipData>(`/api/documents/${employeeId}/payslip/${period}`);
    },

    /**
     * Get payslip PDF data for printing/download
     */
    async getPayslipPdf(employeeId: string, period: string): Promise<ApiResponse<PayslipPdfData>> {
      return request<PayslipPdfData>(`/api/documents/${employeeId}/payslip/${period}/pdf`);
    },

    /**
     * Get EA Form data for an employee
     */
    async getEaForm(employeeId: string, year: string): Promise<ApiResponse<EaFormData>> {
      return request<EaFormData>(`/api/documents/${employeeId}/ea-form/${year}`);
    },

    /**
     * Download batch of documents
     */
    async downloadBatch(params: { type: 'payslip' | 'ea-form'; period: string; employeeIds: string[] }): Promise<ApiResponse<{ downloadUrl: string; documentCount: number }>> {
      return request('/api/documents/download-batch', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },

    /**
     * Broadcast documents via WhatsApp/Email
     */
    async broadcast(params: { channel?: 'whatsapp' | 'email'; employeeIds?: string[] }): Promise<ApiResponse<{ channel: string; recipientCount: number; queuedAt: string }>> {
      return request('/api/documents/broadcast', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

export { ApiError, getToken, setToken, removeToken };
export type {
  ApiResponse,
  LoginCredentials,
  LoginResponse,
  Employee,
  PayrollDraftParams,
  PayrollDraftResponse,
  EWARequest,
  EWARequestParams,
  DashboardSummary,
  AttendanceRecord,
  ClockInParams,
  ApprovalRequest,
  EmployeeDocument,
  DocumentBatch,
  PayslipData,
  PayslipPdfData,
  EaFormData,
};
