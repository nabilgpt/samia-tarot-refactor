import { useState, useEffect, useCallback } from 'react';
import { analyticsAPI } from '../api/analytics';

/**
 * Custom hook for analytics functionality
 * Provides easy access to analytics data and tracking functions
 */
export const useAnalytics = (userId = null, options = {}) => {
  const [data, setData] = useState({
    summary: null,
    userAnalytics: null,
    bookingAnalytics: null,
    paymentAnalytics: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { 
    timeRange = '30d', 
    autoRefresh = false, 
    refreshInterval = 300000 // 5 minutes
  } = options;

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const summary = await analyticsAPI.getAnalyticsSummary(timeRange);
      
      let userAnalytics = null;
      if (userId) {
        userAnalytics = await analyticsAPI.getUserAnalytics(userId, timeRange);
      }

      const bookingAnalytics = await analyticsAPI.getBookingAnalytics(timeRange);
      const paymentAnalytics = await analyticsAPI.getPaymentAnalytics(timeRange);

      setData({
        summary,
        userAnalytics,
        bookingAnalytics,
        paymentAnalytics
      });
    } catch (err) {
      setError(err.message);
      console.error('Analytics loading error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, timeRange]);

  // Track user events
  const trackEvent = useCallback(async (eventType, eventData = {}) => {
    if (!userId) return;
    
    try {
      await analyticsAPI.trackUserEvent(userId, eventType, eventData);
      // Optionally refresh data after tracking
      if (options.refreshAfterTrack) {
        loadAnalytics();
      }
    } catch (err) {
      console.error('Error tracking event:', err);
    }
  }, [userId, loadAnalytics, options.refreshAfterTrack]);

  // Track booking events
  const trackBookingEvent = useCallback(async (bookingId, eventType, eventData = {}) => {
    try {
      await analyticsAPI.trackBookingEvent(bookingId, eventType, eventData);
      if (options.refreshAfterTrack) {
        loadAnalytics();
      }
    } catch (err) {
      console.error('Error tracking booking event:', err);
    }
  }, [loadAnalytics, options.refreshAfterTrack]);

  // Track payment events
  const trackPaymentEvent = useCallback(async (paymentId, eventType, eventData = {}) => {
    try {
      await analyticsAPI.trackPaymentEvent(paymentId, eventType, eventData);
      if (options.refreshAfterTrack) {
        loadAnalytics();
      }
    } catch (err) {
      console.error('Error tracking payment event:', err);
    }
  }, [loadAnalytics, options.refreshAfterTrack]);

  // Initial load
  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(loadAnalytics, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, loadAnalytics]);

  return {
    data,
    loading,
    error,
    refetch: loadAnalytics,
    trackEvent,
    trackBookingEvent,
    trackPaymentEvent
  };
};

export default useAnalytics;
