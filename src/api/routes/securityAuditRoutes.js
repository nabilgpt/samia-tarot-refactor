// =============================================================================
// SECURITY AUDIT API ROUTES
// SAMIA TAROT - Comprehensive Security Monitoring & Audit Management
// =============================================================================
// Date: 2025-07-13
// Purpose: Complete API routes for security audit system
// Security: Role-based access, audit logging, real-time monitoring
// =============================================================================

import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import securityAuditService from '../services/securityAuditService.js';
import auditService from '../services/auditService.js';
import { supabaseAdmin } from '../lib/supabase.js';

const router = express.Router();

// =============================================================================
// SECURITY EVENT LOGGING ENDPOINTS
// =============================================================================

/**
 * POST /api/security-audit/events
 * Log a security event
 */
router.post('/events', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const {
      event_type,
      metadata,
      ip_address,
      user_agent,
      endpoint,
      method,
      status_code,
      response_time
    } = req.body;

    // Validate required fields
    if (!event_type) {
      return res.status(400).json({
        success: false,
        error: 'Event type is required'
      });
    }

    // Prepare event data
    const eventData = {
      user_id: req.user.id,
      session_id: req.headers['x-session-id'] || req.sessionID,
      ip_address: ip_address || req.ip,
      user_agent: user_agent || req.get('User-Agent'),
      event_type,
      metadata: metadata || {},
      endpoint,
      method,
      status_code,
      response_time
    };

    // Log the security event
    const result = await securityAuditService.logSecurityEvent(eventData);

    if (result.success) {
      // Log admin action for audit trail
      await auditService.logAdminAction(
        req.user.id,
        'SECURITY_EVENT_LOGGED',
        'security_event',
        result.audit_id,
        {
          event_type,
          security_level: result.security_level,
          risk_score: result.risk_score,
          ip_address: eventData.ip_address,
          user_agent: eventData.user_agent
        }
      );

      res.json({
        success: true,
        message: 'Security event logged successfully',
        data: {
          audit_id: result.audit_id,
          security_level: result.security_level,
          risk_score: result.risk_score,
          threat_analysis: result.threat_analysis
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to log security event'
      });
    }

  } catch (error) {
    console.error('❌ [SECURITY-AUDIT-API] Error logging security event:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/security-audit/events
 * Get security audit logs with filtering and pagination
 */
router.get('/events', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      user_id,
      event_type,
      security_level,
      threat_type,
      date_from,
      date_to,
      ip_address,
      min_risk_score,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;

    // Build query
    let query = supabaseAdmin
      .from('security_audit_logs')
      .select(`
        id,
        user_id,
        session_id,
        ip_address,
        user_agent,
        event_type,
        security_level,
        threat_type,
        risk_score,
        endpoint,
        method,
        status_code,
        response_time,
        geolocation,
        device_fingerprint,
        compliance_flags,
        threat_indicators,
        created_at,
        expires_at,
        user:profiles!security_audit_logs_user_id_fkey(first_name, last_name, email, role)
      `, { count: 'exact' })
      .order(sort_by, { ascending: sort_order === 'asc' })
      .range((page - 1) * limit, page * limit - 1);

    // Apply filters
    if (user_id) query = query.eq('user_id', user_id);
    if (event_type) query = query.eq('event_type', event_type);
    if (security_level) query = query.eq('security_level', security_level);
    if (threat_type) query = query.eq('threat_type', threat_type);
    if (ip_address) query = query.eq('ip_address', ip_address);
    if (min_risk_score) query = query.gte('risk_score', min_risk_score);
    if (date_from) query = query.gte('created_at', date_from);
    if (date_to) query = query.lte('created_at', date_to);

    const { data: events, error, count } = await query;

    if (error) throw error;

    // Log admin action
    await auditService.logAdminAction(
      req.user.id,
      'SECURITY_EVENTS_VIEWED',
      'security_audit_logs',
      null,
      {
        filters: { user_id, event_type, security_level, threat_type, date_from, date_to },
        page,
        limit,
        total_results: count
      }
    );

    res.json({
      success: true,
      data: {
        events,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    console.error('❌ [SECURITY-AUDIT-API] Error getting security events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve security events'
    });
  }
});

/**
 * GET /api/security-audit/events/:id
 * Get specific security event details
 */
router.get('/events/:id', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const { data: event, error } = await supabaseAdmin
      .from('security_audit_logs')
      .select(`
        *,
        user:profiles!security_audit_logs_user_id_fkey(first_name, last_name, email, role)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Security event not found'
      });
    }

    // Decrypt metadata if needed
    if (event.encrypted_metadata) {
      try {
        event.metadata = await securityAuditService.decryptAuditData(event.encrypted_metadata);
      } catch (decryptError) {
        console.error('❌ [SECURITY-AUDIT-API] Error decrypting metadata:', decryptError);
        event.metadata = {};
      }
    }

    // Log admin action
    await auditService.logAdminAction(
      req.user.id,
      'SECURITY_EVENT_VIEWED',
      'security_audit_logs',
      id,
      {
        event_type: event.event_type,
        security_level: event.security_level,
        risk_score: event.risk_score
      }
    );

    res.json({
      success: true,
      data: event
    });

  } catch (error) {
    console.error('❌ [SECURITY-AUDIT-API] Error getting security event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve security event'
    });
  }
});

// =============================================================================
// SECURITY ALERTS ENDPOINTS
// =============================================================================

/**
 * GET /api/security-audit/alerts
 * Get security alerts with filtering and pagination
 */
router.get('/alerts', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      severity,
      status = 'active',
      assigned_to,
      date_from,
      date_to,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;

    // Build query
    let query = supabaseAdmin
      .from('security_alerts')
      .select(`
        id,
        alert_type,
        severity,
        title,
        description,
        user_id,
        ip_address,
        risk_score,
        threat_indicators,
        status,
        assigned_to,
        resolution_notes,
        resolved_at,
        created_at,
        updated_at,
        user:profiles!security_alerts_user_id_fkey(first_name, last_name, email, role),
        assignee:profiles!security_alerts_assigned_to_fkey(first_name, last_name, email, role)
      `, { count: 'exact' })
      .order(sort_by, { ascending: sort_order === 'asc' })
      .range((page - 1) * limit, page * limit - 1);

    // Apply filters
    if (severity) query = query.eq('severity', severity);
    if (status) query = query.eq('status', status);
    if (assigned_to) query = query.eq('assigned_to', assigned_to);
    if (date_from) query = query.gte('created_at', date_from);
    if (date_to) query = query.lte('created_at', date_to);

    const { data: alerts, error, count } = await query;

    if (error) throw error;

    // Log admin action
    await auditService.logAdminAction(
      req.user.id,
      'SECURITY_ALERTS_VIEWED',
      'security_alerts',
      null,
      {
        filters: { severity, status, assigned_to, date_from, date_to },
        page,
        limit,
        total_results: count
      }
    );

    res.json({
      success: true,
      data: {
        alerts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    console.error('❌ [SECURITY-AUDIT-API] Error getting security alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve security alerts'
    });
  }
});

/**
 * PUT /api/security-audit/alerts/:id
 * Update security alert (assign, resolve, etc.)
 */
router.put('/alerts/:id', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assigned_to, resolution_notes } = req.body;

    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (status) updateData.status = status;
    if (assigned_to) updateData.assigned_to = assigned_to;
    if (resolution_notes) updateData.resolution_notes = resolution_notes;

    if (status === 'resolved') {
      updateData.resolved_at = new Date().toISOString();
    }

    const { data: alert, error } = await supabaseAdmin
      .from('security_alerts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Security alert not found'
      });
    }

    // Log admin action
    await auditService.logAdminAction(
      req.user.id,
      'SECURITY_ALERT_UPDATED',
      'security_alerts',
      id,
      {
        previous_status: alert.status,
        new_status: status,
        assigned_to,
        resolution_notes
      }
    );

    res.json({
      success: true,
      message: 'Security alert updated successfully',
      data: alert
    });

  } catch (error) {
    console.error('❌ [SECURITY-AUDIT-API] Error updating security alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update security alert'
    });
  }
});

// =============================================================================
// SECURITY INCIDENTS ENDPOINTS
// =============================================================================

/**
 * GET /api/security-audit/incidents
 * Get security incidents with filtering and pagination
 */
router.get('/incidents', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      incident_type,
      severity,
      status,
      assigned_to,
      date_from,
      date_to,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;

    // Build query
    let query = supabaseAdmin
      .from('security_incidents')
      .select(`
        id,
        incident_type,
        severity,
        title,
        description,
        affected_users,
        affected_ips,
        event_count,
        first_seen,
        last_seen,
        status,
        assigned_to,
        containment_actions,
        resolution_summary,
        lessons_learned,
        created_at,
        updated_at,
        assignee:profiles!security_incidents_assigned_to_fkey(first_name, last_name, email, role)
      `, { count: 'exact' })
      .order(sort_by, { ascending: sort_order === 'asc' })
      .range((page - 1) * limit, page * limit - 1);

    // Apply filters
    if (incident_type) query = query.eq('incident_type', incident_type);
    if (severity) query = query.eq('severity', severity);
    if (status) query = query.eq('status', status);
    if (assigned_to) query = query.eq('assigned_to', assigned_to);
    if (date_from) query = query.gte('first_seen', date_from);
    if (date_to) query = query.lte('last_seen', date_to);

    const { data: incidents, error, count } = await query;

    if (error) throw error;

    // Log admin action
    await auditService.logAdminAction(
      req.user.id,
      'SECURITY_INCIDENTS_VIEWED',
      'security_incidents',
      null,
      {
        filters: { incident_type, severity, status, assigned_to, date_from, date_to },
        page,
        limit,
        total_results: count
      }
    );

    res.json({
      success: true,
      data: {
        incidents,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    console.error('❌ [SECURITY-AUDIT-API] Error getting security incidents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve security incidents'
    });
  }
});

/**
 * POST /api/security-audit/incidents
 * Create new security incident
 */
router.post('/incidents', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const {
      incident_type,
      severity,
      title,
      description,
      affected_users,
      affected_ips,
      event_count = 1
    } = req.body;

    // Validate required fields
    if (!incident_type || !severity || !title) {
      return res.status(400).json({
        success: false,
        error: 'Incident type, severity, and title are required'
      });
    }

    const incidentData = {
      incident_type,
      severity,
      title,
      description,
      affected_users: affected_users || [],
      affected_ips: affected_ips || [],
      event_count,
      assigned_to: req.user.id // Auto-assign to creator
    };

    const { data: incident, error } = await supabaseAdmin
      .from('security_incidents')
      .insert(incidentData)
      .select()
      .single();

    if (error) throw error;

    // Log admin action
    await auditService.logAdminAction(
      req.user.id,
      'SECURITY_INCIDENT_CREATED',
      'security_incidents',
      incident.id,
      {
        incident_type,
        severity,
        title,
        affected_users: affected_users?.length || 0,
        affected_ips: affected_ips?.length || 0
      }
    );

    res.status(201).json({
      success: true,
      message: 'Security incident created successfully',
      data: incident
    });

  } catch (error) {
    console.error('❌ [SECURITY-AUDIT-API] Error creating security incident:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create security incident'
    });
  }
});

/**
 * PUT /api/security-audit/incidents/:id
 * Update security incident
 */
router.put('/incidents/:id', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status,
      assigned_to,
      containment_actions,
      resolution_summary,
      lessons_learned
    } = req.body;

    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (status) updateData.status = status;
    if (assigned_to) updateData.assigned_to = assigned_to;
    if (containment_actions) updateData.containment_actions = containment_actions;
    if (resolution_summary) updateData.resolution_summary = resolution_summary;
    if (lessons_learned) updateData.lessons_learned = lessons_learned;

    const { data: incident, error } = await supabaseAdmin
      .from('security_incidents')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!incident) {
      return res.status(404).json({
        success: false,
        error: 'Security incident not found'
      });
    }

    // Log admin action
    await auditService.logAdminAction(
      req.user.id,
      'SECURITY_INCIDENT_UPDATED',
      'security_incidents',
      id,
      {
        updated_fields: Object.keys(updateData),
        new_status: status,
        assigned_to
      }
    );

    res.json({
      success: true,
      message: 'Security incident updated successfully',
      data: incident
    });

  } catch (error) {
    console.error('❌ [SECURITY-AUDIT-API] Error updating security incident:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update security incident'
    });
  }
});

// =============================================================================
// SECURITY DASHBOARD ENDPOINTS
// =============================================================================

/**
 * GET /api/security-audit/dashboard
 * Get security dashboard summary
 */
router.get('/dashboard', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    // Get dashboard summary using database function
    const { data: summary, error } = await supabaseAdmin
      .rpc('get_security_dashboard_summary');

    if (error) throw error;

    // Get additional dashboard data
    const [
      { data: recentAlerts },
      { data: topThreats },
      { data: riskDistribution }
    ] = await Promise.all([
      // Recent alerts
      supabaseAdmin
        .from('security_alerts')
        .select('id, severity, title, created_at')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(5),

      // Top threat IPs
      supabaseAdmin
        .from('security_audit_logs')
        .select('ip_address, risk_score')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .gte('risk_score', 50)
        .order('risk_score', { ascending: false })
        .limit(5),

      // Risk score distribution
      supabaseAdmin
        .from('security_audit_logs')
        .select('security_level')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    ]);

    // Process risk distribution
    const riskCounts = riskDistribution?.reduce((acc, log) => {
      acc[log.security_level] = (acc[log.security_level] || 0) + 1;
      return acc;
    }, {}) || {};

    // Log admin action
    await auditService.logAdminAction(
      req.user.id,
      'SECURITY_DASHBOARD_VIEWED',
      'security_dashboard',
      null,
      {
        summary_data: summary,
        view_timestamp: new Date().toISOString()
      }
    );

    res.json({
      success: true,
      data: {
        summary,
        recent_alerts: recentAlerts || [],
        top_threats: topThreats || [],
        risk_distribution: riskCounts,
        last_updated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ [SECURITY-AUDIT-API] Error getting security dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve security dashboard'
    });
  }
});

/**
 * GET /api/security-audit/metrics
 * Get security metrics for specified period
 */
router.get('/metrics', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const {
      period = '7d', // 1d, 7d, 30d, 90d
      metric_type = 'all' // all, events, threats, compliance
    } = req.query;

    // Calculate date range
    const periodDays = {
      '1d': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90
    };

    const days = periodDays[period] || 7;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    // Get metrics data
    const { data: metrics, error } = await supabaseAdmin
      .from('security_metrics')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) throw error;

    // Process metrics based on type
    let processedMetrics = metrics;

    if (metric_type === 'events') {
      processedMetrics = metrics.map(m => ({
        date: m.date,
        total_events: m.total_events,
        low_risk_events: m.low_risk_events,
        medium_risk_events: m.medium_risk_events,
        high_risk_events: m.high_risk_events,
        critical_risk_events: m.critical_risk_events
      }));
    } else if (metric_type === 'threats') {
      processedMetrics = metrics.map(m => ({
        date: m.date,
        failed_authentications: m.failed_authentications,
        privilege_escalations: m.privilege_escalations,
        threat_types: m.threat_types
      }));
    } else if (metric_type === 'compliance') {
      processedMetrics = metrics.map(m => ({
        date: m.date,
        compliance_events: m.compliance_events,
        data_access_events: m.data_access_events
      }));
    }

    // Log admin action
    await auditService.logAdminAction(
      req.user.id,
      'SECURITY_METRICS_VIEWED',
      'security_metrics',
      null,
      {
        period,
        metric_type,
        date_range: { start: startDate, end: endDate },
        records_returned: processedMetrics.length
      }
    );

    res.json({
      success: true,
      data: {
        metrics: processedMetrics,
        period,
        metric_type,
        date_range: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        }
      }
    });

  } catch (error) {
    console.error('❌ [SECURITY-AUDIT-API] Error getting security metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve security metrics'
    });
  }
});

// =============================================================================
// SECURITY REPORTS ENDPOINTS
// =============================================================================

/**
 * POST /api/security-audit/reports/generate
 * Generate comprehensive security report
 */
router.post('/reports/generate', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const {
      report_type = 'comprehensive',
      date_from,
      date_to,
      include_details = false,
      format = 'json'
    } = req.body;

    // Set default date range if not provided
    const defaultDateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const defaultDateTo = new Date().toISOString();

    const reportOptions = {
      date_from: date_from || defaultDateFrom,
      date_to: date_to || defaultDateTo,
      include_details
    };

    // Generate the report
    const reportResult = await securityAuditService.generateSecurityReport(reportOptions);

    if (!reportResult.success) {
      return res.status(500).json({
        success: false,
        error: reportResult.error || 'Failed to generate security report'
      });
    }

    // Log admin action
    await auditService.logAdminAction(
      req.user.id,
      'SECURITY_REPORT_GENERATED',
      'security_reports',
      reportResult.report.report_id,
      {
        report_type,
        date_range: reportOptions,
        include_details,
        format,
        total_events: reportResult.report.analytics.total_events
      }
    );

    // Return report based on format
    if (format === 'json') {
      res.json({
        success: true,
        message: 'Security report generated successfully',
        data: reportResult.report
      });
    } else {
      // For other formats, you could implement CSV, PDF, etc.
      res.json({
        success: false,
        error: 'Only JSON format is currently supported'
      });
    }

  } catch (error) {
    console.error('❌ [SECURITY-AUDIT-API] Error generating security report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate security report'
    });
  }
});

// =============================================================================
// SECURITY CONFIGURATIONS ENDPOINTS
// =============================================================================

/**
 * GET /api/security-audit/configurations
 * Get security configurations
 */
router.get('/configurations', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    const { category } = req.query;

    let query = supabaseAdmin
      .from('security_configurations')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true });

    if (category) {
      query = query.eq('category', category);
    }

    const { data: configurations, error } = await query;

    if (error) throw error;

    // Log admin action
    await auditService.logAdminAction(
      req.user.id,
      'SECURITY_CONFIGURATIONS_VIEWED',
      'security_configurations',
      null,
      {
        category,
        total_configurations: configurations.length
      }
    );

    res.json({
      success: true,
      data: configurations
    });

  } catch (error) {
    console.error('❌ [SECURITY-AUDIT-API] Error getting security configurations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve security configurations'
    });
  }
});

/**
 * PUT /api/security-audit/configurations/:id
 * Update security configuration
 */
router.put('/configurations/:id', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { config_value, description } = req.body;

    // Get current configuration
    const { data: currentConfig, error: getCurrentError } = await supabaseAdmin
      .from('security_configurations')
      .select('*')
      .eq('id', id)
      .single();

    if (getCurrentError) throw getCurrentError;

    if (!currentConfig) {
      return res.status(404).json({
        success: false,
        error: 'Security configuration not found'
      });
    }

    // Update configuration
    const updateData = {
      config_value,
      description: description || currentConfig.description,
      previous_value: currentConfig.config_value,
      version: currentConfig.version + 1,
      last_modified_by: req.user.id,
      updated_at: new Date().toISOString()
    };

    const { data: updatedConfig, error } = await supabaseAdmin
      .from('security_configurations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log admin action
    await auditService.logAdminAction(
      req.user.id,
      'SECURITY_CONFIGURATION_UPDATED',
      'security_configurations',
      id,
      {
        config_key: currentConfig.config_key,
        previous_value: currentConfig.config_value,
        new_value: config_value,
        version: updateData.version
      }
    );

    res.json({
      success: true,
      message: 'Security configuration updated successfully',
      data: updatedConfig
    });

  } catch (error) {
    console.error('❌ [SECURITY-AUDIT-API] Error updating security configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update security configuration'
    });
  }
});

// =============================================================================
// HEALTH CHECK ENDPOINT
// =============================================================================

/**
 * GET /api/security-audit/health
 * Health check for security audit system
 */
router.get('/health', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    // Check database connectivity
    const { data: dbCheck, error: dbError } = await supabaseAdmin
      .from('security_audit_logs')
      .select('id')
      .limit(1);

    // Check recent activity
    const { data: recentActivity, error: activityError } = await supabaseAdmin
      .from('security_audit_logs')
      .select('id')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .limit(1);

    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database_connectivity: !dbError,
      recent_activity: !activityError && recentActivity?.length > 0,
      services: {
        audit_logging: true,
        threat_detection: true,
        real_time_monitoring: true,
        compliance_tracking: true
      }
    };

    if (dbError || activityError) {
      healthStatus.status = 'degraded';
    }

    res.json({
      success: true,
      data: healthStatus
    });

  } catch (error) {
    console.error('❌ [SECURITY-AUDIT-API] Error checking health:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      data: {
        status: 'unhealthy',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// =============================================================================
// EXPORT ROUTER
// =============================================================================

export default router; 