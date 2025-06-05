import { supabase } from '../lib/supabase';

export class EmergencyAlertsService {
  /**
   * Create a new emergency alert
   * @param {Object} alertData - The alert data
   * @param {string} alertData.user_id - User ID who triggered the alert
   * @param {string} alertData.role - User role (client, reader, monitor, admin)
   * @param {string} alertData.message - Alert message
   * @param {string} alertData.location - Optional location data
   * @returns {Promise<Object>} Result object with success status and data
   */
  static async createAlert(alertData) {
    try {
      const { data, error } = await supabase
        .from('emergency_alerts')
        .insert([{
          user_id: alertData.user_id,
          role: alertData.role,
          message: alertData.message || 'Emergency button triggered',
          location: alertData.location || null,
          status: 'pending'
        }])
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: data,
        message: 'Emergency alert created successfully'
      };
    } catch (error) {
      console.error('Error creating emergency alert:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to create emergency alert'
      };
    }
  }

  /**
   * Get all emergency alerts for admin dashboard
   * @param {Object} filters - Optional filters
   * @param {string} filters.status - Filter by status (pending, acknowledged, resolved)
   * @param {number} filters.limit - Limit number of results
   * @returns {Promise<Object>} Result object with success status and data
   */
  static async getAlertsForAdmin(filters = {}) {
    try {
      let query = supabase
        .from('emergency_alerts')
        .select(`
          *,
          user_profile:profiles!emergency_alerts_user_id_fkey(
            first_name,
            last_name,
            avatar_url,
            role
          ),
          resolver:profiles!emergency_alerts_resolved_by_fkey(
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        message: 'Emergency alerts retrieved successfully'
      };
    } catch (error) {
      console.error('Error fetching emergency alerts:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to fetch emergency alerts'
      };
    }
  }

  /**
   * Update alert status (acknowledge or resolve)
   * @param {string} alertId - Alert ID to update
   * @param {string} status - New status (acknowledged, resolved)
   * @param {string} resolvedBy - User ID who resolved the alert
   * @returns {Promise<Object>} Result object with success status and data
   */
  static async updateAlertStatus(alertId, status, resolvedBy = null) {
    try {
      const updateData = {
        status: status,
        updated_at: new Date().toISOString()
      };

      if (status === 'resolved' && resolvedBy) {
        updateData.resolved_by = resolvedBy;
        updateData.resolved_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('emergency_alerts')
        .update(updateData)
        .eq('id', alertId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: data,
        message: `Alert ${status} successfully`
      };
    } catch (error) {
      console.error('Error updating emergency alert:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to update emergency alert'
      };
    }
  }

  /**
   * Get count of pending alerts for admin notification badge
   * @returns {Promise<Object>} Result object with success status and count
   */
  static async getPendingAlertsCount() {
    try {
      const { count, error } = await supabase
        .from('emergency_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (error) throw error;

      return {
        success: true,
        count: count || 0,
        message: 'Pending alerts count retrieved successfully'
      };
    } catch (error) {
      console.error('Error fetching pending alerts count:', error);
      return {
        success: false,
        error: error.message,
        count: 0,
        message: 'Failed to fetch pending alerts count'
      };
    }
  }

  /**
   * Subscribe to real-time emergency alerts for admin dashboard
   * @param {Function} callback - Callback function to handle new alerts
   * @returns {Object} Subscription object
   */
  static subscribeToAlerts(callback) {
    try {
      const subscription = supabase
        .channel('emergency_alerts')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'emergency_alerts'
          },
          (payload) => {
            console.log('Emergency alert change:', payload);
            if (callback && typeof callback === 'function') {
              callback(payload);
            }
          }
        )
        .subscribe();

      return {
        success: true,
        subscription: subscription,
        message: 'Subscribed to emergency alerts'
      };
    } catch (error) {
      console.error('Error subscribing to emergency alerts:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to subscribe to emergency alerts'
      };
    }
  }

  /**
   * Get user's location (if available)
   * @returns {Promise<string|null>} Location string or null
   */
  static async getUserLocation() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          resolve(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        },
        (error) => {
          console.warn('Location access denied or failed:', error);
          resolve(null);
        },
        {
          timeout: 5000,
          enableHighAccuracy: false
        }
      );
    });
  }

  /**
   * Send emergency alert with location detection
   * @param {string} userId - User ID
   * @param {string} userRole - User role
   * @param {string} message - Optional custom message
   * @returns {Promise<Object>} Result object
   */
  static async sendEmergencyAlert(userId, userRole, message = 'Emergency button triggered') {
    try {
      // Get user location if available
      const location = await this.getUserLocation();

      // Create the alert
      const result = await this.createAlert({
        user_id: userId,
        role: userRole,
        message: message,
        location: location
      });

      if (result.success) {
        console.log('Emergency alert sent successfully:', result.data);
        
        // Optional: Trigger additional notifications here
        // e.g., email, SMS, push notifications
        this.triggerAdditionalNotifications(result.data);
      }

      return result;
    } catch (error) {
      console.error('Error sending emergency alert:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to send emergency alert'
      };
    }
  }

  /**
   * Trigger additional notifications (email, SMS, etc.)
   * @param {Object} alertData - Alert data
   */
  static async triggerAdditionalNotifications(alertData) {
    try {
      // This could be extended to send emails, SMS, or push notifications
      // For now, we'll just log it
      console.log('Additional notifications triggered for alert:', alertData.id);
      
      // Example: Send to webhook endpoint
      // await fetch('/api/emergency/webhook', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(alertData)
      // });
    } catch (error) {
      console.error('Error triggering additional notifications:', error);
    }
  }
}

export default EmergencyAlertsService; 