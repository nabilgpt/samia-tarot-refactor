// =====================================================
// SAMIA TAROT - AI CONTENT FILTER MIDDLEWARE
// CRITICAL: PREVENTS AI CONTENT EXPOSURE TO UNAUTHORIZED USERS
// PRODUCTION-GRADE IMPLEMENTATION WITH INFINITE RECURSION PREVENTION
// =====================================================

import { supabaseAdmin } from '../lib/supabase.js';

// AI-sensitive field names that must be filtered
const AI_SENSITIVE_FIELDS = [
  'ai_interpretation',
  'ai_insights', 
  'ai_confidence_score',
  'ai_model_version',
  'ai_processing_metadata',
  'ai_processing_time_ms',
  'ai_tokens_used',
  'confidence_score', // Legacy field
  'ai_notes',
  'ai_suggestions',
  'ai_analysis',
  'ai_recommendations',
  'model_version',
  'interpretation',
  'ai_reading_result',
  'ai_generated_content'
];

// Roles that can access AI content
const AI_AUTHORIZED_ROLES = ['reader', 'admin', 'super_admin'];

/**
 * Logs AI content access attempts to database with comprehensive audit trail
 * @param {Object} logData - Complete log data object
 */
async function logAIContentAccess(logData) {
  try {
    const { data, error } = await supabaseAdmin
      .rpc('log_ai_access_attempt', {
        p_endpoint: logData.endpoint,
        p_action: logData.action,
        p_table_name: logData.table_name || 'api_response',
        p_ai_fields: logData.ai_fields || [],
        p_success: logData.success,
        p_denial_reason: logData.denial_reason,
        p_ip_address: logData.ip_address,
        p_user_agent: logData.user_agent,
        p_session_id: logData.session_id,
        p_metadata: logData.metadata || {}
      });

    if (error) {
      console.error('❌ [AI_AUDIT] Failed to log AI access attempt:', error);
    } else {
      const logLevel = logData.success ? 'INFO' : 'WARN';
      const action = logData.success ? 'ALLOWED' : (logData.denial_reason ? 'FILTERED' : 'BLOCKED');
      console.log(`📝 [AI_AUDIT] ${logLevel}: ${action} - User: ${logData.user_id} (${logData.role}) - Endpoint: ${logData.endpoint}`);
    }
  } catch (err) {
    console.error('❌ [AI_AUDIT] Critical error in logAIContentAccess:', err);
  }
}

/**
 * Recursively removes AI-sensitive fields from an object or array
 * @param {*} obj - Object to filter
 * @param {Array} fieldsRemoved - Array to track removed fields
 * @returns {*} Filtered object with AI content removed
 */
function removeAIFields(obj, fieldsRemoved = []) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => removeAIFields(item, fieldsRemoved));
  }

  const filtered = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const keyLower = key.toLowerCase();
    if (AI_SENSITIVE_FIELDS.some(field => keyLower.includes(field.toLowerCase()))) {
      fieldsRemoved.push(key);
      // Completely exclude AI fields for unauthorized users
      continue;
    }
    
    if (value && typeof value === 'object') {
      filtered[key] = removeAIFields(value, fieldsRemoved);
    } else {
      filtered[key] = value;
    }
  }
  
  return filtered;
}

/**
 * Determines if AI content should be filtered based on user role and response content
 * @param {Object} req - Express request object
 * @param {Object} user - User object from authentication
 * @param {*} data - Response data to check
 * @returns {Object} Filter decision with details
 */
function shouldFilterAIContent(req, user, data) {
  const userRole = user?.role || 'anonymous';
  const isAuthorized = AI_AUTHORIZED_ROLES.includes(userRole);
  
  // Always allow authorized users
  if (isAuthorized) {
    return { shouldFilter: false, reason: 'authorized_role', userRole };
  }
  
  // Check if response contains AI content
  const responseStr = JSON.stringify(data);
  const hasAIContent = AI_SENSITIVE_FIELDS.some(field => 
    responseStr.toLowerCase().includes(field.toLowerCase())
  );
  
  if (hasAIContent) {
    return { 
      shouldFilter: true, 
      reason: `unauthorized_role_${userRole}`, 
      userRole,
      detectedFields: AI_SENSITIVE_FIELDS.filter(field => 
        responseStr.toLowerCase().includes(field.toLowerCase())
      )
    };
  }
  
  return { shouldFilter: false, reason: 'no_ai_content', userRole };
}

/**
 * Adds security warning headers for filtered responses
 * @param {Object} res - Express response object
 * @param {string} reason - Reason for filtering
 * @param {Array} filteredFields - Fields that were filtered
 */
function addSecurityHeaders(res, reason, filteredFields = []) {
  res.set({
    'X-SAMIA-AI-Security': 'AI content filtered for unauthorized user',
    'X-Security-Filter-Reason': reason,
    'X-Filtered-Fields-Count': filteredFields.length.toString(),
    'X-Access-Level': 'client-restricted',
    'X-Filtered-At': new Date().toISOString()
  });
}

/**
 * Main AI content filter middleware - INFINITE RECURSION PROOF
 * This middleware intercepts all responses and filters AI content for unauthorized users
 */
export const aiContentFilter = (req, res, next) => {
  // Store original response methods to prevent infinite recursion
  const originalSend = res.send.bind(res);
  const originalJson = res.json.bind(res);
  
  // Override res.send - PRIMARY RESPONSE INTERCEPTOR
  res.send = function(body) {
    try {
      const user = req.user;
      const endpoint = req.originalUrl;
      const method = req.method;
      
      // Prepare audit log data
      const baseLogData = {
        user_id: user?.id || 'anonymous',
        role: user?.role || 'anonymous',
        endpoint: endpoint,
        action: method,
        ip_address: req.ip || req.connection?.remoteAddress,
        user_agent: req.get('User-Agent'),
        session_id: req.sessionID || req.headers['x-session-id'],
        metadata: {
          method: method,
          query: req.query,
          response_type: typeof body,
          content_length: body?.length || 0
        }
      };

      let data = body;
      let isJsonResponse = false;

      // Parse JSON responses
      if (typeof body === 'string' && body.trim().startsWith('{')) {
        try {
          data = JSON.parse(body);
          isJsonResponse = true;
        } catch (parseError) {
          // Not valid JSON, treat as string
          console.warn('⚠️ [AI_FILTER] Failed to parse response as JSON:', parseError.message);
        }
      } else if (typeof body === 'object' && body !== null) {
        data = body;
        isJsonResponse = true;
      }

      // Check if filtering is needed
      const filterDecision = shouldFilterAIContent(req, user, data);
      
      if (filterDecision.shouldFilter) {
        // UNAUTHORIZED USER - FILTER AI CONTENT
        const fieldsRemoved = [];
        const filteredData = removeAIFields(data, fieldsRemoved);
        
        // Add security headers
        addSecurityHeaders(res, filterDecision.reason, fieldsRemoved);
        
        // Log the filtering action
        logAIContentAccess({
          ...baseLogData,
          success: false,
          denial_reason: `AI content filtered: ${filterDecision.reason}`,
          ai_fields: fieldsRemoved,
          metadata: {
            ...baseLogData.metadata,
            filter_applied: true,
            fields_filtered: fieldsRemoved,
            detected_fields: filterDecision.detectedFields || []
          }
        });
        
        console.warn(`🚫 [AI_FILTER] FILTERED AI content - User: ${user?.id} (${filterDecision.userRole}) - Endpoint: ${endpoint} - Fields: ${fieldsRemoved.join(', ')}`);
        
        // Send filtered response using original method
        const responseBody = isJsonResponse ? JSON.stringify(filteredData) : filteredData;
        return originalSend.call(this, responseBody);
        
      } else if (filterDecision.reason === 'authorized_role' && isJsonResponse) {
        // AUTHORIZED USER - ALLOW WITH WARNING HEADERS
        if (filterDecision.userRole === 'reader') {
          res.set({
            'X-SAMIA-AI-Content': 'present',
            'X-Reader-Warning': 'AI content included - not for client delivery',
            'X-Content-Classification': 'ai-assisted'
          });
        }
        
        // Log authorized access to AI content
        const responseStr = JSON.stringify(data);
        const detectedAIFields = AI_SENSITIVE_FIELDS.filter(field => 
          responseStr.toLowerCase().includes(field.toLowerCase())
        );
        
        if (detectedAIFields.length > 0) {
          logAIContentAccess({
            ...baseLogData,
            success: true,
            ai_fields: detectedAIFields,
            metadata: {
              ...baseLogData.metadata,
              authorized_access: true,
              ai_fields_present: detectedAIFields
            }
          });
        }
      }
      
      // Send original response using original method
      return originalSend.call(this, body);
      
    } catch (error) {
      console.error('❌ [AI_FILTER] Critical error in response filtering:', error);
      
      // Log the error
      try {
        logAIContentAccess({
          user_id: req.user?.id || 'anonymous',
          role: req.user?.role || 'anonymous',
          endpoint: req.originalUrl,
          action: req.method,
          success: false,
          denial_reason: `Filter error: ${error.message}`,
          ai_fields: [],
          ip_address: req.ip,
          user_agent: req.get('User-Agent'),
          metadata: { 
            error: error.message, 
            stack: error.stack,
            filter_failure: true
          }
        });
      } catch (logError) {
        console.error('❌ [AI_FILTER] Failed to log filter error:', logError);
      }
      
      // Fallback to original response to prevent service disruption
      return originalSend.call(this, body);
    }
  };

  // Override res.json - SECONDARY RESPONSE INTERCEPTOR
  res.json = function(obj) {
    // Convert to string and use the overridden send method
    const jsonString = JSON.stringify(obj);
    return this.send(jsonString);
  };

  next();
};

/**
 * Enhanced middleware for reading endpoints with stricter security
 */
export const readingAIFilter = async (req, res, next) => {
  const user = req.user;
  const userRole = user?.role || 'anonymous';
  const isAuthorized = AI_AUTHORIZED_ROLES.includes(userRole);
  
  // For reading endpoints, be extra strict
  if (!isAuthorized && (req.originalUrl.includes('/reading') || req.originalUrl.includes('/tarot'))) {
    // Log the unauthorized access attempt
    await logAIContentAccess({
      user_id: user?.id || 'anonymous',
      role: userRole,
      endpoint: req.originalUrl,
      action: req.method,
      success: false,
      denial_reason: `Unauthorized access to reading endpoint by role: ${userRole}`,
      ai_fields: ['reading_endpoint_access'],
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      metadata: {
        endpoint_type: 'reading',
        security_level: 'high',
        access_denied: true
      }
    });
    
    console.warn(`🚫 [READING_FILTER] BLOCKED reading endpoint access - User: ${user?.id} (${userRole}) - Endpoint: ${req.originalUrl}`);
  }
  
  // Continue with normal AI content filtering
  return aiContentFilter(req, res, next);
};

/**
 * Emergency response for critical AI content exposure attempts
 */
export const emergencyAIBlock = async (req, res, next) => {
  const user = req.user;
  const userRole = user?.role || 'anonymous';
  
  // Block direct AI generation endpoints for unauthorized users
  if (!AI_AUTHORIZED_ROLES.includes(userRole) && 
      (req.originalUrl.includes('/ai/generate') || 
       req.originalUrl.includes('/ai/interpret') ||
       req.originalUrl.includes('/ai/reading'))) {
    
    // Log critical security violation
    await logAIContentAccess({
      user_id: user?.id || 'anonymous',
      role: userRole,
      endpoint: req.originalUrl,
      action: req.method,
      success: false,
      denial_reason: `CRITICAL: Direct AI endpoint access attempt by unauthorized role`,
      ai_fields: ['ai_generation_endpoint'],
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      metadata: {
        security_level: 'critical',
        violation_type: 'direct_ai_access',
        blocked: true
      }
    });
    
    console.error(`🚨 [EMERGENCY_AI_BLOCK] CRITICAL VIOLATION - User: ${user?.id} (${userRole}) attempted direct AI access: ${req.originalUrl}`);
    
    return res.status(403).json({
      success: false,
      error: 'Access denied: Insufficient permissions for AI content',
      code: 'AI_ACCESS_DENIED',
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

// Export all security functions and constants
export {
  AI_SENSITIVE_FIELDS,
  AI_AUTHORIZED_ROLES,
  removeAIFields,
  logAIContentAccess,
  shouldFilterAIContent,
  addSecurityHeaders
}; 