import fs from 'fs';
import path from 'path';
import { query, checkConnection, closePool } from './db.js';

async function runMigrations() {
  console.log('🔄 Starting ViewCreator database migrations...');
  
  // 1. Verify connection
  const connected = await checkConnection();
  if (!connected) {
    console.error('❌ Could not connect to the database. Ensure Postgres is running and configuration is correct.');
    process.exit(1);
  }
  console.log('✅ Connected to PostgreSQL database successfully.');

  try {
    // 2. Read schema.sql
    const schemaPath = path.resolve(process.cwd(), 'src/schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`schema.sql not found at path: ${schemaPath}`);
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // We can execute the whole schema.sql file as a single query since pg supports multi-statement queries 
    // or we can run them in a transaction.
    console.log('⚙️ Applying schema definition from schema.sql...');
    await query(schemaSql);
    
    console.log('🎉 Database migrations completed successfully!');
  } catch (error) {
    console.error('❌ Database migration failed:');
    console.error(error);
    process.exit(1);
  } finally {
    // Close the pool so the process can exit cleanly
    await closePool();
  }
}

// Execute if run directly
runMigrations();
