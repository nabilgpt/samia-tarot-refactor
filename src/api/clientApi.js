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
   * Get client bookings with filters
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
          services (
            name,
            name_ar,
            price,
            duration
          ),
          readers:reader_id (
            profiles (
              first_name,
              last_name,
              avatar_url
            )
          )
        `)
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.from_date) {
        query = query.gte('scheduled_at', filters.from_date);
      }

      if (filters.to_date) {
        query = query.lte('scheduled_at', filters.to_date);
      }

      const { data, error } = await query;
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

      // Check wallet balance
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (!wallet || wallet.balance < bookingData.total_amount) {
        return { success: false, error: 'Insufficient wallet balance' };
      }

      // Create booking
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          client_id: user.id,
          reader_id: bookingData.reader_id,
          service_id: bookingData.service_id,
          scheduled_at: bookingData.scheduled_at,
          duration: bookingData.duration,
          total_amount: bookingData.total_amount,
          status: 'pending',
          payment_status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      await this.logActivity('booking_created', `New booking created: ${data.id}`);

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Cancel a booking
   */
  static async cancelBooking(bookingId, reason) {
    try {
      const authResult = await this.verifyClientAuth();
      if (!authResult.success) return authResult;

      const { user } = authResult.data;

      // Verify booking ownership
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .eq('client_id', user.id)
        .single();

      if (bookingError || !booking) {
        return { success: false, error: 'Booking not found' };
      }

      if (!['pending', 'confirmed'].includes(booking.status)) {
        return { success: false, error: 'Booking cannot be cancelled' };
      }

      // Update booking status
      const { data, error } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          cancellation_reason: reason,
          cancelled_at: new Date().toISOString()
        })
        .eq('id', bookingId)
        .select()
        .single();

      if (error) throw error;

      // Process refund if payment was made
      if (booking.payment_status === 'paid') {
        await this.processRefund(booking.total_amount, user.id, `Booking cancellation: ${bookingId}`);
      }

      await this.logActivity('booking_cancelled', `Booking cancelled: ${bookingId}`);

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Reschedule a booking
   */
  static async rescheduleBooking(bookingId, newDateTime) {
    try {
      const authResult = await this.verifyClientAuth();
      if (!authResult.success) return authResult;

      const { user } = authResult.data;

      const { data, error } = await supabase
        .from('bookings')
        .update({
          scheduled_at: newDateTime,
          status: 'pending', // Reset to pending for reader confirmation
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)
        .eq('client_id', user.id)
        .select()
        .single();

      if (error) throw error;

      await this.logActivity('booking_rescheduled', `Booking rescheduled: ${bookingId}`);

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ==================== WALLET & PAYMENTS ====================
  
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
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (filters.type) {
        query = query.eq('type', filters.type);
      }

      if (filters.from_date) {
        query = query.gte('created_at', filters.from_date);
      }

      if (filters.to_date) {
        query = query.lte('created_at', filters.to_date);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Add funds to wallet
   */
  static async addFunds(amount, paymentMethod) {
    try {
      const authResult = await this.verifyClientAuth();
      if (!authResult.success) return authResult;

      const { user } = authResult.data;

      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: 'deposit',
          amount: amount,
          status: 'pending',
          payment_method: paymentMethod,
          description: `Wallet top-up via ${paymentMethod}`,
          description_ar: `شحن المحفظة عبر ${paymentMethod}`,
          reference: `DEP_${Date.now()}`
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Generate payment URL based on method
      let paymentUrl;
      switch (paymentMethod) {
        case 'stripe':
          paymentUrl = `${process.env.REACT_APP_PAYMENT_URL}/stripe?amount=${amount}&transaction_id=${payment.id}`;
          break;
        case 'square':
          paymentUrl = `${process.env.REACT_APP_PAYMENT_URL}/square?amount=${amount}&transaction_id=${payment.id}`;
          break;
        case 'usdt':
          paymentUrl = `${process.env.REACT_APP_PAYMENT_URL}/crypto?amount=${amount}&transaction_id=${payment.id}`;
          break;
        default:
          paymentUrl = `${process.env.REACT_APP_PAYMENT_URL}/default?amount=${amount}&transaction_id=${payment.id}`;
      }

      await this.logActivity('payment_initiated', `Payment initiated: ${payment.reference}`);

      return { success: true, data: { payment_url: paymentUrl, transaction_id: payment.id } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Request refund
   */
  static async requestRefund(bookingId, reason) {
    try {
      const authResult = await this.verifyClientAuth();
      if (!authResult.success) return authResult;

      const { user } = authResult.data;

      // Verify booking and payment
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .eq('client_id', user.id)
        .single();

      if (bookingError || !booking) {
        return { success: false, error: 'Booking not found' };
      }

      if (booking.payment_status !== 'paid') {
        return { success: false, error: 'No payment found for this booking' };
      }

      // Create refund request
      const { data, error } = await supabase
        .from('refund_requests')
        .insert({
          user_id: user.id,
          booking_id: bookingId,
          amount: booking.total_amount,
          reason: reason,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      await this.logActivity('refund_requested', `Refund requested for booking: ${bookingId}`);

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Export transactions to CSV
   */
  static async exportTransactions() {
    try {
      const authResult = await this.verifyClientAuth();
      if (!authResult.success) return authResult;

      const transactionsResult = await this.getTransactions();
      if (!transactionsResult.success) return transactionsResult;

      // In a real implementation, this would generate a CSV file
      // For now, we'll return a mock download URL
      const downloadUrl = `${process.env.REACT_APP_API_URL}/export/transactions/${authResult.data.user.id}`;

      return { success: true, data: { download_url: downloadUrl } };
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
        .update({ read: true, read_at: new Date().toISOString() })
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

  /**
   * Mark all notifications as read
   */
  static async markAllNotificationsRead() {
    try {
      const authResult = await this.verifyClientAuth();
      if (!authResult.success) return authResult;

      const { user } = authResult.data;

      const { data, error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ==================== MESSAGES & CHAT ====================
  
  /**
   * Get messages for a specific booking/session
   */
  static async getMessages(bookingId) {
    try {
      const authResult = await this.verifyClientAuth();
      if (!authResult.success) return authResult;

      const { user } = authResult.data;

      // Verify booking ownership
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
          sender:sender_id (
            profiles (
              first_name,
              last_name,
              avatar_url
            )
          )
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
   * Send a message in a session
   */
  static async sendMessage(bookingId, message, messageType = 'text') {
    try {
      const authResult = await this.verifyClientAuth();
      if (!authResult.success) return authResult;

      const { user } = authResult.data;

      // Verify booking is active
      const { data: booking } = await supabase
        .from('bookings')
        .select('status, scheduled_at, duration')
        .eq('id', bookingId)
        .eq('client_id', user.id)
        .single();

      if (!booking) {
        return { success: false, error: 'Booking not found' };
      }

      // Check if session is active
      const now = new Date();
      const sessionStart = new Date(booking.scheduled_at);
      const sessionEnd = new Date(sessionStart.getTime() + (booking.duration || 30) * 60000);

      if (now < sessionStart || now > sessionEnd || booking.status !== 'confirmed') {
        return { success: false, error: 'Session is not active' };
      }

      const { data, error } = await supabase
        .from('messages')
        .insert({
          booking_id: bookingId,
          sender_id: user.id,
          message: message,
          message_type: messageType
        })
        .select()
        .single();

      if (error) throw error;

      await this.logActivity('message_sent', `Message sent in booking: ${bookingId}`);

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ==================== FEEDBACK & REVIEWS ====================
  
  /**
   * Get client's reviews
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
          bookings (
            services (
              name,
              name_ar
            ),
            readers:reader_id (
              profiles (
                first_name,
                last_name,
                avatar_url
              )
            )
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

      // Check if review already exists
      const { data: existingReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('booking_id', bookingId)
        .eq('client_id', user.id)
        .single();

      if (existingReview) {
        return { success: false, error: 'Review already submitted for this booking' };
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

  // ==================== SUPPORT ====================
  
  /**
   * Get support tickets
   */
  static async getSupportTickets() {
    try {
      const authResult = await this.verifyClientAuth();
      if (!authResult.success) return authResult;

      const { user } = authResult.data;

      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a support ticket
   */
  static async createSupportTicket(subject, message, category = 'general') {
    try {
      const authResult = await this.verifyClientAuth();
      if (!authResult.success) return authResult;

      const { user } = authResult.data;

      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          subject: subject,
          message: message,
          category: category,
          status: 'open',
          priority: 'normal'
        })
        .select()
        .single();

      if (error) throw error;

      await this.logActivity('support_ticket_created', `Support ticket created: ${data.id}`);

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

  /**
   * Process refund to wallet
   */
  static async processRefund(amount, userId, description) {
    try {
      // Add refund transaction
      await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          type: 'refund',
          amount: amount,
          status: 'completed',
          description: description,
          description_ar: `استرداد: ${description}`,
          reference: `REF_${Date.now()}`
        });

      // Update wallet balance
      await supabase.rpc('update_wallet_balance', {
        user_id: userId,
        amount: amount
      });

      return { success: true };
    } catch (error) {
      console.error('Error processing refund:', error);
      return { success: false, error: error.message };
    }
  }
}

export default ClientAPI; 