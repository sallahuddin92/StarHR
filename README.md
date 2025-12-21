<div align="center">

# 🏢 StarHR - Enterprise HR Portal

### Malaysian HR Management System with Payroll, Attendance & Compliance

[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)
- [Database Schema](#-database-schema)
- [Screens & Modules](#-screens--modules)
- [Environment Variables](#-environment-variables)
- [Docker Deployment](#-docker-deployment)
- [Contributing](#-contributing)

---

## 🌟 Overview

**StarHR** is a comprehensive enterprise-grade HR management system designed specifically for Malaysian businesses. It handles the complete HR lifecycle including employee management, attendance tracking, payroll processing, overtime approvals, and statutory compliance (EPF, SOCSO, EIS, PCB).

---

## ✨ Features

### 👥 Employee Management
- Employee master data with department/designation hierarchy
- Bulk import via CSV/Excel
- Active/inactive status tracking
- Employee profile management

### ⏰ Attendance & Time Tracking
- Clock-in/Clock-out with GPS tracking
- Double-punch detection (5-minute debounce)
- Overtime calculation and verification
- Attendance intervention and audit

### 💰 Payroll Processing
- Monthly payroll cycle configuration
- Overtime pay calculation
- Statutory deductions (EPF, SOCSO, EIS, PCB)
- Draft ledger generation
- Payslip generation and distribution

### ✅ Approval Workflows
- OT request approvals
- Multi-step approval chain
- Batch approve/reject functionality
- Approval history tracking

### 📄 Document Center
- Payslip batch generation
- EA Form generation for tax filing
- WhatsApp broadcast integration
- Document history logs

### 🔐 Security
- JWT-based authentication
- Role-based access control
- Rate limiting
- Helmet security headers

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                   │
│                    React 19 + TypeScript + Vite                     │
│                         Tailwind CSS                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────┐ │
│  │  Dashboard   │ │  Attendance  │ │   Payroll    │ │  Documents  │ │
│  │   Screen     │ │ Intervention │ │   Cockpit    │ │   Center    │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └─────────────┘ │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                 │
│  │   Pending    │ │   Employee   │ │    Login     │                 │
│  │  Approvals   │ │    Master    │ │    Screen    │                 │
│  └──────────────┘ └──────────────┘ └──────────────┘                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 │ HTTP/REST API
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                            BACKEND                                   │
│                   Express.js + TypeScript                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                     API Routes                               │    │
│  ├──────────┬──────────┬──────────┬──────────┬────────────────┤    │
│  │  /auth   │/employees│/attendance│/approvals│   /payroll    │    │
│  │  /stats  │  /ewa    │/documents │          │               │    │
│  └──────────┴──────────┴──────────┴──────────┴────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    Middleware                                │    │
│  │     JWT Auth │ Rate Limiting │ CORS │ Helmet │ Validation   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 │ PostgreSQL Protocol
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          DATABASE                                    │
│                     PostgreSQL 16 Alpine                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  employee_master │  │ attendance_ledger│  │  payroll_runs    │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │     tenants      │  │   ewa_requests   │  │ payroll_details  │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TypeScript 5.8, Vite 6, Tailwind CSS 3 |
| **Backend** | Node.js 20, Express.js 4, TypeScript |
| **Database** | PostgreSQL 16 |
| **Authentication** | JWT (jsonwebtoken) |
| **Validation** | Zod |
| **Security** | Helmet, CORS, Rate Limiting, HPP |
| **DevOps** | Docker, Docker Compose |
| **Dev Tools** | TSX (TypeScript Execute), Vite HMR |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose (for containerized deployment)
- PostgreSQL 16 (if running locally without Docker)

### Quick Start with Docker

```bash
# Clone the repository
git clone https://github.com/sallahuddin92/StarHR.git
cd StarHR

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

**Services will be available at:**
- Frontend: http://localhost:3000
- API: http://localhost:3001
- Database: localhost:5432

### Local Development (without Docker)

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your database credentials

# Run database migrations
psql -U postgres -d hr_portal -f schema.sql
psql -U postgres -d hr_portal -f seed.sql

# Start API server (with hot reload)
npm run dev:api

# Start frontend (in another terminal)
npm run dev
```

### Default Login Credentials

| Field | Value |
|-------|-------|
| Username | `EMP-001` |
| Password | `password123` |

---

## 📁 Project Structure

```
enterprise-hr-portal/
├── api/                    # Backend API
│   ├── index.ts           # Express server entry point
│   ├── lib/
│   │   ├── db.ts          # PostgreSQL connection pool
│   │   └── validation.ts  # Zod schemas
│   ├── middleware/
│   │   └── auth.ts        # JWT authentication
│   ├── routes/
│   │   ├── auth.ts        # Login/logout endpoints
│   │   ├── employees.ts   # Employee CRUD
│   │   ├── attendance.ts  # Clock-in/out, OT approval
│   │   ├── approvals.ts   # Approval workflows
│   │   ├── payroll.ts     # Payroll processing
│   │   ├── documents.ts   # Document generation
│   │   ├── ewa.ts         # Earned Wage Access
│   │   └── stats.ts       # Dashboard statistics
│   └── scripts/
│       └── seed.ts        # Database seeding
│
├── screens/                # React screen components
│   ├── DashboardScreen.tsx
│   ├── AttendanceInterventionScreen.tsx
│   ├── PayrollCockpitScreen.tsx
│   ├── PendingApprovalsScreen.tsx
│   ├── DocumentCenterScreen.tsx
│   ├── EmployeeMasterScreen.tsx
│   └── LoginScreen.tsx
│
├── src/
│   ├── components/
│   │   └── Layout.tsx     # Main layout with sidebar
│   └── lib/
│       └── api.ts         # Frontend API client
│
├── App.tsx                 # Main React app with routing
├── schema.sql             # Database schema
├── seed.sql               # Sample data
├── docker-compose.yml     # Docker orchestration
├── Dockerfile             # API container build
└── package.json
```

---

## 📡 API Documentation

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Login with credentials |

**Request:**
```json
{
  "identifier": "EMP-001",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "admin@company.com",
    "role": "ADMIN",
    "tenantId": "uuid"
  }
}
```

### Employees

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/employees` | GET | List all employees |
| `/api/employees` | POST | Create employee |
| `/api/employees/:id` | PUT | Update employee |

### Attendance

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/attendance` | GET | List attendance records |
| `/api/attendance/clock-in` | POST | Record clock-in |
| `/api/attendance/:id/approve-ot` | PUT | Approve OT hours |
| `/api/attendance/status/:workerId` | GET | Get attendance status |

### Approvals

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/approvals/pending` | GET | List pending approvals |
| `/api/approvals/:id` | GET | Get approval details |
| `/api/approvals/:id/approve` | PUT | Approve request |
| `/api/approvals/:id/reject` | PUT | Reject request |

### Payroll

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/payroll/run-draft` | POST | Generate draft payroll |
| `/api/payroll/history` | GET | Get payroll history |

### Dashboard Stats

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stats/summary` | GET | Get dashboard summary |

---

## 🗄 Database Schema

### Core Tables

```sql
-- Multi-tenant support
tenants (id, name, company_code, created_at)

-- Employee master data
employee_master (
  id, tenant_id, employee_id, full_name, email,
  department, designation, basic_salary,
  is_active, date_of_joining, created_at
)

-- Attendance tracking
attendance_ledger (
  id, tenant_id, employee_id, attendance_date,
  raw_clock_in, raw_clock_out,
  verified_clock_in, verified_clock_out,
  working_hours, ot_requested_hours, ot_approved_hours,
  ot_approval_status, approved_by, created_at
)

-- Payroll runs
payroll_runs (
  id, tenant_id, payroll_period,
  basic_start_date, basic_end_date,
  ot_start_date, ot_end_date,
  status, total_gross, total_deductions, total_net,
  created_at, finalized_at
)

-- Payroll details per employee
payroll_details (
  id, payroll_run_id, employee_id,
  basic_salary, overtime_hours, overtime_amount,
  gross_amount, epf_employee, epf_employer,
  socso_employee, socso_employer, eis_employee,
  pcb, total_deductions, net_amount
)
```

---

## 🖥 Screens & Modules

| Screen | Path | Description |
|--------|------|-------------|
| **Dashboard** | `/` | Overview with stats, pending actions, recent activities |
| **Attendance Intervention** | `/attendance` | Audit clock-in/out, verify OT, batch approve |
| **Payroll Cockpit** | `/payroll` | Configure payroll cycle, generate draft ledger |
| **Pending Approvals** | `/approvals` | Review and action OT/leave requests |
| **Document Center** | `/documents` | Generate payslips, EA forms, broadcast to WhatsApp |
| **Employee Master** | `/employees` | Manage employee data, bulk import |

---

## ⚙️ Environment Variables

### Frontend (.env.local)

```env
VITE_API_URL=http://localhost:3001
```

### Backend (.env)

```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/hr_portal
JWT_SECRET=your-super-secret-jwt-key
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

---

## 🐳 Docker Deployment

### Services

| Service | Container Name | Port | Description |
|---------|---------------|------|-------------|
| `postgres` | hr-portal-db | 5432 | PostgreSQL database |
| `api` | hr-portal-api | 3001 | Express API server |
| `frontend` | hr-portal-frontend | 3000 | Vite dev server |

### Commands

```bash
# Start all services
docker-compose up -d

# Restart API (after code changes)
docker-compose restart api

# View logs
docker-compose logs -f api

# Stop all services
docker-compose down

# Reset database (caution: deletes all data)
docker-compose down -v
docker-compose up -d
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is proprietary software. All rights reserved.

---

<div align="center">

**Built with ❤️ for Malaysian HR Teams**

[Report Bug](https://github.com/sallahuddin92/StarHR/issues) · [Request Feature](https://github.com/sallahuddin92/StarHR/issues)

</div>
