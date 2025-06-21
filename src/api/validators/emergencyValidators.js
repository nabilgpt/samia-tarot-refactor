// =============================================================================
// EMERGENCY VALIDATORS - مدققات الطوارئ
// =============================================================================
// Joi validation schemas for emergency endpoints

const Joi = require('joi');

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

// Emergency alert schema
const emergencyAlertSchema = Joi.object({
  type: Joi.string()
    .valid('medical', 'mental_health', 'safety', 'domestic_violence', 'substance_abuse', 'other')
    .required()
    .messages({
      'any.only': 'Invalid emergency type',
      'any.required': 'Emergency type is required'
    }),

  severity: Joi.string()
    .valid('low', 'medium', 'high', 'critical')
    .required()
    .messages({
      'any.only': 'Severity must be one of: low, medium, high, critical',
      'any.required': 'Severity level is required'
    }),

  message: Joi.string()
    .min(10)
    .max(1000)
    .required()
    .messages({
      'string.min': 'Emergency message must be at least 10 characters',
      'string.max': 'Emergency message cannot exceed 1000 characters',
      'any.required': 'Emergency message is required'
    }),

  location: Joi.object({
    latitude: Joi.number().min(-90).max(90).optional(),
    longitude: Joi.number().min(-180).max(180).optional(),
    address: Joi.string().max(500).optional(),
    description: Joi.string().max(200).optional()
  }).optional(),

  user_id: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.guid': 'Invalid user ID format'
    })
});

// Emergency status update schema
const emergencyStatusSchema = Joi.object({
  status: Joi.string()
    .valid('active', 'in_progress', 'resolved', 'cancelled')
    .required()
    .messages({
      'any.only': 'Status must be one of: active, in_progress, resolved, cancelled',
      'any.required': 'Status is required'
    }),

  resolution_notes: Joi.string()
    .max(1000)
    .when('status', {
      is: 'resolved',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'string.max': 'Resolution notes cannot exceed 1000 characters',
      'any.required': 'Resolution notes are required when resolving an emergency'
    })
});

// Emergency contact schema
const emergencyContactSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name cannot exceed 100 characters',
      'any.required': 'Contact name is required'
    }),

  phone: Joi.string()
    .pattern(/^[+]?[1-9][\d]{0,15}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid phone number format',
      'any.required': 'Phone number is required'
    }),

  email: Joi.string()
    .email()
    .optional()
    .messages({
      'string.email': 'Invalid email format'
    }),

  relationship: Joi.string()
    .valid('family', 'friend', 'colleague', 'healthcare_provider', 'therapist', 'other')
    .required()
    .messages({
      'any.only': 'Invalid relationship type',
      'any.required': 'Relationship is required'
    }),

  priority: Joi.number()
    .integer()
    .min(1)
    .max(10)
    .default(1)
    .messages({
      'number.min': 'Priority must be between 1 and 10',
      'number.max': 'Priority must be between 1 and 10'
    })
});

// Emergency protocol trigger schema
const emergencyProtocolSchema = Joi.object({
  protocol_id: Joi.string()
    .valid('mental_health_crisis', 'medical_emergency', 'safety_threat', 'substance_abuse')
    .required()
    .messages({
      'any.only': 'Invalid protocol ID',
      'any.required': 'Protocol ID is required'
    }),

  user_id: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.guid': 'Invalid user ID format'
    }),

  additional_info: Joi.object({
    symptoms: Joi.array().items(Joi.string()).optional(),
    severity: Joi.string().valid('low', 'medium', 'high', 'critical').optional(),
    immediate_danger: Joi.boolean().optional(),
    location: Joi.string().max(500).optional(),
    notes: Joi.string().max(1000).optional()
  }).optional()
});

// Emergency request schema
const emergencyRequestSchema = Joi.object({
  emergency_type: Joi.string()
    .valid('medical', 'mental_health', 'safety', 'substance_abuse', 'other')
    .required()
    .messages({
      'any.only': 'Invalid emergency type',
      'any.required': 'Emergency type is required'
    }),

  description: Joi.string()
    .min(10)
    .max(1000)
    .required()
    .messages({
      'string.min': 'Description must be at least 10 characters',
      'string.max': 'Description cannot exceed 1000 characters',
      'any.required': 'Description is required'
    }),

  severity: Joi.string()
    .valid('low', 'medium', 'high', 'critical')
    .required()
    .messages({
      'any.only': 'Invalid severity level',
      'any.required': 'Severity level is required'
    }),

  location: Joi.string()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Location cannot exceed 500 characters'
    }),

  contact_preference: Joi.string()
    .valid('phone', 'email', 'chat', 'any')
    .optional()
    .messages({
      'any.only': 'Invalid contact preference'
    })
});

// Emergency response schema
const emergencyResponseSchema = Joi.object({
  response_type: Joi.string()
    .valid('accept', 'update', 'escalate', 'resolve')
    .optional(),

  actions_taken: Joi.string()
    .max(1000)
    .optional(),

  status_update: Joi.string()
    .max(500)
    .optional(),

  next_steps: Joi.string()
    .max(500)
    .optional(),

  estimated_response_time: Joi.number()
    .integer()
    .min(1)
    .max(1440)
    .optional()
});

// Emergency escalation schema
const emergencyEscalationSchema = Joi.object({
  escalation_level: Joi.string()
    .valid('supervisor', 'external_services', 'emergency_services')
    .optional(),

  reason: Joi.string()
    .min(10)
    .max(500)
    .required()
    .messages({
      'string.min': 'Reason must be at least 10 characters',
      'any.required': 'Escalation reason is required'
    }),

  external_services: Joi.array()
    .items(Joi.string().valid('police', 'ambulance', 'fire_department', 'mental_health_crisis'))
    .optional(),

  urgency: Joi.string()
    .valid('normal', 'high', 'critical')
    .optional()
});

// Emergency resolution schema
const emergencyResolutionSchema = Joi.object({
  resolution_type: Joi.string()
    .valid('resolved', 'referred', 'escalated', 'closed')
    .required(),

  resolution_summary: Joi.string()
    .min(10)
    .max(1000)
    .required(),

  follow_up_required: Joi.boolean()
    .optional(),

  user_contacted: Joi.boolean()
    .optional(),

  closure_reason: Joi.string()
    .max(500)
    .optional(),

  final_notes: Joi.string()
    .max(1000)
    .optional(),

  quality_rating: Joi.number()
    .integer()
    .min(1)
    .max(5)
    .optional()
});

// =============================================================================
// VALIDATION MIDDLEWARE FUNCTIONS
// =============================================================================

/**
 * Validate emergency alert data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateEmergencyAlert = (req, res, next) => {
  const { error, value } = emergencyAlertSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid emergency alert data',
      code: 'EMERGENCY_ALERT_VALIDATION_ERROR',
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
    validator: 'emergencyAlertSchema'
  };

  next();
};

/**
 * Validate emergency status update data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateEmergencyStatus = (req, res, next) => {
  const { error, value } = emergencyStatusSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid emergency status data',
      code: 'EMERGENCY_STATUS_VALIDATION_ERROR',
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
    validator: 'emergencyStatusSchema'
  };

  next();
};

/**
 * Validate emergency contact data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateEmergencyContact = (req, res, next) => {
  const { error, value } = emergencyContactSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid emergency contact data',
      code: 'EMERGENCY_CONTACT_VALIDATION_ERROR',
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
    validator: 'emergencyContactSchema'
  };

  next();
};

/**
 * Validate emergency protocol trigger data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateEmergencyProtocol = (req, res, next) => {
  const { error, value } = emergencyProtocolSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid emergency protocol data',
      code: 'EMERGENCY_PROTOCOL_VALIDATION_ERROR',
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
    validator: 'emergencyProtocolSchema'
  };

  next();
};

/**
 * Validate emergency request data
 */
const validateEmergencyRequest = (req, res, next) => {
  const { error, value } = emergencyRequestSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid emergency request data',
      code: 'EMERGENCY_REQUEST_VALIDATION_ERROR',
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
    validator: 'emergencyRequestSchema'
  };

  next();
};

/**
 * Validate emergency response data
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
    validator: 'emergencyResponseSchema'
  };

  next();
};

/**
 * Validate emergency escalation data
 */
const validateEmergencyEscalation = (req, res, next) => {
  const { error, value } = emergencyEscalationSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid emergency escalation data',
      code: 'EMERGENCY_ESCALATION_VALIDATION_ERROR',
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
    validator: 'emergencyEscalationSchema'
  };

  next();
};

/**
 * Validate emergency resolution data
 */
const validateEmergencyResolution = (req, res, next) => {
  const { error, value } = emergencyResolutionSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid emergency resolution data',
      code: 'EMERGENCY_RESOLUTION_VALIDATION_ERROR',
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
    validator: 'emergencyResolutionSchema'
  };

  next();
};

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  validateEmergencyAlert,
  validateEmergencyStatus,
  validateEmergencyContact,
  validateEmergencyProtocol,
  validateEmergencyRequest,
  validateEmergencyResponse,
  validateEmergencyEscalation,
  validateEmergencyResolution
}; 