"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const db_js_1 = require("./db.js");
async function runMigrations() {
    console.log('🔄 Starting ViewCreator database migrations...');
    // 1. Verify connection
    const connected = await (0, db_js_1.checkConnection)();
    if (!connected) {
        console.error('❌ Could not connect to the database. Ensure Postgres is running and configuration is correct.');
        process.exit(1);
    }
    console.log('✅ Connected to PostgreSQL database successfully.');
    try {
        // 2. Read schema.sql
        const schemaPath = path_1.default.resolve(process.cwd(), 'src/schema.sql');
        if (!fs_1.default.existsSync(schemaPath)) {
            throw new Error(`schema.sql not found at path: ${schemaPath}`);
        }
        const schemaSql = fs_1.default.readFileSync(schemaPath, 'utf8');
        // We can execute the whole schema.sql file as a single query since pg supports multi-statement queries 
        // or we can run them in a transaction.
        console.log('⚙️ Applying schema definition from schema.sql...');
        await (0, db_js_1.query)(schemaSql);
        console.log('🎉 Database migrations completed successfully!');
    }
    catch (error) {
        console.error('❌ Database migration failed:');
        console.error(error);
        process.exit(1);
    }
    finally {
        // Close the pool so the process can exit cleanly
        await (0, db_js_1.closePool)();
    }
}
// Execute if run directly
runMigrations();
//# sourceMappingURL=migrate.js.map