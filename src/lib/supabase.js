import { createClient } from '@supabase/supabase-js';

// Supabase configuration using environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://uusefmlielktdcltzwzt.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwczovL3N1cGFiYXNlLmNvbS9qd3Qvc2NvcGVzIjpbImF1dGgiXSwicm9sZSI6ImFub24iLCJpYXQiOjE2ODg0MDk3MDcsImV4cCI6MjAwMDAwMDAwMH0.JfSt1aI8mJQ4GuCPrlIxw3htv6yE-0Ajl-JbixcM1UA';

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Helper functions for common operations
export const auth = supabase.auth;

// Database table helpers
export const db = {
  profiles: () => supabase.from('profiles'),
  services: () => supabase.from('services'),
  bookings: () => supabase.from('bookings'),
  payments: () => supabase.from('payments'),
  messages: () => supabase.from('messages')
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

export default supabase; 