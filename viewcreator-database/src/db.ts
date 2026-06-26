import { Pool, PoolConfig, QueryResult, QueryResultRow } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from the package directory or workspace root if needed
dotenv.config();
// Also look for .env in the parent folders to support monorepo setups
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const poolConfig: PoolConfig = {
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'viewcreator',
  max: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// If a single DATABASE_URL environment variable is provided, use it instead
if (process.env.DATABASE_URL) {
  poolConfig.connectionString = process.env.DATABASE_URL;
}

export const pool = new Pool(poolConfig);

// Handle pool errors gracefully
pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

/**
 * Executes a SQL query with parameters.
 * Automatically acquires a client from the pool, runs the query, and releases it.
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    
    // Log queries in development mode if desired
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG_DB === 'true') {
      console.log(`[DB Query] executed: ${text.slice(0, 50)}... | duration: ${duration}ms | rows: ${res.rowCount}`);
    }
    
    return res;
  } catch (error) {
    console.error(`[DB Error] query failed: ${text}`);
    console.error(error);
    throw error;
  }
}

/**
 * Executes a transaction. Passes a client to the callback function.
 */
export async function transaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[DB Transaction] Transaction rolled back due to error:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Checks connection status and retrieves database version.
 */
export async function checkConnection(): Promise<boolean> {
  try {
    const result = await query('SELECT version()');
    if (result.rows && result.rows.length > 0) {
      return true;
    }
    return false;
  } catch (error) {
    console.error('[DB Error] Connection check failed:', error);
    return false;
  }
}

/**
 * Gracefully shuts down the database pool.
 */
export async function closePool(): Promise<void> {
  await pool.end();
}
