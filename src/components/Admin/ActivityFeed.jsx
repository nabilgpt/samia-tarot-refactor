import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Activity, 
  User, 
  CreditCard, 
  Calendar, 
  MessageSquare, 
  Settings, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  RefreshCw
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

const ActivityFeed = ({ className = '', showFilters = true, limit = 20 }) => {
  const { t } = useTranslation();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    entity_type: '',
    actor_id: '',
    action: ''
  });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef(null);

  // Load activities on component mount and filter changes
  useEffect(() => {
    loadActivities(true);
  }, [filters]);

  // Auto-refresh setup
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        loadActivities(true, true); // silent refresh
      }, 30000); // 30 seconds
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, filters]);

  // Load activities from API
  const loadActivities = async (reset = false, silent = false) => {
    if (!silent) setLoading(true);
    
    try {
      const currentPage = reset ? 1 : page;
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        )
      });

      const response = await fetch(`/api/admin/activity-feed?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (reset) {
          setActivities(data.data);
          setPage(2);
        } else {
          setActivities(prev => [...prev, ...data.data]);
          setPage(prev => prev + 1);
        }
        setHasMore(data.pagination.page < data.pagination.pages);
      }
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Get icon for activity type
  const getActivityIcon = (action, entityType) => {
    const iconMap = {
      // User actions
      'user_created': User,
      'user_updated': User,
      'user_deleted': XCircle,
      'user_role_changed': Settings,
      
      // Booking actions
      'booking_created': Calendar,
      'booking_approved': CheckCircle,
      'booking_rejected': XCircle,
      'booking_completed': CheckCircle,
      
      // Payment actions
      'payment_processed': CreditCard,
      'payment_failed': AlertTriangle,
      'payment_refunded': CreditCard,
      
      // Message actions
      'message_sent': MessageSquare,
      'message_flagged': AlertTriangle,
      
      // System actions
      'system_backup': Settings,
      'system_maintenance': Settings,
      
      // Default
      'default': Activity
    };

    return iconMap[action] || iconMap[entityType] || iconMap.default;
  };

  // Get color scheme for activity
  const getActivityColor = (action) => {
    if (action.includes('created') || action.includes('approved') || action.includes('completed')) {
      return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-300';
    }
    if (action.includes('deleted') || action.includes('rejected') || action.includes('failed')) {
      return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-300';
    }
    if (action.includes('updated') || action.includes('modified')) {
      return 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-300';
    }
    if (action.includes('flagged') || action.includes('warning')) {
      return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300';
    }
    return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300';
  };

  // Format activity description
  const formatActivityDescription = (activity) => {
    const { action, entity_type, entity_name, actor_name, metadata } = activity;
    
    const actionMap = {
      'user_created': `أنشأ مستخدم جديد`,
      'user_updated': `حدث بيانات المستخدم`,
      'user_deleted': `حذف المستخدم`,
      'user_role_changed': `غير دور المستخدم`,
      'booking_created': `أنشأ حجز جديد`,
      'booking_approved': `وافق على الحجز`,
      'booking_rejected': `رفض الحجز`,
      'booking_completed': `أكمل الحجز`,
      'payment_processed': `معالج دفعة`,
      'payment_failed': `فشلت الدفعة`,
      'payment_refunded': `استرد الدفعة`,
      'message_sent': `أرسل رسالة`,
      'message_flagged': `أبلغ عن رسالة`
    };

    const actionText = actionMap[action] || action;
    
    return {
      primary: `${actor_name} ${actionText}`,
      secondary: entity_name || `${entity_type} #${activity.entity_id?.slice(-8)}`,
      metadata: metadata
    };
  };

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
    setPage(1);
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      entity_type: '',
      actor_id: '',
      action: ''
    });
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Activity className="w-5 h-5 text-purple-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              سجل الأنشطة
            </h3>
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
              ({activities.length} نشاط)
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-2 rounded-lg transition-colors ${
                autoRefresh 
                  ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
              title={autoRefresh ? 'إيقاف التحديث التلقائي' : 'تفعيل التحديث التلقائي'}
            >
              <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={() => loadActivities(true)}
              disabled={loading}
              className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors disabled:opacity-50"
                              title={t('admin.activityFeed.updateNow')}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center">
              <Filter className="w-4 h-4 text-gray-400 mr-2" />
              <span className="text-sm text-gray-600 dark:text-gray-400">فلترة:</span>
            </div>
            
            <select
              value={filters.entity_type}
              onChange={(e) => handleFilterChange('entity_type', e.target.value)}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">جميع الكيانات</option>
              <option value="user">المستخدمون</option>
              <option value="booking">الحجوزات</option>
              <option value="payment">المدفوعات</option>
              <option value="message">الرسائل</option>
              <option value="system">النظام</option>
            </select>

            <select
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">جميع الإجراءات</option>
              <option value="created">إنشاء</option>
              <option value="updated">تحديث</option>
              <option value="deleted">حذف</option>
              <option value="approved">موافقة</option>
              <option value="rejected">رفض</option>
            </select>

            {(filters.entity_type || filters.action) && (
              <button
                onClick={clearFilters}
                className="text-sm text-purple-600 dark:text-purple-300 hover:text-purple-700 dark:hover:text-purple-200"
              >
                مسح الفلاتر
              </button>
            )}
          </div>
        )}
      </div>

      {/* Activity List */}
      <div className="max-h-96 overflow-y-auto">
        {loading && activities.length === 0 ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">جاري تحميل الأنشطة...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="p-8 text-center">
            <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">لا توجد أنشطة حتى الآن</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {activities.map((activity, index) => {
              const IconComponent = getActivityIcon(activity.action, activity.entity_type);
              const colorClasses = getActivityColor(activity.action);
              const description = formatActivityDescription(activity);
              
              return (
                <div key={activity.id || index} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-start">
                    <div className={`p-2 rounded-full ${colorClasses} mr-3 mt-1`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {description.primary}
                        </p>
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatDistanceToNow(new Date(activity.created_at), { 
                            addSuffix: true, 
                            locale: ar 
                          })}
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {description.secondary}
                      </p>
                      
                      {description.metadata && Object.keys(description.metadata).length > 0 && (
                        <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
                          {Object.entries(description.metadata).map(([key, value]) => (
                            <span key={key} className="inline-block mr-3 text-gray-600 dark:text-gray-400">
                              <strong>{key}:</strong> {JSON.stringify(value)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Load More Button */}
        {hasMore && !loading && activities.length > 0 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => loadActivities(false)}
              className="w-full py-2 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
            >
              تحميل المزيد
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityFeed; 