// ===============================================
// ENVIRONMENT CONFIGURATION
// SAMIA TAROT API Environment Management
// ===============================================

const Joi = require('joi');
const crypto = require('crypto');

// ===============================================
// ENVIRONMENT SCHEMA VALIDATION
// ===============================================

const envSchema = Joi.object({
  // Core Application Settings
  NODE_ENV: Joi.string().valid('development', 'staging', 'production').default('development'),
  PORT: Joi.number().default(5000),
  API_VERSION: Joi.string().default('1.0.0'),
  
  // Frontend URLs
  FRONTEND_URL: Joi.string().uri().required(),
  ADMIN_URL: Joi.string().uri().optional(),
  
  // Database Configuration (Supabase)
  SUPABASE_URL: Joi.string().uri().required(),
  SUPABASE_ANON_KEY: Joi.string().required(),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().required(),
  
  // JWT Configuration
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('24h'),
  
  // Payment Gateway APIs
  // Stripe
  STRIPE_SECRET_KEY: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  STRIPE_PUBLISHABLE_KEY: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  STRIPE_WEBHOOK_SECRET: Joi.string().optional(),
  
  // Square
  SQUARE_ACCESS_TOKEN: Joi.string().optional(),
  SQUARE_APPLICATION_ID: Joi.string().optional(),
  SQUARE_ENVIRONMENT: Joi.string().valid('sandbox', 'production').default('sandbox'),
  SQUARE_WEBHOOK_SIGNATURE_KEY: Joi.string().optional(),
  
  // Cryptocurrency (USDT)
  TRON_API_KEY: Joi.string().optional(),
  TRON_NETWORK: Joi.string().valid('mainnet', 'testnet').default('testnet'),
  USDT_WALLET_ADDRESS: Joi.string().optional(),
  USDT_PRIVATE_KEY: Joi.string().optional(),
  
  // Money Transfer Services
  WESTERN_UNION_API_KEY: Joi.string().optional(),
  WESTERN_UNION_API_SECRET: Joi.string().optional(),
  MONEYGRAM_API_KEY: Joi.string().optional(),
  MONEYGRAM_API_SECRET: Joi.string().optional(),
  RIA_API_KEY: Joi.string().optional(),
  RIA_API_SECRET: Joi.string().optional(),
  
  // Communication Services
  // WebRTC & Video Calling
  AGORA_APP_ID: Joi.string().optional(),
  AGORA_APP_CERTIFICATE: Joi.string().optional(),
  TWILIO_ACCOUNT_SID: Joi.string().optional(),
  TWILIO_AUTH_TOKEN: Joi.string().optional(),
  TWILIO_API_KEY_SID: Joi.string().optional(),
  TWILIO_API_KEY_SECRET: Joi.string().optional(),
  
  // AI Services
  // OpenAI
  OPENAI_API_KEY: Joi.string().optional(),
  OPENAI_ORGANIZATION: Joi.string().optional(),
  OPENAI_MODEL: Joi.string().default('gpt-3.5-turbo'),
  
  // ElevenLabs (Text-to-Speech)
  ELEVENLABS_API_KEY: Joi.string().optional(),
  ELEVENLABS_VOICE_ID: Joi.string().optional(),
  
  // Google AI (Alternative)
  GOOGLE_AI_API_KEY: Joi.string().optional(),
  GOOGLE_PROJECT_ID: Joi.string().optional(),
  
  // Email Services
  SMTP_HOST: Joi.string().optional(),
  SMTP_PORT: Joi.number().default(587),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().optional(),
  SMTP_PASS: Joi.string().optional(),
  
  // SendGrid (Alternative)
  SENDGRID_API_KEY: Joi.string().optional(),
  SENDGRID_FROM_EMAIL: Joi.string().email().optional(),
  
  // SMS Services
  SMS_SERVICE_PROVIDER: Joi.string().valid('twilio', 'vonage').default('twilio'),
  TWILIO_PHONE_NUMBER: Joi.string().optional(),
  VONAGE_API_KEY: Joi.string().optional(),
  VONAGE_API_SECRET: Joi.string().optional(),
  VONAGE_PHONE_NUMBER: Joi.string().optional(),
  
  // Push Notifications
  FCM_SERVER_KEY: Joi.string().optional(),
  FCM_PROJECT_ID: Joi.string().optional(),
  APNS_KEY_ID: Joi.string().optional(),
  APNS_TEAM_ID: Joi.string().optional(),
  APNS_BUNDLE_ID: Joi.string().optional(),
  
  // File Storage
  CLOUDINARY_CLOUD_NAME: Joi.string().optional(),
  CLOUDINARY_API_KEY: Joi.string().optional(),
  CLOUDINARY_API_SECRET: Joi.string().optional(),
  
  // Security & Monitoring
  RATE_LIMIT_WINDOW_MS: Joi.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(1000),
  
  // Logging & Analytics
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  SENTRY_DSN: Joi.string().optional(),
  GOOGLE_ANALYTICS_ID: Joi.string().optional(),
  
  // Redis (for caching and sessions)
  REDIS_URL: Joi.string().optional(),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().optional(),
  
  // Regional Settings
  DEFAULT_CURRENCY: Joi.string().length(3).default('USD'),
  DEFAULT_TIMEZONE: Joi.string().default('UTC'),
  SUPPORTED_CURRENCIES: Joi.string().default('USD,EUR,GBP,AED,SAR'),
  SUPPORTED_LANGUAGES: Joi.string().default('en,ar,fr,es'),
  
  // Feature Flags
  ENABLE_AI_FEATURES: Joi.boolean().default(true),
  ENABLE_VIDEO_CALLS: Joi.boolean().default(true),
  ENABLE_EMERGENCY_CALLS: Joi.boolean().default(true),
  ENABLE_WALLET_SYSTEM: Joi.boolean().default(true),
  ENABLE_CRYPTO_PAYMENTS: Joi.boolean().default(false),
  ENABLE_REAL_TIME_CHAT: Joi.boolean().default(true),
  
  // Admin Configuration
  ADMIN_DEFAULT_EMAIL: Joi.string().email().optional(),
  ADMIN_DEFAULT_PASSWORD: Joi.string().min(8).optional(),
  SUPER_ADMIN_SECRET: Joi.string().optional(),
  
  // Backup & Recovery
  BACKUP_SCHEDULE: Joi.string().default('0 2 * * *'), // Daily at 2 AM
  BACKUP_RETENTION_DAYS: Joi.number().default(30),
  
  // Performance & Scaling
  MAX_FILE_SIZE_MB: Joi.number().default(10),
  MAX_CONCURRENT_CALLS: Joi.number().default(100),
  MAX_DAILY_EMERGENCY_CALLS: Joi.number().default(50),
  
  // Testing
  TEST_USER_EMAIL: Joi.string().email().optional(),
  TEST_USER_PASSWORD: Joi.string().optional(),
  TEST_READER_EMAIL: Joi.string().email().optional(),
  TEST_READER_PASSWORD: Joi.string().optional(),
  
  // AWS Configuration (Legacy - Deprecated)
  AWS_ACCESS_KEY_ID: Joi.string().optional(),
  AWS_SECRET_ACCESS_KEY: Joi.string().optional(),
  AWS_REGION: Joi.string().default('us-east-1'),
  
  // Backblaze B2 Configuration (Primary Storage)
  B2_APPLICATION_KEY_ID: Joi.string().optional(),
  B2_APPLICATION_KEY: Joi.string().optional(),
  B2_BACKUP_BUCKET_NAME: Joi.string().optional(),
  B2_STORAGE_BUCKET_NAME: Joi.string().optional()
}).unknown();

// ===============================================
// VALIDATE AND EXPORT CONFIGURATION
// ===============================================

const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Environment validation error: ${error.message}`);
}

// ===============================================
// STRUCTURED CONFIGURATION EXPORT
// ===============================================

const config = {
  // Core Application
  app: {
    env: envVars.NODE_ENV,
    port: envVars.PORT,
    version: envVars.API_VERSION,
    frontendUrl: envVars.FRONTEND_URL,
    adminUrl: envVars.ADMIN_URL
  },

  // Database
  database: {
    url: envVars.SUPABASE_URL,
    anonKey: envVars.SUPABASE_ANON_KEY,
    serviceRoleKey: envVars.SUPABASE_SERVICE_ROLE_KEY
  },

  // Authentication
  auth: {
    jwtSecret: envVars.JWT_SECRET,
    jwtExpiresIn: envVars.JWT_EXPIRES_IN
  },

  // Payment Gateways
  payments: {
    stripe: {
      secretKey: envVars.STRIPE_SECRET_KEY,
      publishableKey: envVars.STRIPE_PUBLISHABLE_KEY,
      webhookSecret: envVars.STRIPE_WEBHOOK_SECRET,
      enabled: !!(envVars.STRIPE_SECRET_KEY && envVars.STRIPE_PUBLISHABLE_KEY)
    },
    square: {
      accessToken: envVars.SQUARE_ACCESS_TOKEN,
      applicationId: envVars.SQUARE_APPLICATION_ID,
      environment: envVars.SQUARE_ENVIRONMENT,
      webhookSignatureKey: envVars.SQUARE_WEBHOOK_SIGNATURE_KEY,
      enabled: !!(envVars.SQUARE_ACCESS_TOKEN && envVars.SQUARE_APPLICATION_ID)
    },
    crypto: {
      tron: {
        apiKey: envVars.TRON_API_KEY,
        network: envVars.TRON_NETWORK,
        walletAddress: envVars.USDT_WALLET_ADDRESS,
        privateKey: envVars.USDT_PRIVATE_KEY,
        enabled: !!(envVars.TRON_API_KEY && envVars.USDT_WALLET_ADDRESS)
      }
    },
    transfers: {
      westernUnion: {
        apiKey: envVars.WESTERN_UNION_API_KEY,
        apiSecret: envVars.WESTERN_UNION_API_SECRET,
        enabled: !!(envVars.WESTERN_UNION_API_KEY && envVars.WESTERN_UNION_API_SECRET)
      },
      moneygram: {
        apiKey: envVars.MONEYGRAM_API_KEY,
        apiSecret: envVars.MONEYGRAM_API_SECRET,
        enabled: !!(envVars.MONEYGRAM_API_KEY && envVars.MONEYGRAM_API_SECRET)
      },
      ria: {
        apiKey: envVars.RIA_API_KEY,
        apiSecret: envVars.RIA_API_SECRET,
        enabled: !!(envVars.RIA_API_KEY && envVars.RIA_API_SECRET)
      }
    }
  },

  // Communication Services
  communication: {
    webrtc: {
      agora: {
        appId: envVars.AGORA_APP_ID,
        appCertificate: envVars.AGORA_APP_CERTIFICATE,
        enabled: !!(envVars.AGORA_APP_ID && envVars.AGORA_APP_CERTIFICATE)
      },
      twilio: {
        accountSid: envVars.TWILIO_ACCOUNT_SID,
        authToken: envVars.TWILIO_AUTH_TOKEN,
        apiKeySid: envVars.TWILIO_API_KEY_SID,
        apiKeySecret: envVars.TWILIO_API_KEY_SECRET,
        enabled: !!(envVars.TWILIO_ACCOUNT_SID && envVars.TWILIO_AUTH_TOKEN)
      }
    },
    sms: {
      provider: envVars.SMS_SERVICE_PROVIDER,
      twilio: {
        accountSid: envVars.TWILIO_ACCOUNT_SID,
        authToken: envVars.TWILIO_AUTH_TOKEN,
        enabled: !!(envVars.TWILIO_ACCOUNT_SID && envVars.TWILIO_AUTH_TOKEN)
      },
      vonage: {
        apiKey: envVars.VONAGE_API_KEY,
        apiSecret: envVars.VONAGE_API_SECRET,
        enabled: !!(envVars.VONAGE_API_KEY && envVars.VONAGE_API_SECRET)
      }
    }
  },

  // AI Services
  ai: {
    openai: {
      apiKey: envVars.OPENAI_API_KEY,
      organization: envVars.OPENAI_ORGANIZATION,
      model: envVars.OPENAI_MODEL,
      enabled: !!envVars.OPENAI_API_KEY
    },
    elevenlabs: {
      apiKey: envVars.ELEVENLABS_API_KEY,
      voiceId: envVars.ELEVENLABS_VOICE_ID,
      enabled: !!envVars.ELEVENLABS_API_KEY
    },
    google: {
      apiKey: envVars.GOOGLE_AI_API_KEY,
      projectId: envVars.GOOGLE_PROJECT_ID,
      enabled: !!envVars.GOOGLE_AI_API_KEY
    }
  },

  // Email Services
  email: {
    smtp: {
      host: envVars.SMTP_HOST,
      port: envVars.SMTP_PORT,
      secure: envVars.SMTP_SECURE,
      user: envVars.SMTP_USER,
      pass: envVars.SMTP_PASS,
      enabled: !!(envVars.SMTP_HOST && envVars.SMTP_USER && envVars.SMTP_PASS)
    },
    sendgrid: {
      apiKey: envVars.SENDGRID_API_KEY,
      fromEmail: envVars.SENDGRID_FROM_EMAIL,
      enabled: !!(envVars.SENDGRID_API_KEY && envVars.SENDGRID_FROM_EMAIL)
    }
  },

  // Push Notifications
  push: {
    fcm: {
      serverKey: envVars.FCM_SERVER_KEY,
      projectId: envVars.FCM_PROJECT_ID,
      enabled: !!(envVars.FCM_SERVER_KEY && envVars.FCM_PROJECT_ID)
    },
    apns: {
      keyId: envVars.APNS_KEY_ID,
      teamId: envVars.APNS_TEAM_ID,
      bundleId: envVars.APNS_BUNDLE_ID,
      enabled: !!(envVars.APNS_KEY_ID && envVars.APNS_TEAM_ID && envVars.APNS_BUNDLE_ID)
    }
  },

  // File Storage
  storage: {
    cloudinary: {
      cloudName: envVars.CLOUDINARY_CLOUD_NAME,
      apiKey: envVars.CLOUDINARY_API_KEY,
      apiSecret: envVars.CLOUDINARY_API_SECRET,
      enabled: !!(envVars.CLOUDINARY_CLOUD_NAME && envVars.CLOUDINARY_API_KEY && envVars.CLOUDINARY_API_SECRET)
    },
    backblazeB2: {
      applicationKeyId: envVars.B2_APPLICATION_KEY_ID,
      applicationKey: envVars.B2_APPLICATION_KEY,
      backupBucketName: envVars.B2_BACKUP_BUCKET_NAME,
      storageBucketName: envVars.B2_STORAGE_BUCKET_NAME,
      enabled: !!(envVars.B2_APPLICATION_KEY_ID && envVars.B2_APPLICATION_KEY && envVars.B2_BACKUP_BUCKET_NAME)
    }
  },

  // Redis
  redis: {
    url: envVars.REDIS_URL,
    host: envVars.REDIS_HOST,
    port: envVars.REDIS_PORT,
    password: envVars.REDIS_PASSWORD,
    enabled: !!(envVars.REDIS_URL || envVars.REDIS_HOST)
  },

  // Security
  security: {
    rateLimit: {
      windowMs: envVars.RATE_LIMIT_WINDOW_MS,
      maxRequests: envVars.RATE_LIMIT_MAX_REQUESTS
    }
  },

  // Logging & Monitoring
  logging: {
    level: envVars.LOG_LEVEL,
    sentryDsn: envVars.SENTRY_DSN,
    googleAnalyticsId: envVars.GOOGLE_ANALYTICS_ID
  },

  // Regional Settings
  regional: {
    defaultCurrency: envVars.DEFAULT_CURRENCY,
    defaultTimezone: envVars.DEFAULT_TIMEZONE,
    supportedCurrencies: envVars.SUPPORTED_CURRENCIES.split(','),
    supportedLanguages: envVars.SUPPORTED_LANGUAGES.split(',')
  },

  // Feature Flags
  features: {
    aiFeatures: envVars.ENABLE_AI_FEATURES,
    videoCalls: envVars.ENABLE_VIDEO_CALLS,
    emergencyCalls: envVars.ENABLE_EMERGENCY_CALLS,
    walletSystem: envVars.ENABLE_WALLET_SYSTEM,
    cryptoPayments: envVars.ENABLE_CRYPTO_PAYMENTS,
    realTimeChat: envVars.ENABLE_REAL_TIME_CHAT
  },

  // Admin
  admin: {
    defaultEmail: envVars.ADMIN_DEFAULT_EMAIL,
    defaultPassword: envVars.ADMIN_DEFAULT_PASSWORD,
    superAdminSecret: envVars.SUPER_ADMIN_SECRET
  },

  // Performance Limits
  limits: {
    maxFileSizeMB: envVars.MAX_FILE_SIZE_MB,
    maxConcurrentCalls: envVars.MAX_CONCURRENT_CALLS,
    maxDailyEmergencyCalls: envVars.MAX_DAILY_EMERGENCY_CALLS
  },

  // Testing
  testing: {
    userEmail: envVars.TEST_USER_EMAIL,
    userPassword: envVars.TEST_USER_PASSWORD,
    readerEmail: envVars.TEST_READER_EMAIL,
    readerPassword: envVars.TEST_READER_PASSWORD
  },

  // Backblaze B2 Configuration (Primary Storage)
  b2: {
    applicationKeyId: envVars.B2_APPLICATION_KEY_ID,
    applicationKey: envVars.B2_APPLICATION_KEY,
    backupBucketName: envVars.B2_BACKUP_BUCKET_NAME,
    storageBucketName: envVars.B2_STORAGE_BUCKET_NAME
  }
};

// ===============================================
// CONFIGURATION VALIDATION FUNCTIONS
// ===============================================

const validateServiceConfig = (serviceName, serviceConfig) => {
  const missing = [];
  
  Object.entries(serviceConfig).forEach(([key, value]) => {
    if (key !== 'enabled' && !value && serviceConfig.enabled) {
      missing.push(`${serviceName}.${key}`);
    }
  });
  
  return missing;
};

const getConfigurationStatus = () => {
  const status = {
    core: {
      database: !!config.database.url,
      auth: !!config.auth.jwtSecret,
      frontend: !!config.app.frontendUrl
    },
    payments: {
      stripe: config.payments.stripe.enabled,
      square: config.payments.square.enabled,
      crypto: config.payments.crypto.tron.enabled
    },
    communication: {
      webrtc: config.communication.webrtc.agora.enabled || config.communication.webrtc.twilio.enabled,
      sms: config.communication.sms.twilio.enabled || config.communication.sms.vonage.enabled
    },
    ai: {
      openai: config.ai.openai.enabled,
      elevenlabs: config.ai.elevenlabs.enabled
    },
    email: {
      smtp: config.email.smtp.enabled,
      sendgrid: config.email.sendgrid.enabled
    },
    storage: {
      cloudinary: config.storage.cloudinary.enabled,
      backblazeB2: config.storage.backblazeB2.enabled
    }
  };

  const warnings = [];
  
  // Check critical services
  if (!status.core.database) warnings.push('Database configuration missing');
  if (!status.core.auth) warnings.push('JWT secret not configured');
  if (!status.payments.stripe && !status.payments.square) warnings.push('No payment gateway configured');
  if (!status.communication.webrtc && config.features.videoCalls) warnings.push('Video calling enabled but no WebRTC service configured');
  if (!status.ai.openai && config.features.aiFeatures) warnings.push('AI features enabled but no AI service configured');

  return { status, warnings };
};

// ===============================================
// EXPORT CONFIGURATION
// ===============================================

module.exports = {
    ...config,
    validateServiceConfig,
    getConfigurationStatus,
    hasEmailService: () => config.email.smtp.enabled || config.email.sendgrid.enabled,
    hasPaymentProcessing: () => config.payments.stripe.enabled || config.payments.square.enabled,
    hasSMSService: () => config.communication.sms.twilio.enabled || config.communication.sms.vonage.enabled,
    hasFileStorage: () => config.storage.backblazeB2.enabled || config.storage.cloudinary.enabled,
    hasAIServices: () => config.ai.openai.enabled || config.ai.elevenlabs.enabled
}; 