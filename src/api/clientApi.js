import { supabase } from './lib/supabase.js';

export class ClientAPI {
  // ==================== AUTHENTICATION & SECURITY ====================
  
  /**
   * Verify client authentication and role
   */
  static async verifyClientAuth() {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return { success: false, error: 'Not authenticated' };
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .eq('role', 'client')
        .single();

      if (profileError || !profile) {
        return { success: false, error: 'Client profile not found' };
      }

      return { success: true, data: { user, profile } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ==================== DASHBOARD OVERVIEW ====================
  
  /**
   * Get dashboard statistics for client overview
   */
  static async getDashboardStats() {
    try {
      const authResult = await this.verifyClientAuth();
      if (!authResult.success) return authResult;

      const { user } = authResult.data;

      // Get wallet balance
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      // Get bookings statistics
      const { data: bookings } = await supabase
        .from('bookings')
        .select('status, created_at')
        .eq('client_id', user.id);

      // Get notifications count
      const { data: notifications } = await supabase
        .from('notifications')
        .select('read')
        .eq('user_id', user.id)
        .eq('read', false);

      // Get latest review
      const { data: latestReview } = await supabase
        .from('reviews')
        .select('rating, created_at')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const activeBookings = bookings?.filter(b => ['confirmed', 'in_progress'].includes(b.status)).length || 0;
      const completedBookings = bookings?.filter(b => b.status === 'completed').length || 0;

      return {
        success: true,
        data: {
          wallet_balance: wallet?.balance || 0,
          active_bookings: activeBookings,
          completed_bookings: completedBookings,
          total_bookings: bookings?.length || 0,
          unread_notifications: notifications?.length || 0,
          latest_review: latestReview
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ==================== PROFILE MANAGEMENT ====================
  
  /**
   * Get client profile information
   */
  static async getProfile() {
    try {
      const authResult = await this.verifyClientAuth();
      if (!authResult.success) return authResult;

      return { success: true, data: authResult.data.profile };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Update client profile
   */
  static async updateProfile(profileData) {
    try {
      const authResult = await this.verifyClientAuth();
      if (!authResult.success) return authResult;

      const { user } = authResult.data;

      const { data, error } = await supabase
        .from('profiles')
        .update({
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          phone: profileData.phone,
          country: profileData.country,
          birth_date: profileData.birth_date,
          zodiac_sign: profileData.zodiac_sign,
          gender: profileData.gender,
          marital_status: profileData.marital_status,
          bio: profileData.bio,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .eq('role', 'client')
        .select()
        .single();

      if (error) throw error;

      // Log the update
      await this.logActivity('profile_update', 'Profile information updated');

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ==================== BOOKINGS MANAGEMENT ====================
  
  /**
   * Get client bookings with optional filters
   */
  static async getBookings(filters = {}) {
    try {
      const authResult = await this.verifyClientAuth();
      if (!authResult.success) return authResult;

      const { user } = authResult.data;

      let query = supabase
        .from('bookings')
        .select(`
          *,
          reader:profiles!reader_id(
            id, first_name, last_name, avatar_url, rating
          ),
          service:services(
            id, name, name_ar, price, duration
          )
        `)
        .eq('client_id', user.id);

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.from_date) {
        query = query.gte('session_datetime', filters.from_date);
      }

      if (filters.to_date) {
        query = query.lte('session_datetime', filters.to_date);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ==================== WALLET & TRANSACTIONS ====================
  
  /**
   * Get wallet information
   */
  static async getWallet() {
    try {
      const authResult = await this.verifyClientAuth();
      if (!authResult.success) return authResult;

      const { user } = authResult.data;

      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ==================== NOTIFICATIONS ====================
  
  /**
   * Get client notifications
   */
  static async getNotifications(limit = 50) {
    try {
      const authResult = await this.verifyClientAuth();
      if (!authResult.success) return authResult;

      const { user } = authResult.data;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ==================== UTILITY FUNCTIONS ====================
  
  /**
   * Log client activity for audit trail
   */
  static async logActivity(action, description) {
    try {
      const authResult = await this.verifyClientAuth();
      if (!authResult.success) return;

      const { user } = authResult.data;

      await supabase
        .from('activity_logs')
        .insert({
          user_id: user.id,
          action: action,
          description: description,
          ip_address: await this.getClientIP(),
          user_agent: navigator.userAgent
        });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }

  /**
   * Get client IP address
   */
  static async getClientIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      return 'unknown';
    }
  }
} 