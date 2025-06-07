import { createClient } from '@supabase/supabase-js';

// Supabase configuration using environment variables ONLY
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

// Check for development/placeholder values
const isDevelopmentMode = !supabaseUrl || 
  supabaseUrl.includes('placeholder') || 
  supabaseUrl.includes('your-project-id') ||
  !supabaseAnonKey || 
  supabaseAnonKey.includes('placeholder') ||
  supabaseAnonKey.includes('your_supabase');

// Validate required environment variables
if (!supabaseUrl) {
  if (isDevelopmentMode) {
    console.warn('⚠️ DEVELOPMENT MODE: VITE_SUPABASE_URL not configured. Using mock setup.');
  } else {
    throw new Error('Missing required environment variable: VITE_SUPABASE_URL');
  }
}

if (!supabaseAnonKey) {
  if (isDevelopmentMode) {
    console.warn('⚠️ DEVELOPMENT MODE: VITE_SUPABASE_ANON_KEY not configured. Using mock setup.');
  } else {
    throw new Error('Missing required environment variable: VITE_SUPABASE_ANON_KEY');
  }
}

if (!supabaseServiceRoleKey && !isDevelopmentMode) {
  console.warn('Missing SUPABASE_SERVICE_ROLE_KEY - admin operations will be disabled');
}

// Create mock client for development mode
const createMockSupabaseClient = () => {
  console.log('🔧 Creating mock Supabase client for development...');
  
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: { message: 'Mock mode - no real authentication' } }),
      getSession: async () => ({ data: { session: null }, error: null }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: (callback) => {
        // Mock auth state change
        setTimeout(() => callback('SIGNED_OUT', null), 100);
        return { data: { subscription: { unsubscribe: () => {} } } };
      }
    },
    from: (table) => ({
      select: () => ({ 
        data: [], 
        error: { message: `Mock mode - table "${table}" not available` },
        single: async () => ({ data: null, error: { message: `Mock mode - no data for table "${table}"` } }),
        limit: () => ({ data: [], error: { message: `Mock mode - table "${table}" not available` } }),
        order: () => ({ data: [], error: { message: `Mock mode - table "${table}" not available` } }),
        eq: () => ({ 
          data: [], 
          error: { message: `Mock mode - table "${table}" not available` },
          single: async () => ({ data: null, error: { message: `Mock mode - no data for table "${table}"` } })
        }),
        gte: () => ({ data: [], error: { message: `Mock mode - table "${table}" not available` } }),
        lte: () => ({ data: [], error: { message: `Mock mode - table "${table}" not available` } })
      }),
      insert: () => ({ 
        data: null, 
        error: { message: `Mock mode - cannot insert into table "${table}"` },
        select: () => ({ 
          data: null, 
          error: { message: `Mock mode - cannot insert into table "${table}"` },
          single: async () => ({ data: null, error: { message: `Mock mode - cannot insert into table "${table}"` } })
        })
      }),
      update: () => ({ 
        data: null, 
        error: { message: `Mock mode - cannot update table "${table}"` },
        eq: () => ({
          data: null, 
          error: { message: `Mock mode - cannot update table "${table}"` },
          select: () => ({ 
            data: null, 
            error: { message: `Mock mode - cannot update table "${table}"` },
            single: async () => ({ data: null, error: { message: `Mock mode - cannot update table "${table}"` } })
          })
        })
      }),
      delete: () => ({ data: null, error: { message: `Mock mode - cannot delete from table "${table}"` } })
    }),
    storage: {
      from: (bucket) => ({
        upload: async () => ({ data: null, error: { message: `Mock mode - cannot upload to bucket "${bucket}"` } }),
        getPublicUrl: () => ({ data: { publicUrl: `https://mock-storage/${bucket}/mock-file.jpg` } })
      })
    },
    rpc: async (funcName) => ({ data: null, error: { message: `Mock mode - cannot call RPC function "${funcName}"` } })
  };
};

// Create and export the Supabase client
export const supabase = isDevelopmentMode ? 
  createMockSupabaseClient() : 
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  });

// Create admin client with service role key for admin operations
// Fallback to regular client if service role key is not available
export const supabaseAdmin = (!isDevelopmentMode && supabaseServiceRoleKey) 
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : supabase; // Use regular client as fallback

// Helper functions for common operations
export const auth = supabase.auth;

// Development mode indicator
export const isDevMode = isDevelopmentMode;

// Helper function to safely query a table that might not exist
export const safeTableQuery = async (tableName, operation, fallbackData = null) => {
  if (isDevelopmentMode) {
    console.warn(`🔧 Mock mode: Simulating query for table "${tableName}"`);
    return {
      data: fallbackData,
      error: null,
      warning: `Mock mode - table "${tableName}" simulation`
    };
  }

  try {
    let query = supabase.from(tableName);
    
    // Apply the operation (select, insert, update, etc.)
    const result = await operation(query);
    
    return result;
  } catch (error) {
    // Check if it's a table not found error
    if (error.message?.includes('does not exist') || 
        error.message?.includes('relation') || 
        error.code === 'PGRST116' ||
        error.status === 404) {
      
      console.warn(`Table "${tableName}" does not exist. Using fallback data.`, error.message);
      
      return {
        data: fallbackData,
        error: null,
        warning: `Table "${tableName}" not found`
      };
    }
    
    // Re-throw other errors
    throw error;
  }
};

// Enhanced database table helpers with safe fallbacks
export const safeDb = {
  profiles: () => supabase.from('profiles'),
  services: () => supabase.from('services'),
  bookings: () => supabase.from('bookings'),
  payments: () => supabase.from('payments'),
  messages: () => supabase.from('messages'),
  
  // Safe wrappers for potentially missing tables
  call_sessions: () => ({
    select: (columns = '*') => safeTableQuery('call_sessions', (query) => query.select(columns), []),
    insert: (data) => safeTableQuery('call_sessions', (query) => query.insert(data), null),
    update: (data) => safeTableQuery('call_sessions', (query) => query.update(data), null),
    delete: () => safeTableQuery('call_sessions', (query) => query.delete(), null)
  }),
  
  call_recordings: () => ({
    select: (columns = '*') => safeTableQuery('call_recordings', (query) => query.select(columns), []),
    insert: (data) => safeTableQuery('call_recordings', (query) => query.insert(data), null),
    update: (data) => safeTableQuery('call_recordings', (query) => query.update(data), null),
    delete: () => safeTableQuery('call_recordings', (query) => query.delete(), null)
  }),
  
  emergency_call_logs: () => ({
    select: (columns = '*') => safeTableQuery('emergency_call_logs', (query) => query.select(columns), []),
    insert: (data) => safeTableQuery('emergency_call_logs', (query) => query.insert(data), null),
    update: (data) => safeTableQuery('emergency_call_logs', (query) => query.update(data), null),
    delete: () => safeTableQuery('emergency_call_logs', (query) => query.delete(), null)
  })
};

// Function to check if required tables exist
export const checkRequiredTables = async () => {
  if (isDevelopmentMode) {
    console.log('🔧 Mock mode: Skipping table existence check');
    return {
      allTablesExist: false,
      missingTables: ['all_tables_mocked_in_dev_mode']
    };
  }

  const requiredTables = ['call_sessions', 'call_recordings', 'emergency_call_logs'];
  const missingTables = [];
  
  for (const tableName of requiredTables) {
    try {
      await supabase.from(tableName).select('id').limit(1);
    } catch (error) {
      if (error.message?.includes('does not exist') || 
          error.message?.includes('relation') || 
          error.code === 'PGRST116' ||
          error.status === 404) {
        missingTables.push(tableName);
      }
    }
  }
  
  if (missingTables.length > 0) {
    console.warn('Missing Supabase tables detected:', missingTables);
    console.warn('Please run the CREATE_MISSING_SUPABASE_TABLES.sql script in your Supabase dashboard');
  }
  
  return {
    allTablesExist: missingTables.length === 0,
    missingTables
  };
};

// Auth helper functions
export const authHelpers = {
  // Get current user
  getCurrentUser: async () => {
    if (isDevelopmentMode) {
      console.log('🔧 Mock mode: No user authentication');
      return null;
    }
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  // Get current session
  getCurrentSession: async () => {
    if (isDevelopmentMode) {
      console.log('🔧 Mock mode: No session available');
      return null;
    }
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  // Sign out
  signOut: async () => {
    if (isDevelopmentMode) {
      console.log('🔧 Mock mode: Sign out simulation');
      return { error: null };
    }
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  // Listen to auth changes
  onAuthStateChange: (callback) => {
    return supabase.auth.onAuthStateChange(callback);
  }
};

// Profile helper functions
export const profileHelpers = {
  // Get user profile
  getProfile: async (userId) => {
    if (isDevelopmentMode) {
      console.log('🔧 Mock mode: Profile data not available');
      return { data: null, error: { message: 'Mock mode - no profile data' } };
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    return { data, error };
  },

  // Update user profile
  updateProfile: async (userId, updates) => {
    if (isDevelopmentMode) {
      console.log('🔧 Mock mode: Profile update simulation');
      return { data: null, error: { message: 'Mock mode - cannot update profile' } };
    }
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    return { data, error };
  },

  // Create user profile
  createProfile: async (profile) => {
    if (isDevelopmentMode) {
      console.log('🔧 Mock mode: Profile creation simulation');
      return { data: null, error: { message: 'Mock mode - cannot create profile' } };
    }
    const { data, error } = await supabase
      .from('profiles')
      .insert([profile])
      .select()
      .single();
    return { data, error };
  }
};

// Service helper functions
export const serviceHelpers = {
  // Get all services
  getAllServices: async () => {
    if (isDevelopmentMode) {
      console.log('🔧 Mock mode: Service data not available');
      return { data: [], error: { message: 'Mock mode - no services data' } };
    }
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('created_at', { ascending: false });
    return { data, error };
  },

  // Get services by type
  getServicesByType: async (type) => {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('type', type)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  // Get VIP services
  getVIPServices: async () => {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('is_vip', true)
      .order('created_at', { ascending: false });
    return { data, error };
  }
};

// Booking helper functions
export const bookingHelpers = {
  // Get user bookings
  getUserBookings: async (userId) => {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        service:services(*),
        reader:profiles!reader_id(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  // Create booking
  createBooking: async (booking) => {
    const { data, error } = await supabase
      .from('bookings')
      .insert([booking])
      .select(`
        *,
        service:services(*),
        reader:profiles!reader_id(*)
      `)
      .single();
    return { data, error };
  },

  // Update booking status
  updateBookingStatus: async (bookingId, status) => {
    const { data, error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', bookingId)
      .select()
      .single();
    return { data, error };
  }
};

// Payment helper functions
export const paymentHelpers = {
  // Create payment record
  createPayment: async (payment) => {
    const { data, error } = await supabase
      .from('payments')
      .insert([payment])
      .select()
      .single();
    return { data, error };
  },

  // Get user payments
  getUserPayments: async (userId) => {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        booking:bookings(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return { data, error };
  }
};

// Message helper functions
export const messageHelpers = {
  // Send message
  sendMessage: async (message) => {
    const { data, error } = await supabase
      .from('messages')
      .insert([message])
      .select()
      .single();
    return { data, error };
  },

  // Get conversation messages
  getConversationMessages: async (bookingId) => {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!sender_id(*),
        receiver:profiles!receiver_id(*)
      `)
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });
    return { data, error };
  },

  // Subscribe to new messages
  subscribeToMessages: (bookingId, callback) => {
    return supabase
      .channel(`messages:${bookingId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `booking_id=eq.${bookingId}`
      }, callback)
      .subscribe();
  }
};

// Original database table helpers (for backward compatibility)
export const db = {
  profiles: () => supabase.from('profiles'),
  services: () => supabase.from('services'),
  bookings: () => supabase.from('bookings'),
  payments: () => supabase.from('payments'),
  messages: () => supabase.from('messages')
};

// Initialize Supabase with development mode awareness
export const initializeSupabase = async () => {
  if (isDevelopmentMode) {
    console.log('🔧 DEVELOPMENT MODE ACTIVE');
    console.log('📝 To connect to real Supabase:');
    console.log('   1. Get your project credentials from: https://supabase.com/dashboard');
    console.log('   2. Update VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
    console.log('   3. Restart the development server');
    return {
      initialized: true,
      mode: 'development-mock',
      message: 'Running in mock mode - update environment variables to connect to real Supabase'
    };
  }

  try {
    // Test connection
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    
    if (error) {
      console.warn('Supabase connection test failed:', error.message);
      return {
        initialized: false,
        error: error.message
      };
    }

    console.log('✅ Supabase connected successfully');
    return {
      initialized: true,
      mode: 'production',
      message: 'Connected to Supabase successfully'
    };
  } catch (error) {
    console.error('Supabase initialization failed:', error);
    return {
      initialized: false,
      error: error.message
    };
  }
};

export default supabase; 