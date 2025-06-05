import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUI } from '../../context/UIContext';
import { useConfig } from '../../context/ConfigContext';
import { 
  Settings, 
  Brain, 
  Database, 
  Cloud, 
  Bell,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Key,
  Server,
  Zap
} from 'lucide-react';
import Button from '../Button';
import Loader from '../Loader';

const ConfigurationPanel = () => {
  const { t } = useTranslation();
  const { language, showSuccess, showError } = useUI();
  const { config, updateConfig, reloadConfig, loading: configLoading } = useConfig();
  
  const [activeTab, setActiveTab] = useState('ai');
  const [loading, setLoading] = useState(false);
  const [showSecrets, setShowSecrets] = useState({});
  const [formData, setFormData] = useState({});
  const [aiProviders, setAiProviders] = useState([]);

  // Initialize form data when config loads
  useEffect(() => {
    if (config && Object.keys(config).length > 0) {
      setFormData(config);
      setAiProviders(config.ai_providers || []);
    }
  }, [config]);

  const tabs = [
    {
      id: 'ai',
      name: language === 'ar' ? 'إدارة الذكاء الاصطناعي' : 'AI Management',
      icon: Brain,
      color: 'from-purple-500 to-purple-600'
    },
    {
      id: 'database',
      name: language === 'ar' ? 'إعدادات قاعدة البيانات' : 'Database Settings',
      icon: Database,
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 'storage',
      name: language === 'ar' ? 'إعدادات التخزين' : 'Storage Settings',
      icon: Cloud,
      color: 'from-green-500 to-green-600'
    },
    {
      id: 'notifications',
      name: language === 'ar' ? 'إعدادات الإشعارات' : 'Notification Settings',
      icon: Bell,
      color: 'from-gold-500 to-gold-600'
    }
  ];

  const toggleSecretVisibility = (key) => {
    setShowSecrets(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleInputChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveConfig = async (section) => {
    try {
      setLoading(true);
      
      const sectionKeys = Object.keys(formData).filter(key => {
        if (section === 'ai') return key.startsWith('ai_') || key.includes('api_key');
        if (section === 'database') return key.startsWith('supabase_') || key.startsWith('database_');
        if (section === 'storage') return key.startsWith('storage_') || key.startsWith('b2_');
        if (section === 'notifications') return key.startsWith('notifications_') || key.startsWith('email_') || key.startsWith('push_');
        return false;
      });

      for (const key of sectionKeys) {
        const result = await updateConfig(key, formData[key], section);
        if (!result.success) {
          throw new Error(result.error);
        }
      }

      // Save AI providers separately
      if (section === 'ai') {
        await updateConfig('ai_providers', aiProviders, 'ai');
      }

      showSuccess(
        language === 'ar' 
          ? 'تم حفظ الإعدادات بنجاح'
          : 'Configuration saved successfully'
      );
    } catch (error) {
      console.error('Error saving configuration:', error);
      showError(
        language === 'ar' 
          ? 'فشل في حفظ الإعدادات'
          : 'Failed to save configuration'
      );
    } finally {
      setLoading(false);
    }
  };

  const addAIProvider = () => {
    const newProvider = {
      id: `provider_${Date.now()}`,
      name: '',
      host: '',
      apiKey: '',
      models: [],
      enabled: true,
      isDefault: false
    };
    setAiProviders(prev => [...prev, newProvider]);
  };

  const updateAIProvider = (index, field, value) => {
    setAiProviders(prev => prev.map((provider, i) => 
      i === index ? { ...provider, [field]: value } : provider
    ));
  };

  const removeAIProvider = (index) => {
    setAiProviders(prev => prev.filter((_, i) => i !== index));
  };

  const addModelToProvider = (providerIndex, modelName) => {
    if (!modelName.trim()) return;
    
    setAiProviders(prev => prev.map((provider, i) => 
      i === providerIndex 
        ? { ...provider, models: [...provider.models, modelName.trim()] }
        : provider
    ));
  };

  const removeModelFromProvider = (providerIndex, modelIndex) => {
    setAiProviders(prev => prev.map((provider, i) => 
      i === providerIndex 
        ? { ...provider, models: provider.models.filter((_, mi) => mi !== modelIndex) }
        : provider
    ));
  };

  const SecretInput = ({ label, value, onChange, placeholder }) => (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        {label}
      </label>
      <div className="relative">
        <input
          type={showSecrets[label] ? 'text' : 'password'}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-3 pr-12 bg-dark-700/50 border border-gold-400/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-all duration-200"
        />
        <button
          type="button"
          onClick={() => toggleSecretVisibility(label)}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gold-400 transition-colors"
        >
          {showSecrets[label] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );

  const renderAISection = () => (
    <div className="space-y-6">
      {/* AI Providers */}
      <div className="bg-dark-800/50 backdrop-blur-xl border border-gold-400/20 rounded-2xl p-6 shadow-2xl shadow-cosmic-500/10">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center space-x-2">
            <Brain className="w-6 h-6 text-purple-400" />
            <span>{language === 'ar' ? 'مقدمو خدمات الذكاء الاصطناعي' : 'AI Providers'}</span>
          </h3>
          <Button
            onClick={addAIProvider}
            className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-4 py-2 shadow-lg shadow-purple-500/30"
          >
            <Plus className="w-4 h-4 mr-2" />
            {language === 'ar' ? 'إضافة مقدم خدمة' : 'Add Provider'}
          </Button>
        </div>

        {aiProviders.map((provider, index) => (
          <div key={provider.id} className="bg-dark-700/30 border border-gold-400/20 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-white">
                {language === 'ar' ? `مقدم الخدمة ${index + 1}` : `Provider ${index + 1}`}
              </h4>
              <button
                onClick={() => removeAIProvider(index)}
                className="text-red-400 hover:text-red-300 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {language === 'ar' ? 'اسم المقدم' : 'Provider Name'}
                </label>
                <input
                  type="text"
                  value={provider.name}
                  onChange={(e) => updateAIProvider(index, 'name', e.target.value)}
                  placeholder="OpenAI, Google Gemini, etc."
                  className="w-full px-4 py-3 bg-dark-700/50 border border-gold-400/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {language === 'ar' ? 'رابط API' : 'API Host'}
                </label>
                <input
                  type="url"
                  value={provider.host}
                  onChange={(e) => updateAIProvider(index, 'host', e.target.value)}
                  placeholder="https://api.openai.com/v1/chat/completions"
                  className="w-full px-4 py-3 bg-dark-700/50 border border-gold-400/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-all duration-200"
                />
              </div>
            </div>

            <SecretInput
              label={language === 'ar' ? 'مفتاح API' : 'API Key'}
              value={provider.apiKey}
              onChange={(value) => updateAIProvider(index, 'apiKey', value)}
              placeholder="sk-..."
            />

            {/* Models */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {language === 'ar' ? 'النماذج المتاحة' : 'Available Models'}
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {provider.models.map((model, modelIndex) => (
                  <span
                    key={modelIndex}
                    className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-sm flex items-center space-x-2"
                  >
                    <span>{model}</span>
                    <button
                      onClick={() => removeModelFromProvider(index, modelIndex)}
                      className="text-purple-400 hover:text-purple-300"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="gpt-4, gpt-3.5-turbo, etc."
                  className="flex-1 px-3 py-2 bg-dark-700/50 border border-gold-400/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-all duration-200"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addModelToProvider(index, e.target.value);
                      e.target.value = '';
                    }
                  }}
                />
                <Button
                  onClick={(e) => {
                    const input = e.target.parentElement.querySelector('input');
                    addModelToProvider(index, input.value);
                    input.value = '';
                  }}
                  className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-4 py-2"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Provider Settings */}
            <div className="flex items-center space-x-4 mt-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={provider.enabled}
                  onChange={(e) => updateAIProvider(index, 'enabled', e.target.checked)}
                  className="w-4 h-4 text-purple-600 bg-dark-700 border-gold-400/30 rounded focus:ring-purple-500 focus:ring-2"
                />
                <span className="text-gray-300">
                  {language === 'ar' ? 'مفعل' : 'Enabled'}
                </span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="defaultProvider"
                  checked={provider.isDefault}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setAiProviders(prev => prev.map((p, i) => ({
                        ...p,
                        isDefault: i === index
                      })));
                    }
                  }}
                  className="w-4 h-4 text-purple-600 bg-dark-700 border-gold-400/30 focus:ring-purple-500 focus:ring-2"
                />
                <span className="text-gray-300">
                  {language === 'ar' ? 'افتراضي' : 'Default'}
                </span>
              </label>
            </div>
          </div>
        ))}

        {aiProviders.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{language === 'ar' ? 'لا توجد مقدمو خدمات مضافين' : 'No AI providers added yet'}</p>
          </div>
        )}
      </div>

      {/* Default Settings */}
      <div className="bg-dark-800/50 backdrop-blur-xl border border-gold-400/20 rounded-2xl p-6 shadow-2xl shadow-cosmic-500/10">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
          <Zap className="w-6 h-6 text-gold-400" />
          <span>{language === 'ar' ? 'الإعدادات الافتراضية' : 'Default Settings'}</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {language === 'ar' ? 'المقدم الافتراضي' : 'Default Provider'}
            </label>
            <select
              value={formData.ai_default_provider || ''}
              onChange={(e) => handleInputChange('ai_default_provider', e.target.value)}
              className="w-full px-4 py-3 bg-dark-700/50 border border-gold-400/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-all duration-200"
            >
              <option value="">{language === 'ar' ? 'اختر المقدم' : 'Select Provider'}</option>
              {aiProviders.filter(p => p.enabled).map((provider, index) => (
                <option key={index} value={provider.name.toLowerCase()}>
                  {provider.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {language === 'ar' ? 'النموذج الافتراضي' : 'Default Model'}
            </label>
            <input
              type="text"
              value={formData.ai_default_model || ''}
              onChange={(e) => handleInputChange('ai_default_model', e.target.value)}
              placeholder="gpt-4"
              className="w-full px-4 py-3 bg-dark-700/50 border border-gold-400/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-all duration-200"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => handleSaveConfig('ai')}
          disabled={loading}
          className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-8 py-3 shadow-lg shadow-purple-500/30 transition-all duration-200 transform hover:scale-105"
        >
          {loading ? (
            <Loader size="sm" variant="spinner" />
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              {language === 'ar' ? 'حفظ إعدادات الذكاء الاصطناعي' : 'Save AI Settings'}
            </>
          )}
        </Button>
      </div>
    </div>
  );

  const renderDatabaseSection = () => (
    <div className="space-y-6">
      {/* Supabase Configuration */}
      <div className="bg-dark-800/50 backdrop-blur-xl border border-gold-400/20 rounded-2xl p-6 shadow-2xl shadow-cosmic-500/10">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
          <Database className="w-6 h-6 text-blue-400" />
          <span>{language === 'ar' ? 'إعدادات Supabase' : 'Supabase Configuration'}</span>
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {language === 'ar' ? 'رابط مشروع Supabase' : 'Supabase Project URL'}
            </label>
            <input
              type="url"
              value={formData.supabase_url || ''}
              onChange={(e) => handleInputChange('supabase_url', e.target.value)}
              placeholder="https://your-project.supabase.co"
              className="w-full px-4 py-3 bg-dark-700/50 border border-gold-400/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-all duration-200"
            />
          </div>

          <SecretInput
            label={language === 'ar' ? 'مفتاح Supabase العام' : 'Supabase Anon Key'}
            value={formData.supabase_anon_key}
            onChange={(value) => handleInputChange('supabase_anon_key', value)}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
          />

          <SecretInput
            label={language === 'ar' ? 'مفتاح خدمة Supabase' : 'Supabase Service Key'}
            value={formData.supabase_service_key}
            onChange={(value) => handleInputChange('supabase_service_key', value)}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
          />

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {language === 'ar' ? 'اسم حاوية التخزين' : 'Storage Bucket Name'}
            </label>
            <input
              type="text"
              value={formData.supabase_storage_bucket || ''}
              onChange={(e) => handleInputChange('supabase_storage_bucket', e.target.value)}
              placeholder="samia-tarot-uploads"
              className="w-full px-4 py-3 bg-dark-700/50 border border-gold-400/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-all duration-200"
            />
          </div>
        </div>
      </div>

      {/* Database Type Selection */}
      <div className="bg-dark-800/50 backdrop-blur-xl border border-gold-400/20 rounded-2xl p-6 shadow-2xl shadow-cosmic-500/10">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
          <Server className="w-6 h-6 text-gold-400" />
          <span>{language === 'ar' ? 'نوع قاعدة البيانات' : 'Database Type'}</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { id: 'supabase', name: 'Supabase', description: 'PostgreSQL with real-time features' },
            { id: 'firebase', name: 'Firebase', description: 'Google\'s NoSQL database' },
            { id: 'planetscale', name: 'PlanetScale', description: 'Serverless MySQL platform' }
          ].map((dbType) => (
            <button
              key={dbType.id}
              onClick={() => handleInputChange('database_type', dbType.id)}
              className={`
                p-4 rounded-xl border-2 transition-all duration-200 transform hover:scale-105
                ${formData.database_type === dbType.id
                  ? 'border-blue-400 bg-blue-400/10 shadow-lg shadow-blue-500/20'
                  : 'border-gold-400/20 bg-dark-700/30 hover:border-blue-400/40'
                }
              `}
            >
              <div className="text-center">
                <h4 className="font-bold text-white mb-1">{dbType.name}</h4>
                <p className="text-gray-400 text-sm">{dbType.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => handleSaveConfig('database')}
          disabled={loading}
          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-8 py-3 shadow-lg shadow-blue-500/30 transition-all duration-200 transform hover:scale-105"
        >
          {loading ? (
            <Loader size="sm" variant="spinner" />
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              {language === 'ar' ? 'حفظ إعدادات قاعدة البيانات' : 'Save Database Settings'}
            </>
          )}
        </Button>
      </div>
    </div>
  );

  const renderStorageSection = () => (
    <div className="space-y-6">
      {/* Storage Provider Selection */}
      <div className="bg-dark-800/50 backdrop-blur-xl border border-gold-400/20 rounded-2xl p-6 shadow-2xl shadow-cosmic-500/10">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
          <Cloud className="w-6 h-6 text-green-400" />
          <span>{language === 'ar' ? 'مقدم خدمة التخزين' : 'Storage Provider'}</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {[
            { 
              id: 'supabase', 
              name: 'Supabase Storage', 
              description: language === 'ar' ? 'تخزين مدمج مع قاعدة البيانات' : 'Integrated with database',
              icon: Database
            },
            { 
              id: 'b2', 
              name: 'Backblaze B2', 
              description: language === 'ar' ? 'تخزين سحابي اقتصادي' : 'Cost-effective cloud storage',
              icon: Cloud
            }
          ].map((provider) => {
            const IconComponent = provider.icon;
            return (
              <button
                key={provider.id}
                onClick={() => handleInputChange('storage_provider', provider.id)}
                className={`
                  p-4 rounded-xl border-2 transition-all duration-200 transform hover:scale-105
                  ${formData.storage_provider === provider.id
                    ? 'border-green-400 bg-green-400/10 shadow-lg shadow-green-500/20'
                    : 'border-gold-400/20 bg-dark-700/30 hover:border-green-400/40'
                  }
                `}
              >
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="font-bold text-white mb-1">{provider.name}</h4>
                  <p className="text-gray-400 text-sm">{provider.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Backblaze B2 Configuration */}
      <div className="bg-dark-800/50 backdrop-blur-xl border border-gold-400/20 rounded-2xl p-6 shadow-2xl shadow-cosmic-500/10">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
          <Key className="w-6 h-6 text-gold-400" />
          <span>{language === 'ar' ? 'إعدادات Backblaze B2' : 'Backblaze B2 Configuration'}</span>
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {language === 'ar' ? 'اسم الحاوية' : 'Bucket Name'}
            </label>
            <input
              type="text"
              value={formData.b2_bucket_name || ''}
              onChange={(e) => handleInputChange('b2_bucket_name', e.target.value)}
              placeholder="my-bucket-name"
              className="w-full px-4 py-3 bg-dark-700/50 border border-gold-400/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {language === 'ar' ? 'رابط النقطة النهائية' : 'Endpoint URL'}
            </label>
            <input
              type="url"
              value={formData.b2_endpoint_url || ''}
              onChange={(e) => handleInputChange('b2_endpoint_url', e.target.value)}
              placeholder="https://s3.us-west-000.backblazeb2.com"
              className="w-full px-4 py-3 bg-dark-700/50 border border-gold-400/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-all duration-200"
            />
          </div>

          <SecretInput
            label={language === 'ar' ? 'معرف مفتاح الوصول' : 'Access Key ID'}
            value={formData.b2_access_key_id}
            onChange={(value) => handleInputChange('b2_access_key_id', value)}
            placeholder="000000000000000000000000"
          />

          <SecretInput
            label={language === 'ar' ? 'مفتاح الوصول السري' : 'Secret Access Key'}
            value={formData.b2_secret_access_key}
            onChange={(value) => handleInputChange('b2_secret_access_key', value)}
            placeholder="K000000000000000000000000000000000000000"
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => handleSaveConfig('storage')}
          disabled={loading}
          className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-8 py-3 shadow-lg shadow-green-500/30 transition-all duration-200 transform hover:scale-105"
        >
          {loading ? (
            <Loader size="sm" variant="spinner" />
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              {language === 'ar' ? 'حفظ إعدادات التخزين' : 'Save Storage Settings'}
            </>
          )}
        </Button>
      </div>
    </div>
  );

  const renderNotificationsSection = () => (
    <div className="space-y-6">
      {/* Notification Settings */}
      <div className="bg-dark-800/50 backdrop-blur-xl border border-gold-400/20 rounded-2xl p-6 shadow-2xl shadow-cosmic-500/10">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
          <Bell className="w-6 h-6 text-gold-400" />
          <span>{language === 'ar' ? 'إعدادات الإشعارات' : 'Notification Settings'}</span>
        </h3>

        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.notifications_enabled || false}
                onChange={(e) => handleInputChange('notifications_enabled', e.target.checked)}
                className="w-4 h-4 text-gold-600 bg-dark-700 border-gold-400/30 rounded focus:ring-gold-500 focus:ring-2"
              />
              <span className="text-gray-300">
                {language === 'ar' ? 'تفعيل الإشعارات' : 'Enable Notifications'}
              </span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.push_notifications_enabled || false}
                onChange={(e) => handleInputChange('push_notifications_enabled', e.target.checked)}
                className="w-4 h-4 text-gold-600 bg-dark-700 border-gold-400/30 rounded focus:ring-gold-500 focus:ring-2"
              />
              <span className="text-gray-300">
                {language === 'ar' ? 'الإشعارات الفورية' : 'Push Notifications'}
              </span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {language === 'ar' ? 'مقدم خدمة البريد الإلكتروني' : 'Email Provider'}
            </label>
            <select
              value={formData.email_provider || 'sendgrid'}
              onChange={(e) => handleInputChange('email_provider', e.target.value)}
              className="w-full px-4 py-3 bg-dark-700/50 border border-gold-400/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-all duration-200"
            >
              <option value="sendgrid">SendGrid</option>
              <option value="mailgun">Mailgun</option>
              <option value="ses">Amazon SES</option>
              <option value="smtp">Custom SMTP</option>
            </select>
          </div>

          <SecretInput
            label={language === 'ar' ? 'مفتاح SendGrid API' : 'SendGrid API Key'}
            value={formData.sendgrid_api_key}
            onChange={(value) => handleInputChange('sendgrid_api_key', value)}
            placeholder="SG...."
          />

          <SecretInput
            label={language === 'ar' ? 'معرف حساب Twilio' : 'Twilio Account SID'}
            value={formData.twilio_account_sid}
            onChange={(value) => handleInputChange('twilio_account_sid', value)}
            placeholder="AC..."
          />

          <SecretInput
            label={language === 'ar' ? 'رمز مصادقة Twilio' : 'Twilio Auth Token'}
            value={formData.twilio_auth_token}
            onChange={(value) => handleInputChange('twilio_auth_token', value)}
            placeholder="..."
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => handleSaveConfig('notifications')}
          disabled={loading}
          className="bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-dark-900 px-8 py-3 shadow-lg shadow-gold-500/30 transition-all duration-200 transform hover:scale-105"
        >
          {loading ? (
            <Loader size="sm" variant="spinner" />
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              {language === 'ar' ? 'حفظ إعدادات الإشعارات' : 'Save Notification Settings'}
            </>
          )}
        </Button>
      </div>
    </div>
  );

  if (configLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader size="lg" variant="cosmic" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-dark-800/50 backdrop-blur-xl border border-gold-400/20 rounded-2xl p-6 shadow-2xl shadow-cosmic-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-gold-500 to-gold-600 rounded-xl flex items-center justify-center shadow-lg shadow-gold-500/30">
              <Settings className="w-6 h-6 text-dark-900" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                {language === 'ar' ? 'لوحة إعدادات النظام' : 'System Configuration Panel'}
              </h2>
              <p className="text-gray-400">
                {language === 'ar' 
                  ? 'إدارة جميع التكاملات الخارجية والإعدادات'
                  : 'Manage all external integrations and settings'
                }
              </p>
            </div>
          </div>
          <Button
            onClick={reloadConfig}
            className="bg-gradient-to-r from-cosmic-500 to-cosmic-600 hover:from-cosmic-600 hover:to-cosmic-700 text-white px-4 py-2 shadow-lg shadow-cosmic-500/30"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {language === 'ar' ? 'إعادة تحميل' : 'Reload'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-dark-800/50 backdrop-blur-xl border border-gold-400/20 rounded-2xl p-2 shadow-2xl shadow-cosmic-500/10">
        <div className="flex space-x-2 overflow-x-auto">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center space-x-2 px-4 py-3 rounded-xl transition-all duration-200 whitespace-nowrap
                  ${activeTab === tab.id
                    ? `bg-gradient-to-r ${tab.color} text-white shadow-lg`
                    : 'text-gray-400 hover:text-white hover:bg-dark-700/50'
                  }
                `}
              >
                <IconComponent className="w-5 h-5" />
                <span className="font-medium">{tab.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === 'ai' && renderAISection()}
        {activeTab === 'database' && renderDatabaseSection()}
        {activeTab === 'storage' && renderStorageSection()}
        {activeTab === 'notifications' && renderNotificationsSection()}
      </div>
    </div>
  );
};

export default ConfigurationPanel; 