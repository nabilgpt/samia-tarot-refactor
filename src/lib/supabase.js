import { createClient } from '@supabase/supabase-js';

// Supabase configuration using environment variables ONLY
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!supabaseUrl) {
  throw new Error('Missing required environment variable: VITE_SUPABASE_URL');
}
if (!supabaseAnonKey) {
  throw new Error('Missing required environment variable: VITE_SUPABASE_ANON_KEY');
}
if (!supabaseServiceRoleKey) {
  console.warn('Missing SUPABASE_SERVICE_ROLE_KEY - admin operations will be disabled');
}

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Create admin client with service role key for admin operations
// Fallback to regular client if service role key is not available
export const supabaseAdmin = supabaseServiceRoleKey 
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : supabase; // Use regular client as fallback

// Helper functions for common operations
export const auth = supabase.auth;

// Helper function to safely query a table that might not exist
export const safeTableQuery = async (tableName, operation, fallbackData = null) => {
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
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  // Get current session
  getCurrentSession: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  // Sign out
  signOut: async () => {
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
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    return { data, error };
  },

  // Update user profile
  updateProfile: async (userId, updates) => {
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

// Function to initialize and check Supabase setup
export const initializeSupabase = async () => {
  console.log('🔍 Checking Supabase table setup...');
  
  const tableCheck = await checkRequiredTables();
  
  if (!tableCheck.allTablesExist) {
    console.warn('⚠️  Some required tables are missing:', tableCheck.missingTables);
    console.warn('📋 To create missing tables, run the SQL script: CREATE_MISSING_SUPABASE_TABLES.sql');
    console.warn('🔧 Some features may be limited until tables are created.');
  } else {
    console.log('✅ All required Supabase tables are present');
  }
  
  return tableCheck;
};

export default supabase; 