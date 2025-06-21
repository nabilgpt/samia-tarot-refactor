const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

// Supabase configuration for backend
const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'placeholder_key';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Check if we're in development mode
const isDevelopmentMode = !process.env.SUPABASE_URL || 
  supabaseUrl.includes('placeholder') || 
  supabaseAnonKey.includes('placeholder');

console.log('🔧 Supabase Configuration:');
console.log('  URL:', supabaseUrl);
console.log('  Development Mode:', isDevelopmentMode);

// Create mock client for development
const createMockClient = () => {
  console.log('🔧 Creating mock Supabase client for development...');
  
  return {
    from: (table) => ({
      select: (columns) => ({
        data: [],
        error: null,
        eq: () => ({ data: [], error: null, single: async () => ({ data: null, error: null }) }),
        gte: () => ({ data: [], error: null }),
        lte: () => ({ data: [], error: null }),
        order: () => ({ data: [], error: null, limit: () => ({ data: [], error: null }) }),
        limit: () => ({ data: [], error: null }),
        single: async () => ({ data: null, error: null }),
        range: () => ({ data: [], error: null }),
        in: () => ({ data: [], error: null })
      }),
      insert: (data) => ({
        data: null,
        error: null,
        select: () => ({ data: null, error: null, single: async () => ({ data: null, error: null }) })
      }),
      update: (data) => ({
        data: null,
        error: null,
        eq: () => ({ data: null, error: null, select: () => ({ data: null, error: null }) })
      }),
      delete: () => ({
        data: null,
        error: null,
        eq: () => ({ data: null, error: null })
      }),
      count: async () => ({ count: 0, error: null })
    }),
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      signOut: async () => ({ error: null })
    },
    storage: {
      from: (bucket) => ({
        upload: async () => ({ data: null, error: null }),
        download: async () => ({ data: null, error: null })
      })
    }
  };
};

// Create Supabase clients
let supabase, supabaseAdmin;

if (isDevelopmentMode) {
  console.log('⚠️ Using mock Supabase client for development');
  supabase = createMockClient();
  supabaseAdmin = createMockClient();
} else {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('✅ Supabase client created successfully');
    
    if (supabaseServiceRoleKey) {
      supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
      console.log('✅ Supabase admin client created successfully');
    } else {
      console.warn('⚠️ No service role key - admin operations will be limited');
      supabaseAdmin = supabase;
    }
  } catch (error) {
    console.error('❌ Error creating Supabase client:', error);
    supabase = createMockClient();
    supabaseAdmin = createMockClient();
  }
}

module.exports = {
  supabase,
  supabaseAdmin,
  createClient,
  isDevelopmentMode
}; 