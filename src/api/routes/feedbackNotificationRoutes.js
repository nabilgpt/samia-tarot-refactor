/**
 * 🚨 FEEDBACK NOTIFICATION API ROUTES
 * 
 * API endpoints for managing feedback notifications and weekly reports
 */

const express = require('express');
const router = express.Router();
const feedbackNotificationService = require('../services/feedbackNotificationService');
const weeklyFeedbackReportService = require('../services/weeklyFeedbackReportService');
const { authenticateToken, requireRole } = require('../middleware/auth');

// =============================================================================
// FEEDBACK NOTIFICATION ENDPOINTS
// =============================================================================

/**
 * GET /api/feedback-notifications/pending-count
 * Get count of pending feedback for admin badge
 */
router.get('/pending-count', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const count = await feedbackNotificationService.getPendingFeedbackCount();
    
    res.json({
      success: true,
      data: {
        pendingCount: count,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting pending feedback count:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pending feedback count',
      code: 'PENDING_COUNT_ERROR'
    });
  }
});

/**
 * POST /api/feedback-notifications/trigger
 * Manually trigger notification for new feedback (for testing)
 */
router.post('/trigger', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { feedbackId } = req.body;
    
    if (!feedbackId) {
      return res.status(400).json({
        success: false,
        error: 'Feedback ID is required',
        code: 'MISSING_FEEDBACK_ID'
      });
    }

    // Get feedback data
    const { supabase } = require('../lib/supabase');
    const { data: feedback, error } = await supabase
      .from('service_feedback')
      .select('*')
      .eq('id', feedbackId)
      .single();

    if (error || !feedback) {
      return res.status(404).json({
        success: false,
        error: 'Feedback not found',
        code: 'FEEDBACK_NOT_FOUND'
      });
    }

    // Trigger notification
    await feedbackNotificationService.notifyPendingFeedback(feedback);
    
    res.json({
      success: true,
      message: 'Notification triggered successfully',
      data: {
        feedbackId,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error triggering feedback notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger notification',
      code: 'NOTIFICATION_TRIGGER_ERROR'
    });
  }
});

/**
 * PUT /api/feedback-notifications/preferences
 * Update admin notification preferences
 */
router.put('/preferences', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { preferences } = req.body;
    const adminId = req.user.id;
    
    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Valid preferences object is required',
        code: 'INVALID_PREFERENCES'
      });
    }

    const success = await feedbackNotificationService.updateNotificationPreferences(adminId, preferences);
    
    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update preferences',
        code: 'PREFERENCES_UPDATE_ERROR'
      });
    }
    
    res.json({
      success: true,
      message: 'Notification preferences updated successfully',
      data: {
        preferences,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update notification preferences',
      code: 'PREFERENCES_ERROR'
    });
  }
});

// =============================================================================
// WEEKLY REPORT ENDPOINTS
// =============================================================================

/**
 * POST /api/feedback-notifications/reports/generate
 * Manually generate weekly report
 */
router.post('/reports/generate', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date and end date are required',
        code: 'MISSING_DATE_RANGE'
      });
    }

    const report = await weeklyFeedbackReportService.generateManualReport(startDate, endDate);
    
    res.json({
      success: true,
      message: 'Report generated successfully',
      data: report
    });
  } catch (error) {
    console.error('Error generating manual report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate report',
      code: 'REPORT_GENERATION_ERROR'
    });
  }
});

/**
 * GET /api/feedback-notifications/reports/download/:reportId
 * Download a specific report
 */
router.get('/reports/download/:reportId', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { reportId } = req.params;
    const { format } = req.query; // 'csv' or 'html'
    
    const { supabase } = require('../lib/supabase');
    const { data: report, error } = await supabase
      .from('admin_reports')
      .select('*')
      .eq('id', reportId)
      .eq('type', 'weekly_feedback')
      .single();

    if (error || !report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found',
        code: 'REPORT_NOT_FOUND'
      });
    }

    // Check if report is still available
    if (new Date() > new Date(report.available_until)) {
      return res.status(410).json({
        success: false,
        error: 'Report has expired',
        code: 'REPORT_EXPIRED'
      });
    }

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="feedback-report-${reportId}.csv"`);
      res.send(report.csv_data);
    } else {
      res.setHeader('Content-Type', 'text/html');
      res.send(report.html_report);
    }
  } catch (error) {
    console.error('Error downloading report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download report',
      code: 'REPORT_DOWNLOAD_ERROR'
    });
  }
});

/**
 * GET /api/feedback-notifications/reports/list
 * List available reports for admin dashboard
 */
router.get('/reports/list', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { supabase } = require('../lib/supabase');
    const { data: reports, error } = await supabase
      .from('admin_reports')
      .select('id, period_start, period_end, generated_at, available_until')
      .eq('type', 'weekly_feedback')
      .gte('available_until', new Date().toISOString())
      .order('generated_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching reports list:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch reports',
        code: 'REPORTS_FETCH_ERROR'
      });
    }
    
    res.json({
      success: true,
      data: {
        reports: reports || [],
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error listing reports:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list reports',
      code: 'REPORTS_LIST_ERROR'
    });
  }
});

// =============================================================================
// WEBHOOK ENDPOINT FOR FEEDBACK SUBMISSION
// =============================================================================

/**
 * POST /api/feedback-notifications/webhook/feedback-submitted
 * Webhook triggered when new feedback is submitted
 * This should be called automatically by the feedback submission system
 */
router.post('/webhook/feedback-submitted', async (req, res) => {
  try {
    const { feedbackId, webhookSecret } = req.body;
    
    // Verify webhook secret
    if (webhookSecret !== process.env.FEEDBACK_WEBHOOK_SECRET) {
      return res.status(401).json({
        success: false,
        error: 'Invalid webhook secret',
        code: 'INVALID_WEBHOOK_SECRET'
      });
    }
    
    if (!feedbackId) {
      return res.status(400).json({
        success: false,
        error: 'Feedback ID is required',
        code: 'MISSING_FEEDBACK_ID'
      });
    }

    // Get feedback data
    const { supabase } = require('../lib/supabase');
    const { data: feedback, error } = await supabase
      .from('service_feedback')
      .select('*')
      .eq('id', feedbackId)
      .eq('status', 'pending') // Only notify for pending feedback
      .single();

    if (error || !feedback) {
      return res.status(404).json({
        success: false,
        error: 'Pending feedback not found',
        code: 'FEEDBACK_NOT_FOUND'
      });
    }

    // Trigger notification asynchronously
    setImmediate(async () => {
      try {
        await feedbackNotificationService.notifyPendingFeedback(feedback);
      } catch (notificationError) {
        console.error('Error in async notification:', notificationError);
      }
    });
    
    res.json({
      success: true,
      message: 'Feedback notification webhook processed',
      data: {
        feedbackId,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error processing feedback webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process webhook',
      code: 'WEBHOOK_PROCESSING_ERROR'
    });
  }
});

// =============================================================================
// ADMIN DASHBOARD INTEGRATION
// =============================================================================

/**
 * GET /api/feedback-notifications/dashboard/stats
 * Get notification and report statistics for admin dashboard
 */
router.get('/dashboard/stats', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const [pendingCount, recentNotifications, availableReports] = await Promise.all([
      feedbackNotificationService.getPendingFeedbackCount(),
      getRecentNotifications(),
      getRecentReports()
    ]);
    
    res.json({
      success: true,
      data: {
        pendingFeedbackCount: pendingCount,
        recentNotifications,
        availableReports,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard statistics',
      code: 'DASHBOARD_STATS_ERROR'
    });
  }
});

// Helper function to get recent notifications
async function getRecentNotifications() {
  try {
    const { supabase } = require('../lib/supabase');
    const { data, error } = await supabase
      .from('notification_analytics')
      .select('*')
      .eq('type', 'feedback_moderation')
      .order('sent_at', { ascending: false })
      .limit(5);

    return data || [];
  } catch (error) {
    console.error('Error getting recent notifications:', error);
    return [];
  }
}

// Helper function to get recent reports
async function getRecentReports() {
  try {
    const { supabase } = require('../lib/supabase');
    const { data, error } = await supabase
      .from('report_analytics')
      .select('*')
      .eq('type', 'weekly_feedback')
      .order('generated_at', { ascending: false })
      .limit(3);

    return data || [];
  } catch (error) {
    console.error('Error getting recent reports:', error);
    return [];
  }
}

module.exports = router; 