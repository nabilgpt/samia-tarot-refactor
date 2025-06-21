#!/usr/bin/env node

/**
 * Fix Environment Variables for Supabase
 * Addresses the missing SUPABASE_URL and SUPABASE_ANON_KEY variables
 */

const fs = require('fs');
const path = require('path');

const fixEnvVariables = () => {
  console.log('🔧 FIXING ENVIRONMENT VARIABLES');
  console.log('=' .repeat(50));
  
  try {
    const envPath = path.join(process.cwd(), '.env');
    
    // Read current .env file
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Add missing variables
    const missingVars = [
      'SUPABASE_URL=process.env.VITE_SUPABASE_URL',
      'SUPABASE_ANON_KEY=process.env.VITE_SUPABASE_ANON_KEY'
    ];
    
    // Add missing variables if they don't exist
    missingVars.forEach(varLine => {
      const varName = varLine.split('=')[0];
      if (!envContent.includes(varName + '=')) {
        envContent += '\n' + varLine;
        console.log(`✅ Added: ${varName}`);
      } else {
        console.log(`⚠️  Already exists: ${varName}`);
      }
    });
    
    // Write back to file
    fs.writeFileSync(envPath, envContent, 'utf8');
    
    console.log('\n✅ Environment variables fixed successfully!');
    
  } catch (error) {
    console. error('❌ Error fixing environment variables:', error.message);
    process.exit(1);
  }
};

// Run the fix
fixEnvVariables(); 