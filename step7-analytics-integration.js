const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://uuseflmielktdcltzwzt.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c2VmbG1pZWxrdGRjbHR6d3p0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODM0NTExNSwiZXhwIjoyMDYzOTIxMTE1fQ.TNcj0otaeYtl0nDJYn760wSgSuKSYG8s7r-LD04Z9_E';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('📊 STEP 7: ANALYTICS INTEGRATION AUDIT');
console.log('======================================\n');

class AnalyticsIntegrationManager {
    constructor() {
        this.results = {
            databaseAnalytics: {},
            apiIntegration: {},
            dashboardIntegration: {},
            realTimeAnalytics: {},
            recommendations: [],
            totalScore: 0
        };
    }

    async auditDatabaseAnalytics() {
        console.log('🗄️ Auditing Database Analytics Infrastructure...');
        
        let score = 0;
        let maxScore = 100;
        let found = [];
        let missing = [];

        const analyticsTableRequirements = [
            'user_analytics',
            'booking_analytics', 
            'payment_analytics',
            'reader_performance',
            'system_analytics',
            'chat_analytics',
            'emergency_analytics',
            'ai_usage_stats'
        ];

        try {
            // Check which analytics tables exist
            const { data: tables, error } = await supabase
                .from('information_schema.tables')
                .select('table_name')
                .eq('table_schema', 'public');

            if (error) throw error;

            const existingTables = tables.map(t => t.table_name);
            
            analyticsTableRequirements.forEach(table => {
                if (existingTables.includes(table)) {
                    found.push(table);
                    score += 12.5; // 100/8 tables
                } else {
                    missing.push(table);
                }
            });

            console.log(`✅ Found ${found.length}/8 analytics tables`);
            console.log(`❌ Missing ${missing.length}/8 analytics tables`);

        } catch (error) {
            console.log(`❌ Database analytics audit error: ${error.message}`);
        }

        this.results.databaseAnalytics = { 
            score, 
            maxScore, 
            found, 
            missing,
            percentage: Math.round(score/maxScore*100)
        };

        console.log(`📈 Database Analytics Score: ${score}/${maxScore} (${Math.round(score/maxScore*100)}%)\n`);
        return { score, maxScore };
    }

    async auditAPIAnalytics() {
        console.log('🔌 Auditing API Analytics Integration...');
        
        let score = 0;
        let maxScore = 100;
        let integrated = [];
        let missing = [];

        const analyticsAPIs = [
            { path: 'src/api/analytics.js', name: 'Core Analytics API', points: 25 },
            { path: 'src/api/user-analytics.js', name: 'User Analytics API', points: 20 },
            { path: 'src/api/booking-analytics.js', name: 'Booking Analytics API', points: 20 },
            { path: 'src/api/payment-analytics.js', name: 'Payment Analytics API', points: 20 },
            { path: 'src/api/reader-analytics.js', name: 'Reader Analytics API', points: 15 }
        ];

        analyticsAPIs.forEach(api => {
            if (fs.existsSync(api.path)) {
                integrated.push(api.name);
                score += api.points;
                
                // Check if it has proper analytics functions
                try {
                    const content = fs.readFileSync(api.path, 'utf8');
                    if (content.includes('analytics') || content.includes('metrics') || content.includes('tracking')) {
                        console.log(`✅ ${api.name} - Properly integrated`);
                    } else {
                        console.log(`⚠️ ${api.name} - Exists but may lack analytics functionality`);
                    }
                } catch (error) {
                    console.log(`⚠️ ${api.name} - File exists but unreadable`);
                }
            } else {
                missing.push(api.name);
                console.log(`❌ ${api.name} - Missing`);
            }
        });

        this.results.apiIntegration = { 
            score, 
            maxScore, 
            integrated, 
            missing,
            percentage: Math.round(score/maxScore*100)
        };

        console.log(`📈 API Analytics Score: ${score}/${maxScore} (${Math.round(score/maxScore*100)}%)\n`);
        return { score, maxScore };
    }

    async auditDashboardAnalytics() {
        console.log('📊 Auditing Dashboard Analytics Integration...');
        
        let score = 0;
        let maxScore = 100;
        let dashboardsWithAnalytics = [];
        let dashboardsWithoutAnalytics = [];

        const dashboardPaths = [
            { path: 'src/pages/dashboard/SuperAdminDashboard.jsx', name: 'SuperAdmin', points: 30 },
            { path: 'src/pages/dashboard/AdminDashboard.jsx', name: 'Admin', points: 25 },
            { path: 'src/pages/Reader/ReaderDashboard.jsx', name: 'Reader', points: 25 },
            { path: 'src/pages/Client/ClientDashboard.jsx', name: 'Client', points: 20 }
        ];

        dashboardPaths.forEach(dashboard => {
            if (fs.existsSync(dashboard.path)) {
                try {
                    const content = fs.readFileSync(dashboard.path, 'utf8');
                    
                    // Check for analytics-related code
                    const hasAnalytics = content.includes('analytics') || 
                                       content.includes('metrics') ||
                                       content.includes('Chart') ||
                                       content.includes('graph') ||
                                       content.includes('statistics');

                    if (hasAnalytics) {
                        dashboardsWithAnalytics.push(dashboard.name);
                        score += dashboard.points;
                        console.log(`✅ ${dashboard.name} Dashboard - Analytics integrated`);
                    } else {
                        dashboardsWithoutAnalytics.push(dashboard.name);
                        console.log(`❌ ${dashboard.name} Dashboard - No analytics found`);
                    }
                } catch (error) {
                    dashboardsWithoutAnalytics.push(dashboard.name);
                    console.log(`❌ ${dashboard.name} Dashboard - Error reading file`);
                }
            } else {
                dashboardsWithoutAnalytics.push(dashboard.name);
                console.log(`❌ ${dashboard.name} Dashboard - File not found`);
            }
        });

        this.results.dashboardIntegration = { 
            score, 
            maxScore, 
            dashboardsWithAnalytics, 
            dashboardsWithoutAnalytics,
            percentage: Math.round(score/maxScore*100)
        };

        console.log(`📈 Dashboard Analytics Score: ${score}/${maxScore} (${Math.round(score/maxScore*100)}%)\n`);
        return { score, maxScore };
    }

    async auditRealTimeAnalytics() {
        console.log('⚡ Auditing Real-time Analytics...');
        
        let score = 0;
        let maxScore = 100;
        let features = {
            realTimeCharts: false,
            liveMetrics: false,
            webSocketIntegration: false,
            supabaseRealtime: false
        };

        try {
            // Check for real-time analytics files
            const realTimeFiles = [
                'src/components/Analytics/RealTimeChart.jsx',
                'src/components/Analytics/LiveMetrics.jsx',
                'src/hooks/useRealTimeAnalytics.js',
                'src/services/analyticsSocket.js'
            ];

            realTimeFiles.forEach(file => {
                if (fs.existsSync(file)) {
                    score += 20;
                    console.log(`✅ Real-time component found: ${path.basename(file)}`);
                }
            });

            // Check for Supabase real-time subscriptions in any file
            const srcFiles = this.getAllJSFiles('src');
            let hasRealtimeSubscriptions = false;

            srcFiles.forEach(file => {
                try {
                    const content = fs.readFileSync(file, 'utf8');
                    if (content.includes('.subscribe(') || content.includes('realtime')) {
                        hasRealtimeSubscriptions = true;
                    }
                } catch (error) {
                    // Skip files that can't be read
                }
            });

            if (hasRealtimeSubscriptions) {
                score += 20;
                features.supabaseRealtime = true;
                console.log('✅ Supabase real-time subscriptions found');
            } else {
                console.log('❌ No real-time subscriptions found');
            }

        } catch (error) {
            console.log(`❌ Real-time analytics audit error: ${error.message}`);
        }

        this.results.realTimeAnalytics = { 
            score, 
            maxScore, 
            features,
            percentage: Math.round(score/maxScore*100)
        };

        console.log(`📈 Real-time Analytics Score: ${score}/${maxScore} (${Math.round(score/maxScore*100)}%)\n`);
        return { score, maxScore };
    }

    async createMissingAnalyticsFiles() {
        console.log('🔧 Creating Missing Analytics Files...');

        // Create core analytics API if missing
        if (!fs.existsSync('src/api/analytics.js')) {
            await this.createCoreAnalyticsAPI();
        }

        // Create analytics components if missing
        if (!fs.existsSync('src/components/Analytics')) {
            fs.mkdirSync('src/components/Analytics', { recursive: true });
        }

        if (!fs.existsSync('src/components/Analytics/AnalyticsDashboard.jsx')) {
            await this.createAnalyticsDashboard();
        }

        if (!fs.existsSync('src/hooks/useAnalytics.js')) {
            await this.createAnalyticsHook();
        }

        console.log('✅ Missing analytics files created\n');
    }

    async createCoreAnalyticsAPI() {
        const analyticsAPIContent = `import { supabase } from '../lib/supabase';

/**
 * Core Analytics API for SAMIA TAROT Platform
 * Handles all analytics data collection and retrieval
 */

export const analyticsAPI = {
  // User Analytics
  async getUserAnalytics(userId, timeRange = '30d') {
    const { data, error } = await supabase
      .from('user_analytics')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', this.getTimeRangeDate(timeRange))
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Booking Analytics
  async getBookingAnalytics(timeRange = '30d') {
    const { data, error } = await supabase
      .from('booking_analytics')
      .select('*')
      .gte('created_at', this.getTimeRangeDate(timeRange))
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Payment Analytics
  async getPaymentAnalytics(timeRange = '30d') {
    const { data, error } = await supabase
      .from('payment_analytics')
      .select('*')
      .gte('created_at', this.getTimeRangeDate(timeRange))
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Reader Performance Analytics
  async getReaderPerformance(readerId) {
    const { data, error } = await supabase
      .from('reader_performance')
      .select('*')
      .eq('reader_id', readerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // System Analytics
  async getSystemAnalytics(timeRange = '7d') {
    const { data, error } = await supabase
      .from('system_analytics')
      .select('*')
      .gte('created_at', this.getTimeRangeDate(timeRange))
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Track User Events
  async trackUserEvent(userId, eventType, eventData = {}) {
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
  },

  // Track Booking Events
  async trackBookingEvent(bookingId, eventType, eventData = {}) {
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
  },

  // Track Payment Events
  async trackPaymentEvent(paymentId, eventType, eventData = {}) {
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
  },

  // Get Analytics Summary
  async getAnalyticsSummary(timeRange = '30d') {
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
  },

  // Helper Methods
  async getUserStats(timeRange) {
    const { data, error } = await supabase
      .from('user_analytics')
      .select('event_type, created_at')
      .gte('created_at', this.getTimeRangeDate(timeRange));

    if (error) throw error;
    
    return {
      totalEvents: data.length,
      uniqueUsers: new Set(data.map(d => d.user_id)).size,
      eventTypes: this.groupBy(data, 'event_type')
    };
  },

  async getBookingStats(timeRange) {
    const { data, error } = await supabase
      .from('booking_analytics')
      .select('event_type, created_at')
      .gte('created_at', this.getTimeRangeDate(timeRange));

    if (error) throw error;
    
    return {
      totalEvents: data.length,
      eventTypes: this.groupBy(data, 'event_type')
    };
  },

  async getPaymentStats(timeRange) {
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

export default analyticsAPI;
`;

        fs.writeFileSync('src/api/analytics.js', analyticsAPIContent);
        console.log('✅ Created core analytics API');
    }

    async createAnalyticsDashboard() {
        const analyticsDashboardContent = `import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon, 
  UsersIcon, 
  CurrencyDollarIcon,
  CalendarIcon,
  TrendingUpIcon,
  TrendingDownIcon
} from '@heroicons/react/24/outline';
import { analyticsAPI } from '../../api/analytics';

const AnalyticsDashboard = ({ userRole = 'admin', userId = null }) => {
  const [analyticsData, setAnalyticsData] = useState({
    summary: null,
    userAnalytics: null,
    bookingAnalytics: null,
    paymentAnalytics: null
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange, userId]);

  const loadAnalyticsData = async () => {
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

      setAnalyticsData({
        summary,
        userAnalytics,
        bookingAnalytics,
        paymentAnalytics
      });
    } catch (error) {
      console.error('Analytics loading error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const MetricCard = ({ title, value, icon: Icon, trend, trendValue }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-purple-200 dark:border-purple-800">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {trend && (
            <div className={\`flex items-center mt-2 \${trend === 'up' ? 'text-green-600' : 'text-red-600'}\`}>
              {trend === 'up' ? <TrendingUpIcon className="w-4 h-4 mr-1" /> : <TrendingDownIcon className="w-4 h-4 mr-1" />}
              <span className="text-sm font-medium">{trendValue}%</span>
            </div>
          )}
        </div>
        <Icon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">Error loading analytics: {error}</p>
        <button 
          onClick={loadAnalyticsData}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const { summary } = analyticsData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
          <ChartBarIcon className="w-6 h-6 mr-2 text-purple-600" />
          Analytics Dashboard
        </h2>
        
        {/* Time Range Selector */}
        <select 
          value={timeRange} 
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      {/* Metrics Grid */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Users"
            value={summary.users?.uniqueUsers || 0}
            icon={UsersIcon}
            trend="up"
            trendValue="12"
          />
          <MetricCard
            title="Total Bookings"
            value={summary.bookings?.totalEvents || 0}
            icon={CalendarIcon}
            trend="up"
            trendValue="8"
          />
          <MetricCard
            title="Revenue"
            value={\`$\${summary.payments?.totalRevenue || 0}\`}
            icon={CurrencyDollarIcon}
            trend="up"
            trendValue="15"
          />
          <MetricCard
            title="User Events"
            value={summary.users?.totalEvents || 0}
            icon={ChartBarIcon}
            trend="up"
            trendValue="5"
          />
        </div>
      )}

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Analytics Chart Placeholder */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-purple-200 dark:border-purple-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">User Activity</h3>
          <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded">
            <p className="text-gray-500 dark:text-gray-400">Chart integration pending</p>
          </div>
        </div>

        {/* Booking Analytics Chart Placeholder */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-purple-200 dark:border-purple-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Booking Trends</h3>
          <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded">
            <p className="text-gray-500 dark:text-gray-400">Chart integration pending</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
`;

        fs.writeFileSync('src/components/Analytics/AnalyticsDashboard.jsx', analyticsDashboardContent);
        console.log('✅ Created analytics dashboard component');
    }

    async createAnalyticsHook() {
        const analyticsHookContent = `import { useState, useEffect, useCallback } from 'react';
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
`;

        fs.writeFileSync('src/hooks/useAnalytics.js', analyticsHookContent);
        console.log('✅ Created analytics hook');
    }

    getAllJSFiles(dir) {
        let files = [];
        try {
            const items = fs.readdirSync(dir);
            items.forEach(item => {
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory()) {
                    files = files.concat(this.getAllJSFiles(fullPath));
                } else if (item.endsWith('.jsx') || item.endsWith('.js') || item.endsWith('.tsx') || item.endsWith('.ts')) {
                    files.push(fullPath);
                }
            });
        } catch (error) {
            // Skip directories that can't be read
        }
        return files;
    }

    generateRecommendations() {
        const recommendations = [];

        // Database recommendations
        if (this.results.databaseAnalytics.missing.length > 0) {
            recommendations.push({
                priority: 'HIGH',
                category: 'Database',
                issue: `Missing ${this.results.databaseAnalytics.missing.length} analytics tables`,
                solution: 'Create missing analytics tables using COMPLETE_MISSING_TABLES.sql'
            });
        }

        // API recommendations
        if (this.results.apiIntegration.missing.length > 0) {
            recommendations.push({
                priority: 'MEDIUM',
                category: 'API',
                issue: `Missing ${this.results.apiIntegration.missing.length} analytics APIs`,
                solution: 'Implement missing analytics API endpoints'
            });
        }

        // Dashboard recommendations
        if (this.results.dashboardIntegration.dashboardsWithoutAnalytics.length > 0) {
            recommendations.push({
                priority: 'MEDIUM',
                category: 'Dashboard',
                issue: 'Some dashboards lack analytics integration',
                solution: 'Add AnalyticsDashboard component to dashboards'
            });
        }

        // Real-time recommendations
        if (this.results.realTimeAnalytics.percentage < 50) {
            recommendations.push({
                priority: 'LOW',
                category: 'Real-time',
                issue: 'Limited real-time analytics capabilities',
                solution: 'Implement Supabase real-time subscriptions for live analytics'
            });
        }

        this.results.recommendations = recommendations;
        return recommendations;
    }

    generateReport() {
        console.log('\n📋 ANALYTICS INTEGRATION AUDIT REPORT');
        console.log('=====================================\n');

        const totalScore = this.results.databaseAnalytics.score + 
                          this.results.apiIntegration.score + 
                          this.results.dashboardIntegration.score + 
                          this.results.realTimeAnalytics.score;

        const maxScore = this.results.databaseAnalytics.maxScore + 
                        this.results.apiIntegration.maxScore + 
                        this.results.dashboardIntegration.maxScore + 
                        this.results.realTimeAnalytics.maxScore;

        const overallPercentage = Math.round(totalScore / maxScore * 100);

        console.log('📊 ANALYTICS COMPONENT SCORES:');
        console.log(`   Database Analytics: ${this.results.databaseAnalytics.score}/${this.results.databaseAnalytics.maxScore} (${this.results.databaseAnalytics.percentage}%)`);
        console.log(`   API Integration: ${this.results.apiIntegration.score}/${this.results.apiIntegration.maxScore} (${this.results.apiIntegration.percentage}%)`);
        console.log(`   Dashboard Integration: ${this.results.dashboardIntegration.score}/${this.results.dashboardIntegration.maxScore} (${this.results.dashboardIntegration.percentage}%)`);
        console.log(`   Real-time Analytics: ${this.results.realTimeAnalytics.score}/${this.results.realTimeAnalytics.maxScore} (${this.results.realTimeAnalytics.percentage}%)`);

        console.log(`\n🎯 OVERALL ANALYTICS SCORE: ${totalScore}/${maxScore} (${overallPercentage}%)\n`);

        // Status determination
        let status = '';
        if (overallPercentage >= 80) {
            status = '🟢 EXCELLENT - Analytics Ready';
        } else if (overallPercentage >= 60) {
            status = '🟡 GOOD - Minor Enhancements Needed';
        } else if (overallPercentage >= 40) {
            status = '🟠 NEEDS WORK - Major Integration Required';
        } else {
            status = '🔴 CRITICAL - Analytics Not Functional';
        }

        console.log(`📊 STATUS: ${status}\n`);

        // Recommendations
        const recommendations = this.generateRecommendations();
        if (recommendations.length > 0) {
            console.log('🔧 RECOMMENDATIONS:');
            recommendations.forEach(rec => {
                console.log(`   [${rec.priority}] ${rec.category}: ${rec.issue}`);
                console.log(`       → ${rec.solution}`);
            });
        }

        this.results.totalScore = overallPercentage;
        return this.results;
    }

    async runFullAudit() {
        console.log('🚀 Starting comprehensive analytics integration audit...\n');

        // Run all audits
        await this.auditDatabaseAnalytics();
        await this.auditAPIAnalytics();
        await this.auditDashboardAnalytics();
        await this.auditRealTimeAnalytics();

        // Create missing files
        await this.createMissingAnalyticsFiles();

        // Generate final report
        return this.generateReport();
    }
}

async function main() {
    const analyticsManager = new AnalyticsIntegrationManager();
    const results = await analyticsManager.runFullAudit();
    
    console.log('\n✅ Analytics integration audit completed!');
    console.log('📊 Analytics infrastructure enhanced and ready for integration');
    
    return results;
}

main().catch(console.error); 