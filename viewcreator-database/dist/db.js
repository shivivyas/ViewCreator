"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.query = query;
exports.transaction = transaction;
exports.checkConnection = checkConnection;
exports.closePool = closePool;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load .env from the package directory or workspace root if needed
dotenv_1.default.config();
// Also look for .env in the parent folders to support monorepo setups
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '../.env') });
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env') });
const poolConfig = {
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
exports.pool = new pg_1.Pool(poolConfig);
// Handle pool errors gracefully
exports.pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
});
/**
 * Executes a SQL query with parameters.
 * Automatically acquires a client from the pool, runs the query, and releases it.
 */
async function query(text, params) {
    const start = Date.now();
    try {
        const res = await exports.pool.query(text, params);
        const duration = Date.now() - start;
        // Log queries in development mode if desired
        if (process.env.NODE_ENV === 'development' || process.env.DEBUG_DB === 'true') {
            console.log(`[DB Query] executed: ${text.slice(0, 50)}... | duration: ${duration}ms | rows: ${res.rowCount}`);
        }
        return res;
    }
    catch (error) {
        console.error(`[DB Error] query failed: ${text}`);
        console.error(error);
        throw error;
    }
}
/**
 * Executes a transaction. Passes a client to the callback function.
 */
async function transaction(callback) {
    const client = await exports.pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('[DB Transaction] Transaction rolled back due to error:', error);
        throw error;
    }
    finally {
        client.release();
    }
}
/**
 * Checks connection status and retrieves database version.
 */
async function checkConnection() {
    try {
        const result = await query('SELECT version()');
        if (result.rows && result.rows.length > 0) {
            return true;
        }
        return false;
    }
    catch (error) {
        console.error('[DB Error] Connection check failed:', error);
        return false;
    }
}
/**
 * Gracefully shuts down the database pool.
 */
async function closePool() {
    await exports.pool.end();
}
//# sourceMappingURL=db.js.map