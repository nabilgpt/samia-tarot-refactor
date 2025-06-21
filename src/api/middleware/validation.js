// ===============================================
// REQUEST VALIDATION MIDDLEWARE
// ===============================================

const Joi = require('joi');

/**
 * Middleware for validating request data using Joi schemas
 * @param {Object} schema - Joi schema object
 * @param {string} source - Data source: 'body', 'query', 'params'
 * @returns {Function} Express middleware function
 */
const validateRequest = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = req[source];
    
    if (!data) {
      return res.status(400).json({
        error: 'Request data is required',
        code: 'VALIDATION_ERROR',
        details: `No ${source} data provided`
      });
    }

    const { error, value } = schema.validate(data, {
      abortEarly: false, // Return all validation errors
      allowUnknown: false, // Don't allow extra fields
      stripUnknown: true // Remove unknown fields
    });

    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }));

      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validationErrors
      });
    }

    // Replace the original data with validated data
    req[source] = value;
    next();
  };
};

/**
 * Middleware for validating multiple sources (body, query, params)
 * @param {Object} schemas - Object with schemas for different sources
 * @returns {Function} Express middleware function
 */
const validateMultiple = (schemas) => {
  return (req, res, next) => {
    const validationErrors = [];

    // Validate each specified source
    Object.keys(schemas).forEach(source => {
      const data = req[source];
      const schema = schemas[source];

      if (schema) {
        const { error, value } = schema.validate(data, {
          abortEarly: false,
          allowUnknown: false,
          stripUnknown: true
        });

        if (error) {
          const sourceErrors = error.details.map(detail => ({
            source,
            field: detail.path.join('.'),
            message: detail.message,
            type: detail.type
          }));
          validationErrors.push(...sourceErrors);
        } else {
          req[source] = value;
        }
      }
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validationErrors
      });
    }

    next();
  };
};

/**
 * Middleware for validating query parameters
 * @param {Object} schema - Joi schema for query parameters
 * @returns {Function} Express middleware function
 */
const validateQuery = (schema) => {
  return validateRequest(schema, 'query');
};

/**
 * Middleware for validating URL parameters
 * @param {Object} schema - Joi schema for URL parameters
 * @returns {Function} Express middleware function
 */
const validateParams = (schema) => {
  return validateRequest(schema, 'params');
};

/**
 * Common validation schemas for reuse
 */
const commonSchemas = {
  // UUID parameter validation
  uuidParam: Joi.object({
    id: Joi.string().uuid().required()
  }),

  // Pagination query validation
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().optional(),
    order: Joi.string().valid('asc', 'desc').default('desc')
  }),

  // Date range query validation
  dateRange: Joi.object({
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().min(Joi.ref('start_date')).optional(),
    timezone: Joi.string().optional()
  }),

  // Search query validation
  search: Joi.object({
    q: Joi.string().min(1).max(100).optional(),
    category: Joi.string().optional(),
    status: Joi.string().optional()
  }),

  // File upload validation
  fileUpload: Joi.object({
    file_type: Joi.string().valid('image', 'video', 'audio', 'document').required(),
    max_size: Joi.number().integer().min(1).optional(),
    allowed_extensions: Joi.array().items(Joi.string()).optional()
  })
};

/**
 * Custom validation functions
 */
const customValidators = {
  /**
   * Validate phone number format
   */
  phoneNumber: Joi.string().pattern(/^[+]?[1-9]\d{1,14}$/).message('Invalid phone number format'),

  /**
   * Validate password strength
   */
  strongPassword: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .message('Password must be at least 8 characters with uppercase, lowercase, number, and special character'),

  /**
   * Validate URL format
   */
  url: Joi.string().uri().message('Invalid URL format'),

  /**
   * Validate monetary amount
   */
  monetaryAmount: Joi.number().precision(2).positive().message('Invalid monetary amount'),

  /**
   * Validate time format (HH:mm)
   */
  timeFormat: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).message('Invalid time format (HH:mm)'),

  /**
   * Validate array of UUIDs
   */
  uuidArray: Joi.array().items(Joi.string().uuid()).min(1).message('Array of valid UUIDs required')
};

/**
 * Validation error formatter
 */
const formatValidationError = (error) => {
  return {
    error: 'Validation failed',
    code: 'VALIDATION_ERROR',
    details: error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message.replace(/"/g, ''),
      type: detail.type,
      value: detail.context?.value
    }))
  };
};

/**
 * Async validation middleware for database-dependent validations
 */
const asyncValidate = (validationFn) => {
  return async (req, res, next) => {
    try {
      const result = await validationFn(req);
      if (result.error) {
        return res.status(400).json(result);
      }
      next();
    } catch (error) {
      console.error('Async validation error:', error);
      res.status(500).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.message
      });
    }
  };
};

module.exports = {
  validateRequest,
  validateMultiple,
  validateQuery,
  validateParams,
  commonSchemas,
  customValidators,
  formatValidationError,
  asyncValidate
}; 