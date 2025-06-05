import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Users, DollarSign, 
  Calendar, Clock, Star, Target, AlertCircle, 
  ArrowUp, ArrowDown, Minus, RefreshCw
} from 'lucide-react';
import { AnalyticsAPI } from '../../api/analyticsApi.js';
import { useAuth } from '../../context/AuthContext.jsx';

const AnalyticsDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [clientData, setClientData] = useState(null);
  const [insights, setInsights] = useState(null);
  const [timeRange, setTimeRange] = useState('30d');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadAnalyticsData();
    }
  }, [user?.id, timeRange]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      const startDate = getStartDate(timeRange);
      
      const [analyticsResult, revenueResult, clientResult, insightsResult] = await Promise.all([
        AnalyticsAPI.getReaderAnalytics(user.id, { 
          startDate: startDate.toISOString().split('T')[0],
          granularity: timeRange === '7d' ? 'daily' : timeRange === '30d' ? 'daily' : 'weekly'
        }),
        AnalyticsAPI.getRevenueAnalytics(user.id, { 
          startDate: startDate.toISOString(),
          groupBy: timeRange === '7d' ? 'day' : timeRange === '30d' ? 'day' : 'week'
        }),
        AnalyticsAPI.getClientAnalytics(user.id),
        AnalyticsAPI.getPerformanceInsights(user.id)
      ]);

      if (analyticsResult.success) {
        setAnalytics(analyticsResult);
      }
      if (revenueResult.success) {
        setRevenueData(revenueResult);
      }
      if (clientResult.success) {
        setClientData(clientResult);
      }
      if (insightsResult.success) {
        setInsights(insightsResult);
      }
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadAnalyticsData();
    setRefreshing(false);
  };

  const getStartDate = (range) => {
    const now = new Date();
    switch (range) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up':
        return <ArrowUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <ArrowDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend) => {
    switch (trend) {
      case 'up':
        return 'text-green-500';
      case 'down':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const COLORS = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600 mt-2">Track your performance and grow your business</p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Time Range Selector */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>

            {/* Refresh Button */}
            <button
              onClick={refreshData}
              disabled={refreshing}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Revenue */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(revenueData?.summary?.totalRevenue || 0)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="flex items-center mt-4">
              {getTrendIcon('up')}
              <span className={`ml-2 text-sm ${getTrendColor('up')}`}>
                +12.5% from last period
              </span>
            </div>
          </div>

          {/* Total Sessions */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics?.summary?.total_sessions || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="flex items-center mt-4">
              {getTrendIcon('up')}
              <span className={`ml-2 text-sm ${getTrendColor('up')}`}>
                +8.2% from last period
              </span>
            </div>
          </div>

          {/* Total Clients */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Clients</p>
                <p className="text-2xl font-bold text-gray-900">
                  {clientData?.data?.totalClients || 0}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="flex items-center mt-4">
              {getTrendIcon('up')}
              <span className={`ml-2 text-sm ${getTrendColor('up')}`}>
                +5.1% from last period
              </span>
            </div>
          </div>

          {/* Completion Rate */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(analytics?.summary?.completionRate || 0)}%
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <Target className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <div className="flex items-center mt-4">
              {getTrendIcon('stable')}
              <span className={`ml-2 text-sm ${getTrendColor('stable')}`}>
                No change from last period
              </span>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Revenue Chart */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueData?.data || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Area 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#8B5CF6" 
                  fill="#8B5CF6" 
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Sessions Chart */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Activity</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics?.data || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="completed_sessions" fill="#10B981" name="Completed" />
                <Bar dataKey="cancelled_sessions" fill="#EF4444" name="Cancelled" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Client Segments and Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Client Segments */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Segments</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'New', value: clientData?.data?.clientSegments?.new || 0 },
                    { name: 'Regular', value: clientData?.data?.clientSegments?.regular || 0 },
                    { name: 'Loyal', value: clientData?.data?.clientSegments?.loyal || 0 },
                    { name: 'VIP', value: clientData?.data?.clientSegments?.vip || 0 }
                  ]}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                >
                  {COLORS.map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Performance Metrics */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Average Session Duration</span>
                <span className="font-semibold">
                  {Math.round(analytics?.summary?.averageSessionDuration || 0)} min
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Average Session Value</span>
                <span className="font-semibold">
                  {formatCurrency(analytics?.summary?.averageSessionValue || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Client Retention Rate</span>
                <span className="font-semibold">
                  {Math.round(clientData?.data?.clientRetentionRate || 0)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Average Client Value</span>
                <span className="font-semibold">
                  {formatCurrency(clientData?.data?.averageClientValue || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 text-gray-500 mr-2" />
                  <span className="text-sm text-gray-600">Response Time</span>
                </div>
                <span className="font-semibold">2.3 min</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Star className="w-4 h-4 text-yellow-500 mr-2" />
                  <span className="text-sm text-gray-600">Average Rating</span>
                </div>
                <span className="font-semibold">4.8/5</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-2" />
                  <span className="text-sm text-gray-600">Growth Rate</span>
                </div>
                <span className="font-semibold text-green-600">+15.2%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Users className="w-4 h-4 text-blue-500 mr-2" />
                  <span className="text-sm text-gray-600">Active Clients</span>
                </div>
                <span className="font-semibold">
                  {clientData?.data?.activeClients || 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Insights */}
        {insights?.data && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">AI-Powered Insights</h3>
            
            {/* Trends */}
            {insights.data.trends?.length > 0 && (
              <div className="mb-6">
                <h4 className="text-md font-medium text-gray-800 mb-3">Trends</h4>
                <div className="space-y-3">
                  {insights.data.trends.map((trend, index) => (
                    <div key={index} className="flex items-start p-3 bg-green-50 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-green-800">{trend.message}</p>
                        <p className="text-xs text-green-600 mt-1">Impact: {trend.impact}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Opportunities */}
            {insights.data.opportunities?.length > 0 && (
              <div className="mb-6">
                <h4 className="text-md font-medium text-gray-800 mb-3">Opportunities</h4>
                <div className="space-y-3">
                  {insights.data.opportunities.map((opportunity, index) => (
                    <div key={index} className="flex items-start p-3 bg-yellow-50 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-800">{opportunity.message}</p>
                        <p className="text-xs text-yellow-600 mt-1">{opportunity.suggestion}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {insights.data.recommendations?.length > 0 && (
              <div>
                <h4 className="text-md font-medium text-gray-800 mb-3">Recommendations</h4>
                <div className="space-y-3">
                  {insights.data.recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start p-3 bg-blue-50 rounded-lg">
                      <Target className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-800">{recommendation.message}</p>
                        <p className="text-xs text-blue-600 mt-1">
                          Expected Impact: {recommendation.expectedImpact}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard; 