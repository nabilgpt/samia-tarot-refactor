// =============================================================================
// AUDIT SERVICE - خدمة التدقيق
// =============================================================================
// Comprehensive audit logging for all admin actions

const { supabaseAdmin: supabase } = require('../lib/supabase.js');

// =============================================================================
// AUDIT LOGGING FUNCTIONS
// =============================================================================

/**
 * Log admin action with comprehensive details
 * @param {string} adminId - Admin user ID
 * @param {string} action - Action performed
 * @param {string} resourceType - Type of resource affected
 * @param {string} resourceId - ID of affected resource
 * @param {Object} metadata - Additional action details
 * @returns {Object} Created audit log entry
 */
const logAdminAction = async (adminId, action, resourceType, resourceId, metadata = {}) => {
  try {
    const auditEntry = {
      admin_id: adminId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        user_agent: metadata.user_agent || 'Admin API',
        ip_address: metadata.ip_address || 'Unknown'
      },
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('admin_actions')
      .insert(auditEntry)
      .select()
      .single();

    if (error) {
      console.error('Audit logging error:', error);
      // Don't throw error to prevent breaking main functionality
      return null;
    }

    return data;
  } catch (error) {
    console.error('Audit service error:', error);
    return null;
  }
};

/**
 * Get audit logs with filtering and pagination
 * @param {Object} options - Query options
 * @returns {Object} Audit logs with pagination
 */
const getAuditLogs = async (options) => {
  const {
    page = 1,
    limit = 50,
    user_id,
    action,
    date_from,
    date_to,
    resource_type
  } = options;
  
  const offset = (page - 1) * limit;

  let query = supabase
    .from('admin_actions')
    .select(`
      id,
      admin_id,
      action,
      resource_type,
      resource_id,
      metadata,
      created_at,
      admin:profiles!admin_actions_admin_id_fkey(first_name, last_name, email, role)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply filters
  if (user_id) query = query.eq('admin_id', user_id);
  if (action) query = query.ilike('action', `%${action}%`);
  if (resource_type) query = query.eq('resource_type', resource_type);
  if (date_from) query = query.gte('created_at', date_from);
  if (date_to) query = query.lte('created_at', date_to);

  const { data, error, count } = await query;

  if (error) throw error;

  // Enhance data with readable action descriptions
  const enhancedData = data.map(log => ({
    ...log,
    action_description: getActionDescription(log.action, log.resource_type, log.metadata),
    severity: getActionSeverity(log.action),
    category: getActionCategory(log.action)
  }));

  return {
    data: enhancedData,
    pagination: {
      page,
      limit,
      total: count,
      pages: Math.ceil(count / limit)
    },
    summary: {
      total_actions: count,
      unique_admins: [...new Set(data.map(log => log.admin_id))].length,
      actions_today: data.filter(log => {
        const today = new Date().toDateString();
        return new Date(log.created_at).toDateString() === today;
      }).length
    }
  };
};

/**
 * Get action description in human-readable format
 * @param {string} action - Action type
 * @param {string} resourceType - Resource type
 * @param {Object} metadata - Action metadata
 * @returns {string} Human-readable description
 */
const getActionDescription = (action, resourceType, metadata) => {
  const descriptions = {
    // User Management
    'GET_ALL_USERS': 'Viewed all users list',
    'UPDATE_USER_PROFILE': `Updated user profile for ${metadata.target_user || 'user'}`,
    'CHANGE_USER_ROLE': `Changed user role from ${metadata.old_role} to ${metadata.new_role}`,
    'DISABLE_USER_ACCOUNT': `Disabled user account: ${metadata.reason || 'No reason provided'}`,

    // Booking Management
    'GET_ALL_BOOKINGS': 'Viewed all bookings',
    'UPDATE_BOOKING': `Updated booking #${metadata.resource_id}`,
    'CANCEL_BOOKING': `Cancelled booking: ${metadata.reason || 'Admin cancellation'}`,

    // Payment Management
    'GET_ALL_PAYMENTS': 'Viewed all payments',
    'APPROVE_PAYMENT': `Approved payment of ${metadata.amount} ${metadata.currency || 'USD'}`,
    'REJECT_PAYMENT': `Rejected payment: ${metadata.reason}`,

    // Service Management
    'GET_ALL_SERVICES': 'Viewed all services',
    'UPDATE_SERVICE': `Updated service configuration`,

    // Reader Management
    'GET_ALL_READERS': 'Viewed all readers',

    // Analytics
    'GET_ANALYTICS': 'Generated analytics report',

    // Audit Logs
    'GET_AUDIT_LOGS': 'Viewed audit logs',

    // Complaints
    'GET_ALL_COMPLAINTS': 'Viewed all complaints',
    'RESOLVE_COMPLAINT': `Resolved complaint: ${metadata.resolution_action || 'No action specified'}`
  };

  return descriptions[action] || `Performed ${action} on ${resourceType}`;
};

/**
 * Get action severity level
 * @param {string} action - Action type
 * @returns {string} Severity level
 */
const getActionSeverity = (action) => {
  const highRiskActions = [
    'DISABLE_USER_ACCOUNT',
    'CHANGE_USER_ROLE',
    'CANCEL_BOOKING',
    'REJECT_PAYMENT'
  ];

  const mediumRiskActions = [
    'UPDATE_USER_PROFILE',
    'UPDATE_BOOKING',
    'APPROVE_PAYMENT',
    'UPDATE_SERVICE',
    'RESOLVE_COMPLAINT'
  ];

  if (highRiskActions.includes(action)) return 'high';
  if (mediumRiskActions.includes(action)) return 'medium';
  return 'low';
};

/**
 * Get action category
 * @param {string} action - Action type
 * @returns {string} Action category
 */
const getActionCategory = (action) => {
  if (action.includes('USER')) return 'User Management';
  if (action.includes('BOOKING')) return 'Booking Management';
  if (action.includes('PAYMENT')) return 'Payment Management';
  if (action.includes('SERVICE')) return 'Service Management';
  if (action.includes('READER')) return 'Reader Management';
  if (action.includes('ANALYTICS')) return 'Analytics';
  if (action.includes('AUDIT')) return 'Audit';
  if (action.includes('COMPLAINT')) return 'Support';
  return 'System';
};

/**
 * Generate audit summary for dashboard
 * @param {number} days - Number of days to include in summary
 * @returns {Object} Audit summary statistics
 */
const getAuditSummary = async (days = 7) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: recentActions, error } = await supabase
    .from('admin_actions')
    .select(`
      id,
      admin_id,
      action,
      resource_type,
      created_at,
      admin:profiles!admin_actions_admin_id_fkey(first_name, last_name)
    `)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Calculate statistics
  const totalActions = recentActions.length;
  const uniqueAdmins = [...new Set(recentActions.map(a => a.admin_id))];
  
  // Group by action type
  const actionsByType = recentActions.reduce((acc, action) => {
    const category = getActionCategory(action.action);
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

  // Group by admin
  const actionsByAdmin = recentActions.reduce((acc, action) => {
    const adminName = action.admin ? `${action.admin.first_name} ${action.admin.last_name}` : 'Unknown';
    acc[adminName] = (acc[adminName] || 0) + 1;
    return acc;
  }, {});

  // High-risk actions
  const highRiskActions = recentActions.filter(action => 
    getActionSeverity(action.action) === 'high'
  );

  // Daily breakdown
  const dailyBreakdown = {};
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toDateString();
    
    dailyBreakdown[dateStr] = recentActions.filter(action => 
      new Date(action.created_at).toDateString() === dateStr
    ).length;
  }

  return {
    period: `Last ${days} days`,
    total_actions: totalActions,
    unique_admins: uniqueAdmins.length,
    high_risk_actions: highRiskActions.length,
    actions_by_category: actionsByType,
    actions_by_admin: actionsByAdmin,
    daily_breakdown: dailyBreakdown,
    most_active_admin: Object.entries(actionsByAdmin)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'None',
    recent_high_risk: highRiskActions.slice(0, 5).map(action => ({
      action: action.action,
      admin: action.admin ? `${action.admin.first_name} ${action.admin.last_name}` : 'Unknown',
      timestamp: action.created_at,
      description: getActionDescription(action.action, action.resource_type, {})
    }))
  };
};

/**
 * Check for suspicious admin activity
 * @param {string} adminId - Admin user ID to check
 * @param {number} hours - Time window in hours
 * @returns {Object} Suspicious activity analysis
 */
const checkSuspiciousActivity = async (adminId, hours = 24) => {
  const startDate = new Date();
  startDate.setHours(startDate.getHours() - hours);

  const { data: recentActions, error } = await supabase
    .from('admin_actions')
    .select('*')
    .eq('admin_id', adminId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Analyze patterns
  const totalActions = recentActions.length;
  const highRiskActions = recentActions.filter(action => 
    getActionSeverity(action.action) === 'high'
  );
  
  const uniqueResources = [...new Set(recentActions.map(a => a.resource_id))];
  const timeSpread = recentActions.length > 1 ? 
    (new Date(recentActions[0].created_at) - new Date(recentActions[recentActions.length - 1].created_at)) / (1000 * 60) : 0;

  // Flags for suspicious activity
  const flags = [];
  
  if (totalActions > 100) flags.push('HIGH_VOLUME_ACTIONS');
  if (highRiskActions.length > 10) flags.push('EXCESSIVE_HIGH_RISK_ACTIONS');
  if (timeSpread < 60 && totalActions > 20) flags.push('RAPID_FIRE_ACTIONS');
  if (uniqueResources.length < totalActions * 0.1) flags.push('REPETITIVE_TARGETING');

  const riskLevel = flags.length === 0 ? 'low' : 
                   flags.length <= 2 ? 'medium' : 'high';

  return {
    admin_id: adminId,
    period: `Last ${hours} hours`,
    total_actions: totalActions,
    high_risk_actions: highRiskActions.length,
    risk_level: riskLevel,
    flags,
    recommendations: generateSecurityRecommendations(flags),
    recent_actions: recentActions.slice(0, 10).map(action => ({
      action: action.action,
      resource_type: action.resource_type,
      timestamp: action.created_at,
      severity: getActionSeverity(action.action)
    }))
  };
};

/**
 * Generate security recommendations based on flags
 * @param {Array} flags - Security flags
 * @returns {Array} Security recommendations
 */
const generateSecurityRecommendations = (flags) => {
  const recommendations = [];

  if (flags.includes('HIGH_VOLUME_ACTIONS')) {
    recommendations.push('Consider implementing rate limiting for admin actions');
  }
  
  if (flags.includes('EXCESSIVE_HIGH_RISK_ACTIONS')) {
    recommendations.push('Review admin permissions and consider additional approval workflows');
  }
  
  if (flags.includes('RAPID_FIRE_ACTIONS')) {
    recommendations.push('Implement mandatory delays between sensitive actions');
  }
  
  if (flags.includes('REPETITIVE_TARGETING')) {
    recommendations.push('Investigate potential automated or malicious behavior');
  }

  if (recommendations.length === 0) {
    recommendations.push('Activity appears normal, continue monitoring');
  }

  return recommendations;
};

/**
 * Export audit data for compliance
 * @param {Object} options - Export options
 * @returns {Object} Formatted audit data for export
 */
const exportAuditData = async (options) => {
  const {
    date_from,
    date_to,
    admin_id,
    include_metadata = true
  } = options;

  let query = supabase
    .from('admin_actions')
    .select(`
      id,
      admin_id,
      action,
      resource_type,
      resource_id,
      ${include_metadata ? 'metadata,' : ''}
      created_at,
      admin:profiles!admin_actions_admin_id_fkey(first_name, last_name, email, role)
    `)
    .order('created_at', { ascending: true });

  if (date_from) query = query.gte('created_at', date_from);
  if (date_to) query = query.lte('created_at', date_to);
  if (admin_id) query = query.eq('admin_id', admin_id);

  const { data, error } = await query;

  if (error) throw error;

  // Format for export
  const exportData = data.map(log => ({
    audit_id: log.id,
    timestamp: log.created_at,
    admin_name: log.admin ? `${log.admin.first_name} ${log.admin.last_name}` : 'Unknown',
    admin_email: log.admin?.email || 'Unknown',
    admin_role: log.admin?.role || 'Unknown',
    action: log.action,
    action_description: getActionDescription(log.action, log.resource_type, log.metadata || {}),
    resource_type: log.resource_type,
    resource_id: log.resource_id,
    severity: getActionSeverity(log.action),
    category: getActionCategory(log.action),
    ...(include_metadata && log.metadata ? { metadata: JSON.stringify(log.metadata) } : {})
  }));

  return {
    export_info: {
      generated_at: new Date().toISOString(),
      total_records: exportData.length,
      date_range: { date_from, date_to },
      admin_filter: admin_id,
      includes_metadata: include_metadata
    },
    data: exportData
  };
};

module.exports = {
  logAdminAction,
  getAuditLogs,
  getAuditSummary,
  checkSuspiciousActivity,
  exportAuditData,
  getActionDescription,
  getActionSeverity,
  getActionCategory
}; 