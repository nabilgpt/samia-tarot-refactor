import express from 'express';

const router = express.Router();

// Database connection validation function
async function validateDatabaseConnection() {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Test connection with retry logic
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .limit(1);

        if (error) {
          throw new Error(error.message);
        }

        return { success: true, attempts: attempts + 1 };
      } catch (error) {
        attempts++;
        if (attempts < maxAttempts) {
          const delay = attempts * 1000; // 1s, 2s, 3s
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          return { success: false, error: error.message, attempts };
        }
      }
    }
  } catch (error) {
    return { success: false, error: error.message, attempts: 0 };
  }
}

// Comprehensive health check endpoint
router.get('/', async (req, res) => {
  try {
    const startTime = Date.now();
    
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
        connection_test: false,
        response_time: null
      },
      performance: {
        response_time: null
      }
    };

    // Test database connection
    const dbStartTime = Date.now();
    try {
      const dbResult = await validateDatabaseConnection();
      const dbEndTime = Date.now();
      
      healthStatus.database.status = dbResult.success ? 'connected' : 'failed';
      healthStatus.database.connection_test = dbResult.success;
      healthStatus.database.response_time = dbEndTime - dbStartTime;
      healthStatus.database.attempts = dbResult.attempts;
      
      if (!dbResult.success) {
        healthStatus.database.error = dbResult.error;
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
      healthStatus.missing_env_vars = missingEnvVars.length;
    }

    // Calculate total response time
    const endTime = Date.now();
    healthStatus.performance.response_time = endTime - startTime;

    // Set appropriate status code
    const statusCode = healthStatus.status === 'healthy' ? 200 : 
                      healthStatus.status === 'degraded' ? 503 : 500;

    res.status(statusCode).json(healthStatus);
  } catch (error) {
    console.error('🚨 Health check error:', error.message);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message,
      uptime: process.uptime()
    });
  }
});

// Quick health check endpoint for load balancers
router.get('/quick', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export default router; 