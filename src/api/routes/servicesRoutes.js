import express from 'express';
const router = express.Router();
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

/**
 * @route GET /api/services
 * @desc Get all active services with reader information
 * @access Public
 */
router.get('/', async (req, res) => {
  try {
    console.log('🔍 [SERVICES] Fetching all active services...');
    
    const { data: services, error } = await supabaseAdmin
      .from('services_with_readers')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ [SERVICES] Error fetching services:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch services',
        details: error.message
      });
    }

    console.log(`✅ [SERVICES] Found ${services.length} active services`);
    
    res.json({
      success: true,
      data: services,
      total: services.length
    });

  } catch (error) {
    console.error('❌ [SERVICES] Unexpected error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * @route GET /api/services/vip
 * @desc Get all VIP services
 * @access Public
 */
router.get('/vip', async (req, res) => {
  try {
    console.log('👑 [SERVICES] Fetching VIP services...');
    
    const { data: services, error } = await supabaseAdmin
      .from('services_with_readers')
      .select('*')
      .eq('is_active', true)
      .eq('is_vip', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('❌ [SERVICES] Error fetching VIP services:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch VIP services',
        details: error.message
      });
    }

    console.log(`✅ [SERVICES] Found ${services.length} VIP services`);
    
    res.json({
      success: true,
      data: services,
      total: services.length
    });

  } catch (error) {
    console.error('❌ [SERVICES] Unexpected error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * @route GET /api/services/regular
 * @desc Get all Regular services
 * @access Public
 */
router.get('/regular', async (req, res) => {
  try {
    console.log('📅 [SERVICES] Fetching Regular services...');
    
    const { data: services, error } = await supabaseAdmin
      .from('services_with_readers')
      .select('*')
      .eq('is_active', true)
      .eq('is_vip', false)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('❌ [SERVICES] Error fetching Regular services:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch Regular services',
        details: error.message
      });
    }

    console.log(`✅ [SERVICES] Found ${services.length} Regular services`);
    
    res.json({
      success: true,
      data: services,
      total: services.length
    });

  } catch (error) {
    console.error('❌ [SERVICES] Unexpected error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * @route GET /api/services/:id
 * @desc Get single service by ID
 * @access Public
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 [SERVICES] Fetching service: ${id}`);
    
    const { data: service, error } = await supabaseAdmin
      .from('services_with_readers')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('❌ [SERVICES] Error fetching service:', error);
      return res.status(404).json({
        success: false,
        error: 'Service not found',
        details: error.message
      });
    }

    console.log(`✅ [SERVICES] Found service: ${service.name_en}`);
    
    res.json({
      success: true,
      data: service
    });

  } catch (error) {
    console.error('❌ [SERVICES] Unexpected error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * @route POST /api/services
 * @desc Create new service (Admin only)
 * @access Admin
 */
router.post('/', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']),
  async (req, res) => {
    try {
      const {
        name_ar,
        name_en,
        description_ar,
        description_en,
        price,
        type,
        duration_minutes,
        is_vip,
        reader_id,
        is_active = true
      } = req.body;

      console.log(`➕ [SERVICES] Creating new service: ${name_en}`);

      // Validation
      if (!name_ar || !name_en || !description_ar || !description_en || 
          !price || !type || !duration_minutes || reader_id === undefined || 
          is_vip === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          required: ['name_ar', 'name_en', 'description_ar', 'description_en', 'price', 'type', 'duration_minutes', 'is_vip', 'reader_id']
        });
      }

      // Validate reader exists and is active
      const { data: reader, error: readerError } = await supabaseAdmin
        .from('readers')
        .select('id, name, is_active')
        .eq('id', reader_id)
        .eq('is_active', true)
        .single();

      if (readerError || !reader) {
        return res.status(400).json({
          success: false,
          error: 'Invalid or inactive reader selected',
          details: readerError?.message
        });
      }

      // Create service
      const { data: service, error } = await supabaseAdmin
        .from('services')
        .insert([{
          name_ar,
          name_en,
          description_ar,
          description_en,
          price: parseFloat(price),
          type,
          duration_minutes: parseInt(duration_minutes),
          is_vip: Boolean(is_vip),
          reader_id,
          is_active: Boolean(is_active)
        }])
        .select('*')
        .single();

      if (error) {
        console.error('❌ [SERVICES] Error creating service:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to create service',
          details: error.message
        });
      }

      console.log(`✅ [SERVICES] Created service: ${service.name_en} (VIP: ${service.is_vip})`);
      
      res.status(201).json({
        success: true,
        data: service,
        message: `Service "${service.name_en}" created successfully`
      });

    } catch (error) {
      console.error('❌ [SERVICES] Unexpected error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }
);

/**
 * @route PUT /api/services/:id
 * @desc Update service (Admin only)
 * @access Admin
 */
router.put('/:id', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        name_ar,
        name_en,
        description_ar,
        description_en,
        price,
        type,
        duration_minutes,
        is_vip,
        reader_id,
        is_active,
        featured
      } = req.body;

      console.log(`✏️ [SERVICES] Updating service: ${id}`);

      // Validate reader if provided
      if (reader_id) {
        const { data: reader, error: readerError } = await supabaseAdmin
          .from('readers')
          .select('id, name, is_active')
          .eq('id', reader_id)
          .eq('is_active', true)
          .single();

        if (readerError || !reader) {
          return res.status(400).json({
            success: false,
            error: 'Invalid or inactive reader selected',
            details: readerError?.message
          });
        }
      }

      // Build update object
      const updateData = {};
      if (name_ar !== undefined) updateData.name_ar = name_ar;
      if (name_en !== undefined) updateData.name_en = name_en;
      if (description_ar !== undefined) updateData.description_ar = description_ar;
      if (description_en !== undefined) updateData.description_en = description_en;
      if (price !== undefined) updateData.price = parseFloat(price);
      if (type !== undefined) updateData.type = type;
      if (duration_minutes !== undefined) updateData.duration_minutes = parseInt(duration_minutes);
      if (is_vip !== undefined) updateData.is_vip = Boolean(is_vip);
      if (reader_id !== undefined) updateData.reader_id = reader_id;
      if (is_active !== undefined) updateData.is_active = Boolean(is_active);
      if (featured !== undefined) updateData.featured = Boolean(featured);

      // Update service
      const { data: service, error } = await supabaseAdmin
        .from('services')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error('❌ [SERVICES] Error updating service:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to update service',
          details: error.message
        });
      }

      if (!service) {
        return res.status(404).json({
          success: false,
          error: 'Service not found'
        });
      }

      console.log(`✅ [SERVICES] Updated service: ${service.name_en} (VIP: ${service.is_vip})`);
      
      res.json({
        success: true,
        data: service,
        message: `Service "${service.name_en}" updated successfully`
      });

    } catch (error) {
      console.error('❌ [SERVICES] Unexpected error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }
);

/**
 * @route DELETE /api/services/:id
 * @desc Delete service (Admin only)
 * @access Admin
 */
router.delete('/:id', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']),
  async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`🗑️ [SERVICES] Deleting service: ${id}`);

      // Check if service has any bookings
      const { data: bookings, error: bookingsError } = await supabaseAdmin
        .from('bookings')
        .select('id')
        .eq('service_id', id)
        .eq('status', 'confirmed');

      if (bookingsError) {
        console.error('❌ [SERVICES] Error checking bookings:', bookingsError);
        return res.status(500).json({
          success: false,
          error: 'Failed to check existing bookings'
        });
      }

      if (bookings && bookings.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete service with existing confirmed bookings',
          details: `Service has ${bookings.length} confirmed bookings`
        });
      }

      // Delete service
      const { data: service, error } = await supabaseAdmin
        .from('services')
        .delete()
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error('❌ [SERVICES] Error deleting service:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to delete service',
          details: error.message
        });
      }

      if (!service) {
        return res.status(404).json({
          success: false,
          error: 'Service not found'
        });
      }

      console.log(`✅ [SERVICES] Deleted service: ${service.name_en}`);
      
      res.json({
        success: true,
        message: `Service "${service.name_en}" deleted successfully`
      });

    } catch (error) {
      console.error('❌ [SERVICES] Unexpected error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }
);

/**
 * @route GET /api/services/:id/available-slots
 * @desc Get available time slots for a service on a specific date
 * @access Public
 */
router.get('/:id/available-slots', async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'Date parameter is required (YYYY-MM-DD format)'
      });
    }

    console.log(`📅 [SERVICES] Getting available slots for service ${id} on ${date}`);

    // Validate service exists
    const { data: service, error: serviceError } = await supabaseAdmin
      .from('services')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (serviceError || !service) {
      return res.status(404).json({
        success: false,
        error: 'Service not found or inactive'
      });
    }

    // Generate time slots (9 AM to 9 PM, every 30 minutes)
    const slots = [];
    const selectedDate = new Date(date);
    const now = new Date();

    for (let hour = 9; hour < 21; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotTime = new Date(selectedDate);
        slotTime.setHours(hour, minute, 0, 0);

        // Skip past slots
        if (slotTime <= now) continue;

        // Check if slot is already booked
        const { data: existingBooking } = await supabaseAdmin
          .from('bookings')
          .select('id')
          .eq('reader_id', service.reader_id)
          .eq('appointment_time', slotTime.toISOString())
          .not('status', 'in', '(cancelled,no_show)')
          .single();

        const isBooked = !!existingBooking;

        // Validate booking rules
        const timeDiffHours = (slotTime - now) / (1000 * 60 * 60);
        const appointmentDate = slotTime.toDateString();
        const today = now.toDateString();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();
        const dayAfterTomorrow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toDateString();

        let isValid = false;
        let reason = '';

        if (isBooked) {
          isValid = false;
          reason = 'Already booked';
        } else if (service.is_vip) {
          // VIP rules: can book today/tomorrow if >= 2h notice
          if (timeDiffHours >= 2 && (appointmentDate === today || appointmentDate === tomorrow || appointmentDate >= dayAfterTomorrow)) {
            isValid = true;
            reason = 'Available for VIP booking';
          } else if (timeDiffHours < 2) {
            isValid = false;
            reason = 'VIP services require at least 2 hours notice';
          }
        } else {
          // Regular rules: only day after tomorrow and beyond
          if (appointmentDate >= dayAfterTomorrow) {
            isValid = true;
            reason = 'Available for regular booking';
          } else {
            isValid = false;
            reason = 'Regular services can only be booked starting the day after tomorrow';
          }
        }

        slots.push({
          time: slotTime.toISOString(),
          hour: hour,
          minute: minute,
          display_time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
          is_available: isValid,
          is_booked: isBooked,
          booking_type: service.is_vip ? 'vip' : 'regular',
          reason: reason
        });
      }
    }

    console.log(`✅ [SERVICES] Generated ${slots.length} slots, ${slots.filter(s => s.is_available).length} available`);

    res.json({
      success: true,
      data: {
        service_id: service.id,
        service_name: service.name_en,
        is_vip: service.is_vip,
        date: date,
        slots: slots,
        available_count: slots.filter(s => s.is_available).length,
        total_count: slots.length
      }
    });

  } catch (error) {
    console.error('❌ [SERVICES] Unexpected error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// =====================================================
// ADMIN SERVICE MANAGEMENT ROUTES
// All routes require admin authentication
// =====================================================

/**
 * @route GET /api/services
 * @desc Get all services (admin view with reader details)
 * @access Admin/Super Admin
 */
router.get('/admin', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      const { page = 1, limit = 50, type, is_vip, is_active, reader_id } = req.query;
      
      let query = supabaseAdmin
        .from('admin_services_view')
        .select('*');

      // Apply filters
      if (type) query = query.eq('type', type);
      if (is_vip !== undefined) query = query.eq('is_vip', is_vip === 'true');
      if (is_active !== undefined) query = query.eq('is_active', is_active === 'true');
      if (reader_id) query = query.eq('reader_id', reader_id);

      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error('Get services error:', error);
        throw error;
      }

      res.json({
        success: true,
        data: data || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      });

    } catch (error) {
      console.error('Get services API error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch services',
        details: error.message
      });
    }
  }
);

/**
 * @route POST /api/services
 * @desc Create new service with VIP flag and reader assignment
 * @access Admin/Super Admin
 */
router.post('/admin', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      const {
        name_ar,
        name_en,
        description_ar,
        description_en,
        price,
        type,
        duration_minutes,
        is_active = true,
        is_vip = false,
        reader_id
      } = req.body;

      // 🚨 CRITICAL VALIDATION: All fields required
      const requiredFields = {
        name_ar: 'Arabic name',
        name_en: 'English name', 
        description_ar: 'Arabic description',
        description_en: 'English description',
        price: 'Price',
        type: 'Service type',
        duration_minutes: 'Duration',
        reader_id: 'Reader'
      };

      const missingFields = [];
      for (const [field, label] of Object.entries(requiredFields)) {
        if (!req.body[field] || req.body[field] === '' || req.body[field] === null || req.body[field] === undefined) {
          missingFields.push(label);
        }
      }

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          missing_fields: missingFields,
          code: 'VALIDATION_ERROR'
        });
      }

      // Validate numeric fields
      if (isNaN(price) || price <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Price must be a positive number',
          code: 'INVALID_PRICE'
        });
      }

      if (isNaN(duration_minutes) || duration_minutes <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Duration must be a positive number',
          code: 'INVALID_DURATION'
        });
      }

      // Validate service type
      const validTypes = ['tarot', 'coffee', 'dream', 'numerology', 'astrology', 'general_reading', 'relationship', 'career', 'spiritual'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid service type',
          valid_types: validTypes,
          code: 'INVALID_TYPE'
        });
      }

      // 🚨 CRITICAL: Validate reader exists and is active
      const { data: reader, error: readerError } = await supabaseAdmin
        .from('profiles')
        .select('id, role, is_active, first_name, last_name')
        .eq('id', reader_id)
        .single();

      if (readerError || !reader) {
        return res.status(400).json({
          success: false,
          error: 'Reader not found',
          code: 'READER_NOT_FOUND'
        });
      }

      if (!reader.is_active) {
        return res.status(400).json({
          success: false,
          error: 'Reader is not active',
          code: 'READER_INACTIVE'
        });
      }

      if (!['reader', 'admin', 'super_admin'].includes(reader.role)) {
        return res.status(400).json({
          success: false,
          error: 'User is not a reader',
          code: 'INVALID_READER_ROLE'
        });
      }

      // Create service with all required fields
      const serviceData = {
        name_ar: name_ar.trim(),
        name_en: name_en.trim(),
        description_ar: description_ar.trim(),
        description_en: description_en.trim(),
        price: parseFloat(price),
        type,
        duration_minutes: parseInt(duration_minutes),
        is_active: Boolean(is_active),
        is_vip: Boolean(is_vip),
        reader_id,
        created_by: req.user.id
      };

      console.log('🔄 Creating service:', serviceData);

      const { data: newService, error: createError } = await supabaseAdmin
        .from('services')
        .insert([serviceData])
        .select(`
          *,
          reader:profiles!services_reader_id_fkey(
            id,
            first_name,
            last_name,
            display_name,
            email
          )
        `)
        .single();

      if (createError) {
        console.error('Create service error:', createError);
        
        // Handle duplicate name errors
        if (createError.code === '23505') {
          return res.status(400).json({
            success: false,
            error: 'Service name already exists',
            code: 'DUPLICATE_NAME'
          });
        }
        
        throw createError;
      }

      console.log('✅ Service created successfully:', newService.id);

      res.status(201).json({
        success: true,
        data: newService,
        message: 'Service created successfully'
      });

    } catch (error) {
      console.error('Create service API error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create service',
        details: error.message
      });
    }
  }
);

/**
 * @route GET /api/services/readers
 * @desc Get all active readers for service assignment dropdown
 * @access Admin/Super Admin  
 */
router.get('/readers', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      console.log('🔄 Loading readers for service assignment...');

      const { data: readers, error } = await supabaseAdmin
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          display_name,
          email,
          specializations,
          languages,
          avatar_url
        `)
        .in('role', ['reader', 'admin', 'super_admin'])
        .eq('is_active', true)
        .order('first_name');

      if (error) {
        console.error('Get readers error:', error);
        throw error;
      }

      // Format readers for dropdown
      const formattedReaders = (readers || []).map(reader => ({
        id: reader.id,
        name: `${reader.first_name || ''} ${reader.last_name || ''}`.trim() || reader.display_name || reader.email,
        display_name: reader.display_name,
        email: reader.email,
        specializations: reader.specializations || [],
        languages: reader.languages || ['en'],
        avatar_url: reader.avatar_url
      }));

      console.log(`✅ Loaded ${formattedReaders.length} active readers`);

      res.json({
        success: true,
        data: formattedReaders,
        total: formattedReaders.length
      });

    } catch (error) {
      console.error('Get readers API error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch readers',
        details: error.message
      });
    }
  }
);

/**
 * @route GET /api/services/types
 * @desc Get all valid service types for dropdown
 * @access Admin/Super Admin
 */
router.get('/types', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      const serviceTypes = [
        { value: 'tarot', label_en: 'Tarot Reading', label_ar: 'قراءة التاروت' },
        { value: 'coffee', label_en: 'Coffee Reading', label_ar: 'قراءة القهوة' },
        { value: 'dream', label_en: 'Dream Interpretation', label_ar: 'تفسير الأحلام' },
        { value: 'numerology', label_en: 'Numerology', label_ar: 'علم الأرقام' },
        { value: 'astrology', label_en: 'Astrology', label_ar: 'علم التنجيم' },
        { value: 'general_reading', label_en: 'General Reading', label_ar: 'قراءة عامة' },
        { value: 'relationship', label_en: 'Relationship Reading', label_ar: 'قراءة العلاقات' },
        { value: 'career', label_en: 'Career Guidance', label_ar: 'إرشاد مهني' },
        { value: 'spiritual', label_en: 'Spiritual Guidance', label_ar: 'إرشاد روحي' }
      ];

      res.json({
        success: true,
        data: serviceTypes
      });

    } catch (error) {
      console.error('Get service types API error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch service types',
        details: error.message
      });
    }
  }
);

/**
 * @route PUT /api/services/:id
 * @desc Update existing service
 * @access Admin/Super Admin
 */
router.put('/admin/:id', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = { ...req.body };
      
      // Remove id from update data
      delete updateData.id;
      delete updateData.created_at;
      delete updateData.created_by;
      
      // Add updated metadata
      updateData.updated_by = req.user.id;
      updateData.updated_at = new Date().toISOString();

      const { data: updatedService, error } = await supabaseAdmin
        .from('services')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          reader:profiles!services_reader_id_fkey(
            id,
            first_name,
            last_name,
            display_name,
            email
          )
        `)
        .single();

      if (error) {
        console.error('Update service error:', error);
        throw error;
      }

      res.json({
        success: true,
        data: updatedService,
        message: 'Service updated successfully'
      });

    } catch (error) {
      console.error('Update service API error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update service',
        details: error.message
      });
    }
  }
);

/**
 * @route DELETE /api/services/:id
 * @desc Delete service (soft delete by setting inactive)
 * @access Admin/Super Admin
 */
router.delete('/admin/:id', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      const { id } = req.params;

      // Soft delete by setting inactive
      const { data: deletedService, error } = await supabaseAdmin
        .from('services')
        .update({ 
          is_active: false,
          updated_by: req.user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Delete service error:', error);
        throw error;
      }

      res.json({
        success: true,
        data: deletedService,
        message: 'Service deactivated successfully'
      });

    } catch (error) {
      console.error('Delete service API error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete service',
        details: error.message
      });
    }
  }
);

export default router; 
