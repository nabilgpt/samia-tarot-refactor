// =============================================================================
// ADMIN API ROUTES - روتيرات الإدارة
// =============================================================================
// Express routes for admin operations

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

// Import authentication middleware
const { authenticateToken, requireRole } = require('./middleware/auth.js');

// Import enhanced admin routes and controllers
const adminRoutes = require('./routes/adminRoutes.js');

// Import Supabase client (already configured with dotenv)
const { supabaseAdmin: supabase } = require('./lib/supabase.js');

// =============================================================================
// RATE LIMITING
// =============================================================================

// Admin-specific rate limits
const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 admin requests per windowMs
  message: {
    error: 'حد أقصى من طلبات الإدارة تم الوصول إليه، يرجى المحاولة لاحقاً',
    code: 'ADMIN_RATE_LIMIT_EXCEEDED'
  }
});

// =============================================================================
// DASHBOARD ENDPOINTS
// =============================================================================

// GET /api/admin/dashboard - لوحة تحكم الإدارة
router.get('/dashboard', [authenticateToken, requireRole(['admin', 'super_admin']), adminRateLimit], async (req, res) => {
  try {
    // Get basic statistics
    const [usersCount, readersCount, bookingsCount, paymentsCount] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact' }),
      supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'reader'),
      supabase.from('bookings').select('id', { count: 'exact' }),
      supabase.from('wallet_transactions').select('amount').eq('status', 'completed')
    ]);

    // Calculate total revenue
    const totalRevenue = paymentsCount.data?.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0) || 0;

    // Get recent activity
    const { data: recentBookings } = await supabase
      .from('bookings')
      .select(`
        id,
        status,
        service_type,
        created_at,
        profiles!bookings_client_id_fkey(first_name, last_name)
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: pendingApprovals } = await supabase
      .from('reader_applications')
      .select('id', { count: 'exact' })
      .eq('status', 'pending');

    res.json({
      success: true,
      data: {
        statistics: {
          total_users: usersCount.count || 0,
          total_readers: readersCount.count || 0,
          total_bookings: bookingsCount.count || 0,
          total_revenue: totalRevenue,
          pending_approvals: pendingApprovals.count || 0
        },
        recent_bookings: recentBookings || [],
        user_role: req.user.role,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في لوحة تحكم الإدارة',
      code: 'INTERNAL_ERROR'
    });
  }
});

// =============================================================================
// USER MANAGEMENT ENDPOINTS
// =============================================================================

// GET /api/admin/users - جلب جميع المستخدمين
router.get('/users', [authenticateToken, requireRole(['admin', 'super_admin']), adminRateLimit], async (req, res) => {
  try {
    const { page = 1, limit = 20, role, status, search } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('profiles')
      .select(`
        id,
        first_name,
        last_name,
        email,
        role,
        is_active,
        avatar_url,
        phone,
        created_at,
        last_seen
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (role) query = query.eq('role', role);
    if (status === 'active') query = query.eq('is_active', true);
    if (status === 'inactive') query = query.eq('is_active', false);
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: users, error, count } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب المستخدمين',
      code: 'INTERNAL_ERROR'
    });
  }
});

// PUT /api/admin/users/:id/status - تحديث حالة المستخدم
router.put('/users/:id/status', [authenticateToken, requireRole(['admin', 'super_admin']), adminRateLimit], async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active, reason } = req.body;

    // Update user status
    const { data: updatedUser, error } = await supabase
      .from('profiles')
      .update({ 
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log the action
    await supabase
      .from('user_activity_logs')
      .insert({
        user_id: req.user.id,
        activity_type: 'admin_action',
        action: `User status changed to ${is_active ? 'active' : 'inactive'}`,
        resource_type: 'user',
        resource_id: id,
        metadata: { reason, target_user: id }
      });

    res.json({
      success: true,
      data: updatedUser,
      message: `تم ${is_active ? 'تفعيل' : 'إلغاء تفعيل'} المستخدم بنجاح`
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في تحديث حالة المستخدم',
      code: 'INTERNAL_ERROR'
    });
  }
});

// =============================================================================
// PAYMENT MANAGEMENT ENDPOINTS
// =============================================================================

// GET /api/admin/payments/pending - المدفوعات المعلقة
router.get('/payments/pending', [authenticateToken, requireRole(['admin', 'super_admin']), adminRateLimit], async (req, res) => {
  try {
    const { data: pendingPayments, error } = await supabase
      .from('payment_receipts')
      .select(`
        id,
        receipt_number,
        amount,
        currency,
        payment_method,
        receipt_url,
        created_at,
        profiles!payment_receipts_user_id_fkey(first_name, last_name, email),
        bookings(id, service_type, status)
      `)
      .eq('is_verified', false)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: pendingPayments,
      count: pendingPayments.length
    });
  } catch (error) {
    console.error('Get pending payments error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب المدفوعات المعلقة',
      code: 'INTERNAL_ERROR'
    });
  }
});

// PUT /api/admin/payments/:id - الموافقة على أو رفض المدفوعات
router.put('/payments/:id', [authenticateToken, requireRole(['admin', 'super_admin']), adminRateLimit], async (req, res) => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body; // action: 'approve' or 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'إجراء غير صالح',
        code: 'INVALID_ACTION'
      });
    }

    // Update payment receipt
    const { data: updatedReceipt, error } = await supabase
      .from('payment_receipts')
      .update({
        is_verified: action === 'approve',
        verified_by: req.user.id,
        verified_at: new Date().toISOString(),
        verification_notes: notes
      })
      .eq('id', id)
      .select(`
        *,
        profiles!payment_receipts_user_id_fkey(first_name, last_name),
        bookings(id, status)
      `)
      .single();

    if (error) throw error;

    // If approved, update booking status and create wallet transaction
    if (action === 'approve') {
      // Update booking status
      await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', updatedReceipt.booking_id);

      // Create wallet transaction record
      await supabase
        .from('wallet_transactions')
        .insert({
          user_id: updatedReceipt.user_id,
          transaction_type: 'credit',
          amount: updatedReceipt.amount,
          currency: updatedReceipt.currency,
          description: `Payment verification approved for receipt ${updatedReceipt.receipt_number}`,
          booking_id: updatedReceipt.booking_id,
          status: 'completed'
        });
    }

    // Log the action
    await supabase
      .from('user_activity_logs')
      .insert({
        user_id: req.user.id,
        activity_type: 'admin_action',
        action: `Payment ${action}d`,
        resource_type: 'payment_receipt',
        resource_id: id,
        metadata: { action, notes, amount: updatedReceipt.amount }
      });

    res.json({
      success: true,
      data: updatedReceipt,
      message: `تم ${action === 'approve' ? 'الموافقة على' : 'رفض'} المدفوع بنجاح`
    });
  } catch (error) {
    console.error('Payment action error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في معالجة المدفوع',
      code: 'INTERNAL_ERROR'
    });
  }
});

// =============================================================================
// READER APPLICATION ENDPOINTS
// =============================================================================

// GET /api/admin/applications - طلبات الانضمام كقارئ
router.get('/applications', [authenticateToken, requireRole(['admin', 'super_admin']), adminRateLimit], async (req, res) => {
  try {
    const { status = 'pending' } = req.query;

    const { data: applications, error } = await supabase
      .from('reader_applications')
      .select(`
        id,
        application_type,
        experience_years,
        specializations,
        status,
        created_at,
        profiles!reader_applications_user_id_fkey(first_name, last_name, email, phone)
      `)
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: applications,
      count: applications.length
    });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب طلبات الانضمام',
      code: 'INTERNAL_ERROR'
    });
  }
});

// PUT /api/admin/applications/:id - الموافقة على أو رفض طلب الانضمام
router.put('/applications/:id', [authenticateToken, requireRole(['admin', 'super_admin']), adminRateLimit], async (req, res) => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body; // action: 'approve' or 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'إجراء غير صالح',
        code: 'INVALID_ACTION'
      });
    }

    // Get the application
    const { data: application, error: getError } = await supabase
      .from('reader_applications')
      .select('user_id')
      .eq('id', id)
      .single();

    if (getError) throw getError;

    // Update application status
    const { data: updatedApplication, error } = await supabase
      .from('reader_applications')
      .update({
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewed_by: req.user.id,
        reviewed_at: new Date().toISOString(),
        review_notes: notes
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // If approved, update user role to reader
    if (action === 'approve') {
      await supabase
        .from('profiles')
        .update({ role: 'reader' })
        .eq('id', application.user_id);
    }

    // Log the action
    await supabase
      .from('user_activity_logs')
      .insert({
        user_id: req.user.id,
        activity_type: 'admin_action',
        action: `Reader application ${action}d`,
        resource_type: 'reader_application',
        resource_id: id,
        metadata: { action, notes, applicant_id: application.user_id }
      });

    res.json({
      success: true,
      data: updatedApplication,
      message: `تم ${action === 'approve' ? 'الموافقة على' : 'رفض'} طلب الانضمام بنجاح`
    });
  } catch (error) {
    console.error('Application action error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في معالجة طلب الانضمام',
      code: 'INTERNAL_ERROR'
    });
  }
});

// =============================================================================
// REPORTS AND ANALYTICS ENDPOINTS
// =============================================================================

// GET /api/admin/reports - تقارير النظام
router.get('/reports', [authenticateToken, requireRole(['admin', 'super_admin']), adminRateLimit], async (req, res) => {
  try {
    const { type = 'overview', start_date, end_date } = req.query;

    let reportData = {};

    switch (type) {
      case 'overview': {
        // Get overview statistics
        const [users, bookings, revenue, analytics] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact' }),
          supabase.from('bookings').select('id, status', { count: 'exact' }),
          supabase.from('wallet_transactions').select('amount').eq('status', 'completed'),
          supabase.from('daily_analytics').select('*').order('date', { ascending: false }).limit(30)
        ]);

        reportData = {
          total_users: users.count,
          total_bookings: bookings.count,
          total_revenue: revenue.data?.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0) || 0,
          recent_analytics: analytics.data
        };
        break;
      }
      case 'revenue': {
        // Revenue report
        const { data: revenueData } = await supabase
          .from('wallet_transactions')
          .select('amount, currency, created_at')
          .eq('status', 'completed')
          .gte('created_at', start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .lte('created_at', end_date || new Date().toISOString());

        reportData = {
          transactions: revenueData,
          total_revenue: revenueData?.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0) || 0
        };
        break;
      }
      case 'users': {
        // User report
        const { data: userData } = await supabase
          .from('profiles')
          .select('role, is_active, created_at')
          .gte('created_at', start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .lte('created_at', end_date || new Date().toISOString());

        const userStats = userData?.reduce((acc, user) => {
          acc[user.role] = (acc[user.role] || 0) + 1;
          if (user.is_active) acc.active = (acc.active || 0) + 1;
          return acc;
        }, {});

        reportData = {
          user_statistics: userStats,
          total_users: userData?.length || 0
        };
        break;
      }
      default:
        return res.status(400).json({
          success: false,
          error: 'نوع تقرير غير صالح',
          code: 'INVALID_REPORT_TYPE'
        });
    }

    res.json({
      success: true,
      data: reportData,
      report_type: type,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في إنشاء التقرير',
      code: 'INTERNAL_ERROR'
    });
  }
});

// =============================================================================
// NOTIFICATION AND BROADCAST ENDPOINTS
// =============================================================================

// POST /api/admin/broadcast - إرسال إشعار جماعي
router.post('/broadcast', [authenticateToken, requireRole(['admin', 'super_admin']), adminRateLimit], async (req, res) => {
  try {
    const { title, message, target_roles = ['all'], urgent = false } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        error: 'العنوان والرسالة مطلوبان',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Get target users
    let query = supabase.from('profiles').select('id, first_name, email');
    
    if (!target_roles.includes('all')) {
      query = query.in('role', target_roles);
    }

    const { data: targetUsers, error } = await query;
    if (error) throw error;

    // Create notifications for each user
    const notifications = targetUsers.map(user => ({
      user_id: user.id,
      title,
      message,
      type: 'broadcast',
      is_urgent: urgent,
      sender_id: req.user.id,
      metadata: {
        broadcast: true,
        target_roles,
        sent_by: req.user.email
      }
    }));

    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (insertError) throw insertError;

    // Log the broadcast
    await supabase
      .from('user_activity_logs')
      .insert({
        user_id: req.user.id,
        activity_type: 'admin_action',
        action: 'Broadcast notification sent',
        metadata: { 
          title, 
          target_count: targetUsers.length,
          target_roles,
          urgent
        }
      });

    res.json({
      success: true,
      data: {
        sent_count: targetUsers.length,
        target_roles,
        urgent
      },
      message: `تم إرسال الإشعار إلى ${targetUsers.length} مستخدم بنجاح`
    });
  } catch (error) {
    console.error('Broadcast error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في إرسال الإشعار الجماعي',
      code: 'INTERNAL_ERROR'
    });
  }
});

// =============================================================================
// AUDIT LOG ENDPOINTS
// =============================================================================

// GET /api/admin/audit-logs - سجل المراجعة
router.get('/audit-logs', [authenticateToken, requireRole(['admin', 'super_admin']), adminRateLimit], async (req, res) => {
  try {
    const { page = 1, limit = 50, user_id, activity_type, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('user_activity_logs')
      .select(`
        id,
        activity_type,
        action,
        resource_type,
        resource_id,
        metadata,
        created_at,
        profiles!user_activity_logs_user_id_fkey(first_name, last_name, email)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (user_id) query = query.eq('user_id', user_id);
    if (activity_type) query = query.eq('activity_type', activity_type);
    if (start_date) query = query.gte('created_at', start_date);
    if (end_date) query = query.lte('created_at', end_date);

    const { data: logs, error, count } = await query;
    if (error) throw error;

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب سجل المراجعة',
      code: 'INTERNAL_ERROR'
    });
  }
});

// =============================================================================
// ENHANCED ADMIN ROUTES INTEGRATION
// =============================================================================

// Mount enhanced admin routes
router.use('/', adminRoutes);

module.exports = router; 