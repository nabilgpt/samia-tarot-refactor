// =============================================================================
// SUBSCRIPTION VALIDATORS - مدققات الاشتراكات
// =============================================================================
// Joi validation schemas for subscription endpoints

const Joi = require('joi');

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

// Subscription creation schema
const subscriptionSchema = Joi.object({
  plan_id: Joi.string()
    .valid('basic', 'premium', 'enterprise')
    .required()
    .messages({
      'any.only': 'Invalid subscription plan',
      'any.required': 'Subscription plan is required'
    }),

  payment_method_id: Joi.string()
    .required()
    .messages({
      'any.required': 'Payment method is required'
    }),

  billing_cycle: Joi.string()
    .valid('monthly', 'yearly')
    .default('monthly')
    .optional(),

  promo_code: Joi.string()
    .max(50)
    .optional(),

  auto_renew: Joi.boolean()
    .default(true)
    .optional()
});

// Payment method schema
const paymentMethodSchema = Joi.object({
  type: Joi.string()
    .valid('card', 'bank_account', 'paypal')
    .required()
    .messages({
      'any.only': 'Invalid payment method type',
      'any.required': 'Payment method type is required'
    }),

  card_number: Joi.string()
    .creditCard()
    .when('type', {
      is: 'card',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'string.creditCard': 'Invalid credit card number'
    }),

  expiry_month: Joi.number()
    .integer()
    .min(1)
    .max(12)
    .when('type', {
      is: 'card',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),

  expiry_year: Joi.number()
    .integer()
    .min(new Date().getFullYear())
    .when('type', {
      is: 'card',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),

  cvv: Joi.string()
    .length(3)
    .pattern(/^[0-9]+$/)
    .when('type', {
      is: 'card',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),

  cardholder_name: Joi.string()
    .min(2)
    .max(100)
    .when('type', {
      is: 'card',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),

  billing_address: Joi.object({
    street: Joi.string().max(200).required(),
    city: Joi.string().max(100).required(),
    state: Joi.string().max(100).optional(),
    postal_code: Joi.string().max(20).required(),
    country: Joi.string().length(2).required()
  }).optional()
});

// Promo code schema
const promoCodeSchema = Joi.object({
  code: Joi.string()
    .min(3)
    .max(50)
    .required()
    .messages({
      'string.min': 'Promo code must be at least 3 characters',
      'string.max': 'Promo code cannot exceed 50 characters',
      'any.required': 'Promo code is required'
    }),

  subscription_plan: Joi.string()
    .valid('basic', 'premium', 'enterprise')
    .optional()
});

// Subscription update schema
const subscriptionUpdateSchema = Joi.object({
  plan_id: Joi.string()
    .valid('basic', 'premium', 'enterprise')
    .optional(),

  billing_cycle: Joi.string()
    .valid('monthly', 'yearly')
    .optional(),

  auto_renew: Joi.boolean()
    .optional(),

  payment_method_id: Joi.string()
    .optional()
});

// Usage tracking schema
const usageTrackingSchema = Joi.object({
  feature: Joi.string()
    .valid('readings', 'ai_insights', 'premium_features', 'api_calls')
    .required()
    .messages({
      'any.only': 'Invalid feature type',
      'any.required': 'Feature type is required'
    }),

  usage_count: Joi.number()
    .integer()
    .min(1)
    .required()
    .messages({
      'number.min': 'Usage count must be at least 1',
      'any.required': 'Usage count is required'
    }),

  metadata: Joi.object().optional()
});

// =============================================================================
// VALIDATION MIDDLEWARE FUNCTIONS
// =============================================================================

/**
 * Validate subscription creation
 */
const validateSubscription = (req, res, next) => {
  const { error, value } = subscriptionSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid subscription data',
      code: 'SUBSCRIPTION_VALIDATION_ERROR',
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
 * Validate payment method
 */
const validatePaymentMethod = (req, res, next) => {
  const { error, value } = paymentMethodSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid payment method data',
      code: 'PAYMENT_METHOD_VALIDATION_ERROR',
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
 * Validate promo code
 */
const validatePromoCode = (req, res, next) => {
  const { error, value } = promoCodeSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid promo code data',
      code: 'PROMO_CODE_VALIDATION_ERROR',
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
 * Validate subscription update
 */
const validateSubscriptionUpdate = (req, res, next) => {
  const { error, value } = subscriptionUpdateSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid subscription update data',
      code: 'SUBSCRIPTION_UPDATE_VALIDATION_ERROR',
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
 * Validate usage tracking
 */
const validateUsageTracking = (req, res, next) => {
  const { error, value } = usageTrackingSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid usage tracking data',
      code: 'USAGE_TRACKING_VALIDATION_ERROR',
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
// ADDITIONAL VALIDATION FUNCTIONS
// =============================================================================

// Validate plan creation
const validatePlanCreation = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().required().min(2).max(100),
    description: Joi.string().required().min(10).max(500),
    price: Joi.number().required().min(0),
    duration: Joi.string().required().valid('monthly', 'yearly', 'lifetime'),
    features: Joi.array().items(Joi.string()).required(),
    user_types: Joi.array().items(Joi.string().valid('client', 'reader')).required(),
    active: Joi.boolean().default(true)
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.details[0].message
    });
  }
  next();
};

// Validate plan upgrade/downgrade
const validatePlanUpgrade = (req, res, next) => {
  const schema = Joi.object({
    payment_method: Joi.string().when('immediate_upgrade', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    immediate_upgrade: Joi.boolean().default(false),
    promo_code: Joi.string().optional(),
    effective_date: Joi.date().optional(),
    reason: Joi.string().optional().max(500)
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.details[0].message
    });
  }
  next();
};

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  validateSubscription,
  validatePaymentMethod,
  validatePromoCode,
  validateSubscriptionUpdate,
  validateUsageTracking,
  validatePlanCreation,
  validatePlanUpgrade
}; 