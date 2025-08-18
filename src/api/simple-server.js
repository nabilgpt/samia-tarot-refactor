/**
 * 🚀 SIMPLE SAMIA TAROT API SERVER
 * Basic server for testing and development
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

// Basic middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3003'],
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'SAMIA TAROT API is running'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🔮 Welcome to SAMIA TAROT API',
    status: 'active',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      'feedback-notifications': '/api/feedback-notifications'
    }
  });
});

// Basic feedback notifications endpoints
app.get('/api/feedback-notifications/test', (req, res) => {
  res.json({
    success: true,
    message: 'Feedback notification system is ready',
    features: [
      'Real-time notifications for pending feedback',
      'Weekly automated reports',
      'Email and SMS alerts',
      'Admin dashboard integration'
    ]
  });
});

// Feedback notification routes (simplified)
const feedbackNotificationRoutes = express.Router();

feedbackNotificationRoutes.get('/pending-count', (req, res) => {
  res.json({
    success: true,
    data: {
      pendingCount: 0,
      timestamp: new Date().toISOString()
    }
  });
});

feedbackNotificationRoutes.post('/trigger', (req, res) => {
  const { feedbackId } = req.body;
  
  if (!feedbackId) {
    return res.status(400).json({
      success: false,
      error: 'Feedback ID is required'
    });
  }

  // Mock notification trigger
  console.log(`🚨 Mock notification triggered for feedback: ${feedbackId}`);
  
  res.json({
    success: true,
    message: 'Mock notification triggered successfully',
    data: {
      feedbackId,
      timestamp: new Date().toISOString()
    }
  });
});

feedbackNotificationRoutes.post('/reports/generate', (req, res) => {
  const { startDate, endDate } = req.body;
  
  console.log(`📊 Mock report generation: ${startDate} to ${endDate}`);
  
  res.json({
    success: true,
    message: 'Mock report generated successfully',
    data: {
      feedbackCount: 0,
      reportGenerated: new Date().toISOString()
    }
  });
});

app.use('/api/feedback-notifications', feedbackNotificationRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    requested_path: req.originalUrl
  });
});

// Error handler
app.use((error, req, res, /* next */) => {
  console.error('API Error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 SAMIA TAROT Simple API Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🚨 Feedback notifications: http://localhost:${PORT}/api/feedback-notifications/test`);
  console.log('');
  console.log('✅ Feedback Notification System Features:');
  console.log('   📧 Email alerts for pending feedback');
  console.log('   📱 SMS notifications (Twilio)');
  console.log('   📊 Weekly automated reports');
  console.log('   🎯 Admin dashboard integration');
  console.log('   ⚙️  Configurable notification preferences');
});

module.exports = app; 