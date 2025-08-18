import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Configure dotenv to load environment variables from the root .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Helper to get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('🔥 Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables must be set.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const MIGRATION_FILE = '20250721203000_enhance_ai_providers_with_logos_and_keys.sql';
const MIGRATION_NAME = 'enhance_ai_providers_with_logos_and_keys';

async function applyMigration() {
    console.log(`🚀 Starting migration: ${MIGRATION_NAME}...`);

    try {
        // 1. Check if migration has already been applied
        const { data: existingMigration, error: checkError } = await supabase
            .from('migrations')
            .select('name')
            .eq('name', MIGRATION_NAME)
            .single();

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found
            throw new Error(`Error checking for existing migration: ${checkError.message}`);
        }
        
        if (existingMigration) {
            console.log(`✅ Migration "${MIGRATION_NAME}" has already been applied. Skipping.`);
            return;
        }

        // 2. Read the migration file
        console.log(`📄 Reading migration file: ${MIGRATION_FILE}...`);
        const sql = fs.readFileSync(path.join(__dirname, `../../database/migrations/${MIGRATION_FILE}`), 'utf8');

        // 3. Execute the migration SQL
        console.log('⚡ Applying SQL migration to the database...');
        // Supabase does not have a direct RPC to execute arbitrary SQL in this client version for security.
        // We will execute the statements one by one. Splitting by semicolon.
        const statements = sql.split(';').filter(s => s.trim().length > 0);
        
        for (const statement of statements) {
            const { error: queryError } = await supabase.rpc('execute_sql', { sql_query: statement });
            if (queryError) {
                 // Check for known "safe" errors, like trying to log an already-logged migration
                if (queryError.message.includes('duplicate key value violates unique constraint "migrations_pkey"')) {
                    console.log(`🟡 Warning: The migration "${MIGRATION_NAME}" was already logged. Continuing...`);
                } else if (queryError.message.includes('already exists')) {
                    console.log(`🟡 Warning: An object in the migration script already exists (e.g., table, column). Continuing...`);
                }
                else {
                    throw new Error(`Error executing statement: ${queryError.message}\nStatement: ${statement}`);
                }
            }
        }

        console.log(`🎉 Successfully applied migration: ${MIGRATION_NAME}`);

    } catch (error) {
        console.error('🔥 Migration failed:', error.message);
        process.exit(1);
    }
}

applyMigration(); 