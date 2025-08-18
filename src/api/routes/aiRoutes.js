// ===============================================
// AI SYSTEM API ROUTES
// ===============================================

const express = require('express');
const Joi = require('joi');
const { supabase } = require('../lib/supabase');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { openai, openaiConfig, tarotPrompts } = require('../services/openai');
const router = express.Router();

// ===============================================
// VALIDATION SCHEMAS
// ===============================================

const aiModelSchema = Joi.object({
  model_name: Joi.string().max(100).required(),
  model_type: Joi.string().valid('tarot_interpretation', 'reading_analysis', 'recommendation', 'conversation').required(),
  version: Joi.string().max(20).required(),
  is_active: Joi.boolean().default(true),
  configuration: Joi.object().optional(),
  performance_metrics: Joi.object().optional(),
  training_data_info: Joi.object().optional()
});

const aiPromptSchema = Joi.object({
  ai_model_id: Joi.string().uuid().required(),
  prompt_name: Joi.string().max(100).required(),
  prompt_template: Joi.string().required(),
  prompt_type: Joi.string().valid('system', 'user', 'assistant', 'function').required(),
  variables: Joi.object().optional(),
  is_active: Joi.boolean().default(true)
});

const aiSessionSchema = Joi.object({
  reader_id: Joi.string().uuid().optional(),
  session_id: Joi.string().uuid().optional(),
  ai_model_id: Joi.string().uuid().required(),
  session_type: Joi.string().valid('tarot_reading', 'interpretation', 'guidance', 'learning').required(),
  input_data: Joi.object().required()
});

const aiFeedbackSchema = Joi.object({
  ai_session_id: Joi.string().uuid().required(),
  feedback_type: Joi.string().valid('accuracy', 'relevance', 'helpfulness', 'overall').required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  comments: Joi.string().max(1000).optional(),
  is_anonymous: Joi.boolean().default(false)
});

const learningPathSchema = Joi.object({
  path_name: Joi.string().max(100).required(),
  description: Joi.string().optional(),
  difficulty_level: Joi.string().valid('beginner', 'intermediate', 'advanced').required(),
  estimated_duration: Joi.number().integer().min(1).optional(),
  prerequisites: Joi.object().optional(),
  is_active: Joi.boolean().default(true)
});

const courseContentSchema = Joi.object({
  learning_path_id: Joi.string().uuid().required(),
  content_title: Joi.string().max(200).required(),
  content_type: Joi.string().valid('lesson', 'quiz', 'practice', 'assessment', 'video', 'reading').required(),
  content_order: Joi.number().integer().required(),
  content_data: Joi.object().required(),
  duration_minutes: Joi.number().integer().min(1).optional(),
  is_required: Joi.boolean().default(true),
  passing_score: Joi.number().integer().min(0).max(100).optional()
});

// OpenAI-specific validation schemas
const tarotReadingSchema = Joi.object({
  prompt: Joi.string().max(2000).required(),
  reading_type: Joi.string().valid('card_interpretation', 'full_reading', 'quick_guidance').default('quick_guidance'),
  cards: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    position: Joi.string().required(),
    reversed: Joi.boolean().default(false)
  })).optional(),
  spread_type: Joi.string().optional(),
  question: Joi.string().max(500).optional(),
  session_id: Joi.string().uuid().optional()
});

const aiGenerationSchema = Joi.object({
  prompt: Joi.string().max(2000).required(),
  max_tokens: Joi.number().integer().min(10).max(1000).default(300),
  temperature: Joi.number().min(0).max(2).default(0.7),
  model: Joi.string().default(openaiConfig.model),
  context: Joi.string().max(1000).optional()
});

// ===============================================
// AI MODELS ROUTES
// ===============================================

// Create AI model (Admin only)
router.post('/models',
  authenticateToken,
  requireRole(['admin', 'super_admin']),
  validateRequest(aiModelSchema),
  async (req, res) => {
    try {
      const { data: model, error } = await supabase
        .from('ai_models')
        .insert(req.body)
        .select('*')
        .single();

      if (error) throw error;

      res.status(201).json({
        success: true,
        data: model,
        message: 'AI model created successfully'
      });

    } catch (error) {
      console.error('Create AI model error:', error);
      res.status(500).json({
        error: 'Failed to create AI model',
        details: error.message
      });
    }
  }
);

// Get all AI models
router.get('/models',
  authenticateToken,
  async (req, res) => {
    try {
      const { model_type, is_active } = req.query;

      let query = supabase.from('ai_models').select('*');

      if (model_type) query = query.eq('model_type', model_type);
      if (is_active !== undefined) query = query.eq('is_active', is_active);

      query = query.order('created_at', { ascending: false });

      const { data: models, error } = await query;
      if (error) throw error;

      res.json({
        success: true,
        data: models
      });

    } catch (error) {
      console.error('Get AI models error:', error);
      res.status(500).json({
        error: 'Failed to retrieve AI models',
        details: error.message
      });
    }
  }
);

// Get specific AI model
router.get('/models/:id',
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      const { data: model, error } = await supabase
        .from('ai_models')
        .select(`
          *,
          prompts:ai_prompts(*),
          sessions:ai_sessions(id, session_type, created_at, status)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      if (!model) {
        return res.status(404).json({
          error: 'AI model not found',
          code: 'MODEL_NOT_FOUND'
        });
      }

      res.json({
        success: true,
        data: model
      });

    } catch (error) {
      console.error('Get AI model error:', error);
      res.status(500).json({
        error: 'Failed to retrieve AI model',
        details: error.message
      });
    }
  }
);

// Update AI model
router.put('/models/:id',
  authenticateToken,
  requireRole(['admin', 'super_admin']),
  validateRequest(aiModelSchema.fork(['model_name', 'model_type', 'version'], schema => schema.optional())),
  async (req, res) => {
    try {
      const { id } = req.params;

      const { data: model, error } = await supabase
        .from('ai_models')
        .update({ ...req.body, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;

      if (!model) {
        return res.status(404).json({
          error: 'AI model not found',
          code: 'MODEL_NOT_FOUND'
        });
      }

      res.json({
        success: true,
        data: model,
        message: 'AI model updated successfully'
      });

    } catch (error) {
      console.error('Update AI model error:', error);
      res.status(500).json({
        error: 'Failed to update AI model',
        details: error.message
      });
    }
  }
);

// Delete AI model
router.delete('/models/:id',
  authenticateToken,
  requireRole(['admin', 'super_admin']),
  async (req, res) => {
    try {
      const { id } = req.params;

      const { error } = await supabase
        .from('ai_models')
        .delete()
        .eq('id', id);

      if (error) throw error;

      res.json({
        success: true,
        message: 'AI model deleted successfully'
      });

    } catch (error) {
      console.error('Delete AI model error:', error);
      res.status(500).json({
        error: 'Failed to delete AI model',
        details: error.message
      });
    }
  }
);

// ===============================================
// AI PROMPTS ROUTES
// ===============================================

// Create AI prompt
router.post('/prompts',
  authenticateToken,
  requireRole(['admin', 'super_admin']),
  validateRequest(aiPromptSchema),
  async (req, res) => {
    try {
      const { data: prompt, error } = await supabase
        .from('ai_prompts')
        .insert(req.body)
        .select('*')
        .single();

      if (error) throw error;

      res.status(201).json({
        success: true,
        data: prompt,
        message: 'AI prompt created successfully'
      });

    } catch (error) {
      console.error('Create AI prompt error:', error);
      res.status(500).json({
        error: 'Failed to create AI prompt',
        details: error.message
      });
    }
  }
);

// Get prompts for a model
router.get('/models/:modelId/prompts',
  authenticateToken,
  async (req, res) => {
    try {
      const { modelId } = req.params;
      const { prompt_type, is_active } = req.query;

      let query = supabase
        .from('ai_prompts')
        .select('*')
        .eq('ai_model_id', modelId);

      if (prompt_type) query = query.eq('prompt_type', prompt_type);
      if (is_active !== undefined) query = query.eq('is_active', is_active);

      query = query.order('created_at', { ascending: false });

      const { data: prompts, error } = await query;
      if (error) throw error;

      res.json({
        success: true,
        data: prompts
      });

    } catch (error) {
      console.error('Get AI prompts error:', error);
      res.status(500).json({
        error: 'Failed to retrieve AI prompts',
        details: error.message
      });
    }
  }
);

// Update AI prompt
router.put('/prompts/:id',
  authenticateToken,
  requireRole(['admin', 'super_admin']),
  validateRequest(aiPromptSchema.fork(['ai_model_id', 'prompt_name', 'prompt_template', 'prompt_type'], schema => schema.optional())),
  async (req, res) => {
    try {
      const { id } = req.params;

      const { data: prompt, error } = await supabase
        .from('ai_prompts')
        .update({ ...req.body, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;

      res.json({
        success: true,
        data: prompt,
        message: 'AI prompt updated successfully'
      });

    } catch (error) {
      console.error('Update AI prompt error:', error);
      res.status(500).json({
        error: 'Failed to update AI prompt',
        details: error.message
      });
    }
  }
);

// ===============================================
// AI SESSIONS ROUTES
// ===============================================

// Create AI session
router.post('/sessions',
  authenticateToken,
  validateRequest(aiSessionSchema),
  async (req, res) => {
    try {
      const { reader_id, session_id, ai_model_id, session_type, input_data } = req.body;
      const user_id = req.user.id;

      // Verify AI model exists and is active
      const { data: model, error: modelError } = await supabase
        .from('ai_models')
        .select('id, is_active')
        .eq('id', ai_model_id)
        .eq('is_active', true)
        .single();

      if (modelError || !model) {
        return res.status(400).json({
          error: 'AI model not found or inactive',
          code: 'INVALID_MODEL'
        });
      }

      // Create AI session
      const { data: aiSession, error } = await supabase
        .from('ai_sessions')
        .insert({
          user_id,
          reader_id,
          session_id,
          ai_model_id,
          session_type,
          input_data,
          status: 'pending'
        })
        .select('*')
        .single();

      if (error) throw error;

      // Here you would typically call your AI service
      // For now, we'll simulate a response
      const simulatedOutput = {
        interpretation: `AI interpretation for ${session_type}`,
        confidence: 0.85,
        suggestions: ['suggestion1', 'suggestion2'],
        timestamp: new Date().toISOString()
      };

      // Update session with output
      const { data: updatedSession, error: updateError } = await supabase
        .from('ai_sessions')
        .update({
          output_data: simulatedOutput,
          confidence_score: 0.85,
          processing_time: Math.floor(Math.random() * 2000) + 500, // 500-2500ms
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', aiSession.id)
        .select('*')
        .single();

      if (updateError) throw updateError;

      res.status(201).json({
        success: true,
        data: updatedSession,
        message: 'AI session completed successfully'
      });

    } catch (error) {
      console.error('Create AI session error:', error);
      res.status(500).json({
        error: 'Failed to create AI session',
        details: error.message
      });
    }
  }
);

// Get AI sessions
router.get('/sessions',
  authenticateToken,
  async (req, res) => {
    try {
      const { 
        session_type, 
        status, 
        ai_model_id,
        page = 1, 
        limit = 20 
      } = req.query;

      let query = supabase
        .from('ai_sessions')
        .select(`
          *,
          user:profiles!ai_sessions_user_id_fkey(id, first_name, last_name),
          reader:profiles!ai_sessions_reader_id_fkey(id, first_name, last_name),
          ai_model:ai_models(id, model_name, model_type),
          feedback:ai_feedback(id, rating, feedback_type)
        `);

      // Apply user-based filters
      if (req.user.role === 'client') {
        query = query.eq('user_id', req.user.id);
      } else if (req.user.role === 'reader') {
        query = query.eq('reader_id', req.user.id);
      }

      // Apply additional filters
      if (session_type) query = query.eq('session_type', session_type);
      if (status) query = query.eq('status', status);
      if (ai_model_id) query = query.eq('ai_model_id', ai_model_id);

      // Apply pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

      const { data: sessions, error } = await query;
      if (error) throw error;

      // Get total count
      let countQuery = supabase
        .from('ai_sessions')
        .select('*', { count: 'exact', head: true });

      if (req.user.role === 'client') {
        countQuery = countQuery.eq('user_id', req.user.id);
      } else if (req.user.role === 'reader') {
        countQuery = countQuery.eq('reader_id', req.user.id);
      }

      const { count } = await countQuery;

      res.json({
        success: true,
        data: sessions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      });

    } catch (error) {
      console.error('Get AI sessions error:', error);
      res.status(500).json({
        error: 'Failed to retrieve AI sessions',
        details: error.message
      });
    }
  }
);

// Get specific AI session
router.get('/sessions/:id',
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      const { data: session, error } = await supabase
        .from('ai_sessions')
        .select(`
          *,
          user:profiles!ai_sessions_user_id_fkey(id, first_name, last_name, avatar_url),
          reader:profiles!ai_sessions_reader_id_fkey(id, first_name, last_name, avatar_url),
          ai_model:ai_models(*),
          feedback:ai_feedback(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      if (!session) {
        return res.status(404).json({
          error: 'AI session not found',
          code: 'SESSION_NOT_FOUND'
        });
      }

      // Check access permissions
      const hasAccess = 
        session.user_id === req.user.id ||
        session.reader_id === req.user.id ||
        ['admin', 'monitor'].includes(req.user.role);

      if (!hasAccess) {
        return res.status(403).json({
          error: 'Access denied',
          code: 'ACCESS_DENIED'
        });
      }

      res.json({
        success: true,
        data: session
      });

    } catch (error) {
      console.error('Get AI session error:', error);
      res.status(500).json({
        error: 'Failed to retrieve AI session',
        details: error.message
      });
    }
  }
);

// ===============================================
// AI FEEDBACK ROUTES
// ===============================================

// Submit AI feedback
router.post('/feedback',
  authenticateToken,
  validateRequest(aiFeedbackSchema),
  async (req, res) => {
    try {
      const { ai_session_id, feedback_type, rating, comments, is_anonymous } = req.body;
      const user_id = req.user.id;

      // Verify session exists and user has access
      const { data: session, error: sessionError } = await supabase
        .from('ai_sessions')
        .select('user_id, reader_id')
        .eq('id', ai_session_id)
        .single();

      if (sessionError || !session) {
        return res.status(404).json({
          error: 'AI session not found',
          code: 'SESSION_NOT_FOUND'
        });
      }

      const hasAccess = 
        session.user_id === user_id ||
        session.reader_id === user_id;

      if (!hasAccess) {
        return res.status(403).json({
          error: 'Access denied',
          code: 'ACCESS_DENIED'
        });
      }

      // Create feedback
      const { data: feedback, error } = await supabase
        .from('ai_feedback')
        .insert({
          ai_session_id,
          user_id,
          feedback_type,
          rating,
          comments,
          is_anonymous
        })
        .select('*')
        .single();

      if (error) throw error;

      res.status(201).json({
        success: true,
        data: feedback,
        message: 'Feedback submitted successfully'
      });

    } catch (error) {
      console.error('Submit AI feedback error:', error);
      res.status(500).json({
        error: 'Failed to submit feedback',
        details: error.message
      });
    }
  }
);

// Get AI feedback analytics
router.get('/feedback/analytics',
  authenticateToken,
  requireRole(['admin', 'monitor']),
  async (req, res) => {
    try {
      const { ai_model_id, feedback_type, start_date, end_date } = req.query;

      let conditions = '';
      if (ai_model_id) conditions += ` AND ai_sessions.ai_model_id = '${ai_model_id}'`;
      if (feedback_type) conditions += ` AND feedback_type = '${feedback_type}'`;
      if (start_date) conditions += ` AND ai_feedback.created_at >= '${start_date}'`;
      if (end_date) conditions += ` AND ai_feedback.created_at <= '${end_date}'`;

      // Get feedback analytics
      const { data: analytics, error } = await supabase
        .rpc('get_ai_feedback_analytics', { conditions });

      if (error) throw error;

      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      console.error('Get feedback analytics error:', error);
      res.status(500).json({
        error: 'Failed to retrieve feedback analytics',
        details: error.message
      });
    }
  }
);

// ===============================================
// LEARNING PATHS ROUTES
// ===============================================

// Create learning path
router.post('/learning-paths',
  authenticateToken,
  requireRole(['admin', 'super_admin']),
  validateRequest(learningPathSchema),
  async (req, res) => {
    try {
      const { data: learningPath, error } = await supabase
        .from('learning_paths')
        .insert({
          ...req.body,
          created_by: req.user.id
        })
        .select('*')
        .single();

      if (error) throw error;

      res.status(201).json({
        success: true,
        data: learningPath,
        message: 'Learning path created successfully'
      });

    } catch (error) {
      console.error('Create learning path error:', error);
      res.status(500).json({
        error: 'Failed to create learning path',
        details: error.message
      });
    }
  }
);

// Get all learning paths
router.get('/learning-paths',
  authenticateToken,
  async (req, res) => {
    try {
      const { difficulty_level, is_active } = req.query;

      let query = supabase
        .from('learning_paths')
        .select(`
          *,
          created_by_profile:profiles!learning_paths_created_by_fkey(id, first_name, last_name),
          content_count:course_content(count),
          enrollment_count:course_enrollments(count)
        `);

      if (difficulty_level) query = query.eq('difficulty_level', difficulty_level);
      if (is_active !== undefined) query = query.eq('is_active', is_active);

      query = query.order('created_at', { ascending: false });

      const { data: paths, error } = await query;
      if (error) throw error;

      res.json({
        success: true,
        data: paths
      });

    } catch (error) {
      console.error('Get learning paths error:', error);
      res.status(500).json({
        error: 'Failed to retrieve learning paths',
        details: error.message
      });
    }
  }
);

// Get specific learning path
router.get('/learning-paths/:id',
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      const { data: path, error } = await supabase
        .from('learning_paths')
        .select(`
          *,
          created_by_profile:profiles!learning_paths_created_by_fkey(id, first_name, last_name),
          content:course_content(*),
          enrollments:course_enrollments(
            *,
            user:profiles(id, first_name, last_name, avatar_url)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      if (!path) {
        return res.status(404).json({
          error: 'Learning path not found',
          code: 'PATH_NOT_FOUND'
        });
      }

      res.json({
        success: true,
        data: path
      });

    } catch (error) {
      console.error('Get learning path error:', error);
      res.status(500).json({
        error: 'Failed to retrieve learning path',
        details: error.message
      });
    }
  }
);

// Enroll in learning path
router.post('/learning-paths/:id/enroll',
  authenticateToken,
  async (req, res) => {
    try {
      const { id: learning_path_id } = req.params;
      const user_id = req.user.id;

      // Check if already enrolled
      const { data: existingEnrollment } = await supabase
        .from('course_enrollments')
        .select('id')
        .eq('user_id', user_id)
        .eq('learning_path_id', learning_path_id)
        .single();

      if (existingEnrollment) {
        return res.status(400).json({
          error: 'Already enrolled in this learning path',
          code: 'ALREADY_ENROLLED'
        });
      }

      // Create enrollment
      const { data: enrollment, error } = await supabase
        .from('course_enrollments')
        .insert({
          user_id,
          learning_path_id,
          status: 'active'
        })
        .select('*')
        .single();

      if (error) throw error;

      res.status(201).json({
        success: true,
        data: enrollment,
        message: 'Successfully enrolled in learning path'
      });

    } catch (error) {
      console.error('Enroll in learning path error:', error);
      res.status(500).json({
        error: 'Failed to enroll in learning path',
        details: error.message
      });
    }
  }
);

// Get user enrollments
router.get('/my-enrollments',
  authenticateToken,
  async (req, res) => {
    try {
      const user_id = req.user.id;
      const { status } = req.query;

      let query = supabase
        .from('course_enrollments')
        .select(`
          *,
          learning_path:learning_paths(*),
          current_content:course_content(id, content_title, content_type),
          progress:user_content_progress(
            content_id,
            status,
            score,
            completed_at
          )
        `)
        .eq('user_id', user_id);

      if (status) query = query.eq('status', status);

      query = query.order('enrollment_date', { ascending: false });

      const { data: enrollments, error } = await query;
      if (error) throw error;

      res.json({
        success: true,
        data: enrollments
      });

    } catch (error) {
      console.error('Get user enrollments error:', error);
      res.status(500).json({
        error: 'Failed to retrieve enrollments',
        details: error.message
      });
    }
  }
);

// ===============================================
// COURSE CONTENT ROUTES
// ===============================================

// Add content to learning path
router.post('/learning-paths/:id/content',
  authenticateToken,
  requireRole(['admin', 'super_admin']),
  validateRequest(courseContentSchema.fork(['learning_path_id'], schema => schema.optional())),
  async (req, res) => {
    try {
      const { id: learning_path_id } = req.params;

      const { data: content, error } = await supabase
        .from('course_content')
        .insert({
          ...req.body,
          learning_path_id
        })
        .select('*')
        .single();

      if (error) throw error;

      res.status(201).json({
        success: true,
        data: content,
        message: 'Course content added successfully'
      });

    } catch (error) {
      console.error('Add course content error:', error);
      res.status(500).json({
        error: 'Failed to add course content',
        details: error.message
      });
    }
  }
);

// Update content progress
router.post('/content/:id/progress',
  authenticateToken,
  async (req, res) => {
    try {
      const { id: content_id } = req.params;
      const { status, score, time_spent, notes } = req.body;
      const user_id = req.user.id;

      // Get user's enrollment
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('course_enrollments')
        .select('id')
        .eq('user_id', user_id)
        .eq('learning_path_id', '(SELECT learning_path_id FROM course_content WHERE id = $1)', content_id)
        .single();

      if (enrollmentError || !enrollment) {
        return res.status(404).json({
          error: 'Enrollment not found',
          code: 'ENROLLMENT_NOT_FOUND'
        });
      }

      // Upsert progress
      const { data: progress, error } = await supabase
        .from('user_content_progress')
        .upsert({
          enrollment_id: enrollment.id,
          content_id,
          status,
          score,
          time_spent,
          notes,
          completed_at: status === 'completed' ? new Date().toISOString() : null
        })
        .select('*')
        .single();

      if (error) throw error;

      res.json({
        success: true,
        data: progress,
        message: 'Progress updated successfully'
      });

    } catch (error) {
      console.error('Update content progress error:', error);
      res.status(500).json({
        error: 'Failed to update progress',
        details: error.message
      });
    }
  }
);

// ===============================================
// AI ANALYTICS & REPORTS
// ===============================================

// Get AI performance analytics
router.get('/analytics/performance',
  authenticateToken,
  requireRole(['admin', 'monitor']),
  async (req, res) => {
    try {
      const { ai_model_id, start_date, end_date } = req.query;

      const analytics = await Promise.all([
        // Session statistics
        supabase.rpc('get_ai_session_stats', { 
          ai_model_id, 
          start_date, 
          end_date 
        }),
        
        // Average confidence scores
        supabase.rpc('get_ai_confidence_stats', { 
          ai_model_id, 
          start_date, 
          end_date 
        }),
        
        // Performance by session type
        supabase.rpc('get_ai_performance_by_type', { 
          ai_model_id, 
          start_date, 
          end_date 
        }),
        
        // User feedback summary
        supabase.rpc('get_ai_feedback_summary', { 
          ai_model_id, 
          start_date, 
          end_date 
        })
      ]);

      const [sessionStats, confidenceStats, performanceByType, feedbackSummary] = analytics;

      res.json({
        success: true,
        data: {
          session_statistics: sessionStats.data,
          confidence_metrics: confidenceStats.data,
          performance_by_type: performanceByType.data,
          feedback_summary: feedbackSummary.data
        }
      });

    } catch (error) {
      console.error('Get AI analytics error:', error);
      res.status(500).json({
        error: 'Failed to retrieve AI analytics',
        details: error.message
      });
    }
  }
);

// ===============================================
// OPENAI INTEGRATION ROUTES
// ===============================================

// Generate tarot reading using OpenAI
router.post('/generate-reading',
  authenticateToken,
  validateRequest(tarotReadingSchema),
  async (req, res) => {
    try {
      const { prompt, reading_type, cards, spread_type, question, session_id } = req.body;
      const user_id = req.user.id;

      // Build the AI prompt based on reading type
      let aiPrompt;
      switch (reading_type) {
        case 'card_interpretation': {
          if (!cards || cards.length === 0) {
            return res.status(400).json({
              error: 'Cards are required for card interpretation',
              code: 'CARDS_REQUIRED'
            });
          }
          const card = cards[0];
          aiPrompt = tarotPrompts.cardInterpretation(card.name, card.position, question || prompt);
          break;
        }
        
        case 'full_reading':
          if (!cards || cards.length === 0) {
            return res.status(400).json({
              error: 'Cards are required for full reading',
              code: 'CARDS_REQUIRED'
            });
          }
          aiPrompt = tarotPrompts.fullReading(cards, spread_type || 'Custom Spread', question || prompt);
          break;
        
        case 'quick_guidance':
        default:
          aiPrompt = tarotPrompts.quickGuidance(question || prompt);
          break;
      }

      // Generate response using OpenAI
      const completion = await openai.chat.completions.create({
        model: openaiConfig.model,
        messages: [
          {
            role: 'system',
            content: 'You are a professional tarot reader with deep knowledge of tarot symbolism and intuitive guidance. Provide insightful, empathetic, and practical readings while maintaining a mystical yet grounded approach.'
          },
          {
            role: 'user',
            content: aiPrompt
          }
        ],
        max_tokens: reading_type === 'full_reading' ? 600 : 300,
        temperature: 0.8,
      });

      const aiResponse = completion.choices[0].message.content;

      // Store the AI session in database
      const sessionData = {
        user_id,
        session_id: session_id || null,
        reading_type,
        input_data: {
          prompt,
          cards,
          spread_type,
          question,
          ai_prompt: aiPrompt
        },
        ai_response: aiResponse,
        tokens_used: completion.usage?.total_tokens || 0,
        model_used: openaiConfig.model,
        status: 'completed'
      };

      const { data: aiSession, error: sessionError } = await supabase
        .from('ai_sessions')
        .insert(sessionData)
        .select('*')
        .single();

      if (sessionError) {
        console.error('Error storing AI session:', sessionError);
        // Continue anyway, as the reading was generated successfully
      }

      res.json({
        success: true,
        data: {
          reading: aiResponse,
          reading_type,
          tokens_used: completion.usage?.total_tokens || 0,
          session_id: aiSession?.id || null,
          timestamp: new Date().toISOString()
        },
        message: 'Tarot reading generated successfully'
      });

    } catch (error) {
      console.error('Generate reading error:', error);

      // Handle OpenAI-specific errors
      if (error.error?.type === 'insufficient_quota') {
        return res.status(429).json({
          error: 'AI service quota exceeded',
          code: 'QUOTA_EXCEEDED',
          message: 'Please try again later or contact support'
        });
      }

      if (error.error?.type === 'invalid_request_error') {
        return res.status(400).json({
          error: 'Invalid request to AI service',
          code: 'INVALID_AI_REQUEST',
          details: error.error.message
        });
      }

      res.status(500).json({
        error: 'Failed to generate reading',
        details: error.message
      });
    }
  }
);

// General AI text generation
router.post('/generate-text',
  authenticateToken,
  validateRequest(aiGenerationSchema),
  async (req, res) => {
    try {
      const { prompt, max_tokens, temperature, model, context } = req.body;
      const user_id = req.user.id;

      // Build the full prompt with context if provided
      const fullPrompt = context 
        ? `Context: ${context}\n\nRequest: ${prompt}`
        : prompt;

      // Generate response using OpenAI
      const completion = await openai.chat.completions.create({
        model: model || openaiConfig.model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI assistant specializing in spiritual guidance and tarot-related content. Provide thoughtful, insightful responses.'
          },
          {
            role: 'user',
            content: fullPrompt
          }
        ],
        max_tokens,
        temperature,
      });

      const aiResponse = completion.choices[0].message.content;

      // Store the AI session in database
      const sessionData = {
        user_id,
        session_type: 'text_generation',
        input_data: {
          prompt,
          context,
          parameters: { max_tokens, temperature, model }
        },
        ai_response: aiResponse,
        tokens_used: completion.usage?.total_tokens || 0,
        model_used: model || openaiConfig.model,
        status: 'completed'
      };

      const { data: aiSession, error: sessionError } = await supabase
        .from('ai_sessions')
        .insert(sessionData)
        .select('*')
        .single();

      if (sessionError) {
        console.error('Error storing AI session:', sessionError);
      }

      res.json({
        success: true,
        data: {
          response: aiResponse,
          tokens_used: completion.usage?.total_tokens || 0,
          session_id: aiSession?.id || null,
          model_used: model || openaiConfig.model
        },
        message: 'Text generated successfully'
      });

    } catch (error) {
      console.error('Generate text error:', error);

      // Handle OpenAI-specific errors
      if (error.error?.type === 'insufficient_quota') {
        return res.status(429).json({
          error: 'AI service quota exceeded',
          code: 'QUOTA_EXCEEDED'
        });
      }

      res.status(500).json({
        error: 'Failed to generate text',
        details: error.message
      });
    }
  }
);

// Get AI usage statistics for user
router.get('/usage-stats',
  authenticateToken,
  async (req, res) => {
    try {
      const user_id = req.user.id;
      const { start_date, end_date } = req.query;

      let query = supabase
        .from('ai_sessions')
        .select('reading_type, tokens_used, created_at, status')
        .eq('user_id', user_id);

      if (start_date) query = query.gte('created_at', start_date);
      if (end_date) query = query.lte('created_at', end_date);

      const { data: sessions, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;

      // Calculate statistics
      const stats = {
        total_sessions: sessions.length,
        total_tokens_used: sessions.reduce((sum, session) => sum + (session.tokens_used || 0), 0),
        sessions_by_type: {},
        recent_sessions: sessions.slice(0, 10)
      };

      // Group by reading type
      sessions.forEach(session => {
        const type = session.reading_type || 'other';
        stats.sessions_by_type[type] = (stats.sessions_by_type[type] || 0) + 1;
      });

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Get usage stats error:', error);
      res.status(500).json({
        error: 'Failed to retrieve usage statistics',
        details: error.message
      });
    }
  }
);

// Test OpenAI connection (Admin only)
router.get('/test-connection',
  authenticateToken,
  requireRole(['admin', 'super_admin']),
  async (req, res) => {
    try {
      const testResponse = await openai.chat.completions.create({
        model: openaiConfig.model,
        messages: [{ role: 'user', content: 'Hello, this is a connection test.' }],
        max_tokens: 10
      });

      res.json({
        success: true,
        data: {
          status: 'connected',
          model: openaiConfig.model,
          response: testResponse.choices[0].message.content,
          tokens_used: testResponse.usage?.total_tokens || 0
        },
        message: 'OpenAI connection test successful'
      });

    } catch (error) {
      console.error('OpenAI connection test failed:', error);
      res.status(500).json({
        success: false,
        error: 'OpenAI connection test failed',
        details: error.message
      });
    }
  }
);

module.exports = router; 
