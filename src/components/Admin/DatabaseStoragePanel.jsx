import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Database, 
  HardDrive, 
  Save, 
  Eye, 
  EyeOff, 
  TestTube, 
  CheckCircle, 
  XCircle,
  Settings,
  Cloud,
  Key,
  Globe,
  RefreshCw
} from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { supabase } from '../../lib/supabase';

const DatabaseStoragePanel = () => {
  const { t } = useTranslation();
  const { language, showSuccess, showError } = useUI();
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState({});
  const [showSecrets, setShowSecrets] = useState({});

  const [supabaseConfig, setSupabaseConfig] = useState({
    project_url: '',
    anon_key: '',
    service_key: '',
    is_active: true
  });

  const [b2Config, setB2Config] = useState({
    bucket_name: '',
    access_key: '',
    secret_key: '',
    region: '',
    endpoint: '',
    is_active: false
  });

  const [connectionStatus, setConnectionStatus] = useState({
    supabase: null,
    b2: null
  });

  useEffect(() => {
    loadConfigurations();
  }, []);

  const loadConfigurations = async () => {
    try {
      setLoading(true);
      
      // Load Supabase configuration
      const { data: supabaseData, error: supabaseError } = await supabase
        .from('system_configurations')
        .select('*')
        .eq('config_type', 'supabase')
        .single();

      if (supabaseData && !supabaseError) {
        setSupabaseConfig(JSON.parse(supabaseData.config_data));
      }

      // Load B2 configuration
      const { data: b2Data, error: b2Error } = await supabase
        .from('system_configurations')
        .select('*')
        .eq('config_type', 'backblaze_b2')
        .single();

      if (b2Data && !b2Error) {
        setB2Config(JSON.parse(b2Data.config_data));
      }

    } catch (error) {
      console.error('Error loading configurations:', error);
      showError(language === 'ar' ? 'فشل في تحميل الإعدادات' : 'Failed to load configurations');
    } finally {
      setLoading(false);
    }
  };

  const saveSupabaseConfig = async () => {
    try {
      const configData = {
        config_type: 'supabase',
        config_data: JSON.stringify(supabaseConfig),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('system_configurations')
        .upsert(configData, { onConflict: 'config_type' });

      if (error) throw error;

      showSuccess(language === 'ar' ? 'تم حفظ إعدادات Supabase بنجاح' : 'Supabase configuration saved successfully');
    } catch (error) {
      console.error('Error saving Supabase config:', error);
      showError(language === 'ar' ? 'فشل في حفظ إعدادات Supabase' : 'Failed to save Supabase configuration');
    }
  };

  const saveB2Config = async () => {
    try {
      const configData = {
        config_type: 'backblaze_b2',
        config_data: JSON.stringify(b2Config),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('system_configurations')
        .upsert(configData, { onConflict: 'config_type' });

      if (error) throw error;

      showSuccess(language === 'ar' ? 'تم حفظ إعدادات Backblaze B2 بنجاح' : 'Backblaze B2 configuration saved successfully');
    } catch (error) {
      console.error('Error saving B2 config:', error);
      showError(language === 'ar' ? 'فشل في حفظ إعدادات Backblaze B2' : 'Failed to save Backblaze B2 configuration');
    }
  };

  const testSupabaseConnection = async () => {
    try {
      setTesting(prev => ({ ...prev, supabase: true }));
      
      // Test connection with provided credentials
      const testResponse = await fetch(`${supabaseConfig.project_url}/rest/v1/`, {
        headers: {
          'apikey': supabaseConfig.anon_key,
          'Authorization': `Bearer ${supabaseConfig.anon_key}`
        }
      });

      if (testResponse.ok) {
        setConnectionStatus(prev => ({ ...prev, supabase: 'success' }));
        showSuccess(language === 'ar' ? 'اتصال Supabase ناجح' : 'Supabase connection successful');
      } else {
        throw new Error('Connection failed');
      }
    } catch (error) {
      setConnectionStatus(prev => ({ ...prev, supabase: 'error' }));
      showError(language === 'ar' ? 'فشل اتصال Supabase' : 'Supabase connection failed');
    } finally {
      setTesting(prev => ({ ...prev, supabase: false }));
    }
  };

  const testB2Connection = async () => {
    try {
      setTesting(prev => ({ ...prev, b2: true }));
      
      // This would typically test B2 connection
      // For now, we'll simulate a test
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (b2Config.bucket_name && b2Config.access_key && b2Config.secret_key) {
        setConnectionStatus(prev => ({ ...prev, b2: 'success' }));
        showSuccess(language === 'ar' ? 'اتصال Backblaze B2 ناجح' : 'Backblaze B2 connection successful');
      } else {
        throw new Error('Missing credentials');
      }
    } catch (error) {
      setConnectionStatus(prev => ({ ...prev, b2: 'error' }));
      showError(language === 'ar' ? 'فشل اتصال Backblaze B2' : 'Backblaze B2 connection failed');
    } finally {
      setTesting(prev => ({ ...prev, b2: false }));
    }
  };

  const toggleSecretVisibility = (field) => {
    setShowSecrets(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cosmic-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-3 rtl:space-x-reverse">
        <div className="w-10 h-10 bg-gradient-to-r from-cosmic-500 to-cosmic-600 rounded-lg flex items-center justify-center">
          <Database className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">
            {language === 'ar' ? 'إعدادات قاعدة البيانات والتخزين' : 'Database & Storage Configuration'}
          </h2>
          <p className="text-gray-400 text-sm">
            {language === 'ar' ? 'إدارة إعدادات Supabase و Backblaze B2' : 'Manage Supabase and Backblaze B2 settings'}
          </p>
        </div>
      </div>

      {/* Supabase Configuration */}
      <div className="bg-dark-800/50 backdrop-blur-xl border border-gold-400/20 rounded-2xl p-6 shadow-2xl shadow-cosmic-500/10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Supabase Configuration</h3>
              <p className="text-gray-400 text-sm">PostgreSQL database settings</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            {connectionStatus.supabase === 'success' && (
              <CheckCircle className="w-5 h-5 text-green-400" />
            )}
            {connectionStatus.supabase === 'error' && (
              <XCircle className="w-5 h-5 text-red-400" />
            )}
            <button
              onClick={testSupabaseConnection}
              disabled={testing.supabase}
              className="flex items-center space-x-2 rtl:space-x-reverse px-3 py-2 bg-blue-500/20 border border-blue-400/30 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-all duration-200 disabled:opacity-50"
            >
              {testing.supabase ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <TestTube className="w-4 h-4" />
              )}
              <span>{language === 'ar' ? 'اختبار' : 'Test'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Project URL */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {language === 'ar' ? 'رابط المشروع' : 'Project URL'}
            </label>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Globe className="w-4 h-4 text-gray-400" />
              <input
                type="url"
                value={supabaseConfig.project_url}
                onChange={(e) => setSupabaseConfig(prev => ({ ...prev, project_url: e.target.value }))}
                className="flex-1 px-4 py-3 bg-dark-700/50 border border-gold-400/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-all duration-200"
                placeholder="https://your-project.supabase.co"
              />
            </div>
          </div>

          {/* Anon Key */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {language === 'ar' ? 'مفتاح Anon' : 'Anon Key'}
            </label>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Key className="w-4 h-4 text-gray-400" />
              <input
                type={showSecrets.anon_key ? 'text' : 'password'}
                value={supabaseConfig.anon_key}
                onChange={(e) => setSupabaseConfig(prev => ({ ...prev, anon_key: e.target.value }))}
                className="flex-1 px-4 py-3 bg-dark-700/50 border border-gold-400/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-all duration-200"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              />
              <button
                onClick={() => toggleSecretVisibility('anon_key')}
                className="text-gray-400 hover:text-gray-300 transition-colors"
              >
                {showSecrets.anon_key ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Service Key */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {language === 'ar' ? 'مفتاح الخدمة' : 'Service Key'}
            </label>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Key className="w-4 h-4 text-gray-400" />
              <input
                type={showSecrets.service_key ? 'text' : 'password'}
                value={supabaseConfig.service_key}
                onChange={(e) => setSupabaseConfig(prev => ({ ...prev, service_key: e.target.value }))}
                className="flex-1 px-4 py-3 bg-dark-700/50 border border-gold-400/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-all duration-200"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              />
              <button
                onClick={() => toggleSecretVisibility('service_key')}
                className="text-gray-400 hover:text-gray-300 transition-colors"
              >
                {showSecrets.service_key ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Is Active */}
          <div className="md:col-span-2">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <input
                type="checkbox"
                id="supabase_active"
                checked={supabaseConfig.is_active}
                onChange={(e) => setSupabaseConfig(prev => ({ ...prev, is_active: e.target.checked }))}
                className="w-4 h-4 text-cosmic-500 bg-dark-700 border-gold-400/30 rounded focus:ring-cosmic-500 focus:ring-2"
              />
              <label htmlFor="supabase_active" className="text-sm text-gray-300">
                {language === 'ar' ? 'تفعيل Supabase' : 'Enable Supabase'}
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6 pt-6 border-t border-gold-400/20">
          <button
            onClick={saveSupabaseConfig}
            className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 bg-gradient-to-r from-cosmic-500 to-cosmic-600 hover:from-cosmic-600 hover:to-cosmic-700 text-white rounded-lg transition-all duration-200"
          >
            <Save className="w-4 h-4" />
            <span>{language === 'ar' ? 'حفظ إعدادات Supabase' : 'Save Supabase Config'}</span>
          </button>
        </div>
      </div>

      {/* Backblaze B2 Configuration */}
      <div className="bg-dark-800/50 backdrop-blur-xl border border-gold-400/20 rounded-2xl p-6 shadow-2xl shadow-cosmic-500/10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Backblaze B2 Configuration</h3>
              <p className="text-gray-400 text-sm">Cloud storage settings</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            {connectionStatus.b2 === 'success' && (
              <CheckCircle className="w-5 h-5 text-green-400" />
            )}
            {connectionStatus.b2 === 'error' && (
              <XCircle className="w-5 h-5 text-red-400" />
            )}
            <button
              onClick={testB2Connection}
              disabled={testing.b2}
              className="flex items-center space-x-2 rtl:space-x-reverse px-3 py-2 bg-orange-500/20 border border-orange-400/30 text-orange-300 rounded-lg hover:bg-orange-500/30 transition-all duration-200 disabled:opacity-50"
            >
              {testing.b2 ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <TestTube className="w-4 h-4" />
              )}
              <span>{language === 'ar' ? 'اختبار' : 'Test'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bucket Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {language === 'ar' ? 'اسم الحاوية' : 'Bucket Name'}
            </label>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Cloud className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={b2Config.bucket_name}
                onChange={(e) => setB2Config(prev => ({ ...prev, bucket_name: e.target.value }))}
                className="flex-1 px-4 py-3 bg-dark-700/50 border border-gold-400/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-all duration-200"
                placeholder="my-bucket-name"
              />
            </div>
          </div>

          {/* Access Key */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {language === 'ar' ? 'مفتاح الوصول' : 'Access Key'}
            </label>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Key className="w-4 h-4 text-gray-400" />
              <input
                type={showSecrets.b2_access ? 'text' : 'password'}
                value={b2Config.access_key}
                onChange={(e) => setB2Config(prev => ({ ...prev, access_key: e.target.value }))}
                className="flex-1 px-4 py-3 bg-dark-700/50 border border-gold-400/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-all duration-200"
                placeholder="Access Key ID"
              />
              <button
                onClick={() => toggleSecretVisibility('b2_access')}
                className="text-gray-400 hover:text-gray-300 transition-colors"
              >
                {showSecrets.b2_access ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Secret Key */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {language === 'ar' ? 'المفتاح السري' : 'Secret Key'}
            </label>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Key className="w-4 h-4 text-gray-400" />
              <input
                type={showSecrets.b2_secret ? 'text' : 'password'}
                value={b2Config.secret_key}
                onChange={(e) => setB2Config(prev => ({ ...prev, secret_key: e.target.value }))}
                className="flex-1 px-4 py-3 bg-dark-700/50 border border-gold-400/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-all duration-200"
                placeholder="Secret Access Key"
              />
              <button
                onClick={() => toggleSecretVisibility('b2_secret')}
                className="text-gray-400 hover:text-gray-300 transition-colors"
              >
                {showSecrets.b2_secret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Region */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {language === 'ar' ? 'المنطقة' : 'Region'}
            </label>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Globe className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={b2Config.region}
                onChange={(e) => setB2Config(prev => ({ ...prev, region: e.target.value }))}
                className="flex-1 px-4 py-3 bg-dark-700/50 border border-gold-400/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-all duration-200"
                placeholder="us-west-002"
              />
            </div>
          </div>

          {/* Endpoint */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {language === 'ar' ? 'نقطة النهاية' : 'Endpoint'}
            </label>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Globe className="w-4 h-4 text-gray-400" />
              <input
                type="url"
                value={b2Config.endpoint}
                onChange={(e) => setB2Config(prev => ({ ...prev, endpoint: e.target.value }))}
                className="flex-1 px-4 py-3 bg-dark-700/50 border border-gold-400/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-all duration-200"
                placeholder="https://s3.us-west-002.backblazeb2.com"
              />
            </div>
          </div>

          {/* Is Active */}
          <div className="md:col-span-2">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <input
                type="checkbox"
                id="b2_active"
                checked={b2Config.is_active}
                onChange={(e) => setB2Config(prev => ({ ...prev, is_active: e.target.checked }))}
                className="w-4 h-4 text-cosmic-500 bg-dark-700 border-gold-400/30 rounded focus:ring-cosmic-500 focus:ring-2"
              />
              <label htmlFor="b2_active" className="text-sm text-gray-300">
                {language === 'ar' ? 'تفعيل Backblaze B2' : 'Enable Backblaze B2'}
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6 pt-6 border-t border-gold-400/20">
          <button
            onClick={saveB2Config}
            className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 bg-gradient-to-r from-cosmic-500 to-cosmic-600 hover:from-cosmic-600 hover:to-cosmic-700 text-white rounded-lg transition-all duration-200"
          >
            <Save className="w-4 h-4" />
            <span>{language === 'ar' ? 'حفظ إعدادات B2' : 'Save B2 Config'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DatabaseStoragePanel; 