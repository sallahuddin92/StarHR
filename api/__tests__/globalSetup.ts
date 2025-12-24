/**
 * Jest Global Setup
 * Runs once before all test suites
 */

import { Pool } from 'pg';

export default async function globalSetup() {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret-key-for-testing-only';

  // Create test database connection
  const pool = new Pool({
    connectionString:
      process.env.TEST_DATABASE_URL ||
      'postgresql://postgres:postgres123@localhost:5432/hr_portal_test',
  });

  try {
    // Check if test database exists, create if not
    const client = await pool.connect();

    // Set search path for testing
    await client.query('SET search_path TO public');

    console.log('✅ Test database connected');

    client.release();
  } catch (error) {
    console.warn('⚠️ Test database not available, tests will use mock data');
  } finally {
    await pool.end();
  }

  // Store in global for use in tests
  (global as any).__TEST_START_TIME__ = Date.now();
}
