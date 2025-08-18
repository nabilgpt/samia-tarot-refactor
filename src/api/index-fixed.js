// =============================================================================
// SAMIA TAROT API SERVER - PRODUCTION READY
// =============================================================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

// =============================================================================
// ENVIRONMENT SETUP
// =============================================================================

// Load environment variables
require('dotenv').config();

// =============================================================================
// APP INITIALIZATION
// =============================================================================

const app = express();

// =============================================================================
// SECURITY MIDDLEWARE
// =============================================================================

// Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https:", "wss:", "ws:"],
      mediaSrc: ["'self'", "blob:", "data:"],
      objectSrc: ["'none'"],
      baseSrc: ["'self'"]
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://samia-tarot.netlify.app',
      'https://samia-tarot.vercel.app'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// =============================================================================
// REQUEST LOGGING
// =============================================================================

app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// =============================================================================
// EXISTING ROUTES (KEEP EXISTING FUNCTIONALITY)
// =============================================================================

// Import existing route modules
const configurationRoutes = require('./routes/configurationRoutes');

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.API_VERSION || '1.0.0'
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'SAMIA TAROT API',
    version: process.env.API_VERSION || '1.0.0',
    status: 'active',
    description: 'Complete API for SAMIA TAROT platform',
    endpoints: {
      health: '/health',
      api_info: '/api',
      services: '/api/services',
      bookings: '/api/bookings', 
      readers: '/api/readers',
      configuration: '/api/configuration'
    },
    documentation: `${req.protocol}://${req.get('host')}/docs`,
    timestamp: new Date().toISOString()
  });
});

// Favicon endpoint
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// =============================================================================
// ROUTE MOUNTING
// =============================================================================

// Mount configuration routes
app.use('/api/configuration', configurationRoutes);
console.log('✅ Configuration management routes loaded successfully');

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
      '/api/services',
      '/api/bookings',
      '/api/readers'
    ]
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global API Error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Internal server error',
    code: error.code || 'INTERNAL_ERROR',
    ...(isDevelopment && { stack: error.stack })
  });
});

// =============================================================================
// SERVER STARTUP
// =============================================================================

const PORT = process.env.PORT || 5001;

async function startServer() {
  try {
    const { loadAllConfigurations, getCacheStats } = require('./services/configurationLoader.js');
    console.log('🔄 Loading all configurations from database...');
    await loadAllConfigurations();
    console.log('✅ Configuration loading completed');
    console.log('📊 Cache stats:', getCacheStats());
  } catch (error) {
    console.warn('⚠️ Failed to load configurations from database:', error.message);
  }
  
  app.listen(PORT, () => {
    console.log(`🚀 SAMIA TAROT API Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`📖 API info: http://localhost:${PORT}/api`);
    console.log(`👑 Services API: http://localhost:${PORT}/api/services`);
    console.log(`📅 Bookings API: http://localhost:${PORT}/api/bookings`);
    console.log(`👥 Readers API: http://localhost:${PORT}/api/readers`);
  });
}

startServer().catch(console.error);

module.exports = app; 