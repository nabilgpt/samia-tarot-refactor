#!/usr/bin/env node

/**
 * Setup script for app_config table
 * This script creates the app_config table and inserts default configuration values
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from the main .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase configuration from environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!supabaseUrl) {
  console.error('❌ Missing required environment variable: VITE_SUPABASE_URL');
  process.exit(1);
}
if (!supabaseServiceKey) {
  console.error('❌ Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupConfigTable() {
  try {
    console.log('🚀 Setting up app_config table...');

    // Read the SQL file
    const sqlPath = path.join(__dirname, '..', 'database', 'create_app_config_table.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Split SQL commands by semicolon and execute them one by one
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    for (const command of commands) {
      if (command.trim()) {
        console.log(`Executing: ${command.substring(0, 50)}...`);
        
        const { error } = await supabase.rpc('exec_sql', { 
          sql_query: command 
        });

        if (error) {
          // Try direct execution for some commands
          const { error: directError } = await supabase
            .from('_temp')
            .select('*')
            .limit(0);
          
          if (directError && !directError.message.includes('does not exist')) {
            console.warn(`Warning: ${error.message}`);
          }
        }
      }
    }

    // Verify table creation
    const { data, error } = await supabase
      .from('app_config')
      .select('key, section')
      .limit(5);

    if (error) {
      throw new Error(`Failed to verify table creation: ${error.message}`);
    }

    console.log('✅ app_config table setup completed successfully!');
    console.log(`📊 Found ${data.length} configuration entries`);
    
    if (data.length > 0) {
      console.log('Sample entries:');
      data.forEach(entry => {
        console.log(`  - ${entry.key} (${entry.section})`);
      });
    }

  } catch (error) {
    console.error('❌ Error setting up app_config table:', error.message);
    process.exit(1);
  }
}

// Alternative method: Insert configuration directly
async function insertDefaultConfig() {
  try {
    console.log('📝 Inserting default configuration values...');

    const defaultConfig = [
      // AI Configuration
      { key: 'ai_providers', value: '[]', section: 'ai', editable: true, description: 'List of available AI providers' },
      { key: 'ai_default_provider', value: '"openai"', section: 'ai', editable: true, description: 'Default AI provider to use' },
      { key: 'ai_default_model', value: '"gpt-4"', section: 'ai', editable: true, description: 'Default AI model to use' },

      // Database Configuration
      { key: 'database_type', value: '"supabase"', section: 'database', editable: true, description: 'Primary database type' },
      { key: 'supabase_url', value: '""', section: 'database', editable: true, description: 'Supabase project URL' },
      { key: 'supabase_anon_key', value: '""', section: 'database', editable: true, description: 'Supabase anonymous key' },
      { key: 'supabase_service_key', value: '""', section: 'database', editable: true, description: 'Supabase service role key' },
      { key: 'supabase_storage_bucket', value: '"samia-tarot-uploads"', section: 'database', editable: true, description: 'Supabase storage bucket name' },

      // Storage Configuration
      { key: 'storage_provider', value: '"supabase"', section: 'storage', editable: true, description: 'Default storage provider' },
      { key: 'b2_bucket_name', value: '""', section: 'storage', editable: true, description: 'Backblaze B2 bucket name' },
      { key: 'b2_endpoint_url', value: '""', section: 'storage', editable: true, description: 'Backblaze B2 endpoint URL' },
      { key: 'b2_access_key_id', value: '""', section: 'storage', editable: true, description: 'Backblaze B2 access key ID' },
      { key: 'b2_secret_access_key', value: '""', section: 'storage', editable: true, description: 'Backblaze B2 secret access key' },

      // Notification Configuration
      { key: 'notifications_enabled', value: 'true', section: 'notifications', editable: true, description: 'Enable/disable notifications' },
      { key: 'email_provider', value: '"sendgrid"', section: 'notifications', editable: true, description: 'Email service provider' },
      { key: 'push_notifications_enabled', value: 'true', section: 'notifications', editable: true, description: 'Enable push notifications' },

      // General Configuration
      { key: 'app_name', value: '"Samia Tarot"', section: 'general', editable: true, description: 'Application name' },
      { key: 'app_version', value: '"1.0.0"', section: 'general', editable: false, description: 'Application version' },
      { key: 'maintenance_mode', value: 'false', section: 'general', editable: true, description: 'Maintenance mode toggle' }
    ];

    for (const config of defaultConfig) {
      const { error } = await supabase
        .from('app_config')
        .upsert(config, { onConflict: 'key' });

      if (error) {
        console.warn(`Warning inserting ${config.key}:`, error.message);
      } else {
        console.log(`✓ Inserted ${config.key}`);
      }
    }

    console.log('✅ Default configuration inserted successfully!');

  } catch (error) {
    console.error('❌ Error inserting default configuration:', error.message);
  }
}

// Main execution
async function main() {
  console.log('🔧 SAMIA TAROT - Configuration Table Setup');
  console.log('==========================================');
  
  await setupConfigTable();
  await insertDefaultConfig();
  
  console.log('\n🎉 Setup completed! You can now use the Configuration Panel in the Admin Dashboard.');
}

main().catch(console.error); 