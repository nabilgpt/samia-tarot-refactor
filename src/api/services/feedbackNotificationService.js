/**
 * 🚨 FEEDBACK NOTIFICATION SERVICE
 * 
 * Real-time notification system for Admin-Moderated Feedback
 * Implements Prompt 1: Feedback Moderation Notifications
 */

import nodemailer from 'nodemailer';
import twilio from 'twilio';

class FeedbackNotificationService {
  constructor() {
    this.emailTransporter = null;
    this.twilioClient = null;
    this.initializeServices();
  }

  /**
   * Initialize email and SMS services
   */
  initializeServices() {
    // Initialize Email (SMTP/SendGrid)
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
      console.log('✅ Email service initialized (SMTP)');
    } else if (process.env.SENDGRID_API_KEY) {
      this.emailTransporter = nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY
        }
      });
      console.log('✅ Email service initialized (SendGrid)');
    } else {
      console.warn('⚠️ No email service configured');
    }

    // Initialize SMS (Twilio)
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      console.log('✅ SMS service initialized (Twilio)');
    } else {
      console.warn('⚠️ No SMS service configured');
    }
  }

  /**
   * 🔥 MAIN NOTIFICATION TRIGGER
   * Called whenever new feedback is submitted and pending approval
   */
  async notifyPendingFeedback(feedbackData) {
    try {
      console.log('🚨 New pending feedback detected:', feedbackData.id);

      // Get all admin/super admin recipients
      const recipients = await this.getAdminRecipients();
      
      if (recipients.length === 0) {
        console.warn('⚠️ No admin recipients found for feedback notifications');
        return;
      }

      // Prepare notification content
      const notificationContent = this.prepareNotificationContent(feedbackData);

      // Send notifications via all enabled channels
      const notificationPromises = [];

      // Email notifications
      if (this.emailTransporter) {
        notificationPromises.push(
          this.sendEmailNotifications(recipients, notificationContent)
        );
      }

      // SMS notifications (if enabled in settings)
      if (this.twilioClient && await this.isSMSEnabled()) {
        notificationPromises.push(
          this.sendSMSNotifications(recipients, notificationContent)
        );
      }

      // In-app notifications
      notificationPromises.push(
        this.sendInAppNotifications(recipients, notificationContent)
      );

      // Execute all notifications
      await Promise.allSettled(notificationPromises);

      console.log('✅ Feedback notifications sent successfully');
      
      // Track notification event
      await this.trackNotificationEvent(feedbackData.id, recipients.length);

    } catch (error) {
      console.error('❌ Error sending feedback notifications:', error);
      throw error;
    }
  }

  /**
   * Get all admin and super admin recipients
   */
  async getAdminRecipients() {
    try {
      const { supabase } = require('../lib/supabase');
      
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email, phone, full_name, role')
        .in('role', ['admin', 'super_admin'])
        .eq('notification_preferences->feedback_alerts', true);

      if (error) {
        console.error('Error fetching admin recipients:', error);
        return [];
      }

      return profiles || [];
    } catch (error) {
      console.error('Error in getAdminRecipients:', error);
      return [];
    }
  }

  /**
   * Prepare notification content
   */
  prepareNotificationContent(feedbackData) {
    const {
      id,
      service_type,
      client_id,
      reader_id,
      rating,
      comment,
      created_at,
      booking_id
    } = feedbackData;

    // Generate moderation link
    const moderationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/feedback/moderate/${id}`;

    return {
      subject: `🔔 New Feedback Pending Approval - ${service_type}`,
      title: 'New Feedback Awaiting Moderation',
      feedbackId: id,
      serviceType: service_type,
      clientId: client_id?.substring(0, 8) + '...' || 'Anonymous',
      readerId: reader_id?.substring(0, 8) + '...' || 'N/A',
      rating: rating || 'No rating',
      comment: comment ? comment.substring(0, 100) + '...' : 'No comment',
      submissionTime: new Date(created_at).toLocaleString(),
      moderationLink,
      bookingId: booking_id?.substring(0, 8) + '...' || 'N/A'
    };
  }

  /**
   * Send email notifications to all admins
   */
  async sendEmailNotifications(recipients, content) {
    if (!this.emailTransporter) return;

    const emailPromises = recipients
      .filter(recipient => recipient.email)
      .map(recipient => this.sendSingleEmail(recipient, content));

    await Promise.allSettled(emailPromises);
  }

  /**
   * Send single email notification
   */
  async sendSingleEmail(recipient, content) {
    try {
      const mailOptions = {
        from: process.env.SENDGRID_FROM_EMAIL || process.env.SMTP_USER,
        to: recipient.email,
        subject: content.subject,
        html: this.generateEmailHTML(recipient, content)
      };

      await this.emailTransporter.sendMail(mailOptions);
      console.log(`✅ Email sent to ${recipient.email}`);
    } catch (error) {
      console.error(`❌ Failed to send email to ${recipient.email}:`, error);
    }
  }

  /**
   * Generate HTML email template
   */
  generateEmailHTML(recipient, content) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${content.subject}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; }
          .feedback-details { background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; }
          .detail-row { margin: 10px 0; }
          .label { font-weight: bold; color: #333; }
          .value { color: #666; margin-left: 10px; }
          .cta-button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
          .urgent { color: #e74c3c; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔮 SAMIA TAROT</h1>
            <h2>${content.title}</h2>
          </div>
          
          <div class="content">
            <p>Hello <strong>${recipient.full_name || recipient.email}</strong>,</p>
            
            <p class="urgent">⚠️ New feedback has been submitted and requires your immediate attention for moderation.</p>
            
            <div class="feedback-details">
              <h3>📋 Feedback Details:</h3>
              
              <div class="detail-row">
                <span class="label">🆔 Feedback ID:</span>
                <span class="value">${content.feedbackId}</span>
              </div>
              
              <div class="detail-row">
                <span class="label">🔮 Service Type:</span>
                <span class="value">${content.serviceType}</span>
              </div>
              
              <div class="detail-row">
                <span class="label">👤 Client:</span>
                <span class="value">${content.clientId}</span>
              </div>
              
              <div class="detail-row">
                <span class="label">🔮 Reader:</span>
                <span class="value">${content.readerId}</span>
              </div>
              
              <div class="detail-row">
                <span class="label">⭐ Rating:</span>
                <span class="value">${content.rating}</span>
              </div>
              
              <div class="detail-row">
                <span class="label">💬 Comment:</span>
                <span class="value">${content.comment}</span>
              </div>
              
              <div class="detail-row">
                <span class="label">📅 Submitted:</span>
                <span class="value">${content.submissionTime}</span>
              </div>
              
              <div class="detail-row">
                <span class="label">📋 Booking:</span>
                <span class="value">${content.bookingId}</span>
              </div>
            </div>
            
            <p><strong>Action Required:</strong> Please review and moderate this feedback as soon as possible.</p>
            
            <div style="text-align: center;">
              <a href="${content.moderationLink}" class="cta-button">
                🔍 Moderate Feedback Now
              </a>
            </div>
            
            <p><small>💡 <strong>Tip:</strong> You can also access the moderation queue from your admin dashboard.</small></p>
          </div>
          
          <div class="footer">
            <p>SAMIA TAROT Admin Notification System</p>
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Send SMS notifications
   */
  async sendSMSNotifications(recipients, content) {
    if (!this.twilioClient) return;

    const smsPromises = recipients
      .filter(recipient => recipient.phone)
      .map(recipient => this.sendSingleSMS(recipient, content));

    await Promise.allSettled(smsPromises);
  }

  /**
   * Send single SMS notification
   */
  async sendSingleSMS(recipient, content) {
    try {
      const message = `🔮 SAMIA TAROT ALERT
      
New feedback pending approval:
📋 ID: ${content.feedbackId}
🔮 Service: ${content.serviceType}
⭐ Rating: ${content.rating}
📅 Time: ${content.submissionTime}

Moderate now: ${content.moderationLink}`;

      await this.twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: recipient.phone
      });

      console.log(`✅ SMS sent to ${recipient.phone}`);
    } catch (error) {
      console.error(`❌ Failed to send SMS to ${recipient.phone}:`, error);
    }
  }

  /**
   * Send in-app notifications
   */
  async sendInAppNotifications(recipients, content) {
    try {
      const { supabase } = require('../lib/supabase');

      const notifications = recipients.map(recipient => ({
        user_id: recipient.id,
        type: 'feedback_moderation',
        title: 'New Feedback Pending Approval',
        message: `New ${content.serviceType} feedback (Rating: ${content.rating}) requires moderation`,
        data: {
          feedback_id: content.feedbackId,
          service_type: content.serviceType,
          moderation_link: content.moderationLink
        },
        created_at: new Date().toISOString(),
        read: false
      }));

      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) {
        console.error('Error creating in-app notifications:', error);
      } else {
        console.log(`✅ In-app notifications created for ${recipients.length} admins`);
      }
    } catch (error) {
      console.error('Error in sendInAppNotifications:', error);
    }
  }

  /**
   * Check if SMS notifications are enabled
   */
  async isSMSEnabled() {
    try {
      const { supabase } = require('../lib/supabase');
      
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'sms_notifications_enabled')
        .single();

      if (error || !data) return false;
      return data.value === 'true' || data.value === true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Track notification event for analytics
   */
  async trackNotificationEvent(feedbackId, recipientCount) {
    try {
      const { supabase } = require('../lib/supabase');
      
      await supabase
        .from('notification_analytics')
        .insert({
          type: 'feedback_moderation',
          feedback_id: feedbackId,
          recipient_count: recipientCount,
          sent_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error tracking notification event:', error);
    }
  }

  /**
   * Get pending feedback count for badge display
   */
  async getPendingFeedbackCount() {
    try {
      const { supabase } = require('../lib/supabase');
      
      const { count, error } = await supabase
        .from('service_feedback')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (error) {
        console.error('Error getting pending feedback count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getPendingFeedbackCount:', error);
      return 0;
    }
  }

  /**
   * Update notification preferences for admin
   */
  async updateNotificationPreferences(adminId, preferences) {
    try {
      const { supabase } = require('../lib/supabase');
      
      const { error } = await supabase
        .from('profiles')
        .update({
          notification_preferences: preferences,
          updated_at: new Date().toISOString()
        })
        .eq('id', adminId);

      if (error) {
        console.error('Error updating notification preferences:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateNotificationPreferences:', error);
      return false;
    }
  }
}

// Export singleton instance
module.exports = new FeedbackNotificationService(); 
