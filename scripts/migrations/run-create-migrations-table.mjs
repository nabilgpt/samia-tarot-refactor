import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Configure dotenv
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// ES Module __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('🔥 SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const MIGRATION_FILE = '00_create_migrations_table.sql';

async function ensureMigrationsTable() {
    console.log('🚀 Ensuring the migrations table exists...');

    try {
        const sql = fs.readFileSync(path.join(__dirname, `../../database/migrations/${MIGRATION_FILE}`), 'utf8');
        const { error } = await supabase.rpc('execute_sql', { sql_query: sql });

        if (error) {
            // It's okay if the table already exists, but other errors are fatal.
            if (!error.message.includes('already exists')) {
                 throw new Error(`Failed to create migrations table: ${error.message}`);
            }
            console.log('🟡 Migrations table already exists. That is fine.');
        }

        console.log('✅ Migrations table is ready.');

    } catch (error) {
        console.error('🔥 Critical error setting up migrations table:', error.message);
        process.exit(1);
    }
}

ensureMigrationsTable(); 