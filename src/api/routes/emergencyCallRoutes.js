const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabase');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { body, param, query, validationResult } = require('express-validator');

// ============================================================================
// EMERGENCY CALL PRICING MANAGEMENT
// ============================================================================

// Get emergency call pricing
router.get('/pricing', async (req, res) => {
  try {
    const { region = 'GLOBAL' } = req.query;
    
    const { data, error } = await supabase
      .from('emergency_call_pricing')
      .select('*')
      .eq('is_active', true)
      .eq('region_code', region)
      .order('call_type');

    if (error) throw error;

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Error fetching emergency call pricing:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch emergency call pricing',
      error: error.message
    });
  }
});

// Update emergency call pricing (Admin only)
router.put('/pricing/:id', 
  authenticateToken,
  requireRole(['admin', 'super_admin']),
  [
    param('id').isUUID(),
    body('base_price').isFloat({ min: 0 }),
    body('emergency_multiplier').isFloat({ min: 1 }),
    body('per_minute_rate').isFloat({ min: 0 }),
    body('minimum_duration_minutes').isInt({ min: 1 }),
    body('maximum_duration_minutes').isInt({ min: 1 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const updateData = req.body;

      const { data, error } = await supabase
        .from('emergency_call_pricing')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      res.json({
        success: true,
        data,
        message: 'Emergency call pricing updated successfully'
      });
    } catch (error) {
      console.error('Error updating emergency call pricing:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update emergency call pricing',
        error: error.message
      });
    }
  }
);

// ============================================================================
// EMERGENCY CALL INITIATION
// ============================================================================

// Initiate emergency call
router.post('/initiate',
  authenticateToken,
  [
    body('call_type').isIn(['audio', 'video']),
    body('reader_id').optional().isUUID(),
    body('message').optional().isString().isLength({ max: 500 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { call_type, reader_id, message = '' } = req.body;
      const client_id = req.user.id;

      // Check daily emergency call limit
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: todayCalls, error: countError } = await supabase
        .from('emergency_call_logs')
        .select('id')
        .eq('client_id', client_id)
        .gte('created_at', today.toISOString());

      if (countError) throw countError;

      // Get daily limit from settings
      const { data: settings } = await supabase
        .from('emergency_call_settings')
        .select('setting_value')
        .eq('setting_key', 'max_emergency_calls_per_user_per_day')
        .single();

      const dailyLimit = settings?.setting_value?.limit || 5;
      
      if (todayCalls?.length >= dailyLimit) {
        return res.status(429).json({
          success: false,
          message: `Daily emergency call limit (${dailyLimit}) exceeded`,
          code: 'DAILY_LIMIT_EXCEEDED'
        });
      }

      // Get pricing for call type
      const { data: pricing, error: pricingError } = await supabase
        .from('emergency_call_pricing')
        .select('*')
        .eq('call_type', call_type)
        .eq('is_active', true)
        .eq('region_code', 'GLOBAL')
        .single();

      if (pricingError || !pricing) {
        return res.status(400).json({
          success: false,
          message: 'Emergency call pricing not configured',
          code: 'PRICING_NOT_CONFIGURED'
        });
      }

      // Calculate final price
      const finalPrice = pricing.base_price * pricing.emergency_multiplier;

      // Create emergency call log
      const { data: emergencyCall, error: callError } = await supabase
        .from('emergency_call_logs')
        .insert({
          client_id,
          reader_id,
          call_type,
          status: 'pending',
          message,
          escalation_level: 0,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (callError) throw callError;

      // Create transaction record
      const { data: transaction, error: transactionError } = await supabase
        .from('emergency_call_transactions')
        .insert({
          emergency_call_id: emergencyCall.id,
          client_id,
          reader_id,
          call_type,
          base_price: pricing.base_price,
          emergency_multiplier: pricing.emergency_multiplier,
          final_price: finalPrice,
          total_amount: finalPrice,
          currency: pricing.currency,
          payment_status: 'pending',
          pricing_snapshot: pricing
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      // If specific reader selected, notify them
      if (reader_id) {
        // Send real-time notification to reader
        await supabase
          .from('notifications')
          .insert({
            user_id: reader_id,
            title: 'Emergency Call Request',
            message: `Emergency ${call_type} call request from client`,
            type: 'emergency_call',
            data: {
              emergency_call_id: emergencyCall.id,
              call_type,
              client_id,
              final_price: finalPrice
            },
            priority: 'high'
          });
      } else {
        // Auto-select available reader
        const selectedReader = await selectAvailableReader(call_type);
        if (selectedReader) {
          // Update emergency call with selected reader
          await supabase
            .from('emergency_call_logs')
            .update({ reader_id: selectedReader.id })
            .eq('id', emergencyCall.id);

          // Send notification to selected reader
          await supabase
            .from('notifications')
            .insert({
              user_id: selectedReader.id,
              title: 'Emergency Call Assignment',
              message: `You have been assigned an emergency ${call_type} call`,
              type: 'emergency_call',
              data: {
                emergency_call_id: emergencyCall.id,
                call_type,
                client_id,
                final_price: finalPrice
              },
              priority: 'high'
            });
        }
      }

      // Start escalation timer
      setTimeout(async () => {
        await checkAndEscalateCall(emergencyCall.id);
      }, 30000); // 30 seconds initial timeout

      res.status(201).json({
        success: true,
        data: {
          emergency_call_id: emergencyCall.id,
          call_type,
          final_price: finalPrice,
          currency: pricing.currency,
          status: 'pending',
          estimated_response_time: '30 seconds'
        },
        message: 'Emergency call initiated successfully'
      });

    } catch (error) {
      console.error('Error initiating emergency call:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to initiate emergency call',
        error: error.message
      });
    }
  }
);

// ============================================================================
// READER RESPONSE TO EMERGENCY CALLS
// ============================================================================

// Accept emergency call (Reader only)
router.post('/:emergencyCallId/accept',
  authenticateToken,
  requireRole(['reader']),
  [
    param('emergencyCallId').isUUID()
  ],
  async (req, res) => {
    try {
      const { emergencyCallId } = req.params;
      const reader_id = req.user.id;

      // Verify reader is assigned to this call
      const { data: emergencyCall, error: fetchError } = await supabase
        .from('emergency_call_logs')
        .select('*')
        .eq('id', emergencyCallId)
        .eq('reader_id', reader_id)
        .eq('status', 'pending')
        .single();

      if (fetchError || !emergencyCall) {
        return res.status(404).json({
          success: false,
          message: 'Emergency call not found or not assigned to you',
          code: 'CALL_NOT_FOUND'
        });
      }

      // Update call status to accepted
      const { error: updateError } = await supabase
        .from('emergency_call_logs')
        .update({
          status: 'accepted',
          reader_response_time: Math.floor((new Date() - new Date(emergencyCall.created_at)) / 1000),
          updated_at: new Date().toISOString()
        })
        .eq('id', emergencyCallId);

      if (updateError) throw updateError;

      // Create call session
      const { data: callSession, error: sessionError } = await supabase
        .from('call_sessions')
        .insert({
          client_id: emergencyCall.client_id,
          reader_id,
          session_type: emergencyCall.call_type,
          status: 'connecting',
          is_emergency: true
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Create call session features
      const { error: featuresError } = await supabase
        .from('call_session_features')
        .insert({
          call_session_id: callSession.id,
          client_camera_enabled: emergencyCall.call_type === 'video',
          reader_camera_enabled: false, // Always false per requirements
          client_can_control_camera: true,
          reader_can_control_camera: false,
          recording_enabled: true, // Auto-record emergency calls
          is_emergency_call: true,
          emergency_escalation_timeout_seconds: 300,
          emergency_siren_enabled: true
        });

      if (featuresError) throw featuresError;

      // Notify client that call was accepted
      await supabase
        .from('notifications')
        .insert({
          user_id: emergencyCall.client_id,
          title: 'Emergency Call Accepted',
          message: 'Your emergency call has been accepted. Connecting...',
          type: 'emergency_call_accepted',
          data: {
            emergency_call_id: emergencyCallId,
            call_session_id: callSession.id,
            reader_id
          },
          priority: 'high'
        });

      res.json({
        success: true,
        data: {
          emergency_call_id: emergencyCallId,
          call_session_id: callSession.id,
          call_type: emergencyCall.call_type,
          client_id: emergencyCall.client_id,
          status: 'accepted'
        },
        message: 'Emergency call accepted successfully'
      });

    } catch (error) {
      console.error('Error accepting emergency call:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to accept emergency call',
        error: error.message
      });
    }
  }
);

// ============================================================================
// CALL SESSION MANAGEMENT
// ============================================================================

// Start call session
router.post('/session/:sessionId/start',
  authenticateToken,
  [
    param('sessionId').isUUID()
  ],
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      const user_id = req.user.id;

      // Verify user is participant in this session
      const { data: session, error: fetchError } = await supabase
        .from('call_sessions')
        .select('*, call_session_features(*)')
        .eq('id', sessionId)
        .or(`client_id.eq.${user_id},reader_id.eq.${user_id}`)
        .single();

      if (fetchError || !session) {
        return res.status(404).json({
          success: false,
          message: 'Call session not found',
          code: 'SESSION_NOT_FOUND'
        });
      }

      // Update session status to active
      const { error: updateError } = await supabase
        .from('call_sessions')
        .update({
          status: 'active',
          started_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (updateError) throw updateError;

      // Start recording if enabled
      if (session.call_session_features?.[0]?.recording_enabled) {
        const { data: recording, error: recordingError } = await supabase
          .from('call_recordings')
          .insert({
            call_session_id: sessionId,
            recording_type: session.session_type,
            status: 'recording',
            started_at: new Date().toISOString()
          })
          .select()
          .single();

        if (!recordingError) {
          // Create recording permissions
          await supabase
            .from('call_recording_permissions')
            .insert({
              call_recording_id: recording.id,
              client_can_access: true,
              reader_can_access: true,
              admin_can_access: true,
              is_emergency_recording: session.is_emergency || false,
              mandatory_retention: session.is_emergency || false
            });
        }
      }

      res.json({
        success: true,
        data: {
          session_id: sessionId,
          status: 'active',
          features: session.call_session_features?.[0] || {},
          recording_enabled: session.call_session_features?.[0]?.recording_enabled || false
        },
        message: 'Call session started successfully'
      });

    } catch (error) {
      console.error('Error starting call session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start call session',
        error: error.message
      });
    }
  }
);

// End call session
router.post('/session/:sessionId/end',
  authenticateToken,
  [
    param('sessionId').isUUID(),
    body('duration_minutes').optional().isInt({ min: 0 })
  ],
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { duration_minutes = 0 } = req.body;
      const user_id = req.user.id;

      // Verify user is participant in this session
      const { data: session, error: fetchError } = await supabase
        .from('call_sessions')
        .select('*')
        .eq('id', sessionId)
        .or(`client_id.eq.${user_id},reader_id.eq.${user_id}`)
        .single();

      if (fetchError || !session) {
        return res.status(404).json({
          success: false,
          message: 'Call session not found',
          code: 'SESSION_NOT_FOUND'
        });
      }

      // Update session status to completed
      const { error: updateError } = await supabase
        .from('call_sessions')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
          duration_minutes
        })
        .eq('id', sessionId);

      if (updateError) throw updateError;

      // Stop any active recordings
      const { error: recordingError } = await supabase
        .from('call_recordings')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
          duration_minutes
        })
        .eq('call_session_id', sessionId)
        .eq('status', 'recording');

      // Update emergency call transaction with final duration and amount
      if (session.is_emergency) {
        const { data: transaction } = await supabase
          .from('emergency_call_transactions')
          .select('*')
          .eq('call_session_id', sessionId)
          .single();

        if (transaction) {
          const { data: pricing } = await supabase
            .from('emergency_call_pricing')
            .select('*')
            .eq('call_type', session.session_type)
            .eq('is_active', true)
            .single();

          if (pricing) {
            const additionalMinutes = Math.max(0, duration_minutes - pricing.minimum_duration_minutes);
            const additionalCost = additionalMinutes * pricing.per_minute_rate;
            const finalAmount = transaction.final_price + additionalCost;

            await supabase
              .from('emergency_call_transactions')
              .update({
                duration_minutes,
                total_amount: finalAmount,
                payment_status: 'completed'
              })
              .eq('id', transaction.id);
          }
        }
      }

      res.json({
        success: true,
        data: {
          session_id: sessionId,
          status: 'completed',
          duration_minutes
        },
        message: 'Call session ended successfully'
      });

    } catch (error) {
      console.error('Error ending call session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to end call session',
        error: error.message
      });
    }
  }
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Select available reader for emergency call
async function selectAvailableReader(call_type) {
  try {
    const { data: readers, error } = await supabase
      .from('reader_emergency_settings')
      .select(`
        reader_id,
        profiles!inner(id, full_name, role)
      `)
      .eq('accepts_emergency_calls', true)
      .eq('profiles.role', 'reader');

    if (error || !readers?.length) return null;

    // Simple round-robin selection (can be enhanced with more sophisticated algorithms)
    const randomIndex = Math.floor(Math.random() * readers.length);
    return readers[randomIndex].profiles;
  } catch (error) {
    console.error('Error selecting available reader:', error);
    return null;
  }
}

// Check and escalate unanswered emergency calls
async function checkAndEscalateCall(emergencyCallId) {
  try {
    const { data: call, error } = await supabase
      .from('emergency_call_logs')
      .select('*')
      .eq('id', emergencyCallId)
      .eq('status', 'pending')
      .single();

    if (error || !call) return;

    // Escalate to monitor/admin
    const { error: escalateError } = await supabase
      .from('emergency_escalations')
      .insert({
        emergency_call_id: emergencyCallId,
        escalated_to_role: 'monitor',
        escalation_reason: 'Reader did not respond within timeout',
        escalated_at: new Date().toISOString()
      });

    if (!escalateError) {
      // Update call escalation level
      await supabase
        .from('emergency_call_logs')
        .update({
          escalation_level: (call.escalation_level || 0) + 1,
          status: 'escalated'
        })
        .eq('id', emergencyCallId);

      // Notify monitors/admins
      const { data: monitors } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['monitor', 'admin', 'super_admin']);

      if (monitors?.length) {
        const notifications = monitors.map(monitor => ({
          user_id: monitor.id,
          title: 'Emergency Call Escalation',
          message: 'An emergency call requires immediate attention',
          type: 'emergency_escalation',
          data: {
            emergency_call_id: emergencyCallId,
            escalation_level: (call.escalation_level || 0) + 1
          },
          priority: 'critical'
        }));

        await supabase
          .from('notifications')
          .insert(notifications);
      }
    }
  } catch (error) {
    console.error('Error escalating emergency call:', error);
  }
}

module.exports = router; 