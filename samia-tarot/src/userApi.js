import { supabase, authHelpers, profileHelpers, bookingHelpers, paymentHelpers } from '../lib/supabase.js';

// =====================================================
// USER MANAGEMENT API
// =====================================================

export class UserAPI {
  // =====================================================
  // AUTHENTICATION METHODS
  // =====================================================

  /**
   * Get current authenticated user
   */
  static async getCurrentUser() {
    try {
      const user = await authHelpers.getCurrentUser();
      if (user) {
        // Also fetch the profile data
        const { data: profile, error } = await profileHelpers.getProfile(user.id);
        return {
          success: true,
          data: {
            ...user,
            profile: profile || null
          },
          error: null
        };
      }
      return {
        success: false,
        data: null,
        error: 'No authenticated user found'
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }

  /**
   * Get current session
   */
  static async getCurrentSession() {
    try {
      const session = await authHelpers.getCurrentSession();
      return {
        success: true,
        data: session,
        error: null
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }

  /**
   * Sign out user
   */
  static async signOut() {
    try {
      const { error } = await authHelpers.signOut();
      if (error) throw error;
      
      return {
        success: true,
        data: null,
        error: null
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }

  // =====================================================
  // PROFILE MANAGEMENT METHODS
  // =====================================================

  /**
   * Get user profile by ID
   */
  static async getProfile(userId) {
    try {
      const { data, error } = await profileHelpers.getProfile(userId);
      if (error) throw error;

      return {
        success: true,
        data,
        error: null
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId, updates) {
    try {
      // Validate required fields
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Sanitize updates (remove any fields that shouldn't be updated directly)
      const allowedFields = [
        'first_name', 'last_name', 'dob', 'zodiac', 
        'country', 'country_code', 'phone', 'profile_picture'
      ];
      
      const sanitizedUpdates = {};
      Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key)) {
          sanitizedUpdates[key] = updates[key];
        }
      });

      const { data, error } = await profileHelpers.updateProfile(userId, sanitizedUpdates);
      if (error) throw error;

      return {
        success: true,
        data,
        error: null
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }

  /**
   * Create user profile (usually called after signup)
   */
  static async createProfile(profileData) {
    try {
      const { data, error } = await profileHelpers.createProfile(profileData);
      if (error) throw error;

      return {
        success: true,
        data,
        error: null
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }

  /**
   * Assign role to user (admin only)
   */
  static async assignRole(userId, role) {
    try {
      // Check if current user is admin
      const currentUser = await authHelpers.getCurrentUser();
      if (!currentUser) {
        throw new Error('Authentication required');
      }

      const { data: currentProfile } = await profileHelpers.getProfile(currentUser.id);
      if (!currentProfile || currentProfile.role !== 'admin') {
        throw new Error('Admin privileges required');
      }

      // Validate role
      const validRoles = ['client', 'reader', 'admin', 'monitor'];
      if (!validRoles.includes(role)) {
        throw new Error('Invalid role specified');
      }

      const { data, error } = await profileHelpers.updateProfile(userId, { role });
      if (error) throw error;

      return {
        success: true,
        data,
        error: null
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }

  // =====================================================
  // BOOKING MANAGEMENT METHODS
  // =====================================================

  /**
   * Get user bookings
   */
  static async getUserBookings(userId) {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          service:services(*),
          reader:profiles!bookings_reader_id_fkey(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error fetching user bookings:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get reader bookings
   */
  static async getReaderBookings(readerId) {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          service:services(*),
          profiles!bookings_user_id_fkey(first_name, last_name, avatar_url, phone)
        `)
        .eq('reader_id', readerId)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error fetching reader bookings:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create new booking
   */
  static async createBooking(bookingData) {
    try {
      // Validate required fields
      const requiredFields = ['user_id', 'service_id'];
      for (const field of requiredFields) {
        if (!bookingData[field]) {
          throw new Error(`${field} is required`);
        }
      }

      // Verify the service exists and is active
      const { data: service, error: serviceError } = await supabase
        .from('services')
        .select('*')
        .eq('id', bookingData.service_id)
        .eq('is_active', true)
        .single();

      if (serviceError || !service) {
        throw new Error('Service not found or inactive');
      }

      // Set reader_id from service if not provided
      if (!bookingData.reader_id && service.reader_id) {
        bookingData.reader_id = service.reader_id;
      }

      const { data, error } = await bookingHelpers.createBooking(bookingData);
      if (error) throw error;

      return {
        success: true,
        data,
        error: null
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }

  /**
   * Update booking status
   */
  static async updateBookingStatus(bookingId, status) {
    try {
      const validStatuses = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        throw new Error('Invalid status');
      }

      const { data, error } = await bookingHelpers.updateBookingStatus(bookingId, status);
      if (error) throw error;

      return {
        success: true,
        data,
        error: null
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }

  // =====================================================
  // PAYMENT MANAGEMENT METHODS
  // =====================================================

  /**
   * Create payment record
   */
  static async createPayment(paymentData) {
    try {
      // Validate required fields
      const requiredFields = ['booking_id', 'user_id', 'method', 'amount'];
      for (const field of requiredFields) {
        if (!paymentData[field]) {
          throw new Error(`${field} is required`);
        }
      }

      // Validate payment method
      const validMethods = ['stripe', 'square', 'usdt', 'western_union', 'moneygram', 'ria', 'omt', 'whish', 'bob', 'wallet'];
      if (!validMethods.includes(paymentData.method)) {
        throw new Error('Invalid payment method');
      }

      const { data, error } = await paymentHelpers.createPayment(paymentData);
      if (error) throw error;

      return {
        success: true,
        data,
        error: null
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }

  /**
   * Get user payments
   */
  static async getUserPayments(userId) {
    try {
      const { data, error } = await paymentHelpers.getUserPayments(userId);
      if (error) throw error;

      return {
        success: true,
        data,
        error: null
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  /**
   * Upload profile picture
   */
  static async uploadProfilePicture(userId, file) {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/profile.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, file, {
          upsert: true
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName);

      // Update profile with new picture URL
      await this.updateProfile(userId, { profile_picture: publicUrl });

      return {
        success: true,
        data: { url: publicUrl },
        error: null
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }

  /**
   * Get user statistics
   */
  static async getUserStats(userId) {
    try {
      // Get booking counts by status
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('status')
        .eq('user_id', userId);

      if (bookingsError) throw bookingsError;

      // Get total payments
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount, status')
        .eq('user_id', userId);

      if (paymentsError) throw paymentsError;

      // Calculate statistics
      const stats = {
        totalBookings: bookings.length,
        completedBookings: bookings.filter(b => b.status === 'completed').length,
        pendingBookings: bookings.filter(b => b.status === 'pending').length,
        totalSpent: payments
          .filter(p => p.status === 'completed')
          .reduce((sum, p) => sum + parseFloat(p.amount), 0),
        totalPayments: payments.length
      };

      return {
        success: true,
        data: stats,
        error: null
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }

  /**
   * Search users (admin only)
   */
  static async searchUsers(query, filters = {}) {
    try {
      // Check if current user is admin
      const currentUser = await authHelpers.getCurrentUser();
      if (!currentUser) {
        throw new Error('Authentication required');
      }

      const { data: currentProfile } = await profileHelpers.getProfile(currentUser.id);
      if (!currentProfile || currentProfile.role !== 'admin') {
        throw new Error('Admin privileges required');
      }

      let queryBuilder = supabase
        .from('profiles')
        .select('*');

      // Apply search query
      if (query) {
        queryBuilder = queryBuilder.or(
          `first_name.ilike.%${query}%,last_name.ilike.%${query}%,phone.ilike.%${query}%`
        );
      }

      // Apply filters
      if (filters.role) {
        queryBuilder = queryBuilder.eq('role', filters.role);
      }
      if (filters.country) {
        queryBuilder = queryBuilder.eq('country', filters.country);
      }
      if (filters.is_active !== undefined) {
        queryBuilder = queryBuilder.eq('is_active', filters.is_active);
      }

      const { data, error } = await queryBuilder
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      return {
        success: true,
        data,
        error: null
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }
}

export default UserAPI; 