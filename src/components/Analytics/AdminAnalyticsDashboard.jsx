import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../services/frontendApi.js';
import { hasAdminOrMonitorAccess } from '../../utils/roleHelpers.js';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Calendar, 
  AlertTriangle,
  FileText,
  Download,
  Filter,
  RefreshCw,
  DollarSign,
  Phone,
  Star,
  Clock
} from 'lucide-react';

// Import tab components
import OverviewTab from './OverviewTab.jsx';
import RevenueTab from './RevenueTab.jsx';
import UsersTab from './UsersTab.jsx';
import BookingsTab from './BookingsTab.jsx';
import QualityTab from './QualityTab.jsx';
import ReportsTab from './ReportsTab.jsx';

const AdminAnalyticsDashboard = () => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // Check if user has admin access
  useEffect(() => {
    const finalRole = profile?.role || user?.role;
    if (user && !['admin', 'super_admin', 'monitor'].includes(finalRole)) {
      // Access denied - handled in render
    }
  }, [user, profile]);

  const tabs = [
    {
      id: 'overview',
      name: 'Overview',
      icon: BarChart3,
      description: 'Key metrics and trends'
    },
    {
      id: 'revenue',
      name: 'Revenue',
      icon: DollarSign,
      description: 'Financial analytics and trends'
    },
    {
      id: 'users',
      name: 'Users',
      icon: Users,
      description: 'User growth and engagement'
    },
    {
      id: 'bookings',
      name: 'Bookings',
      icon: Calendar,
      description: 'Service utilization and bookings'
    },
    {
      id: 'quality',
      name: 'Quality',
      icon: Star,
      description: 'Performance and quality metrics'
    },
    {
      id: 'reports',
      name: 'Reports',
      icon: FileText,
      description: 'Generated reports and exports'
    }
  ];

  const handleDateRangeChange = (newRange) => {
    setDateRange(newRange);
  };

  const handleRefresh = async () => {
    setLoading(true);
    // Trigger refresh in active tab component
    setTimeout(() => setLoading(false), 1000);
  };

  const renderActiveTab = () => {
    const commonProps = {
      dateRange,
      onDateRangeChange: handleDateRangeChange,
      loading,
      setLoading
    };

    switch (activeTab) {
      case 'overview':
        return <OverviewTab {...commonProps} />;
      case 'revenue':
        return <RevenueTab {...commonProps} />;
      case 'users':
        return <UsersTab {...commonProps} />;
      case 'bookings':
        return <BookingsTab {...commonProps} />;
      case 'quality':
        return <QualityTab {...commonProps} />;
      case 'reports':
        return <ReportsTab {...commonProps} />;
      default:
        return <OverviewTab {...commonProps} />;
    }
  };

  const userRole = profile?.role || user?.role;
  
  if (!user || !['admin', 'super_admin', 'monitor'].includes(userRole)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-6">
              You don&apos;t have permission to access the analytics dashboard.
            </p>
            <button
              onClick={() => window.history.back()}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              {/* Date Range Selector */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Date Range:</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors
                      ${activeTab === tab.id
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon className={`
                      h-5 w-5 mr-2 transition-colors
                      ${activeTab === tab.id ? 'text-purple-500' : 'text-gray-400 group-hover:text-gray-500'}
                    `} />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderActiveTab()}
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
            <RefreshCw className="h-6 w-6 text-purple-600 animate-spin" />
            <span className="text-gray-900 font-medium">Loading analytics...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAnalyticsDashboard; 
