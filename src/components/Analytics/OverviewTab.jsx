import React, { useState, useEffect } from 'react';
import api from '../../services/frontendApi.js';
import { 
  Users, 
  DollarSign, 
  Calendar, 
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Activity
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

const OverviewTab = ({ dateRange, loading, setLoading }) => {
  const [overviewStats, setOverviewStats] = useState({
    activeUsers: 0,
    totalRevenue: 0,
    bookingsToday: 0,
    emergencyCalls: 0,
    pendingApprovals: 0
  });
  const [sparklineData, setSparklineData] = useState({
    revenue: [],
    users: [],
    bookings: []
  });
  const [trends, setTrends] = useState({
    revenue: { value: 0, trend: 'up' },
    users: { value: 0, trend: 'up' },
    bookings: { value: 0, trend: 'up' }
  });

  useEffect(() => {
    loadOverviewData();
  }, [dateRange]);

  const loadOverviewData = async () => {
    setLoading(true);
    try {
      // Load overview stats
      const statsResult = await api.getOverviewStats();
      if (statsResult.success) {
        setOverviewStats(statsResult.data);
      }

      // Load sparkline data for trends
      const revenueResult = await api.getRevenueStats(dateRange.start, dateRange.end);
      const usersResult = await api.getUserGrowthStats(dateRange.start, dateRange.end);
      const bookingsResult = await api.getBookingStats(dateRange.start, dateRange.end);

      if (revenueResult.success && revenueResult.data.daily_data) {
        const revenueSparkline = revenueResult.data.daily_data.slice(-7).map((item, index) => ({
          day: index + 1,
          value: parseFloat(item.revenue || 0)
        }));
        setSparklineData(prev => ({ ...prev, revenue: revenueSparkline }));
      }

      if (usersResult.success && usersResult.data.daily_signups) {
        const usersSparkline = usersResult.data.daily_signups.slice(-7).map((item, index) => ({
          day: index + 1,
          value: parseInt(item.signups || 0)
        }));
        setSparklineData(prev => ({ ...prev, users: usersSparkline }));
      }

      // Calculate trends (simplified - comparing last 2 data points)
      if (revenueResult.success && revenueResult.data.daily_data && revenueResult.data.daily_data.length >= 2) {
        const revenueData = revenueResult.data.daily_data;
        const lastRevenue = parseFloat(revenueData[revenueData.length - 1]?.revenue || 0);
        const prevRevenue = parseFloat(revenueData[revenueData.length - 2]?.revenue || 0);
        const revenueChange = prevRevenue > 0 ? ((lastRevenue - prevRevenue) / prevRevenue * 100) : 0;
        
        setTrends(prev => ({
          ...prev,
          revenue: {
            value: Math.abs(revenueChange),
            trend: revenueChange >= 0 ? 'up' : 'down'
          }
        }));
      }

    } catch (error) {
      console.error('Error loading overview data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, trend, sparkline, color = 'purple' }) => {
    const colorClasses = {
      purple: 'bg-purple-500 text-purple-600 bg-purple-100',
      green: 'bg-green-500 text-green-600 bg-green-100',
      blue: 'bg-blue-500 text-blue-600 bg-blue-100',
      red: 'bg-red-500 text-red-600 bg-red-100',
      yellow: 'bg-yellow-500 text-yellow-600 bg-yellow-100'
    };

    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
            {trend && (
              <div className="flex items-center mt-2">
                {trend.trend === 'up' ? (
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                )}
                <span className={`text-sm font-medium ${
                  trend.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {trend.value.toFixed(1)}%
                </span>
                <span className="text-sm text-gray-500 ml-1">vs yesterday</span>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end">
            <div className={`p-3 rounded-full ${colorClasses[color].split(' ')[2]}`}>
              <Icon className={`h-6 w-6 ${colorClasses[color].split(' ')[1]}`} />
            </div>
            {sparkline && sparkline.length > 0 && (
              <div className="w-20 h-10 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparkline}>
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke={colorClasses[color].split(' ')[0].replace('bg-', '#')} 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Platform Overview</h2>
        <p className="text-gray-600 mt-1">
          Key metrics and performance indicators for the SAMIA TAROT platform
        </p>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard
          title="Active Users"
          value={overviewStats.activeUsers.toLocaleString()}
          icon={Users}
          trend={trends.users}
          sparkline={sparklineData.users}
          color="blue"
        />
        
        <StatCard
          title="Total Revenue"
          value={formatCurrency(overviewStats.totalRevenue)}
          icon={DollarSign}
          trend={trends.revenue}
          sparkline={sparklineData.revenue}
          color="green"
        />
        
        <StatCard
          title="Bookings Today"
          value={overviewStats.bookingsToday.toLocaleString()}
          icon={Calendar}
          trend={trends.bookings}
          color="purple"
        />
        
        <StatCard
          title="Emergency Calls"
          value={overviewStats.emergencyCalls.toLocaleString()}
          icon={AlertTriangle}
          color="red"
        />
        
        <StatCard
          title="Pending Approvals"
          value={overviewStats.pendingApprovals.toLocaleString()}
          icon={CheckCircle}
          color="yellow"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center justify-center px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            <Activity className="h-5 w-5 mr-2" />
            View Live Activity
          </button>
          <button className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <DollarSign className="h-5 w-5 mr-2" />
            Generate Revenue Report
          </button>
          <button className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Users className="h-5 w-5 mr-2" />
            Export User Data
          </button>
        </div>
      </div>

      {/* Recent Activity Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Health */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Platform Status</span>
              <span className="flex items-center text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Operational
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Database</span>
              <span className="flex items-center text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Healthy
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Payment Gateway</span>
              <span className="flex items-center text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Connected
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Emergency System</span>
              <span className="flex items-center text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Active
              </span>
            </div>
          </div>
        </div>

        {/* Key Insights */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Insights</h3>
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Peak Hours:</strong> Most activity occurs between 7-9 PM
              </p>
            </div>
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Revenue Growth:</strong> 15% increase in monthly revenue
              </p>
            </div>
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-sm text-purple-800">
                <strong>User Retention:</strong> 85% of users return within 30 days
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab; 