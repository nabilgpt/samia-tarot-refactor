/**
 * Analytics Routes - Complete Implementation
 * SAMIA TAROT Platform
 * 
 * Provides comprehensive analytics endpoints for the platform
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { analyticsAPI } = require('../analytics');
const { AnalyticsAPI } = require('../analyticsApi');

// =============================================================================
// ANALYTICS ENDPOINTS
// =============================================================================

/**
 * GET /api/analytics
 * Get platform analytics overview
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    
    const summary = await analyticsAPI.getAnalyticsSummary(timeRange);
    
    res.json({
      success: true,
      data: summary,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics overview',
      code: 'ANALYTICS_OVERVIEW_ERROR'
    });
  }
});

/**
 * GET /api/analytics/dashboard
 * Get analytics dashboard data
 */
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const [revenue, userGrowth, bookings] = await Promise.all([
      AnalyticsAPI.getRevenueStats(startDate, endDate),
      AnalyticsAPI.getUserGrowthStats(startDate, endDate),
      AnalyticsAPI.getBookingStats(startDate, endDate)
    ]);

    res.json({
      success: true,
      data: {
        revenue: revenue.data,
        userGrowth: userGrowth.data,
        bookings: bookings.data,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Analytics dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard analytics',
      code: 'ANALYTICS_DASHBOARD_ERROR'
    });
  }
});

/**
 * GET /api/analytics/revenue
 * Get revenue analytics
 */
router.get('/revenue', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, ...filters } = req.query;
    
    const revenue = await AnalyticsAPI.getRevenueStats(startDate, endDate, filters);
    
    res.json({
      success: true,
      data: revenue.data
    });
  } catch (error) {
    console.error('Revenue analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch revenue analytics',
      code: 'REVENUE_ANALYTICS_ERROR'
    });
  }
});

/**
 * GET /api/analytics/users
 * Get user analytics
 */
router.get('/users/:userId?', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { timeRange = '30d' } = req.query;
    
    if (userId) {
      const userAnalytics = await analyticsAPI.getUserAnalytics(userId, timeRange);
      res.json({
        success: true,
        data: userAnalytics
      });
    } else {
      const userStats = await AnalyticsAPI.getUserGrowthStats();
      res.json({
        success: true,
        data: userStats.data
      });
    }
  } catch (error) {
    console.error('User analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user analytics',
      code: 'USER_ANALYTICS_ERROR'
    });
  }
});

/**
 * GET /api/analytics/bookings
 * Get booking analytics
 */
router.get('/bookings', authenticateToken, async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    
    const bookingAnalytics = await analyticsAPI.getBookingAnalytics(timeRange);
    
    res.json({
      success: true,
      data: bookingAnalytics
    });
  } catch (error) {
    console.error('Booking analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch booking analytics',
      code: 'BOOKING_ANALYTICS_ERROR'
    });
  }
});

/**
 * GET /api/analytics/readers/:readerId
 * Get reader performance analytics
 */
router.get('/readers/:readerId', authenticateToken, async (req, res) => {
  try {
    const { readerId } = req.params;
    
    const readerPerformance = await analyticsAPI.getReaderPerformance(readerId);
    
    res.json({
      success: true,
      data: readerPerformance
    });
  } catch (error) {
    console.error('Reader analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reader analytics',
      code: 'READER_ANALYTICS_ERROR'
    });
  }
});

/**
 * POST /api/analytics/events
 * Track analytics events
 */
router.post('/events', authenticateToken, async (req, res) => {
  try {
    const { userId, eventType, eventData } = req.body;
    
    if (!userId || !eventType) {
      return res.status(400).json({
        success: false,
        error: 'userId and eventType are required',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }
    
    const result = await analyticsAPI.trackUserEvent(userId, eventType, eventData);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Track event error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track analytics event',
      code: 'TRACK_EVENT_ERROR'
    });
  }
});

/**
 * GET /api/analytics/system
 * Get system analytics
 */
router.get('/system', authenticateToken, async (req, res) => {
  try {
    const { timeRange = '7d' } = req.query;
    
    const systemAnalytics = await analyticsAPI.getSystemAnalytics(timeRange);
    
    res.json({
      success: true,
      data: systemAnalytics
    });
  } catch (error) {
    console.error('System analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system analytics',
      code: 'SYSTEM_ANALYTICS_ERROR'
    });
  }
});

// =============================================================================
// ERROR HANDLER
// =============================================================================

// 404 handler for analytics routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Analytics endpoint not found',
    code: 'ANALYTICS_ENDPOINT_NOT_FOUND',
    requested_path: req.originalUrl,
    available_endpoints: [
      'GET /api/analytics',
      'GET /api/analytics/dashboard',
      'GET /api/analytics/revenue',
      'GET /api/analytics/users',
      'GET /api/analytics/users/:userId',
      'GET /api/analytics/bookings',
      'GET /api/analytics/readers/:readerId',
      'POST /api/analytics/events',
      'GET /api/analytics/system'
    ]
  });
});

module.exports = router; 