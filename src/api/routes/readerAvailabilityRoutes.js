const express = require('express');
const { supabase } = require('../lib/supabase');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// =====================================================
// READER AVAILABILITY MANAGEMENT
// =====================================================

// Get reader's availability schedule
router.get('/schedule', authMiddleware, requireRole(['reader']), async (req, res) => {
  try {
    const readerId = req.user.id;

    const { data: schedule, error } = await supabase
      .from('reader_availability')
      .select('*')
      .eq('reader_id', readerId)
      .eq('is_active', true)
      .order('day_of_week');

    if (error) throw error;

    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    console.error('Get reader schedule error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update reader's availability schedule
router.put('/schedule', authMiddleware, requireRole(['reader']), async (req, res) => {
  try {
    const readerId = req.user.id;
    const { schedule } = req.body;

    if (!Array.isArray(schedule)) {
      return res.status(400).json({ error: 'Schedule must be an array' });
    }

    // Delete existing schedule
    const { error: deleteError } = await supabase
      .from('reader_availability')
      .delete()
      .eq('reader_id', readerId);

    if (deleteError) throw deleteError;

    // Insert new schedule
    if (schedule.length > 0) {
      const scheduleData = schedule.map(slot => ({
        ...slot,
        reader_id: readerId,
        created_by: readerId
      }));

      const { error: insertError } = await supabase
        .from('reader_availability')
        .insert(scheduleData);

      if (insertError) throw insertError;
    }

    res.json({
      success: true,
      message: 'Schedule updated successfully'
    });
  } catch (error) {
    console.error('Update reader schedule error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get reader's temporary availability overrides
router.get('/overrides', authMiddleware, requireRole(['reader']), async (req, res) => {
  try {
    const readerId = req.user.id;
    const { start_date, end_date } = req.query;

    let query = supabase
      .from('reader_temp_availability')
      .select('*')
      .eq('reader_id', readerId)
      .eq('is_active', true)
      .order('override_date');

    if (start_date) {
      query = query.gte('override_date', start_date);
    }

    if (end_date) {
      query = query.lte('override_date', end_date);
    }

    const { data: overrides, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: overrides
    });
  } catch (error) {
    console.error('Get reader overrides error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create temporary availability override
router.post('/overrides', authMiddleware, requireRole(['reader']), async (req, res) => {
  try {
    const readerId = req.user.id;
    const {
      override_date,
      start_time,
      end_time,
      override_type,
      emergency_available,
      emergency_response_time_minutes,
      reason
    } = req.body;

    // Validate override type
    const validTypes = ['unavailable', 'extended_hours', 'emergency_only'];
    if (!validTypes.includes(override_type)) {
      return res.status(400).json({ error: 'Invalid override type' });
    }

    // Validate time fields based on type
    if (override_type === 'extended_hours' && (!start_time || !end_time)) {
      return res.status(400).json({ error: 'Extended hours requires start and end time' });
    }

    const { data: override, error } = await supabase
      .from('reader_temp_availability')
      .insert({
        reader_id: readerId,
        override_date,
        start_time: override_type === 'extended_hours' ? start_time : null,
        end_time: override_type === 'extended_hours' ? end_time : null,
        override_type,
        emergency_available: emergency_available || false,
        emergency_response_time_minutes: emergency_response_time_minutes || 15,
        reason
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: override
    });
  } catch (error) {
    console.error('Create override error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update temporary availability override
router.put('/overrides/:id', authMiddleware, requireRole(['reader']), async (req, res) => {
  try {
    const readerId = req.user.id;
    const { id } = req.params;
    const updates = req.body;

    const { data: override, error } = await supabase
      .from('reader_temp_availability')
      .update(updates)
      .eq('id', id)
      .eq('reader_id', readerId)
      .select()
      .single();

    if (error) throw error;

    if (!override) {
      return res.status(404).json({ error: 'Override not found' });
    }

    res.json({
      success: true,
      data: override
    });
  } catch (error) {
    console.error('Update override error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete temporary availability override
router.delete('/overrides/:id', authMiddleware, requireRole(['reader']), async (req, res) => {
  try {
    const readerId = req.user.id;
    const { id } = req.params;

    const { error } = await supabase
      .from('reader_temp_availability')
      .delete()
      .eq('id', id)
      .eq('reader_id', readerId);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Override deleted successfully'
    });
  } catch (error) {
    console.error('Delete override error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check if reader is currently available
router.get('/status', authMiddleware, requireRole(['reader']), async (req, res) => {
  try {
    const readerId = req.user.id;
    const { check_emergency } = req.query;

    const { data: isAvailable, error } = await supabase
      .rpc('is_reader_currently_available', {
        p_reader_id: readerId,
        p_check_emergency_only: check_emergency === 'true'
      });

    if (error) throw error;

    res.json({
      success: true,
      data: {
        is_available: isAvailable,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Check availability status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// EMERGENCY CALL MANAGEMENT
// =====================================================

// Get available emergency readers (public endpoint for clients)
router.get('/emergency/available', authMiddleware, async (req, res) => {
  try {
    const { 
      preferred_language = 'en', 
      max_response_time = 30 
    } = req.query;

    const { data: readers, error } = await supabase
      .rpc('get_available_emergency_readers', {
        p_preferred_language: preferred_language,
        p_max_response_time_minutes: parseInt(max_response_time)
      });

    if (error) throw error;

    res.json({
      success: true,
      data: readers
    });
  } catch (error) {
    console.error('Get emergency readers error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create emergency call request (clients only)
router.post('/emergency/request', authMiddleware, requireRole(['client']), async (req, res) => {
  try {
    const clientId = req.user.id;
    const {
      request_type,
      urgency_level,
      topic_category,
      brief_description,
      max_budget_usd,
      preferred_language = 'en'
    } = req.body;

    // Validate required fields
    if (!request_type || !urgency_level) {
      return res.status(400).json({ 
        error: 'Request type and urgency level are required' 
      });
    }

    // Check for existing pending requests
    const { data: existingRequest, error: checkError } = await supabase
      .from('emergency_call_requests')
      .select('id')
      .eq('client_id', clientId)
      .in('status', ['pending', 'reader_assigned', 'reader_accepted'])
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existingRequest) {
      return res.status(409).json({
        error: 'You already have a pending emergency request',
        existing_request_id: existingRequest.id
      });
    }

    // Create emergency request using the function
    const { data: requestId, error } = await supabase
      .rpc('create_emergency_call_request', {
        p_client_id: clientId,
        p_request_type: request_type,
        p_urgency_level: urgency_level,
        p_topic_category: topic_category,
        p_brief_description: brief_description,
        p_max_budget_usd: max_budget_usd,
        p_preferred_language: preferred_language
      });

    if (error) throw error;

    // Fetch the created request
    const { data: request, error: fetchError } = await supabase
      .from('emergency_call_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError) throw fetchError;

    res.json({
      success: true,
      data: request,
      message: 'Emergency call request created successfully'
    });
  } catch (error) {
    console.error('Create emergency request error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get client's emergency requests
router.get('/emergency/requests', authMiddleware, requireRole(['client']), async (req, res) => {
  try {
    const clientId = req.user.id;
    const { status, limit = 10 } = req.query;

    let query = supabase
      .from('emergency_call_requests')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (status) {
      query = query.eq('status', status);
    }

    const { data: requests, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error('Get emergency requests error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cancel emergency request
router.put('/emergency/requests/:id/cancel', authMiddleware, requireRole(['client']), async (req, res) => {
  try {
    const clientId = req.user.id;
    const { id } = req.params;
    const { reason } = req.body;

    const { data: request, error } = await supabase
      .from('emergency_call_requests')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('client_id', clientId)
      .in('status', ['pending', 'reader_assigned'])
      .select()
      .single();

    if (error) throw error;

    if (!request) {
      return res.status(404).json({ 
        error: 'Request not found or cannot be cancelled' 
      });
    }

    res.json({
      success: true,
      data: request,
      message: 'Emergency request cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel emergency request error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// READER EMERGENCY RESPONSE
// =====================================================

// Get reader's emergency notifications
router.get('/emergency/notifications', authMiddleware, requireRole(['reader']), async (req, res) => {
  try {
    const readerId = req.user.id;
    const { status, limit = 20 } = req.query;

    let query = supabase
      .from('reader_emergency_notifications')
      .select(`
        *,
        emergency_call_requests (
          id,
          request_type,
          urgency_level,
          topic_category,
          brief_description,
          max_budget_usd,
          status,
          requested_at,
          expires_at
        )
      `)
      .eq('reader_id', readerId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (status) {
      query = query.eq('notification_status', status);
    }

    const { data: notifications, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('Get emergency notifications error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Respond to emergency request
router.put('/emergency/notifications/:id/respond', authMiddleware, requireRole(['reader']), async (req, res) => {
  try {
    const readerId = req.user.id;
    const { id } = req.params;
    const { response, response_notes } = req.body;

    // Validate response
    const validResponses = ['accept', 'decline', 'maybe'];
    if (!validResponses.includes(response)) {
      return res.status(400).json({ error: 'Invalid response' });
    }

    // Update notification with response
    const { data: notification, error: updateError } = await supabase
      .from('reader_emergency_notifications')
      .update({
        reader_response: response,
        responded_at: new Date().toISOString(),
        response_notes,
        notification_status: 'read'
      })
      .eq('id', id)
      .eq('reader_id', readerId)
      .select()
      .single();

    if (updateError) throw updateError;

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // If accepted, update the emergency request
    if (response === 'accept') {
      const { error: requestError } = await supabase
        .from('emergency_call_requests')
        .update({
          assigned_reader_id: readerId,
          status: 'reader_accepted',
          accepted_at: new Date().toISOString(),
          assignment_method: 'auto'
        })
        .eq('id', notification.emergency_request_id);

      if (requestError) throw requestError;
    }

    res.json({
      success: true,
      data: notification,
      message: `Emergency request ${response}ed successfully`
    });
  } catch (error) {
    console.error('Respond to emergency request error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// ADMIN ENDPOINTS
// =====================================================

// Get all reader availability (admin only)
router.get('/admin/all-schedules', authMiddleware, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { data: schedules, error } = await supabase
      .from('reader_availability')
      .select(`
        *,
        profiles!reader_id (
          id,
          display_name,
          first_name,
          last_name,
          email
        )
      `)
      .eq('is_active', true)
      .order('reader_id');

    if (error) throw error;

    res.json({
      success: true,
      data: schedules
    });
  } catch (error) {
    console.error('Get all schedules error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all emergency requests (admin only)
router.get('/admin/emergency-requests', authMiddleware, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;

    let query = supabase
      .from('emergency_call_requests')
      .select(`
        *,
        client:profiles!client_id (
          id,
          display_name,
          first_name,
          last_name,
          email
        ),
        assigned_reader:profiles!assigned_reader_id (
          id,
          display_name,
          first_name,
          last_name,
          email
        )
      `)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (status) {
      query = query.eq('status', status);
    }

    const { data: requests, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error('Get admin emergency requests error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;