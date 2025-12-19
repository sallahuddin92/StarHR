/**
 * Database Seed Script
 * Populates tenants, employees, salary_config, and attendance_ledger
 * 
 * Usage: npm run seed
 */

import { query } from '../lib/db';

// ============================================================================
// CONFIGURATION
// ============================================================================

const TENANT_ID = process.env.SEED_TENANT_ID || '11111111-1111-1111-1111-111111111111';

// ============================================================================
// MOCK DATA - EMPLOYEES
// ============================================================================

interface EmployeeSeed {
  employeeId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  department: string;
  designation: string;
  employmentType: string;
  dateOfJoining: string;
  basicSalary: number;
  maritalStatus: string;
  children: number;
  isForeigner: boolean;
}

const employees: EmployeeSeed[] = [
  {
    employeeId: 'EMP-001',
    fullName: 'Sarah Jenkins',
    email: 'sarah.j@company.com',
    phoneNumber: '+60110001001',
    department: 'Marketing',
    designation: 'VP Marketing',
    employmentType: 'Full-time',
    dateOfJoining: '2022-01-15',
    basicSalary: 8500.00,
    maritalStatus: 'married',
    children: 2,
    isForeigner: false,
  },
  {
    employeeId: 'EMP-002',
    fullName: 'Ali bin Abu',
    email: 'ali.abu@company.com',
    phoneNumber: '+60110001002',
    department: 'Operations',
    designation: 'Operations Executive',
    employmentType: 'Full-time',
    dateOfJoining: '2022-03-01',
    basicSalary: 3200.00,
    maritalStatus: 'single',
    children: 0,
    isForeigner: false,
  },
  {
    employeeId: 'EMP-003',
    fullName: 'Siti Nurhaliza',
    email: 'siti.n@company.com',
    phoneNumber: '+60110001003',
    department: 'Sales',
    designation: 'Sales Executive',
    employmentType: 'Full-time',
    dateOfJoining: '2022-06-15',
    basicSalary: 3500.00,
    maritalStatus: 'single',
    children: 0,
    isForeigner: false,
  },
  {
    employeeId: 'EMP-004',
    fullName: 'Mike Ross',
    email: 'mike.r@company.com',
    phoneNumber: '+60110001004',
    department: 'Sales',
    designation: 'Account Executive',
    employmentType: 'Full-time',
    dateOfJoining: '2023-03-01',
    basicSalary: 4200.00,
    maritalStatus: 'single',
    children: 0,
    isForeigner: false,
  },
  {
    employeeId: 'EMP-005',
    fullName: 'Rajesh Kumar',
    email: 'rajesh.k@company.com',
    phoneNumber: '+60110001005',
    department: 'IT Support',
    designation: 'IT Specialist',
    employmentType: 'Full-time',
    dateOfJoining: '2022-09-01',
    basicSalary: 4500.00,
    maritalStatus: 'married',
    children: 1,
    isForeigner: false,
  },
  {
    employeeId: 'EMP-006',
    fullName: 'Mei Lin',
    email: 'mei.lin@company.com',
    phoneNumber: '+60110001006',
    department: 'Marketing',
    designation: 'Marketing Executive',
    employmentType: 'Full-time',
    dateOfJoining: '2023-01-15',
    basicSalary: 3800.00,
    maritalStatus: 'single',
    children: 0,
    isForeigner: false,
  },
  {
    employeeId: 'EMP-007',
    fullName: 'John Doe',
    email: 'john.d@company.com',
    phoneNumber: '+60110001007',
    department: 'Logistics',
    designation: 'Logistics Coordinator',
    employmentType: 'Full-time',
    dateOfJoining: '2022-04-01',
    basicSalary: 2800.00,
    maritalStatus: 'married',
    children: 3,
    isForeigner: false,
  },
  {
    employeeId: 'EMP-012',
    fullName: 'Jessica Pearson',
    email: 'j.pearson@company.com',
    phoneNumber: '+60110001012',
    department: 'Legal',
    designation: 'General Counsel',
    employmentType: 'Full-time',
    dateOfJoining: '2021-06-15',
    basicSalary: 12000.00,
    maritalStatus: 'married',
    children: 1,
    isForeigner: false,
  },
  {
    employeeId: 'EMP-019',
    fullName: 'Donna Lewis',
    email: 'donna.l@company.com',
    phoneNumber: '+60110001019',
    department: 'Operations',
    designation: 'Operations Lead',
    employmentType: 'Full-time',
    dateOfJoining: '2022-06-01',
    basicSalary: 5500.00,
    maritalStatus: 'single',
    children: 0,
    isForeigner: false,
  },
  {
    employeeId: 'EMP-020',
    fullName: 'Ahmad Firdaus',
    email: 'ahmad.f@company.com',
    phoneNumber: '+60110001020',
    department: 'Production',
    designation: 'Production Supervisor',
    employmentType: 'Full-time',
    dateOfJoining: '2021-11-01',
    basicSalary: 3600.00,
    maritalStatus: 'married',
    children: 2,
    isForeigner: false,
  },
];

// ============================================================================
// ATTENDANCE DATA GENERATOR
// ============================================================================

interface AttendanceRow {
  employeeId: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  workingHours: number | null;
  otRequested: number;
  otApproved: number;
  otStatus: 'pending' | 'approved' | 'rejected';
  remarks: string | null;
}

/**
 * Generate attendance records for the past N days
 */
function generateAttendanceData(days: number = 30): AttendanceRow[] {
  const records: AttendanceRow[] = [];
  const today = new Date();
  
  for (let dayOffset = 0; dayOffset < days; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() - dayOffset);
    
    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    
    const dateStr = date.toISOString().split('T')[0];
    
    for (const emp of employees) {
      // Random attendance patterns
      const random = Math.random();
      
      // 85% chance of normal attendance
      if (random < 0.85) {
        // Normal clock in/out with some variation
        const clockInHour = 8 + Math.floor(Math.random() * 2); // 8-9 AM
        const clockInMin = Math.floor(Math.random() * 30);
        const clockOutHour = 17 + Math.floor(Math.random() * 3); // 5-7 PM
        const clockOutMin = Math.floor(Math.random() * 60);
        
        const clockIn = `${dateStr}T${String(clockInHour).padStart(2, '0')}:${String(clockInMin).padStart(2, '0')}:00+08:00`;
        const clockOut = `${dateStr}T${String(clockOutHour).padStart(2, '0')}:${String(clockOutMin).padStart(2, '0')}:00+08:00`;
        
        const workingHours = clockOutHour - clockInHour + (clockOutMin - clockInMin) / 60;
        const otRequested = Math.max(0, workingHours - 9); // OT if over 9 hours
        const otApproved = Math.random() > 0.3 ? otRequested : 0; // 70% OT approval rate
        
        records.push({
          employeeId: emp.employeeId,
          date: dateStr,
          clockIn,
          clockOut,
          workingHours: Math.round(workingHours * 100) / 100,
          otRequested: Math.round(otRequested * 100) / 100,
          otApproved: Math.round(otApproved * 100) / 100,
          otStatus: otRequested > 0 ? (otApproved > 0 ? 'approved' : 'rejected') : 'pending',
          remarks: null,
        });
      }
      // 10% chance of missing punch (clock out)
      else if (random < 0.95) {
        const clockInHour = 8 + Math.floor(Math.random() * 2);
        const clockInMin = Math.floor(Math.random() * 30);
        const clockIn = `${dateStr}T${String(clockInHour).padStart(2, '0')}:${String(clockInMin).padStart(2, '0')}:00+08:00`;
        
        records.push({
          employeeId: emp.employeeId,
          date: dateStr,
          clockIn,
          clockOut: null, // Missing punch
          workingHours: null,
          otRequested: 0,
          otApproved: 0,
          otStatus: 'pending',
          remarks: 'Missing clock-out - requires intervention',
        });
      }
      // 5% chance of absent (no record for that employee on that day)
      // Skip adding record
    }
  }
  
  return records;
}

// ============================================================================
// SEED FUNCTIONS
// ============================================================================

async function ensureTenant(): Promise<void> {
  console.log('  → Creating tenant...');
  await query(
    `INSERT INTO tenants (id, name, slug, contact_email, industry, employee_count, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, true)
     ON CONFLICT (id) DO UPDATE SET 
       name = EXCLUDED.name, 
       contact_email = EXCLUDED.contact_email,
       employee_count = EXCLUDED.employee_count`,
    [TENANT_ID, 'Demo Company Sdn Bhd', 'demo-company', 'admin@democompany.com', 'Technology', employees.length]
  );
  console.log(`  ✓ Tenant created: Demo Company Sdn Bhd`);
}

async function seedEmployees(): Promise<Map<string, string>> {
  console.log('  → Seeding employees...');
  const employeeIdMap = new Map<string, string>(); // Maps employeeId to UUID
  
  for (const emp of employees) {
    const result = await query<{ id: string }>(
      `INSERT INTO employee_master (
         tenant_id, employee_id, full_name, email, phone_number, department, designation,
         employment_type, date_of_joining, is_active
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
       ON CONFLICT (tenant_id, employee_id) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         email = EXCLUDED.email,
         phone_number = EXCLUDED.phone_number,
         department = EXCLUDED.department,
         designation = EXCLUDED.designation,
         employment_type = EXCLUDED.employment_type,
         date_of_joining = EXCLUDED.date_of_joining,
         is_active = true
       RETURNING id`,
      [
        TENANT_ID,
        emp.employeeId,
        emp.fullName,
        emp.email,
        emp.phoneNumber,
        emp.department,
        emp.designation,
        emp.employmentType,
        emp.dateOfJoining,
      ]
    );
    
    if (result.rows[0]) {
      employeeIdMap.set(emp.employeeId, result.rows[0].id);
    }
  }
  
  console.log(`  ✓ Seeded ${employees.length} employees`);
  return employeeIdMap;
}

async function seedSalaryConfig(employeeIdMap: Map<string, string>): Promise<void> {
  console.log('  → Seeding salary configurations...');
  
  for (const emp of employees) {
    const uuid = employeeIdMap.get(emp.employeeId);
    if (!uuid) continue;
    
    await query(
      `INSERT INTO salary_config (
         tenant_id, employee_id, basic_salary, daily_rate, hourly_rate,
         marital_status, children, is_foreigner, tax_category, 
         ot_rate_multiplier, monthly_ewa_limit, is_active, effective_date
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, $12)
       ON CONFLICT (employee_id, effective_date) DO UPDATE SET
         basic_salary = EXCLUDED.basic_salary,
         daily_rate = EXCLUDED.daily_rate,
         hourly_rate = EXCLUDED.hourly_rate,
         marital_status = EXCLUDED.marital_status,
         children = EXCLUDED.children,
         is_foreigner = EXCLUDED.is_foreigner,
         is_active = true`,
      [
        TENANT_ID,
        uuid,
        emp.basicSalary,
        Math.round((emp.basicSalary / 26) * 100) / 100, // Daily rate
        Math.round((emp.basicSalary / 26 / 8) * 100) / 100, // Hourly rate
        emp.maritalStatus,
        emp.children,
        emp.isForeigner,
        emp.maritalStatus === 'married' ? 'M' : 'B', // Tax category
        1.5, // OT multiplier
        Math.min(5000, emp.basicSalary * 0.5), // EWA limit
        '2023-01-01', // Effective date
      ]
    );
  }
  
  console.log(`  ✓ Seeded ${employees.length} salary configs`);
}

async function seedAttendance(employeeIdMap: Map<string, string>): Promise<void> {
  console.log('  → Seeding attendance records...');
  
  // Clear existing attendance for demo tenant
  await query(
    `DELETE FROM attendance_ledger WHERE tenant_id = $1`,
    [TENANT_ID]
  );
  
  const attendanceRecords = generateAttendanceData(30); // Last 30 days
  let count = 0;
  
  for (const record of attendanceRecords) {
    const uuid = employeeIdMap.get(record.employeeId);
    if (!uuid) continue;
    
    await query(
      `INSERT INTO attendance_ledger (
         tenant_id, employee_id, attendance_date,
         raw_clock_in, verified_clock_in,
         raw_clock_out, verified_clock_out,
         working_hours, ot_requested_hours, ot_approved_hours,
         ot_approval_status, remarks, is_manual_entry
       )
       VALUES ($1, $2, $3, $4, $4, $5, $5, $6, $7, $8, $9, $10, false)
       ON CONFLICT DO NOTHING`,
      [
        TENANT_ID,
        uuid,
        record.date,
        record.clockIn,
        record.clockOut,
        record.workingHours,
        record.otRequested,
        record.otApproved,
        record.otStatus,
        record.remarks,
      ]
    );
    count++;
  }
  
  console.log(`  ✓ Seeded ${count} attendance records`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           StarHR Database Seed Script                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`Tenant ID: ${TENANT_ID}`);
  console.log('');
  
  try {
    await ensureTenant();
    const employeeIdMap = await seedEmployees();
    await seedSalaryConfig(employeeIdMap);
    await seedAttendance(employeeIdMap);
    
    console.log('');
    console.log('✅ Seed completed successfully!');
    console.log('');
    console.log('Summary:');
    console.log(`  • 1 tenant`);
    console.log(`  • ${employees.length} employees`);
    console.log(`  • ${employees.length} salary configurations`);
    console.log(`  • ~${employees.length * 22} attendance records (last 30 days)`);
    console.log('');
  } catch (error) {
    console.error('');
    console.error('❌ Seed failed:', error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  });
