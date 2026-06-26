import { Pool, QueryResult, QueryResultRow } from 'pg';
export declare const pool: Pool;
/**
 * Executes a SQL query with parameters.
 * Automatically acquires a client from the pool, runs the query, and releases it.
 */
export declare function query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>>;
/**
 * Executes a transaction. Passes a client to the callback function.
 */
export declare function transaction<T>(callback: (client: any) => Promise<T>): Promise<T>;
/**
 * Checks connection status and retrieves database version.
 */
export declare function checkConnection(): Promise<boolean>;
/**
 * Gracefully shuts down the database pool.
 */
export declare function closePool(): Promise<void>;
//# sourceMappingURL=db.d.ts.map