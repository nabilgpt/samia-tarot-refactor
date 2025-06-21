// ===============================================
// SWAGGER/OPENAPI CONFIGURATION
// SAMIA TAROT API Documentation
// ===============================================

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SAMIA TAROT API',
      version: '1.0.0',
      description: `
        Complete API documentation for SAMIA TAROT platform.
        A comprehensive tarot reading platform with multi-role system, real-time chat, 
        emergency response, AI integration, payment processing, and monitoring systems.
      `,
      contact: {
        name: 'SAMIA TAROT Support',
        email: 'support@samiatarot.com',
        url: 'https://samiatarot.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      },
      {
        url: 'https://api.samiatarot.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token obtained from authentication'
        }
      },
      schemas: {
        // ===============================================
        // CORE SCHEMAS
        // ===============================================
        Profile: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            first_name: { type: 'string', maxLength: 50 },
            last_name: { type: 'string', maxLength: 50 },
            phone: { type: 'string', maxLength: 20 },
            date_of_birth: { type: 'string', format: 'date' },
            gender: { type: 'string', enum: ['male', 'female', 'other'] },
            country: { type: 'string', maxLength: 50 },
            country_code: { type: 'string', maxLength: 5 },
            zodiac: { type: 'string', maxLength: 20 },
            avatar_url: { type: 'string', format: 'uri' },
            role: { type: 'string', enum: ['client', 'reader', 'admin', 'monitor', 'super_admin'] },
            is_active: { type: 'boolean' },
            bio: { type: 'string', maxLength: 1000 },
            specialties: {
              type: 'array',
              items: { type: 'string' }
            },
            languages: {
              type: 'array',
              items: { type: 'string' }
            },
            timezone: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },

        Service: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', maxLength: 100 },
            description: { type: 'string', maxLength: 1000 },
            type: { type: 'string', enum: ['tarot', 'coffee', 'palm', 'dream', 'call'] },
            price: { type: 'number', format: 'decimal', minimum: 0 },
            duration_minutes: { type: 'integer', minimum: 1 },
            is_vip: { type: 'boolean' },
            is_ai: { type: 'boolean' },
            is_active: { type: 'boolean' },
            created_by: { type: 'string', format: 'uuid' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },

        Booking: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            reader_id: { type: 'string', format: 'uuid' },
            service_id: { type: 'string', format: 'uuid' },
            scheduled_at: { type: 'string', format: 'date-time' },
            status: { type: 'string', enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'] },
            is_emergency: { type: 'boolean' },
            notes: { type: 'string', maxLength: 1000 },
            session_url: { type: 'string', format: 'uri' },
            recording_url: { type: 'string', format: 'uri' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },

        Payment: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            booking_id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            amount: { type: 'number', format: 'decimal', minimum: 0 },
            currency: { type: 'string', maxLength: 3, default: 'USD' },
            method: { 
              type: 'string', 
              enum: ['stripe', 'square', 'usdt', 'western_union', 'moneygram', 'ria', 'omt', 'whish', 'bob', 'wallet'] 
            },
            transaction_id: { type: 'string', maxLength: 255 },
            transaction_hash: { type: 'string', maxLength: 255 },
            receipt_url: { type: 'string', format: 'uri' },
            status: { 
              type: 'string', 
              enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'awaiting_approval'] 
            },
            admin_notes: { type: 'string', maxLength: 1000 },
            metadata: { type: 'object' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },

        // ===============================================
        // CALL SYSTEM SCHEMAS
        // ===============================================
        CallSession: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            client_id: { type: 'string', format: 'uuid' },
            reader_id: { type: 'string', format: 'uuid' },
            booking_id: { type: 'string', format: 'uuid' },
            room_id: { type: 'string', maxLength: 255 },
            call_type: { type: 'string', enum: ['voice', 'video'] },
            is_emergency: { type: 'boolean' },
            scheduled_duration: { type: 'integer', minimum: 1 },
            actual_duration: { type: 'integer', minimum: 0 },
            start_time: { type: 'string', format: 'date-time' },
            end_time: { type: 'string', format: 'date-time' },
            status: { 
              type: 'string', 
              enum: ['pending', 'ringing', 'active', 'ended', 'failed', 'escalated'] 
            },
            connection_quality: { type: 'object' },
            metadata: { type: 'object' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },

        EmergencyCall: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            client_id: { type: 'string', format: 'uuid' },
            reader_id: { type: 'string', format: 'uuid' },
            call_session_id: { type: 'string', format: 'uuid' },
            timestamp: { type: 'string', format: 'date-time' },
            emergency_type: { type: 'string', default: 'general' },
            priority_level: { type: 'integer', minimum: 1, maximum: 5 },
            status: { 
              type: 'string', 
              enum: ['pending', 'answered', 'escalated', 'resolved', 'cancelled'] 
            },
            response_time: { type: 'integer', minimum: 0 },
            answered: { type: 'boolean' },
            escalated_to: { type: 'string', format: 'uuid' },
            escalation_reason: { type: 'string', maxLength: 500 },
            notes: { type: 'string', maxLength: 1000 },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },

        // ===============================================
        // AI SYSTEM SCHEMAS
        // ===============================================
        AIModel: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            model_name: { type: 'string', maxLength: 100 },
            model_type: { 
              type: 'string', 
              enum: ['tarot_interpretation', 'reading_analysis', 'recommendation', 'conversation'] 
            },
            version: { type: 'string', maxLength: 20 },
            is_active: { type: 'boolean' },
            configuration: { type: 'object' },
            performance_metrics: { type: 'object' },
            training_data_info: { type: 'object' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },

        AISession: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            reader_id: { type: 'string', format: 'uuid' },
            session_id: { type: 'string', format: 'uuid' },
            ai_model_id: { type: 'string', format: 'uuid' },
            session_type: { 
              type: 'string', 
              enum: ['tarot_reading', 'interpretation', 'guidance', 'learning'] 
            },
            input_data: { type: 'object' },
            output_data: { type: 'object' },
            confidence_score: { type: 'number', minimum: 0, maximum: 1 },
            processing_time: { type: 'integer', minimum: 0 },
            status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed'] },
            error_message: { type: 'string', maxLength: 1000 },
            created_at: { type: 'string', format: 'date-time' },
            completed_at: { type: 'string', format: 'date-time' }
          }
        },

        // ===============================================
        // WALLET SYSTEM SCHEMAS
        // ===============================================
        Wallet: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            balance: { type: 'number', format: 'decimal', minimum: 0 },
            currency: { type: 'string', maxLength: 3, default: 'USD' },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },

        Transaction: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            wallet_id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            type: { 
              type: 'string', 
              enum: ['credit', 'debit', 'refund', 'topup', 'payment'] 
            },
            amount: { type: 'number', format: 'decimal' },
            balance_before: { type: 'number', format: 'decimal' },
            balance_after: { type: 'number', format: 'decimal' },
            reference_id: { type: 'string', format: 'uuid' },
            reference_type: { 
              type: 'string', 
              enum: ['payment', 'booking', 'refund', 'topup', 'admin_adjustment'] 
            },
            description: { type: 'string', maxLength: 255 },
            metadata: { type: 'object' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },

        // ===============================================
        // RESPONSE SCHEMAS
        // ===============================================
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
            message: { type: 'string' }
          }
        },

        ErrorResponse: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            code: { type: 'string' },
            details: { type: 'string' }
          }
        },

        PaginationResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { 
              type: 'array',
              items: { type: 'object' }
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                pages: { type: 'integer' }
              }
            }
          }
        },

        // ===============================================
        // REQUEST SCHEMAS
        // ===============================================
        CreatePaymentRequest: {
          type: 'object',
          required: ['amount', 'method'],
          properties: {
            booking_id: { type: 'string', format: 'uuid' },
            amount: { type: 'number', format: 'decimal', minimum: 0.01 },
            currency: { type: 'string', maxLength: 3, default: 'USD' },
            method: { 
              type: 'string', 
              enum: ['stripe', 'square', 'usdt', 'western_union', 'moneygram', 'ria', 'omt', 'whish', 'bob', 'wallet'] 
            },
            transaction_id: { type: 'string', maxLength: 255 },
            transaction_hash: { type: 'string', maxLength: 255 },
            metadata: { type: 'object' }
          }
        },

        CreateCallSessionRequest: {
          type: 'object',
          required: ['reader_id', 'call_type'],
          properties: {
            reader_id: { type: 'string', format: 'uuid' },
            booking_id: { type: 'string', format: 'uuid' },
            call_type: { type: 'string', enum: ['voice', 'video'] },
            is_emergency: { type: 'boolean', default: false },
            scheduled_duration: { type: 'integer', minimum: 1, maximum: 180 }
          }
        },

        CreateEmergencyCallRequest: {
          type: 'object',
          properties: {
            emergency_type: { type: 'string', default: 'general' },
            priority_level: { type: 'integer', minimum: 1, maximum: 5, default: 3 },
            notes: { type: 'string', maxLength: 1000 }
          }
        },

        CreateAISessionRequest: {
          type: 'object',
          required: ['ai_model_id', 'session_type', 'input_data'],
          properties: {
            reader_id: { type: 'string', format: 'uuid' },
            session_id: { type: 'string', format: 'uuid' },
            ai_model_id: { type: 'string', format: 'uuid' },
            session_type: { 
              type: 'string', 
              enum: ['tarot_reading', 'interpretation', 'guidance', 'learning'] 
            },
            input_data: { 
              type: 'object',
              description: 'Input data for AI processing'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints'
      },
      {
        name: 'Profiles',
        description: 'User profile management'
      },
      {
        name: 'Services',
        description: 'Service management and configuration'
      },
      {
        name: 'Bookings',
        description: 'Booking creation and management'
      },
      {
        name: 'Payments',
        description: 'Payment processing and wallet management'
      },
      {
        name: 'Calls',
        description: 'Voice and video call management'
      },
      {
        name: 'Emergency',
        description: 'Emergency call system'
      },
      {
        name: 'AI',
        description: 'AI-powered features and analytics'
      },
      {
        name: 'Chat',
        description: 'Real-time messaging system'
      },
      {
        name: 'Notifications',
        description: 'Notification management'
      },
      {
        name: 'Admin',
        description: 'Administrative functions'
      },
      {
        name: 'Analytics',
        description: 'Analytics and reporting'
      }
    ]
  },
  apis: [
    './src/api/routes/*.js',
    './src/api/*.js'
  ]
};

const specs = swaggerJsdoc(options);

module.exports = {
  swaggerSpecs: specs,
  swaggerOptions: {
    explorer: true,
    swaggerOptions: {
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
      syntaxHighlight: {
        theme: 'arta'
      }
    }
  }
};

// ===============================================
// EXAMPLE SWAGGER ANNOTATIONS
// ===============================================

/**
 * @swagger
 * /api/payments:
 *   post:
 *     summary: Create a new payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePaymentRequest'
 *           examples:
 *             stripe_payment:
 *               summary: Stripe payment
 *               value:
 *                 booking_id: "123e4567-e89b-12d3-a456-426614174000"
 *                 amount: 25.00
 *                 method: "stripe"
 *                 transaction_id: "pi_1234567890"
 *             wallet_payment:
 *               summary: Wallet payment
 *               value:
 *                 booking_id: "123e4567-e89b-12d3-a456-426614174000"
 *                 amount: 25.00
 *                 method: "wallet"
 *     responses:
 *       201:
 *         description: Payment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               data:
 *                 id: "123e4567-e89b-12d3-a456-426614174000"
 *                 amount: 25.00
 *                 status: "pending"
 *                 method: "stripe"
 *               message: "Payment created successfully"
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/calls/sessions:
 *   post:
 *     summary: Create a new call session
 *     tags: [Calls]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCallSessionRequest'
 *           examples:
 *             voice_call:
 *               summary: Voice call session
 *               value:
 *                 reader_id: "123e4567-e89b-12d3-a456-426614174000"
 *                 call_type: "voice"
 *                 scheduled_duration: 30
 *             emergency_call:
 *               summary: Emergency call session
 *               value:
 *                 reader_id: "123e4567-e89b-12d3-a456-426614174000"
 *                 call_type: "voice"
 *                 is_emergency: true
 *     responses:
 *       201:
 *         description: Call session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Reader unavailable or bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/ai/sessions:
 *   post:
 *     summary: Create a new AI session
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAISessionRequest'
 *           examples:
 *             tarot_reading:
 *               summary: Tarot reading AI session
 *               value:
 *                 ai_model_id: "123e4567-e89b-12d3-a456-426614174000"
 *                 session_type: "tarot_reading"
 *                 input_data:
 *                   cards: ["The Fool", "The Magician", "The High Priestess"]
 *                   question: "What does my future hold?"
 *     responses:
 *       201:
 *         description: AI session completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid AI model or bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */ 