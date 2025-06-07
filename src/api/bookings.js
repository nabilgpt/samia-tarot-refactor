// =============================================================================
// BOOKINGS API - إدارة الحجوزات والمواعيد
// =============================================================================
// Complete booking management system with real-time updates

const express = require('express');
const moment = require('moment-timezone');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// =============================================================================
// SUPABASE CLIENT SETUP
// =============================================================================
const { supabaseAdmin: supabase } = require('./lib/supabase.js');

// =============================================================================
// RATE LIMITING
// =============================================================================
const bookingsRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: {
    error: 'Too many booking requests, please try again later',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

// =============================================================================
// MIDDLEWARE - استيراد من profiles.js
// =============================================================================
const { authenticateToken } = require('./middleware/auth');

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

const validateBookingData = (data, isUpdate = false) => {
  const errors = [];

  // التحقق من الخدمة
  if (!isUpdate && !data.service_id) {
    errors.push('Service ID is required');
  }

  // التحقق من موعد الحجز
  if (data.scheduled_at) {
    const scheduledDate = moment(data.scheduled_at);
    const now = moment();
    
    if (!scheduledDate.isValid()) {
      errors.push('Invalid scheduled date format');
    } else if (scheduledDate.isBefore(now)) {
      errors.push('Scheduled date cannot be in the past');
    } else if (scheduledDate.isAfter(moment().add(90, 'days'))) {
      errors.push('Cannot schedule more than 90 days in advance');
    }
  }

  // التحقق من الحالة
  if (data.status && !['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].includes(data.status)) {
    errors.push('Invalid booking status');
  }

  // التحقق من طول الملاحظات
  if (data.notes && data.notes.length > 1000) {
    errors.push('Notes cannot exceed 1000 characters');
  }

  return errors;
};

// التحقق من توفر القارئ
const checkReaderAvailability = async (readerId, scheduledAt, bookingId = null) => {
  const startTime = moment(scheduledAt);
  const endTime = moment(scheduledAt).add(30, 'minutes'); // افتراض 30 دقيقة للجلسة

  // البحث عن تعارض في المواعيد
  let query = supabase
    .from('bookings')
    .select('id')
    .eq('reader_id', readerId)
    .in('status', ['confirmed', 'in_progress'])
    .gte('scheduled_at', startTime.toISOString())
    .lt('scheduled_at', endTime.toISOString());

  // استثناء الحجز الحالي في حالة التحديث
  if (bookingId) {
    query = query.neq('id', bookingId);
  }

  const { data: conflicts, error } = await query;

  if (error) {
    throw new Error('Failed to check reader availability');
  }

  return conflicts.length === 0;
};

// =============================================================================
// API ENDPOINTS
// =============================================================================

// GET /api/bookings - جلب كل الحجوزات (حسب الدور)
router.get('/', bookingsRateLimit, authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      service_type,
      is_emergency,
      start_date,
      end_date,
      reader_id,
      user_id,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;

    const requestingUserId = req.user.id;
    const requestingUserRole = req.profile.role;

    // بناء الـ query حسب الدور
    let query = supabase
      .from('bookings')
      .select(`
        id, user_id, reader_id, service_id, scheduled_at, status,
        is_emergency, notes, session_url, recording_url,
        created_at, updated_at,
        profiles!bookings_user_id_fkey (
          id, first_name, last_name, avatar_url
        ),
        profiles!bookings_reader_id_fkey (
          id, first_name, last_name, avatar_url, specialties
        ),
        services (
          id, name, type, price, duration_minutes, is_vip
        )
      `);

    // فلترة حسب الدور
    if (requestingUserRole === 'client') {
      query = query.eq('user_id', requestingUserId);
    } else if (requestingUserRole === 'reader') {
      query = query.eq('reader_id', requestingUserId);
    }
    // admin & super_admin يرون كل الحجوزات

    // فلترة حسب المعايير
    if (status) {
      query = query.eq('status', status);
    }

    if (is_emergency !== undefined) {
      query = query.eq('is_emergency', is_emergency === 'true');
    }

    if (reader_id && ['admin', 'super_admin'].includes(requestingUserRole)) {
      query = query.eq('reader_id', reader_id);
    }

    if (user_id && ['admin', 'super_admin'].includes(requestingUserRole)) {
      query = query.eq('user_id', user_id);
    }

    // فلترة بالتاريخ
    if (start_date) {
      query = query.gte('scheduled_at', start_date);
    }

    if (end_date) {
      query = query.lte('scheduled_at', end_date);
    }

    // فلترة بنوع الخدمة
    if (service_type) {
      query = query.eq('services.type', service_type);
    }

    // الترتيب
    query = query.order(sort_by, { ascending: sort_order === 'asc' });

    // التقسيم إلى صفحات
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: bookings, error, count } = await query;

    if (error) {
      console.error('Error fetching bookings:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch bookings',
        code: 'FETCH_ERROR'
      });
    }

    // إحصائيات إضافية
    const { data: stats } = await supabase
      .from('bookings')
      .select('status, is_emergency')
      .eq(requestingUserRole === 'client' ? 'user_id' : 
          requestingUserRole === 'reader' ? 'reader_id' : 'id', 
          requestingUserRole === 'client' || requestingUserRole === 'reader' ? requestingUserId : 'any');

    const statusStats = stats?.reduce((acc, booking) => {
      acc[booking.status] = (acc[booking.status] || 0) + 1;
      if (booking.is_emergency) {
        acc.emergency = (acc.emergency || 0) + 1;
      }
      return acc;
    }, {}) || {};

    res.json({
      success: true,
      data: {
        bookings,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          total_pages: Math.ceil(count / limit)
        },
        stats: statusStats
      }
    });

  } catch (error) {
    console.error('Bookings fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /api/bookings/:id - تفاصيل حجز معيّن
router.get('/:id', bookingsRateLimit, authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const requestingUserId = req.user.id;
    const requestingUserRole = req.profile.role;

    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        id, user_id, reader_id, service_id, scheduled_at, status,
        is_emergency, notes, session_url, recording_url,
        created_at, updated_at,
        profiles!bookings_user_id_fkey (
          id, first_name, last_name, avatar_url, phone, timezone
        ),
        profiles!bookings_reader_id_fkey (
          id, first_name, last_name, avatar_url, bio, specialties, languages
        ),
        services (
          id, name, description, type, price, duration_minutes, is_vip, is_ai
        ),
        payments (
          id, amount, currency, method, status, created_at
        ),
        messages (
          id, sender_id, content, type, created_at,
          profiles!messages_sender_id_fkey (
            first_name, last_name, avatar_url
          )
        ),
        reviews (
          id, rating, feedback, created_at
        )
      `)
      .eq('id', id)
      .single();

    if (error || !booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found',
        code: 'BOOKING_NOT_FOUND'
      });
    }

    // التحقق من الصلاحية
    const hasAccess = 
      booking.user_id === requestingUserId ||
      booking.reader_id === requestingUserId ||
      ['admin', 'super_admin'].includes(requestingUserRole);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this booking',
        code: 'ACCESS_DENIED'
      });
    }

    // إضافة معلومات إضافية للقارئين
    if (booking.reader_id === requestingUserId || ['admin', 'super_admin'].includes(requestingUserRole)) {
      // تاريخ الحجوزات السابقة مع نفس العميل
      const { data: previousBookings } = await supabase
        .from('bookings')
        .select('id, scheduled_at, status, services(name)')
        .eq('user_id', booking.user_id)
        .eq('reader_id', booking.reader_id)
        .neq('id', id)
        .eq('status', 'completed')
        .order('scheduled_at', { ascending: false })
        .limit(5);

      booking.client_history = previousBookings || [];
    }

    res.json({
      success: true,
      data: booking
    });

  } catch (error) {
    console.error('Booking fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /api/bookings - حجز جديد
router.post('/', bookingsRateLimit, authenticateToken, async (req, res) => {
  try {
    const bookingData = req.body;
    const requestingUserId = req.user.id;
    const requestingUserRole = req.profile.role;

    // التحقق من صحة البيانات
    const validationErrors = validateBookingData(bookingData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validationErrors
      });
    }

    // التحقق من وجود الخدمة
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('*')
      .eq('id', bookingData.service_id)
      .eq('is_active', true)
      .single();

    if (serviceError || !service) {
      return res.status(404).json({
        success: false,
        error: 'Service not found or inactive',
        code: 'SERVICE_NOT_FOUND'
      });
    }

    // تعيين القارئ إذا لم يتم تحديده
    let readerId = bookingData.reader_id;
    
    if (!readerId && !bookingData.is_emergency) {
      // البحث عن قارئ متاح
      const { data: availableReaders } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'reader')
        .eq('is_active', true);

      if (availableReaders && availableReaders.length > 0) {
        // اختيار قارئ عشوائي (يمكن تحسينه لاحقاً)
        readerId = availableReaders[Math.floor(Math.random() * availableReaders.length)].id;
      }
    }

    // التحقق من توفر القارئ إذا كان هناك موعد محدد
    if (readerId && bookingData.scheduled_at) {
      const isAvailable = await checkReaderAvailability(readerId, bookingData.scheduled_at);
      if (!isAvailable) {
        return res.status(409).json({
          success: false,
          error: 'Reader is not available at the requested time',
          code: 'READER_NOT_AVAILABLE'
        });
      }
    }

    // إنشاء الحجز
    const newBooking = {
      user_id: requestingUserId,
      reader_id: readerId,
      service_id: bookingData.service_id,
      scheduled_at: bookingData.scheduled_at,
      status: bookingData.is_emergency ? 'confirmed' : 'pending',
      is_emergency: bookingData.is_emergency || false,
      notes: bookingData.notes
    };

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert([newBooking])
      .select(`
        id, user_id, reader_id, service_id, scheduled_at, status,
        is_emergency, notes, created_at,
        profiles!bookings_user_id_fkey (
          first_name, last_name, phone
        ),
        profiles!bookings_reader_id_fkey (
          first_name, last_name, phone
        ),
        services (
          name, type, price, duration_minutes
        )
      `)
      .single();

    if (bookingError) {
      console.error('Booking creation error:', bookingError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create booking',
        code: 'BOOKING_CREATION_ERROR'
      });
    }

    // إرسال إشعارات
    const notifications = [];

    // إشعار للعميل
    notifications.push({
      user_id: requestingUserId,
      title: booking.is_emergency ? 'Emergency Booking Created' : 'Booking Created Successfully',
      message: `Your booking for ${service.name} has been ${booking.status}.`,
      type: 'booking',
      data: { booking_id: booking.id }
    });

    // إشعار للقارئ إذا تم تعيينه
    if (readerId) {
      notifications.push({
        user_id: readerId,
        title: booking.is_emergency ? 'URGENT: Emergency Booking' : 'New Booking Request',
        message: `New ${booking.is_emergency ? 'emergency ' : ''}booking for ${service.name}.`,
        type: 'booking',
        data: { booking_id: booking.id }
      });
    }

    // إرسال الإشعارات
    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications);
    }

    res.status(201).json({
      success: true,
      data: booking,
      message: 'Booking created successfully'
    });

  } catch (error) {
    console.error('Booking creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// PUT /api/bookings/:id - تعديل حجز
router.put('/:id', bookingsRateLimit, authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const requestingUserId = req.user.id;
    const requestingUserRole = req.profile.role;

    // التحقق من صحة البيانات
    const validationErrors = validateBookingData(updateData, true);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validationErrors
      });
    }

    // التحقق من وجود الحجز
    const { data: existingBooking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingBooking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found',
        code: 'BOOKING_NOT_FOUND'
      });
    }

    // التحقق من الصلاحية
    const canUpdate = 
      existingBooking.user_id === requestingUserId ||
      existingBooking.reader_id === requestingUserId ||
      ['admin', 'super_admin'].includes(requestingUserRole);

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to update this booking',
        code: 'ACCESS_DENIED'
      });
    }

    // منع تعديل الحجوزات المكتملة أو الملغية (إلا للـ admin)
    if (['completed', 'cancelled'].includes(existingBooking.status) && 
        !['admin', 'super_admin'].includes(requestingUserRole)) {
      return res.status(400).json({
        success: false,
        error: 'Cannot modify completed or cancelled bookings',
        code: 'BOOKING_IMMUTABLE'
      });
    }

    // التحقق من توفر القارئ في حالة تغيير الموعد أو القارئ
    if ((updateData.scheduled_at || updateData.reader_id) && 
        updateData.status !== 'cancelled') {
      const newReaderId = updateData.reader_id || existingBooking.reader_id;
      const newScheduledAt = updateData.scheduled_at || existingBooking.scheduled_at;
      
      const isAvailable = await checkReaderAvailability(newReaderId, newScheduledAt, id);
      if (!isAvailable) {
        return res.status(409).json({
          success: false,
          error: 'Reader is not available at the requested time',
          code: 'READER_NOT_AVAILABLE'
        });
      }
    }

    // تحديث timestamp
    updateData.updated_at = new Date().toISOString();

    // تحديث الحجز
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', id)
      .select(`
        id, user_id, reader_id, service_id, scheduled_at, status,
        is_emergency, notes, session_url, recording_url,
        created_at, updated_at,
        profiles!bookings_user_id_fkey (
          first_name, last_name, phone
        ),
        profiles!bookings_reader_id_fkey (
          first_name, last_name, phone
        ),
        services (
          name, type, price
        )
      `)
      .single();

    if (updateError) {
      console.error('Booking update error:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to update booking',
        code: 'UPDATE_ERROR'
      });
    }

    // إرسال إشعارات حسب نوع التحديث
    if (updateData.status && updateData.status !== existingBooking.status) {
      const notifications = [];
      
      // تحديد الرسالة حسب الحالة الجديدة
      let statusMessage = '';
      switch (updateData.status) {
        case 'confirmed':
          statusMessage = 'Your booking has been confirmed';
          break;
        case 'in_progress':
          statusMessage = 'Your session is now starting';
          break;
        case 'completed':
          statusMessage = 'Your session has been completed';
          break;
        case 'cancelled':
          statusMessage = 'Your booking has been cancelled';
          break;
      }

      // إشعار للعميل
      notifications.push({
        user_id: existingBooking.user_id,
        title: 'Booking Status Updated',
        message: statusMessage,
        type: 'booking',
        data: { booking_id: id, new_status: updateData.status }
      });

      // إشعار للقارئ إذا لم يكن هو من قام بالتحديث
      if (existingBooking.reader_id && existingBooking.reader_id !== requestingUserId) {
        notifications.push({
          user_id: existingBooking.reader_id,
          title: 'Booking Status Updated',
          message: `Booking status changed to ${updateData.status}`,
          type: 'booking',
          data: { booking_id: id, new_status: updateData.status }
        });
      }

      await supabase.from('notifications').insert(notifications);
    }

    // تسجيل في الـ audit log
    await supabase
      .from('audit_logs')
      .insert([{
        user_id: requestingUserId,
        action: 'booking_update',
        resource_type: 'booking',
        resource_id: id,
        details: {
          updated_fields: Object.keys(updateData),
          old_status: existingBooking.status,
          new_status: updateData.status
        }
      }]);

    res.json({
      success: true,
      data: updatedBooking,
      message: 'Booking updated successfully'
    });

  } catch (error) {
    console.error('Booking update error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// DELETE /api/bookings/:id - إلغاء/حذف حجز
router.delete('/:id', bookingsRateLimit, authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const requestingUserId = req.user.id;
    const requestingUserRole = req.profile.role;

    // التحقق من وجود الحجز
    const { data: existingBooking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingBooking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found',
        code: 'BOOKING_NOT_FOUND'
      });
    }

    // التحقق من الصلاحية
    const canDelete = 
      existingBooking.user_id === requestingUserId ||
      ['admin', 'super_admin'].includes(requestingUserRole);

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to delete this booking',
        code: 'ACCESS_DENIED'
      });
    }

    // منع حذف الحجوزات قيد التنفيذ أو المكتملة (إلا للـ admin)
    if (['in_progress', 'completed'].includes(existingBooking.status) && 
        !['admin', 'super_admin'].includes(requestingUserRole)) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete in-progress or completed bookings',
        code: 'BOOKING_UNDELETABLE'
      });
    }

    // حذف الحجز (أو تحديث الحالة إلى cancelled)
    const shouldSoftDelete = existingBooking.status !== 'pending';
    
    if (shouldSoftDelete) {
      // Soft delete - تحديث الحالة إلى cancelled
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) {
        console.error('Booking cancellation error:', updateError);
        return res.status(500).json({
          success: false,
          error: 'Failed to cancel booking',
          code: 'CANCELLATION_ERROR'
        });
      }
    } else {
      // Hard delete للحجوزات المعلقة
      const { error: deleteError } = await supabase
        .from('bookings')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('Booking deletion error:', deleteError);
        return res.status(500).json({
          success: false,
          error: 'Failed to delete booking',
          code: 'DELETE_ERROR'
        });
      }
    }

    // إرسال إشعارات
    const notifications = [];
    
    // إشعار للقارئ إذا كان مُعيَّن
    if (existingBooking.reader_id) {
      notifications.push({
        user_id: existingBooking.reader_id,
        title: 'Booking Cancelled',
        message: 'A booking has been cancelled by the client',
        type: 'booking',
        data: { booking_id: id, action: 'cancelled' }
      });
    }

    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications);
    }

    // تسجيل في الـ audit log
    await supabase
      .from('audit_logs')
      .insert([{
        user_id: requestingUserId,
        action: shouldSoftDelete ? 'booking_cancel' : 'booking_delete',
        resource_type: 'booking',
        resource_id: id,
        details: {
          original_status: existingBooking.status,
          action_type: shouldSoftDelete ? 'soft_delete' : 'hard_delete'
        }
      }]);

    res.json({
      success: true,
      message: shouldSoftDelete ? 'Booking cancelled successfully' : 'Booking deleted successfully'
    });

  } catch (error) {
    console.error('Booking deletion error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// =============================================================================
// ERROR HANDLING MIDDLEWARE
// =============================================================================
router.use((error, req, res, _next) => {
  console.error('Bookings API Error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
});

module.exports = router; 