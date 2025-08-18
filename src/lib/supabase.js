// ============================================================================
// SAMIA TAROT - FRONTEND SUPABASE CONFIGURATION
// Frontend Supabase client configuration using Vite environment variables
// ============================================================================

import { createClient } from '@supabase/supabase-js';

// Get Supabase configuration from Vite environment variables (frontend only)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('🔧 Frontend Supabase Configuration:');
console.log('  URL:', supabaseUrl);
console.log('  Mode: Frontend (Browser)');

// Validate required environment variables
if (!supabaseUrl) {
  throw new Error('Missing required environment variable: VITE_SUPABASE_URL');
}

if (!supabaseAnonKey) {
  throw new Error('Missing required environment variable: VITE_SUPABASE_ANON_KEY');
}

// Create Supabase client (frontend only - no service role key)
const createSupabaseClient = () => {
  console.log('✅ Frontend Supabase client created successfully');
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  });
};

// Initialize client
export const supabase = createSupabaseClient();

// Export client creation function for testing
export { createSupabaseClient };

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

// Check if required tables exist
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

// Booking helper functions
export const bookingHelpers = {
  // Create booking
  createBooking: async (bookingData) => {
    const { data, error } = await supabase
      .from('bookings')
      .insert([bookingData])
      .select()
      .single();
    return { data, error };
  },

  // Update booking status
  updateBookingStatus: async (bookingId, status) => {
    const { data, error } = await supabase
      .from('bookings')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .select()
      .single();
    return { data, error };
  },

  // Get user bookings
  getUserBookings: async (userId) => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  // Get reader bookings
  getReaderBookings: async (readerId) => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('reader_id', readerId)
      .order('created_at', { ascending: false });
    return { data, error };
  }
};

// Payment helper functions
export const paymentHelpers = {
  // Create payment
  createPayment: async (paymentData) => {
    const { data, error } = await supabase
      .from('payments')
      .insert([paymentData])
      .select()
      .single();
    return { data, error };
  },

  // Get user payments
  getUserPayments: async (userId) => {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  // Update payment status
  updatePaymentStatus: async (paymentId, status, adminNotes = '') => {
    const { data, error } = await supabase
      .from('payments')
      .update({ 
        status,
        admin_notes: adminNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentId)
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
      .order('name', { ascending: true });
    return { data, error };
  },

  // Get reader services
  getReaderServices: async (readerId) => {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('reader_id', readerId)
      .eq('is_active', true)
      .order('name', { ascending: true });
    return { data, error };
  },

  // Create service
  createService: async (serviceData) => {
    const { data, error } = await supabase
      .from('services')
      .insert([serviceData])
      .select()
      .single();
    return { data, error };
  },

  // Update service
  updateService: async (serviceId, updates) => {
    const { data, error } = await supabase
      .from('services')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', serviceId)
      .select()
      .single();
    return { data, error };
  },

  // Delete service
  deleteService: async (serviceId) => {
    const { data, error } = await supabase
      .from('services')
      .delete()
      .eq('id', serviceId)
      .select()
      .single();
    return { data, error };
  }
};

// Initialize Supabase
export const initializeSupabase = async () => {
  try {
    // Test connection
    const { error } = await supabase.from('profiles').select('count').limit(1);
    
    if (error) {
      console.warn('Frontend Supabase connection test failed:', error.message);
      return {
        initialized: false,
        error: error.message
      };
    }

    console.log('✅ Frontend Supabase connected successfully');
    return {
      initialized: true,
      mode: 'frontend',
      message: 'Connected to Supabase successfully from frontend'
    };
  } catch (error) {
    console.error('Frontend Supabase initialization failed:', error);
    return {
      initialized: false,
      error: error.message
    };
  }
}; 
