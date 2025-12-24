import { query } from '../api/lib/db';

async function setRoles() {
  console.log('Setting demo user roles...');

  try {
    // 1. Set HR_ADMIN
    await query(`
      UPDATE employee_master 
      SET role = 'HR_ADMIN' 
      WHERE employee_id = 'EMP-001';
    `);
    console.log('✅ EMP-001 (Sarah Jenkins) set to HR_ADMIN');

    // 2. Set MANAGER
    await query(`
      UPDATE employee_master 
      SET role = 'MANAGER' 
      WHERE employee_id = 'EMP-004';
    `);
    console.log('✅ EMP-004 (Mike Ross) set to MANAGER');

    // 3. Set WORKER (Explicitly)
    await query(`
      UPDATE employee_master 
      SET role = 'WORKER' 
      WHERE employee_id = 'EMP-002';
    `);
    console.log('✅ EMP-002 (Ali bin Abu) set to WORKER');

    console.log('Roles updated successfully.');
  } catch (error) {
    console.error('Failed to set roles:', error);
  } finally {
    process.exit(0);
  }
}

setRoles();
