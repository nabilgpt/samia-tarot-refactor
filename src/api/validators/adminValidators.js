// =============================================================================
// ADMIN VALIDATORS - محددات التحقق للإدارة
// =============================================================================
// Input validation schemas for admin operations

const Joi = require('joi');

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

// User update validation schema
const userUpdateSchema = Joi.object({
  first_name: Joi.string().min(2).max(50).trim(),
  last_name: Joi.string().min(2).max(50).trim(),
  email: Joi.string().email().lowercase().trim(),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/),
  is_active: Joi.boolean(),
  bio: Joi.string().max(500).allow(''),
  country: Joi.string().max(100),
  timezone: Joi.string().max(50),
  languages: Joi.array().items(Joi.string()),
  avatar_url: Joi.string().uri().allow(''),
  specialties: Joi.array().items(Joi.string()),
  reason: Joi.string().max(500) // For disable operations
}).min(1); // At least one field must be provided

// Role change validation schema
const roleChangeSchema = Joi.object({
  role: Joi.string()
    .valid('client', 'reader', 'monitor', 'admin', 'super_admin')
    .required(),
  reason: Joi.string().max(500)
}).required();

// Booking update validation schema
const bookingUpdateSchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'),
  notes: Joi.string().max(1000).allow(''),
  reader_id: Joi.string().uuid(),
  scheduled_at: Joi.date().iso(),
  service_id: Joi.string().uuid(),
  reason: Joi.string().max(500) // For cancellations
}).min(1);

// Payment action validation schema
const paymentActionSchema = Joi.object({
  admin_notes: Joi.string().max(1000).allow(''),
  reason: Joi.string().max(500) // Required for rejections
});

// Service update validation schema
const serviceUpdateSchema = Joi.object({
  name: Joi.string().min(3).max(100).trim(),
  description: Joi.string().max(1000).allow(''),
  price: Joi.number().positive().precision(2),
  duration_minutes: Joi.number().integer().positive().max(480), // Max 8 hours
  is_active: Joi.boolean(),
  type: Joi.string().valid('tarot', 'astrology', 'psychic', 'numerology', 'energy_healing', 'other')
}).min(1);

// Complaint resolution validation schema
const complaintResolutionSchema = Joi.object({
  resolution_notes: Joi.string().min(10).max(1000).required(),
  resolution_action: Joi.string()
    .valid('resolved', 'escalated', 'dismissed', 'refunded', 'compensated')
}).required();

// =============================================================================
// VALIDATION MIDDLEWARE FUNCTIONS
// =============================================================================

/**
 * Validate user update data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateUserUpdate = (req, res, next) => {
  const { error, value } = userUpdateSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid user update data',
      code: 'VALIDATION_ERROR',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        rejected_value: detail.context.value
      }))
    });
  }

  // Add validation metadata
  req.validatedData = value;
  req.validationInfo = {
    validated_at: new Date().toISOString(),
    field_count: Object.keys(value).length,
    validator: 'userUpdateSchema'
  };

  next();
};

/**
 * Validate role change data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateRoleChange = (req, res, next) => {
  const { error, value } = roleChangeSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid role change data',
      code: 'VALIDATION_ERROR',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        rejected_value: detail.context.value
      }))
    });
  }

  // Additional business logic validation
  const currentUserRole = req.profile?.role;
  const targetRole = value.role;

  // Prevent elevation to super_admin by non-super_admin
  if (targetRole === 'super_admin' && currentUserRole !== 'super_admin') {
    return res.status(403).json({
      success: false,
      error: 'Only super admin can promote users to super admin role',
      code: 'INSUFFICIENT_PERMISSIONS_FOR_ROLE'
    });
  }

  // Prevent admin from demoting super_admin
  if (currentUserRole === 'admin') {
    // Get target user's current role (would need database query)
    // For now, assume this check happens in the controller
  }

  req.validatedData = value;
  req.validationInfo = {
    validated_at: new Date().toISOString(),
    role_change: `to_${targetRole}`,
    validator: 'roleChangeSchema'
  };

  next();
};

/**
 * Validate booking update data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateBookingUpdate = (req, res, next) => {
  const { error, value } = bookingUpdateSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid booking update data',
      code: 'VALIDATION_ERROR',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        rejected_value: detail.context.value
      }))
    });
  }

  // Business logic validation
  if (value.scheduled_at && new Date(value.scheduled_at) < new Date()) {
    return res.status(400).json({
      success: false,
      error: 'Scheduled time cannot be in the past',
      code: 'INVALID_SCHEDULE_TIME'
    });
  }

  // For DELETE operations (cancellations), reason is required
  if (req.method === 'DELETE' && !value.reason) {
    return res.status(400).json({
      success: false,
      error: 'Reason is required for booking cancellation',
      code: 'CANCELLATION_REASON_REQUIRED'
    });
  }

  req.validatedData = value;
  req.validationInfo = {
    validated_at: new Date().toISOString(),
    operation_type: req.method === 'DELETE' ? 'cancellation' : 'update',
    validator: 'bookingUpdateSchema'
  };

  next();
};

/**
 * Validate payment action data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validatePaymentAction = (req, res, next) => {
  const { error, value } = paymentActionSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid payment action data',
      code: 'VALIDATION_ERROR',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        rejected_value: detail.context.value
      }))
    });
  }

  // Check if rejection requires reason
  const isRejectAction = req.path.includes('/reject');
  if (isRejectAction && !value.reason) {
    return res.status(400).json({
      success: false,
      error: 'Reason is required for payment rejection',
      code: 'REJECTION_REASON_REQUIRED'
    });
  }

  req.validatedData = value;
  req.validationInfo = {
    validated_at: new Date().toISOString(),
    action_type: isRejectAction ? 'rejection' : 'approval',
    validator: 'paymentActionSchema'
  };

  next();
};

/**
 * Validate service update data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateServiceUpdate = (req, res, next) => {
  const { error, value } = serviceUpdateSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid service update data',
      code: 'VALIDATION_ERROR',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        rejected_value: detail.context.value
      }))
    });
  }

  // Business logic validation
  if (value.price && value.price < 0.01) {
    return res.status(400).json({
      success: false,
      error: 'Service price must be at least 0.01',
      code: 'INVALID_PRICE_RANGE'
    });
  }

  if (value.duration_minutes && value.duration_minutes < 15) {
    return res.status(400).json({
      success: false,
      error: 'Service duration must be at least 15 minutes',
      code: 'INVALID_DURATION_RANGE'
    });
  }

  req.validatedData = value;
  req.validationInfo = {
    validated_at: new Date().toISOString(),
    updated_fields: Object.keys(value),
    validator: 'serviceUpdateSchema'
  };

  next();
};

/**
 * Validate complaint resolution data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateComplaintResolution = (req, res, next) => {
  const { error, value } = complaintResolutionSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid complaint resolution data',
      code: 'VALIDATION_ERROR',
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
    resolution_type: value.resolution_action || 'general',
    validator: 'complaintResolutionSchema'
  };

  next();
};

// =============================================================================
// QUERY PARAMETER VALIDATORS
// =============================================================================

/**
 * Validate pagination parameters
 * @param {Object} query - Query parameters
 * @returns {Object} Validated pagination params
 */
const validatePagination = (query) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  });

  const { error, value } = schema.validate(query);
  if (error) {
    throw new Error(`Invalid pagination parameters: ${error.message}`);
  }

  return value;
};

/**
 * Validate date range parameters
 * @param {Object} query - Query parameters
 * @returns {Object} Validated date range
 */
const validateDateRange = (query) => {
  const schema = Joi.object({
    date_from: Joi.date().iso(),
    date_to: Joi.date().iso().min(Joi.ref('date_from'))
  });

  const { error, value } = schema.validate(query);
  if (error) {
    throw new Error(`Invalid date range: ${error.message}`);
  }

  return value;
};

/**
 * Validate filter parameters for different endpoints
 * @param {Object} query - Query parameters
 * @param {string} type - Filter type (users, bookings, payments, etc.)
 * @returns {Object} Validated filters
 */
const validateFilters = (query, type) => {
  let schema;

  switch (type) {
    case 'users':
      schema = Joi.object({
        role: Joi.string().valid('client', 'reader', 'monitor', 'admin', 'super_admin'),
        status: Joi.string().valid('active', 'inactive'),
        search: Joi.string().max(100),
        sort_by: Joi.string().valid('created_at', 'updated_at', 'first_name', 'last_name').default('created_at'),
        sort_order: Joi.string().valid('asc', 'desc').default('desc')
      });
      break;

    case 'bookings':
      schema = Joi.object({
        status: Joi.string().valid('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'),
        reader_id: Joi.string().uuid(),
        client_id: Joi.string().uuid(),
        service_type: Joi.string().valid('tarot', 'astrology', 'psychic', 'numerology', 'energy_healing', 'other')
      });
      break;

    case 'payments':
      schema = Joi.object({
        method: Joi.string().valid('credit_card', 'bank_transfer', 'wallet', 'crypto'),
        status: Joi.string().valid('pending', 'completed', 'failed', 'refunded'),
        user_id: Joi.string().uuid(),
        amount_from: Joi.number().positive(),
        amount_to: Joi.number().positive().min(Joi.ref('amount_from'))
      });
      break;

    case 'services':
      schema = Joi.object({
        type: Joi.string().valid('tarot', 'astrology', 'psychic', 'numerology', 'energy_healing', 'other'),
        is_active: Joi.boolean()
      });
      break;

    case 'readers':
      schema = Joi.object({
        is_active: Joi.boolean(),
        rating_min: Joi.number().min(0).max(5),
        rating_max: Joi.number().min(0).max(5).min(Joi.ref('rating_min')),
        sort_by: Joi.string().valid('created_at', 'first_name', 'last_name').default('created_at'),
        sort_order: Joi.string().valid('asc', 'desc').default('desc')
      });
      break;

    case 'complaints':
      schema = Joi.object({
        status: Joi.string().valid('open', 'in_progress', 'resolved', 'closed'),
        priority: Joi.string().valid('low', 'medium', 'high', 'urgent'),
        type: Joi.string().valid('complaint', 'feedback', 'report', 'suggestion')
      });
      break;

    default:
      return query;
  }

  const { error, value } = schema.validate(query, { stripUnknown: true });
  if (error) {
    throw new Error(`Invalid ${type} filters: ${error.message}`);
  }

  return value;
};

// =============================================================================
// SECURITY VALIDATORS
// =============================================================================

/**
 * Validate admin permission level for sensitive operations
 * @param {Object} req - Express request object
 * @param {Array} requiredRoles - Required roles for operation
 * @returns {boolean} Permission validation result
 */
const validateAdminPermissions = (req, requiredRoles = ['admin', 'super_admin']) => {
  const userRole = req.profile?.role;
  
  if (!userRole || !requiredRoles.includes(userRole)) {
    return {
      valid: false,
      error: 'Insufficient admin permissions',
      required_roles: requiredRoles,
      user_role: userRole
    };
  }

  return { valid: true };
};

/**
 * Validate UUID parameters
 * @param {string} id - UUID string
 * @param {string} fieldName - Field name for error messages
 * @returns {Object} Validation result
 */
const validateUUID = (id, fieldName = 'id') => {
  const schema = Joi.string().uuid().required();
  const { error } = schema.validate(id);
  
  if (error) {
    return {
      valid: false,
      error: `Invalid ${fieldName} format`,
      details: error.message
    };
  }

  return { valid: true };
};

module.exports = {
  // Main validation middleware
  validateUserUpdate,
  validateRoleChange,
  validateBookingUpdate,
  validatePaymentAction,
  validateServiceUpdate,
  validateComplaintResolution,

  // Utility validators
  validatePagination,
  validateDateRange,
  validateFilters,
  validateAdminPermissions,
  validateUUID,

  // Raw schemas for testing
  schemas: {
    userUpdateSchema,
    roleChangeSchema,
    bookingUpdateSchema,
    paymentActionSchema,
    serviceUpdateSchema,
    complaintResolutionSchema
  }
}; 