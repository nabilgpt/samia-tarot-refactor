#!/usr/bin/env node

/**
 * URGENT: Create .env file for SAMIA TAROT backend
 * Fixes: Missing required environment variable: SUPABASE_URL
 */

import fs from 'fs';
import readline from 'readline';

console.log('🚨 URGENT: Backend .env File Setup');
console.log('━'.repeat(50));
console.log('Backend is failing because .env file is missing!');
console.log('');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Check if .env already exists
if (fs.existsSync('.env')) {
  console.log('⚠️  .env file already exists!');
  console.log('');
  
  // Read and show current content
  const currentEnv = fs.readFileSync('.env', 'utf8');
  console.log('Current .env content:');
  console.log('━'.repeat(30));
  console.log(currentEnv);
  console.log('━'.repeat(30));
  console.log('');
  
  rl.question('Do you want to overwrite it? (y/N): ', (answer) => {
    if (answer.toLowerCase() === 'y') {
      createEnvFile();
    } else {
      console.log('✅ Keeping existing .env file');
      console.log('');
      console.log('💡 If backend still fails, check your Supabase credentials');
      process.exit(0);
    }
  });
} else {
  console.log('📝 No .env file found. Let\'s create one!');
  console.log('');
  createEnvFile();
}

function createEnvFile() {
  console.log('🔧 Creating .env file...');
  console.log('');
  console.log('📋 You need these from Supabase Dashboard → Settings → API:');
  console.log('   1. Project URL (looks like: https://abc123.supabase.co)');
  console.log('   2. anon/public key (starts with: eyJhbGciOiJIUzI1NiI...)');
  console.log('   3. service_role key (starts with: eyJhbGciOiJIUzI1NiI...)');
  console.log('');
  
  rl.question('Enter your SUPABASE_URL: ', (supabaseUrl) => {
    if (!supabaseUrl || !supabaseUrl.includes('supabase.co')) {
      console.log('❌ Invalid Supabase URL. Should look like: https://abc123.supabase.co');
      process.exit(1);
    }
    
    rl.question('Enter your SUPABASE_ANON_KEY: ', (anonKey) => {
      if (!anonKey || !anonKey.startsWith('eyJ')) {
        console.log('❌ Invalid anon key. Should start with: eyJ');
        process.exit(1);
      }
      
      rl.question('Enter your SUPABASE_SERVICE_ROLE_KEY: ', (serviceKey) => {
        if (!serviceKey || !serviceKey.startsWith('eyJ')) {
          console.log('❌ Invalid service role key. Should start with: eyJ');
          process.exit(1);
        }
        
        // Generate a random JWT secret
        const jwtSecret = generateJWTSecret();
        
        const envContent = `# ================================================================
# SAMIA TAROT - ENVIRONMENT VARIABLES
# ================================================================
# Created: ${new Date().toISOString()}

# SUPABASE CONFIGURATION (REQUIRED)
SUPABASE_URL=${supabaseUrl}
SUPABASE_ANON_KEY=${anonKey}
SUPABASE_SERVICE_ROLE_KEY=${serviceKey}

# VITE FRONTEND CONFIGURATION
VITE_SUPABASE_URL=${supabaseUrl}
VITE_SUPABASE_ANON_KEY=${anonKey}

# SERVER CONFIGURATION
NODE_ENV=development
PORT=5001
JWT_SECRET=${jwtSecret}

# ================================================================
# NOTES:
# - Never commit this file to git
# - Keep service_role key secure
# - Backend should now start successfully
# ================================================================
`;
        
        try {
          fs.writeFileSync('.env', envContent);
          console.log('');
          console.log('✅ .env file created successfully!');
          console.log('');
          console.log('📄 Created with:');
          console.log(`   📍 SUPABASE_URL: ${supabaseUrl}`);
          console.log(`   🔑 SUPABASE_ANON_KEY: ${anonKey.substring(0, 20)}...`);
          console.log(`   🔑 SERVICE_ROLE_KEY: ${serviceKey.substring(0, 20)}...`);
          console.log(`   🔐 JWT_SECRET: ${jwtSecret.substring(0, 10)}... (auto-generated)`);
          console.log('');
          console.log('🚀 Now try running:');
          console.log('   npm run backend    # Should work now!');
          console.log('   npm run frontend   # In another terminal');
          console.log('   npm run dev        # Or both together');
          console.log('');
          
        } catch (error) {
          console.error('❌ Failed to create .env file:', error.message);
          process.exit(1);
        }
        
        rl.close();
      });
    });
  });
}

function generateJWTSecret() {
  // Generate a secure random JWT secret
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let secret = '';
  for (let i = 0; i < 64; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return secret;
} 