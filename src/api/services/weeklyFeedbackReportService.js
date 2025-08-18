/**
 * 📊 WEEKLY FEEDBACK REPORT SERVICE
 * 
 * Automated weekly export/reporting system for service feedback
 * Implements Prompt 2: Weekly Feedback Report Export
 */

import nodemailer from 'nodemailer';

class WeeklyFeedbackReportService {
  constructor() {
    this.emailTransporter = null;
    this.initializeEmailService();
    this.scheduleWeeklyReports();
  }

  /**
   * Initialize email service for report delivery
   */
  initializeEmailService() {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.emailTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      console.log('✅ Weekly reports email service initialized (SMTP)');
    } else if (process.env.SENDGRID_API_KEY) {
      this.emailTransporter = nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY
        }
      });
      console.log('✅ Weekly reports email service initialized (SendGrid)');
    } else {
      console.warn('⚠️ No email service configured for weekly reports');
    }
  }

  /**
   * Schedule weekly report generation
   */
  scheduleWeeklyReports() {
    // Get report schedule from environment or default to Sunday midnight
    const reportDay = process.env.WEEKLY_REPORT_DAY || 0; // 0 = Sunday
    const reportHour = process.env.WEEKLY_REPORT_HOUR || 0; // 0 = Midnight
    
    console.log(`📅 Weekly feedback reports scheduled for day ${reportDay} at hour ${reportHour}`);
    
    // Check every hour if it's time to generate report
    setInterval(async () => {
      const now = new Date();
      if (now.getDay() === parseInt(reportDay) && now.getHours() === parseInt(reportHour)) {
        await this.generateAndSendWeeklyReport();
      }
    }, 60 * 60 * 1000); // Check every hour
  }

  /**
   * 🔥 MAIN REPORT GENERATION FUNCTION
   * Generate and send weekly feedback report
   */
  async generateAndSendWeeklyReport() {
    try {
      console.log('📊 Starting weekly feedback report generation...');

      // Get date range (previous 7 days)
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (7 * 24 * 60 * 60 * 1000));

      // Fetch feedback data
      const feedbackData = await this.fetchWeeklyFeedbackData(startDate, endDate);
      
      // Generate analytics summary
      const analyticsSummary = await this.generateAnalyticsSummary(feedbackData);

      // Create CSV export
      const csvData = await this.generateCSVReport(feedbackData, analyticsSummary);

      // Create HTML report
      const htmlReport = await this.generateHTMLReport(feedbackData, analyticsSummary, startDate, endDate);

      // Get admin recipients
      const recipients = await this.getReportRecipients();

      // Send reports via email
      if (this.emailTransporter && recipients.length > 0) {
        await this.sendReportEmails(recipients, csvData, htmlReport, startDate, endDate);
      }

      // Save downloadable version to admin dashboard
      await this.saveReportToAdminDashboard(csvData, htmlReport, startDate, endDate);

      console.log('✅ Weekly feedback report generated and sent successfully');
      
      // Track report generation
      await this.trackReportGeneration(feedbackData.length, recipients.length);

    } catch (error) {
      console.error('❌ Error generating weekly feedback report:', error);
      await this.notifyReportError(error);
    }
  }

  /**
   * Fetch feedback data for the past week
   */
  async fetchWeeklyFeedbackData(startDate, endDate) {
    try {
      const { supabase } = require('../lib/supabase');
      
      const { data: feedback, error } = await supabase
        .from('service_feedback')
        .select(`
          *,
          profiles:client_id(full_name, email),
          reader_profiles:reader_id(full_name, email),
          bookings:booking_id(service_type, duration, price)
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching weekly feedback data:', error);
        return [];
      }

      return feedback || [];
    } catch (error) {
      console.error('Error in fetchWeeklyFeedbackData:', error);
      return [];
    }
  }

  /**
   * Generate analytics summary
   */
  async generateAnalyticsSummary(feedbackData) {
    const summary = {
      totalFeedback: feedbackData.length,
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      serviceTypeBreakdown: {},
      approvalRate: 0,
      mostReviewedReaders: {},
      mostReviewedServices: {},
      trends: {
        compared_to_last_week: 'N/A'
      }
    };

    if (feedbackData.length === 0) return summary;

    // Calculate average rating
    const ratingsWithValues = feedbackData.filter(f => f.rating);
    if (ratingsWithValues.length > 0) {
      summary.averageRating = ratingsWithValues.reduce((sum, f) => sum + f.rating, 0) / ratingsWithValues.length;
      summary.averageRating = Math.round(summary.averageRating * 100) / 100;
    }

    // Rating distribution
    ratingsWithValues.forEach(f => {
      if (f.rating >= 1 && f.rating <= 5) {
        summary.ratingDistribution[f.rating]++;
      }
    });

    // Service type breakdown
    feedbackData.forEach(f => {
      const serviceType = f.bookings?.service_type || 'Unknown';
      summary.serviceTypeBreakdown[serviceType] = (summary.serviceTypeBreakdown[serviceType] || 0) + 1;
    });

    // Approval rate
    const approvedCount = feedbackData.filter(f => f.status === 'approved').length;
    summary.approvalRate = feedbackData.length > 0 ? Math.round((approvedCount / feedbackData.length) * 100) : 0;

    // Most reviewed readers
    feedbackData.forEach(f => {
      const readerName = f.reader_profiles?.full_name || f.reader_id?.substring(0, 8) + '...' || 'Anonymous';
      summary.mostReviewedReaders[readerName] = (summary.mostReviewedReaders[readerName] || 0) + 1;
    });

    // Most reviewed services
    feedbackData.forEach(f => {
      const serviceType = f.bookings?.service_type || 'Unknown';
      summary.mostReviewedServices[serviceType] = (summary.mostReviewedServices[serviceType] || 0) + 1;
    });

    return summary;
  }

  /**
   * Generate CSV report
   */
  async generateCSVReport(feedbackData, analyticsSummary) {
    const csvHeaders = [
      'Feedback ID',
      'Service Type',
      'Client ID',
      'Reader ID',
      'Rating',
      'Comment',
      'Status',
      'Submission Date',
      'Approval Date',
      'Booking ID',
      'Booking Duration',
      'Booking Price'
    ];

    const csvRows = feedbackData.map(feedback => [
      feedback.id || '',
      feedback.bookings?.service_type || '',
      feedback.client_id?.substring(0, 8) + '...' || '',
      feedback.reader_id?.substring(0, 8) + '...' || '',
      feedback.rating || '',
      `"${(feedback.comment || '').replace(/"/g, '""')}"`, // Escape quotes
      feedback.status || '',
      feedback.created_at || '',
      feedback.approved_at || '',
      feedback.booking_id?.substring(0, 8) + '...' || '',
      feedback.bookings?.duration || '',
      feedback.bookings?.price || ''
    ]);

    // Add analytics summary at the top
    const summaryRows = [
      ['WEEKLY FEEDBACK REPORT SUMMARY'],
      [''],
      ['Total Feedback', analyticsSummary.totalFeedback],
      ['Average Rating', analyticsSummary.averageRating],
      ['Approval Rate (%)', analyticsSummary.approvalRate],
      [''],
      ['RATING DISTRIBUTION'],
      ['1 Star', analyticsSummary.ratingDistribution[1]],
      ['2 Stars', analyticsSummary.ratingDistribution[2]],
      ['3 Stars', analyticsSummary.ratingDistribution[3]],
      ['4 Stars', analyticsSummary.ratingDistribution[4]],
      ['5 Stars', analyticsSummary.ratingDistribution[5]],
      [''],
      ['DETAILED FEEDBACK DATA'],
      csvHeaders
    ];

    const allRows = [...summaryRows, ...csvRows];
    
    return allRows.map(row => row.join(',')).join('\\n');
  }

  /**
   * Generate HTML report
   */
  async generateHTMLReport(feedbackData, analyticsSummary, startDate, endDate) {
    const formatDate = (date) => date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Weekly Feedback Report - ${formatDate(startDate)} to ${formatDate(endDate)}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 30px 0; }
          .summary-card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; }
          .summary-card h3 { margin: 0 0 10px 0; color: #333; }
          .summary-card .value { font-size: 2em; font-weight: bold; color: #667eea; }
          .chart-container { margin: 30px 0; }
          .rating-bar { display: flex; align-items: center; margin: 10px 0; }
          .rating-label { width: 60px; font-weight: bold; }
          .rating-progress { flex: 1; height: 20px; background: #e9ecef; border-radius: 10px; margin: 0 10px; overflow: hidden; }
          .rating-fill { height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); }
          .rating-count { width: 40px; text-align: right; }
          .feedback-table { width: 100%; border-collapse: collapse; margin: 30px 0; }
          .feedback-table th, .feedback-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
          .feedback-table th { background: #f8f9fa; font-weight: bold; }
          .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
          .status-approved { background: #d4edda; color: #155724; }
          .status-pending { background: #fff3cd; color: #856404; }
          .status-rejected { background: #f8d7da; color: #721c24; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔮 SAMIA TAROT</h1>
            <h2>Weekly Feedback Report</h2>
            <p>${formatDate(startDate)} - ${formatDate(endDate)}</p>
          </div>
          
          <div class="content">
            <div class="summary-grid">
              <div class="summary-card">
                <h3>📊 Total Feedback</h3>
                <div class="value">${analyticsSummary.totalFeedback}</div>
              </div>
              
              <div class="summary-card">
                <h3>⭐ Average Rating</h3>
                <div class="value">${analyticsSummary.averageRating}/5</div>
              </div>
              
              <div class="summary-card">
                <h3>✅ Approval Rate</h3>
                <div class="value">${analyticsSummary.approvalRate}%</div>
              </div>
              
              <div class="summary-card">
                <h3>🔮 Most Reviewed Service</h3>
                <div class="value" style="font-size: 1.2em;">
                  ${Object.keys(analyticsSummary.mostReviewedServices)[0] || 'N/A'}
                </div>
              </div>
            </div>

            <div class="chart-container">
              <h3>📈 Rating Distribution</h3>
              ${[5,4,3,2,1].map(rating => {
                const count = analyticsSummary.ratingDistribution[rating];
                const percentage = analyticsSummary.totalFeedback > 0 ? 
                  (count / analyticsSummary.totalFeedback) * 100 : 0;
                return `
                  <div class="rating-bar">
                    <div class="rating-label">${rating} ⭐</div>
                    <div class="rating-progress">
                      <div class="rating-fill" style="width: ${percentage}%"></div>
                    </div>
                    <div class="rating-count">${count}</div>
                  </div>
                `;
              }).join('')}
            </div>

            <h3>📋 Detailed Feedback Data</h3>
            <table class="feedback-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Rating</th>
                  <th>Comment</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                ${feedbackData.slice(0, 50).map(feedback => `
                  <tr>
                    <td>${feedback.bookings?.service_type || 'N/A'}</td>
                    <td>${feedback.rating ? '⭐'.repeat(feedback.rating) : 'No rating'}</td>
                    <td>${feedback.comment ? feedback.comment.substring(0, 100) + '...' : 'No comment'}</td>
                    <td>
                      <span class="status-badge status-${feedback.status}">
                        ${feedback.status || 'Unknown'}
                      </span>
                    </td>
                    <td>${new Date(feedback.created_at).toLocaleDateString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            ${feedbackData.length > 50 ? `<p><em>Showing first 50 entries. Full data available in CSV attachment.</em></p>` : ''}
          </div>
          
          <div class="footer">
            <p>Generated on ${new Date().toLocaleString()}</p>
            <p>SAMIA TAROT - Automated Weekly Report System</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Get admin recipients for weekly reports
   */
  async getReportRecipients() {
    try {
      const { supabase } = require('../lib/supabase');
      
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role')
        .in('role', ['admin', 'super_admin'])
        .eq('notification_preferences->weekly_reports', true);

      if (error) {
        console.error('Error fetching report recipients:', error);
        return [];
      }

      return profiles || [];
    } catch (error) {
      console.error('Error in getReportRecipients:', error);
      return [];
    }
  }

  /**
   * Send report emails to admins
   */
  async sendReportEmails(recipients, csvData, htmlReport, startDate, endDate) {
    if (!this.emailTransporter) return;

    const formatDate = (date) => date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });

    const emailPromises = recipients.map(async (recipient) => {
      try {
        const mailOptions = {
          from: process.env.SENDGRID_FROM_EMAIL || process.env.SMTP_USER,
          to: recipient.email,
          subject: `📊 Weekly Feedback Report - ${formatDate(startDate)} to ${formatDate(endDate)}`,
          html: htmlReport,
          attachments: [
            {
              filename: `feedback-report-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.csv`,
              content: csvData,
              contentType: 'text/csv'
            }
          ]
        };

        await this.emailTransporter.sendMail(mailOptions);
        console.log(`✅ Weekly report sent to ${recipient.email}`);
      } catch (error) {
        console.error(`❌ Failed to send weekly report to ${recipient.email}:`, error);
      }
    });

    await Promise.allSettled(emailPromises);
  }

  /**
   * Save report to admin dashboard for download
   */
  async saveReportToAdminDashboard(csvData, htmlReport, startDate, endDate) {
    try {
      const { supabase } = require('../lib/supabase');
      
      const reportData = {
        type: 'weekly_feedback',
        period_start: startDate.toISOString(),
        period_end: endDate.toISOString(),
        csv_data: csvData,
        html_report: htmlReport,
        generated_at: new Date().toISOString(),
        available_until: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString() // 30 days
      };

      const { error } = await supabase
        .from('admin_reports')
        .insert(reportData);

      if (error) {
        console.error('Error saving report to admin dashboard:', error);
      } else {
        console.log('✅ Report saved to admin dashboard');
      }
    } catch (error) {
      console.error('Error in saveReportToAdminDashboard:', error);
    }
  }

  /**
   * Track report generation for analytics
   */
  async trackReportGeneration(feedbackCount, recipientCount) {
    try {
      const { supabase } = require('../lib/supabase');
      
      await supabase
        .from('report_analytics')
        .insert({
          type: 'weekly_feedback',
          feedback_count: feedbackCount,
          recipient_count: recipientCount,
          generated_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error tracking report generation:', error);
    }
  }

  /**
   * Notify admins of report generation errors
   */
  async notifyReportError(error) {
    try {
      if (this.emailTransporter) {
        const recipients = await this.getReportRecipients();
        
        const errorEmail = {
          from: process.env.SENDGRID_FROM_EMAIL || process.env.SMTP_USER,
          to: recipients.map(r => r.email),
          subject: '❌ Weekly Feedback Report Generation Failed',
          html: `
            <h2>Weekly Report Generation Error</h2>
            <p>The automated weekly feedback report failed to generate.</p>
            <p><strong>Error:</strong> ${error.message}</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            <p>Please check the system logs and contact technical support if needed.</p>
          `
        };

        await this.emailTransporter.sendMail(errorEmail);
      }
    } catch (emailError) {
      console.error('Error sending report error notification:', emailError);
    }
  }

  /**
   * Manual report generation (for testing or on-demand)
   */
  async generateManualReport(startDate, endDate) {
    console.log('📊 Generating manual feedback report...');
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Fetch feedback data
    const feedbackData = await this.fetchWeeklyFeedbackData(start, end);
    
    // Generate analytics summary
    const analyticsSummary = await this.generateAnalyticsSummary(feedbackData);

    // Create CSV export
    const csvData = await this.generateCSVReport(feedbackData, analyticsSummary);

    return {
      feedbackData,
      analyticsSummary,
      csvData,
      generatedAt: new Date().toISOString()
    };
  }
}

// Export singleton instance
module.exports = new WeeklyFeedbackReportService(); 