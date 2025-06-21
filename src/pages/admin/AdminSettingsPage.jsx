import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Bell, 
  Moon, 
  Sun, 
  Globe, 
  Shield, 
  Database, 
  Mail, 
  Smartphone,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import AdminLayout from '../../components/Layout/AdminLayout';

const AdminSettingsPage = () => {
  const [settings, setSettings] = useState({
    // Notification Settings
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    emergencyAlerts: true,
    dailyReports: true,
    weeklyReports: true,
    
    // Display Settings
    theme: 'dark',
    language: 'ar',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    timezone: 'Africa/Casablanca',
    
    // Security Settings
    sessionTimeout: 60,
    twoFactorAuth: false,
    loginAlerts: true,
    passwordExpiry: 90,
    
    // System Settings
    autoBackup: true,
    backupFrequency: 'daily',
    maxLoginAttempts: 5,
    dataRetention: 365,
    
    // Admin Preferences
    defaultDashboard: 'overview',
    itemsPerPage: 25,
    autoRefresh: true,
    refreshInterval: 30
  });

  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSettingChange = (category, setting, value) => {
    setSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Save to localStorage for demo
      localStorage.setItem('adminSettings', JSON.stringify(settings));
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetToDefaults = () => {
    setSettings({
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      emergencyAlerts: true,
      dailyReports: true,
      weeklyReports: true,
      theme: 'dark',
      language: 'ar',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      timezone: 'Africa/Casablanca',
      sessionTimeout: 60,
      twoFactorAuth: false,
      loginAlerts: true,
      passwordExpiry: 90,
      autoBackup: true,
      backupFrequency: 'daily',
      maxLoginAttempts: 5,
      dataRetention: 365,
      defaultDashboard: 'overview',
      itemsPerPage: 25,
      autoRefresh: true,
      refreshInterval: 30
    });
  };

  useEffect(() => {
    // Load settings from localStorage on component mount
    const savedSettings = localStorage.getItem('adminSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const SettingCard = ({ title, description, icon: Icon, children }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center mb-4">
        <Icon className="w-6 h-6 text-purple-600 mr-3" />
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{title}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );

  const ToggleSwitch = ({ enabled, onChange, label, description }) => (
    <div className="flex items-center justify-between py-3">
      <div>
        <div className="text-sm font-medium text-gray-900 dark:text-white">{label}</div>
        {description && (
          <div className="text-xs text-gray-600 dark:text-gray-400">{description}</div>
        )}
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
          enabled ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-600'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <Settings className="w-8 h-8 mr-3 text-purple-600" />
              إعدادات النظام
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              إدارة تفضيلات النظام والإعدادات الشخصية
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={resetToDefaults}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              استعادة الافتراضي
            </button>
            <button
              onClick={handleSaveSettings}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : saved ? (
                <CheckCircle className="w-4 h-4 mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {loading ? 'جاري الحفظ...' : saved ? 'تم الحفظ' : 'حفظ الإعدادات'}
            </button>
          </div>
        </div>

        {saved && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              <span className="text-green-800 dark:text-green-200">تم حفظ الإعدادات بنجاح</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Notification Settings */}
          <SettingCard
            title="إعدادات الإشعارات"
            description="إدارة تفضيلات الإشعارات والتنبيهات"
            icon={Bell}
          >
            <div className="space-y-1">
              <ToggleSwitch
                enabled={settings.emailNotifications}
                onChange={(value) => handleSettingChange('notifications', 'emailNotifications', value)}
                label="إشعارات البريد الإلكتروني"
                description="تلقي الإشعارات عبر البريد الإلكتروني"
              />
              <ToggleSwitch
                enabled={settings.smsNotifications}
                onChange={(value) => handleSettingChange('notifications', 'smsNotifications', value)}
                label="إشعارات الرسائل النصية"
                description="تلقي الإشعارات عبر الرسائل النصية"
              />
              <ToggleSwitch
                enabled={settings.pushNotifications}
                onChange={(value) => handleSettingChange('notifications', 'pushNotifications', value)}
                label="الإشعارات الفورية"
                description="تلقي الإشعارات الفورية في المتصفح"
              />
              <ToggleSwitch
                enabled={settings.emergencyAlerts}
                onChange={(value) => handleSettingChange('notifications', 'emergencyAlerts', value)}
                label="تنبيهات الطوارئ"
                description="تلقي تنبيهات فورية للحالات الطارئة"
              />
              <ToggleSwitch
                enabled={settings.dailyReports}
                onChange={(value) => handleSettingChange('notifications', 'dailyReports', value)}
                label="التقارير اليومية"
                description="تلقي ملخص يومي للأنشطة"
              />
              <ToggleSwitch
                enabled={settings.weeklyReports}
                onChange={(value) => handleSettingChange('notifications', 'weeklyReports', value)}
                label="التقارير الأسبوعية"
                description="تلقي تقرير أسبوعي مفصل"
              />
            </div>
          </SettingCard>

          {/* Display Settings */}
          <SettingCard
            title="إعدادات العرض"
            description="تخصيص مظهر واجهة المستخدم"
            icon={settings.theme === 'dark' ? Moon : Sun}
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  السمة
                </label>
                <select
                  value={settings.theme}
                  onChange={(e) => handleSettingChange('display', 'theme', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="light">فاتح</option>
                  <option value="dark">داكن</option>
                  <option value="auto">تلقائي</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  اللغة
                </label>
                <select
                  value={settings.language}
                  onChange={(e) => handleSettingChange('display', 'language', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="ar">العربية</option>
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  تنسيق التاريخ
                </label>
                <select
                  value={settings.dateFormat}
                  onChange={(e) => handleSettingChange('display', 'dateFormat', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  تنسيق الوقت
                </label>
                <select
                  value={settings.timeFormat}
                  onChange={(e) => handleSettingChange('display', 'timeFormat', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="12h">12 ساعة</option>
                  <option value="24h">24 ساعة</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  المنطقة الزمنية
                </label>
                <select
                  value={settings.timezone}
                  onChange={(e) => handleSettingChange('display', 'timezone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="Africa/Casablanca">الدار البيضاء (GMT+1)</option>
                  <option value="Asia/Riyadh">الرياض (GMT+3)</option>
                  <option value="Asia/Dubai">دبي (GMT+4)</option>
                  <option value="Africa/Cairo">القاهرة (GMT+2)</option>
                </select>
              </div>
            </div>
          </SettingCard>

          {/* Security Settings */}
          <SettingCard
            title="إعدادات الأمان"
            description="إدارة إعدادات الأمان والحماية"
            icon={Shield}
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  مهلة الجلسة (بالدقائق)
                </label>
                <input
                  type="number"
                  value={settings.sessionTimeout}
                  onChange={(e) => handleSettingChange('security', 'sessionTimeout', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  min="15"
                  max="480"
                />
              </div>

              <ToggleSwitch
                enabled={settings.twoFactorAuth}
                onChange={(value) => handleSettingChange('security', 'twoFactorAuth', value)}
                label="المصادقة الثنائية"
                description="تفعيل المصادقة الثنائية للحماية الإضافية"
              />

              <ToggleSwitch
                enabled={settings.loginAlerts}
                onChange={(value) => handleSettingChange('security', 'loginAlerts', value)}
                label="تنبيهات تسجيل الدخول"
                description="تلقي تنبيهات عند تسجيل الدخول من أجهزة جديدة"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  انتهاء صلاحية كلمة المرور (بالأيام)
                </label>
                <input
                  type="number"
                  value={settings.passwordExpiry}
                  onChange={(e) => handleSettingChange('security', 'passwordExpiry', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  min="30"
                  max="365"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  الحد الأقصى لمحاولات تسجيل الدخول
                </label>
                <input
                  type="number"
                  value={settings.maxLoginAttempts}
                  onChange={(e) => handleSettingChange('security', 'maxLoginAttempts', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  min="3"
                  max="10"
                />
              </div>
            </div>
          </SettingCard>

          {/* System Settings */}
          <SettingCard
            title="إعدادات النظام"
            description="إدارة إعدادات النظام والنسخ الاحتياطي"
            icon={Database}
          >
            <div className="space-y-4">
              <ToggleSwitch
                enabled={settings.autoBackup}
                onChange={(value) => handleSettingChange('system', 'autoBackup', value)}
                label="النسخ الاحتياطي التلقائي"
                description="تفعيل النسخ الاحتياطي التلقائي للبيانات"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  تكرار النسخ الاحتياطي
                </label>
                <select
                  value={settings.backupFrequency}
                  onChange={(e) => handleSettingChange('system', 'backupFrequency', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  disabled={!settings.autoBackup}
                >
                  <option value="daily">يومي</option>
                  <option value="weekly">أسبوعي</option>
                  <option value="monthly">شهري</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  فترة الاحتفاظ بالبيانات (بالأيام)
                </label>
                <input
                  type="number"
                  value={settings.dataRetention}
                  onChange={(e) => handleSettingChange('system', 'dataRetention', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  min="30"
                  max="2555"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  لوحة التحكم الافتراضية
                </label>
                <select
                  value={settings.defaultDashboard}
                  onChange={(e) => handleSettingChange('system', 'defaultDashboard', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="overview">نظرة عامة</option>
                  <option value="analytics">التحليلات</option>
                  <option value="users">المستخدمون</option>
                  <option value="finances">المالية</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  عدد العناصر في الصفحة
                </label>
                <select
                  value={settings.itemsPerPage}
                  onChange={(e) => handleSettingChange('system', 'itemsPerPage', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <ToggleSwitch
                enabled={settings.autoRefresh}
                onChange={(value) => handleSettingChange('system', 'autoRefresh', value)}
                label="التحديث التلقائي"
                description="تحديث البيانات تلقائياً في الخلفية"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  فترة التحديث (بالثواني)
                </label>
                <input
                  type="number"
                  value={settings.refreshInterval}
                  onChange={(e) => handleSettingChange('system', 'refreshInterval', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  min="10"
                  max="300"
                  disabled={!settings.autoRefresh}
                />
              </div>
            </div>
          </SettingCard>
        </div>

        {/* Warning Section */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">تحذير</h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                تغيير بعض الإعدادات قد يؤثر على أداء النظام. تأكد من حفظ التغييرات قبل مغادرة الصفحة.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSettingsPage; 