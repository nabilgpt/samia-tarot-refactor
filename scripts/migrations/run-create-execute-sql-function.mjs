import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigration() {
    console.log('🚀 Starting migration script for execute_sql...');

    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        console.error('❌ Missing Supabase environment variables.');
        process.exit(1);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const migrationFile = path.join(__dirname, '..', '..', 'database', 'migrations', '0000000000000_create_execute_sql_function.sql');

    try {
        console.log(`📄 Reading migration file: ${migrationFile}`);
        const sql = await fs.readFile(migrationFile, 'utf-8');

        console.log('🔵 This is a one-time setup step.');
        console.log('Please execute the following SQL in your Supabase SQL Editor to create the core migration helper function:');
        console.log('--------------------------------------------------');
        console.log(sql);
        console.log('--------------------------------------------------');
        console.log('✅ After running this manually, all other migrations can be automated.');

    } catch (err) {
        console.error('🔥 An unexpected error occurred:', err);
        process.exit(1);
    }
}

runMigration(); 