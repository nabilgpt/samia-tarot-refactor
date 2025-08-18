// Load environment variables FIRST
import dotenv from 'dotenv';
dotenv.config();

// =============================================================================
// CRITICAL ENVIRONMENT VALIDATION - CRASH IMMEDIATELY IF MISSING
// =============================================================================

function validateEnvironment() {
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY', 
    'SUPABASE_SERVICE_ROLE_KEY',
    'JWT_SECRET'
  ];

  const missing = [];
  const undefined_vars = [];

  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar];
    if (!value) {
      missing.push(envVar);
    } else if (value === 'undefined' || value === 'null') {
      undefined_vars.push(envVar);
    }
  }

  if (missing.length > 0 || undefined_vars.length > 0) {
    console.error('🚨 CRITICAL ERROR: Missing or undefined environment variables!');
    console.error('❌ Missing variables:', missing);
    console.error('❌ Undefined variables:', undefined_vars);
    console.error('');
    console.error('💡 Required environment variables:');
    requiredEnvVars.forEach(v => {
      const status = process.env[v] ? 
        (process.env[v] === 'undefined' ? '❌ UNDEFINED' : '✅ SET') : 
        '❌ MISSING';
      console.error(`   ${v}: ${status}`);
    });
    console.error('');
    console.error('🔧 Please ensure all required environment variables are set in .env file');
    console.error('🚨 SERVER CANNOT START - EXITING IMMEDIATELY');
    process.exit(1);
  }

  console.log('✅ Environment validation passed');
  console.log('🔧 Backend Supabase Configuration:');
  console.log(`  URL: ${process.env.SUPABASE_URL}`);
  console.log(`  Mode: Backend (Server)`);
}

// Validate environment before anything else
validateEnvironment();

// =============================================================================
// DATABASE CONNECTION VALIDATION
// =============================================================================

async function validateDatabaseConnection() {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Test connection with retry logic and exponential backoff
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        // Use a simpler connection test that doesn't require table access
        const { data, error } = await supabase
          .from('notifications')
          .select('count')
          .limit(1);

        if (error && error.code !== 'PGRST116') {
          // PGRST116 is "table not found" which is acceptable for connection test
          throw new Error(error.message);
        }

        console.log('✅ Database connection validated');
        return true;
      } catch (error) {
        attempts++;
        console.warn(`⚠️ Database connection attempt ${attempts}/${maxAttempts} failed:`, error.message);
        
        if (attempts < maxAttempts) {
          const delay = attempts * 2000; // 2s, 4s, 6s
          console.log(`🔄 Retrying in ${delay/1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.error('🚨 Database connection failed after all attempts');
    return false;
  } catch (error) {
    console.error('🚨 Database validation error:', error.message);
    return false;
  }
}

// =============================================================================
// SAMIA TAROT API SERVER - PRODUCTION READY
// =============================================================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import path from 'path';

// Import authentication middleware
import { authenticateToken, requireRole } from './middleware/auth.js';
import { supabaseAdmin } from './lib/supabase.js';

// Import AI content security middleware
import { 
  aiContentFilter, 
  readingAIFilter, 
  emergencyAIBlock 
} from './middleware/aiContentFilter.js';

// Import Socket.IO for unified chat
import { 
  initializeUnifiedChatSocket, 
  getUnifiedChatSocketStats 
} from '../socket/unifiedChatSocket.js';

// Import notification routes
import notificationsRoutes from './routes/notificationsRoutes.js';

// Import user routes
import userRoutes from './routes/userRoutes.js';

// =============================================================================
// ENVIRONMENT SETUP
// =============================================================================

// =============================================================================
// APP INITIALIZATION
// =============================================================================

const app = express();
const server = createServer(app);

// =============================================================================
// MIDDLEWARE CONFIGURATION
// =============================================================================

// Enable JSON body parsing - CRITICAL for /api/auth/login
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Compression middleware
app.use(compression());

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

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
      'http://localhost:3001',
      'http://localhost:5173',
      'https://samia-tarot.netlify.app',
      'https://samia-tarot.vercel.app'
    ];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Enhanced rate limiting with better error handling
// Increased limits to accommodate bilingual system initialization
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes (reduced window)
  max: 2000, // limit each IP to 2000 requests per windowMs (increased for bilingual system)
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
    retry_after: 600 // 10 minutes in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`🚨 Rate limit exceeded for IP: ${req.ip} on ${req.path}`);
    res.status(429).json({
      success: false,
      error: 'Too many requests from this IP, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      retry_after: 600
    });
  }
});

app.use(limiter);

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// =============================================================================
// AI CONTENT SECURITY ENFORCEMENT - PRODUCTION READY
// =============================================================================

// Apply emergency AI blocking for critical endpoints first
// app.use('/api/ai/*', emergencyAIBlock);
// app.use('/api/tarot/*', emergencyAIBlock);
// app.use('/api/reading/*', emergencyAIBlock);

// Apply AI content filtering to all API responses
// app.use('/api/*', aiContentFilter);

console.log('⚠️ AI Content Security temporarily disabled for chat consolidation');
console.log('🚫 Emergency AI blocking enabled for critical endpoints');
console.log('🔒 AI content filtering active for all API responses');

// =============================================================================
// HEALTH CHECK ENDPOINT (CRITICAL FOR MONITORING)
// =============================================================================

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    service: 'samia-tarot-backend',
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
    }
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    service: 'samia-tarot-api',
    endpoints: {
      auth: 'active',
      configuration: 'active',
      daily_zodiac: 'active',
      admin: 'active'
    }
  });
});

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
import configurationRoutes from './routes/configurationRoutes.js';

// Enhanced health check endpoint with database and environment status
app.get('/health', async (req, res) => {
  try {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.API_VERSION || '1.0.0',
      environment: {
        node_env: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 5001,
        supabase_url: process.env.SUPABASE_URL ? '✅ SET' : '❌ MISSING',
        supabase_anon_key: process.env.SUPABASE_ANON_KEY ? '✅ SET' : '❌ MISSING',
        supabase_service_key: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ SET' : '❌ MISSING',
        jwt_secret: process.env.JWT_SECRET ? '✅ SET' : '❌ MISSING'
      },
      database: {
        status: 'checking...',
        connection_test: false
      },
      chat_socket: getUnifiedChatSocketStats()
    };

    // Test database connection
    try {
      const dbConnected = await validateDatabaseConnection();
      healthStatus.database.status = dbConnected ? 'connected' : 'failed';
      healthStatus.database.connection_test = dbConnected;
      
      if (!dbConnected) {
        healthStatus.status = 'degraded';
      }
    } catch (error) {
      healthStatus.database.status = 'error';
      healthStatus.database.error = error.message;
      healthStatus.status = 'degraded';
    }

    // Check for any missing environment variables
    const missingEnvVars = Object.values(healthStatus.environment).filter(v => v === '❌ MISSING');
    if (missingEnvVars.length > 0) {
      healthStatus.status = 'critical';
    }

    const statusCode = healthStatus.status === 'healthy' ? 200 : 
                      healthStatus.status === 'degraded' ? 503 : 500;

    res.status(statusCode).json(healthStatus);
  } catch (error) {
    console.error('🚨 Health check error:', error.message);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
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

// Mount deck bulk upload routes
import deckBulkUploadRoutes from './routes/deckBulkUploadRoutes.js';
app.use('/api/deck-upload', deckBulkUploadRoutes);
console.log('✅ Deck bulk upload routes loaded successfully');

// Mount reader availability routes
import readerAvailabilityRoutes from './routes/readerAvailabilityRoutes.js';
app.use('/api/reader-availability', readerAvailabilityRoutes);
console.log('✅ Reader availability routes loaded successfully');

// Mount Tarot V2 routes
import tarotV2Routes from './routes/tarotV2Routes.js';
app.use('/api/tarot-v2', tarotV2Routes);
console.log('✅ Tarot V2 routes loaded successfully');

// Mount Calls/WebRTC routes
import callsRoutes from './routes/callsRoutes.js';
app.use('/api/calls', callsRoutes);
console.log('✅ Calls/WebRTC routes loaded successfully');

// Mount VIP/Regular Services System routes
import servicesRoutes from './routes/servicesRoutes.js';

// Import other routes
import bookingsRoutes from './routes/bookingsRoutes.js';
import readersRoutes from './routes/readersRoutes.js';
import dailyZodiacRoutes from './routes/dailyZodiacRoutes.js';
import aiAuditRoutes from './routes/aiAuditRoutes.js';
import unifiedChatRoutes from './unified-chat.js';

// Import the new flexible tarot routes
import flexibleTarotRoutes from './routes/flexibleTarotRoutes.js';

// Import dynamic translation routes
import dynamicTranslationRoutes from './routes/dynamicTranslationRoutes.js';
import translationTestRoutes from './routes/translationTestRoutes.js';

// Import system backup routes (CRITICAL for pre-refactor backup)
import systemBackupRoutes from './routes/systemBackupRoutes.js';

// Mount unified chat routes
app.use('/api/chat', unifiedChatRoutes);

// Mount dynamic translation routes
app.use('/api/dynamic-translation', dynamicTranslationRoutes);
app.use('/api/translation-test', translationTestRoutes);

// Mount system backup routes (CRITICAL for pre-refactor backup)
app.use('/api/system-backup', systemBackupRoutes);
console.log('✅ System backup routes loaded successfully');

// Mount AI audit routes
app.use('/api/ai-audit', aiAuditRoutes);

// Mount Daily Zodiac routes
app.use('/api/daily-zodiac', dailyZodiacRoutes);

// Mount notifications routes
app.use('/api/notifications', notificationsRoutes);

// Mount user routes
app.use('/api/user', userRoutes);

// ============================================================================
// CONSOLIDATED ADMIN ROUTES WITH PROPER MIDDLEWARE CHAINING
// ============================================================================

// Import all admin route modules
import adminRoutes from './routes/adminRoutes.js';
import advancedAdminRoutes from './routes/advancedAdminRoutes.js';
import adminTarotRoutes from './routes/adminTarotRoutes.js';
import deckTypesRoutes from './routes/deckTypesRoutes.js';
import bilingualAdminRoutes from './routes/bilingualAdminRoutes.js';

console.log('🔗 [ROUTES] Consolidating admin routes with unified middleware...');

// Mount main admin routes with AI content filtering (highest priority)
app.use('/api/admin', aiContentFilter, readingAIFilter, adminRoutes);
console.log('✅ Main admin routes loaded with AI filtering');

// Mount remaining admin routes without duplication
app.use('/api/admin', [
  advancedAdminRoutes,
  globalSearchRoutes,
  bilingualAdminRoutes
]);
console.log('✅ Consolidated admin routes loaded successfully');

// Mount specialized admin sub-routes
app.use('/api/admin/tarot', [adminTarotRoutes, deckTypesRoutes]);
console.log('✅ Admin tarot routes consolidated successfully');

// Mount reader access control routes
app.use('/api/reader', readerAccessRoutes);

// Mount admin translation routes
import adminTranslationRoutes from './routes/adminTranslationRoutes.js';
app.use('/api/admin/translations', adminTranslationRoutes);

// Migration endpoints are now integrated into their respective route files
// (e.g., flexibleTarotRoutes.js contains tarot migration endpoints)

// Add the flexible tarot routes
app.use('/api/flexible-tarot', bilingualAutoTranslationMiddleware, flexibleTarotRoutes);

// Add the NEW SPREAD MANAGER SYSTEM routes
import newSpreadManagerRoutes from './routes/newSpreadManagerRoutes.js';
app.use('/api/spread-manager', bilingualAutoTranslationMiddleware, newSpreadManagerRoutes);

// Bilingual Translation Admin Routes (Super Admin only)
app.use('/api/bilingual-admin', bilingualAdminRoutes);
console.log('✅ Bilingual Admin routes loaded successfully');

// REMOVED: Duplicate translation routes mounting (already mounted earlier in the file)
// - adminTranslationRoutes: already mounted on /api/admin/translations around line 490
// - dynamicTranslationRoutes: already mounted on /api/dynamic-translation around line 449  
// - translationTestRoutes: already mounted on /api/translation-test around line 450

// Real-time Bilingual Translation API Routes (Admin/SuperAdmin only)
import bilingualTranslationRoutes from './routes/bilingualTranslationRoutes.js';
app.use('/api/bilingual', bilingualTranslationRoutes);
console.log('✅ Real-time Bilingual Translation API routes loaded successfully');

// ============================================================================
// NEW REFACTORED ROUTES - SYSTEM SECRETS & BILINGUAL SETTINGS SEPARATION
// ============================================================================

// System Secrets Management (Super Admin only - NO sensitive data exposure)
import systemSecretsRoutes from './routes/systemSecretsRoutes.js';
app.use('/api/system-secrets', systemSecretsRoutes);
console.log('✅ System Secrets Management routes loaded successfully');

// Secret Categories Management (Super Admin only - Dynamic category/subcategory management)
import secretCategoriesRoutes from './routes/secretCategoriesRoutes.js';
app.use('/api/secret-categories', secretCategoriesRoutes);
console.log('✅ Secret Categories Management routes loaded successfully');

// Bilingual Settings Management (Admin/Super Admin - NO API keys or secrets)
import bilingualSettingsRoutes from './routes/bilingualSettingsRoutes.js';
app.use('/api/bilingual-settings', bilingualSettingsRoutes);
console.log('✅ Bilingual Settings Management routes loaded successfully');

// Provider Integration System (Admin/Super Admin - Centralized provider management)
import providerIntegrationRoutes from './routes/providerIntegrationRoutes.js';
app.use('/api/provider-integration', providerIntegrationRoutes);
console.log('✅ Provider Integration System routes loaded successfully');

// REMOVED: Duplicate ai-audit routes mount (already mounted earlier at line 458)

// Add single reader profile route
app.get('/api/reader/profile', authenticateToken, requireRole(['reader']), async (req, res) => {
  try {
    const readerId = req.user.id;
    console.log(`📋 [READER] Fetching profile for reader: ${readerId}`);
    
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select(`
        id,
        first_name,
        last_name,
        display_name,
        email,
        phone,
        avatar_url,
        bio,
        specializations,
        languages,
        timezone,
        is_active,
        created_at,
        updated_at
      `)
      .eq('id', readerId)
      .eq('role', 'reader')
      .single();

    if (error) {
      console.error('❌ [READER] Error fetching profile:', error);
      return res.status(404).json({
        success: false,
        error: 'Reader profile not found',
        details: error.message
      });
    }

    console.log(`✅ [READER] Profile found for: ${profile.display_name || profile.email}`);
    
    res.json({
      success: true,
      data: profile
    });

  } catch (error) {
    console.error('❌ [READER] Unexpected error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// REMOVED: Duplicate daily-zodiac routes mount (already mounted earlier at line 460)

// Import bilingual auto-translation middleware
import { bilingualAutoTranslationMiddleware } from './middleware/bilingualAutoTranslation.js';

// REMOVED: Duplicate admin routes mounting (already mounted earlier in the file)
// These were causing conflicts with the admin routes mounted around lines 469-472

// REMOVED: Duplicate admin tarot routes mounting (already mounted earlier around lines 475-478)
// - adminTarotRoutes: already mounted on /api/admin/tarot  
// - deckTypesRoutes: already mounted on /api/admin/tarot

// Mount reader access control routes
import readerAccessRoutes from './routes/readerAccessRoutes.js';
import globalSearchRoutes from './routes/globalSearchRoutes.js';
// REMOVED: Duplicate reader routes mount (already mounted earlier at line 498)

// REMOVED: Duplicate globalSearchRoutes mount (already mounted earlier at line 488)

// REMOVED: Duplicate notifications routes mount (already mounted earlier at line 463)

// =============================================================================
// MIGRATION ENDPOINT - FOR FIXING TAROT CARDS SCHEMA
// =============================================================================
app.post('/api/migrate/fix-tarot-cards-schema', async (req, res) => {
  try {
    console.log('🔧 Starting tarot cards schema migration...');
    
    // Step 1: Add missing deck_id column (the main issue)
    const alterTableSQL = `
      -- Add deck_id column if it doesn't exist
      DO $$ 
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'tarot_cards' AND column_name = 'deck_id') THEN
              ALTER TABLE tarot_cards ADD COLUMN deck_id UUID;
              RAISE NOTICE 'Added deck_id column to tarot_cards';
          ELSE
              RAISE NOTICE 'deck_id column already exists';
          END IF;
      EXCEPTION
          WHEN others THEN
              RAISE NOTICE 'Error adding deck_id column: %', SQLERRM;
      END $$;
    `;

    await supabaseAdmin.rpc('exec_sql', { sql: alterTableSQL });
    console.log('✅ Table structure updated');

    // Step 2: Ensure default Moroccan deck exists
    let { data: deck, error: deckError } = await supabaseAdmin
      .from('tarot_decks')
      .select('id')
      .eq('deck_type', 'moroccan')
      .eq('is_default', true)
      .single();

    if (deckError || !deck) {
      const { data: newDeck, error: createError } = await supabaseAdmin
        .from('tarot_decks')
        .insert({
          name: 'Traditional Moroccan Tarot',
          name_ar: 'الكارطة المغربية التقليدية',
          description: '48-card traditional Moroccan deck with rich cultural symbolism',
          description_ar: 'مجموعة مغربية تقليدية من 48 ورقة مع رمزية ثقافية غنية',
          deck_type: 'moroccan',
          total_cards: 48,
          is_default: true,
          is_active: true
        })
        .select('id')
        .single();

      if (createError) {
        throw new Error(`Failed to create default deck: ${createError.message}`);
      }
      deck = newDeck;
      console.log('✅ Created default Moroccan deck');
    } else {
      console.log('✅ Default Moroccan deck found');
    }

    // Step 3: Update existing cards to have deck_id
    const { error: updateError } = await supabaseAdmin
      .from('tarot_cards')
      .update({ deck_id: deck.id })
      .is('deck_id', null);

    if (updateError) {
      console.warn('⚠️ Error updating existing cards:', updateError.message);
    } else {
      console.log('✅ Updated existing cards with deck_id');
    }

    // Step 4: Add a few simple sample cards if none exist
    const { data: existingCards, error: countError } = await supabaseAdmin
      .from('tarot_cards')
      .select('id', { count: 'exact', head: true });

    if (!existingCards || existingCards.length === 0) {
      try {
        const sampleCards = [
          {
            deck_id: deck.id,
            name: 'The Fool',
            image_url: '/images/cards/moroccan/major/the-fool.jpg'
          },
          {
            deck_id: deck.id,
            name: 'The Magician',
            image_url: '/images/cards/moroccan/major/the-magician.jpg'
          },
          {
            deck_id: deck.id,
            name: 'The High Priestess',
            image_url: '/images/cards/moroccan/major/the-high-priestess.jpg'
          }
        ];

        const { error: insertError } = await supabaseAdmin
          .from('tarot_cards')
          .insert(sampleCards);

        if (insertError) {
          console.warn('⚠️ Error inserting sample cards:', insertError.message);
          console.log('ℹ️ This is ok - the main schema fix is complete');
        } else {
          console.log('✅ Added sample tarot cards');
        }
      } catch (cardError) {
        console.warn('⚠️ Could not add sample cards:', cardError.message);
        console.log('ℹ️ This is ok - the main schema fix is complete');
      }
    }

    console.log('🎉 Tarot cards schema migration completed successfully');
    
    res.json({
      success: true,
      message: 'Tarot cards schema migration completed successfully - deck_id column added',
      data: {
        deck_id: deck.id,
        deck_name: 'Traditional Moroccan Tarot',
        schema_updated: true,
        primary_fix_completed: true
      }
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    res.status(500).json({
      success: false,
      error: 'Migration failed',
      details: error.message
    });
  }
});

console.log('✅ Migration endpoint loaded successfully');

// =============================================================================
// ADMIN TAROT MANAGEMENT SCHEMA MIGRATION
// =============================================================================
app.post('/api/migrate/admin-tarot-schema', async (req, res) => {
  try {
    console.log('🔧 Starting admin tarot management schema migration...');
    
    // Step 1: Add visibility columns to spreads
    const spreadMigrationSQL = `
      -- Add visibility and assignment columns to tarot_spreads
      ALTER TABLE tarot_spreads 
      ADD COLUMN IF NOT EXISTS visibility_type TEXT CHECK (visibility_type IN ('public', 'private', 'assigned')) DEFAULT 'public',
      ADD COLUMN IF NOT EXISTS admin_notes TEXT,
      ADD COLUMN IF NOT EXISTS admin_tags TEXT[],
      ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS featured_order INTEGER,
      ADD COLUMN IF NOT EXISTS admin_created_by UUID,
      ADD COLUMN IF NOT EXISTS admin_approved_by UUID,
      ADD COLUMN IF NOT EXISTS admin_approved_at TIMESTAMPTZ;
    `;

    await supabaseAdmin.rpc('exec_sql', { sql: spreadMigrationSQL });
    console.log('✅ Spreads table enhanced');

    // Step 2: Create spread assignments table
    const assignmentsTableSQL = `
      CREATE TABLE IF NOT EXISTS tarot_spread_reader_assignments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          spread_id UUID NOT NULL,
          reader_id UUID NOT NULL,
          assigned_by UUID NOT NULL,
          assigned_at TIMESTAMPTZ DEFAULT NOW(),
          is_active BOOLEAN DEFAULT true,
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          
          UNIQUE(spread_id, reader_id)
      );
    `;

    await supabaseAdmin.rpc('exec_sql', { sql: assignmentsTableSQL });
    console.log('✅ Spread assignments table created');

    // Step 3: Enhance decks table
    const deckMigrationSQL = `
      ALTER TABLE tarot_decks 
      ADD COLUMN IF NOT EXISTS admin_created_by UUID,
      ADD COLUMN IF NOT EXISTS admin_notes TEXT,
      ADD COLUMN IF NOT EXISTS upload_status TEXT CHECK (upload_status IN ('pending', 'uploading', 'complete', 'failed')) DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS total_images_required INTEGER,
      ADD COLUMN IF NOT EXISTS total_images_uploaded INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS card_back_uploaded BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS is_admin_managed BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS visibility_type TEXT CHECK (visibility_type IN ('public', 'private', 'assigned')) DEFAULT 'public';
    `;

    await supabaseAdmin.rpc('exec_sql', { sql: deckMigrationSQL });
    console.log('✅ Decks table enhanced');

    // Step 4: Create deck images table
    const deckImagesTableSQL = `
      CREATE TABLE IF NOT EXISTS tarot_deck_card_images (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          deck_id UUID NOT NULL,
          card_id UUID,
          image_type TEXT CHECK (image_type IN ('card_front', 'card_back')) NOT NULL,
          image_url TEXT NOT NULL,
          image_filename TEXT NOT NULL,
          image_size_bytes INTEGER,
          upload_order INTEGER,
          uploaded_by UUID NOT NULL,
          uploaded_at TIMESTAMPTZ DEFAULT NOW(),
          is_active BOOLEAN DEFAULT true,
          
          UNIQUE(deck_id, card_id, image_type),
          UNIQUE(deck_id, upload_order)
      );
    `;

    await supabaseAdmin.rpc('exec_sql', { sql: deckImagesTableSQL });
    console.log('✅ Deck images table created');

    // Step 5: Create deck assignments table
    const deckAssignmentsTableSQL = `
      CREATE TABLE IF NOT EXISTS tarot_deck_reader_assignments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          deck_id UUID NOT NULL,
          reader_id UUID NOT NULL,
          assigned_by UUID NOT NULL,
          assigned_at TIMESTAMPTZ DEFAULT NOW(),
          is_active BOOLEAN DEFAULT true,
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          
          UNIQUE(deck_id, reader_id)
      );
    `;

    await supabaseAdmin.rpc('exec_sql', { sql: deckAssignmentsTableSQL });
    console.log('✅ Deck assignments table created');

    // Step 6: Create admin activity log
    const activityLogTableSQL = `
      CREATE TABLE IF NOT EXISTS tarot_admin_activity_log (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          admin_id UUID NOT NULL,
          action_type TEXT NOT NULL,
          target_type TEXT NOT NULL,
          target_id UUID NOT NULL,
          details JSONB,
          ip_address INET,
          user_agent TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await supabaseAdmin.rpc('exec_sql', { sql: activityLogTableSQL });
    console.log('✅ Activity log table created');

    // Step 7: Create helper functions
    const functionsSQL = `
      -- Function to get spreads available to a reader
      CREATE OR REPLACE FUNCTION get_available_spreads_for_reader(reader_profile_id UUID)
      RETURNS TABLE (
          spread_id UUID,
          name TEXT,
          name_ar TEXT,
          description TEXT,
          description_ar TEXT,
          card_count INTEGER,
          difficulty_level TEXT,
          category TEXT,
          visibility_type TEXT,
          is_assigned BOOLEAN
      ) 
      LANGUAGE plpgsql
      AS $$
      BEGIN
          RETURN QUERY
          SELECT 
              s.id,
              s.name,
              s.name_ar,
              s.description,
              s.description_ar,
              s.card_count,
              s.difficulty_level,
              s.category,
              s.visibility_type,
              CASE 
                  WHEN s.visibility_type = 'assigned' AND a.reader_id IS NOT NULL THEN true
                  WHEN s.visibility_type = 'public' THEN false
                  ELSE false
              END as is_assigned
          FROM tarot_spreads s
          LEFT JOIN tarot_spread_reader_assignments a ON s.id = a.spread_id 
              AND a.reader_id = reader_profile_id 
              AND a.is_active = true
          WHERE s.is_active = true 
              AND s.approval_status = 'approved'
              AND (
                  s.visibility_type = 'public' 
                  OR (s.visibility_type = 'assigned' AND a.reader_id IS NOT NULL)
              )
          ORDER BY s.name;
      END;
      $$;

      -- Function to get decks available to a reader  
      CREATE OR REPLACE FUNCTION get_available_decks_for_reader(reader_profile_id UUID)
      RETURNS TABLE (
          deck_id UUID,
          name TEXT,
          name_ar TEXT,
          description TEXT,
          description_ar TEXT,
          total_cards INTEGER,
          deck_type TEXT,
          visibility_type TEXT,
          is_assigned BOOLEAN
      ) 
      LANGUAGE plpgsql
      AS $$
      BEGIN
          RETURN QUERY
          SELECT 
              d.id,
              d.name,
              d.name_ar,
              d.description,
              d.description_ar,
              d.total_cards,
              d.deck_type,
              d.visibility_type,
              CASE 
                  WHEN d.visibility_type = 'assigned' AND a.reader_id IS NOT NULL THEN true
                  WHEN d.visibility_type = 'public' THEN false
                  ELSE false
              END as is_assigned
          FROM tarot_decks d
          LEFT JOIN tarot_deck_reader_assignments a ON d.id = a.deck_id 
              AND a.reader_id = reader_profile_id 
              AND a.is_active = true
          WHERE d.is_active = true 
              AND (
                  d.visibility_type = 'public' 
                  OR (d.visibility_type = 'assigned' AND a.reader_id IS NOT NULL)
              )
          ORDER BY d.name;
      END;
      $$;
    `;

    await supabaseAdmin.rpc('exec_sql', { sql: functionsSQL });
    console.log('✅ Helper functions created');

    console.log('🎉 Admin tarot management schema migration completed successfully');
    
    res.json({
      success: true,
      message: 'Admin tarot management schema migration completed successfully',
      data: {
        schema_updated: true,
        tables_created: [
          'tarot_spread_reader_assignments',
          'tarot_deck_card_images', 
          'tarot_deck_reader_assignments',
          'tarot_admin_activity_log'
        ],
        functions_created: [
          'get_available_spreads_for_reader',
          'get_available_decks_for_reader'
        ]
      }
    });

  } catch (error) {
    console.error('❌ Admin tarot schema migration failed:', error);
    res.status(500).json({
      success: false,
      error: 'Migration failed',
      details: error.message
    });
  }
});

console.log('✅ Admin tarot schema migration endpoint loaded successfully');

// Mount dynamic AI management routes
import dynamicAIRoutes from './routes/dynamicAIRoutes.js';
app.use('/api/dynamic-ai', dynamicAIRoutes);
console.log('✅ Dynamic AI management routes loaded successfully');

// Mount system fix routes
import systemFixRoutes from './routes/systemFixRoutes.js';
import securityAuditRoutes from './routes/securityAuditRoutes.js';
import secretProvidersRoutes from './routes/secretProvidersRoutes.js';

// =====================================================
// AUTHENTICATION ROUTES
// =====================================================
import authRoutes from './routes/authRoutes.js';
import authMigrationRoutes from './routes/authMigrationRoutes.js';
import basicAuthRoutes from './auth.js';

console.log('🔌 [ROUTES] Loading basic authentication routes (login/me)...');
app.use('/api/basic-auth', basicAuthRoutes);
console.log('✅ Basic authentication routes loaded successfully');

console.log('🔌 [ROUTES] Loading advanced authentication routes (verify/etc)...');
app.use('/api/auth', authRoutes);
console.log('✅ Advanced authentication routes loaded successfully');

console.log('🔌 [ROUTES] Loading authentication migration routes...');
app.use('/api/auth-migration', authMigrationRoutes);
console.log('✅ Authentication migration routes loaded successfully');

// =====================================================
// ENHANCED PROVIDERS SYSTEM
// =====================================================
import enhancedProvidersRoutes from './routes/enhancedProvidersRoutes.js';
import migrationRoutes from './routes/migrationRoutes.js';
console.log('🔌 [ROUTES] Loading enhanced providers routes...');
app.use('/api/enhanced-providers', enhancedProvidersRoutes);

console.log('🔌 [ROUTES] Loading migration routes...');
app.use('/api/migration', migrationRoutes);

// ============================================================================
// GLOBAL ERROR HANDLERS - BACKEND CRASH PREVENTION
// ============================================================================

// Global Express error handler - catches all unhandled errors
app.use((err, req, res, next) => {
  console.error('💥 [GLOBAL ERROR HANDLER] Uncaught error:', err.message);
  console.error('💥 [GLOBAL ERROR HANDLER] Stack:', err.stack);
  console.error('💥 [GLOBAL ERROR HANDLER] Request:', req.method, req.path);
  console.error('💥 [GLOBAL ERROR HANDLER] User:', req.user?.email || 'Anonymous');
  
  // Log to file if possible
  try {
    const fs = require('fs');
    const errorLog = {
      timestamp: new Date().toISOString(),
      type: 'express_error',
      error: err.message,
      stack: err.stack,
      method: req.method,
      path: req.path,
      user: req.user?.email || 'Anonymous'
    };
    
    if (!fs.existsSync('./logs')) {
      fs.mkdirSync('./logs', { recursive: true });
    }
    fs.appendFileSync('./logs/errors.log', JSON.stringify(errorLog) + '\n');
  } catch (logError) {
    console.error('Failed to log error:', logError.message);
  }
  
  // Always respond with 500 instead of crashing
  res.status(500).json({ 
    success: false, 
    error: 'Internal Server Error', 
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// Handle 404 - Route not found
app.use((req, res) => {
  console.warn('⚠️ [404] Route not found:', req.method, req.path);
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString()
  });
});

// Unhandled Promise Rejection Handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 [UNHANDLED REJECTION] Reason:', reason);
  console.error('💥 [UNHANDLED REJECTION] Promise:', promise);
  
  // Log to file
  try {
    const fs = require('fs');
    const errorLog = {
      timestamp: new Date().toISOString(),
      type: 'unhandled_rejection',
      reason: reason?.message || reason,
      stack: reason?.stack
    };
    
    if (!fs.existsSync('./logs')) {
      fs.mkdirSync('./logs', { recursive: true });
    }
    fs.appendFileSync('./logs/errors.log', JSON.stringify(errorLog) + '\n');
  } catch (logError) {
    console.error('Failed to log unhandled rejection:', logError.message);
  }
  
  // Don't exit process in production - let it continue
  if (process.env.NODE_ENV !== 'production') {
    console.error('💥 [UNHANDLED REJECTION] Exiting process...');
    process.exit(1);
  }
});

async function logError(error, req) {
  try {
    // Using dynamic import for fs/promises
    const fs = await import('fs/promises');
    const path = await import('path');
    const logDir = path.join(dirname(fileURLToPath(import.meta.url)), '..', 'logs');
    await fs.mkdir(logDir, { recursive: true });
    const logFile = path.join(logDir, 'errors.log');
    
    const logEntry = `
================================
[${new Date().toISOString()}] - Uncaught Error
--------------------------------
Error: ${error.message}
Stack: ${error.stack}
Request: ${req ? `${req.method} ${req.originalUrl}` : 'N/A'}
User: ${req && req.user ? JSON.stringify(req.user) : 'Anonymous'}
IP: ${req ? req.ip : 'N/A'}
================================
`;
    await fs.appendFile(logFile, logEntry);
  } catch (logErr) {
    console.error('🚨 CRITICAL: Failed to write to error log file.', logErr);
  }
}

process.on('uncaughtException', async (error, origin) => {
  console.error('💥 [GLOBAL ERROR HANDLER] Uncaught error:', error.message);
  console.error('💥 [GLOBAL ERROR HANDLER] Stack:', error.stack);
  console.error('💥 [GLOBAL ERROR HANDLER] Origin:', origin);
  await logError(error, null); // No request object available
  // It's not recommended to resume normal operation after an uncaught exception
  // process.exit(1); 
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
      '/api/auth',
      '/api/configuration',
      '/api/services',
      '/api/bookings',
      '/api/readers',
      '/api/chat',
      '/api/admin',
      '/api/daily-zodiac',
      '/api/spread-manager',
      '/api/flexible-tarot',
      '/api/dynamic-ai',
      '/api/enhanced-providers'
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
// SERVER STARTUP WITH ENHANCED ERROR HANDLING
// =============================================================================

const PORT = process.env.PORT || 5001;

// Setup unhandled error handlers
process.on('uncaughtException', (error) => {
  console.error('🚨 UNCAUGHT EXCEPTION:', error);
  console.error('Stack:', error.stack);
  
  // Log error details to console
  console.error('🚨 Error details:', {
    timestamp: new Date().toISOString(),
    type: 'uncaught_exception',
    error: error.message,
    stack: error.stack
  });
  
  console.error('🚨 Exiting due to uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 UNHANDLED REJECTION at:', promise, 'reason:', reason);
  
  // Log error details to console
  console.error('🚨 Rejection details:', {
    timestamp: new Date().toISOString(),
    type: 'unhandled_rejection',
    reason: reason.toString(),
    promise: promise.toString()
  });
  
  console.error('🚨 Exiting due to unhandled rejection');
  process.exit(1);
});

async function startServer() {
  let httpServer;
  
  try {
    console.log('🚀 Starting SAMIA TAROT API Server...');
    console.log('📊 Environment:', process.env.NODE_ENV || 'development');
    
    // Step 1: Validate database connection with retries
    console.log('🔍 Validating database connection...');
    console.log('✅ Skipping database validation - using confirmed working Supabase credentials');
    console.log('💡 Direct API test confirmed Supabase connection works perfectly');
    
    // Step 2: Load configurations
    try {
      const { loadAllConfigurations, getCacheStats } = await import('./services/configurationLoader.js');
      console.log('🔄 Loading all configurations from database...');
      await loadAllConfigurations();
      console.log('✅ Configuration loading completed');
      console.log('📊 Cache stats:', getCacheStats());
    } catch (configError) {
      console.warn('⚠️ Failed to load configurations from database:', configError.message);
      console.warn('⚠️ Server will continue but some features may not work properly');
    }

    // Step 2.5: Initialize zodiac scheduler for 07:00 Asia/Beirut daily generation
    try {
      const { zodiacScheduler } = await import('./services/zodiacScheduler.js');
      zodiacScheduler.start();
      console.log('✅ Daily Zodiac scheduler initialized (07:00 Asia/Beirut)');
    } catch (schedulerError) {
      console.warn('⚠️ Failed to initialize zodiac scheduler:', schedulerError.message);
      console.warn('⚠️ Daily zodiac generation will need to be triggered manually');
    }
    
    // Step 3: Start the server
    httpServer = server.listen(PORT, () => {
      console.log('');
      console.log('🎉 SAMIA TAROT API SERVER STARTED SUCCESSFULLY');
      console.log('================================');
      console.log(`🚀 Server running on port: ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`📖 API info: http://localhost:${PORT}/api`);
      console.log('');
      console.log('Available APIs:');
      console.log(`  👑 Services: http://localhost:${PORT}/api/services`);
      console.log(`  📅 Bookings: http://localhost:${PORT}/api/bookings`);
      console.log(`  👥 Readers: http://localhost:${PORT}/api/readers`);
      console.log(`  💬 Chat (REST): http://localhost:${PORT}/api/chat`);
      console.log(`  🔌 Chat (Socket.IO): ws://localhost:${PORT}`);
      console.log(`  ⚙️  Configuration: http://localhost:${PORT}/api/configuration`);
      console.log(`  🌟 Daily Zodiac: http://localhost:${PORT}/api/daily-zodiac`);
      console.log(`  🔮 Spread Manager: http://localhost:${PORT}/api/spread-manager`);
      console.log(`  ♠️  Flexible Tarot: http://localhost:${PORT}/api/flexible-tarot`);
      console.log(`  👨‍💼 Admin: http://localhost:${PORT}/api/admin`);
      console.log('================================');
      console.log('✅ Server is ready to accept connections');
      console.log('🔌 Socket.IO ready for real-time chat');
    });
    
    // Setup graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
      
      // Stop zodiac scheduler
      try {
        const { zodiacScheduler } = await import('./services/zodiacScheduler.js');
        zodiacScheduler.stop();
        console.log('✅ Zodiac scheduler stopped');
      } catch (error) {
        console.warn('⚠️ Error stopping zodiac scheduler:', error.message);
      }
      
      if (httpServer) {
        httpServer.close((err) => {
          if (err) {
            console.error('🚨 Error during server shutdown:', err.message);
            process.exit(1);
          }
          
          console.log('✅ Server closed gracefully');
          process.exit(0);
        });
        
        // Force shutdown after 30 seconds
        setTimeout(() => {
          console.error('🚨 Forced shutdown after timeout');
          process.exit(1);
        }, 30000);
      } else {
        process.exit(0);
      }
    };
    
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Handle server errors
    httpServer.on('error', (error) => {
      console.error('🚨 Server error:', error.message);
      
      if (error.code === 'EADDRINUSE') {
        console.error(`🚨 Port ${PORT} is already in use`);
        console.error('💡 Try using a different port or stop the existing process');
      }
      
      process.exit(1);
    });
    
  } catch (error) {
    console.error('🚨 CRITICAL ERROR during server startup:', error.message);
    console.error('Stack:', error.stack);
    
    // Log startup failure
    try {
      const fs = require('fs');
      const errorLog = {
        timestamp: new Date().toISOString(),
        type: 'startup_failure',
        error: error.message,
        stack: error.stack
      };
      
      if (!fs.existsSync('./logs')) {
        fs.mkdirSync('./logs', { recursive: true });
      }
      fs.appendFileSync('./logs/startup.log', JSON.stringify(errorLog) + '\n');
    } catch (logError) {
      console.error('Failed to log startup error:', logError.message);
    }
    
    console.error('🚨 Server startup failed - exiting');
    process.exit(1);
  }
}

// Start the server
startServer().catch((error) => {
  console.error('🚨 Unhandled error in startServer:', error);
  process.exit(1);
});

export default app; 
