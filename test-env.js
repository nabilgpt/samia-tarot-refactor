#!/usr/bin/env node

// Test environment variables loading
require('dotenv').config();

console.log('🔧 ENVIRONMENT VARIABLES TEST');
console.log('='.repeat(50));

const testVars = [
  'JWT_SECRET',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'STRIPE_SECRET_KEY',
  'OPENAI_API_KEY'
];

testVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value.substring(0, 20)}...`);
  } else {
    console.log(`❌ ${varName}: NOT FOUND`);
  }
});

console.log('\n📊 Total environment variables:', Object.keys(process.env).length);
console.log('📄 NODE_ENV:', process.env.NODE_ENV || 'undefined');
console.log('📁 Current directory:', process.cwd()); 