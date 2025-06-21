const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateRequest, sanitizeInput } = require('../middleware/validation');
const Joi = require('joi');

// ============================================================
// VALIDATION SCHEMAS
// ============================================================

const feedbackSubmissionSchema = Joi.object({
  service_type: Joi.string().valid('tarot_reading', 'call_session', 'chat_session', 'astrology', 'palm_reading', 'spiritual_guidance').required(),
  session_id: Joi.string().uuid().optional(),
  booking_id: Joi.string().uuid().required(),
  reader_id: Joi.string().uuid().required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().max(2000).optional().allow(''),
  is_anonymous: Joi.boolean().default(false)
});

const feedbackModerationSchema = Joi.object({
  moderation_status: Joi.string().valid('approved', 'edited', 'deleted', 'rejected').required(),
  moderated_rating: Joi.number().integer().min(1).max(5).optional(),
  moderated_comment: Joi.string().max(2000).optional().allow(''),
  is_visible_to_reader: Joi.boolean().default(false),
  is_visible_to_public: Joi.boolean().default(false),
  moderation_reason: Joi.string().max(500).optional(),
  admin_notes: Joi.string().max(1000).optional()
});

const feedbackQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('pending', 'approved', 'edited', 'deleted', 'rejected').optional(),
  service_type: Joi.string().valid('tarot_reading', 'call_session', 'chat_session', 'astrology', 'palm_reading', 'spiritual_guidance').optional(),
  reader_id: Joi.string().uuid().optional(),
  client_id: Joi.string().uuid().optional(),
  rating_min: Joi.number().integer().min(1).max(5).optional(),
  rating_max: Joi.number().integer().min(1).max(5).optional(),
  date_from: Joi.date().optional(),
  date_to: Joi.date().optional()
});

// ============================================================
// CLIENT ENDPOINTS (Submit & View Own Feedback)
// ============================================================

/**
 * Submit Service Feedback (Client Only)
 * POST /api/service-feedback/submit
 */
router.post('/submit',
  authenticateToken,
  validateRequest(feedbackSubmissionSchema),
  async (req, res) => {
    try {
      const {
        service_type,
        session_id,
        booking_id,
        reader_id,
        rating,
        comment,
        is_anonymous
      } = req.body;

      const client_id = req.user.id;

      // Verify booking exists and belongs to client
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('id, user_id, reader_id, status')
        .eq('id', booking_id)
        .eq('user_id', client_id)
        .single();

      if (bookingError || !booking) {
        return res.status(404).json({
          success: false,
          error: 'Booking not found or access denied',
          code: 'BOOKING_NOT_FOUND'
        });
      }

      // Verify booking is completed
      if (booking.status !== 'completed') {
        return res.status(400).json({
          success: false,
          error: 'Can only submit feedback for completed services',
          code: 'SERVICE_NOT_COMPLETED'
        });
      }

      // Check if feedback already exists for this booking
      const { data: existingFeedback } = await supabase
        .from('service_feedback')
        .select('id')
        .eq('booking_id', booking_id)
        .eq('client_id', client_id)
        .single();

      if (existingFeedback) {
        return res.status(409).json({
          success: false,
          error: 'Feedback already submitted for this service',
          code: 'FEEDBACK_EXISTS'
        });
      }

      // Get client IP and user agent
      const client_ip = req.ip || req.connection.remoteAddress;
      const user_agent = req.get('User-Agent');

      // Create feedback record
      const { data: feedback, error } = await supabase
        .from('service_feedback')
        .insert({
          service_type,
          session_id,
          booking_id,
          client_id,
          reader_id,
          original_rating: rating,
          original_comment: comment || '',
          moderated_rating: rating, // Initially same as original
          moderated_comment: comment || '', // Initially same as original
          moderation_status: 'pending',
          is_anonymous,
          client_ip,
          user_agent
        })
        .select('*')
        .single();

      if (error) {
        console.error('Error creating feedback:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to submit feedback',
          details: error.message
        });
      }

      res.status(201).json({
        success: true,
        data: {
          id: feedback.id,
          service_type: feedback.service_type,
          rating: feedback.original_rating,
          comment: feedback.original_comment,
          is_anonymous: feedback.is_anonymous,
          created_at: feedback.created_at,
          status: 'submitted'
        },
        message: 'Feedback submitted successfully'
      });

    } catch (error) {
      console.error('Submit feedback error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }
);

/**
 * Get Client's Own Feedback (Always shows original)
 * GET /api/service-feedback/my-feedback
 */
router.get('/my-feedback',
  authenticateToken,
  async (req, res) => {
    try {
      const client_id = req.user.id;
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      // Get client's own feedback (always original content)
      const { data: feedback, error, count } = await supabase
        .from('service_feedback')
        .select(`
          id,
          service_type,
          booking_id,
          original_rating,
          original_comment,
          is_anonymous,
          created_at,
          reader:reader_id(first_name, last_name, avatar_url),
          booking:booking_id(
            service_id,
            scheduled_at,
            service:service_id(name, name_ar)
          )
        `, { count: 'exact' })
        .eq('client_id', client_id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching client feedback:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch feedback'
        });
      }

      // Format response (client always sees original content)
      const formattedFeedback = feedback.map(item => ({
        id: item.id,
        service_type: item.service_type,
        booking_id: item.booking_id,
        rating: item.original_rating, // Always original
        comment: item.original_comment, // Always original
        is_anonymous: item.is_anonymous,
        created_at: item.created_at,
        reader: item.reader,
        service: item.booking?.service,
        scheduled_at: item.booking?.scheduled_at
      }));

      res.json({
        success: true,
        data: formattedFeedback,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      });

    } catch (error) {
      console.error('Get my feedback error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * Check if Feedback Required for Booking
 * GET /api/service-feedback/check-required/:bookingId
 */
router.get('/check-required/:bookingId',
  authenticateToken,
  async (req, res) => {
    try {
      const { bookingId } = req.params;
      const client_id = req.user.id;

      // Check if booking exists and is completed
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('id, user_id, status, service_id')
        .eq('id', bookingId)
        .eq('user_id', client_id)
        .single();

      if (bookingError || !booking) {
        return res.status(404).json({
          success: false,
          error: 'Booking not found'
        });
      }

      // Check if feedback already exists
      const { data: existingFeedback } = await supabase
        .from('service_feedback')
        .select('id')
        .eq('booking_id', bookingId)
        .eq('client_id', client_id)
        .single();

      const feedbackRequired = booking.status === 'completed' && !existingFeedback;

      res.json({
        success: true,
        data: {
          feedback_required: feedbackRequired,
          booking_status: booking.status,
          feedback_exists: !!existingFeedback
        }
      });

    } catch (error) {
      console.error('Check feedback required error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// ============================================================
// READER ENDPOINTS (View Approved Feedback Only)
// ============================================================

/**
 * Get Reader's Approved Feedback
 * GET /api/service-feedback/reader/my-feedback
 */
router.get('/reader/my-feedback',
  authenticateToken,
  requireRole(['reader', 'admin', 'super_admin']),
  async (req, res) => {
    try {
      const reader_id = req.user.id;
      const { page = 1, limit = 20, rating_min, rating_max, service_type } = req.query;
      const offset = (page - 1) * limit;

      let query = supabase
        .from('service_feedback')
        .select(`
          id,
          service_type,
          moderated_rating,
          moderated_comment,
          is_anonymous,
          created_at,
          client:client_id(first_name, last_name),
          booking:booking_id(
            service_id,
            scheduled_at,
            service:service_id(name, name_ar)
          )
        `, { count: 'exact' })
        .eq('reader_id', reader_id)
        .eq('moderation_status', 'approved')
        .eq('is_visible_to_reader', true)
        .order('created_at', { ascending: false });

      // Apply filters
      if (rating_min) query = query.gte('moderated_rating', rating_min);
      if (rating_max) query = query.lte('moderated_rating', rating_max);
      if (service_type) query = query.eq('service_type', service_type);

      const { data: feedback, error, count } = await query
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching reader feedback:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch feedback'
        });
      }

      // Format response (only moderated content visible to reader)
      const formattedFeedback = feedback.map(item => ({
        id: item.id,
        service_type: item.service_type,
        rating: item.moderated_rating, // Only moderated content
        comment: item.moderated_comment, // Only moderated content
        is_anonymous: item.is_anonymous,
        created_at: item.created_at,
        client: item.is_anonymous ? null : item.client,
        service: item.booking?.service,
        scheduled_at: item.booking?.scheduled_at
      }));

      res.json({
        success: true,
        data: formattedFeedback,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      });

    } catch (error) {
      console.error('Get reader feedback error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * Get Reader's Feedback Statistics
 * GET /api/service-feedback/reader/stats
 */
router.get('/reader/stats',
  authenticateToken,
  requireRole(['reader', 'admin', 'super_admin']),
  async (req, res) => {
    try {
      const reader_id = req.user.id;

      // Get or create reader stats
      let { data: stats, error } = await supabase
        .from('reader_feedback_stats')
        .select('*')
        .eq('reader_id', reader_id)
        .single();

      if (error && error.code === 'PGRST116') {
        // Stats don't exist, create them
        const { data: newStats, error: createError } = await supabase
          .from('reader_feedback_stats')
          .insert({ reader_id })
          .select('*')
          .single();

        if (createError) {
          throw createError;
        }
        stats = newStats;
      } else if (error) {
        throw error;
      }

      res.json({
        success: true,
        data: {
          total_feedback: stats.total_approved_feedback,
          average_rating: parseFloat(stats.average_approved_rating),
          rating_distribution: {
            5: stats.rating_5_count,
            4: stats.rating_4_count,
            3: stats.rating_3_count,
            2: stats.rating_2_count,
            1: stats.rating_1_count
          },
          service_breakdown: {
            tarot_reading: stats.tarot_reading_count,
            call_session: stats.call_session_count,
            chat_session: stats.chat_session_count
          },
          last_updated: stats.last_calculated_at
        }
      });

    } catch (error) {
      console.error('Get reader stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch statistics'
      });
    }
  }
);

// ============================================================
// ADMIN ENDPOINTS (Moderation & Management)
// ============================================================

/**
 * Get All Feedback for Admin Moderation
 * GET /api/service-feedback/admin/all
 */
router.get('/admin/all',
  authenticateToken,
  requireRole(['admin', 'super_admin']),
  validateRequest(feedbackQuerySchema, 'query'),
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        service_type,
        reader_id,
        client_id,
        rating_min,
        rating_max,
        date_from,
        date_to
      } = req.query;

      const offset = (page - 1) * limit;

      let query = supabase
        .from('service_feedback')
        .select(`
          id,
          service_type,
          booking_id,
          original_rating,
          original_comment,
          moderated_rating,
          moderated_comment,
          moderation_status,
          is_visible_to_reader,
          is_visible_to_public,
          is_anonymous,
          moderated_by,
          moderated_at,
          moderation_reason,
          admin_notes,
          created_at,
          updated_at,
          client:client_id(id, first_name, last_name, email),
          reader:reader_id(id, first_name, last_name, email),
          moderator:moderated_by(first_name, last_name),
          booking:booking_id(
            service_id,
            scheduled_at,
            service:service_id(name, name_ar)
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filters
      if (status) query = query.eq('moderation_status', status);
      if (service_type) query = query.eq('service_type', service_type);
      if (reader_id) query = query.eq('reader_id', reader_id);
      if (client_id) query = query.eq('client_id', client_id);
      if (rating_min) query = query.gte('original_rating', rating_min);
      if (rating_max) query = query.lte('original_rating', rating_max);
      if (date_from) query = query.gte('created_at', date_from);
      if (date_to) query = query.lte('created_at', date_to);

      const { data: feedback, error, count } = await query
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching admin feedback:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch feedback'
        });
      }

      res.json({
        success: true,
        data: feedback,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      });

    } catch (error) {
      console.error('Get admin feedback error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * Moderate Feedback (Approve/Edit/Delete/Reject)
 * PUT /api/service-feedback/admin/moderate/:feedbackId
 */
router.put('/admin/moderate/:feedbackId',
  authenticateToken,
  requireRole(['admin', 'super_admin']),
  validateRequest(feedbackModerationSchema),
  async (req, res) => {
    try {
      const { feedbackId } = req.params;
      const admin_id = req.user.id;
      const {
        moderation_status,
        moderated_rating,
        moderated_comment,
        is_visible_to_reader,
        is_visible_to_public,
        moderation_reason,
        admin_notes
      } = req.body;

      // Get current feedback
      const { data: currentFeedback, error: fetchError } = await supabase
        .from('service_feedback')
        .select('*')
        .eq('id', feedbackId)
        .single();

      if (fetchError || !currentFeedback) {
        return res.status(404).json({
          success: false,
          error: 'Feedback not found'
        });
      }

      // Prepare update data
      const updateData = {
        moderation_status,
        is_visible_to_reader,
        is_visible_to_public,
        moderated_by: admin_id,
        moderated_at: new Date().toISOString(),
        moderation_reason,
        admin_notes
      };

      // Handle different moderation actions
      switch (moderation_status) {
        case 'approved':
          // Use original content if not edited
          updateData.moderated_rating = moderated_rating || currentFeedback.original_rating;
          updateData.moderated_comment = moderated_comment !== undefined ? moderated_comment : currentFeedback.original_comment;
          break;

        case 'edited':
          // Admin has edited the content
          if (!moderated_rating || moderated_comment === undefined) {
            return res.status(400).json({
              success: false,
              error: 'Moderated content required for edited status'
            });
          }
          updateData.moderated_rating = moderated_rating;
          updateData.moderated_comment = moderated_comment;
          break;

        case 'deleted':
          // Content is deleted (not visible anywhere except to client)
          updateData.is_visible_to_reader = false;
          updateData.is_visible_to_public = false;
          updateData.moderated_rating = null;
          updateData.moderated_comment = '';
          break;

        case 'rejected':
          // Rejected content
          updateData.is_visible_to_reader = false;
          updateData.is_visible_to_public = false;
          break;
      }

      // Update feedback
      const { data: updatedFeedback, error: updateError } = await supabase
        .from('service_feedback')
        .update(updateData)
        .eq('id', feedbackId)
        .select('*')
        .single();

      if (updateError) {
        console.error('Error updating feedback:', updateError);
        return res.status(500).json({
          success: false,
          error: 'Failed to moderate feedback'
        });
      }

      res.json({
        success: true,
        data: updatedFeedback,
        message: `Feedback ${moderation_status} successfully`
      });

    } catch (error) {
      console.error('Moderate feedback error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * Get Feedback Moderation Log
 * GET /api/service-feedback/admin/moderation-log/:feedbackId
 */
router.get('/admin/moderation-log/:feedbackId',
  authenticateToken,
  requireRole(['admin', 'super_admin']),
  async (req, res) => {
    try {
      const { feedbackId } = req.params;

      const { data: logs, error } = await supabase
        .from('feedback_moderation_log')
        .select(`
          id,
          action_type,
          previous_status,
          new_status,
          previous_rating,
          new_rating,
          previous_comment,
          new_comment,
          admin_reason,
          admin_notes,
          created_at,
          admin:admin_id(first_name, last_name)
        `)
        .eq('feedback_id', feedbackId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching moderation log:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch moderation log'
        });
      }

      res.json({
        success: true,
        data: logs
      });

    } catch (error) {
      console.error('Get moderation log error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * Get Feedback Analytics for Admin
 * GET /api/service-feedback/admin/analytics
 */
router.get('/admin/analytics',
  authenticateToken,
  requireRole(['admin', 'super_admin']),
  async (req, res) => {
    try {
      const { date_from, date_to, service_type } = req.query;

      // Build analytics query
      let baseQuery = supabase.from('service_feedback');
      
      if (date_from) baseQuery = baseQuery.gte('created_at', date_from);
      if (date_to) baseQuery = baseQuery.lte('created_at', date_to);
      if (service_type) baseQuery = baseQuery.eq('service_type', service_type);

      // Get total feedback counts by status
      const { data: statusCounts, error: statusError } = await baseQuery
        .select('moderation_status')
        .then(({ data, error }) => {
          if (error) return { error };
          
          const counts = data.reduce((acc, item) => {
            acc[item.moderation_status] = (acc[item.moderation_status] || 0) + 1;
            return acc;
          }, {});
          
          return { data: counts, error: null };
        });

      if (statusError) throw statusError;

      // Get average ratings by service type
      const { data: serviceRatings, error: ratingsError } = await baseQuery
        .select('service_type, original_rating')
        .then(({ data, error }) => {
          if (error) return { error };
          
          const ratings = data.reduce((acc, item) => {
            if (!acc[item.service_type]) {
              acc[item.service_type] = { total: 0, count: 0 };
            }
            acc[item.service_type].total += item.original_rating;
            acc[item.service_type].count += 1;
            return acc;
          }, {});
          
          // Calculate averages
          Object.keys(ratings).forEach(service => {
            ratings[service].average = ratings[service].total / ratings[service].count;
          });
          
          return { data: ratings, error: null };
        });

      if (ratingsError) throw ratingsError;

      // Get moderation response times
      const { data: responseTimes, error: timeError } = await supabase
        .from('service_feedback')
        .select('created_at, moderated_at')
        .not('moderated_at', 'is', null)
        .then(({ data, error }) => {
          if (error) return { error };
          
          const times = data.map(item => {
            const created = new Date(item.created_at);
            const moderated = new Date(item.moderated_at);
            return (moderated - created) / (1000 * 60 * 60); // Hours
          });
          
          const avgResponseTime = times.length > 0 
            ? times.reduce((a, b) => a + b) / times.length 
            : 0;
          
          return { 
            data: { 
              average_hours: avgResponseTime,
              total_moderated: times.length 
            }, 
            error: null 
          };
        });

      if (timeError) throw timeError;

      res.json({
        success: true,
        data: {
          status_distribution: statusCounts,
          service_ratings: serviceRatings,
          moderation_performance: responseTimes
        }
      });

    } catch (error) {
      console.error('Get feedback analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// ============================================================
// PUBLIC ENDPOINTS (Approved Feedback Only)
// ============================================================

/**
 * Get Public Reader Feedback (Approved Only)
 * GET /api/service-feedback/public/reader/:readerId
 */
router.get('/public/reader/:readerId',
  async (req, res) => {
    try {
      const { readerId } = req.params;
      const { page = 1, limit = 10, service_type } = req.query;
      const offset = (page - 1) * limit;

      let query = supabase
        .from('service_feedback')
        .select(`
          id,
          service_type,
          moderated_rating,
          moderated_comment,
          created_at,
          booking:booking_id(
            service:service_id(name, name_ar)
          )
        `, { count: 'exact' })
        .eq('reader_id', readerId)
        .eq('moderation_status', 'approved')
        .eq('is_visible_to_public', true)
        .order('created_at', { ascending: false });

      if (service_type) query = query.eq('service_type', service_type);

      const { data: feedback, error, count } = await query
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching public feedback:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch feedback'
        });
      }

      // Get reader stats
      const { data: stats } = await supabase
        .from('reader_feedback_stats')
        .select('total_approved_feedback, average_approved_rating')
        .eq('reader_id', readerId)
        .single();

      res.json({
        success: true,
        data: {
          feedback: feedback.map(item => ({
            id: item.id,
            service_type: item.service_type,
            rating: item.moderated_rating,
            comment: item.moderated_comment,
            created_at: item.created_at,
            service: item.booking?.service
          })),
          stats: {
            total_feedback: stats?.total_approved_feedback || 0,
            average_rating: parseFloat(stats?.average_approved_rating || 0)
          }
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      });

    } catch (error) {
      console.error('Get public feedback error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// ============================================================
// FEEDBACK PROMPTS MANAGEMENT
// ============================================================

/**
 * Get Active Feedback Prompts
 * GET /api/service-feedback/prompts/:serviceType
 */
router.get('/prompts/:serviceType',
  async (req, res) => {
    try {
      const { serviceType } = req.params;

      const { data: prompt, error } = await supabase
        .from('feedback_prompts')
        .select('*')
        .eq('service_type', serviceType)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching prompt:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch prompt'
        });
      }

      res.json({
        success: true,
        data: prompt || null
      });

    } catch (error) {
      console.error('Get feedback prompt error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

module.exports = router; 