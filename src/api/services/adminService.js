// =============================================================================
// ADMIN SERVICE - خدمات الإدارة
// =============================================================================
// Data access layer for admin operations

// CREDENTIAL SOURCE POLICY COMPLIANCE:
// - Supabase credentials: ONLY from .env (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)
// - All other API keys: ONLY from Super Admin Dashboard/Database, NEVER from .env

import { supabaseAdmin as supabase } from '../lib/supabase.js';

// =============================================================================
// USER MANAGEMENT SERVICES
// =============================================================================

/**
 * Get all users with filtering and pagination
 * @param {Object} options - Query options
 * @returns {Object} Users data with pagination
 */
export const getAllUsers = async (options) => {
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
export const updateUserProfile = async (userId, updateData) => {
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
export const changeUserRole = async (userId, newRole) => {
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
 * @returns {Object} Updated user data
 */
export const disableUserAccount = async (userId) => {
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
      notes: `Account disabled by admin`,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .in('status', ['pending', 'confirmed']);

  return data;
};

// =============================================================================
// BOOKING MANAGEMENT SERVICES
// =============================================================================

/**
 * Get all bookings with filtering and pagination
 * @param {Object} options - Query options
 * @returns {Object} Bookings data with pagination
 */
export const getAllBookings = async (options) => {
  const { page, limit, status, date_from, date_to, reader_id, client_id, service_type, sort_by, sort_order } = options;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('bookings')
    .select(`
      *,
      client:profiles!bookings_client_id_fkey(first_name, last_name, email),
      reader:profiles!bookings_reader_id_fkey(first_name, last_name, email),
      service:services(name, type, price)
    `, { count: 'exact' })
    .order(sort_by, { ascending: sort_order === 'asc' })
    .range(offset, offset + limit - 1);

  // Apply filters
  if (status) query = query.eq('status', status);
  if (reader_id) query = query.eq('reader_id', reader_id);
  if (client_id) query = query.eq('client_id', client_id);
  if (service_type) query = query.eq('service.type', service_type);
  if (date_from) query = query.gte('scheduled_at', date_from);
  if (date_to) query = query.lte('scheduled_at', date_to);

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
 * Update booking
 * @param {string} bookingId - Booking ID
 * @param {Object} updateData - Data to update
 * @returns {Object} Updated booking data
 */
export const updateBooking = async (bookingId, updateData) => {
  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('bookings')
    .update(updateData)
    .eq('id', bookingId)
    .select(`
      *,
      client:profiles!bookings_client_id_fkey(first_name, last_name, email),
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
export const cancelBooking = async (bookingId, reason) => {
  const { data, error } = await supabase
    .from('bookings')
    .update({ 
      status: 'cancelled',
      notes: reason,
      updated_at: new Date().toISOString()
    })
    .eq('id', bookingId)
    .select(`
      *,
      client:profiles!bookings_client_id_fkey(first_name, last_name, email),
      reader:profiles!bookings_reader_id_fkey(first_name, last_name, email),
      service:services(name, type, price)
    `)
    .single();

  if (error) throw error;
  return data;
};

// =============================================================================
// PAYMENT MANAGEMENT SERVICES
// =============================================================================

/**
 * Get all payments with filtering and pagination
 * @param {Object} options - Query options
 * @returns {Object} Payments data with pagination
 */
export const getAllPayments = async (options) => {
  const { page, limit, method, status, user_id, date_from, date_to, amount_from, amount_to, sort_by, sort_order } = options;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('payments')
    .select(`
      *,
      user:profiles!payments_user_id_fkey(first_name, last_name, email),
      booking:bookings(id, scheduled_at, service:services(name))
    `, { count: 'exact' })
    .order(sort_by, { ascending: sort_order === 'asc' })
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
 * Approve payment
 * @param {string} paymentId - Payment ID
 * @param {string} adminNotes - Admin notes
 * @returns {Object} Updated payment data
 */
export const approvePayment = async (paymentId, adminNotes) => {
  const { data, error } = await supabase
    .from('payments')
    .update({ 
      status: 'approved',
      admin_notes: adminNotes,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', paymentId)
    .select(`
      *,
      user:profiles!payments_user_id_fkey(first_name, last_name, email)
    `)
    .single();

  if (error) throw error;
  return data;
};

/**
 * Reject payment
 * @param {string} paymentId - Payment ID
 * @param {string} reason - Rejection reason
 * @param {string} adminNotes - Admin notes
 * @returns {Object} Updated payment data
 */
export const rejectPayment = async (paymentId, reason, adminNotes) => {
  const { data, error } = await supabase
    .from('payments')
    .update({ 
      status: 'rejected',
      rejection_reason: reason,
      admin_notes: adminNotes,
      rejected_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', paymentId)
    .select(`
      *,
      user:profiles!payments_user_id_fkey(first_name, last_name, email)
    `)
    .single();

  if (error) throw error;
  return data;
};

// =============================================================================
// SERVICE MANAGEMENT SERVICES
// =============================================================================

/**
 * Get all services with filtering and pagination
 * @param {Object} options - Query options
 * @returns {Object} Services data with pagination
 */
export const getAllServices = async (options) => {
  const { page, limit, type, is_active } = options;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('services')
    .select('*', { count: 'exact' })
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
export const updateService = async (serviceId, updateData) => {
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
 * @returns {Object} Readers data with pagination
 */
export const getAllReaders = async (options) => {
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
      avatar_url,
      bio,
      specialties,
      is_active,
      created_at,
      last_seen
    `, { count: 'exact' })
    .eq('role', 'reader')
    .order(sort_by, { ascending: sort_order === 'asc' })
    .range(offset, offset + limit - 1);

  // Apply filters
  if (is_active !== null) query = query.eq('is_active', is_active);

  const { data, error, count } = await query;

  if (error) throw error;

  // Get statistics for each reader
  const readerIds = data.map(reader => reader.id);

  // Get booking statistics
  const { data: bookingStats } = await supabase
    .from('bookings')
    .select('reader_id, status')
    .in('reader_id', readerIds);

  // Get rating statistics
  const { data: ratingStats } = await supabase
    .from('service_feedback')
    .select('reader_id, rating')
    .in('reader_id', readerIds);

  // Get earnings statistics
  const { data: earningStats } = await supabase
    .from('payments')
    .select('reader_id, amount')
    .eq('status', 'completed')
    .in('reader_id', readerIds);

  // Enhance reader data with statistics
  const enhancedData = data.map(reader => {
    const readerBookings = bookingStats?.filter(b => b.reader_id === reader.id) || [];
    const readerRatings = ratingStats?.filter(r => r.reader_id === reader.id) || [];
    const readerEarnings = earningStats?.filter(e => e.reader_id === reader.id) || [];
    
    const totalBookings = readerBookings.length;
    const completedBookings = readerBookings.filter(b => b.status === 'completed').length;
    const avgRating = readerRatings.length > 0 
      ? readerRatings.reduce((sum, r) => sum + r.rating, 0) / readerRatings.length 
      : 0;
    const totalEarnings = readerEarnings.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

    // Apply rating filter if specified
    if (rating_min && avgRating < rating_min) return null;
    if (rating_max && avgRating > rating_max) return null;

    return {
      ...reader,
      statistics: {
        total_bookings: totalBookings,
        completed_bookings: completedBookings,
        completion_rate: totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0,
        average_rating: Math.round(avgRating * 10) / 10,
        total_ratings: readerRatings.length,
        total_earnings: totalEarnings
      }
    };
  }).filter(Boolean); // Remove null entries from rating filter

  return {
    data: enhancedData,
    pagination: {
      page,
      limit,
      total: enhancedData.length, // Adjusted for filtering
      pages: Math.ceil(enhancedData.length / limit)
    }
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
export const getAnalytics = async (options) => {
  const { date_from, date_to, include_charts } = options;

  // const dateFilter = date_from && date_to ? 
  //   `created_at.gte.${date_from},created_at.lte.${date_to}` : null;
  
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
export const getAllComplaints = async (options) => {
  const { page, limit, status, priority, category, date_from, date_to, sort_by, sort_order } = options;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('service_feedback')
    .select(`
      *,
      user:profiles!service_feedback_user_id_fkey(first_name, last_name, email),
      reader:profiles!service_feedback_reader_id_fkey(first_name, last_name, email)
    `, { count: 'exact' })
    .order(sort_by, { ascending: sort_order === 'asc' })
    .range(offset, offset + limit - 1);

  // Apply filters
  if (status) query = query.eq('status', status);
  if (priority) query = query.eq('priority', priority);
  if (category) query = query.eq('category', category);
  if (date_from) query = query.gte('created_at', date_from);
  if (date_to) query = query.lte('created_at', date_to);

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
 * Resolve complaint
 * @param {string} complaintId - Complaint ID
 * @param {string} resolutionNotes - Resolution notes
 * @param {string} resolutionAction - Action taken
 * @param {string} adminId - Admin user ID
 * @returns {Object} Updated complaint data
 */
export const resolveComplaint = async (complaintId, resolution, resolutionNotes) => {
  const { data, error } = await supabase
    .from('service_feedback')
    .update({ 
      status: 'resolved',
      resolution,
      resolution_notes: resolutionNotes,
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', complaintId)
    .select(`
      *,
      user:profiles!service_feedback_user_id_fkey(first_name, last_name, email),
      reader:profiles!service_feedback_reader_id_fkey(first_name, last_name, email)
    `)
    .single();

  if (error) throw error;
  return data;
};

// =============================================================================
// EXPORTS
// =============================================================================

const adminService = {
  getAllUsers,
  updateUserProfile,
  changeUserRole,
  disableUserAccount,
  getAllBookings,
  updateBooking,
  cancelBooking,
  getAllPayments,
  approvePayment,
  rejectPayment,
  getAllServices,
  updateService,
  getAllReaders,
  getAnalytics,
  getAllComplaints,
  resolveComplaint
};

export default adminService;
