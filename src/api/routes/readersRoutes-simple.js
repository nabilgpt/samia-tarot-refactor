import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route GET /api/readers
 * @desc Get all active readers
 * @access Public
 */
router.get('/', async (req, res) => {
  try {
    console.log('👥 [READERS] Fetching all active readers...');
    
    const { data: readers, error } = await supabaseAdmin
      .from('readers')
      .select('*')
      .eq('is_active', true)
      .order('rating', { ascending: false });

    if (error) {
      console.error('❌ [READERS] Error fetching readers:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch readers',
        details: error.message
      });
    }

    console.log(`✅ [READERS] Found ${readers.length} active readers`);
    
    res.json({
      success: true,
      data: readers,
      total: readers.length
    });

  } catch (error) {
    console.error('❌ [READERS] Unexpected error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * @route GET /api/readers/:id
 * @desc Get single reader by ID
 * @access Public
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 [READERS] Fetching reader: ${id}`);
    
    const { data: reader, error } = await supabaseAdmin
      .from('readers')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('❌ [READERS] Error fetching reader:', error);
      return res.status(404).json({
        success: false,
        error: 'Reader not found',
        details: error.message
      });
    }

    console.log(`✅ [READERS] Found reader: ${reader.name}`);
    
    res.json({
      success: true,
      data: reader
    });

  } catch (error) {
    console.error('❌ [READERS] Unexpected error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * @route POST /api/readers
 * @desc Create new reader (Admin only)
 * @access Admin
 */
router.post('/', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']),
  async (req, res) => {
    try {
      const {
        name,
        name_ar,
        name_en,
        email,
        phone,
        specialties,
        bio_ar,
        bio_en,
        hourly_rate,
        experience_years,
        languages = ['ar', 'en'],
        timezone = 'Asia/Damascus',
        is_active = true
      } = req.body;

      console.log('👥 [READERS] Creating new reader...');

      // Validation
      if (!name || !email) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          required: ['name', 'email']
        });
      }

      const { data: reader, error } = await supabaseAdmin
        .from('readers')
        .insert([{
          name,
          name_ar: name_ar || name,
          name_en: name_en || name,
          email,
          phone,
          specialties: Array.isArray(specialties) ? specialties : [specialties],
          bio_ar,
          bio_en,
          hourly_rate: parseFloat(hourly_rate) || 0,
          experience_years: parseInt(experience_years) || 0,
          languages: Array.isArray(languages) ? languages : ['ar', 'en'],
          timezone,
          is_active,
          rating: 0.0,
          total_sessions: 0
        }])
        .select('*')
        .single();

      if (error) {
        console.error('❌ [READERS] Error creating reader:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to create reader',
          details: error.message
        });
      }

      console.log(`✅ [READERS] Created reader: ${reader.name}`);

      res.status(201).json({
        success: true,
        data: reader,
        message: 'Reader created successfully'
      });

    } catch (error) {
      console.error('❌ [READERS] Unexpected error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }
);

/**
 * @route GET /api/readers/:id/availability
 * @desc Check reader availability for booking
 * @access Public
 */
router.get('/:id/availability', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, timezone = 'Asia/Damascus' } = req.query;

    console.log(`📅 [READERS] Checking availability for reader ${id} on ${date}`);

    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'Date parameter is required',
        format: 'YYYY-MM-DD'
      });
    }

    // Get reader
    const { data: reader, error: readerError } = await supabaseAdmin
      .from('readers')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (readerError || !reader) {
      return res.status(404).json({
        success: false,
        error: 'Reader not found or inactive'
      });
    }

    // Get existing bookings for the date
    const startDate = `${date}T00:00:00Z`;
    const endDate = `${date}T23:59:59Z`;

    const { data: bookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select('appointment_time, duration_minutes')
      .eq('reader_id', id)
      .gte('appointment_time', startDate)
      .lte('appointment_time', endDate)
      .eq('status', 'confirmed');

    if (bookingsError) {
      console.error('❌ [READERS] Error fetching bookings:', bookingsError);
      return res.status(500).json({
        success: false,
        error: 'Failed to check availability',
        details: bookingsError.message
      });
    }

    // Generate available time slots (9 AM to 9 PM)
    const availableSlots = [];
    for (let hour = 9; hour < 21; hour++) {
      const timeSlot = `${date}T${hour.toString().padStart(2, '0')}:00:00Z`;
      
      // Check if this slot conflicts with existing bookings
      const hasConflict = bookings.some(booking => {
        const bookingStart = new Date(booking.appointment_time);
        const bookingEnd = new Date(bookingStart.getTime() + (booking.duration_minutes * 60000));
        const slotTime = new Date(timeSlot);
        
        return slotTime >= bookingStart && slotTime < bookingEnd;
      });

      if (!hasConflict) {
        availableSlots.push({
          time: timeSlot,
          formatted: `${hour}:00`,
          available: true
        });
      }
    }

    console.log(`✅ [READERS] Found ${availableSlots.length} available slots`);

    res.json({
      success: true,
      data: {
        reader_id: id,
        reader_name: reader.name,
        date,
        timezone,
        available_slots: availableSlots,
        total_available: availableSlots.length
      }
    });

  } catch (error) {
    console.error('❌ [READERS] Unexpected error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

export default router; 