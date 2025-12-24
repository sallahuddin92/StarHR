/**
 * Database Connection Module
 * Uses PostgreSQL with Supabase
 */

import { Pool, PoolClient, QueryResult } from 'pg';

const {
  DATABASE_URL,
  PGHOST,
  PGPORT,
  PGUSER,
  PGPASSWORD,
  PGDATABASE,
  PGSSLMODE,
  PGPOOL_MAX,
  PGPOOL_IDLE,
  PGPOOL_TIMEOUT,
} = process.env;

// Prefer DATABASE_URL; otherwise fall back to discrete env vars.
const pool = new Pool(
  DATABASE_URL
    ? {
        connectionString: DATABASE_URL,
        ssl:
          process.env.NODE_ENV === 'production' || PGSSLMODE === 'require'
            ? { rejectUnauthorized: false }
            : false,
        max: PGPOOL_MAX ? Number(PGPOOL_MAX) : 20,
        idleTimeoutMillis: PGPOOL_IDLE ? Number(PGPOOL_IDLE) : 30_000,
        connectionTimeoutMillis: PGPOOL_TIMEOUT ? Number(PGPOOL_TIMEOUT) : 2_000,
      }
    : {
        host: PGHOST || 'localhost',
        port: PGPORT ? Number(PGPORT) : 5432,
        user: PGUSER || 'postgres',
        password: PGPASSWORD || 'postgres123',
        database: PGDATABASE || 'hr_portal',
        ssl:
          process.env.NODE_ENV === 'production' || PGSSLMODE === 'require'
            ? { rejectUnauthorized: false }
            : false,
        max: PGPOOL_MAX ? Number(PGPOOL_MAX) : 20,
        idleTimeoutMillis: PGPOOL_IDLE ? Number(PGPOOL_IDLE) : 30_000,
        connectionTimeoutMillis: PGPOOL_TIMEOUT ? Number(PGPOOL_TIMEOUT) : 2_000,
      }
);

// Pool error handler
pool.on('error', err => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

/**
 * Execute a query with parameters
 */
export async function query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    console.log('Query executed', { text: text.substring(0, 50), duration, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('Query error:', { text: text.substring(0, 50), error });
    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 */
export async function getClient(): Promise<PoolClient> {
  const client = await pool.connect();
  return client;
}

/**
 * Execute a transaction with automatic rollback on error
 */
export async function withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export default { query, getClient, withTransaction };
