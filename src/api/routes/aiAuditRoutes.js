// =====================================================
// SAMIA TAROT - AI AUDIT LOGGING ROUTES
// CRITICAL: MONITORS ALL AI CONTENT ACCESS ATTEMPTS
// =====================================================

import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { aiContentFilter } from '../middleware/aiContentFilter.js';

const router = express.Router();

// Apply AI content filtering to all routes
router.use(aiContentFilter);

/**
 * Log AI content access attempt from frontend components
 * POST /api/ai-audit/log-access
 */
router.post('/log-access', authenticateToken, async (req, res) => {
  try {
    const {
      component,
      user_role,
      ai_fields_present,
      access_granted,
      timestamp,
      metadata
    } = req.body;

    const user = req.user;
    const endpoint = req.originalUrl;
    const ip = req.ip || req.connection?.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Log to database using the stored procedure
    const { data, error } = await supabaseAdmin
      .rpc('log_ai_access_attempt', {
        p_endpoint: `frontend:${component}`,
        p_action: 'VIEW',
        p_table_name: component,
        p_ai_fields: ai_fields_present || [],
        p_success: access_granted,
        p_denial_reason: access_granted ? null : `Unauthorized role: ${user_role}`,
        p_ip_address: ip,
        p_user_agent: userAgent,
        p_session_id: req.sessionID || req.headers['x-session-id'],
        p_metadata: {
          component,
          user_role,
          frontend_timestamp: timestamp,
          ...metadata
        }
      });

    if (error) {
      console.error('❌ [AI_AUDIT] Failed to log frontend access:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to log access attempt',
        code: 'AUDIT_LOG_FAILED'
      });
    }

    // Console logging for immediate monitoring
    const logLevel = access_granted ? 'INFO' : 'WARN';
    const logMessage = `[${logLevel}] AI Access: ${component} - User: ${user.id} (${user_role}) - ${access_granted ? 'ALLOWED' : 'DENIED'}`;
    
    if (access_granted) {
      console.log(`✅ ${logMessage}`);
    } else {
      console.warn(`🚫 ${logMessage}`);
    }

    res.json({
      success: true,
      logged: true,
      log_id: data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [AI_AUDIT] Error in log-access endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'AUDIT_SYSTEM_ERROR'
    });
  }
});

/**
 * Get AI access audit logs (Admin only)
 * GET /api/ai-audit/logs
 */
router.get('/logs', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const {
      user_id,
      role,
      success,
      endpoint,
      start_date,
      end_date,
      limit = 100,
      offset = 0
    } = req.query;

    let query = supabaseAdmin
      .from('ai_content_access_log')
      .select(`
        id,
        user_id,
        role,
        endpoint,
        action,
        table_name,
        ai_fields_accessed,
        success,
        denial_reason,
        ip_address,
        user_agent,
        session_id,
        timestamp,
        metadata,
        profiles:user_id (
          first_name,
          last_name,
          email
        )
      `)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (user_id) query = query.eq('user_id', user_id);
    if (role) query = query.eq('role', role);
    if (success !== undefined) query = query.eq('success', success === 'true');
    if (endpoint) query = query.ilike('endpoint', `%${endpoint}%`);
    if (start_date) query = query.gte('timestamp', start_date);
    if (end_date) query = query.lte('timestamp', end_date);

    const { data: logs, error } = await query;

    if (error) {
      console.error('❌ [AI_AUDIT] Failed to fetch logs:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch audit logs',
        code: 'AUDIT_FETCH_FAILED'
      });
    }

    // Get summary statistics
    const { data: stats, error: statsError } = await supabaseAdmin
      .from('ai_content_access_log')
      .select('success, role')
      .gte('timestamp', start_date || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const summary = {
      total_attempts: stats?.length || 0,
      successful_attempts: stats?.filter(s => s.success).length || 0,
      denied_attempts: stats?.filter(s => !s.success).length || 0,
      role_breakdown: stats?.reduce((acc, curr) => {
        acc[curr.role] = (acc[curr.role] || 0) + 1;
        return acc;
      }, {}) || {}
    };

    res.json({
      success: true,
      data: {
        logs,
        summary,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: logs?.length || 0
        }
      }
    });

  } catch (error) {
    console.error('❌ [AI_AUDIT] Error fetching logs:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'AUDIT_SYSTEM_ERROR'
    });
  }
});

/**
 * Get AI access security alerts (Admin only)
 * GET /api/ai-audit/alerts
 */
router.get('/alerts', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    // Get recent denied attempts
    const { data: deniedAttempts, error: deniedError } = await supabaseAdmin
      .from('ai_content_access_log')
      .select(`
        id,
        user_id,
        role,
        endpoint,
        denial_reason,
        ip_address,
        timestamp,
        profiles:user_id (
          first_name,
          last_name,
          email
        )
      `)
      .eq('success', false)
      .gte('timestamp', startTime)
      .order('timestamp', { ascending: false })
      .limit(50);

    if (deniedError) {
      console.error('❌ [AI_AUDIT] Failed to fetch alerts:', deniedError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch security alerts',
        code: 'AUDIT_ALERTS_FAILED'
      });
    }

    // Analyze patterns for suspicious activity
    const suspiciousPatterns = [];
    const ipCounts = {};
    const userCounts = {};

    deniedAttempts?.forEach(attempt => {
      // Count by IP
      ipCounts[attempt.ip_address] = (ipCounts[attempt.ip_address] || 0) + 1;
      
      // Count by user
      if (attempt.user_id) {
        userCounts[attempt.user_id] = (userCounts[attempt.user_id] || 0) + 1;
      }
    });

    // Flag suspicious IPs (more than 10 attempts)
    Object.entries(ipCounts).forEach(([ip, count]) => {
      if (count > 10) {
        suspiciousPatterns.push({
          type: 'suspicious_ip',
          value: ip,
          count,
          severity: count > 50 ? 'critical' : count > 25 ? 'high' : 'medium',
          description: `IP ${ip} made ${count} unauthorized AI access attempts`
        });
      }
    });

    // Flag suspicious users (more than 5 attempts)
    Object.entries(userCounts).forEach(([userId, count]) => {
      if (count > 5) {
        const userAttempts = deniedAttempts.filter(a => a.user_id === userId);
        const user = userAttempts[0]?.profiles;
        suspiciousPatterns.push({
          type: 'suspicious_user',
          value: userId,
          count,
          severity: count > 20 ? 'critical' : count > 10 ? 'high' : 'medium',
          description: `User ${user?.email || userId} made ${count} unauthorized AI access attempts`,
          user_info: user
        });
      }
    });

    res.json({
      success: true,
      data: {
        recent_denied_attempts: deniedAttempts,
        suspicious_patterns: suspiciousPatterns,
        summary: {
          total_denied: deniedAttempts?.length || 0,
          unique_ips: Object.keys(ipCounts).length,
          unique_users: Object.keys(userCounts).length,
          critical_alerts: suspiciousPatterns.filter(p => p.severity === 'critical').length,
          high_alerts: suspiciousPatterns.filter(p => p.severity === 'high').length
        },
        time_range: {
          start: startTime,
          end: new Date().toISOString(),
          hours: parseInt(hours)
        }
      }
    });

  } catch (error) {
    console.error('❌ [AI_AUDIT] Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'AUDIT_SYSTEM_ERROR'
    });
  }
});

/**
 * Export audit logs (Admin only)
 * GET /api/ai-audit/export
 */
router.get('/export', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { format = 'json', start_date, end_date } = req.query;

    let query = supabaseAdmin
      .from('ai_content_access_log')
      .select(`
        id,
        user_id,
        role,
        endpoint,
        action,
        table_name,
        ai_fields_accessed,
        success,
        denial_reason,
        ip_address,
        timestamp,
        metadata,
        profiles:user_id (
          first_name,
          last_name,
          email
        )
      `)
      .order('timestamp', { ascending: false });

    if (start_date) query = query.gte('timestamp', start_date);
    if (end_date) query = query.lte('timestamp', end_date);

    const { data: logs, error } = await query;

    if (error) {
      console.error('❌ [AI_AUDIT] Failed to export logs:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to export audit logs',
        code: 'AUDIT_EXPORT_FAILED'
      });
    }

    if (format === 'csv') {
      // Convert to CSV format
      const csvHeaders = [
        'ID', 'User ID', 'Role', 'Endpoint', 'Action', 'Table', 'AI Fields',
        'Success', 'Denial Reason', 'IP Address', 'Timestamp', 'User Email'
      ];
      
      const csvRows = logs.map(log => [
        log.id,
        log.user_id || '',
        log.role,
        log.endpoint,
        log.action,
        log.table_name,
        log.ai_fields_accessed?.join(';') || '',
        log.success,
        log.denial_reason || '',
        log.ip_address || '',
        log.timestamp,
        log.profiles?.email || ''
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="ai_audit_logs_${new Date().toISOString().split('T')[0]}.csv"`);
      return res.send(csvContent);
    }

    // Default JSON format
    res.json({
      success: true,
      data: {
        logs,
        export_info: {
          total_records: logs.length,
          exported_at: new Date().toISOString(),
          date_range: {
            start: start_date || 'all',
            end: end_date || 'all'
          }
        }
      }
    });

  } catch (error) {
    console.error('❌ [AI_AUDIT] Error exporting logs:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'AUDIT_SYSTEM_ERROR'
    });
  }
});

/**
 * Health check for audit system
 * GET /api/ai-audit/health
 */
router.get('/health', async (req, res) => {
  try {
    // Test database connectivity
    const { data, error } = await supabaseAdmin
      .from('ai_content_access_log')
      .select('id')
      .limit(1);

    if (error) {
      return res.status(503).json({
        success: false,
        status: 'unhealthy',
        error: 'Database connection failed',
        details: error.message
      });
    }

    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      audit_logging: 'active'
    });

  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

export default router; 