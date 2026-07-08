import { Pool, PoolConfig, QueryResult, QueryResultRow } from 'pg';
import dotenv from 'dotenv';

// Load .env — prefers package-level .env, falls back to parent monorepo .env
dotenv.config();
dotenv.config({ path: '../.env' });

// Only DATABASE_URL is used — no local Postgres fallbacks
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL is not set. Set it in your environment or .env file.\n' +
    'Example: DATABASE_URL=postgresql://user:password@host:5432/db'
  );
}

// SSL is controlled purely by the DB_SSL env var — no hostname sniffing.
// This keeps the connection config provider-agnostic.
// Set DB_SSL=true for cloud Postgres (Supabase, RDS, etc.).
// Set DB_SSL=false or omit for local dev Postgres.
const ssl = process.env.DB_SSL === 'true' || process.env.DB_SSL === '1';

// `family: 4` forces IPv4-only DNS resolution in pg, avoiding EHOSTUNREACH
// when macOS DNS resolves Supabase to an unreachable IPv6 address.
// PoolConfig doesn't declare `family` in its type, but pg passes it through
// to Node's net.connect() at runtime.
const poolConfig = {
  connectionString: databaseUrl,
  max: parseInt(process.env.DB_MAX_CONNECTIONS || '10', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: ssl ? { rejectUnauthorized: false } : false,
  family: 4,
} satisfies PoolConfig & { family: number };

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
