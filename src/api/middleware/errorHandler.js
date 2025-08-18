import fs from 'fs';
import path from 'path';

// Ensure logs directory exists
const logsDir = './logs';
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Enhanced error logging function
function logError(error, req = null, additionalInfo = {}) {
  const timestamp = new Date().toISOString();
  const errorLog = {
    timestamp,
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    },
    request: req ? {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id
    } : null,
    additionalInfo,
    processInfo: {
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      pid: process.pid
    }
  };

  // Log to console
  console.error('🚨 ERROR:', JSON.stringify(errorLog, null, 2));

  // Log to file
  try {
    const logFile = path.join(logsDir, 'error.log');
    fs.appendFileSync(logFile, JSON.stringify(errorLog) + '\n');
  } catch (logFileError) {
    console.error('Failed to write to error log file:', logFileError.message);
  }

  return errorLog;
}

// Database error handler
export function handleDatabaseError(error, operation = 'database operation') {
  logError(error, null, { operation, type: 'database_error' });
  
  // Common database error responses
  if (error.message?.includes('Connection') || error.message?.includes('timeout')) {
    return {
      status: 503,
      response: {
        success: false,
        error: 'Database connection issue. Please try again later.',
        code: 'DATABASE_CONNECTION_ERROR',
        retry_after: 30
      }
    };
  }

  if (error.message?.includes('permission') || error.message?.includes('access')) {
    return {
      status: 403,
      response: {
        success: false,
        error: 'Database access denied',
        code: 'DATABASE_ACCESS_DENIED'
      }
    };
  }

  return {
    status: 500,
    response: {
      success: false,
      error: 'Database operation failed',
      code: 'DATABASE_ERROR'
    }
  };
}

// API error handler middleware
export function apiErrorHandler(error, req, res, next) {
  const errorLog = logError(error, req, { type: 'api_error' });

  // Don't expose internal errors in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  let statusCode = 500;
  let errorResponse = {
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    timestamp: errorLog.timestamp
  };

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    errorResponse.error = 'Validation failed';
    errorResponse.code = 'VALIDATION_ERROR';
    if (isDevelopment) {
      errorResponse.details = error.message;
    }
  } else if (error.name === 'UnauthorizedError' || error.message?.includes('token')) {
    statusCode = 401;
    errorResponse.error = 'Authentication required';
    errorResponse.code = 'AUTHENTICATION_ERROR';
  } else if (error.message?.includes('Rate limit')) {
    statusCode = 429;
    errorResponse.error = 'Too many requests';
    errorResponse.code = 'RATE_LIMIT_EXCEEDED';
    errorResponse.retry_after = 900; // 15 minutes
  } else if (error.message?.includes('Not found')) {
    statusCode = 404;
    errorResponse.error = 'Resource not found';
    errorResponse.code = 'NOT_FOUND';
  }

  // Add development details
  if (isDevelopment) {
    errorResponse.stack = error.stack;
    errorResponse.details = error.message;
  }

  // Ensure we don't crash the server
  try {
    res.status(statusCode).json(errorResponse);
  } catch (responseError) {
    console.error('🚨 Failed to send error response:', responseError.message);
    // Last resort - send minimal response
    try {
      res.status(500).end('Internal Server Error');
    } catch (finalError) {
      console.error('🚨 Complete response failure:', finalError.message);
    }
  }
}

// Async error wrapper to catch unhandled promise rejections
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Graceful shutdown handler
export function setupGracefulShutdown(server) {
  const shutdown = (signal) => {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
    
    server.close((err) => {
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
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Unhandled error handlers
export function setupUnhandledErrorHandlers() {
  process.on('uncaughtException', (error) => {
    console.error('🚨 UNCAUGHT EXCEPTION:', error);
    logError(error, null, { type: 'uncaught_exception' });
    
    // In production, we should restart the process
    if (process.env.NODE_ENV === 'production') {
      console.error('🚨 Exiting due to uncaught exception');
      process.exit(1);
    }
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 UNHANDLED REJECTION at:', promise, 'reason:', reason);
    logError(new Error(reason), null, { type: 'unhandled_rejection' });
    
    // In production, we should restart the process
    if (process.env.NODE_ENV === 'production') {
      console.error('🚨 Exiting due to unhandled rejection');
      process.exit(1);
    }
  });
}

export { logError }; 