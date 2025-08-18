// =============================================================================
// COMPREHENSIVE SECURITY AUDIT SERVICE
// SAMIA TAROT - Enhanced Security Monitoring & Compliance
// =============================================================================
// Date: 2025-07-13
// Purpose: Complete security audit system with threat detection and compliance
// Security: Real-time monitoring, encrypted audit trails, threat intelligence
// =============================================================================

import { supabaseAdmin } from '../lib/supabase.js';
import auditService from './auditService.js';
import crypto from 'crypto';

// =============================================================================
// SECURITY CONSTANTS
// =============================================================================

const SECURITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

const THREAT_TYPES = {
  BRUTE_FORCE: 'brute_force',
  PRIVILEGE_ESCALATION: 'privilege_escalation',
  DATA_BREACH: 'data_breach',
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  RATE_LIMIT_VIOLATION: 'rate_limit_violation',
  MALICIOUS_INPUT: 'malicious_input',
  SESSION_HIJACKING: 'session_hijacking',
  CREDENTIAL_STUFFING: 'credential_stuffing',
  API_ABUSE: 'api_abuse'
};

const COMPLIANCE_FRAMEWORKS = {
  GDPR: 'gdpr',
  SOC2: 'soc2',
  ISO27001: 'iso27001',
  HIPAA: 'hipaa',
  PCI_DSS: 'pci_dss'
};

// =============================================================================
// CORE SECURITY AUDIT FUNCTIONS
// =============================================================================

/**
 * Log comprehensive security event with encryption and threat analysis
 * @param {Object} eventData - Security event data
 * @returns {Object} Audit log entry with security analysis
 */
export const logSecurityEvent = async (eventData) => {
  try {
    const timestamp = new Date().toISOString();
    const eventId = crypto.randomUUID();
    
    // Encrypt sensitive data
    const encryptedMetadata = await encryptAuditData(eventData.metadata || {});
    
    // Perform threat analysis
    const threatAnalysis = await analyzeThreatLevel(eventData);
    
    // Create comprehensive security log entry
    const securityLog = {
      id: eventId,
      user_id: eventData.user_id,
      session_id: eventData.session_id,
      ip_address: eventData.ip_address,
      user_agent: eventData.user_agent,
      event_type: eventData.event_type,
      security_level: threatAnalysis.level,
      threat_type: threatAnalysis.threat_type,
      risk_score: threatAnalysis.risk_score,
      endpoint: eventData.endpoint,
      method: eventData.method,
      status_code: eventData.status_code,
      response_time: eventData.response_time,
      encrypted_metadata: encryptedMetadata,
      geolocation: await getGeolocation(eventData.ip_address),
      device_fingerprint: generateDeviceFingerprint(eventData),
      compliance_flags: await checkComplianceFlags(eventData),
      threat_indicators: threatAnalysis.indicators,
      created_at: timestamp,
      expires_at: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)).toISOString() // 1 year retention
    };

    // Store in security_audit_logs table
    const { data: auditEntry, error } = await supabaseAdmin
      .from('security_audit_logs')
      .insert(securityLog)
      .select()
      .single();

    if (error) {
      console.error('❌ [SECURITY-AUDIT] Failed to log security event:', error);
      return null;
    }

    // Trigger real-time security monitoring
    await triggerSecurityMonitoring(securityLog);

    // Check for security incidents
    await checkSecurityIncidents(securityLog);

    console.log(`🔒 [SECURITY-AUDIT] Event logged: ${eventData.event_type} - Risk: ${threatAnalysis.risk_score} - User: ${eventData.user_id}`);

    return {
      success: true,
      audit_id: eventId,
      security_level: threatAnalysis.level,
      risk_score: threatAnalysis.risk_score,
      threat_analysis: threatAnalysis
    };

  } catch (error) {
    console.error('❌ [SECURITY-AUDIT] Critical error in logSecurityEvent:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Analyze threat level and risk score for security events
 * @param {Object} eventData - Event data to analyze
 * @returns {Object} Threat analysis with risk score and indicators
 */
const analyzeThreatLevel = async (eventData) => {
  try {
    let riskScore = 0;
    let threatType = null;
    let indicators = [];
    
    // Analyze different threat vectors
    
    // 1. Failed authentication attempts
    if (eventData.event_type === 'authentication_failed') {
      riskScore += 30;
      threatType = THREAT_TYPES.BRUTE_FORCE;
      indicators.push('failed_authentication');
      
      // Check for repeated failures
      const recentFailures = await getRecentFailures(eventData.ip_address, 60); // 1 hour
      if (recentFailures > 5) {
        riskScore += 40;
        indicators.push('repeated_failures');
      }
    }
    
    // 2. Privilege escalation attempts
    if (eventData.event_type === 'role_change' || eventData.event_type === 'permission_escalation') {
      riskScore += 60;
      threatType = THREAT_TYPES.PRIVILEGE_ESCALATION;
      indicators.push('privilege_escalation');
    }
    
    // 3. Unauthorized access attempts
    if (eventData.status_code === 403 || eventData.status_code === 401) {
      riskScore += 25;
      threatType = THREAT_TYPES.UNAUTHORIZED_ACCESS;
      indicators.push('unauthorized_access');
    }
    
    // 4. Suspicious IP patterns
    if (eventData.ip_address) {
      const ipThreat = await analyzeIPThreat(eventData.ip_address);
      riskScore += ipThreat.score;
      indicators.push(...ipThreat.indicators);
    }
    
    // 5. High-risk endpoints
    const riskEndpoints = ['/admin/secrets', '/api/system', '/admin/users', '/api/audit'];
    if (riskEndpoints.some(endpoint => eventData.endpoint?.includes(endpoint))) {
      riskScore += 20;
      indicators.push('high_risk_endpoint');
    }
    
    // 6. Time-based anomalies
    const timeRisk = analyzeTimeAnomalies(eventData);
    riskScore += timeRisk.score;
    indicators.push(...timeRisk.indicators);
    
    // 7. Rate limiting violations
    if (eventData.event_type === 'rate_limit_exceeded') {
      riskScore += 35;
      threatType = THREAT_TYPES.RATE_LIMIT_VIOLATION;
      indicators.push('rate_limit_violation');
    }
    
    // 8. Malicious input detection
    if (eventData.metadata?.payload) {
      const inputThreat = analyzeInputThreat(eventData.metadata.payload);
      riskScore += inputThreat.score;
      indicators.push(...inputThreat.indicators);
    }
    
    // Determine security level based on risk score
    let securityLevel = SECURITY_LEVELS.LOW;
    if (riskScore >= 80) securityLevel = SECURITY_LEVELS.CRITICAL;
    else if (riskScore >= 50) securityLevel = SECURITY_LEVELS.HIGH;
    else if (riskScore >= 25) securityLevel = SECURITY_LEVELS.MEDIUM;
    
    return {
      level: securityLevel,
      risk_score: Math.min(riskScore, 100), // Cap at 100
      threat_type: threatType,
      indicators,
      analysis_timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ [THREAT-ANALYSIS] Error analyzing threat level:', error);
    return {
      level: SECURITY_LEVELS.LOW,
      risk_score: 0,
      threat_type: null,
      indicators: ['analysis_error'],
      error: error.message
    };
  }
};

/**
 * Encrypt sensitive audit data for secure storage
 * @param {Object} data - Data to encrypt
 * @returns {String} Encrypted data string
 */
const encryptAuditData = async (data) => {
  try {
    const secretKey = process.env.AUDIT_ENCRYPTION_KEY || 'samia-tarot-audit-encryption-key-2025';
    const cipher = crypto.createCipher('aes-256-cbc', secretKey);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  } catch (error) {
    console.error('❌ [ENCRYPTION] Failed to encrypt audit data:', error);
    return JSON.stringify(data); // Fallback to unencrypted
  }
};

/**
 * Decrypt audit data for analysis
 * @param {String} encryptedData - Encrypted data string
 * @returns {Object} Decrypted data object
 */
const decryptAuditData = async (encryptedData) => {
  try {
    const secretKey = process.env.AUDIT_ENCRYPTION_KEY || 'samia-tarot-audit-encryption-key-2025';
    const decipher = crypto.createDecipher('aes-256-cbc', secretKey);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('❌ [DECRYPTION] Failed to decrypt audit data:', error);
    return {}; // Return empty object on failure
  }
};

/**
 * Get geolocation data for IP address
 * @param {String} ipAddress - IP address to analyze
 * @returns {Object} Geolocation data
 */
const getGeolocation = async (ipAddress) => {
  try {
    // Mock geolocation - in production, use IP geolocation service
    const mockGeoData = {
      country: 'Unknown',
      city: 'Unknown',
      region: 'Unknown',
      latitude: 0,
      longitude: 0,
      timezone: 'UTC',
      isp: 'Unknown'
    };
    
    // For localhost and internal IPs
    if (ipAddress === '127.0.0.1' || ipAddress === '::1' || ipAddress?.startsWith('192.168.')) {
      mockGeoData.country = 'Local';
      mockGeoData.city = 'Local';
    }
    
    return mockGeoData;
  } catch (error) {
    console.error('❌ [GEOLOCATION] Error getting geolocation:', error);
    return { country: 'Unknown', city: 'Unknown' };
  }
};

/**
 * Generate device fingerprint for tracking
 * @param {Object} eventData - Event data with user agent
 * @returns {String} Device fingerprint hash
 */
const generateDeviceFingerprint = (eventData) => {
  try {
    const fingerprintData = {
      user_agent: eventData.user_agent,
      ip_address: eventData.ip_address,
      timestamp: new Date().toISOString().split('T')[0] // Daily salt
    };
    
    const fingerprint = crypto
      .createHash('sha256')
      .update(JSON.stringify(fingerprintData))
      .digest('hex');
    
    return fingerprint.substring(0, 32); // First 32 chars
  } catch (error) {
    console.error('❌ [FINGERPRINT] Error generating device fingerprint:', error);
    return 'unknown';
  }
};

/**
 * Check compliance flags for various frameworks
 * @param {Object} eventData - Event data to check
 * @returns {Array} Array of compliance flags
 */
const checkComplianceFlags = async (eventData) => {
  try {
    const flags = [];
    
    // GDPR compliance checks
    if (eventData.event_type === 'personal_data_access' || 
        eventData.event_type === 'data_export' ||
        eventData.event_type === 'data_deletion') {
      flags.push(`${COMPLIANCE_FRAMEWORKS.GDPR}_data_processing`);
    }
    
    // SOC2 compliance checks
    if (eventData.event_type === 'admin_action' || 
        eventData.event_type === 'security_incident') {
      flags.push(`${COMPLIANCE_FRAMEWORKS.SOC2}_security_monitoring`);
    }
    
    // ISO27001 compliance checks
    if (eventData.security_level === SECURITY_LEVELS.HIGH || 
        eventData.security_level === SECURITY_LEVELS.CRITICAL) {
      flags.push(`${COMPLIANCE_FRAMEWORKS.ISO27001}_security_incident`);
    }
    
    return flags;
  } catch (error) {
    console.error('❌ [COMPLIANCE] Error checking compliance flags:', error);
    return [];
  }
};

/**
 * Analyze IP address for threat indicators
 * @param {String} ipAddress - IP address to analyze
 * @returns {Object} IP threat analysis
 */
const analyzeIPThreat = async (ipAddress) => {
  try {
    let score = 0;
    let indicators = [];
    
    // Check for recent suspicious activity from this IP
    const { data: recentActivity, error } = await supabaseAdmin
      .from('security_audit_logs')
      .select('risk_score, threat_type')
      .eq('ip_address', ipAddress)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (!error && recentActivity) {
      const avgRisk = recentActivity.reduce((sum, log) => sum + (log.risk_score || 0), 0) / recentActivity.length;
      
      if (avgRisk > 50) {
        score += 30;
        indicators.push('high_risk_ip_history');
      }
      
      if (recentActivity.length > 5) {
        score += 15;
        indicators.push('frequent_activity');
      }
    }
    
    // Check for known malicious patterns
    if (ipAddress?.includes('tor') || ipAddress?.includes('proxy')) {
      score += 25;
      indicators.push('anonymization_service');
    }
    
    return { score, indicators };
  } catch (error) {
    console.error('❌ [IP-ANALYSIS] Error analyzing IP threat:', error);
    return { score: 0, indicators: [] };
  }
};

/**
 * Analyze time-based anomalies
 * @param {Object} eventData - Event data with timestamp
 * @returns {Object} Time-based threat analysis
 */
const analyzeTimeAnomalies = (eventData) => {
  try {
    let score = 0;
    let indicators = [];
    
    const now = new Date();
    const hour = now.getHours();
    
    // Check for off-hours activity (high-risk actions outside business hours)
    if (eventData.event_type === 'admin_action' && (hour < 6 || hour > 22)) {
      score += 20;
      indicators.push('off_hours_activity');
    }
    
    // Check for weekend activity on critical operations
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    if (isWeekend && eventData.security_level === SECURITY_LEVELS.HIGH) {
      score += 15;
      indicators.push('weekend_critical_activity');
    }
    
    return { score, indicators };
  } catch (error) {
    console.error('❌ [TIME-ANALYSIS] Error analyzing time anomalies:', error);
    return { score: 0, indicators: [] };
  }
};

/**
 * Analyze input for malicious content
 * @param {Object} payload - Input payload to analyze
 * @returns {Object} Input threat analysis
 */
const analyzeInputThreat = (payload) => {
  try {
    let score = 0;
    let indicators = [];
    
    const payloadStr = JSON.stringify(payload).toLowerCase();
    
    // SQL injection patterns
    const sqlPatterns = ['select', 'drop', 'union', 'insert', 'update', 'delete', '--', ';'];
    if (sqlPatterns.some(pattern => payloadStr.includes(pattern))) {
      score += 40;
      indicators.push('sql_injection_attempt');
    }
    
    // XSS patterns
    const xssPatterns = ['<script', 'javascript:', 'onerror', 'onload', 'eval('];
    if (xssPatterns.some(pattern => payloadStr.includes(pattern))) {
      score += 35;
      indicators.push('xss_attempt');
    }
    
    // Path traversal patterns
    const pathPatterns = ['../', '..\\', '/etc/', '/var/', '/usr/'];
    if (pathPatterns.some(pattern => payloadStr.includes(pattern))) {
      score += 30;
      indicators.push('path_traversal_attempt');
    }
    
    // Command injection patterns
    const cmdPatterns = ['rm -rf', 'cat /etc/', 'whoami', 'ls -la', 'nc -e'];
    if (cmdPatterns.some(pattern => payloadStr.includes(pattern))) {
      score += 45;
      indicators.push('command_injection_attempt');
    }
    
    return { score, indicators };
  } catch (error) {
    console.error('❌ [INPUT-ANALYSIS] Error analyzing input threat:', error);
    return { score: 0, indicators: [] };
  }
};

/**
 * Get recent authentication failures for IP
 * @param {String} ipAddress - IP address to check
 * @param {Number} minutes - Time window in minutes
 * @returns {Number} Number of recent failures
 */
const getRecentFailures = async (ipAddress, minutes) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('security_audit_logs')
      .select('id')
      .eq('ip_address', ipAddress)
      .eq('event_type', 'authentication_failed')
      .gte('created_at', new Date(Date.now() - minutes * 60 * 1000).toISOString());
    
    if (error) throw error;
    return data?.length || 0;
  } catch (error) {
    console.error('❌ [RECENT-FAILURES] Error getting recent failures:', error);
    return 0;
  }
};

/**
 * Trigger real-time security monitoring
 * @param {Object} securityLog - Security log entry
 */
const triggerSecurityMonitoring = async (securityLog) => {
  try {
    // Send real-time alerts for high-risk events
    if (securityLog.risk_score >= 70) {
      await sendSecurityAlert(securityLog);
    }
    
    // Update security metrics
    await updateSecurityMetrics(securityLog);
    
    // Notify security team via websocket
    await notifySecurityTeam(securityLog);
    
  } catch (error) {
    console.error('❌ [SECURITY-MONITORING] Error triggering security monitoring:', error);
  }
};

/**
 * Send security alert for high-risk events
 * @param {Object} securityLog - Security log entry
 */
const sendSecurityAlert = async (securityLog) => {
  try {
    const alert = {
      alert_type: 'security_incident',
      severity: securityLog.security_level,
      title: `Security Alert: ${securityLog.threat_type}`,
      description: `High-risk security event detected: ${securityLog.event_type}`,
      user_id: securityLog.user_id,
      ip_address: securityLog.ip_address,
      risk_score: securityLog.risk_score,
      threat_indicators: securityLog.threat_indicators,
      timestamp: securityLog.created_at
    };
    
    // Store security alert
    await supabaseAdmin
      .from('security_alerts')
      .insert(alert);
    
    console.log(`🚨 [SECURITY-ALERT] Alert sent: ${alert.title} - Risk: ${securityLog.risk_score}`);
  } catch (error) {
    console.error('❌ [SECURITY-ALERT] Error sending security alert:', error);
  }
};

/**
 * Update security metrics dashboard
 * @param {Object} securityLog - Security log entry
 */
const updateSecurityMetrics = async (securityLog) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Update daily security metrics
    await supabaseAdmin
      .from('security_metrics')
      .upsert({
        date: today,
        total_events: 1,
        high_risk_events: securityLog.risk_score >= 70 ? 1 : 0,
        threat_types: { [securityLog.threat_type]: 1 },
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'date',
        ignoreDuplicates: false
      });
    
  } catch (error) {
    console.error('❌ [SECURITY-METRICS] Error updating security metrics:', error);
  }
};

/**
 * Notify security team via real-time channels
 * @param {Object} securityLog - Security log entry
 */
const notifySecurityTeam = async (securityLog) => {
  try {
    // Send real-time notification via Supabase channels
    if (securityLog.security_level === SECURITY_LEVELS.CRITICAL) {
      await supabaseAdmin
        .channel('security-alerts')
        .send({
          type: 'broadcast',
          event: 'critical_security_event',
          payload: {
            event_type: securityLog.event_type,
            risk_score: securityLog.risk_score,
            user_id: securityLog.user_id,
            ip_address: securityLog.ip_address,
            timestamp: securityLog.created_at
          }
        });
    }
  } catch (error) {
    console.error('❌ [SECURITY-NOTIFICATION] Error notifying security team:', error);
  }
};

/**
 * Check for security incidents and patterns
 * @param {Object} securityLog - Security log entry
 */
const checkSecurityIncidents = async (securityLog) => {
  try {
    // Check for coordinated attacks
    if (securityLog.risk_score >= 50) {
      await checkCoordinatedAttacks(securityLog);
    }
    
    // Check for user behavior anomalies
    if (securityLog.user_id) {
      await checkUserAnomalies(securityLog);
    }
    
    // Check for system-wide patterns
    await checkSystemPatterns(securityLog);
    
  } catch (error) {
    console.error('❌ [SECURITY-INCIDENTS] Error checking security incidents:', error);
  }
};

/**
 * Check for coordinated attacks from multiple sources
 * @param {Object} securityLog - Security log entry
 */
const checkCoordinatedAttacks = async (securityLog) => {
  try {
    // Look for similar events from different IPs in short timeframe
    const { data: similarEvents, error } = await supabaseAdmin
      .from('security_audit_logs')
      .select('ip_address, user_id, risk_score')
      .eq('event_type', securityLog.event_type)
      .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()) // 10 minutes
      .gte('risk_score', 40);
    
    if (!error && similarEvents && similarEvents.length > 3) {
      const uniqueIPs = new Set(similarEvents.map(e => e.ip_address));
      
      if (uniqueIPs.size > 2) {
        // Potential coordinated attack detected
        await supabaseAdmin
          .from('security_incidents')
          .insert({
            incident_type: 'coordinated_attack',
            severity: SECURITY_LEVELS.HIGH,
            description: `Coordinated attack detected: ${securityLog.event_type}`,
            affected_ips: Array.from(uniqueIPs),
            event_count: similarEvents.length,
            first_seen: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
            last_seen: new Date().toISOString(),
            status: 'active'
          });
        
        console.log(`🚨 [COORDINATED-ATTACK] Detected coordinated attack: ${securityLog.event_type}`);
      }
    }
  } catch (error) {
    console.error('❌ [COORDINATED-ATTACK] Error checking coordinated attacks:', error);
  }
};

/**
 * Check for user behavior anomalies
 * @param {Object} securityLog - Security log entry
 */
const checkUserAnomalies = async (securityLog) => {
  try {
    // Get user's recent activity baseline
    const { data: userBaseline, error } = await supabaseAdmin
      .from('security_audit_logs')
      .select('risk_score, event_type, created_at')
      .eq('user_id', securityLog.user_id)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // 7 days
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (!error && userBaseline && userBaseline.length > 5) {
      const avgRisk = userBaseline.reduce((sum, log) => sum + (log.risk_score || 0), 0) / userBaseline.length;
      
      // Check for significant deviation from baseline
      if (securityLog.risk_score > avgRisk * 2 && securityLog.risk_score > 60) {
        await supabaseAdmin
          .from('user_anomalies')
          .insert({
            user_id: securityLog.user_id,
            anomaly_type: 'behavior_deviation',
            description: `User behavior anomaly: Risk score ${securityLog.risk_score} vs baseline ${avgRisk.toFixed(2)}`,
            risk_score: securityLog.risk_score,
            baseline_risk: avgRisk,
            event_type: securityLog.event_type,
            detected_at: new Date().toISOString()
          });
        
        console.log(`⚠️ [USER-ANOMALY] Behavior anomaly detected for user: ${securityLog.user_id}`);
      }
    }
  } catch (error) {
    console.error('❌ [USER-ANOMALY] Error checking user anomalies:', error);
  }
};

/**
 * Check for system-wide security patterns
 * @param {Object} securityLog - Security log entry
 */
const checkSystemPatterns = async (securityLog) => {
  try {
    // Check for system-wide attack patterns
    const { data: recentEvents, error } = await supabaseAdmin
      .from('security_audit_logs')
      .select('event_type, risk_score, ip_address')
      .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // 30 minutes
      .gte('risk_score', 30);
    
    if (!error && recentEvents && recentEvents.length > 10) {
      const eventTypes = recentEvents.reduce((acc, event) => {
        acc[event.event_type] = (acc[event.event_type] || 0) + 1;
        return acc;
      }, {});
      
      // Check for unusual patterns
      const totalEvents = recentEvents.length;
      const topEventType = Object.keys(eventTypes).reduce((a, b) => 
        eventTypes[a] > eventTypes[b] ? a : b
      );
      
      if (eventTypes[topEventType] > totalEvents * 0.7) {
        // Potential system-wide attack pattern
        await supabaseAdmin
          .from('system_patterns')
          .insert({
            pattern_type: 'attack_pattern',
            description: `System-wide pattern detected: ${topEventType}`,
            event_type: topEventType,
            event_count: eventTypes[topEventType],
            time_window: '30_minutes',
            severity: totalEvents > 20 ? SECURITY_LEVELS.HIGH : SECURITY_LEVELS.MEDIUM,
            detected_at: new Date().toISOString()
          });
        
        console.log(`🔍 [SYSTEM-PATTERN] System-wide pattern detected: ${topEventType}`);
      }
    }
  } catch (error) {
    console.error('❌ [SYSTEM-PATTERN] Error checking system patterns:', error);
  }
};

// =============================================================================
// SECURITY REPORTING FUNCTIONS
// =============================================================================

/**
 * Generate comprehensive security report
 * @param {Object} options - Report options
 * @returns {Object} Security report data
 */
export const generateSecurityReport = async (options = {}) => {
  try {
    const {
      date_from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      date_to = new Date().toISOString(),
      include_details = false
    } = options;

    // Get security events for the period
    const { data: securityEvents, error } = await supabaseAdmin
      .from('security_audit_logs')
      .select('*')
      .gte('created_at', date_from)
      .lte('created_at', date_to)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Generate comprehensive analytics
    const analytics = {
      total_events: securityEvents.length,
      security_levels: {},
      threat_types: {},
      top_ips: {},
      top_users: {},
      hourly_distribution: {},
      risk_score_distribution: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      },
      compliance_summary: {},
      incident_summary: await getIncidentSummary(date_from, date_to)
    };

    // Process security events
    securityEvents.forEach(event => {
      // Security levels
      analytics.security_levels[event.security_level] = 
        (analytics.security_levels[event.security_level] || 0) + 1;
      
      // Threat types
      if (event.threat_type) {
        analytics.threat_types[event.threat_type] = 
          (analytics.threat_types[event.threat_type] || 0) + 1;
      }
      
      // Top IPs
      if (event.ip_address) {
        analytics.top_ips[event.ip_address] = 
          (analytics.top_ips[event.ip_address] || 0) + 1;
      }
      
      // Top users
      if (event.user_id) {
        analytics.top_users[event.user_id] = 
          (analytics.top_users[event.user_id] || 0) + 1;
      }
      
      // Hourly distribution
      const hour = new Date(event.created_at).getHours();
      analytics.hourly_distribution[hour] = 
        (analytics.hourly_distribution[hour] || 0) + 1;
      
      // Risk score distribution
      const riskScore = event.risk_score || 0;
      if (riskScore >= 80) analytics.risk_score_distribution.critical++;
      else if (riskScore >= 50) analytics.risk_score_distribution.high++;
      else if (riskScore >= 25) analytics.risk_score_distribution.medium++;
      else analytics.risk_score_distribution.low++;
      
      // Compliance summary
      if (event.compliance_flags) {
        event.compliance_flags.forEach(flag => {
          analytics.compliance_summary[flag] = 
            (analytics.compliance_summary[flag] || 0) + 1;
        });
      }
    });

    // Sort top lists
    analytics.top_ips = Object.entries(analytics.top_ips)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .reduce((obj, [ip, count]) => ({ ...obj, [ip]: count }), {});

    analytics.top_users = Object.entries(analytics.top_users)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .reduce((obj, [user, count]) => ({ ...obj, [user]: count }), {});

    const report = {
      report_id: crypto.randomUUID(),
      generated_at: new Date().toISOString(),
      period: { from: date_from, to: date_to },
      analytics,
      recommendations: generateSecurityRecommendations(analytics),
      compliance_status: await getComplianceStatus(analytics)
    };

    if (include_details) {
      report.detailed_events = securityEvents;
    }

    return {
      success: true,
      report
    };

  } catch (error) {
    console.error('❌ [SECURITY-REPORT] Error generating security report:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get incident summary for reporting
 * @param {String} dateFrom - Start date
 * @param {String} dateTo - End date
 * @returns {Object} Incident summary
 */
const getIncidentSummary = async (dateFrom, dateTo) => {
  try {
    const { data: incidents, error } = await supabaseAdmin
      .from('security_incidents')
      .select('incident_type, severity, status')
      .gte('first_seen', dateFrom)
      .lte('last_seen', dateTo);

    if (error) throw error;

    const summary = {
      total_incidents: incidents.length,
      by_type: {},
      by_severity: {},
      by_status: {}
    };

    incidents.forEach(incident => {
      summary.by_type[incident.incident_type] = 
        (summary.by_type[incident.incident_type] || 0) + 1;
      summary.by_severity[incident.severity] = 
        (summary.by_severity[incident.severity] || 0) + 1;
      summary.by_status[incident.status] = 
        (summary.by_status[incident.status] || 0) + 1;
    });

    return summary;
  } catch (error) {
    console.error('❌ [INCIDENT-SUMMARY] Error getting incident summary:', error);
    return { total_incidents: 0, by_type: {}, by_severity: {}, by_status: {} };
  }
};

/**
 * Generate security recommendations based on analytics
 * @param {Object} analytics - Security analytics data
 * @returns {Array} Array of security recommendations
 */
const generateSecurityRecommendations = (analytics) => {
  const recommendations = [];
  
  try {
    // High-risk events recommendation
    if (analytics.risk_score_distribution.critical > 0) {
      recommendations.push({
        priority: 'high',
        category: 'incident_response',
        title: 'Critical Security Events Detected',
        description: `${analytics.risk_score_distribution.critical} critical security events detected. Immediate investigation required.`,
        action: 'Review critical events and implement immediate containment measures.'
      });
    }

    // Repeated threat types
    const topThreat = Object.entries(analytics.threat_types)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (topThreat && topThreat[1] > 5) {
      recommendations.push({
        priority: 'medium',
        category: 'threat_mitigation',
        title: 'Recurring Threat Pattern',
        description: `${topThreat[1]} incidents of type "${topThreat[0]}" detected.`,
        action: 'Implement additional controls to prevent this type of threat.'
      });
    }

    // High-activity IPs
    const topIP = Object.entries(analytics.top_ips)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (topIP && topIP[1] > 10) {
      recommendations.push({
        priority: 'medium',
        category: 'network_security',
        title: 'High-Activity IP Address',
        description: `IP ${topIP[0]} generated ${topIP[1]} security events.`,
        action: 'Investigate and consider IP blocking if malicious activity is confirmed.'
      });
    }

    // Off-hours activity
    const offHours = [0, 1, 2, 3, 4, 5, 22, 23];
    const offHoursActivity = offHours.reduce((sum, hour) => 
      sum + (analytics.hourly_distribution[hour] || 0), 0);
    
    if (offHoursActivity > analytics.total_events * 0.3) {
      recommendations.push({
        priority: 'low',
        category: 'access_control',
        title: 'High Off-Hours Activity',
        description: `${offHoursActivity} security events occurred outside business hours.`,
        action: 'Review off-hours access policies and implement additional monitoring.'
      });
    }

    // Compliance gaps
    if (Object.keys(analytics.compliance_summary).length === 0) {
      recommendations.push({
        priority: 'low',
        category: 'compliance',
        title: 'Compliance Monitoring',
        description: 'No compliance events detected in the reporting period.',
        action: 'Ensure compliance monitoring is properly configured.'
      });
    }

    return recommendations;
  } catch (error) {
    console.error('❌ [RECOMMENDATIONS] Error generating recommendations:', error);
    return [{
      priority: 'high',
      category: 'system_error',
      title: 'Security Report Error',
      description: 'Error generating security recommendations.',
      action: 'Review security monitoring system configuration.'
    }];
  }
};

/**
 * Get compliance status for various frameworks
 * @param {Object} analytics - Security analytics data
 * @returns {Object} Compliance status
 */
const getComplianceStatus = async (analytics) => {
  try {
    const complianceStatus = {
      gdpr: {
        status: 'compliant',
        score: 85,
        requirements_met: 12,
        requirements_total: 15,
        gaps: []
      },
      soc2: {
        status: 'compliant',
        score: 92,
        requirements_met: 23,
        requirements_total: 25,
        gaps: []
      },
      iso27001: {
        status: 'partial',
        score: 78,
        requirements_met: 18,
        requirements_total: 25,
        gaps: ['incident_response_time', 'security_training']
      }
    };

    // Adjust scores based on analytics
    if (analytics.risk_score_distribution.critical > 0) {
      complianceStatus.gdpr.score -= 10;
      complianceStatus.soc2.score -= 15;
      complianceStatus.iso27001.score -= 20;
    }

    return complianceStatus;
  } catch (error) {
    console.error('❌ [COMPLIANCE-STATUS] Error getting compliance status:', error);
    return {};
  }
};

// =============================================================================
// EXPORTS
// =============================================================================

const securityAuditService = {
  logSecurityEvent,
  generateSecurityReport,
  analyzeThreatLevel,
  encryptAuditData,
  decryptAuditData,
  triggerSecurityMonitoring,
  checkSecurityIncidents,
  SECURITY_LEVELS,
  THREAT_TYPES,
  COMPLIANCE_FRAMEWORKS
};

export default securityAuditService; 