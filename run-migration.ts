import { readFileSync } from 'fs';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/hr_portal',
});

async function runMigration() {
  try {
    console.log('Reading migration file...');
    const sql = readFileSync('./migrations/009_training_enhancements.sql', 'utf8');
    console.log('Connecting to database...');
    console.log('Executing migration...');
    await pool.query(sql);
    console.log('✅ Migration 008_training_management.sql executed successfully');
    await pool.end();
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Migration error:', err.message);
    console.error('Full error:', err);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
