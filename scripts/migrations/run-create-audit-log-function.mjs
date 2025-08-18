import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigration() {
    console.log('🚀 Starting migration for generic audit log function...');

    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        console.error('❌ Missing Supabase environment variables.');
        process.exit(1);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const migrationFile = path.join(__dirname, '..', '..', 'database', 'migrations', '0000000000002_create_audit_log_function.sql');

    try {
        console.log(`📄 Reading migration file: ${migrationFile}`);
        const sql = await fs.readFile(migrationFile, 'utf-8');

        console.log('⚡ Executing migration...');
        const { error } = await supabase.rpc('execute_sql', { sql_text: sql });

        if (error) {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        }

        console.log('✅ Migration successful: generic audit log function created.');

    } catch (err) {
        console.error('🔥 An unexpected error occurred:', err);
        process.exit(1);
    }
}

runMigration(); 