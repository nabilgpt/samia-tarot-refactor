/**
 * reCAPTCHA Verification API for SAMIA TAROT
 * Node.js/Express backend for verifying reCAPTCHA tokens
 */

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const fetch = require('node-fetch');
const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const recaptchaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    success: false,
    error: 'Too many reCAPTCHA verification attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// reCAPTCHA configuration
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY || '6LfwzksrAAAAAAx_w7utBIM572cyg3bDMj10yVw2';
const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

// Utility functions
const isValidIP = (ip) => {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
};

const getRealIP = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  const realIP = req.headers['x-real-ip'];
  const clientIP = req.headers['x-client-ip'];
  
  if (forwarded) {
    const ips = forwarded.split(',');
    const ip = ips[0].trim();
    if (isValidIP(ip)) return ip;
  }
  
  if (realIP && isValidIP(realIP)) return realIP;
  if (clientIP && isValidIP(clientIP)) return clientIP;
  
  return req.connection.remoteAddress || req.socket.remoteAddress || '0.0.0.0';
};

// Error handler middleware
const errorHandler = (err, req, res, next) => {
  console.error('reCAPTCHA verification error:', err);
  
  res.status(500).json({
    success: false,
    error: 'Internal server error during verification',
    timestamp: new Date().toISOString()
  });
};

// Main reCAPTCHA verification endpoint
app.post('/api/verify-recaptcha', recaptchaLimiter, async (req, res) => {
  try {
    const { token } = req.body;
    
    // Validate input
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'reCAPTCHA token is required'
      });
    }
    
    const userIP = getRealIP(req);
    
    // Prepare verification data
    const verificationData = new URLSearchParams({
      secret: RECAPTCHA_SECRET_KEY,
      response: token.trim(),
      remoteip: userIP
    });
    
    // Verify with Google
    const response = await fetch(RECAPTCHA_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: verificationData,
      timeout: 10000 // 10 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const googleResponse = await response.json();
    
    // Log verification attempt (optional)
    const logData = {
      timestamp: new Date().toISOString(),
      ip: userIP,
      success: googleResponse.success || false,
      score: googleResponse.score || null,
      action: googleResponse.action || null,
      errorCodes: googleResponse['error-codes'] || [],
      userAgent: req.headers['user-agent'] || 'unknown'
    };
    
    // In production, use proper logging service
    if (process.env.NODE_ENV === 'development') {
      console.log('reCAPTCHA verification:', logData);
    }
    
    // Check verification result
    if (googleResponse.success) {
      // Additional security checks for reCAPTCHA v3
      if (googleResponse.score !== undefined) {
        const minScore = parseFloat(process.env.RECAPTCHA_MIN_SCORE) || 0.5;
        
        if (googleResponse.score < minScore) {
          return res.status(400).json({
            success: false,
            error: 'Low confidence score',
            score: googleResponse.score,
            threshold: minScore
          });
        }
      }
      
      // Verification successful
      res.json({
        success: true,
        message: 'reCAPTCHA verification successful',
        score: googleResponse.score || null,
        timestamp: new Date().toISOString()
      });
      
    } else {
      // Verification failed
      const errorCodes = googleResponse['error-codes'] || [];
      let errorMessage = 'reCAPTCHA verification failed';
      
      // Map error codes to user-friendly messages
      const errorMessages = {
        'missing-input-secret': 'Server configuration error',
        'invalid-input-secret': 'Server configuration error',
        'missing-input-response': 'Please complete the reCAPTCHA',
        'invalid-input-response': 'Invalid reCAPTCHA response',
        'bad-request': 'Invalid request format',
        'timeout-or-duplicate': 'reCAPTCHA expired or already used'
      };
      
      // Find the first matching error message
      for (const code of errorCodes) {
        if (errorMessages[code]) {
          errorMessage = errorMessages[code];
          break;
        }
      }
      
      res.status(400).json({
        success: false,
        error: errorMessage,
        errorCodes: errorCodes
      });
    }
    
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Verification service temporarily unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'reCAPTCHA verification',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🛡️  reCAPTCHA verification server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Verification endpoint: http://localhost:${PORT}/api/verify-recaptcha`);
});

module.exports = app; 