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

  /**
   * Login user with email and password
   */
  static async login(email, password) {
    try {
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (error) throw error;

      return {
        success: true,
        data: data,
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
   * Sign up user with email and password
   */
  static async signUp(email, password, userData = {}) {
    try {
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: userData
        }
      });

      if (error) throw error;

      return {
        success: true,
        data: data,
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
        'country', 'country_code', 'phone', 'profile_picture', 'maritalStatus',
        // Reader-specific fields
        'bio', 'experience_years', 'specializations', 'languages', 'status',
        'date_of_birth' // Alternative field name
      ];
      
      const sanitizedUpdates = {};
      Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key)) {
          sanitizedUpdates[key] = updates[key];
        }
      });

      // Handle date_of_birth field mapping
      if (sanitizedUpdates.date_of_birth && !sanitizedUpdates.dob) {
        sanitizedUpdates.dob = sanitizedUpdates.date_of_birth;
        delete sanitizedUpdates.date_of_birth;
      }

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
      const requiredFields = ['user_id', 'method', 'amount'];
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

  /**
   * Update payment status (admin/monitor only)
   */
  static async updatePaymentStatus(paymentId, status, adminNotes = '') {
    try {
      // Check if current user is admin/monitor
      const currentUser = await authHelpers.getCurrentUser();
      if (!currentUser) {
        throw new Error('Authentication required');
      }

      const { data: currentProfile } = await profileHelpers.getProfile(currentUser.id);
      if (!currentProfile || !['admin', 'monitor'].includes(currentProfile.role)) {
        throw new Error('Admin/Monitor privileges required');
      }

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
   * Upload payment receipt
   */
  static async uploadPaymentReceipt(paymentId, file) {
    try {
      const currentUser = await authHelpers.getCurrentUser();
      if (!currentUser) {
        throw new Error('Authentication required');
      }

      // Upload file to Supabase storage
      const fileExt = file.name.split('.').pop();
      const fileName = `receipts/${paymentId}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipt-uploads')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('receipt-uploads')
        .getPublicUrl(fileName);

      // Create receipt upload record
      const { data, error } = await supabase
        .from('receipt_uploads')
        .insert({
          payment_id: paymentId,
          user_id: currentUser.id,
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size
        })
        .select()
        .single();

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
  // WALLET MANAGEMENT METHODS
  // =====================================================

  /**
   * Get user wallet
   */
  static async getUserWallet(userId) {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .single();

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
   * Get wallet transactions
   */
  static async getWalletTransactions(userId, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

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
   * Process wallet payment
   */
  static async processWalletPayment(userId, amount, bookingId, description = '') {
    try {
      // Get user wallet
      const walletResult = await this.getUserWallet(userId);
      if (!walletResult.success) {
        throw new Error('Failed to get wallet information');
      }

      const wallet = walletResult.data;
      if (wallet.balance < amount) {
        throw new Error('Insufficient wallet balance');
      }

      // Calculate new balance
      const newBalance = parseFloat(wallet.balance) - parseFloat(amount);

      // Start transaction
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          wallet_id: wallet.id,
          user_id: userId,
          type: 'debit',
          amount: amount,
          balance_before: wallet.balance,
          balance_after: newBalance,
          reference_id: bookingId,
          reference_type: 'booking',
          description: description || `Payment for booking ${bookingId}`
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Update wallet balance
      const { error: walletError } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('id', wallet.id);

      if (walletError) throw walletError;

      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          booking_id: bookingId,
          user_id: userId,
          amount: amount,
          method: 'wallet',
          status: 'completed',
          transaction_id: transaction.id
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      return {
        success: true,
        data: {
          payment,
          transaction,
          newBalance
        },
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
   * Add funds to wallet (admin only)
   */
  static async addWalletFunds(userId, amount, description = '', adminId) {
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

      // Get user wallet
      const walletResult = await this.getUserWallet(userId);
      if (!walletResult.success) {
        throw new Error('Failed to get wallet information');
      }

      const wallet = walletResult.data;
      const newBalance = parseFloat(wallet.balance) + parseFloat(amount);

      // Create transaction record
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          wallet_id: wallet.id,
          user_id: userId,
          type: 'credit',
          amount: amount,
          balance_before: wallet.balance,
          balance_after: newBalance,
          reference_type: 'admin_adjustment',
          description: description || `Admin credit by ${currentProfile.first_name} ${currentProfile.last_name}`
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Update wallet balance
      const { error: walletError } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('id', wallet.id);

      if (walletError) throw walletError;

      return {
        success: true,
        data: {
          transaction,
          newBalance
        },
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
   * Get pending payments (admin/monitor only)
   */
  static async getPendingPayments() {
    try {
      // Check if current user is admin/monitor
      const currentUser = await authHelpers.getCurrentUser();
      if (!currentUser) {
        throw new Error('Authentication required');
      }

      const { data: currentProfile } = await profileHelpers.getProfile(currentUser.id);
      if (!currentProfile || !['admin', 'monitor'].includes(currentProfile.role)) {
        throw new Error('Admin/Monitor privileges required');
      }

      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          profiles:user_id (first_name, last_name, phone),
          bookings:booking_id (service_id, scheduled_at),
          receipt_uploads (*)
        `)
        .in('status', ['pending', 'awaiting_approval'])
        .order('created_at', { ascending: false });

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
   * Search users with filters
   */
  static async searchUsers(query, filters = {}) {
    try {
      let baseQuery = supabase
        .from('profiles')
        .select('*');

      // Apply text search if query provided
      if (query && query.trim()) {
        baseQuery = baseQuery.or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`);
      }

      // Apply role filter
      if (filters.role) {
        baseQuery = baseQuery.eq('role', filters.role);
      }

      // Apply country filter
      if (filters.country) {
        baseQuery = baseQuery.eq('country', filters.country);
      }

      // Apply date range filter
      if (filters.created_after) {
        baseQuery = baseQuery.gte('created_at', filters.created_after);
      }
      if (filters.created_before) {
        baseQuery = baseQuery.lte('created_at', filters.created_before);
      }

      // Order results
      const orderBy = filters.order_by || 'created_at';
      const ascending = filters.ascending !== false;
      baseQuery = baseQuery.order(orderBy, { ascending });

      // Apply limit
      const limit = Math.min(filters.limit || 50, 100); // Max 100 results
      baseQuery = baseQuery.limit(limit);

      const { data, error } = await baseQuery;
      if (error) throw error;

      return {
        success: true,
        data: data || [],
        error: null
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        error: error.message
      };
    }
  }

  // =====================================================
  // SERVICE MANAGEMENT METHODS (For Readers)
  // =====================================================

  /**
   * Get reader's services
   */
  static async getReaderServices(readerId) {
    try {
      if (!readerId) {
        throw new Error('Reader ID is required');
      }

      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('reader_id', readerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        error: null
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        error: error.message
      };
    }
  }

  /**
   * Create a new service for a reader
   */
  static async createService(serviceData) {
    try {
      // Validate required fields
      const requiredFields = ['reader_id', 'name', 'type', 'price', 'duration'];
      for (const field of requiredFields) {
        if (!serviceData[field]) {
          throw new Error(`${field} is required`);
        }
      }

      // Validate service type
      const validTypes = ['tarot', 'astrology', 'numerology', 'palmistry', 'dream_interpretation', 'spiritual_guidance'];
      if (!validTypes.includes(serviceData.type)) {
        throw new Error('Invalid service type');
      }

      // Validate price and duration
      if (isNaN(serviceData.price) || serviceData.price <= 0) {
        throw new Error('Price must be a positive number');
      }
      if (isNaN(serviceData.duration) || serviceData.duration <= 0) {
        throw new Error('Duration must be a positive number');
      }

      // Set default values
      const servicePayload = {
        ...serviceData,
        is_active: serviceData.is_active !== undefined ? serviceData.is_active : true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('services')
        .insert(servicePayload)
        .select()
        .single();

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
   * Update a service
   */
  static async updateService(serviceId, updates) {
    try {
      if (!serviceId) {
        throw new Error('Service ID is required');
      }

      // Validate allowed fields
      const allowedFields = ['name', 'type', 'description', 'price', 'duration', 'is_active'];
      const sanitizedUpdates = {};
      
      Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key)) {
          sanitizedUpdates[key] = updates[key];
        }
      });

      // Validate price and duration if provided
      if (sanitizedUpdates.price !== undefined) {
        if (isNaN(sanitizedUpdates.price) || sanitizedUpdates.price <= 0) {
          throw new Error('Price must be a positive number');
        }
      }
      if (sanitizedUpdates.duration !== undefined) {
        if (isNaN(sanitizedUpdates.duration) || sanitizedUpdates.duration <= 0) {
          throw new Error('Duration must be a positive number');
        }
      }

      // Validate service type if provided
      if (sanitizedUpdates.type) {
        const validTypes = ['tarot', 'astrology', 'numerology', 'palmistry', 'dream_interpretation', 'spiritual_guidance'];
        if (!validTypes.includes(sanitizedUpdates.type)) {
          throw new Error('Invalid service type');
        }
      }

      sanitizedUpdates.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('services')
        .update(sanitizedUpdates)
        .eq('id', serviceId)
        .select()
        .single();

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
   * Delete a service
   */
  static async deleteService(serviceId) {
    try {
      if (!serviceId) {
        throw new Error('Service ID is required');
      }

      // Check if service has any active bookings
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id')
        .eq('service_id', serviceId)
        .in('status', ['pending', 'confirmed', 'in_progress']);

      if (bookingsError) throw bookingsError;

      if (bookings && bookings.length > 0) {
        throw new Error('Cannot delete service with active bookings');
      }

      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId);

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

  /**
   * Toggle service status (active/inactive)
   */
  static async toggleServiceStatus(serviceId, isActive) {
    try {
      if (!serviceId) {
        throw new Error('Service ID is required');
      }

      const { data, error } = await supabase
        .from('services')
        .update({ 
          is_active: !isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', serviceId)
        .select()
        .single();

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
  // MESSAGE MANAGEMENT METHODS
  // =====================================================

  /**
   * Get messages for a booking
   */
  static async getBookingMessages(bookingId) {
    try {
      if (!bookingId) {
        throw new Error('Booking ID is required');
      }

      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(first_name, last_name, avatar_url)
        `)
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        error: null
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        error: error.message
      };
    }
  }

  /**
   * Send a message in a booking conversation
   */
  static async sendMessage(messageData) {
    try {
      // Validate required fields
      const requiredFields = ['booking_id', 'sender_id', 'content'];
      for (const field of requiredFields) {
        if (!messageData[field]) {
          throw new Error(`${field} is required`);
        }
      }

      // Set default message type
      const messagePayload = {
        ...messageData,
        message_type: messageData.message_type || 'text',
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('messages')
        .insert(messagePayload)
        .select()
        .single();

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
   * Get active conversations for a reader
   */
  static async getReaderActiveConversations(readerId) {
    try {
      if (!readerId) {
        throw new Error('Reader ID is required');
      }

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          service:services(*),
          profiles!bookings_user_id_fkey(first_name, last_name, avatar_url),
          messages!messages_booking_id_fkey(*)
        `)
        .eq('reader_id', readerId)
        .in('status', ['in_progress', 'confirmed'])
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Filter only those with messages or active sessions
      const activeConversations = (data || []).filter(booking => 
        booking.messages?.length > 0 || 
        booking.status === 'in_progress' ||
        (booking.status === 'confirmed' && this.isSessionTime(booking))
      );

      return {
        success: true,
        data: activeConversations,
        error: null
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        error: error.message
      };
    }
  }

  /**
   * Helper method to check if booking is in session time
   */
  static isSessionTime(booking) {
    if (!booking.scheduled_at) return false;
    
    const now = new Date();
    const scheduledTime = new Date(booking.scheduled_at);
    const sessionEnd = new Date(scheduledTime.getTime() + (booking.service?.duration || 30) * 60000);
    
    return now >= scheduledTime && now <= sessionEnd;
  }

  // =====================================================
  // STATISTICS METHODS
  // =====================================================

  /**
   * Get reader dashboard statistics
   */
  static async getReaderStats(readerId) {
    try {
      if (!readerId) {
        throw new Error('Reader ID is required');
      }

      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

      // Get today's bookings
      const { data: todayBookings, error: todayError } = await supabase
        .from('bookings')
        .select('id')
        .eq('reader_id', readerId)
        .gte('scheduled_at', todayStart.toISOString())
        .lt('scheduled_at', todayEnd.toISOString());

      if (todayError) throw todayError;

      // Get completed sessions
      const { data: completedSessions, error: completedError } = await supabase
        .from('bookings')
        .select('id')
        .eq('reader_id', readerId)
        .eq('status', 'completed');

      if (completedError) throw completedError;

      // Get active services
      const { data: activeServices, error: servicesError } = await supabase
        .from('services')
        .select('id')
        .eq('reader_id', readerId)
        .eq('is_active', true);

      if (servicesError) throw servicesError;

      // Get active chats (bookings with recent messages)
      const { data: activeChats, error: chatsError } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          scheduled_at,
          service:services(duration),
          messages!messages_booking_id_fkey(id, created_at)
        `)
        .eq('reader_id', readerId)
        .in('status', ['in_progress', 'confirmed']);

      if (chatsError) throw chatsError;

      const activeChatCount = (activeChats || []).filter(booking => 
        booking.messages?.length > 0 || 
        booking.status === 'in_progress' ||
        this.isSessionTime(booking)
      ).length;

      return {
        success: true,
        data: {
          todayBookings: todayBookings?.length || 0,
          completedSessions: completedSessions?.length || 0,
          activeServices: activeServices?.length || 0,
          activeChats: activeChatCount
        },
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