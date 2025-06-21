const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Middleware for admin authentication and permissions
const requireAdminAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid authentication' });
    }

    // Check if user has admin role
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select(`
        roles (
          name,
          role_permissions (
            permissions (name, resource, action)
          )
        )
      `)
      .eq('user_id', user.id);

    const isAdmin = userRoles?.some(ur => 
      ['super_admin', 'admin', 'moderator'].includes(ur.roles.name)
    );

    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.user = user;
    req.userPermissions = userRoles?.flatMap(ur => 
      ur.roles.role_permissions.map(rp => rp.permissions)
    ) || [];
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};

// Permission check middleware
const requirePermission = (resource, action) => {
  return (req, res, next) => {
    const hasPermission = req.userPermissions.some(p => 
      p.resource === resource && p.action === action
    );
    
    if (!hasPermission) {
      return res.status(403).json({ 
        error: `Permission denied: ${resource}.${action}` 
      });
    }
    
    next();
  };
};

// =====================================================
// 1️⃣ BULK OPERATIONS
// =====================================================

// Bulk update users
router.post('/users/bulk-update', requireAdminAuth, requirePermission('users', 'bulk'), async (req, res) => {
  try {
    const { ids, updates, operation } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Valid IDs array required' });
    }

    // Create bulk operation log
    const { data: bulkOp } = await supabase
      .from('bulk_operations_log')
      .insert({
        admin_id: req.user.id,
        operation_type: operation || 'bulk_update',
        table_name: 'users',
        total_records: ids.length,
        status: 'processing'
      })
      .select()
      .single();

    const results = [];
    let successful = 0;
    let failed = 0;

    for (const id of ids) {
      try {
        // Get current data for undo
        const { data: currentData } = await supabase
          .from('users')
          .select('*')
          .eq('id', id)
          .single();

        // Perform update
        const { data, error } = await supabase
          .from('users')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        // Log audit entry
        await supabase
          .from('admin_audit_logs')
          .insert({
            admin_id: req.user.id,
            action_type: 'bulk_update',
            table_name: 'users',
            record_ids: [id],
            old_data: currentData,
            new_data: data,
            bulk_operation_id: bulkOp.id,
            can_undo: true
          });

        results.push({ id, status: 'success', data });
        successful++;
      } catch (error) {
        results.push({ id, status: 'error', error: error.message });
        failed++;
      }
    }

    // Update bulk operation log
    await supabase
      .from('bulk_operations_log')
      .update({
        successful_records: successful,
        failed_records: failed,
        status: failed === 0 ? 'completed' : 'completed_with_errors',
        completed_at: new Date().toISOString()
      })
      .eq('id', bulkOp.id);

    res.json({
      success: true,
      bulk_operation_id: bulkOp.id,
      total: ids.length,
      successful,
      failed,
      results
    });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ error: 'Bulk update failed' });
  }
});

// Bulk delete users (soft delete)
router.post('/users/bulk-delete', requireAdminAuth, requirePermission('users', 'delete'), async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Valid IDs array required' });
    }

    // Create bulk operation log
    const { data: bulkOp } = await supabase
      .from('bulk_operations_log')
      .insert({
        admin_id: req.user.id,
        operation_type: 'bulk_delete',
        table_name: 'users',
        total_records: ids.length,
        status: 'processing'
      })
      .select()
      .single();

    const results = [];
    let successful = 0;
    let failed = 0;

    for (const id of ids) {
      try {
        // Get current data for undo
        const { data: currentData } = await supabase
          .from('users')
          .select('*')
          .eq('id', id)
          .single();

        // Soft delete
        const { data, error } = await supabase
          .from('users')
          .update({
            deleted_at: new Date().toISOString(),
            deleted_by: req.user.id
          })
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        // Log audit entry
        await supabase
          .from('admin_audit_logs')
          .insert({
            admin_id: req.user.id,
            action_type: 'bulk_delete',
            table_name: 'users',
            record_ids: [id],
            old_data: currentData,
            new_data: data,
            bulk_operation_id: bulkOp.id,
            can_undo: true
          });

        results.push({ id, status: 'success' });
        successful++;
      } catch (error) {
        results.push({ id, status: 'error', error: error.message });
        failed++;
      }
    }

    // Update bulk operation log
    await supabase
      .from('bulk_operations_log')
      .update({
        successful_records: successful,
        failed_records: failed,
        status: failed === 0 ? 'completed' : 'completed_with_errors',
        completed_at: new Date().toISOString()
      })
      .eq('id', bulkOp.id);

    res.json({
      success: true,
      bulk_operation_id: bulkOp.id,
      total: ids.length,
      successful,
      failed,
      results
    });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ error: 'Bulk delete failed' });
  }
});

// Similar bulk operations for bookings, reviews, payments...
router.post('/bookings/bulk-update', requireAdminAuth, requirePermission('bookings', 'bulk'), async (req, res) => {
  // Similar implementation to users bulk update
  // ... (implementation similar to above)
});

router.post('/reviews/bulk-approve', requireAdminAuth, requirePermission('reviews', 'bulk'), async (req, res) => {
  try {
    const { ids } = req.body;
    
    const results = [];
    let successful = 0;
    let failed = 0;

    for (const id of ids) {
      try {
        const { data: currentData } = await supabase
          .from('reviews')
          .select('*')
          .eq('id', id)
          .single();

        const { data, error } = await supabase
          .from('reviews')
          .update({
            status: 'approved',
            approved_by: req.user.id,
            approved_at: new Date().toISOString()
          })
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        await supabase
          .from('admin_audit_logs')
          .insert({
            admin_id: req.user.id,
            action_type: 'bulk_approve',
            table_name: 'reviews',
            record_ids: [id],
            old_data: currentData,
            new_data: data,
            can_undo: true
          });

        results.push({ id, status: 'success' });
        successful++;
      } catch (error) {
        results.push({ id, status: 'error', error: error.message });
        failed++;
      }
    }

    res.json({ successful, failed, results });
  } catch (error) {
    console.error('Bulk approve error:', error);
    res.status(500).json({ error: 'Bulk approve failed' });
  }
});

// =====================================================
// 2️⃣ UNDO FUNCTIONALITY
// =====================================================

// Undo last admin action
router.post('/undo/:auditLogId', requireAdminAuth, requirePermission('admin', 'undo'), async (req, res) => {
  try {
    const { auditLogId } = req.params;

    // Get audit log entry
    const { data: auditLog, error } = await supabase
      .from('admin_audit_logs')
      .select('*')
      .eq('id', auditLogId)
      .eq('can_undo', true)
      .is('undone_at', null)
      .single();

    if (error || !auditLog) {
      return res.status(404).json({ error: 'Audit log not found or cannot be undone' });
    }

    // Check if undo is still within time limit (30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    if (new Date(auditLog.created_at) < thirtyDaysAgo) {
      return res.status(400).json({ error: 'Undo time limit exceeded' });
    }

    const results = [];
    
    // Undo each record
    for (const recordId of auditLog.record_ids) {
      try {
        let undoResult;
        
        if (auditLog.action_type.includes('delete')) {
          // Restore deleted record
          undoResult = await supabase
            .from(auditLog.table_name)
            .update({
              deleted_at: null,
              deleted_by: null
            })
            .eq('id', recordId);
        } else if (auditLog.old_data) {
          // Restore previous state
          undoResult = await supabase
            .from(auditLog.table_name)
            .update(auditLog.old_data)
            .eq('id', recordId);
        }

        results.push({ id: recordId, status: 'success' });
      } catch (error) {
        results.push({ id: recordId, status: 'error', error: error.message });
      }
    }

    // Mark as undone
    await supabase
      .from('admin_audit_logs')
      .update({
        undone_at: new Date().toISOString(),
        undone_by: req.user.id
      })
      .eq('id', auditLogId);

    // Log the undo action
    await supabase
      .from('admin_audit_logs')
      .insert({
        admin_id: req.user.id,
        action_type: 'undo',
        table_name: auditLog.table_name,
        record_ids: auditLog.record_ids,
        old_data: auditLog.new_data,
        new_data: auditLog.old_data,
        can_undo: false,
        metadata: { original_audit_log_id: auditLogId }
      });

    res.json({
      success: true,
      message: 'Action undone successfully',
      results
    });
  } catch (error) {
    console.error('Undo error:', error);
    res.status(500).json({ error: 'Undo failed' });
  }
});

// Get undoable actions
router.get('/undo/available', requireAdminAuth, async (req, res) => {
  try {
    const { data: undoableActions, error } = await supabase
      .from('admin_audit_logs')
      .select('*')
      .eq('can_undo', true)
      .is('undone_at', null)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    res.json({ actions: undoableActions });
  } catch (error) {
    console.error('Get undoable actions error:', error);
    res.status(500).json({ error: 'Failed to get undoable actions' });
  }
});

// =====================================================
// 3️⃣ UNIVERSAL SEARCH
// =====================================================

// Universal search across all entities
router.get('/search', requireAdminAuth, async (req, res) => {
  try {
    const { q, type = 'all', limit = 20, offset = 0 } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const searchStart = Date.now();
    const results = {};
    let totalResults = 0;

    // Search users
    if (type === 'all' || type === 'users') {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, email, phone, role, created_at')
        .or(`full_name.ilike.%${q}%, email.ilike.%${q}%, phone.ilike.%${q}%`)
        .is('deleted_at', null)
        .limit(limit);

      if (!usersError) {
        results.users = users || [];
        totalResults += users?.length || 0;
      }
    }

    // Search bookings
    if (type === 'all' || type === 'bookings') {
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, booking_code, service_type, status, created_at, user:users(full_name, email)')
        .or(`booking_code.ilike.%${q}%, service_type.ilike.%${q}%`)
        .is('deleted_at', null)
        .limit(limit);

      if (!bookingsError) {
        results.bookings = bookings || [];
        totalResults += bookings?.length || 0;
      }
    }

    // Search payments
    if (type === 'all' || type === 'payments') {
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('id, transaction_id, amount, status, payment_method, created_at')
        .ilike('transaction_id', `%${q}%`)
        .is('deleted_at', null)
        .limit(limit);

      if (!paymentsError) {
        results.payments = payments || [];
        totalResults += payments?.length || 0;
      }
    }

    // Search reviews
    if (type === 'all' || type === 'reviews') {
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('id, rating, comment, status, created_at, user:users(full_name)')
        .ilike('comment', `%${q}%`)
        .is('deleted_at', null)
        .limit(limit);

      if (!reviewsError) {
        results.reviews = reviews || [];
        totalResults += reviews?.length || 0;
      }
    }

    const searchDuration = Date.now() - searchStart;

    // Log search for analytics
    await supabase
      .from('admin_search_history')
      .insert({
        admin_id: req.user.id,
        search_query: q,
        search_type: type,
        results_count: totalResults,
        search_duration_ms: searchDuration
      });

    res.json({
      query: q,
      type,
      total_results: totalResults,
      search_duration_ms: searchDuration,
      results
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Advanced filtering
router.post('/filter', requireAdminAuth, async (req, res) => {
  try {
    const { table, filters, sort, limit = 50, offset = 0 } = req.body;
    
    if (!table) {
      return res.status(400).json({ error: 'Table name required' });
    }

    let query = supabase.from(table).select('*');

    // Apply filters
    if (filters) {
      Object.entries(filters).forEach(([field, condition]) => {
        if (condition.operator === 'eq') {
          query = query.eq(field, condition.value);
        } else if (condition.operator === 'ilike') {
          query = query.ilike(field, `%${condition.value}%`);
        } else if (condition.operator === 'gte') {
          query = query.gte(field, condition.value);
        } else if (condition.operator === 'lte') {
          query = query.lte(field, condition.value);
        } else if (condition.operator === 'in') {
          query = query.in(field, condition.value);
        }
      });
    }

    // Apply sorting
    if (sort) {
      query = query.order(sort.field, { ascending: sort.direction === 'asc' });
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Exclude soft deleted records
    query = query.is('deleted_at', null);

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({
      data,
      total: count,
      limit,
      offset
    });
  } catch (error) {
    console.error('Filter error:', error);
    res.status(500).json({ error: 'Filter failed' });
  }
});

// =====================================================
// 4️⃣ REAL-TIME ANALYTICS
// =====================================================

// Get dashboard analytics
router.get('/analytics/dashboard', requireAdminAuth, requirePermission('analytics', 'read'), async (req, res) => {
  try {
    const { period = 'today' } = req.query;

    // Check cache first
    const { data: cachedMetrics } = await supabase
      .from('admin_analytics_cache')
      .select('*')
      .eq('time_period', period)
      .gt('expires_at', new Date().toISOString());

    if (cachedMetrics && cachedMetrics.length > 0) {
      const metrics = {};
      cachedMetrics.forEach(metric => {
        metrics[metric.metric_name] = {
          value: metric.metric_value,
          data: metric.metric_data,
          calculated_at: metric.calculated_at
        };
      });
      return res.json({ metrics, cached: true });
    }

    // Calculate fresh metrics
    const metrics = {};
    const now = new Date();
    let startDate;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    // Total users
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);

    // New users in period
    const { count: newUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString())
      .is('deleted_at', null);

    // Total bookings
    const { count: totalBookings } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);

    // New bookings in period
    const { count: newBookings } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString())
      .is('deleted_at', null);

    // Total revenue
    const { data: revenueData } = await supabase
      .from('payments')
      .select('amount')
      .eq('status', 'completed')
      .is('deleted_at', null);

    const totalRevenue = revenueData?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

    // Revenue in period
    const { data: periodRevenueData } = await supabase
      .from('payments')
      .select('amount')
      .eq('status', 'completed')
      .gte('created_at', startDate.toISOString())
      .is('deleted_at', null);

    const periodRevenue = periodRevenueData?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

    // Active readers
    const { count: activeReaders } = await supabase
      .from('readers')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')
      .is('deleted_at', null);

    metrics.total_users = { value: totalUsers, change: newUsers };
    metrics.total_bookings = { value: totalBookings, change: newBookings };
    metrics.total_revenue = { value: totalRevenue, change: periodRevenue };
    metrics.active_readers = { value: activeReaders };

    // Cache the results
    const cacheEntries = Object.entries(metrics).map(([metricName, metricData]) => ({
      metric_name: metricName,
      metric_value: metricData.value,
      metric_data: metricData,
      time_period: period,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour
    }));

    await supabase
      .from('admin_analytics_cache')
      .upsert(cacheEntries, { onConflict: 'metric_name,time_period' });

    res.json({ metrics, cached: false });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Analytics failed' });
  }
});

// Get activity feed
router.get('/activity-feed', requireAdminAuth, async (req, res) => {
  try {
    const { limit = 50, offset = 0, type } = req.query;

    let query = supabase
      .from('admin_activity_feed')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type) {
      query = query.eq('activity_type', type);
    }

    const { data: activities, error } = await query;

    if (error) throw error;

    res.json({ activities });
  } catch (error) {
    console.error('Activity feed error:', error);
    res.status(500).json({ error: 'Activity feed failed' });
  }
});

// =====================================================
// 5️⃣ NOTIFICATION RULES
// =====================================================

// Get notification rules
router.get('/notification-rules', requireAdminAuth, async (req, res) => {
  try {
    const { data: rules, error } = await supabase
      .from('admin_notification_rules')
      .select('*')
      .eq('admin_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ rules });
  } catch (error) {
    console.error('Get notification rules error:', error);
    res.status(500).json({ error: 'Failed to get notification rules' });
  }
});

// Create notification rule
router.post('/notification-rules', requireAdminAuth, async (req, res) => {
  try {
    const { rule_name, event_type, conditions, actions, priority = 1 } = req.body;

    const { data: rule, error } = await supabase
      .from('admin_notification_rules')
      .insert({
        admin_id: req.user.id,
        rule_name,
        event_type,
        conditions,
        actions,
        priority
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ rule });
  } catch (error) {
    console.error('Create notification rule error:', error);
    res.status(500).json({ error: 'Failed to create notification rule' });
  }
});

// Update notification rule
router.put('/notification-rules/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data: rule, error } = await supabase
      .from('admin_notification_rules')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('admin_id', req.user.id)
      .select()
      .single();

    if (error) throw error;

    res.json({ rule });
  } catch (error) {
    console.error('Update notification rule error:', error);
    res.status(500).json({ error: 'Failed to update notification rule' });
  }
});

// Delete notification rule
router.delete('/notification-rules/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('admin_notification_rules')
      .delete()
      .eq('id', id)
      .eq('admin_id', req.user.id);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Delete notification rule error:', error);
    res.status(500).json({ error: 'Failed to delete notification rule' });
  }
});

// =====================================================
// 6️⃣ PERMISSIONS & RBAC
// =====================================================

// Get all permissions
router.get('/permissions', requireAdminAuth, async (req, res) => {
  try {
    const { data: permissions, error } = await supabase
      .from('permissions')
      .select('*')
      .order('resource', { ascending: true });

    if (error) throw error;

    res.json({ permissions });
  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({ error: 'Failed to get permissions' });
  }
});

// Get all roles
router.get('/roles', requireAdminAuth, async (req, res) => {
  try {
    const { data: roles, error } = await supabase
      .from('roles')
      .select(`
        *,
        role_permissions (
          permissions (*)
        )
      `)
      .order('name', { ascending: true });

    if (error) throw error;

    res.json({ roles });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ error: 'Failed to get roles' });
  }
});

// Create role
router.post('/roles', requireAdminAuth, requirePermission('system', 'update'), async (req, res) => {
  try {
    const { name, description, permission_ids = [] } = req.body;

    // Create role
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .insert({ name, description })
      .select()
      .single();

    if (roleError) throw roleError;

    // Assign permissions
    if (permission_ids.length > 0) {
      const rolePermissions = permission_ids.map(permission_id => ({
        role_id: role.id,
        permission_id
      }));

      const { error: permError } = await supabase
        .from('role_permissions')
        .insert(rolePermissions);

      if (permError) throw permError;
    }

    res.json({ role });
  } catch (error) {
    console.error('Create role error:', error);
    res.status(500).json({ error: 'Failed to create role' });
  }
});

// Assign role to user
router.post('/users/:userId/roles', requireAdminAuth, requirePermission('users', 'update'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { role_id, expires_at } = req.body;

    const { data: userRole, error } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role_id,
        assigned_by: req.user.id,
        expires_at
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ user_role: userRole });
  } catch (error) {
    console.error('Assign role error:', error);
    res.status(500).json({ error: 'Failed to assign role' });
  }
});

// =====================================================
// 7️⃣ DOCUMENTATION & ERROR TRACKING
// =====================================================

// Get documentation
router.get('/docs/:page', requireAdminAuth, async (req, res) => {
  try {
    const { page } = req.params;
    const { lang = 'en' } = req.query;

    const { data: doc, error } = await supabase
      .from('documentation_entries')
      .select('*')
      .eq('page_key', page)
      .eq('is_published', true)
      .single();

    if (error) throw error;

    const content = lang === 'ar' ? (doc.content_ar || doc.content) : doc.content;

    res.json({
      title: doc.title,
      content,
      category: doc.category,
      tags: doc.tags,
      updated_at: doc.updated_at
    });
  } catch (error) {
    console.error('Get documentation error:', error);
    res.status(404).json({ error: 'Documentation not found' });
  }
});

// Log error
router.post('/errors', requireAdminAuth, async (req, res) => {
  try {
    const {
      error_type,
      error_message,
      stack_trace,
      request_url,
      request_method,
      request_data,
      severity = 'error'
    } = req.body;

    const { data: errorLog, error } = await supabase
      .from('error_logs')
      .insert({
        user_id: req.user.id,
        error_type,
        error_message,
        stack_trace,
        request_url,
        request_method,
        request_data,
        severity,
        user_agent: req.headers['user-agent'],
        ip_address: req.ip
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ error_log: errorLog });
  } catch (error) {
    console.error('Log error failed:', error);
    res.status(500).json({ error: 'Failed to log error' });
  }
});

// =====================================================
// 8️⃣ IMPORT/EXPORT
// =====================================================

// Export data
router.post('/export', requireAdminAuth, async (req, res) => {
  try {
    const { data_type, format = 'csv', filters = {} } = req.body;

    // Create export job
    const { data: job, error } = await supabase
      .from('import_export_jobs')
      .insert({
        admin_id: req.user.id,
        job_type: 'export',
        data_type,
        status: 'processing'
      })
      .select()
      .single();

    if (error) throw error;

    // Start background export process
    // This would typically be handled by a queue system
    // For now, we'll return the job ID for polling
    
    res.json({
      job_id: job.id,
      status: 'processing',
      message: 'Export started. Check status with GET /admin/export-jobs/:id'
    });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
});

// Get export job status
router.get('/export-jobs/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: job, error } = await supabase
      .from('import_export_jobs')
      .select('*')
      .eq('id', id)
      .eq('admin_id', req.user.id)
      .single();

    if (error) throw error;

    res.json({ job });
  } catch (error) {
    console.error('Get export job error:', error);
    res.status(500).json({ error: 'Failed to get export job' });
  }
});

module.exports = router; 