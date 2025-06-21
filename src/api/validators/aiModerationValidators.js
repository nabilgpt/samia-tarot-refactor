// =============================================================================
// AI MODERATION VALIDATORS - مدققات الذكاء الاصطناعي
// =============================================================================
// Joi validation schemas for AI moderation endpoints

const Joi = require('joi');

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

// Text content moderation schema
const textModerationSchema = Joi.object({
  content: Joi.string()
    .min(1)
    .max(10000)
    .required()
    .messages({
      'string.min': 'Content cannot be empty',
      'string.max': 'Content cannot exceed 10000 characters',
      'any.required': 'Content is required'
    }),

  content_type: Joi.string()
    .valid('chat_message', 'profile_description', 'review', 'comment', 'post')
    .required()
    .messages({
      'any.only': 'Invalid content type',
      'any.required': 'Content type is required'
    }),

  user_id: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.guid': 'Invalid user ID format'
    }),

  context: Joi.object({
    session_id: Joi.string().uuid().optional(),
    reading_id: Joi.string().uuid().optional(),
    additional_info: Joi.string().max(500).optional()
  }).optional()
});

// Image moderation schema
const imageModerationSchema = Joi.object({
  image_url: Joi.string()
    .uri()
    .required()
    .messages({
      'string.uri': 'Invalid image URL format',
      'any.required': 'Image URL is required'
    }),

  image_type: Joi.string()
    .valid('profile_picture', 'chat_image', 'verification_document')
    .required()
    .messages({
      'any.only': 'Invalid image type',
      'any.required': 'Image type is required'
    }),

  user_id: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.guid': 'Invalid user ID format'
    })
});

// User behavior analysis schema
const behaviorAnalysisSchema = Joi.object({
  user_id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Invalid user ID format',
      'any.required': 'User ID is required'
    }),

  analysis_type: Joi.string()
    .valid('risk_assessment', 'activity_pattern', 'communication_style', 'engagement_metrics')
    .required()
    .messages({
      'any.only': 'Invalid analysis type',
      'any.required': 'Analysis type is required'
    }),

  time_period: Joi.object({
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().optional(),
    days: Joi.number().integer().min(1).max(365).optional()
  }).optional()
});

// Moderation action schema
const moderationActionSchema = Joi.object({
  action_type: Joi.string()
    .valid('warn', 'mute', 'suspend', 'ban', 'flag_content', 'remove_content')
    .required()
    .messages({
      'any.only': 'Invalid action type',
      'any.required': 'Action type is required'
    }),

  target_id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Invalid target ID format',
      'any.required': 'Target ID is required'
    }),

  target_type: Joi.string()
    .valid('user', 'content', 'session', 'message')
    .required()
    .messages({
      'any.only': 'Invalid target type',
      'any.required': 'Target type is required'
    }),

  reason: Joi.string()
    .min(10)
    .max(500)
    .required()
    .messages({
      'string.min': 'Reason must be at least 10 characters',
      'string.max': 'Reason cannot exceed 500 characters',
      'any.required': 'Reason is required'
    }),

  duration: Joi.object({
    value: Joi.number().integer().min(1).required(),
    unit: Joi.string().valid('minutes', 'hours', 'days', 'weeks', 'months').required()
  }).optional(),

  severity: Joi.string()
    .valid('low', 'medium', 'high', 'critical')
    .default('medium')
    .messages({
      'any.only': 'Invalid severity level'
    })
});

// AI settings schema
const aiSettingsSchema = Joi.object({
  moderation_sensitivity: Joi.number()
    .min(0)
    .max(1)
    .precision(2)
    .optional()
    .messages({
      'number.min': 'Sensitivity must be between 0 and 1',
      'number.max': 'Sensitivity must be between 0 and 1'
    }),

  auto_action_threshold: Joi.number()
    .min(0)
    .max(1)
    .precision(2)
    .optional()
    .messages({
      'number.min': 'Threshold must be between 0 and 1',
      'number.max': 'Threshold must be between 0 and 1'
    }),

  enabled_features: Joi.array()
    .items(Joi.string().valid('text_moderation', 'image_moderation', 'behavior_analysis', 'auto_actions'))
    .optional(),

  custom_rules: Joi.array()
    .items(Joi.object({
      rule_name: Joi.string().max(100).required(),
      pattern: Joi.string().max(500).required(),
      action: Joi.string().valid('flag', 'block', 'warn').required(),
      severity: Joi.string().valid('low', 'medium', 'high').required()
    }))
    .optional()
});

// =============================================================================
// VALIDATION MIDDLEWARE FUNCTIONS
// =============================================================================

/**
 * Validate text moderation request
 */
const validateTextModeration = (req, res, next) => {
  const { error, value } = textModerationSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid text moderation data',
      code: 'TEXT_MODERATION_VALIDATION_ERROR',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        rejected_value: detail.context.value
      }))
    });
  }

  req.validatedData = value;
  next();
};

/**
 * Validate image moderation request
 */
const validateImageModeration = (req, res, next) => {
  const { error, value } = imageModerationSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid image moderation data',
      code: 'IMAGE_MODERATION_VALIDATION_ERROR',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        rejected_value: detail.context.value
      }))
    });
  }

  req.validatedData = value;
  next();
};

/**
 * Validate behavior analysis request
 */
const validateBehaviorAnalysis = (req, res, next) => {
  const { error, value } = behaviorAnalysisSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid behavior analysis data',
      code: 'BEHAVIOR_ANALYSIS_VALIDATION_ERROR',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        rejected_value: detail.context.value
      }))
    });
  }

  req.validatedData = value;
  next();
};

/**
 * Validate moderation action request
 */
const validateModerationAction = (req, res, next) => {
  const { error, value } = moderationActionSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid moderation action data',
      code: 'MODERATION_ACTION_VALIDATION_ERROR',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        rejected_value: detail.context.value
      }))
    });
  }

  req.validatedData = value;
  next();
};

/**
 * Validate AI settings update
 */
const validateAISettings = (req, res, next) => {
  const { error, value } = aiSettingsSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid AI settings data',
      code: 'AI_SETTINGS_VALIDATION_ERROR',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        rejected_value: detail.context.value
      }))
    });
  }

  req.validatedData = value;
  next();
};

// Content scan schema
const contentScanSchema = Joi.object({
  content: Joi.string()
    .min(1)
    .max(10000)
    .required()
    .messages({
      'string.min': 'Content cannot be empty',
      'string.max': 'Content cannot exceed 10000 characters',
      'any.required': 'Content is required'
    }),

  context: Joi.object({
    session_id: Joi.string().uuid().optional(),
    user_id: Joi.string().uuid().optional(),
    content_type: Joi.string().valid('chat', 'profile', 'review', 'comment').optional()
  }).optional(),

  priority: Joi.string()
    .valid('low', 'normal', 'high', 'urgent')
    .default('normal')
    .optional()
});

// AI configuration schema
const aiConfigSchema = Joi.object({
  model_settings: Joi.object({
    confidence_threshold: Joi.number().min(0).max(1).optional(),
    sensitivity_level: Joi.string().valid('low', 'medium', 'high').optional(),
    auto_action_enabled: Joi.boolean().optional()
  }).optional(),

  alert_settings: Joi.object({
    email_notifications: Joi.boolean().optional(),
    slack_notifications: Joi.boolean().optional(),
    threshold_alerts: Joi.boolean().optional()
  }).optional()
});

// Moderation rule schema
const moderationRuleSchema = Joi.object({
  name: Joi.string()
    .min(3)
    .max(100)
    .required()
    .messages({
      'string.min': 'Rule name must be at least 3 characters',
      'string.max': 'Rule name cannot exceed 100 characters',
      'any.required': 'Rule name is required'
    }),

  category: Joi.string()
    .valid('profanity', 'harassment', 'spam', 'inappropriate_content', 'custom')
    .required(),

  conditions: Joi.array()
    .items(Joi.object({
      type: Joi.string().valid('keyword', 'pattern', 'sentiment', 'frequency').required(),
      value: Joi.string().required(),
      operator: Joi.string().valid('contains', 'equals', 'regex', 'greater_than', 'less_than').required()
    }))
    .min(1)
    .required(),

  actions: Joi.array()
    .items(Joi.string().valid('flag', 'block', 'warn', 'escalate', 'auto_moderate'))
    .min(1)
    .required(),

  priority: Joi.number()
    .integer()
    .min(1)
    .max(10)
    .default(5),

  active: Joi.boolean()
    .default(true)
});

// Training data schema
const trainingDataSchema = Joi.object({
  training_samples: Joi.array()
    .items(Joi.object({
      content: Joi.string().required(),
      classification: Joi.string().valid('safe', 'unsafe', 'review_needed').required(),
      confidence: Joi.number().min(0).max(1).optional(),
      tags: Joi.array().items(Joi.string()).optional()
    }))
    .min(1)
    .required(),

  model_type: Joi.string()
    .valid('text_classification', 'sentiment_analysis', 'content_filtering')
    .required(),

  validation_split: Joi.number()
    .min(0.1)
    .max(0.5)
    .default(0.2)
    .optional()
});

/**
 * Validate content scan request
 */
const validateContentScan = (req, res, next) => {
  const { error, value } = contentScanSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid content scan data',
      code: 'CONTENT_SCAN_VALIDATION_ERROR',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        rejected_value: detail.context.value
      }))
    });
  }

  req.validatedData = value;
  next();
};

/**
 * Validate AI configuration request
 */
const validateAIConfig = (req, res, next) => {
  const { error, value } = aiConfigSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid AI configuration data',
      code: 'AI_CONFIG_VALIDATION_ERROR',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        rejected_value: detail.context.value
      }))
    });
  }

  req.validatedData = value;
  next();
};

/**
 * Validate moderation rule request
 */
const validateModerationRule = (req, res, next) => {
  const { error, value } = moderationRuleSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid moderation rule data',
      code: 'MODERATION_RULE_VALIDATION_ERROR',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        rejected_value: detail.context.value
      }))
    });
  }

  req.validatedData = value;
  next();
};

/**
 * Validate training data request
 */
const validateTrainingData = (req, res, next) => {
  const { error, value } = trainingDataSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid training data',
      code: 'TRAINING_DATA_VALIDATION_ERROR',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        rejected_value: detail.context.value
      }))
    });
  }

  req.validatedData = value;
  next();
};

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  validateTextModeration,
  validateImageModeration,
  validateBehaviorAnalysis,
  validateModerationAction,
  validateAISettings,
  validateContentScan,
  validateAIConfig,
  validateModerationRule,
  validateTrainingData
}; 