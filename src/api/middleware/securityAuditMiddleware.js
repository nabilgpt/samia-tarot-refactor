// =============================================================================
// SECURITY AUDIT MIDDLEWARE
// SAMIA TAROT - Automatic Security Event Logging
// =============================================================================
// Date: 2025-07-13
// Purpose: Comprehensive middleware for automatic security event logging
// Security: Real-time threat detection, audit trails, compliance logging
// =============================================================================

import securityAuditService from '../services/securityAuditService.js';

// =============================================================================
// SECURITY EVENT MAPPING
// =============================================================================

const SECURITY_EVENT_MAPPING = {
  // Authentication events
  'POST /api/auth/login': 'authentication_attempt',
  'POST /api/auth/logout': 'authentication_logout',
  'POST /api/auth/refresh': 'token_refresh',
  'POST /api/auth/reset-password': 'password_reset_request',
  'POST /api/auth/change-password': 'password_change',
  
  // Admin actions
  'GET /api/admin/users': 'admin_user_list_access',
  'PUT /api/admin/users': 'admin_user_modification',
  'DELETE /api/admin/users': 'admin_user_deletion',
  'POST /api/admin/users': 'admin_user_creation',
  'GET /api/admin/system-health': 'admin_system_health_check',
  'GET /api/admin/audit-logs': 'admin_audit_log_access',
  
  // Super admin actions
  'GET /api/configuration': 'super_admin_config_access',
  'PUT /api/configuration': 'super_admin_config_modification',
  'POST /api/configuration': 'super_admin_config_creation',
  'DELETE /api/configuration': 'super_admin_config_deletion',
  
  // System secrets access
  'GET /api/system-secrets': 'system_secrets_access',
  'PUT /api/system-secrets': 'system_secrets_modification',
  'POST /api/system-secrets': 'system_secrets_creation',
  'DELETE /api/system-secrets': 'system_secrets_deletion',
  
  // Provider integration
  'GET /api/provider-integration': 'provider_integration_access',
  'POST /api/provider-integration': 'provider_integration_operation',
  'PUT /api/provider-integration': 'provider_integration_modification',
  
  // Sensitive data operations
  'GET /api/dynamic-translation': 'translation_settings_access',
  'PUT /api/dynamic-translation': 'translation_settings_modification',
  'POST /api/dynamic-translation': 'translation_settings_operation',
  
  // Financial operations
  'GET /api/admin/payments': 'financial_data_access',
  'PUT /api/admin/payments': 'financial_data_modification',
  'POST /api/admin/payments': 'financial_transaction',
  
  // User data operations
  'GET /api/admin/bookings': 'user_data_access',
  'PUT /api/admin/bookings': 'user_data_modification',
  'POST /api/admin/bookings': 'user_data_creation',
  
  // Security operations
  'GET /api/security-audit': 'security_audit_access',
  'POST /api/security-audit': 'security_audit_operation',
  'PUT /api/security-audit': 'security_audit_modification'
};

// High-risk endpoints that always generate security events
const HIGH_RISK_ENDPOINTS = [
  '/api/admin/users',
  '/api/configuration',
  '/api/system-secrets',
  '/api/admin/audit-logs',
  '/api/admin/system-health',
  '/api/security-audit'
];

// Authentication-related endpoints
const AUTH_ENDPOINTS = [
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/refresh',
  '/api/auth/reset-password',
  '/api/auth/change-password'
];

// =============================================================================
// SECURITY AUDIT MIDDLEWARE
// =============================================================================

/**
 * Comprehensive security audit middleware
 * Automatically logs security events for all API endpoints
 */
export const securityAuditMiddleware = async (req, res, next) => {
  // Store request start time
  const startTime = Date.now();
  
  // Store original response methods
  const originalSend = res.send.bind(res);
  const originalJson = res.json.bind(res);
  
  // Override response methods to capture response data
  let responseData = null;
  let statusCode = 200;
  
  res.send = function(data) {
    responseData = data;
    statusCode = res.statusCode;
    return originalSend(data);
  };
  
  res.json = function(data) {
    responseData = data;
    statusCode = res.statusCode;
    return originalJson(data);
  };
  
  // Continue to next middleware
  next();
  
  // Log security event after response is sent
  res.on('finish', async () => {
    try {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Determine if this request should generate a security event
      const shouldLogEvent = shouldGenerateSecurityEvent(req, statusCode);
      
      if (shouldLogEvent) {
        // Prepare security event data
        const eventData = {
          user_id: req.user?.id || null,
          session_id: req.sessionID || req.headers['x-session-id'] || null,
          ip_address: getClientIP(req),
          user_agent: req.get('User-Agent') || '',
          event_type: determineEventType(req, statusCode),
          endpoint: req.originalUrl || req.url,
          method: req.method,
          status_code: statusCode,
          response_time: responseTime,
          metadata: {
            query: req.query,
            body_keys: req.body ? Object.keys(req.body) : [],
            headers: sanitizeHeaders(req.headers),
            user_role: req.user?.role || req.profile?.role || 'anonymous',
            response_success: isSuccessResponse(statusCode, responseData),
            request_size: req.get('content-length') || 0,
            response_size: JSON.stringify(responseData).length || 0,
            timestamp: new Date().toISOString()
          }
        };
        
        // Log the security event
        await securityAuditService.logSecurityEvent(eventData);
      }
    } catch (error) {
      console.error('❌ [SECURITY-AUDIT-MIDDLEWARE] Error logging security event:', error);
    }
  });
};

/**
 * Enhanced security audit middleware for high-risk endpoints
 * Provides additional security monitoring for sensitive operations
 */
export const enhancedSecurityAuditMiddleware = async (req, res, next) => {
  // Pre-request security checks
  const preRequestChecks = await performPreRequestSecurityChecks(req);
  
  if (preRequestChecks.block) {
    return res.status(403).json({
      success: false,
      error: 'Request blocked by security policy',
      code: 'SECURITY_BLOCK',
      reason: preRequestChecks.reason
    });
  }
  
  // Enhanced logging for high-risk operations
  const startTime = Date.now();
  
  // Store original response methods with enhanced logging
  const originalSend = res.send.bind(res);
  const originalJson = res.json.bind(res);
  
  let responseData = null;
  let statusCode = 200;
  
  res.send = function(data) {
    responseData = data;
    statusCode = res.statusCode;
    return originalSend(data);
  };
  
  res.json = function(data) {
    responseData = data;
    statusCode = res.statusCode;
    return originalJson(data);
  };
  
  // Continue to next middleware
  next();
  
  // Enhanced post-request logging
  res.on('finish', async () => {
    try {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Always log events for high-risk endpoints
      const eventData = {
        user_id: req.user?.id || null,
        session_id: req.sessionID || req.headers['x-session-id'] || null,
        ip_address: getClientIP(req),
        user_agent: req.get('User-Agent') || '',
        event_type: determineEventType(req, statusCode),
        endpoint: req.originalUrl || req.url,
        method: req.method,
        status_code: statusCode,
        response_time: responseTime,
        metadata: {
          query: req.query,
          body_keys: req.body ? Object.keys(req.body) : [],
          headers: sanitizeHeaders(req.headers),
          user_role: req.user?.role || req.profile?.role || 'anonymous',
          response_success: isSuccessResponse(statusCode, responseData),
          request_size: req.get('content-length') || 0,
          response_size: JSON.stringify(responseData).length || 0,
          high_risk_endpoint: true,
          pre_request_checks: preRequestChecks,
          timestamp: new Date().toISOString()
        }
      };
      
      // Log the security event with enhanced data
      await securityAuditService.logSecurityEvent(eventData);
      
      // Additional post-request security checks
      await performPostRequestSecurityChecks(req, res, eventData);
      
    } catch (error) {
      console.error('❌ [ENHANCED-SECURITY-AUDIT-MIDDLEWARE] Error logging security event:', error);
    }
  });
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Determine if a request should generate a security event
 */
const shouldGenerateSecurityEvent = (req, statusCode) => {
  const endpoint = req.originalUrl || req.url;
  const method = req.method;
  const routeKey = `${method} ${endpoint}`;
  
  // Always log high-risk endpoints
  if (HIGH_RISK_ENDPOINTS.some(path => endpoint.startsWith(path))) {
    return true;
  }
  
  // Always log authentication endpoints
  if (AUTH_ENDPOINTS.some(path => endpoint.startsWith(path))) {
    return true;
  }
  
  // Always log failed requests
  if (statusCode >= 400) {
    return true;
  }
  
  // Log if explicitly mapped
  if (SECURITY_EVENT_MAPPING[routeKey]) {
    return true;
  }
  
  // Log admin/super admin actions
  if (endpoint.startsWith('/api/admin') || endpoint.startsWith('/api/configuration')) {
    return true;
  }
  
  return false;
};

/**
 * Determine the event type based on request and response
 */
const determineEventType = (req, statusCode) => {
  const endpoint = req.originalUrl || req.url;
  const method = req.method;
  const routeKey = `${method} ${endpoint}`;
  
  // Use explicit mapping if available
  if (SECURITY_EVENT_MAPPING[routeKey]) {
    return SECURITY_EVENT_MAPPING[routeKey];
  }
  
  // Handle failed requests
  if (statusCode >= 400) {
    if (statusCode === 401) return 'authentication_failed';
    if (statusCode === 403) return 'authorization_failed';
    if (statusCode === 404) return 'resource_not_found';
    if (statusCode === 429) return 'rate_limit_exceeded';
    return 'request_failed';
  }
  
  // Handle success responses
  if (statusCode >= 200 && statusCode < 300) {
    if (AUTH_ENDPOINTS.some(path => endpoint.startsWith(path))) {
      return 'authentication_success';
    }
    if (endpoint.startsWith('/api/admin')) {
      return 'admin_action_success';
    }
    if (endpoint.startsWith('/api/configuration')) {
      return 'configuration_access_success';
    }
    return 'api_access_success';
  }
  
  return 'api_request';
};

/**
 * Get client IP address with proxy support
 */
const getClientIP = (req) => {
  return req.headers['x-forwarded-for'] || 
         req.headers['x-real-ip'] || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress ||
         req.ip ||
         '127.0.0.1';
};

/**
 * Sanitize headers to remove sensitive information
 */
const sanitizeHeaders = (headers) => {
  const sanitized = { ...headers };
  
  // Remove sensitive headers
  delete sanitized.authorization;
  delete sanitized.cookie;
  delete sanitized['x-api-key'];
  delete sanitized['x-auth-token'];
  
  return sanitized;
};

/**
 * Determine if response indicates success
 */
const isSuccessResponse = (statusCode, responseData) => {
  if (statusCode >= 200 && statusCode < 300) {
    // Check if response data indicates success
    if (responseData && typeof responseData === 'object') {
      const parsedData = typeof responseData === 'string' ? 
        JSON.parse(responseData) : responseData;
      return parsedData.success !== false;
    }
    return true;
  }
  return false;
};

/**
 * Perform pre-request security checks
 */
const performPreRequestSecurityChecks = async (req) => {
  const checks = {
    block: false,
    reason: null,
    flags: []
  };
  
  try {
    const ip = getClientIP(req);
    const userAgent = req.get('User-Agent') || '';
    
    // Check for suspicious user agents
    const suspiciousUserAgents = [
      'sqlmap',
      'nikto',
      'nmap',
      'dirb',
      'gobuster',
      'burp',
      'masscan'
    ];
    
    if (suspiciousUserAgents.some(agent => userAgent.toLowerCase().includes(agent))) {
      checks.flags.push('suspicious_user_agent');
    }
    
    // Check for rapid requests from same IP
    // This would require implementing rate limiting logic
    
    // Check for known malicious IPs
    // This would require threat intelligence integration
    
    return checks;
  } catch (error) {
    console.error('❌ [PRE-REQUEST-CHECKS] Error performing pre-request checks:', error);
    return checks;
  }
};

/**
 * Perform post-request security checks
 */
const performPostRequestSecurityChecks = async (req, res, eventData) => {
  try {
    // Check for data exfiltration patterns
    if (res.get('content-length') > 1000000) { // 1MB
      await securityAuditService.logSecurityEvent({
        ...eventData,
        event_type: 'large_data_transfer',
        metadata: {
          ...eventData.metadata,
          data_size: res.get('content-length'),
          potential_exfiltration: true
        }
      });
    }
    
    // Check for privilege escalation attempts
    if (eventData.event_type.includes('admin') && eventData.status_code === 403) {
      await securityAuditService.logSecurityEvent({
        ...eventData,
        event_type: 'privilege_escalation_attempt',
        metadata: {
          ...eventData.metadata,
          escalation_attempt: true
        }
      });
    }
    
    // Check for repeated failed attempts
    // This would require implementing failure tracking
    
  } catch (error) {
    console.error('❌ [POST-REQUEST-CHECKS] Error performing post-request checks:', error);
  }
};

// =============================================================================
// MIDDLEWARE FACTORY FUNCTIONS
// =============================================================================

/**
 * Create security audit middleware for specific endpoint patterns
 */
export const createSecurityAuditMiddleware = (options = {}) => {
  const {
    eventType = 'api_access',
    highRisk = false,
    customMetadata = {},
    skipCondition = null
  } = options;
  
  return async (req, res, next) => {
    // Skip if condition is met
    if (skipCondition && skipCondition(req)) {
      return next();
    }
    
    // Use enhanced middleware for high-risk endpoints
    if (highRisk) {
      return enhancedSecurityAuditMiddleware(req, res, next);
    }
    
    // Use standard middleware with custom options
    return securityAuditMiddleware(req, res, next);
  };
};

/**
 * Create authentication-specific security middleware
 */
export const authSecurityMiddleware = async (req, res, next) => {
  const startTime = Date.now();
  
  // Store original response methods
  const originalSend = res.send.bind(res);
  const originalJson = res.json.bind(res);
  
  let responseData = null;
  let statusCode = 200;
  
  res.send = function(data) {
    responseData = data;
    statusCode = res.statusCode;
    return originalSend(data);
  };
  
  res.json = function(data) {
    responseData = data;
    statusCode = res.statusCode;
    return originalJson(data);
  };
  
  next();
  
  // Log authentication events
  res.on('finish', async () => {
    try {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      const eventData = {
        user_id: req.user?.id || null,
        session_id: req.sessionID || req.headers['x-session-id'] || null,
        ip_address: getClientIP(req),
        user_agent: req.get('User-Agent') || '',
        event_type: statusCode >= 400 ? 'authentication_failed' : 'authentication_success',
        endpoint: req.originalUrl || req.url,
        method: req.method,
        status_code: statusCode,
        response_time: responseTime,
        metadata: {
          email: req.body?.email || null,
          user_role: req.user?.role || req.profile?.role || null,
          authentication_method: req.body?.method || 'password',
          response_success: statusCode >= 200 && statusCode < 300,
          timestamp: new Date().toISOString()
        }
      };
      
      await securityAuditService.logSecurityEvent(eventData);
    } catch (error) {
      console.error('❌ [AUTH-SECURITY-MIDDLEWARE] Error logging authentication event:', error);
    }
  });
};

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  securityAuditMiddleware,
  enhancedSecurityAuditMiddleware,
  createSecurityAuditMiddleware,
  authSecurityMiddleware
}; 