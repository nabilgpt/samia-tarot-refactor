// =============================================================================
// MAIN API ROUTER - الموجه الرئيسي للـ APIs
// =============================================================================
// Central API management for SAMIA TAROT platform

// Load environment variables first
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const app = express();

// =============================================================================
// SECURITY & MIDDLEWARE SETUP
// =============================================================================

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL, process.env.ADMIN_URL]
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3003'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Global rate limiting
const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later',
    code: 'GLOBAL_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(globalRateLimit);

// =============================================================================
// HEALTH CHECK & MONITORING
// =============================================================================

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    const { supabase } = require('./lib/supabase.js');
    
    const { data, error } = await supabase
      .from('profiles')
      .select('count(*)')
      .limit(1);
    
    const dbStatus = (error || !data) ? 'unhealthy' : 'healthy';
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        api: 'healthy'
      },
      version: process.env.API_VERSION || '1.0.0'
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Service health check failed'
    });
  }
});

// API Info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'SAMIA TAROT API',
    version: process.env.API_VERSION || '1.0.0',
    description: 'Complete API for SAMIA TAROT platform',
    documentation: `${req.protocol}://${req.get('host')}/docs`,
    endpoints: {
      profiles: '/api/profiles',
      bookings: '/api/bookings',
      payments: '/api/payments',
      chat: '/api/chat',
      tarot: '/api/tarot',
      admin: '/api/admin',
      auth: '/api/auth',
      rewards: '/api/rewards'
    },
    status: 'active',
    timestamp: new Date().toISOString()
  });
});

// =============================================================================
// ROOT ROUTE
// =============================================================================

// Root endpoint - Welcome message
app.get('/', (req, res) => {
  res.json({
    message: '🔮 Welcome to SAMIA TAROT API',
    name: 'SAMIA TAROT API',
    version: process.env.API_VERSION || '1.0.0',
    status: 'active',
    description: 'Complete API for SAMIA TAROT platform',
    endpoints: {
      health: '/health',
      api_info: '/api',
      profiles: '/api/profiles',
      bookings: '/api/bookings',
      payments: '/api/payments',
      chat: '/api/chat',
      tarot: '/api/tarot',
      admin: '/api/admin',
      auth: '/api/auth',
      monitor: '/api/monitor',
      notifications: '/api/notifications',
      emergency: '/api/emergency',
      ai_moderation: '/api/ai-moderation',
      support: '/api/support',
      subscriptions: '/api/subscriptions',
      media: '/api/media',
      rewards: '/api/rewards',
      payment_settings: '/api/payment-settings',
      system_secrets: '/api/system-secrets',
      config: '/api/config',
      webhook: '/api/webhook',
      exchange_rates: '/api/exchange-rates'
    },
    documentation: `${req.protocol}://${req.get('host')}/docs`,
    timestamp: new Date().toISOString()
  });
});

// Favicon endpoint
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // No content for favicon
});

// =============================================================================
// API ROUTES
// =============================================================================

// Import API modules
const profilesAPI = require('./profiles');
const bookingsAPI = require('./bookings');
const paymentsAPILegacy = require('./payments');
const { router: chatAPI } = require('./chat');
const tarotAPI = require('./tarot');
const adminAPI = require('./admin');
const authAPI = require('./auth');
const analyticsAPI = require('./routes/analyticsRoutes');

// Import new API modules
const monitorAPI = require('./routes/monitorRoutes');
const notificationAPI = require('./routes/notificationRoutes');
const emergencyAPI = require('./routes/emergencyRoutes');
const aiModerationAPI = require('./routes/aiModerationRoutes');
const supportAPI = require('./routes/supportRoutes');
const subscriptionAPI = require('./routes/subscriptionRoutes');
const mediaAPI = require('./routes/mediaRoutes');
const callAPI = require('./routes/callRoutes');
const aiAPI = require('./routes/aiRoutes');
const paymentsAPI = require('./routes/paymentsRoutes');
const rewardsAPI = require('./routes/rewardsRoutes');
const paymentSettingsAPI = require('./routes/paymentSettingsRoutes');
const systemSecretsAPI = require('./routes/systemSecretsRoutes');
const configAPI = require('./routes/configRoutes');
const webhookAPI = require('./routes/webhookRoutes');
const exchangeRateAPI = require('./routes/exchangeRateRoutes');
const serviceFeedbackAPI = require('./routes/serviceFeedbackRoutes');
const feedbackNotificationAPI = require('./routes/feedbackNotificationRoutes');

// Import additional routes (only the ones we need)
const moroccanTarotRoutes = require('./routes/moroccanTarotRoutes');

// Import payment methods initialization middleware
const { ensurePaymentMethodsMiddleware } = require('./middleware/paymentMethodsInit');

// Apply payment methods initialization middleware for admin routes
app.use('/api/payment-settings', ensurePaymentMethodsMiddleware);

// Mount all API routes (consolidated to avoid duplicates)
app.use('/api/auth', authAPI);
app.use('/api/profiles', profilesAPI);
app.use('/api/bookings', bookingsAPI);
app.use('/api/payments', paymentsAPI);
app.use('/api/chat', chatAPI);
app.use('/api/tarot', tarotAPI);
app.use('/api/admin', adminAPI);
app.use('/api/analytics', analyticsAPI);
app.use('/api/monitor', monitorAPI);
app.use('/api/notifications', notificationAPI);
app.use('/api/emergency', emergencyAPI);
app.use('/api/ai-moderation', aiModerationAPI);
app.use('/api/rewards', rewardsAPI);
app.use('/api/support', supportAPI);
app.use('/api/subscriptions', subscriptionAPI);
app.use('/api/media', mediaAPI);
app.use('/api/calls', callAPI);
app.use('/api/ai', aiAPI);
app.use('/api/payment-settings', paymentSettingsAPI);
app.use('/api/system-secrets', systemSecretsAPI);
app.use('/api/config', configAPI);
app.use('/api/webhook', webhookAPI);
app.use('/api/exchange-rates', exchangeRateAPI);
app.use('/api/service-feedback', serviceFeedbackAPI);
app.use('/api/feedback-notifications', feedbackNotificationAPI);
app.use('/api/moroccan-tarot', moroccanTarotRoutes);

// =============================================================================
// REQUEST LOGGING MIDDLEWARE
// =============================================================================

app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    
    // Log slow requests
    if (duration > 1000) {
      console.warn(`SLOW REQUEST: ${req.method} ${req.path} took ${duration}ms`);
    }
  });
  
  next();
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    code: 'ENDPOINT_NOT_FOUND',
    requested_path: req.originalUrl,
    available_endpoints: [
      '/api/profiles',
      '/api/bookings', 
      '/api/payments',
      '/api/chat',
      '/api/tarot',
      '/api/admin',
      '/api/auth',
      '/api/analytics',
      '/api/monitor',
      '/api/notifications',
      '/api/emergency',
      '/api/ai-moderation',
      '/api/ai',
      '/api/support',
      '/api/subscriptions',
      '/api/media',
      '/api/rewards',
      '/api/payment-settings',
      '/api/system-secrets',
      '/api/config',
      '/api/webhook',
      '/api/service-feedback',
      '/api/feedback-notifications'
    ]
  });
});

// Global error handler
app.use((error, req, res, _next) => {
  console.error('Global API Error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Don't expose stack traces in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Internal server error',
    code: error.code || 'INTERNAL_ERROR',
    ...(isDevelopment && { stack: error.stack })
  });
});

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// =============================================================================
// SERVER STARTUP
// =============================================================================

const PORT = process.env.PORT || 3001;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 SAMIA TAROT API Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`📖 API info: http://localhost:${PORT}/api`);
  });
}

module.exports = app; 
