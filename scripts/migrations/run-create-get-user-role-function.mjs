import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigration() {
    console.log('🚀 Starting migration script...');

    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        console.error('❌ Missing Supabase environment variables.');
        process.exit(1);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const migrationFile = path.join(__dirname, '..', '..', 'database', 'migrations', '20250722120000_create_get_user_role_function.sql');

    try {
        console.log(`📄 Reading migration file: ${migrationFile}`);
        const sql = await fs.readFile(migrationFile, 'utf-8');

        console.log('⚡ Executing migration...');
        const { error } = await supabase.rpc('execute_sql', { sql_text: sql });

        if (error) {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        }

        console.log('✅ Migration completed successfully!');
        console.log('🔧 The public.get_user_role(uuid) function is now available.');
    } catch (error) {
        console.error('🔥 An unexpected error occurred:', error);
        process.exit(1);
    }
}

runMigration(); 