#!/usr/bin/env node

/**
 * 🔧 ENV File Creator
 * Helps create .env file with correct Supabase configuration
 */

import fs from 'fs/promises';

const envContent = `# =============================================================================
# SAMIA TAROT - ENVIRONMENT VARIABLES (Development)
# =============================================================================

# -----------------------------------------------------------------------------
# SUPABASE CONFIGURATION
# -----------------------------------------------------------------------------
VITE_SUPABASE_URL=https://uuseflmielktdcltzwzt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c2VmbG1pZWxrdGRjbHR6d3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzNDUxMTUsImV4cCI6MjA2MzkyMTExNX0.Qcds_caGg7xbe4rl1Z8Rh4Nox79VJWRDabp5_Bt0YOw
# 🚨 IMPORTANT: Add your service role key below for automatic database setup
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE

# -----------------------------------------------------------------------------
# AI SERVICES
# -----------------------------------------------------------------------------
VITE_ENABLE_AI_READINGS=true

# -----------------------------------------------------------------------------
# APPLICATION SETTINGS
# -----------------------------------------------------------------------------
VITE_APP_NAME="Samia Tarot"
VITE_APP_ENV="development"
`;

async function createEnvFile() {
  try {
    // Check if .env already exists
    try {
      await fs.access('.env');
      console.log('⚠️  .env file already exists');
      
      // Read existing content
      const existingContent = await fs.readFile('.env', 'utf-8');
      
      // Check if it has service role key
      if (existingContent.includes('SUPABASE_SERVICE_ROLE_KEY=') && 
          !existingContent.includes('YOUR_SERVICE_ROLE_KEY_HERE')) {
        console.log('✅ .env file looks good!');
        console.log('🔍 Found service role key configuration');
        return;
      } else {
        console.log('⚠️  .env file exists but needs service role key');
        console.log('📋 Please add your SUPABASE_SERVICE_ROLE_KEY to .env file');
        console.log('🔗 Get it from: https://supabase.com/dashboard/project/uuseflmielktdcltzwzt/settings/api');
        return;
      }
    } catch (error) {
      // .env doesn't exist, create it
      console.log('📝 Creating .env file...');
    }
    
    await fs.writeFile('.env', envContent);
    
    console.log('✅ .env file created successfully!');
    console.log('');
    console.log('🚨 IMPORTANT NEXT STEPS:');
    console.log('1. Go to: https://supabase.com/dashboard/project/uuseflmielktdcltzwzt/settings/api');
    console.log('2. Copy the "service_role" key (NOT the anon key)');
    console.log('3. Replace "YOUR_SERVICE_ROLE_KEY_HERE" in .env with your key');
    console.log('4. Run: node scripts/super-agent.js');
    console.log('');
    console.log('⚠️  WARNING: Never commit the service role key to version control!');
    
  } catch (error) {
    console.error('❌ Error creating .env file:', error.message);
  }
}

createEnvFile(); 