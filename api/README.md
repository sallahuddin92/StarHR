# Enterprise HR Portal - API Documentation

## Overview

This document describes the REST API endpoints for the Enterprise HR Portal backend.

**Base URL:** `http://localhost:3001/api`

## Authentication

All endpoints require authentication (to be implemented). Currently, no authentication is enforced during development.

---

## Endpoints

### 1. Attendance

#### POST `/api/attendance/clock-in`

Records employee clock-in/clock-out with double-punch protection.

**Request Body:**

```json
{
  "workerId": "uuid",          // Required: Employee UUID
  "timestamp": "ISO 8601",     // Required: Clock timestamp
  "gps": {                     // Optional: GPS coordinates
    "latitude": number,
    "longitude": number,
    "accuracy": number,
    "altitude": number
  },
  "deviceId": "string"         // Required: Device identifier
}
```

**Responses:**

| Status | Description                                    |
| ------ | ---------------------------------------------- |
| 201    | Clock-in recorded successfully                 |
| 200    | Clock-out recorded successfully                |
| 400    | Validation error                               |
| 404    | Employee not found                             |
| 429    | Double punch detected (within 5-minute window) |

**Example Success Response (201):**

```json
{
  "success": true,
  "message": "Clock-in recorded successfully",
  "data": {
    "attendanceId": "uuid",
    "workerId": "uuid",
    "clockInTime": "2025-12-19T08:30:00.000Z",
    "isNewEntry": true
  }
}
```

**Example Double Punch Response (429):**

```json
{
  "success": false,
  "error": "Double Punch Detected",
  "message": "A punch was recorded 2 minute(s) ago. Please wait 3 more minute(s).",
  "code": "DOUBLE_PUNCH",
  "data": {
    "lastPunchTime": "2025-12-19T08:28:00.000Z",
    "debounceWindowMinutes": 5,
    "attendanceId": "uuid"
  }
}
```

#### GET `/api/attendance/status/:workerId`

Get current attendance status for a worker.

**Response:**

```json
{
  "success": true,
  "status": "CLOCKED_IN | CLOCKED_OUT | NOT_CLOCKED_IN",
  "message": "Currently clocked in",
  "data": {
    "attendanceId": "uuid",
    "clockIn": "2025-12-19T08:30:00.000Z",
    "clockOut": null,
    "totalShifts": 1
  }
}
```

---

### 2. Payroll

#### POST `/api/payroll/run-draft`

Generate a draft payroll run with statutory deductions calculated.

**Request Body:**

```json
{
  "tenantId": "uuid", // Required: Tenant UUID
  "basicStartDate": "YYYY-MM-DD", // Required: Basic salary period start
  "basicEndDate": "YYYY-MM-DD", // Required: Basic salary period end
  "otStartDate": "YYYY-MM-DD", // Required: Overtime period start
  "otEndDate": "YYYY-MM-DD" // Required: Overtime period end
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Draft payroll generated successfully",
  "data": {
    "tenantId": "uuid",
    "payrollPeriod": {
      "basicStart": "2025-12-01",
      "basicEnd": "2025-12-31",
      "otStart": "2025-11-21",
      "otEnd": "2025-12-20"
    },
    "summary": {
      "totalEmployees": 50,
      "totalGross": 250000.0,
      "totalDeductions": 45000.0,
      "totalNet": 205000.0,
      "totalPCB": 15000.0,
      "totalEPF": 25000.0,
      "totalSOCSO": 5000.0
    },
    "employees": [
      {
        "employeeId": "uuid",
        "employeeName": "Ahmad bin Abdullah",
        "basicSalary": 5000.0,
        "regularHours": 176,
        "overtimeHours": 20,
        "overtimeAmount": 721.15,
        "grossAmount": 5721.15,
        "deductions": {
          "pcb": 347.5,
          "epf": 629.33,
          "socso": 195.0,
          "total": 1171.83
        },
        "netAmount": 4549.32
      }
    ],
    "generatedAt": "2025-12-19T10:30:00.000Z"
  }
}
```

**Statutory Calculations:**

- **PCB (Tax):** Calculated using 2025 Malaysian tax brackets
- **EPF:** 11% of gross (max RM 15,000 ceiling)
- **SOCSO:** 3.25% of gross (max RM 6,000 ceiling)

#### GET `/api/payroll/runs/:tenantId`

Get payroll runs for a tenant.

**Query Parameters:**

| Parameter | Type   | Default | Description      |
| --------- | ------ | ------- | ---------------- |
| status    | string | -       | Filter by status |
| limit     | number | 10      | Max results      |

---

### 3. EWA (Earned Wage Access)

#### POST `/api/ewa/request`

Submit an EWA withdrawal request.

**Request Body:**

```json
{
  "employeeId": "uuid",   // Required: Employee UUID
  "amount": number        // Required: Withdrawal amount (positive)
}
```

**Business Logic:**

1. Calculate `AccruedSalary = DailyRate × DaysWorked` (days worked this month)
2. Calculate `SafeLimit = AccruedSalary × 0.50` (50% safe limit)
3. Check against `YTD Withdrawals` for remaining available amount
4. If `amount <= RemainingLimit`: Create transaction with status `PENDING`
5. Else: Return 400 with `INSUFFICIENT_FUNDS`

**Response (201) - Success:**

```json
{
  "success": true,
  "message": "EWA request submitted successfully and pending approval",
  "data": {
    "transactionId": "uuid",
    "employeeId": "uuid",
    "requestedAmount": 500.0,
    "accruedSalary": 2500.0,
    "safeLimit": 1250.0,
    "status": "PENDING",
    "createdAt": "2025-12-19T10:30:00.000Z"
  }
}
```

**Response (400) - Insufficient Funds:**

```json
{
  "success": false,
  "error": "Insufficient Funds",
  "message": "Requested amount (RM 1500.00) exceeds your available limit (RM 750.00).",
  "code": "INSUFFICIENT_FUNDS",
  "data": {
    "requestedAmount": 1500.0,
    "daysWorked": 15,
    "dailyRate": 192.31,
    "accruedSalary": 2884.65,
    "safeLimit": 1442.32,
    "ytdWithdrawn": 692.32,
    "remainingLimit": 750.0,
    "safePercentage": 50
  }
}
```

#### GET `/api/ewa/balance/:employeeId`

Get EWA balance and eligibility for an employee.

**Response:**

```json
{
  "success": true,
  "data": {
    "employeeId": "uuid",
    "employeeName": "Ahmad bin Abdullah",
    "daysWorked": 15,
    "dailyRate": 192.31,
    "accruedSalary": 2884.65,
    "safeLimit": 1442.32,
    "ytdWithdrawn": 500.0,
    "availableBalance": 942.32,
    "monthlyRequestCount": 2,
    "maxMonthlyRequests": 4,
    "remainingRequests": 2,
    "isEligible": true
  }
}
```

#### GET `/api/ewa/history/:employeeId`

Get EWA transaction history.

**Query Parameters:**

| Parameter | Type   | Default |
| --------- | ------ | ------- |
| limit     | number | 20      |
| offset    | number | 0       |

---

## Validation

All inputs are validated using **Zod** schemas. Validation errors return:

```json
{
  "success": false,
  "error": "Validation Error",
  "details": [
    {
      "field": "workerId",
      "message": "Invalid worker ID format"
    },
    {
      "field": "timestamp",
      "message": "Invalid timestamp format (ISO 8601 required)"
    }
  ]
}
```

---

## Error Codes

| Code                    | Description                                 |
| ----------------------- | ------------------------------------------- |
| `EMPLOYEE_NOT_FOUND`    | Employee ID not found or inactive           |
| `TENANT_NOT_FOUND`      | Tenant ID not found or inactive             |
| `DOUBLE_PUNCH`          | Clock punch within 5-minute debounce window |
| `INSUFFICIENT_FUNDS`    | EWA amount exceeds safe limit               |
| `MAX_REQUESTS_EXCEEDED` | Monthly EWA request limit reached           |
| `NO_SALARY_CONFIG`      | Employee has no salary configuration        |
| `NO_EMPLOYEES`          | No active employees found for tenant        |

---

## Running the API

```bash
# Install dependencies
npm install

# Development mode (with hot reload)
npm run dev:api

# Production build
npm run build:api
npm run start:api
```

**Environment Variables:**

```env
DATABASE_URL=postgresql://...
PORT=3001
NODE_ENV=development
```
