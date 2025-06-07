// =============================================================================
// ADMIN SERVICE - خدمات الإدارة
// =============================================================================
// Data access layer for admin operations

const { supabaseAdmin: supabase } = require('../lib/supabase.js');

// =============================================================================
// USER MANAGEMENT SERVICES
// =============================================================================

/**
 * Get all users with filtering and pagination
 * @param {Object} options - Query options
 * @returns {Object} Users data with pagination
 */
const getAllUsers = async (options) => {
  const { page, limit, role, status, search, sort_by, sort_order } = options;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('profiles')
    .select(`
      id,
      first_name,
      last_name,
      email,
      phone,
      role,
      is_active,
      avatar_url,
      country,
      timezone,
      languages,
      bio,
      specialties,
      created_at,
      updated_at,
      last_seen
    `, { count: 'exact' })
    .order(sort_by, { ascending: sort_order === 'asc' })
    .range(offset, offset + limit - 1);

  // Apply filters
  if (role) query = query.eq('role', role);
  if (status === 'active') query = query.eq('is_active', true);
  if (status === 'inactive') query = query.eq('is_active', false);
  if (search) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) throw error;

  // Get additional statistics for each user
  const userIds = data.map(user => user.id);
  
  // Get booking counts
  const { data: bookingCounts } = await supabase
    .from('bookings')
    .select('user_id')
    .in('user_id', userIds);

  // Get payment totals
  const { data: paymentTotals } = await supabase
    .from('payments')
    .select('user_id, amount')
    .eq('status', 'completed')
    .in('user_id', userIds);

  // Enhance user data with statistics
  const enhancedData = data.map(user => {
    const userBookings = bookingCounts?.filter(b => b.user_id === user.id) || [];
    const userPayments = paymentTotals?.filter(p => p.user_id === user.id) || [];
    const totalSpent = userPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

    return {
      ...user,
      statistics: {
        total_bookings: userBookings.length,
        total_spent: totalSpent,
        last_booking: null // Can be enhanced later
      }
    };
  });

  return {
    data: enhancedData,
    pagination: {
      page,
      limit,
      total: count,
      pages: Math.ceil(count / limit)
    }
  };
};

/**
 * Update user profile
 * @param {string} userId - User ID
 * @param {Object} updateData - Data to update
 * @returns {Object} Updated user data
 */
const updateUserProfile = async (userId, updateData) => {
  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Change user role
 * @param {string} userId - User ID
 * @param {string} newRole - New role
 * @returns {Object} Updated user data
 */
const changeUserRole = async (userId, newRole) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ 
      role: newRole,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;

  // If promoting to admin, create admin_users entry
  if (['admin', 'super_admin'].includes(newRole)) {
    await supabase
      .from('admin_users')
      .upsert({
        user_id: userId,
        admin_level: newRole,
        is_active: true,
        created_at: new Date().toISOString()
      });
  }

  return data;
};

/**
 * Disable user account (soft delete)
 * @param {string} userId - User ID
 * @param {string} reason - Reason for disabling
 * @returns {Object} Updated user data
 */
const disableUserAccount = async (userId, reason) => {
  // Start transaction
  const { data, error } = await supabase
    .from('profiles')
    .update({ 
      is_active: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;

  // Cancel active bookings
  await supabase
    .from('bookings')
    .update({ 
      status: 'cancelled',
      notes: `Account disabled: ${reason}`,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .in('status', ['pending', 'confirmed']);

  // Log the action in admin_actions
  await supabase
    .from('admin_actions')
    .insert({
      admin_id: userId,
      action_type: 'DISABLE_ACCOUNT',
      target_type: 'user',
      target_id: userId,
      action_details: { reason },
      created_at: new Date().toISOString()
    });

  return data;
};

// =============================================================================
// BOOKING MANAGEMENT SERVICES
// =============================================================================

/**
 * Get all bookings with filtering
 * @param {Object} options - Query options
 * @returns {Object} Bookings data with pagination
 */
const getAllBookings = async (options) => {
  const { page, limit, status, date_from, date_to, reader_id, client_id, service_type } = options;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('bookings')
    .select(`
      id,
      user_id,
      reader_id,
      service_id,
      scheduled_at,
      status,
      notes,
      is_emergency,
      created_at,
      updated_at,
      client:profiles!bookings_user_id_fkey(first_name, last_name, email),
      reader:profiles!bookings_reader_id_fkey(first_name, last_name, email),
      service:services(name, type, price, duration_minutes)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply filters
  if (status) query = query.eq('status', status);
  if (reader_id) query = query.eq('reader_id', reader_id);
  if (client_id) query = query.eq('user_id', client_id);
  if (date_from) query = query.gte('scheduled_at', date_from);
  if (date_to) query = query.lte('scheduled_at', date_to);

  const { data, error, count } = await query;

  if (error) throw error;

  // Filter by service type if specified
  let filteredData = data;
  if (service_type) {
    filteredData = data.filter(booking => booking.service?.type === service_type);
  }

  return {
    data: filteredData,
    pagination: {
      page,
      limit,
      total: count,
      pages: Math.ceil(count / limit)
    }
  };
};

/**
 * Update booking
 * @param {string} bookingId - Booking ID
 * @param {Object} updateData - Data to update
 * @returns {Object} Updated booking data
 */
const updateBooking = async (bookingId, updateData) => {
  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('bookings')
    .update(updateData)
    .eq('id', bookingId)
    .select(`
      *,
      client:profiles!bookings_user_id_fkey(first_name, last_name, email),
      reader:profiles!bookings_reader_id_fkey(first_name, last_name, email),
      service:services(name, type, price)
    `)
    .single();

  if (error) throw error;
  return data;
};

/**
 * Cancel booking
 * @param {string} bookingId - Booking ID
 * @param {string} reason - Cancellation reason
 * @returns {Object} Updated booking data
 */
const cancelBooking = async (bookingId, reason) => {
  const { data, error } = await supabase
    .from('bookings')
    .update({ 
      status: 'cancelled',
      notes: reason ? `Admin cancellation: ${reason}` : 'Cancelled by admin',
      updated_at: new Date().toISOString()
    })
    .eq('id', bookingId)
    .select()
    .single();

  if (error) throw error;

  // Process refund if payment exists
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('booking_id', bookingId)
    .eq('status', 'completed')
    .single();

  if (payment) {
    // Create refund record
    await supabase
      .from('payments')
      .insert({
        booking_id: bookingId,
        user_id: payment.user_id,
        amount: -Math.abs(payment.amount),
        currency: payment.currency,
        method: 'refund',
        status: 'completed',
        admin_notes: `Refund for cancelled booking: ${reason}`,
        created_at: new Date().toISOString()
      });
  }

  return data;
};

// =============================================================================
// PAYMENT MANAGEMENT SERVICES
// =============================================================================

/**
 * Get all payments with filtering
 * @param {Object} options - Query options
 * @returns {Object} Payments data with pagination and summary
 */
const getAllPayments = async (options) => {
  const { page, limit, method, status, user_id, date_from, date_to, amount_from, amount_to } = options;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('payments')
    .select(`
      id,
      booking_id,
      user_id,
      amount,
      currency,
      method,
      transaction_id,
      transaction_hash,
      receipt_url,
      status,
      admin_notes,
      metadata,
      created_at,
      updated_at,
      user:profiles!payments_user_id_fkey(first_name, last_name, email),
      booking:bookings(id, scheduled_at, service:services(name, type))
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply filters
  if (method) query = query.eq('method', method);
  if (status) query = query.eq('status', status);
  if (user_id) query = query.eq('user_id', user_id);
  if (date_from) query = query.gte('created_at', date_from);
  if (date_to) query = query.lte('created_at', date_to);
  if (amount_from) query = query.gte('amount', amount_from);
  if (amount_to) query = query.lte('amount', amount_to);

  const { data, error, count } = await query;

  if (error) throw error;

  // Calculate summary statistics
  const summary = {
    total_amount: data.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0),
    pending_amount: data.filter(p => p.status === 'pending').reduce((sum, p) => sum + parseFloat(p.amount || 0), 0),
    completed_amount: data.filter(p => p.status === 'completed').reduce((sum, p) => sum + parseFloat(p.amount || 0), 0),
    by_method: {},
    by_status: {}
  };

  // Group by method and status
  data.forEach(payment => {
    summary.by_method[payment.method] = (summary.by_method[payment.method] || 0) + parseFloat(payment.amount || 0);
    summary.by_status[payment.status] = (summary.by_status[payment.status] || 0) + parseFloat(payment.amount || 0);
  });

  return {
    data,
    pagination: {
      page,
      limit,
      total: count,
      pages: Math.ceil(count / limit)
    },
    summary
  };
};

/**
 * Approve payment
 * @param {string} paymentId - Payment ID
 * @param {string} adminNotes - Admin notes
 * @param {string} adminId - Admin user ID
 * @returns {Object} Updated payment data
 */
const approvePayment = async (paymentId, adminNotes, adminId) => {
  const { data, error } = await supabase
    .from('payments')
    .update({ 
      status: 'completed',
      admin_notes: adminNotes,
      updated_at: new Date().toISOString()
    })
    .eq('id', paymentId)
    .select()
    .single();

  if (error) throw error;

  // Update wallet balance if payment method is wallet
  if (data.method === 'wallet') {
    await supabase
      .from('wallet_transactions')
      .insert({
        user_id: data.user_id,
        transaction_type: 'credit',
        amount: data.amount,
        currency: data.currency,
        description: `Payment approved: ${adminNotes}`,
        status: 'completed',
        created_at: new Date().toISOString()
      });
  }

  return data;
};

/**
 * Reject payment
 * @param {string} paymentId - Payment ID
 * @param {string} adminNotes - Admin notes
 * @param {string} reason - Rejection reason
 * @param {string} adminId - Admin user ID
 * @returns {Object} Updated payment data
 */
const rejectPayment = async (paymentId, adminNotes, reason, adminId) => {
  const { data, error } = await supabase
    .from('payments')
    .update({ 
      status: 'failed',
      admin_notes: `${reason}. ${adminNotes || ''}`,
      updated_at: new Date().toISOString()
    })
    .eq('id', paymentId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// =============================================================================
// SERVICE MANAGEMENT SERVICES
// =============================================================================

/**
 * Get all services with filtering
 * @param {Object} options - Query options
 * @returns {Object} Services data with pagination
 */
const getAllServices = async (options) => {
  const { page, limit, type, is_active } = options;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('services')
    .select(`
      id,
      name,
      description,
      type,
      price,
      duration_minutes,
      is_vip,
      is_ai,
      is_active,
      created_by,
      created_at,
      updated_at
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply filters
  if (type) query = query.eq('type', type);
  if (is_active !== null) query = query.eq('is_active', is_active);

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    data,
    pagination: {
      page,
      limit,
      total: count,
      pages: Math.ceil(count / limit)
    }
  };
};

/**
 * Update service
 * @param {string} serviceId - Service ID
 * @param {Object} updateData - Data to update
 * @returns {Object} Updated service data
 */
const updateService = async (serviceId, updateData) => {
  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('services')
    .update(updateData)
    .eq('id', serviceId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// =============================================================================
// READER MANAGEMENT SERVICES
// =============================================================================

/**
 * Get all readers with statistics
 * @param {Object} options - Query options
 * @returns {Object} Readers data with pagination and summary
 */
const getAllReaders = async (options) => {
  const { page, limit, is_active, rating_min, rating_max, sort_by, sort_order } = options;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('profiles')
    .select(`
      id,
      first_name,
      last_name,
      email,
      phone,
      is_active,
      avatar_url,
      bio,
      specialties,
      languages,
      created_at,
      updated_at
    `, { count: 'exact' })
    .eq('role', 'reader')
    .order(sort_by, { ascending: sort_order === 'asc' })
    .range(offset, offset + limit - 1);

  // Apply filters
  if (is_active !== null) query = query.eq('is_active', is_active);

  const { data, error, count } = await query;

  if (error) throw error;

  // Get reader statistics
  const readerIds = data.map(reader => reader.id);

  // Get booking stats
  const { data: bookingStats } = await supabase
    .from('bookings')
    .select('reader_id, status')
    .in('reader_id', readerIds);

  // Get review stats
  const { data: reviewStats } = await supabase
    .from('reviews')
    .select('reader_id, rating')
    .in('reader_id', readerIds);

  // Get earnings stats
  const { data: earningsStats } = await supabase
    .from('payments')
    .select('booking_id, amount')
    .eq('status', 'completed');

  // Enhance reader data with statistics
  const enhancedData = data.map(reader => {
    const readerBookings = bookingStats?.filter(b => b.reader_id === reader.id) || [];
    const readerReviews = reviewStats?.filter(r => r.reader_id === reader.id) || [];
    
    const completedBookings = readerBookings.filter(b => b.status === 'completed').length;
    const averageRating = readerReviews.length > 0 
      ? readerReviews.reduce((sum, r) => sum + r.rating, 0) / readerReviews.length 
      : 0;

    // Calculate earnings (simplified - would need booking relation)
    const totalEarnings = 0; // This would require joining with bookings

    const stats = {
      total_bookings: readerBookings.length,
      completed_bookings: completedBookings,
      average_rating: Math.round(averageRating * 100) / 100,
      total_reviews: readerReviews.length,
      total_earnings: totalEarnings,
      completion_rate: readerBookings.length > 0 ? (completedBookings / readerBookings.length) * 100 : 0
    };

    // Apply rating filter if specified
    if (rating_min && stats.average_rating < rating_min) return null;
    if (rating_max && stats.average_rating > rating_max) return null;

    return {
      ...reader,
      statistics: stats
    };
  }).filter(Boolean);

  // Calculate summary
  const summary = {
    total_readers: enhancedData.length,
    active_readers: enhancedData.filter(r => r.is_active).length,
    average_rating: enhancedData.length > 0 
      ? enhancedData.reduce((sum, r) => sum + r.statistics.average_rating, 0) / enhancedData.length 
      : 0,
    top_performers: enhancedData
      .sort((a, b) => b.statistics.average_rating - a.statistics.average_rating)
      .slice(0, 5)
      .map(r => ({ 
        id: r.id, 
        name: `${r.first_name} ${r.last_name}`, 
        rating: r.statistics.average_rating 
      }))
  };

  return {
    data: enhancedData,
    pagination: {
      page,
      limit,
      total: count,
      pages: Math.ceil(count / limit)
    },
    summary
  };
};

// =============================================================================
// ANALYTICS SERVICES
// =============================================================================

/**
 * Get detailed analytics
 * @param {Object} options - Query options
 * @returns {Object} Analytics data
 */
const getDetailedAnalytics = async (options) => {
  const { date_from, date_to, include_charts } = options;

  const dateFilter = date_from && date_to ? 
    `created_at.gte.${date_from},created_at.lte.${date_to}` : null;

  // Get basic counts
  const [usersResult, readersResult, bookingsResult, paymentsResult] = await Promise.all([
    supabase.from('profiles').select('id, role, created_at', { count: 'exact' }),
    supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'reader'),
    supabase.from('bookings').select('id, status, created_at', { count: 'exact' }),
    supabase.from('payments').select('amount, status, method, created_at').eq('status', 'completed')
  ]);

  // Calculate revenue
  const totalRevenue = paymentsResult.data?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0;

  // Get time-series data for charts (if requested)
  let chartData = {};
  if (include_charts) {
    // This would be implemented based on specific chart requirements
    chartData = {
      user_registrations: [], // Daily user registrations
      revenue_trends: [], // Daily revenue
      booking_trends: [], // Daily bookings
      reader_performance: [] // Reader performance metrics
    };
  }

  // Get top statistics
  const topServices = await supabase
    .from('services')
    .select(`
      id, name, type,
      bookings(id)
    `)
    .limit(5);

  return {
    overview: {
      total_users: usersResult.count || 0,
      total_readers: readersResult.count || 0,
      total_bookings: bookingsResult.count || 0,
      total_revenue: totalRevenue,
      active_sessions: 0, // Would need real-time data
      pending_approvals: 0 // Would need to check approval tables
    },
    revenue: {
      total: totalRevenue,
      by_method: paymentsResult.data?.reduce((acc, payment) => {
        acc[payment.method] = (acc[payment.method] || 0) + parseFloat(payment.amount || 0);
        return acc;
      }, {}) || {},
      growth_rate: 0 // Would need historical comparison
    },
    bookings: {
      total: bookingsResult.count || 0,
      by_status: bookingsResult.data?.reduce((acc, booking) => {
        acc[booking.status] = (acc[booking.status] || 0) + 1;
        return acc;
      }, {}) || {},
      completion_rate: 0 // Would need calculation
    },
    users: {
      total: usersResult.count || 0,
      by_role: usersResult.data?.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {}) || {},
      new_this_month: 0 // Would need date filtering
    },
    top_services: topServices.data || [],
    charts: chartData
  };
};

// =============================================================================
// COMPLAINTS SERVICES
// =============================================================================

/**
 * Get all complaints
 * @param {Object} options - Query options
 * @returns {Object} Complaints data with pagination and summary
 */
const getAllComplaints = async (options) => {
  const { page, limit, status, priority, date_from, date_to, type } = options;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('user_feedback')
    .select(`
      id,
      user_id,
      feedback_type,
      message,
      rating,
      status,
      priority,
      resolved_at,
      resolved_by,
      resolution_notes,
      created_at,
      user:profiles!user_feedback_user_id_fkey(first_name, last_name, email)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply filters
  if (status) query = query.eq('status', status);
  if (priority) query = query.eq('priority', priority);
  if (type) query = query.eq('feedback_type', type);
  if (date_from) query = query.gte('created_at', date_from);
  if (date_to) query = query.lte('created_at', date_to);

  const { data, error, count } = await query;

  if (error) throw error;

  // Calculate summary
  const summary = {
    total: count,
    by_status: data.reduce((acc, complaint) => {
      acc[complaint.status] = (acc[complaint.status] || 0) + 1;
      return acc;
    }, {}),
    by_priority: data.reduce((acc, complaint) => {
      acc[complaint.priority] = (acc[complaint.priority] || 0) + 1;
      return acc;
    }, {}),
    by_type: data.reduce((acc, complaint) => {
      acc[complaint.feedback_type] = (acc[complaint.feedback_type] || 0) + 1;
      return acc;
    }, {})
  };

  return {
    data,
    pagination: {
      page,
      limit,
      total: count,
      pages: Math.ceil(count / limit)
    },
    summary
  };
};

/**
 * Resolve complaint
 * @param {string} complaintId - Complaint ID
 * @param {string} resolutionNotes - Resolution notes
 * @param {string} resolutionAction - Action taken
 * @param {string} adminId - Admin user ID
 * @returns {Object} Updated complaint data
 */
const resolveComplaint = async (complaintId, resolutionNotes, resolutionAction, adminId) => {
  const { data, error } = await supabase
    .from('user_feedback')
    .update({ 
      status: 'resolved',
      resolution_notes: resolutionNotes,
      resolution_action: resolutionAction,
      resolved_by: adminId,
      resolved_at: new Date().toISOString()
    })
    .eq('id', complaintId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

module.exports = {
  // User Management
  getAllUsers,
  updateUserProfile,
  changeUserRole,
  disableUserAccount,

  // Booking Management
  getAllBookings,
  updateBooking,
  cancelBooking,

  // Payment Management
  getAllPayments,
  approvePayment,
  rejectPayment,

  // Service Management
  getAllServices,
  updateService,

  // Reader Management
  getAllReaders,

  // Analytics
  getDetailedAnalytics,

  // Complaints
  getAllComplaints,
  resolveComplaint
};