import { supabase } from '../lib/supabase';

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

  /**
   * Upload and update profile avatar
   */
  static async uploadAvatar(file) {
    try {
      const authResult = await this.verifyClientAuth();
      if (!authResult.success) return authResult;

      const { user } = authResult.data;
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      const { data, error } = await supabase
        .from('profiles')
        .update({ 
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      await this.logActivity('avatar_update', 'Profile avatar updated');

      return { success: true, data: { avatar_url: publicUrl } };
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

  /**
   * Create a new booking
   */
  static async createBooking(bookingData) {
    try {
      const authResult = await this.verifyClientAuth();
      if (!authResult.success) return authResult;

      const { user } = authResult.data;

      // Verify wallet has sufficient funds
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (!wallet || wallet.balance < bookingData.price) {
        return { success: false, error: 'Insufficient wallet balance' };
      }

      const { data, error } = await supabase
        .from('bookings')
        .insert({
          client_id: user.id,
          reader_id: bookingData.reader_id,
          service_id: bookingData.service_id,
          session_datetime: bookingData.session_datetime,
          duration: bookingData.duration,
          price: bookingData.price,
          notes: bookingData.notes,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      await this.logActivity('booking_created', `Booking created: ${data.id}`);

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

  /**
   * Get transaction history
   */
  static async getTransactions(filters = {}) {
    try {
      const authResult = await this.verifyClientAuth();
      if (!authResult.success) return authResult;

      const { user } = authResult.data;

      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id);

      if (filters.type) {
        query = query.eq('type', filters.type);
      }

      if (filters.from_date) {
        query = query.gte('created_at', filters.from_date);
      }

      if (filters.to_date) {
        query = query.lte('created_at', filters.to_date);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

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

  /**
   * Mark notification as read
   */
  static async markNotificationRead(notificationId) {
    try {
      const authResult = await this.verifyClientAuth();
      if (!authResult.success) return authResult;

      const { user } = authResult.data;

      const { data, error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ==================== MESSAGING ====================
  
  /**
   * Get messages for a booking
   */
  static async getMessages(bookingId) {
    try {
      const authResult = await this.verifyClientAuth();
      if (!authResult.success) return authResult;

      const { user } = authResult.data;

      // Verify booking belongs to client
      const { data: booking } = await supabase
        .from('bookings')
        .select('id')
        .eq('id', bookingId)
        .eq('client_id', user.id)
        .single();

      if (!booking) {
        return { success: false, error: 'Booking not found' };
      }

      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles(id, first_name, last_name, avatar_url)
        `)
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Send a message
   */
  static async sendMessage(bookingId, message, messageType = 'text') {
    try {
      const authResult = await this.verifyClientAuth();
      if (!authResult.success) return authResult;

      const { user } = authResult.data;

      const { data, error } = await supabase
        .from('messages')
        .insert({
          booking_id: bookingId,
          sender_id: user.id,
          content: message,
          message_type: messageType
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ==================== REVIEWS ====================
  
  /**
   * Get client reviews
   */
  static async getReviews() {
    try {
      const authResult = await this.verifyClientAuth();
      if (!authResult.success) return authResult;

      const { user } = authResult.data;

      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          booking:bookings(
            id, session_datetime,
            service:services(name, name_ar)
          ),
          reader:profiles!reader_id(
            id, first_name, last_name, avatar_url
          )
        `)
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Submit a review for a completed booking
   */
  static async submitReview(bookingId, rating, comment) {
    try {
      const authResult = await this.verifyClientAuth();
      if (!authResult.success) return authResult;

      const { user } = authResult.data;

      // Verify booking is completed and owned by client
      const { data: booking } = await supabase
        .from('bookings')
        .select('status, reader_id')
        .eq('id', bookingId)
        .eq('client_id', user.id)
        .single();

      if (!booking) {
        return { success: false, error: 'Booking not found' };
      }

      if (booking.status !== 'completed') {
        return { success: false, error: 'Can only review completed bookings' };
      }

      const { data, error } = await supabase
        .from('reviews')
        .insert({
          booking_id: bookingId,
          client_id: user.id,
          reader_id: booking.reader_id,
          rating: rating,
          comment: comment
        })
        .select()
        .single();

      if (error) throw error;

      await this.logActivity('review_submitted', `Review submitted for booking: ${bookingId}`);

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