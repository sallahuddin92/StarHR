import { Pool } from 'pg';

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/hr_portal',
});

const TENANT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

async function main() {
  const client = await pool.connect();
  try {
    console.log('Fetching TechCorp employees...');
    const res = await client.query(
      `SELECT id, full_name FROM employee_master WHERE tenant_id = $1`,
      [TENANT_ID]
    );

    if (res.rows.length === 0) {
      console.error('No employees found for TechCorp!');
      return;
    }

    console.log(`Found ${res.rows.length} employees. Creating pending OT requests...`);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    let created = 0;
    for (const emp of res.rows) {
      // Create a pending OT request for each employee
      const result = await client.query(
        `INSERT INTO attendance_ledger (
           tenant_id, employee_id, attendance_date,
           raw_clock_in, verified_clock_in,
           raw_clock_out, verified_clock_out,
           working_hours, ot_requested_hours, ot_approved_hours,
           ot_approval_status, remarks, is_manual_entry
         )
         VALUES ($1, $2, $3, 
           $3::date + time '09:00', $3::date + time '09:00',
           $3::date + time '19:30', $3::date + time '19:30',
           9.5, 2.5, 0, 'pending', 'Urgent fix needed', false
         )
         RETURNING id`,
        [TENANT_ID, emp.id, dateStr]
      );
      console.log(`Created request ${result.rows[0].id} for ${emp.full_name}`);
      created++;
    }

    console.log(`✅ Successfully created ${created} pending approvals.`);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    client.release();
    pool.end();
  }
}

main();
