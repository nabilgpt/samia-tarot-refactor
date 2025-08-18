// ============================================================================
// SAMIA TAROT - BACKEND SUPABASE CONFIGURATION
// Backend Supabase client configuration using Node.js environment variables
// ============================================================================

// SECURITY: Prevent frontend imports
if (typeof window !== "undefined") {
  throw new Error("[SECURITY] Backend supabase.js imported in browser context! Check your imports!");
}

console.trace('[DEBUG] 🔍 Backend supabase.js loaded! FILE:', import.meta.url, 'ENV:', process.env.SUPABASE_URL);

import { createClient } from '@supabase/supabase-js';

// Get Supabase configuration from Node.js environment variables (backend only)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Backend Supabase Configuration:');
console.log('  URL:', supabaseUrl);
console.log('  Mode: Backend (Server)');

// Validate required environment variables
if (!supabaseUrl) {
  throw new Error('Missing required environment variable: SUPABASE_URL');
}

if (!supabaseAnonKey) {
  throw new Error('Missing required environment variable: SUPABASE_ANON_KEY');
}

if (!supabaseServiceRoleKey) {
  console.warn('Missing SUPABASE_SERVICE_ROLE_KEY - admin operations will be disabled');
}

// Create Supabase client (backend)
const createSupabaseClient = () => {
  console.log('✅ Backend Supabase client created successfully');
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: false
    }
  });
};

// Create Supabase admin client (with service role key)
const createSupabaseAdminClient = () => {
  if (!supabaseServiceRoleKey) {
    console.warn('⚠️ No service role key - admin client disabled');
    return null;
  }
  
  console.log('✅ Backend Supabase admin client created successfully');
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

// Initialize clients
export const supabase = createSupabaseClient();
export const supabaseAdmin = createSupabaseAdminClient();

// Export client creation functions for testing
export { createSupabaseClient, createSupabaseAdminClient };

// Safe table query helper
export const safeTableQuery = async (tableName, operation, fallbackData = null) => {
  try {
    const result = await operation();
    return result;
  } catch (error) {
    console.error(`❌ Error querying table '${tableName}':`, error.message);
    return { data: fallbackData, error };
  }
};

// Check if required tables exist (backend)
export const checkRequiredTables = async () => {
  const requiredTables = [
    'profiles',
    'bookings', 
    'payments',
    'emergency_calls',
    'call_sessions',
    'system_configurations'
  ];

  const results = {};
  
  for (const table of requiredTables) {
    try {
      const { error } = await supabase.from(table).select('count').limit(1);
      results[table] = !error;
      
      if (error) {
        console.warn(`⚠️ Table '${table}' check failed:`, error.message);
      }
    } catch (err) {
      results[table] = false;
      console.warn(`⚠️ Table '${table}' not accessible:`, err.message);
    }
  }
  
  return results;
};

// Initialize Backend Supabase
export const initializeSupabase = async () => {
  try {
    // Test connection
    const { error } = await supabase.from('profiles').select('count').limit(1);
    
    if (error) {
      console.warn('Backend Supabase connection test failed:', error.message);
      return {
        initialized: false,
        error: error.message
      };
    }

    console.log('✅ Backend Supabase connected successfully');
    return {
      initialized: true,
      mode: 'backend',
      message: 'Connected to Supabase successfully from backend'
    };
  } catch (error) {
    console.error('Backend Supabase initialization failed:', error);
    return {
      initialized: false,
      error: error.message
    };
  }
};

// Default export
export default supabase; 
