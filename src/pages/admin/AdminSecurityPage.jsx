import React, { useState, useEffect } from 'react';
import { Shield, Lock, Eye, AlertTriangle, Users, Activity, Settings, RefreshCw } from 'lucide-react';
import AdminLayout from '../../components/Layout/AdminLayout';

const AdminSecurityPage = () => {
  const [securityData, setSecurityData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      const response = await fetch('/api/admin/security');
      if (response.ok) {
        const data = await response.json();
        setSecurityData(data);
      } else {
        // Mock data for now
        setSecurityData({
          overview: {
            threat_level: 'low',
            active_sessions: 142,
            failed_logins_24h: 8,
            blocked_ips: 3,
            security_alerts: 2,
            last_scan: '2024-01-20 14:30'
          },
          threats: [
            {
              id: 1,
              type: 'Brute Force Attack',
              severity: 'high',
              source_ip: '192.168.1.100',
              target: 'admin login',
              attempts: 15,
              status: 'blocked',
              detected_at: '2024-01-20 13:45',
              location: 'Unknown'
            },
            {
              id: 2,
              type: 'Suspicious Activity',
              severity: 'medium',
              source_ip: '10.0.0.50',
              target: 'user registration',
              attempts: 5,
              status: 'monitoring',
              detected_at: '2024-01-20 12:30',
              location: 'Morocco'
            }
          ],
          access_logs: [
            {
              id: 1,
              user: 'أحمد الإدارة',
              action: 'Admin Login',
              ip: '192.168.1.10',
              location: 'Morocco, Casablanca',
              timestamp: '2024-01-20 15:30',
              status: 'success',
              device: 'Chrome on Windows'
            },
            {
              id: 2,
              user: 'سارة المراقبة',
              action: 'View Reports',
              ip: '192.168.1.15',
              location: 'Morocco, Rabat',
              timestamp: '2024-01-20 15:15',
              status: 'success',
              device: 'Firefox on MacOS'
            },
            {
              id: 3,
              user: 'محمد القارئ',
              action: 'Failed Login',
              ip: '192.168.1.20',
              location: 'Morocco, Marrakech',
              timestamp: '2024-01-20 14:45',
              status: 'failed',
              device: 'Safari on iPhone'
            }
          ],
          settings: {
            password_policy: {
              min_length: 8,
              require_uppercase: true,
              require_lowercase: true,
              require_numbers: true,
              require_symbols: true,
              expiry_days: 90
            },
            session_settings: {
              timeout_minutes: 60,
              max_concurrent_sessions: 3,
              force_logout_on_password_change: true
            },
            security_features: {
              two_factor_auth: true,
              ip_whitelist: false,
              captcha_enabled: true,
              email_notifications: true,
              audit_logging: true
            }
          }
        });
      }
    } catch (error) {
      console.error('Error fetching security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSecuritySetting = async (category, setting, value) => {
    try {
      // TODO: Implement API call
      setSecurityData(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          [category]: {
            ...prev.settings[category],
            [setting]: value
          }
        }
      }));
    } catch (error) {
      console.error('Error updating security setting:', error);
    }
  };

  const blockIP = async (ip) => {
    try {
      // TODO: Implement API call
      console.log(`Blocking IP: ${ip}`);
    } catch (error) {
      console.error('Error blocking IP:', error);
    }
  };

  const getThreatLevelBadge = (level) => {
    const levelConfig = {
      low: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', text: 'منخفض' },
      medium: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300', text: 'متوسط' },
      high: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', text: 'عالي' },
      critical: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', text: 'حرج' }
    };
    
    const config = levelConfig[level] || levelConfig.low;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const getSeverityBadge = (severity) => {
    const severityConfig = {
      low: { color: 'bg-blue-100 text-blue-800', text: 'منخفض' },
      medium: { color: 'bg-yellow-100 text-yellow-800', text: 'متوسط' },
      high: { color: 'bg-red-100 text-red-800', text: 'عالي' },
      critical: { color: 'bg-red-100 text-red-800', text: 'حرج' }
    };
    
    const config = severityConfig[severity] || severityConfig.low;
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      success: { color: 'bg-green-100 text-green-800', text: 'نجح' },
      failed: { color: 'bg-red-100 text-red-800', text: 'فشل' },
      blocked: { color: 'bg-red-100 text-red-800', text: 'محظور' },
      monitoring: { color: 'bg-yellow-100 text-yellow-800', text: 'مراقبة' }
    };
    
    const config = statusConfig[status] || statusConfig.success;
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <Shield className="w-8 h-8 mr-3 text-purple-600" />
              إدارة الأمان
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              مراقبة وإدارة أمان المنصة
            </p>
          </div>
          <button
            onClick={fetchSecurityData}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            تحديث
          </button>
        </div>

        {/* Security Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <Shield className="w-8 h-8 text-green-600" />
              <div className="mr-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">مستوى التهديد</p>
                {getThreatLevelBadge(securityData?.overview?.threat_level)}
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-600" />
              <div className="mr-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">جلسات نشطة</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{securityData?.overview?.active_sessions}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <Lock className="w-8 h-8 text-red-600" />
              <div className="mr-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">محاولات فاشلة</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{securityData?.overview?.failed_logins_24h}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-orange-600" />
              <div className="mr-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">عناوين محظورة</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{securityData?.overview?.blocked_ips}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <Eye className="w-8 h-8 text-purple-600" />
              <div className="mr-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">تنبيهات أمنية</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{securityData?.overview?.security_alerts}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <Activity className="w-8 h-8 text-green-600" />
              <div className="mr-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">آخر فحص</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">{securityData?.overview?.last_scan}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="border-b border-gray-200 dark:border-gray-600">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { id: 'threats', name: 'التهديدات', icon: AlertTriangle },
                { id: 'access', name: 'سجل الوصول', icon: Eye },
                { id: 'settings', name: 'إعدادات الأمان', icon: Settings }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`${
                      activeTab === tab.id
                        ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {/* Threats Tab */}
            {activeTab === 'threats' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">التهديدات المكتشفة</h3>
                {securityData?.threats?.map((threat) => (
                  <div key={threat.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-medium text-gray-900 dark:text-white">{threat.type}</h4>
                          {getSeverityBadge(threat.severity)}
                          {getStatusBadge(threat.status)}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <div>
                            <p><span className="font-medium">عنوان IP:</span> {threat.source_ip}</p>
                            <p><span className="font-medium">الهدف:</span> {threat.target}</p>
                          </div>
                          <div>
                            <p><span className="font-medium">المحاولات:</span> {threat.attempts}</p>
                            <p><span className="font-medium">وقت الاكتشاف:</span> {threat.detected_at}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {threat.status !== 'blocked' && (
                          <button
                            onClick={() => blockIP(threat.source_ip)}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                          >
                            حظر IP
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Access Logs Tab */}
            {activeTab === 'access' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">سجل الوصول</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          المستخدم
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          الإجراء
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          عنوان IP
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          الموقع
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          الوقت
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          الحالة
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                      {securityData?.access_logs?.map((log) => (
                        <tr key={log.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {log.user}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {log.action}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {log.ip}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {log.location}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {log.timestamp}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(log.status)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">إعدادات الأمان</h3>
                
                {/* Password Policy */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">سياسة كلمات المرور</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        الحد الأدنى للطول
                      </label>
                      <input
                        type="number"
                        value={securityData?.settings?.password_policy?.min_length}
                        onChange={(e) => updateSecuritySetting('password_policy', 'min_length', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-600 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        انتهاء الصلاحية (أيام)
                      </label>
                      <input
                        type="number"
                        value={securityData?.settings?.password_policy?.expiry_days}
                        onChange={(e) => updateSecuritySetting('password_policy', 'expiry_days', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-600 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    {[
                      { key: 'require_uppercase', label: 'يتطلب أحرف كبيرة' },
                      { key: 'require_lowercase', label: 'يتطلب أحرف صغيرة' },
                      { key: 'require_numbers', label: 'يتطلب أرقام' },
                      { key: 'require_symbols', label: 'يتطلب رموز' }
                    ].map((setting) => (
                      <label key={setting.key} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={securityData?.settings?.password_policy?.[setting.key]}
                          onChange={(e) => updateSecuritySetting('password_policy', setting.key, e.target.checked)}
                          className="rounded border-gray-300 text-purple-600 shadow-sm focus:border-purple-300 focus:ring focus:ring-purple-200 focus:ring-opacity-50"
                        />
                        <span className="mr-2 text-sm text-gray-700 dark:text-gray-300">{setting.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Security Features */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">ميزات الأمان</h4>
                  <div className="space-y-3">
                    {[
                      { key: 'two_factor_auth', label: 'المصادقة الثنائية' },
                      { key: 'ip_whitelist', label: 'قائمة IP البيضاء' },
                      { key: 'captcha_enabled', label: 'تفعيل CAPTCHA' },
                      { key: 'email_notifications', label: 'إشعارات البريد الإلكتروني' },
                      { key: 'audit_logging', label: 'تسجيل التدقيق' }
                    ].map((setting) => (
                      <label key={setting.key} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700 dark:text-gray-300">{setting.label}</span>
                        <input
                          type="checkbox"
                          checked={securityData?.settings?.security_features?.[setting.key]}
                          onChange={(e) => updateSecuritySetting('security_features', setting.key, e.target.checked)}
                          className="rounded border-gray-300 text-purple-600 shadow-sm focus:border-purple-300 focus:ring focus:ring-purple-200 focus:ring-opacity-50"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSecurityPage; 