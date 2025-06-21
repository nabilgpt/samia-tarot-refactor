import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AdminLayout from '../../components/Layout/AdminLayout';
import UniversalSearchBar from '../../components/Admin/Enhanced/UniversalSearchBar';
import RealTimeAnalyticsDashboard from '../../components/Admin/Enhanced/RealTimeAnalyticsDashboard';
import BulkOperationsManager from '../../components/Admin/Enhanced/BulkOperationsManager';
import NotificationRulesManager from '../../components/Admin/Enhanced/NotificationRulesManager';
import {
  ChartBarIcon,
  UsersIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ChatBubbleLeftRightIcon,
  BellIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  DocumentArrowDownIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

const AdminAdvancedDashboard = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchResults, setSearchResults] = useState(null);
  const [systemHealth, setSystemHealth] = useState({});
  const [recentActions, setRecentActions] = useState([]);
  const [quickStats, setQuickStats] = useState({});
  const [loading, setLoading] = useState(true);

  // Dashboard tabs
  const dashboardTabs = [
    {
      id: 'overview',
      label: t('admin.dashboard.overview'),
      icon: ChartBarIcon,
      description: t('admin.dashboard.overviewDesc')
    },
    {
      id: 'analytics',
      label: t('admin.dashboard.analytics'),
      icon: ChartBarIcon,
      description: t('admin.dashboard.analyticsDesc')
    },
    {
      id: 'bulk-operations',
      label: t('admin.dashboard.bulkOperations'),
      icon: Cog6ToothIcon,
      description: t('admin.dashboard.bulkOperationsDesc')
    },
    {
      id: 'notifications',
      label: t('admin.dashboard.notifications'),
      icon: BellIcon,
      description: t('admin.dashboard.notificationsDesc')
    },
    {
      id: 'system-health',
      label: t('admin.dashboard.systemHealth'),
      icon: ShieldCheckIcon,
      description: t('admin.dashboard.systemHealthDesc')
    }
  ];

  // Quick action cards
  const quickActions = [
    {
      title: t('admin.quickActions.manageUsers'),
      description: t('admin.quickActions.manageUsersDesc'),
      icon: UsersIcon,
      color: 'purple',
      href: '/admin/users',
      count: quickStats.total_users
    },
    {
      title: t('admin.quickActions.viewBookings'),
      description: t('admin.quickActions.viewBookingsDesc'),
      icon: CalendarIcon,
      color: 'blue',
      href: '/admin/bookings',
      count: quickStats.pending_bookings
    },
    {
      title: t('admin.quickActions.checkPayments'),
      description: t('admin.quickActions.checkPaymentsDesc'),
      icon: CurrencyDollarIcon,
      color: 'green',
      href: '/admin/finances',
      count: quickStats.pending_payments
    },
    {
      title: t('admin.quickActions.moderateReviews'),
      description: t('admin.quickActions.moderateReviewsDesc'),
      icon: ChatBubbleLeftRightIcon,
      color: 'yellow',
      href: '/admin/reviews',
      count: quickStats.pending_reviews
    }
  ];

  // System health indicators
  const healthIndicators = [
    {
      name: t('admin.health.database'),
      status: systemHealth.database_status || 'unknown',
      lastCheck: systemHealth.database_last_check,
      details: systemHealth.database_details
    },
    {
      name: t('admin.health.api'),
      status: systemHealth.api_status || 'unknown',
      lastCheck: systemHealth.api_last_check,
      details: systemHealth.api_details
    },
    {
      name: t('admin.health.storage'),
      status: systemHealth.storage_status || 'unknown',
      lastCheck: systemHealth.storage_last_check,
      details: systemHealth.storage_details
    },
    {
      name: t('admin.health.notifications'),
      status: systemHealth.notifications_status || 'unknown',
      lastCheck: systemHealth.notifications_last_check,
      details: systemHealth.notifications_details
    }
  ];

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch quick stats
        const statsResponse = await fetch('/api/admin/analytics/dashboard?period=today', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setQuickStats(statsData.metrics || {});
        }

        // Fetch recent actions
        const actionsResponse = await fetch('/api/admin/activity-feed?limit=10', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (actionsResponse.ok) {
          const actionsData = await actionsResponse.json();
          setRecentActions(actionsData.activities || []);
        }

        // Fetch system health (mock data for now)
        setSystemHealth({
          database_status: 'healthy',
          database_last_check: new Date().toISOString(),
          api_status: 'healthy',
          api_last_check: new Date().toISOString(),
          storage_status: 'healthy',
          storage_last_check: new Date().toISOString(),
          notifications_status: 'healthy',
          notifications_last_check: new Date().toISOString()
        });

      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Handle search results
  const handleSearchResults = (results) => {
    setSearchResults(results);
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
      case 'online':
      case 'active':
        return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      case 'warning':
      case 'degraded':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'error':
      case 'offline':
      case 'critical':
        return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
      case 'online':
      case 'active':
        return CheckCircleIcon;
      case 'warning':
      case 'degraded':
        return ExclamationTriangleIcon;
      case 'error':
      case 'offline':
      case 'critical':
        return ExclamationTriangleIcon;
      default:
        return ClockIcon;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {t('admin.dashboard.title')}
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {t('admin.dashboard.subtitle')}
            </p>
          </div>

          <div className="mt-4 lg:mt-0 flex items-center space-x-4">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300"
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              {t('admin.dashboard.refresh')}
            </button>
          </div>
        </div>

        {/* Universal Search */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <UniversalSearchBar
            onSearchResults={handleSearchResults}
            placeholder={t('admin.search.universalPlaceholder')}
          />
        </div>

        {/* Dashboard Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              {dashboardTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                      ${isActive
                        ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                      }
                    `}
                  >
                    <Icon className={`
                      -ml-0.5 mr-2 h-5 w-5
                      ${isActive
                        ? 'text-purple-500 dark:text-purple-400'
                        : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'
                      }
                    `} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              {activeTab === 'overview' && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  {/* Quick Actions Grid */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                      {t('admin.dashboard.quickActions')}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {quickActions.map((action) => {
                        const Icon = action.icon;
                        const colorClasses = {
                          purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
                          blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
                          green: 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400',
                          yellow: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400'
                        };

                        return (
                          <motion.a
                            key={action.title}
                            href={action.href}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-center justify-between">
                              <div className={`p-3 rounded-full ${colorClasses[action.color]}`}>
                                <Icon className="h-6 w-6" />
                              </div>
                              {action.count !== undefined && (
                                <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                  {action.count}
                                </span>
                              )}
                            </div>
                            <h4 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
                              {action.title}
                            </h4>
                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                              {action.description}
                            </p>
                          </motion.a>
                        );
                      })}
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        {t('admin.dashboard.recentActivity')}
                      </h3>
                      <button className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 flex items-center">
                        <EyeIcon className="h-4 w-4 mr-1" />
                        {t('admin.dashboard.viewAll')}
                      </button>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      {recentActions.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          <ClockIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>{t('admin.dashboard.noRecentActivity')}</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {recentActions.slice(0, 5).map((activity) => (
                            <div key={activity.id} className="flex items-center space-x-3">
                              <div className="flex-shrink-0">
                                <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {activity.title}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {activity.description}
                                </p>
                              </div>
                              <div className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400">
                                {new Date(activity.created_at).toLocaleTimeString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'analytics' && (
                <motion.div
                  key="analytics"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <RealTimeAnalyticsDashboard />
                </motion.div>
              )}

              {activeTab === 'bulk-operations' && (
                <motion.div
                  key="bulk-operations"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                        {t('admin.bulkOperations.title')}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {t('admin.bulkOperations.description')}
                      </p>
                    </div>

                    <BulkOperationsManager
                      data={[]} // This would be populated with actual data
                      selectedIds={[]}
                      onSelectionChange={() => {}}
                      onBulkOperation={async (operation, ids) => {
                        // Implement bulk operation logic
                        console.log('Bulk operation:', operation, ids);
                        return { total: ids.length, successful: ids.length, failed: 0 };
                      }}
                      entityType="users"
                    />
                  </div>
                </motion.div>
              )}

              {activeTab === 'notifications' && (
                <motion.div
                  key="notifications"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <NotificationRulesManager />
                </motion.div>
              )}

              {activeTab === 'system-health' && (
                <motion.div
                  key="system-health"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                      {t('admin.health.title')}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('admin.health.description')}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {healthIndicators.map((indicator) => {
                      const StatusIcon = getStatusIcon(indicator.status);
                      const statusClasses = getStatusColor(indicator.status);

                      return (
                        <div
                          key={indicator.name}
                          className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                              {indicator.name}
                            </h4>
                            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClasses}`}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {indicator.status}
                            </div>
                          </div>
                          
                          {indicator.lastCheck && (
                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                              {t('admin.health.lastCheck')}: {new Date(indicator.lastCheck).toLocaleString()}
                            </p>
                          )}

                          {indicator.details && (
                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                              {indicator.details}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Search Results */}
        {searchResults && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
          >
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              {t('admin.search.results')}
            </h3>
            <div className="space-y-4">
              {Object.entries(searchResults.results || {}).map(([type, results]) => (
                <div key={type}>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t(`admin.search.${type}`)} ({results.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {results.slice(0, 6).map((result) => (
                      <div
                        key={result.id}
                        className="p-3 bg-gray-50 dark:bg-gray-700 rounded border text-sm"
                      >
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {result.full_name || result.booking_code || result.transaction_id || result.comment?.substring(0, 30)}
                        </div>
                        <div className="text-gray-600 dark:text-gray-400">
                          {result.email || result.service_type || result.amount || result.rating}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminAdvancedDashboard; 