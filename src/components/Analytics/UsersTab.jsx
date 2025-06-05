import React, { useState, useEffect } from 'react';
import { AnalyticsAPI } from '../../api/analyticsApi.js';
import { 
  Users, 
  UserPlus, 
  TrendingUp, 
  Download, 
  Filter,
  Globe,
  Calendar
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const UsersTab = ({ dateRange, loading, setLoading }) => {
  const [userGrowthStats, setUserGrowthStats] = useState({
    total_new_users: 0,
    total_active_users: 0,
    growth_rate: 0,
    daily_signups: [],
    role_breakdown: []
  });
  const [usersByRole, setUsersByRole] = useState([]);
  const [filters, setFilters] = useState({
    role: ''
  });

  useEffect(() => {
    loadUserData();
  }, [dateRange, filters]);

  const loadUserData = async () => {
    setLoading(true);
    try {
      // Load user growth stats
      const growthResult = await AnalyticsAPI.getUserGrowthStats(dateRange.start, dateRange.end, filters);
      if (growthResult.success) {
        setUserGrowthStats(growthResult.data);
      }

      // Load users by role
      const roleResult = await AnalyticsAPI.getUsersByRole();
      if (roleResult.success) {
        setUsersByRole(roleResult.data);
      }

    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const result = await AnalyticsAPI.exportToCSV('users', dateRange.start, dateRange.end, filters);
      if (result.success) {
        console.log('User data exported successfully');
      }
    } catch (error) {
      console.error('Error exporting user data:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Colors for charts
  const COLORS = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#3B82F6'];

  // Prepare daily signups data for line chart
  const dailySignupsData = userGrowthStats.daily_signups?.map(item => ({
    date: formatDate(item.date),
    signups: parseInt(item.signups || 0)
  })) || [];

  // Prepare role breakdown data for pie chart
  const roleBreakdownData = userGrowthStats.role_breakdown?.map(item => ({
    role: item.role,
    count: parseInt(item.count || 0)
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Analytics</h2>
          <p className="text-gray-600 mt-1">
            User growth, engagement, and demographic insights
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Filters */}
          <select
            value={filters.role}
            onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Roles</option>
            <option value="client">Clients</option>
            <option value="reader">Readers</option>
            <option value="admin">Admins</option>
            <option value="monitor">Monitors</option>
          </select>

          <button
            onClick={handleExportCSV}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* User Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Active Users</p>
              <p className="text-2xl font-bold text-gray-900">
                {userGrowthStats.total_active_users?.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <UserPlus className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">New Users (Period)</p>
              <p className="text-2xl font-bold text-gray-900">
                {userGrowthStats.total_new_users?.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Growth Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {userGrowthStats.growth_rate?.toFixed(1) || 0}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100">
              <Calendar className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Daily Signups</p>
              <p className="text-2xl font-bold text-gray-900">
                {dailySignupsData.length > 0 
                  ? Math.round(dailySignupsData.reduce((sum, day) => sum + day.signups, 0) / dailySignupsData.length)
                  : 0
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* User Growth Over Time Chart */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">User Signups Over Time</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailySignupsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="signups" 
                stroke="#8B5CF6" 
                strokeWidth={3}
                dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* User Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users by Role */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Users by Role</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={roleBreakdownData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  label={({ role, count }) => `${role}: ${count}`}
                >
                  {roleBreakdownData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Active Users by Role Bar Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Users by Role</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={usersByRole}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="role" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* User Details Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">User Role Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Active Users
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  New This Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Percentage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Growth
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {usersByRole.map((roleData, index) => {
                const newThisPeriod = roleBreakdownData.find(r => r.role === roleData.role)?.count || 0;
                const totalUsers = usersByRole.reduce((sum, r) => sum + r.count, 0);
                const percentage = totalUsers > 0 ? (roleData.count / totalUsers * 100).toFixed(1) : 0;
                const growthRate = roleData.count > 0 ? (newThisPeriod / roleData.count * 100).toFixed(1) : 0;
                
                return (
                  <tr key={roleData.role}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-3"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        ></div>
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {roleData.role}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {roleData.count.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {newThisPeriod.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {percentage}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        parseFloat(growthRate) > 0 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {growthRate > 0 ? '+' : ''}{growthRate}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Insights */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">User Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Most Active Role</h4>
            <p className="text-sm text-blue-800">
              {usersByRole.length > 0 
                ? usersByRole.reduce((max, role) => role.count > max.count ? role : max, usersByRole[0]).role
                : 'N/A'
              } users are the most active on the platform
            </p>
          </div>
          
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-medium text-green-900 mb-2">Growth Trend</h4>
            <p className="text-sm text-green-800">
              {userGrowthStats.growth_rate > 0 ? 'Positive' : 'Stable'} user growth with{' '}
              {Math.abs(userGrowthStats.growth_rate).toFixed(1)}% change this period
            </p>
          </div>
          
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <h4 className="font-medium text-purple-900 mb-2">User Distribution</h4>
            <p className="text-sm text-purple-800">
              {usersByRole.length} different user roles with balanced distribution across the platform
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsersTab; 