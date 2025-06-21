// =============================================================================
// SUPPORT VALIDATORS - مدققات الدعم الفني
// =============================================================================
// Joi validation schemas for support endpoints

const Joi = require('joi');

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

// Support ticket schema
const supportTicketSchema = Joi.object({
  subject: Joi.string()
    .min(5)
    .max(200)
    .required()
    .messages({
      'string.min': 'Subject must be at least 5 characters',
      'string.max': 'Subject cannot exceed 200 characters',
      'any.required': 'Subject is required'
    }),

  description: Joi.string()
    .min(20)
    .max(2000)
    .required()
    .messages({
      'string.min': 'Description must be at least 20 characters',
      'string.max': 'Description cannot exceed 2000 characters',
      'any.required': 'Description is required'
    }),

  category: Joi.string()
    .valid('technical', 'billing', 'account', 'general', 'bug_report', 'feature_request')
    .default('general')
    .messages({
      'any.only': 'Invalid category'
    }),

  priority: Joi.string()
    .valid('low', 'medium', 'high', 'urgent')
    .default('medium')
    .messages({
      'any.only': 'Invalid priority level'
    }),

  attachments: Joi.array()
    .items(Joi.string().uri())
    .max(5)
    .optional()
    .messages({
      'array.max': 'Maximum 5 attachments allowed'
    })
});

// Ticket response schema
const ticketResponseSchema = Joi.object({
  message: Joi.string()
    .min(10)
    .max(1000)
    .required()
    .messages({
      'string.min': 'Response must be at least 10 characters',
      'string.max': 'Response cannot exceed 1000 characters',
      'any.required': 'Response message is required'
    }),

  is_internal: Joi.boolean()
    .default(false)
    .optional(),

  attachments: Joi.array()
    .items(Joi.string().uri())
    .max(3)
    .optional()
});

// Knowledge base article schema
const knowledgeBaseArticleSchema = Joi.object({
  title: Joi.string()
    .min(5)
    .max(200)
    .required()
    .messages({
      'string.min': 'Title must be at least 5 characters',
      'string.max': 'Title cannot exceed 200 characters',
      'any.required': 'Title is required'
    }),

  content: Joi.string()
    .min(50)
    .max(10000)
    .required()
    .messages({
      'string.min': 'Content must be at least 50 characters',
      'string.max': 'Content cannot exceed 10000 characters',
      'any.required': 'Content is required'
    }),

  category: Joi.string()
    .valid('getting_started', 'troubleshooting', 'features', 'billing', 'api', 'security')
    .required()
    .messages({
      'any.only': 'Invalid category',
      'any.required': 'Category is required'
    }),

  tags: Joi.array()
    .items(Joi.string().max(50))
    .max(10)
    .optional(),

  is_published: Joi.boolean()
    .default(false)
    .optional(),

  meta_description: Joi.string()
    .max(300)
    .optional()
});

// FAQ schema
const faqSchema = Joi.object({
  question: Joi.string()
    .min(10)
    .max(300)
    .required()
    .messages({
      'string.min': 'Question must be at least 10 characters',
      'string.max': 'Question cannot exceed 300 characters',
      'any.required': 'Question is required'
    }),

  answer: Joi.string()
    .min(20)
    .max(2000)
    .required()
    .messages({
      'string.min': 'Answer must be at least 20 characters',
      'string.max': 'Answer cannot exceed 2000 characters',
      'any.required': 'Answer is required'
    }),

  category: Joi.string()
    .valid('general', 'account', 'billing', 'technical', 'features')
    .required()
    .messages({
      'any.only': 'Invalid category',
      'any.required': 'Category is required'
    }),

  order: Joi.number()
    .integer()
    .min(0)
    .default(0)
    .optional(),

  is_featured: Joi.boolean()
    .default(false)
    .optional()
});

// Live chat message schema
const chatMessageSchema = Joi.object({
  message: Joi.string()
    .min(1)
    .max(1000)
    .required()
    .messages({
      'string.min': 'Message cannot be empty',
      'string.max': 'Message cannot exceed 1000 characters',
      'any.required': 'Message is required'
    }),

  chat_id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Invalid chat ID format',
      'any.required': 'Chat ID is required'
    }),

  message_type: Joi.string()
    .valid('text', 'file', 'image', 'system')
    .default('text')
    .optional(),

  file_url: Joi.string()
    .uri()
    .optional()
    .when('message_type', {
      is: Joi.valid('file', 'image'),
      then: Joi.required(),
      otherwise: Joi.optional()
    })
});

// =============================================================================
// VALIDATION MIDDLEWARE FUNCTIONS
// =============================================================================

/**
 * Validate support ticket creation
 */
const validateSupportTicket = (req, res, next) => {
  const { error, value } = supportTicketSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid support ticket data',
      code: 'SUPPORT_TICKET_VALIDATION_ERROR',
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
 * Validate ticket response
 */
const validateTicketResponse = (req, res, next) => {
  const { error, value } = ticketResponseSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid ticket response data',
      code: 'TICKET_RESPONSE_VALIDATION_ERROR',
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
 * Validate knowledge base article
 */
const validateKnowledgeBaseArticle = (req, res, next) => {
  const { error, value } = knowledgeBaseArticleSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid knowledge base article data',
      code: 'KNOWLEDGE_BASE_VALIDATION_ERROR',
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
 * Validate FAQ
 */
const validateFAQ = (req, res, next) => {
  const { error, value } = faqSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid FAQ data',
      code: 'FAQ_VALIDATION_ERROR',
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
 * Validate chat message
 */
const validateChatMessage = (req, res, next) => {
  const { error, value } = chatMessageSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid chat message data',
      code: 'CHAT_MESSAGE_VALIDATION_ERROR',
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

// Ticket escalation schema
const ticketEscalationSchema = Joi.object({
  escalation_level: Joi.string()
    .valid('supervisor', 'manager', 'director', 'external')
    .required()
    .messages({
      'any.only': 'Invalid escalation level',
      'any.required': 'Escalation level is required'
    }),

  reason: Joi.string()
    .min(20)
    .max(500)
    .required()
    .messages({
      'string.min': 'Escalation reason must be at least 20 characters',
      'string.max': 'Escalation reason cannot exceed 500 characters',
      'any.required': 'Escalation reason is required'
    }),

  escalate_to: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.guid': 'Invalid escalate_to user ID format'
    }),

  urgency: Joi.string()
    .valid('normal', 'high', 'critical')
    .default('normal')
    .optional()
});

// Ticket update schema
const ticketUpdateSchema = Joi.object({
  subject: Joi.string()
    .min(5)
    .max(200)
    .optional(),

  description: Joi.string()
    .min(20)
    .max(2000)
    .optional(),

  priority: Joi.string()
    .valid('low', 'medium', 'high', 'urgent')
    .optional(),

  status: Joi.string()
    .valid('open', 'in_progress', 'waiting_customer', 'resolved', 'closed')
    .optional(),

  additional_info: Joi.string()
    .max(1000)
    .optional()
});

/**
 * Validate ticket creation
 */
const validateTicketCreation = (req, res, next) => {
  const { error, value } = supportTicketSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid ticket creation data',
      code: 'TICKET_CREATION_VALIDATION_ERROR',
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
 * Validate ticket update
 */
const validateTicketUpdate = (req, res, next) => {
  const { error, value } = ticketUpdateSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid ticket update data',
      code: 'TICKET_UPDATE_VALIDATION_ERROR',
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
 * Validate ticket escalation
 */
const validateTicketEscalation = (req, res, next) => {
  const { error, value } = ticketEscalationSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid ticket escalation data',
      code: 'TICKET_ESCALATION_VALIDATION_ERROR',
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
  validateSupportTicket,
  validateTicketResponse,
  validateKnowledgeBaseArticle,
  validateFAQ,
  validateChatMessage,
  validateTicketCreation,
  validateTicketUpdate,
  validateTicketEscalation
}; 