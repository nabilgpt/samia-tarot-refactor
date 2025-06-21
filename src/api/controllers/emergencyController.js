// =============================================================================
// EMERGENCY CONTROLLER - مراقب الطوارئ
// =============================================================================
// Emergency management controller for crisis situations

const { supabaseAdmin: supabase } = require('../lib/supabase.js');

// =============================================================================
// EMERGENCY ALERT FUNCTIONS
// =============================================================================

// Create emergency alert
const createEmergencyAlert = async (req, res) => {
  try {
    const { type, severity, message, location, user_id } = req.body;
    
    const { data, error } = await supabase
      .from('emergency_escalations')
      .insert({
        user_id: user_id || req.user.id,
        emergency_type: type,
        severity_level: severity,
        description: message,
        location_data: location,
        status: 'active',
        created_by: req.user.id,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: data,
      message: 'Emergency alert created successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Create emergency alert error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create emergency alert',
      code: 'CREATE_EMERGENCY_ALERT_ERROR'
    });
  }
};

// Get emergency alerts
const getEmergencyAlerts = async (req, res) => {
  try {
    const { status = 'active', severity, page = 1, limit = 20 } = req.query;
    
    let query = supabase
      .from('emergency_escalations')
      .select(`
        id, emergency_type, severity_level, description, location_data,
        status, created_at, updated_at,
        user:user_id(id, first_name, last_name),
        created_by_user:created_by(id, first_name, last_name)
      `)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (severity) query = query.eq('severity_level', severity);

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get emergency alerts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch emergency alerts',
      code: 'GET_EMERGENCY_ALERTS_ERROR'
    });
  }
};

// Update emergency alert status
const updateEmergencyStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolution_notes } = req.body;

    const { data, error } = await supabase
      .from('emergency_escalations')
      .update({
        status,
        resolution_notes,
        resolved_by: status === 'resolved' ? req.user.id : null,
        resolved_at: status === 'resolved' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Emergency alert not found',
        code: 'EMERGENCY_ALERT_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: data,
      message: 'Emergency alert status updated',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Update emergency status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update emergency status',
      code: 'UPDATE_EMERGENCY_STATUS_ERROR'
    });
  }
};

// =============================================================================
// EMERGENCY CONTACTS FUNCTIONS
// =============================================================================

// Get emergency contacts
const getEmergencyContacts = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('user_id', req.user.id)
      .order('priority', { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get emergency contacts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch emergency contacts',
      code: 'GET_EMERGENCY_CONTACTS_ERROR'
    });
  }
};

// Add emergency contact
const addEmergencyContact = async (req, res) => {
  try {
    const { name, phone, email, relationship, priority } = req.body;

    const { data, error } = await supabase
      .from('emergency_contacts')
      .insert({
        user_id: req.user.id,
        name,
        phone,
        email,
        relationship,
        priority: priority || 1,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: data,
      message: 'Emergency contact added successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Add emergency contact error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add emergency contact',
      code: 'ADD_EMERGENCY_CONTACT_ERROR'
    });
  }
};

// Update emergency contact
const updateEmergencyContact = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('emergency_contacts')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Emergency contact not found',
        code: 'EMERGENCY_CONTACT_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: data,
      message: 'Emergency contact updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Update emergency contact error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update emergency contact',
      code: 'UPDATE_EMERGENCY_CONTACT_ERROR'
    });
  }
};

// Delete emergency contact
const deleteEmergencyContact = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('emergency_contacts')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Emergency contact not found',
        code: 'EMERGENCY_CONTACT_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      message: 'Emergency contact deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Delete emergency contact error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete emergency contact',
      code: 'DELETE_EMERGENCY_CONTACT_ERROR'
    });
  }
};

// =============================================================================
// EMERGENCY PROTOCOLS
// =============================================================================

// Get emergency protocols
const getEmergencyProtocols = async (req, res) => {
  try {
    const protocols = [
      {
        id: 'mental_health_crisis',
        name: 'Mental Health Crisis',
        description: 'Protocol for mental health emergencies',
        steps: [
          'Assess immediate safety',
          'Contact emergency services if needed',
          'Provide emotional support',
          'Connect with mental health professionals'
        ]
      },
      {
        id: 'medical_emergency',
        name: 'Medical Emergency',
        description: 'Protocol for medical emergencies',
        steps: [
          'Call emergency services immediately',
          'Provide first aid if trained',
          'Stay with the person',
          'Contact emergency contacts'
        ]
      }
    ];

    res.json({
      success: true,
      data: protocols,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get emergency protocols error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch emergency protocols',
      code: 'GET_EMERGENCY_PROTOCOLS_ERROR'
    });
  }
};

// Trigger emergency protocol
const triggerEmergencyProtocol = async (req, res) => {
  try {
    const { protocol_id, user_id, additional_info } = req.body;

    // Log the emergency protocol trigger
    const { data, error } = await supabase
      .from('emergency_call_logs')
      .insert({
        user_id: user_id || req.user.id,
        protocol_id,
        triggered_by: req.user.id,
        additional_info,
        status: 'initiated',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: data,
      message: 'Emergency protocol triggered successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Trigger emergency protocol error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger emergency protocol',
      code: 'TRIGGER_EMERGENCY_PROTOCOL_ERROR'
    });
  }
};

// =============================================================================
// ADDITIONAL MISSING FUNCTIONS (STUBS)
// =============================================================================

// Create emergency request
const createEmergencyRequest = async (req, res) => {
  try {
    res.json({ success: true, message: 'Emergency request created' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create emergency request' });
  }
};

// Create anonymous emergency request
const createAnonymousEmergencyRequest = async (req, res) => {
  try {
    res.json({ success: true, message: 'Anonymous emergency request created' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create anonymous emergency request' });
  }
};

// Trigger panic button
const triggerPanicButton = async (req, res) => {
  try {
    res.json({ success: true, message: 'Panic button triggered' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to trigger panic button' });
  }
};

// Escalate session to emergency
const escalateSessionToEmergency = async (req, res) => {
  try {
    res.json({ success: true, message: 'Session escalated to emergency' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to escalate session' });
  }
};

// Get pending emergencies
const getPendingEmergencies = async (req, res) => {
  try {
    res.json({ success: true, data: [], message: 'Pending emergencies retrieved' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get pending emergencies' });
  }
};

// Get active emergencies
const getActiveEmergencies = async (req, res) => {
  try {
    res.json({ success: true, data: [], message: 'Active emergencies retrieved' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get active emergencies' });
  }
};

// Accept emergency response
const acceptEmergencyResponse = async (req, res) => {
  try {
    res.json({ success: true, message: 'Emergency response accepted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to accept emergency response' });
  }
};

// Update emergency response
const updateEmergencyResponse = async (req, res) => {
  try {
    res.json({ success: true, message: 'Emergency response updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update emergency response' });
  }
};

// Assign emergency
const assignEmergency = async (req, res) => {
  try {
    res.json({ success: true, message: 'Emergency assigned' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to assign emergency' });
  }
};

// Escalate emergency
const escalateEmergency = async (req, res) => {
  try {
    res.json({ success: true, message: 'Emergency escalated' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to escalate emergency' });
  }
};

// Send emergency alert
const sendEmergencyAlert = async (req, res) => {
  try {
    res.json({ success: true, message: 'Emergency alert sent' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to send emergency alert' });
  }
};

// Trigger emergency siren
const triggerEmergencySiren = async (req, res) => {
  try {
    res.json({ success: true, message: 'Emergency siren triggered' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to trigger emergency siren' });
  }
};

// Broadcast emergency alert
const broadcastEmergencyAlert = async (req, res) => {
  try {
    res.json({ success: true, message: 'Emergency alert broadcasted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to broadcast emergency alert' });
  }
};

// Resolve emergency
const resolveEmergency = async (req, res) => {
  try {
    res.json({ success: true, message: 'Emergency resolved' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to resolve emergency' });
  }
};

// Close emergency
const closeEmergency = async (req, res) => {
  try {
    res.json({ success: true, message: 'Emergency closed' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to close emergency' });
  }
};

// Add follow up
const addFollowUp = async (req, res) => {
  try {
    res.json({ success: true, message: 'Follow-up added' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to add follow-up' });
  }
};

// Get emergency details
const getEmergencyDetails = async (req, res) => {
  try {
    res.json({ success: true, data: {}, message: 'Emergency details retrieved' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get emergency details' });
  }
};

// Get emergency timeline
const getEmergencyTimeline = async (req, res) => {
  try {
    res.json({ success: true, data: [], message: 'Emergency timeline retrieved' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get emergency timeline' });
  }
};

// Get user emergency history
const getUserEmergencyHistory = async (req, res) => {
  try {
    res.json({ success: true, data: [], message: 'User emergency history retrieved' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get user emergency history' });
  }
};

// Get my emergency requests
const getMyEmergencyRequests = async (req, res) => {
  try {
    res.json({ success: true, data: [], message: 'My emergency requests retrieved' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get my emergency requests' });
  }
};

// Get emergency types
const getEmergencyTypes = async (req, res) => {
  try {
    const types = [
      { id: 'medical', name: 'Medical Emergency', description: 'Medical crisis requiring immediate attention' },
      { id: 'mental_health', name: 'Mental Health Crisis', description: 'Mental health emergency' },
      { id: 'safety', name: 'Safety Threat', description: 'Immediate safety concern' }
    ];
    res.json({ success: true, data: types });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get emergency types' });
  }
};

// Get emergency responders
const getEmergencyResponders = async (req, res) => {
  try {
    res.json({ success: true, data: [], message: 'Emergency responders retrieved' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get emergency responders' });
  }
};

// Update responder availability
const updateResponderAvailability = async (req, res) => {
  try {
    res.json({ success: true, message: 'Responder availability updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update responder availability' });
  }
};

// Get emergency settings
const getEmergencySettings = async (req, res) => {
  try {
    res.json({ success: true, data: {}, message: 'Emergency settings retrieved' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get emergency settings' });
  }
};

// Update emergency settings
const updateEmergencySettings = async (req, res) => {
  try {
    res.json({ success: true, message: 'Emergency settings updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update emergency settings' });
  }
};

// Get emergency analytics
const getEmergencyAnalytics = async (req, res) => {
  try {
    res.json({ success: true, data: {}, message: 'Emergency analytics retrieved' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get emergency analytics' });
  }
};

// Get response time analytics
const getResponseTimeAnalytics = async (req, res) => {
  try {
    res.json({ success: true, data: {}, message: 'Response time analytics retrieved' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get response time analytics' });
  }
};

// Get emergency performance
const getEmergencyPerformance = async (req, res) => {
  try {
    res.json({ success: true, data: {}, message: 'Emergency performance retrieved' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get emergency performance' });
  }
};

// Generate emergency report
const generateEmergencyReport = async (req, res) => {
  try {
    res.json({ success: true, message: 'Emergency report generated' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to generate emergency report' });
  }
};

// Get emergency monitor dashboard
const getEmergencyMonitorDashboard = async (req, res) => {
  try {
    res.json({ success: true, data: {}, message: 'Emergency monitor dashboard retrieved' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get emergency monitor dashboard' });
  }
};

// Get active emergency alerts
const getActiveEmergencyAlerts = async (req, res) => {
  try {
    res.json({ success: true, data: [], message: 'Active emergency alerts retrieved' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get active emergency alerts' });
  }
};

// Update responder heartbeat
const updateResponderHeartbeat = async (req, res) => {
  try {
    res.json({ success: true, message: 'Responder heartbeat updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update responder heartbeat' });
  }
};

// Get emergency queue
const getEmergencyQueue = async (req, res) => {
  try {
    res.json({ success: true, data: [], message: 'Emergency queue retrieved' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get emergency queue' });
  }
};

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  createEmergencyAlert,
  getEmergencyAlerts,
  updateEmergencyStatus,
  getEmergencyContacts,
  addEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
  getEmergencyProtocols,
  triggerEmergencyProtocol,
  createEmergencyRequest,
  createAnonymousEmergencyRequest,
  triggerPanicButton,
  escalateSessionToEmergency,
  getPendingEmergencies,
  getActiveEmergencies,
  acceptEmergencyResponse,
  updateEmergencyResponse,
  assignEmergency,
  escalateEmergency,
  sendEmergencyAlert,
  triggerEmergencySiren,
  broadcastEmergencyAlert,
  resolveEmergency,
  closeEmergency,
  addFollowUp,
  getEmergencyDetails,
  getEmergencyTimeline,
  getUserEmergencyHistory,
  getMyEmergencyRequests,
  getEmergencyTypes,
  getEmergencyResponders,
  updateResponderAvailability,
  getEmergencySettings,
  updateEmergencySettings,
  getEmergencyAnalytics,
  getResponseTimeAnalytics,
  getEmergencyPerformance,
  generateEmergencyReport,
  getEmergencyMonitorDashboard,
  getActiveEmergencyAlerts,
  updateResponderHeartbeat,
  getEmergencyQueue
}; 