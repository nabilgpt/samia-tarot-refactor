import React, { useState, useEffect } from 'react';
import { Database, Server, Settings, Activity, RefreshCw, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import AdminLayout from '../../components/Layout/AdminLayout';

const AdminSystemPage = () => {
  const [systemInfo, setSystemInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchSystemInfo();
  }, []);

  const fetchSystemInfo = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      const response = await fetch('/api/admin/system');
      if (response.ok) {
        const data = await response.json();
        setSystemInfo(data);
      } else {
        // Mock data for now
        setSystemInfo({
          server: {
            status: 'healthy',
            uptime: '15 days, 8 hours',
            version: '1.2.3',
            environment: 'production',
            lastRestart: '2024-01-05 14:30',
            cpu_usage: 45,
            memory_usage: 62,
            disk_usage: 78
          },
          database: {
            status: 'healthy',
            connections: 23,
            max_connections: 100,
            queries_per_second: 145,
            slow_queries: 2,
            last_backup: '2024-01-20 02:00',
            size: '2.4 GB'
          },
          services: {
            api: { status: 'running', response_time: '120ms' },
            websocket: { status: 'running', connections: 45 },
            email: { status: 'running', queue: 12 },
            payments: { status: 'running', last_check: '2024-01-20 15:30' },
            storage: { status: 'running', usage: '45%' }
          },
          maintenance: {
            scheduled: false,
            last_maintenance: '2024-01-15 03:00',
            next_scheduled: '2024-02-01 03:00',
            mode: 'normal'
          },
          logs: [
            { level: 'info', message: 'System health check completed', timestamp: '2024-01-20 15:45' },
            { level: 'warning', message: 'High memory usage detected', timestamp: '2024-01-20 15:30' },
            { level: 'info', message: 'Database backup completed successfully', timestamp: '2024-01-20 02:00' },
            { level: 'error', message: 'Payment gateway timeout (resolved)', timestamp: '2024-01-19 14:20' }
          ]
        });
      }
    } catch (error) {
      console.error('Error fetching system info:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshSystemInfo = async () => {
    setRefreshing(true);
    await fetchSystemInfo();
    setRefreshing(false);
  };

  const toggleMaintenanceMode = async () => {
    try {
      // TODO: Implement API call
      const newMode = systemInfo.maintenance.mode === 'normal' ? 'maintenance' : 'normal';
      setSystemInfo(prev => ({
        ...prev,
        maintenance: {
          ...prev.maintenance,
          mode: newMode
        }
      }));
    } catch (error) {
      console.error('Error toggling maintenance mode:', error);
    }
  };

  const restartService = async (serviceName) => {
    try {
      // TODO: Implement API call
      console.log(`Restarting service: ${serviceName}`);
      // Simulate service restart
      setSystemInfo(prev => ({
        ...prev,
        services: {
          ...prev.services,
          [serviceName]: {
            ...prev.services[serviceName],
            status: 'restarting'
          }
        }
      }));

      setTimeout(() => {
        setSystemInfo(prev => ({
          ...prev,
          services: {
            ...prev.services,
            [serviceName]: {
              ...prev.services[serviceName],
              status: 'running'
            }
          }
        }));
      }, 3000);
    } catch (error) {
      console.error('Error restarting service:', error);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
      case 'running':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'error':
      case 'down':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'restarting':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      healthy: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', text: 'سليم' },
      running: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', text: 'يعمل' },
      warning: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300', text: 'تحذير' },
      error: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', text: 'خطأ' },
      restarting: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', text: 'إعادة تشغيل' }
    };
    
    const config = statusConfig[status] || statusConfig.healthy;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const getLogLevelColor = (level) => {
    switch (level) {
      case 'error':
        return 'text-red-600 dark:text-red-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'info':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <Database className="w-8 h-8 mr-3 text-purple-600" />
              إدارة النظام
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              مراقبة وإدارة النظام والخوادم
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={refreshSystemInfo}
              disabled={refreshing}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              تحديث
            </button>
            <button
              onClick={toggleMaintenanceMode}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                systemInfo?.maintenance?.mode === 'maintenance'
                  ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                  : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
              }`}
            >
              <Settings className="w-4 h-4 mr-2" />
              {systemInfo?.maintenance?.mode === 'maintenance' ? 'إنهاء الصيانة' : 'وضع الصيانة'}
            </button>
          </div>
        </div>

        {/* System Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Server Status */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Server className="w-8 h-8 text-blue-600" />
              </div>
              <div className="mr-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    حالة الخادم
                  </dt>
                  <dd className="flex items-center">
                    <div className="text-lg font-medium text-gray-900 dark:text-white">
                      {getStatusBadge(systemInfo?.server?.status)}
                    </div>
                  </dd>
                </dl>
              </div>
              <div className="flex-shrink-0">
                {getStatusIcon(systemInfo?.server?.status)}
              </div>
            </div>
            <div className="mt-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                وقت التشغيل: {systemInfo?.server?.uptime}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                الإصدار: {systemInfo?.server?.version}
              </div>
            </div>
          </div>

          {/* Database Status */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Database className="w-8 h-8 text-green-600" />
              </div>
              <div className="mr-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    قاعدة البيانات
                  </dt>
                  <dd className="flex items-center">
                    <div className="text-lg font-medium text-gray-900 dark:text-white">
                      {getStatusBadge(systemInfo?.database?.status)}
                    </div>
                  </dd>
                </dl>
              </div>
              <div className="flex-shrink-0">
                {getStatusIcon(systemInfo?.database?.status)}
              </div>
            </div>
            <div className="mt-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                الاتصالات: {systemInfo?.database?.connections}/{systemInfo?.database?.max_connections}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                الحجم: {systemInfo?.database?.size}
              </div>
            </div>
          </div>

          {/* CPU Usage */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Activity className="w-8 h-8 text-purple-600" />
              </div>
              <div className="mr-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    استخدام المعالج
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {systemInfo?.server?.cpu_usage}%
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-4">
              <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full" 
                  style={{ width: `${systemInfo?.server?.cpu_usage}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Memory Usage */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Server className="w-8 h-8 text-orange-600" />
              </div>
              <div className="mr-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    استخدام الذاكرة
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {systemInfo?.server?.memory_usage}%
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-4">
              <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-orange-600 h-2 rounded-full" 
                  style={{ width: `${systemInfo?.server?.memory_usage}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Services Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">حالة الخدمات</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(systemInfo?.services || {}).map(([serviceName, service]) => (
                <div key={serviceName} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {getStatusIcon(service.status)}
                      <span className="mr-3 text-sm font-medium text-gray-900 dark:text-white capitalize">
                        {serviceName}
                      </span>
                    </div>
                    {getStatusBadge(service.status)}
                  </div>
                  {service.response_time && (
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      زمن الاستجابة: {service.response_time}
                    </div>
                  )}
                  {service.connections && (
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      الاتصالات: {service.connections}
                    </div>
                  )}
                  {service.queue && (
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      الطابور: {service.queue}
                    </div>
                  )}
                  {service.usage && (
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      الاستخدام: {service.usage}
                    </div>
                  )}
                  <div className="mt-3">
                    <button
                      onClick={() => restartService(serviceName)}
                      disabled={service.status === 'restarting'}
                      className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 mr-1 ${service.status === 'restarting' ? 'animate-spin' : ''}`} />
                      إعادة تشغيل
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* System Logs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">سجلات النظام</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {systemInfo?.logs?.map((log, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex-shrink-0">
                    {log.level === 'error' && <XCircle className="w-5 h-5 text-red-500" />}
                    {log.level === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-500" />}
                    {log.level === 'info' && <CheckCircle className="w-5 h-5 text-blue-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${getLogLevelColor(log.level)}`}>
                      {log.message}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {log.timestamp}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Maintenance Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">معلومات الصيانة</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">الوضع الحالي</dt>
                <dd className="mt-1">
                  {systemInfo?.maintenance?.mode === 'maintenance' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                      وضع الصيانة
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                      وضع عادي
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">آخر صيانة</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {systemInfo?.maintenance?.last_maintenance}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">الصيانة القادمة</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {systemInfo?.maintenance?.next_scheduled}
                </dd>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSystemPage; 