#!/usr/bin/env node

/**
 * Test Supabase Connection
 */

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔧 Testing Supabase Connection...');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : 'Missing');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test connection
const testConnection = async () => {
  try {
    console.log('\n🔍 Testing database connection...');
    
    // Simple query that doesn't require authentication
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(0);
    
    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('relation')) {
        console.log('✅ Connection successful (table not found is expected)');
      } else if (error.code === '401') {
        console.log('✅ Connection successful (authentication required is expected)');
      } else {
        console.error('❌ Connection error:', error.message);
      }
    } else {
      console.log('✅ Connection successful!');
    }
    
    console.log('\n🎉 Supabase connection test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

testConnection();
