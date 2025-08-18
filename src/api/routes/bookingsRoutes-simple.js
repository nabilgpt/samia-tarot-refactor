import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route POST /api/bookings
 * @desc Create new booking with VIP/Regular validation
 * @access Authenticated Users
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      service_id,
      reader_id,
      appointment_time,
      client_notes,
      timezone = 'Asia/Damascus'
    } = req.body;

    const client_id = req.user.id;

    console.log(`📅 [BOOKINGS] Creating booking for user ${client_id}, service ${service_id}`);

    // Validation
    if (!service_id || !reader_id || !appointment_time) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['service_id', 'reader_id', 'appointment_time']
      });
    }

    // Get service details
    const { data: service, error: serviceError } = await supabaseAdmin
      .from('services')
      .select('*')
      .eq('id', service_id)
      .eq('is_active', true)
      .single();

    if (serviceError || !service) {
      return res.status(404).json({
        success: false,
        error: 'Service not found or inactive'
      });
    }

    // Create booking
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .insert([{
        service_id,
        reader_id,
        client_id,
        appointment_time,
        duration_minutes: service.duration || 60,
        timezone,
        original_price: service.price,
        final_price: service.price,
        is_vip_booking: service.is_vip || false,
        booking_type: service.is_vip ? 'vip' : 'regular',
        client_notes,
        status: 'pending'
      }])
      .select('*')
      .single();

    if (bookingError) {
      console.error('❌ [BOOKINGS] Error creating booking:', bookingError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create booking',
        details: bookingError.message
      });
    }

    console.log(`✅ [BOOKINGS] Created booking: ${booking.id}`);

    res.status(201).json({
      success: true,
      data: booking,
      message: `${service.is_vip ? 'VIP' : 'Regular'} booking created successfully`
    });

  } catch (error) {
    console.error('❌ [BOOKINGS] Unexpected error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * @route GET /api/bookings/my
 * @desc Get user's own bookings
 * @access Authenticated Users
 */
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const client_id = req.user.id;
    const { status, limit = 20, offset = 0 } = req.query;

    console.log(`📋 [BOOKINGS] Fetching bookings for user ${client_id}`);

    let query = supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('client_id', client_id)
      .order('appointment_time', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: bookings, error } = await query;

    if (error) {
      console.error('❌ [BOOKINGS] Error fetching bookings:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch bookings',
        details: error.message
      });
    }

    console.log(`✅ [BOOKINGS] Found ${bookings.length} bookings`);

    res.json({
      success: true,
      data: bookings,
      total: bookings.length
    });

  } catch (error) {
    console.error('❌ [BOOKINGS] Unexpected error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * @route GET /api/bookings/admin/all
 * @desc Get all bookings (Admin only)
 * @access Admin
 */
router.get('/admin/all', 
  authenticateToken, 
  requireRole(['admin', 'super_admin', 'reader']),
  async (req, res) => {
    try {
      const { status, reader_id, limit = 50, offset = 0 } = req.query;

      console.log('👑 [BOOKINGS] Admin fetching all bookings...');

      let query = supabaseAdmin
        .from('bookings')
        .select('*')
        .order('appointment_time', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) {
        query = query.eq('status', status);
      }

      if (reader_id) {
        query = query.eq('reader_id', reader_id);
      }

      const { data: bookings, error } = await query;

      if (error) {
        console.error('❌ [BOOKINGS] Error fetching admin bookings:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch bookings',
          details: error.message
        });
      }

      console.log(`✅ [BOOKINGS] Admin found ${bookings.length} bookings`);

      res.json({
        success: true,
        data: bookings,
        total: bookings.length
      });

    } catch (error) {
      console.error('❌ [BOOKINGS] Unexpected error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }
);

export default router; 