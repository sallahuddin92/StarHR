import { query } from '../lib/db';

const tenantId = process.env.SEED_TENANT_ID || '11111111-1111-1111-1111-111111111111';

const employees = [
  {
    employeeId: 'EMP-001',
    fullName: 'Sarah Jenkins',
    email: 'sarah.j@company.com',
    phoneNumber: '+60110001001',
    department: 'Marketing',
    designation: 'VP Marketing',
    employmentType: 'Full-time',
    dateOfJoining: '2023-01-15',
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
  },
  {
    employeeId: 'EMP-012',
    fullName: 'Jessica Pearson',
    email: 'j.pearson@company.com',
    phoneNumber: '+60110001012',
    department: 'Legal',
    designation: 'General Counsel',
    employmentType: 'Full-time',
    dateOfJoining: '2022-06-15',
  },
  {
    employeeId: 'EMP-019',
    fullName: 'Donna Lewis',
    email: 'donna.l@company.com',
    phoneNumber: '+60110001019',
    department: 'Operations',
    designation: 'Ops Lead',
    employmentType: 'Full-time',
    dateOfJoining: '2023-06-01',
  },
];

async function ensureTenant() {
  await query(
    `INSERT INTO tenants (id, name, slug, contact_email, industry, is_active)
     VALUES ($1, $2, $3, $4, $5, true)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, contact_email = EXCLUDED.contact_email`,
    [tenantId, 'Demo Company Sdn Bhd', 'demo-company', 'admin@democompany.com', 'Technology']
  );
}

async function seedEmployees() {
  for (const emp of employees) {
    await query(
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
         is_active = true`,
      [
        tenantId,
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
  }
}

async function main() {
  console.info('Seeding tenant and employees...');
  await ensureTenant();
  await seedEmployees();
  console.info('Seed completed.');
}

main()
  .catch((err) => {
    console.error('Seed failed', err);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
