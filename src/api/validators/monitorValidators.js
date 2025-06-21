// =============================================================================
// MONITOR VALIDATORS - مدققات مراقب المحتوى
// =============================================================================
// Comprehensive validation schemas for monitor API endpoints

const Joi = require('joi');

// =============================================================================
// SESSION ACTION VALIDATORS
// =============================================================================

const sessionActionSchema = Joi.object({
  reason: Joi.string()
    .min(10)
    .max(500)
    .required()
    .messages({
      'string.min': 'Reason must be at least 10 characters long',
      'string.max': 'Reason cannot exceed 500 characters',
      'any.required': 'Reason is required for this action'
    }),
  
  notify_participants: Joi.boolean()
    .default(true)
    .messages({
      'boolean.base': 'notify_participants must be a boolean value'
    }),
  
  escalate_to_admin: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'escalate_to_admin must be a boolean value'
    }),
  
  duration_minutes: Joi.number()
    .integer()
    .min(1)
    .max(1440) // Max 24 hours
    .when('$action_type', {
      is: 'pause',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'number.base': 'Duration must be a number',
      'number.integer': 'Duration must be an integer',
      'number.min': 'Duration must be at least 1 minute',
      'number.max': 'Duration cannot exceed 24 hours (1440 minutes)',
      'any.required': 'Duration is required for pause actions'
    }),

  priority: Joi.string()
    .valid('low', 'medium', 'high', 'critical')
    .default('medium')
    .messages({
      'any.only': 'Priority must be one of: low, medium, high, critical'
    }),

  metadata: Joi.object()
    .optional()
    .messages({
      'object.base': 'Metadata must be a valid JSON object'
    })
});

/**
 * Validate session action data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateSessionAction = (req, res, next) => {
  const { error, value } = sessionActionSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
    context: { action_type: req.route.path.includes('pause') ? 'pause' : 'other' }
  });

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid session action data',
      code: 'SESSION_ACTION_VALIDATION_ERROR',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        rejected_value: detail.context.value
      }))
    });
  }

  req.validatedData = value;
  req.validationInfo = {
    validated_at: new Date().toISOString(),
    action_type: 'session_action',
    validator: 'sessionActionSchema'
  };

  next();
};

// =============================================================================
// CONTENT MODERATION VALIDATORS
// =============================================================================

const contentModerationSchema = Joi.object({
  approved: Joi.boolean()
    .when('$action_type', {
      is: 'approve_reject',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'boolean.base': 'Approved must be a boolean value',
      'any.required': 'Approval status is required'
    }),

  action: Joi.string()
    .valid('approved', 'rejected', 'flagged', 'reviewed', 'escalated')
    .when('$action_type', {
      is: 'review',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'any.only': 'Action must be one of: approved, rejected, flagged, reviewed, escalated',
      'any.required': 'Action is required for review operations'
    }),

  reason: Joi.string()
    .min(10)
    .max(1000)
    .when('approved', {
      is: false,
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'string.min': 'Reason must be at least 10 characters long',
      'string.max': 'Reason cannot exceed 1000 characters',
      'any.required': 'Reason is required when rejecting content'
    }),

  feedback: Joi.string()
    .max(2000)
    .optional()
    .messages({
      'string.max': 'Feedback cannot exceed 2000 characters'
    }),

  tags: Joi.array()
    .items(Joi.string().max(50))
    .max(10)
    .optional()
    .messages({
      'array.max': 'Cannot have more than 10 tags',
      'string.max': 'Each tag cannot exceed 50 characters'
    }),

  severity_override: Joi.string()
    .valid('low', 'medium', 'high', 'critical')
    .optional()
    .messages({
      'any.only': 'Severity override must be one of: low, medium, high, critical'
    }),

  escalate: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'Escalate must be a boolean value'
    }),

  notify_reader: Joi.boolean()
    .default(true)
    .messages({
      'boolean.base': 'notify_reader must be a boolean value'
    }),

  training_feedback: Joi.object({
    correct_classification: Joi.boolean().required(),
    ai_confidence_accurate: Joi.boolean().required(),
    suggested_improvements: Joi.string().max(500).optional()
  })
    .optional()
    .messages({
      'object.base': 'Training feedback must be a valid object'
    }),

  warning_type: Joi.string()
    .valid('content_violation', 'inappropriate_behavior', 'policy_breach', 'quality_concern', 'other')
    .when('$action_type', {
      is: 'warn_reader',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'any.only': 'Warning type must be one of: content_violation, inappropriate_behavior, policy_breach, quality_concern, other',
      'any.required': 'Warning type is required when issuing warnings'
    }),

  message: Joi.string()
    .min(20)
    .max(1000)
    .when('$action_type', {
      is: 'warn_reader',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'string.min': 'Warning message must be at least 20 characters long',
      'string.max': 'Warning message cannot exceed 1000 characters',
      'any.required': 'Warning message is required'
    }),

  temporary_restriction: Joi.object({
    restrict_messaging: Joi.boolean().default(false),
    restrict_voice_notes: Joi.boolean().default(false),
    restrict_new_sessions: Joi.boolean().default(false),
    duration_hours: Joi.number().integer().min(1).max(168).default(24) // Max 7 days
  })
    .optional()
    .messages({
      'object.base': 'Temporary restriction must be a valid object'
    }),

  suspension_duration_hours: Joi.number()
    .integer()
    .min(1)
    .max(720) // Max 30 days
    .when('$action_type', {
      is: 'suspend_reader',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'number.base': 'Suspension duration must be a number',
      'number.integer': 'Suspension duration must be an integer',
      'number.min': 'Suspension duration must be at least 1 hour',
      'number.max': 'Suspension duration cannot exceed 30 days (720 hours)',
      'any.required': 'Suspension duration is required'
    }),

  active_sessions_action: Joi.string()
    .valid('continue', 'pause', 'terminate')
    .default('pause')
    .when('$action_type', {
      is: 'suspend_reader',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'any.only': 'Active sessions action must be one of: continue, pause, terminate'
    }),

  notify_admin: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'notify_admin must be a boolean value'
    })
});

/**
 * Validate content moderation data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateContentModeration = (req, res, next) => {
  // Determine action type from route
  let actionType = 'general';
  if (req.route.path.includes('approve')) actionType = 'approve_reject';
  if (req.route.path.includes('review')) actionType = 'review';
  if (req.route.path.includes('warn')) actionType = 'warn_reader';
  if (req.route.path.includes('suspend')) actionType = 'suspend_reader';

  const { error, value } = contentModerationSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
    context: { action_type: actionType }
  });

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid content moderation data',
      code: 'CONTENT_MODERATION_VALIDATION_ERROR',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        rejected_value: detail.context.value
      }))
    });
  }

  req.validatedData = value;
  req.validationInfo = {
    validated_at: new Date().toISOString(),
    action_type: actionType,
    validator: 'contentModerationSchema'
  };

  next();
};

// =============================================================================
// REPORT RESOLUTION VALIDATORS
// =============================================================================

const reportResolutionSchema = Joi.object({
  assigned_to: Joi.string()
    .uuid()
    .when('$action_type', {
      is: 'investigate',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'string.uuid': 'Assigned to must be a valid user ID',
      'any.required': 'Assignment is required for investigation'
    }),

  priority: Joi.string()
    .valid('low', 'medium', 'high', 'critical')
    .default('medium')
    .messages({
      'any.only': 'Priority must be one of: low, medium, high, critical'
    }),

  estimated_resolution_time: Joi.number()
    .integer()
    .min(1)
    .max(168) // Max 7 days in hours
    .when('$action_type', {
      is: 'investigate',
      then: Joi.optional(),
      otherwise: Joi.optional()
    })
    .messages({
      'number.base': 'Estimated resolution time must be a number',
      'number.integer': 'Estimated resolution time must be an integer',
      'number.min': 'Estimated resolution time must be at least 1 hour',
      'number.max': 'Estimated resolution time cannot exceed 7 days (168 hours)'
    }),

  notes: Joi.string()
    .min(10)
    .max(2000)
    .required()
    .messages({
      'string.min': 'Notes must be at least 10 characters long',
      'string.max': 'Notes cannot exceed 2000 characters',
      'any.required': 'Notes are required'
    }),

  resolution: Joi.string()
    .min(20)
    .max(2000)
    .when('$action_type', {
      is: 'resolve',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'string.min': 'Resolution must be at least 20 characters long',
      'string.max': 'Resolution cannot exceed 2000 characters',
      'any.required': 'Resolution is required when resolving reports'
    }),

  action_taken: Joi.string()
    .valid('warning_issued', 'user_suspended', 'content_removed', 'no_action_needed', 'escalated_to_admin', 'other')
    .when('$action_type', {
      is: 'resolve',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'any.only': 'Action taken must be one of: warning_issued, user_suspended, content_removed, no_action_needed, escalated_to_admin, other',
      'any.required': 'Action taken is required when resolving reports'
    }),

  user_notified: Joi.boolean()
    .default(true)
    .when('$action_type', {
      is: 'resolve',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'boolean.base': 'user_notified must be a boolean value'
    }),

  follow_up_required: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'follow_up_required must be a boolean value'
    }),

  escalation_reason: Joi.string()
    .min(20)
    .max(1000)
    .when('$action_type', {
      is: 'escalate',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'string.min': 'Escalation reason must be at least 20 characters long',
      'string.max': 'Escalation reason cannot exceed 1000 characters',
      'any.required': 'Escalation reason is required'
    }),

  urgency: Joi.string()
    .valid('low', 'medium', 'high', 'critical')
    .default('medium')
    .when('$action_type', {
      is: 'escalate',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'any.only': 'Urgency must be one of: low, medium, high, critical'
    }),

  admin_notes: Joi.string()
    .max(1000)
    .optional()
    .messages({
      'string.max': 'Admin notes cannot exceed 1000 characters'
    })
});

/**
 * Validate report resolution data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateReportResolution = (req, res, next) => {
  // Determine action type from route
  let actionType = 'general';
  if (req.route.path.includes('investigate')) actionType = 'investigate';
  if (req.route.path.includes('resolve')) actionType = 'resolve';
  if (req.route.path.includes('escalate')) actionType = 'escalate';

  const { error, value } = reportResolutionSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
    context: { action_type: actionType }
  });

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid report resolution data',
      code: 'REPORT_RESOLUTION_VALIDATION_ERROR',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        rejected_value: detail.context.value
      }))
    });
  }

  req.validatedData = value;
  req.validationInfo = {
    validated_at: new Date().toISOString(),
    action_type: actionType,
    validator: 'reportResolutionSchema'
  };

  next();
};

// =============================================================================
// EMERGENCY RESPONSE VALIDATORS
// =============================================================================

const emergencyResponseSchema = Joi.object({
  response_type: Joi.string()
    .valid('acknowledged', 'investigating', 'contact_attempted', 'escalated', 'resolved', 'false_alarm')
    .required()
    .messages({
      'any.only': 'Response type must be one of: acknowledged, investigating, contact_attempted, escalated, resolved, false_alarm',
      'any.required': 'Response type is required'
    }),

  notes: Joi.string()
    .min(10)
    .max(2000)
    .required()
    .messages({
      'string.min': 'Notes must be at least 10 characters long',
      'string.max': 'Notes cannot exceed 2000 characters',
      'any.required': 'Response notes are required'
    }),

  contact_attempted: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'contact_attempted must be a boolean value'
    }),

  contact_methods: Joi.array()
    .items(Joi.string().valid('phone', 'email', 'sms', 'emergency_contact', 'local_authorities'))
    .when('contact_attempted', {
      is: true,
      then: Joi.array().min(1).required(),
      otherwise: Joi.optional()
    })
    .messages({
      'array.min': 'At least one contact method is required when contact was attempted',
      'any.only': 'Contact methods must be from: phone, email, sms, emergency_contact, local_authorities'
    }),

  contact_success: Joi.boolean()
    .when('contact_attempted', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'boolean.base': 'contact_success must be a boolean value',
      'any.required': 'Contact success status is required when contact was attempted'
    }),

  escalate_to_admin: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'escalate_to_admin must be a boolean value'
    }),

  escalation_reason: Joi.string()
    .min(20)
    .max(1000)
    .when('escalate_to_admin', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'string.min': 'Escalation reason must be at least 20 characters long',
      'string.max': 'Escalation reason cannot exceed 1000 characters',
      'any.required': 'Escalation reason is required when escalating to admin'
    }),

  resolution_summary: Joi.string()
    .min(20)
    .max(2000)
    .when('response_type', {
      is: 'resolved',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'string.min': 'Resolution summary must be at least 20 characters long',
      'string.max': 'Resolution summary cannot exceed 2000 characters',
      'any.required': 'Resolution summary is required when marking as resolved'
    }),

  follow_up_required: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'follow_up_required must be a boolean value'
    }),

  user_contacted: Joi.boolean()
    .when('response_type', {
      is: 'resolved',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'boolean.base': 'user_contacted must be a boolean value',
      'any.required': 'User contact status is required when resolving'
    }),

  severity_assessment: Joi.string()
    .valid('low', 'medium', 'high', 'critical')
    .optional()
    .messages({
      'any.only': 'Severity assessment must be one of: low, medium, high, critical'
    }),

  next_steps: Joi.string()
    .max(1000)
    .optional()
    .messages({
      'string.max': 'Next steps cannot exceed 1000 characters'
    })
});

/**
 * Validate emergency response data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateEmergencyResponse = (req, res, next) => {
  const { error, value } = emergencyResponseSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid emergency response data',
      code: 'EMERGENCY_RESPONSE_VALIDATION_ERROR',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        rejected_value: detail.context.value
      }))
    });
  }

  req.validatedData = value;
  req.validationInfo = {
    validated_at: new Date().toISOString(),
    action_type: 'emergency_response',
    validator: 'emergencyResponseSchema'
  };

  next();
};

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  validateSessionAction,
  validateContentModeration,
  validateReportResolution,
  validateEmergencyResponse
}; 