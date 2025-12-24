/**
 * Run Database Migration
 * Usage: npx tsx scripts/run-migration.ts <migration_file>
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const { DATABASE_URL, PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE } = process.env;

const pool = new Pool(
  DATABASE_URL
    ? { connectionString: DATABASE_URL, ssl: false }
    : {
        host: PGHOST || 'localhost',
        port: PGPORT ? Number(PGPORT) : 5432,
        user: PGUSER || 'postgres',
        password: PGPASSWORD || 'postgres123',
        database: PGDATABASE || 'hr_portal',
        ssl: false,
      }
);

async function runMigration(filename: string) {
  const filepath = path.resolve(process.cwd(), filename);

  if (!fs.existsSync(filepath)) {
    console.error(`❌ Migration file not found: ${filepath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(filepath, 'utf-8');

  console.log(`🚀 Running migration: ${filename}`);
  console.log('---');

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      console.log('✅ Migration completed successfully!');
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error('❌ Migration failed:', err.message);
      if (err.detail) console.error('   Detail:', err.detail);
      if (err.hint) console.error('   Hint:', err.hint);
      process.exit(1);
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.log('Usage: npx tsx scripts/run-migration.ts <migration_file>');
  console.log(
    'Example: npx tsx scripts/run-migration.ts migrations/006_entitlement_rule_engine.sql'
  );
  process.exit(1);
}

runMigration(migrationFile);
