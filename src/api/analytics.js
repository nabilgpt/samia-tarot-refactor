const { supabase } = require('./lib/supabase');

/**
 * Core Analytics API for SAMIA TAROT Platform
 * Handles all analytics data collection and retrieval
 */

const analyticsAPI = {
  // User Analytics
  async getUserAnalytics(userId, timeRange = '30d') {
    try {
      const { data, error } = await supabase
        .from('user_analytics')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', this.getTimeRangeDate(timeRange))
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('getUserAnalytics error:', error);
      return [];
    }
  },

  // Booking Analytics
  async getBookingAnalytics(timeRange = '30d') {
    try {
      const { data, error } = await supabase
        .from('booking_analytics')
        .select('*')
        .gte('created_at', this.getTimeRangeDate(timeRange))
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('getBookingAnalytics error:', error);
      return [];
    }
  },

  // Payment Analytics
  async getPaymentAnalytics(timeRange = '30d') {
    try {
      const { data, error } = await supabase
        .from('payment_analytics')
        .select('*')
        .gte('created_at', this.getTimeRangeDate(timeRange))
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('getPaymentAnalytics error:', error);
      return [];
    }
  },

  // Reader Performance Analytics
  async getReaderPerformance(readerId) {
    try {
      const { data, error } = await supabase
        .from('reader_performance')
        .select('*')
        .eq('reader_id', readerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('getReaderPerformance error:', error);
      return [];
    }
  },

  // System Analytics
  async getSystemAnalytics(timeRange = '7d') {
    try {
      const { data, error } = await supabase
        .from('system_analytics')
        .select('*')
        .gte('created_at', this.getTimeRangeDate(timeRange))
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('getSystemAnalytics error:', error);
      return [];
    }
  },

  // Track User Events
  async trackUserEvent(userId, eventType, eventData = {}) {
    try {
      const { data, error } = await supabase
        .from('user_analytics')
        .insert({
          user_id: userId,
          event_type: eventType,
          event_data: eventData,
          created_at: new Date().toISOString()
        });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('trackUserEvent error:', error);
      return null;
    }
  },

  // Track Booking Events
  async trackBookingEvent(bookingId, eventType, eventData = {}) {
    try {
      const { data, error } = await supabase
        .from('booking_analytics')
        .insert({
          booking_id: bookingId,
          event_type: eventType,
          event_data: eventData,
          created_at: new Date().toISOString()
        });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('trackBookingEvent error:', error);
      return null;
    }
  },

  // Track Payment Events
  async trackPaymentEvent(paymentId, eventType, eventData = {}) {
    try {
      const { data, error } = await supabase
        .from('payment_analytics')
        .insert({
          payment_id: paymentId,
          event_type: eventType,
          event_data: eventData,
          created_at: new Date().toISOString()
        });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('trackPaymentEvent error:', error);
      return null;
    }
  },

  // Get Analytics Summary
  async getAnalyticsSummary(timeRange = '30d') {
    try {
      const [userStats, bookingStats, paymentStats] = await Promise.all([
        this.getUserStats(timeRange),
        this.getBookingStats(timeRange),
        this.getPaymentStats(timeRange)
      ]);

      return {
        users: userStats,
        bookings: bookingStats,
        payments: paymentStats,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('getAnalyticsSummary error:', error);
      return {
        users: { totalEvents: 0, uniqueUsers: 0, eventTypes: {} },
        bookings: { totalEvents: 0, eventTypes: {} },
        payments: { totalEvents: 0, totalRevenue: 0, eventTypes: {} },
        generatedAt: new Date().toISOString()
      };
    }
  },

  // Helper Methods
  async getUserStats(timeRange) {
    try {
      const { data, error } = await supabase
        .from('user_analytics')
        .select('event_type, created_at, user_id')
        .gte('created_at', this.getTimeRangeDate(timeRange));

      if (error) throw error;
      
      return {
        totalEvents: data.length,
        uniqueUsers: new Set(data.map(d => d.user_id)).size,
        eventTypes: this.groupBy(data, 'event_type')
      };
    } catch (error) {
      console.error('getUserStats error:', error);
      return { totalEvents: 0, uniqueUsers: 0, eventTypes: {} };
    }
  },

  async getBookingStats(timeRange) {
    try {
      const { data, error } = await supabase
        .from('booking_analytics')
        .select('event_type, created_at')
        .gte('created_at', this.getTimeRangeDate(timeRange));

      if (error) throw error;
      
      return {
        totalEvents: data.length,
        eventTypes: this.groupBy(data, 'event_type')
      };
    } catch (error) {
      console.error('getBookingStats error:', error);
      return { totalEvents: 0, eventTypes: {} };
    }
  },

  async getPaymentStats(timeRange) {
    try {
      const { data, error } = await supabase
        .from('payment_analytics')
        .select('event_type, event_data, created_at')
        .gte('created_at', this.getTimeRangeDate(timeRange));

      if (error) throw error;
      
      const totalRevenue = data
        .filter(d => d.event_data?.amount)
        .reduce((sum, d) => sum + (d.event_data.amount || 0), 0);
      
      return {
        totalEvents: data.length,
        totalRevenue,
        eventTypes: this.groupBy(data, 'event_type')
      };
    } catch (error) {
      console.error('getPaymentStats error:', error);
      return { totalEvents: 0, totalRevenue: 0, eventTypes: {} };
    }
  },

  // Utility Functions
  getTimeRangeDate(timeRange) {
    const now = new Date();
    const days = parseInt(timeRange.replace('d', ''));
    const pastDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
    return pastDate.toISOString();
  },

  groupBy(array, key) {
    return array.reduce((result, item) => {
      (result[item[key]] = result[item[key]] || []).push(item);
      return result;
    }, {});
  }
};

module.exports = analyticsAPI;
