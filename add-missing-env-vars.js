#!/usr/bin/env node

/**
 * Add Missing Environment Variables for QA Script
 */

const fs = require('fs');
const path = require('path');

const addMissingEnvVars = () => {
  console.log('🔧 ADDING MISSING ENVIRONMENT VARIABLES FOR QA');
  console.log('=' .repeat(60));
  
  try {
    const envPath = path.join(process.cwd(), '.env');
    
    // Read current .env file
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Add missing variables that QA script expects
    const missingVars = [
      'SUPABASE_URL=https://uuseflmielktdcltzwzt.supabase.co',
      'SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c2VmbG1pZWxrdGRjbHR6d3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE1MTU4MDEsImV4cCI6MjA0NzA5MTgwMX0.TxcJcU0JW9WKo6VtjCQJV2S33Kn8CWfWNFp5oXR1NrY'
    ];
    
    let added = 0;
    
    // Add missing variables if they don't exist
    missingVars.forEach(varLine => {
      const varName = varLine.split('=')[0];
      if (!envContent.includes(varName + '=')) {
        envContent += '\n' + varLine;
        console.log(`✅ Added: ${varName}`);
        added++;
      } else {
        console.log(`⚠️  Already exists: ${varName}`);
      }
    });
    
    // Write back to file
    fs.writeFileSync(envPath, envContent, 'utf8');
    
    if (added > 0) {
      console.log(`\n✅ Added ${added} missing environment variables!`);
    } else {
      console.log('\n⚠️  All variables already exist.');
    }
    
    // Display current env vars count
    const lines = envContent.split('\n').filter(line => 
      line.trim() && !line.trim().startsWith('#') && line.includes('=')
    );
    
    console.log(`📊 Total environment variables: ${lines.length}`);
    
  } catch (error) {
    console.error('❌ Error adding environment variables:', error.message);
    process.exit(1);
  }
};

// Run the script
addMissingEnvVars(); 