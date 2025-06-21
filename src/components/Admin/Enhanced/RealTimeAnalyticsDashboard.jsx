import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  UsersIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  StarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ArrowPathIcon,
  EyeIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const RealTimeAnalyticsDashboard = ({ className = '' }) => {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState({});
  const [activityFeed, setActivityFeed] = useState([]);
  const [chartData, setChartData] = useState({});
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Time periods for analytics
  const timePeriods = [
    { value: 'today', label: t('admin.analytics.today') },
    { value: 'week', label: t('admin.analytics.thisWeek') },
    { value: 'month', label: t('admin.analytics.thisMonth') },
    { value: 'year', label: t('admin.analytics.thisYear') }
  ];

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Fetch dashboard metrics
      const metricsResponse = await fetch(`/api/admin/analytics/dashboard?period=${selectedPeriod}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!metricsResponse.ok) {
        throw new Error('Failed to fetch metrics');
      }
      
      const metricsData = await metricsResponse.json();
      setMetrics(metricsData.metrics || {});

      // Fetch activity feed
      const activityResponse = await fetch('/api/admin/activity-feed?limit=20', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (activityResponse.ok) {
        const activityData = await activityResponse.json();
        setActivityFeed(activityData.activities || []);
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPeriod]);

  // Auto-refresh functionality
  useEffect(() => {
    fetchAnalytics();
    
    if (autoRefresh) {
      const interval = setInterval(fetchAnalytics, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [fetchAnalytics, autoRefresh]);

  // Handle period change
  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
  };

  // Toggle auto-refresh
  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  // Manual refresh
  const handleManualRefresh = () => {
    fetchAnalytics();
  };

  // Format numbers for display
  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num?.toString() || '0';
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  // Calculate percentage change
  const calculateChange = (current, previous) => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  // Get trend icon and color
  const getTrendDisplay = (change) => {
    if (change > 0) {
      return {
        icon: TrendingUpIcon,
        color: 'text-green-600',
        bgColor: 'bg-green-100 dark:bg-green-900/20'
      };
    } else if (change < 0) {
      return {
        icon: TrendingDownIcon,
        color: 'text-red-600',
        bgColor: 'bg-red-100 dark:bg-red-900/20'
      };
    }
    return {
      icon: TrendingUpIcon,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100 dark:bg-gray-900/20'
    };
  };

  // Activity type icons
  const getActivityIcon = (type) => {
    const iconMap = {
      user_registration: UsersIcon,
      booking_created: CalendarIcon,
      payment_completed: CurrencyDollarIcon,
      review_submitted: StarIcon,
      admin_action: ExclamationTriangleIcon
    };
    return iconMap[type] || ClockIcon;
  };

  // Activity priority colors
  const getActivityColor = (priority) => {
    const colorMap = {
      low: 'text-gray-600',
      normal: 'text-blue-600',
      high: 'text-yellow-600',
      critical: 'text-red-600'
    };
    return colorMap[priority] || 'text-gray-600';
  };

  // Chart colors
  const chartColors = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];

  // Sample chart data (this would come from your API)
  const sampleChartData = [
    { name: 'Mon', users: 65, bookings: 28, revenue: 1200 },
    { name: 'Tue', users: 59, bookings: 48, revenue: 2100 },
    { name: 'Wed', users: 80, bookings: 40, revenue: 1800 },
    { name: 'Thu', users: 81, bookings: 19, revenue: 900 },
    { name: 'Fri', users: 56, bookings: 96, revenue: 4200 },
    { name: 'Sat', users: 55, bookings: 27, revenue: 1300 },
    { name: 'Sun', users: 40, bookings: 35, revenue: 1600 }
  ];

  return (
    <div className={`real-time-analytics-dashboard ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('admin.analytics.dashboard')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {lastUpdated && (
              <>
                {t('admin.analytics.lastUpdated')}: {lastUpdated.toLocaleTimeString()}
              </>
            )}
          </p>
        </div>

        <div className="flex items-center space-x-4">
          {/* Period Selector */}
          <select
            value={selectedPeriod}
            onChange={(e) => handlePeriodChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-800 dark:border-gray-600"
          >
            {timePeriods.map((period) => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </select>

          {/* Auto-refresh Toggle */}
          <button
            onClick={toggleAutoRefresh}
            className={`
              px-3 py-2 text-sm font-medium rounded-md transition-colors
              ${autoRefresh
                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }
            `}
          >
            <ArrowPathIcon className={`h-4 w-4 mr-1 inline ${autoRefresh ? 'animate-spin' : ''}`} />
            {t('admin.analytics.autoRefresh')}
          </button>

          {/* Manual Refresh */}
          <button
            onClick={handleManualRefresh}
            disabled={isLoading}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300"
          >
            <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Users */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('admin.analytics.totalUsers')}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatNumber(metrics.total_users?.value)}
              </p>
              {metrics.total_users?.change !== undefined && (
                <div className="flex items-center mt-1">
                  {(() => {
                    const change = calculateChange(metrics.total_users.value, metrics.total_users.value - metrics.total_users.change);
                    const trend = getTrendDisplay(change);
                    const TrendIcon = trend.icon;
                    return (
                      <div className={`flex items-center px-2 py-1 rounded-full text-xs ${trend.bgColor}`}>
                        <TrendIcon className={`h-3 w-3 mr-1 ${trend.color}`} />
                        <span className={trend.color}>
                          {Math.abs(change).toFixed(1)}%
                        </span>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full">
              <UsersIcon className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </motion.div>

        {/* Total Bookings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('admin.analytics.totalBookings')}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatNumber(metrics.total_bookings?.value)}
              </p>
              {metrics.total_bookings?.change !== undefined && (
                <div className="flex items-center mt-1">
                  {(() => {
                    const change = calculateChange(metrics.total_bookings.value, metrics.total_bookings.value - metrics.total_bookings.change);
                    const trend = getTrendDisplay(change);
                    const TrendIcon = trend.icon;
                    return (
                      <div className={`flex items-center px-2 py-1 rounded-full text-xs ${trend.bgColor}`}>
                        <TrendIcon className={`h-3 w-3 mr-1 ${trend.color}`} />
                        <span className={trend.color}>
                          {Math.abs(change).toFixed(1)}%
                        </span>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
              <CalendarIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </motion.div>

        {/* Total Revenue */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('admin.analytics.totalRevenue')}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatCurrency(metrics.total_revenue?.value)}
              </p>
              {metrics.total_revenue?.change !== undefined && (
                <div className="flex items-center mt-1">
                  {(() => {
                    const change = calculateChange(metrics.total_revenue.value, metrics.total_revenue.value - metrics.total_revenue.change);
                    const trend = getTrendDisplay(change);
                    const TrendIcon = trend.icon;
                    return (
                      <div className={`flex items-center px-2 py-1 rounded-full text-xs ${trend.bgColor}`}>
                        <TrendIcon className={`h-3 w-3 mr-1 ${trend.color}`} />
                        <span className={trend.color}>
                          {Math.abs(change).toFixed(1)}%
                        </span>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
              <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </motion.div>

        {/* Active Readers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('admin.analytics.activeReaders')}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatNumber(metrics.active_readers?.value)}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
              <StarIcon className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Trend Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {t('admin.analytics.revenueTrend')}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={sampleChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Area type="monotone" dataKey="revenue" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Users vs Bookings Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {t('admin.analytics.usersVsBookings')}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sampleChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="users" fill="#8B5CF6" name={t('admin.analytics.users')} />
              <Bar dataKey="bookings" fill="#06B6D4" name={t('admin.analytics.bookings')} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Activity Feed */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t('admin.analytics.activityFeed')}
            </h3>
            <button className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 flex items-center">
              <EyeIcon className="h-4 w-4 mr-1" />
              {t('admin.analytics.viewAll')}
            </button>
          </div>
        </div>

        <div className="p-6">
          {activityFeed.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <ClockIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>{t('admin.analytics.noActivity')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activityFeed.slice(0, 10).map((activity) => {
                const ActivityIcon = getActivityIcon(activity.activity_type);
                const activityColor = getActivityColor(activity.priority);
                
                return (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className={`p-2 rounded-full bg-gray-100 dark:bg-gray-700`}>
                      <ActivityIcon className={`h-4 w-4 ${activityColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {activity.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(activity.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                      {activity.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {activity.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default RealTimeAnalyticsDashboard; 