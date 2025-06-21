// =============================================================================
// NOTIFICATION VALIDATORS - مدققات الإشعارات
// =============================================================================
// Joi validation schemas for notification endpoints

const Joi = require('joi');

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

// Send notification schema
const sendNotificationSchema = Joi.object({
  recipient_ids: Joi.array()
    .items(Joi.string().uuid())
    .min(1)
    .max(100)
    .required()
    .messages({
      'array.min': 'At least one recipient is required',
      'array.max': 'Cannot send to more than 100 recipients at once',
      'any.required': 'Recipient IDs are required'
    }),

  type: Joi.string()
    .valid('booking_confirmed', 'booking_reminder', 'chat_message', 'payment_received', 'system_alert')
    .required()
    .messages({
      'any.only': 'Invalid notification type',
      'any.required': 'Notification type is required'
    }),

  title: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'Title cannot be empty',
      'string.max': 'Title cannot exceed 100 characters',
      'any.required': 'Title is required'
    }),

  message: Joi.string()
    .min(1)
    .max(500)
    .required()
    .messages({
      'string.min': 'Message cannot be empty',
      'string.max': 'Message cannot exceed 500 characters',
      'any.required': 'Message is required'
    }),

  data: Joi.object()
    .optional()
    .default({}),

  priority: Joi.string()
    .valid('low', 'medium', 'high', 'urgent')
    .default('medium')
    .messages({
      'any.only': 'Priority must be one of: low, medium, high, urgent'
    }),

  channels: Joi.array()
    .items(Joi.string().valid('push', 'email', 'sms', 'socket'))
    .default(['push'])
    .messages({
      'any.only': 'Invalid notification channel'
    })
});

// Bulk notification schema
const bulkNotificationSchema = Joi.object({
  roles: Joi.array()
    .items(Joi.string().valid('client', 'reader', 'admin', 'monitor', 'super_admin'))
    .optional()
    .messages({
      'any.only': 'Invalid role specified'
    }),

  recipients: Joi.array()
    .items(Joi.string().uuid())
    .optional()
    .messages({
      'string.guid': 'Invalid recipient ID format'
    }),

  type: Joi.string()
    .valid('booking_confirmed', 'booking_reminder', 'chat_message', 'payment_received', 'system_alert', 'announcement')
    .required()
    .messages({
      'any.only': 'Invalid notification type',
      'any.required': 'Notification type is required'
    }),

  title: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'Title cannot be empty',
      'string.max': 'Title cannot exceed 100 characters',
      'any.required': 'Title is required'
    }),

  message: Joi.string()
    .min(1)
    .max(1000)
    .required()
    .messages({
      'string.min': 'Message cannot be empty',
      'string.max': 'Message cannot exceed 1000 characters',
      'any.required': 'Message is required'
    }),

  data: Joi.object()
    .optional()
    .default({}),

  priority: Joi.string()
    .valid('low', 'medium', 'high', 'urgent')
    .default('medium')
    .messages({
      'any.only': 'Priority must be one of: low, medium, high, urgent'
    }),

  exclude_users: Joi.array()
    .items(Joi.string().uuid())
    .optional()
    .default([]),

  schedule_at: Joi.date()
    .iso()
    .min('now')
    .optional()
    .messages({
      'date.min': 'Schedule time must be in the future'
    }),

  exclude_roles: Joi.array()
    .items(Joi.string().valid('client', 'reader', 'admin', 'monitor', 'super_admin'))
    .optional()
    .default([])
});

// Notification update schema
const notificationUpdateSchema = Joi.object({
  read_status: Joi.boolean()
    .optional(),

  archived: Joi.boolean()
    .optional(),

  priority: Joi.string()
    .valid('low', 'medium', 'high', 'urgent')
    .optional()
    .messages({
      'any.only': 'Priority must be one of: low, medium, high, urgent'
    })
});

// Notification settings schema
const notificationSettingsSchema = Joi.object({
  channels: Joi.array()
    .items(Joi.string().valid('push', 'email', 'sms', 'socket'))
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one notification channel must be enabled',
      'any.only': 'Invalid notification channel',
      'any.required': 'Notification channels are required'
    }),

  types: Joi.object({
    booking_confirmed: Joi.boolean().default(true),
    booking_reminder: Joi.boolean().default(true),
    chat_message: Joi.boolean().default(true),
    payment_received: Joi.boolean().default(true),
    system_alert: Joi.boolean().default(true),
    announcement: Joi.boolean().default(true)
  }).required(),

  quiet_hours: Joi.object({
    enabled: Joi.boolean().default(false),
    start: Joi.string()
      .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .when('enabled', {
        is: true,
        then: Joi.required(),
        otherwise: Joi.optional()
      })
      .messages({
        'string.pattern.base': 'Start time must be in HH:MM format',
        'any.required': 'Start time is required when quiet hours are enabled'
      }),
    end: Joi.string()
      .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .when('enabled', {
        is: true,
        then: Joi.required(),
        otherwise: Joi.optional()
      })
      .messages({
        'string.pattern.base': 'End time must be in HH:MM format',
        'any.required': 'End time is required when quiet hours are enabled'
      })
  }).optional().default({
    enabled: false,
    start: '22:00',
    end: '08:00'
  }),

  frequency: Joi.string()
    .valid('instant', 'batched_5min', 'batched_15min', 'batched_hourly', 'daily_digest')
    .default('instant')
    .messages({
      'any.only': 'Invalid notification frequency'
    })
});

// =============================================================================
// VALIDATION MIDDLEWARE FUNCTIONS
// =============================================================================

/**
 * Validate send notification data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateNotificationSend = (req, res, next) => {
  const { error, value } = sendNotificationSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid notification data',
      code: 'NOTIFICATION_VALIDATION_ERROR',
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
    validator: 'sendNotificationSchema'
  };

  next();
};

/**
 * Validate notification update data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateNotificationUpdate = (req, res, next) => {
  const { error, value } = notificationUpdateSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid notification update data',
      code: 'NOTIFICATION_UPDATE_VALIDATION_ERROR',
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
    validator: 'notificationUpdateSchema'
  };

  next();
};

/**
 * Validate bulk notification data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateBulkNotification = (req, res, next) => {
  const { error, value } = bulkNotificationSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid bulk notification data',
      code: 'BULK_NOTIFICATION_VALIDATION_ERROR',
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
    validator: 'bulkNotificationSchema'
  };

  next();
};

/**
 * Validate notification settings data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateNotificationSettings = (req, res, next) => {
  const { error, value } = notificationSettingsSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid notification settings data',
      code: 'NOTIFICATION_SETTINGS_VALIDATION_ERROR',
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
    validator: 'notificationSettingsSchema'
  };

  next();
};

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  validateNotificationSend,
  validateNotificationUpdate,
  validateBulkNotification,
  validateNotificationSettings
}; 