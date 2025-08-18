// =============================================================================
// MAIN API ROUTER - الموجه الرئيسي للـ APIs
// =============================================================================
// Central API management for SAMIA TAROT platform

// Load environment variables first
require('dotenv').config();

// ============================================================================
// 🔒 SECURE ENVIRONMENT VALIDATION
// ============================================================================
const { validateEnvironment, getConfigSummary } = require('./config/secureEnvironment.js');

// Validate environment on startup - CRITICAL SECURITY CHECK
try {
    const envValidation = validateEnvironment();
    console.log('🔒 Environment validation result:', envValidation);
    console.log('🔒 Configuration summary:', getConfigSummary());
} catch (error) {
    console.error('🚨 CRITICAL: Environment validation failed!');
    console.error('🚨 Server cannot start without proper bootstrap credentials.');
    console.error('🚨 Error:', error.message);
    process.exit(1);
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const configurationRoutes = require('./routes/configurationRoutes.js');

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

// Static file serving for uploads with complete CORS and HTTP 206 support
// NOTE: Zodiac audio files are now served from Supabase Storage only (no local serving)
app.use('/uploads', express.static('./uploads', {
  setHeaders: (res, path) => {
    // CRITICAL: Add CORS headers for audio streaming
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
    
    // CRITICAL: Expose headers required for audio streaming and range requests
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Encoding, Content-Length');
    
    // Enable range requests for audio streaming (HTTP 206 Partial Content)
    res.setHeader('Accept-Ranges', 'bytes');
    
    // Set proper content type for audio files
    if (path.endsWith('.mp3')) {
      res.setHeader('Content-Type', 'audio/mpeg');
    } else if (path.endsWith('.wav')) {
      res.setHeader('Content-Type', 'audio/wav');
    }
    
    // PRODUCTION POLICY: Zodiac audio files are served from Supabase Storage only
    // Block access to zodiac audio files (they should not exist locally anymore)
    if (path.includes('zodiac-audio')) {
      res.status(404).json({
        error: 'Zodiac audio files are served from Supabase Storage only',
        policy: 'PRODUCTION_CLOUD_ONLY'
      });
      return;
    }
  },
  // Enable dotfiles access if needed
  dotfiles: 'ignore',
  // Set ETag for better caching
  etag: true,
  // Enable last-modified header
  lastModified: true
}));

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
    const { supabase } = await import('./lib/supabase.js');
    
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
      rewards: '/api/rewards',
      configuration: '/api/configuration',
      'daily-zodiac': '/api/daily-zodiac'
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
      exchange_rates: '/api/exchange-rates',
      configuration: '/api/configuration',
      'daily-zodiac': '/api/daily-zodiac'
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
// CONFIGURATION ROUTES - MOUNT BEFORE 404 HANDLER
// =============================================================================

// Mount configuration routes
app.use('/api/configuration', configurationRoutes);
console.log('✅ Configuration management routes loaded successfully');

// Mount daily zodiac routes
const dailyZodiacRoutes = require('./routes/dailyZodiacRoutes.js');
app.use('/api/daily-zodiac', dailyZodiacRoutes);
console.log('✅ Daily Zodiac (Abraj) routes loaded successfully');

// Mount admin routes - NOW ENABLED (ES MODULE CONVERSION COMPLETED)
const adminRoutes = require('./routes/adminRoutes.js');
app.use('/api/admin', adminRoutes);
console.log('✅ Admin management routes loaded successfully');

// Mount VIP/Regular Services System routes
const servicesRoutes = require('./routes/servicesRoutes.js');
const bookingsRoutes = require('./routes/bookingsRoutes.js');
const readersRoutes = require('./routes/readersRoutes.js');

app.use('/api/services', servicesRoutes);
console.log('✅ Services management routes loaded successfully');

app.use('/api/bookings', bookingsRoutes);
console.log('✅ Bookings management routes loaded successfully');

app.use('/api/readers', readersRoutes);
console.log('✅ Readers management routes loaded successfully');

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
      '/health',
      '/api',
      '/api/configuration',
      '/api/daily-zodiac',
      '/api/admin'
    ]
  });
});

// Global error handler
app.use((error, req, res, /* _next */) => {
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

const PORT = process.env.PORT || 5001;

// Start the server and load configurations
async function startServer() {
  // Load other configurations
  try {
    const { loadAllConfigurations, getCacheStats } = require('./services/configurationLoader.js');
    console.log('🔄 Loading dynamic configurations from database...');
    await loadAllConfigurations();
    console.log('✅ Configuration loading completed');
    console.log('📊 Cache stats:', getCacheStats());
  } catch (error) {
    console.warn('⚠️ Failed to load configurations from database:', error.message);
    console.warn('⚠️ Server will continue with bootstrap credentials only');
  }

  // Import payment methods initialization middleware
  try {
    const { ensurePaymentMethodsMiddleware } = require('./middleware/paymentMethodsInit.js');
    console.log('✅ Payment methods middleware loaded successfully');
  } catch (error) {
    console.warn('⚠️ Payment methods middleware not found:', error.message);
  }
  
  app.listen(PORT, async () => {
    console.log(`🚀 SAMIA TAROT API Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`📖 API info: http://localhost:${PORT}/api`);
    console.log(`⚙️ Configuration API: http://localhost:${PORT}/api/configuration`);
    console.log(`🔮 Daily Zodiac API: http://localhost:${PORT}/api/daily-zodiac`);
    
    // Start the zodiac scheduler
    try {
      const { zodiacScheduler } = require('./services/zodiacScheduler.js');
      zodiacScheduler.start();
      console.log('✅ Daily Zodiac scheduler started successfully');
    } catch (error) {
      console.warn('⚠️ Failed to start zodiac scheduler:', error.message);
    }
  });
}

// Start the server
startServer().catch(console.error);

module.exports = app; 
