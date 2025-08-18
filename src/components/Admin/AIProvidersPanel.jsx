import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  Save, 
  X, 
  Check,
  AlertTriangle,
  Cpu,
  Settings,
  Globe,
  Key
} from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { supabase } from '../../lib/supabase';

const AIProvidersPanel = () => {
  const { t } = useTranslation();
  const { language, showSuccess, showError } = useUI();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProvider, setEditingProvider] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState({});

  const [formData, setFormData] = useState({
    name: '',
    host_url: '',
    models: [],
    active_model: '',
    is_active: true,
    provider_type: 'openai'
  });

  const defaultProviders = [
    {
      name: 'OpenAI',
      provider_type: 'openai',
      host_url: 'https://api.openai.com/v1',
      models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo']
    },
    {
      name: 'Google Gemini',
      provider_type: 'gemini',
      host_url: 'https://generativelanguage.googleapis.com/v1',
      models: ['gemini-pro', 'gemini-pro-vision', 'gemini-1.5-pro']
    },
    {
      name: 'Anthropic Claude',
      provider_type: 'anthropic',
      host_url: 'https://api.anthropic.com/v1',
      models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku']
    }
  ];

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ai_providers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProviders(data || []);
    } catch (error) {
      console.error('Error loading AI providers:', error);
      showError(language === 'ar' ? 'فشل في تحميل مقدمي الذكاء الاصطناعي' : 'Failed to load AI providers');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProvider = async () => {
    try {
      if (!formData.name || !formData.host_url) {
        showError(language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
        return;
      }

      const providerData = {
        ...formData,
        models: JSON.stringify(formData.models),
        updated_at: new Date().toISOString()
      };

      let result;
      if (editingProvider) {
        result = await supabase
          .from('ai_providers')
          .update(providerData)
          .eq('id', editingProvider.id);
      } else {
        result = await supabase
          .from('ai_providers')
          .insert([{ ...providerData, created_at: new Date().toISOString() }]);
      }

      if (result.error) throw result.error;

      showSuccess(
        editingProvider 
          ? (language === 'ar' ? 'تم تحديث المقدم بنجاح' : 'Provider updated successfully')
          : (language === 'ar' ? 'تم إضافة المقدم بنجاح' : 'Provider added successfully')
      );

      resetForm();
      loadProviders();
    } catch (error) {
      console.error('Error saving provider:', error);
      showError(language === 'ar' ? 'فشل في حفظ المقدم' : 'Failed to save provider');
    }
  };

  const handleDeleteProvider = async (providerId) => {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا المقدم؟' : 'Are you sure you want to delete this provider?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('ai_providers')
        .delete()
        .eq('id', providerId);

      if (error) throw error;

      showSuccess(language === 'ar' ? 'تم حذف المقدم بنجاح' : 'Provider deleted successfully');
      loadProviders();
    } catch (error) {
      console.error('Error deleting provider:', error);
      showError(language === 'ar' ? 'فشل في حذف المقدم' : 'Failed to delete provider');
    }
  };

  const handleSetActiveModel = async (providerId, modelName) => {
    try {
      const { error } = await supabase
        .from('ai_providers')
        .update({ active_model: modelName })
        .eq('id', providerId);

      if (error) throw error;

      showSuccess(language === 'ar' ? 'تم تحديد النموذج النشط' : 'Active model set successfully');
      loadProviders();
    } catch (error) {
      console.error('Error setting active model:', error);
      showError(language === 'ar' ? 'فشل في تحديد النموذج النشط' : 'Failed to set active model');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      host_url: '',
      models: [],
      active_model: '',
      is_active: true,
      provider_type: 'openai'
    });
    setEditingProvider(null);
    setShowAddForm(false);
  };

  const startEdit = (provider) => {
    setFormData({
      ...provider,
      models: typeof provider.models === 'string' ? JSON.parse(provider.models) : provider.models
    });
    setEditingProvider(provider);
    setShowAddForm(true);
  };

  const addDefaultProvider = (defaultProvider) => {
    setFormData({
      ...formData,
      ...defaultProvider,
    });
    setShowAddForm(true);
  };

  const toggleApiKeyVisibility = (providerId) => {
    setShowApiKeys(prev => ({
      ...prev,
      [providerId]: !prev[providerId]
    }));
  };

  const addModel = () => {
    const modelName = prompt(language === 'ar' ? 'اسم النموذج:' : 'Model name:');
    if (modelName && !formData.models.includes(modelName)) {
      setFormData(prev => ({
        ...prev,
        models: [...prev.models, modelName]
      }));
    }
  };

  const removeModel = (modelToRemove) => {
    setFormData(prev => ({
      ...prev,
      models: prev.models.filter(model => model !== modelToRemove)
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <div className="w-10 h-10 bg-gradient-to-r from-cosmic-500 to-cosmic-600 rounded-lg flex items-center justify-center">
            <Cpu className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              {language === 'ar' ? 'إدارة مقدمي الذكاء الاصطناعي' : 'AI Providers Management'}
            </h2>
            <p className="text-gray-400 text-sm">
              {language === 'ar' ? 'إدارة مقدمي الذكاء الاصطناعي والنماذج' : 'Manage AI providers and models'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 bg-gradient-to-r from-cosmic-500 to-cosmic-600 hover:from-cosmic-600 hover:to-cosmic-700 text-white rounded-lg transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          <span>{language === 'ar' ? 'إضافة مقدم' : 'Add Provider'}</span>
        </button>
      </div>

      {/* Quick Add Default Providers */}
      {providers.length === 0 && (
        <div className="bg-dark-800/50 backdrop-blur-xl border border-gold-400/20 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            {language === 'ar' ? 'إضافة سريعة للمقدمين الافتراضيين' : 'Quick Add Default Providers'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {defaultProviders.map((provider, index) => (
              <button
                key={index}
                onClick={() => addDefaultProvider(provider)}
                className="p-4 bg-dark-700/50 border border-cosmic-400/30 rounded-lg hover:border-cosmic-400/60 transition-all duration-200 text-left"
              >
                <h4 className="font-semibold text-white">{provider.name}</h4>
                <p className="text-gray-400 text-sm">{provider.models.length} models</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Providers List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {providers.map((provider) => (
          <div
            key={provider.id}
            className="bg-dark-800/50 backdrop-blur-xl border border-gold-400/20 rounded-2xl p-6 shadow-2xl shadow-cosmic-500/10"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  provider.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                }`}>
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{provider.name}</h3>
                  <p className="text-gray-400 text-sm">{provider.provider_type}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <button
                  onClick={() => startEdit(provider)}
                  className="p-2 text-cosmic-400 hover:text-cosmic-300 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteProvider(provider.id)}
                  className="p-2 text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Provider Details */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <Globe className="w-4 h-4 text-gray-400" />
                <span className="text-gray-300 text-sm">{provider.host_url}</span>
              </div>

              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <Key className="w-4 h-4 text-gray-400" />
                <span className="text-gray-300 text-sm">
                  {showApiKeys[provider.id] ? provider.api_key : '••••••••••••••••'}
                </span>
                <button
                  onClick={() => toggleApiKeyVisibility(provider.id)}
                  className="text-gray-400 hover:text-gray-300 transition-colors"
                >
                  {showApiKeys[provider.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Models */}
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">
                  {language === 'ar' ? 'النماذج المتاحة' : 'Available Models'}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {(typeof provider.models === 'string' ? JSON.parse(provider.models) : provider.models || []).map((model) => (
                    <button
                      key={model}
                      onClick={() => handleSetActiveModel(provider.id, model)}
                      className={`px-3 py-1 rounded-full text-xs transition-all duration-200 ${
                        model === provider.active_model
                          ? 'bg-gold-500/20 text-gold-400 border border-gold-400/30'
                          : 'bg-cosmic-500/20 text-cosmic-300 border border-cosmic-400/30 hover:border-cosmic-400/60'
                      }`}
                    >
                      {model}
                      {model === provider.active_model && <Check className="w-3 h-3 ml-1 inline" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800/95 backdrop-blur-xl border border-gold-400/20 rounded-2xl p-6 max-w-2xl w-full shadow-2xl shadow-cosmic-500/10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">
                {editingProvider 
                  ? (language === 'ar' ? 'تحرير المقدم' : 'Edit Provider')
                  : (language === 'ar' ? 'إضافة مقدم جديد' : 'Add New Provider')
                }
              </h3>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Provider Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {language === 'ar' ? 'اسم المقدم' : 'Provider Name'}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-dark-700/50 border border-gold-400/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-all duration-200"
                  placeholder={language === 'ar' ? 'مثال: OpenAI' : 'e.g., OpenAI'}
                />
              </div>

              {/* Provider Type */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {language === 'ar' ? 'نوع المقدم' : 'Provider Type'}
                </label>
                <select
                  value={formData.provider_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, provider_type: e.target.value }))}
                  className="w-full px-4 py-3 bg-dark-700/50 border border-gold-400/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-all duration-200"
                >
                  <option value="openai">OpenAI</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="anthropic">Anthropic Claude</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {/* Host URL */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {language === 'ar' ? 'رابط API' : 'API Host URL'}
                </label>
                <input
                  type="url"
                  value={formData.host_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, host_url: e.target.value }))}
                  className="w-full px-4 py-3 bg-dark-700/50 border border-gold-400/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-all duration-200"
                  placeholder="https://api.openai.com/v1"
                />
              </div>

              {/* API Key */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {language === 'ar' ? 'مفتاح API' : 'API Key'}
                </label>
                <input
                  type="password"
                  value={formData.api_key}
                  onChange={(e) => setFormData(prev => ({ ...prev, api_key: e.target.value }))}
                  className="w-full px-4 py-3 bg-dark-700/50 border border-gold-400/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-all duration-200"
                  placeholder={language === 'ar' ? 'أدخل مفتاح API' : 'Enter API key'}
                />
              </div>

              {/* Models */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-300">
                    {language === 'ar' ? 'النماذج المتاحة' : 'Available Models'}
                  </label>
                  <button
                    onClick={addModel}
                    className="text-cosmic-400 hover:text-cosmic-300 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.models.map((model, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-2 rtl:space-x-reverse px-3 py-1 bg-cosmic-500/20 border border-cosmic-400/30 rounded-full"
                    >
                      <span className="text-cosmic-300 text-sm">{model}</span>
                      <button
                        onClick={() => removeModel(model)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Model */}
              {formData.models.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {language === 'ar' ? 'النموذج النشط' : 'Active Model'}
                  </label>
                  <select
                    value={formData.active_model}
                    onChange={(e) => setFormData(prev => ({ ...prev, active_model: e.target.value }))}
                    className="w-full px-4 py-3 bg-dark-700/50 border border-gold-400/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-all duration-200"
                  >
                    <option value="">{language === 'ar' ? 'اختر النموذج' : 'Select Model'}</option>
                    {formData.models.map((model) => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Is Active */}
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="w-4 h-4 text-cosmic-500 bg-dark-700 border-gold-400/30 rounded focus:ring-cosmic-500 focus:ring-2"
                />
                <label htmlFor="is_active" className="text-sm text-gray-300">
                  {language === 'ar' ? 'مقدم نشط' : 'Active Provider'}
                </label>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end space-x-3 rtl:space-x-reverse mt-6 pt-6 border-t border-gold-400/20">
              <button
                onClick={resetForm}
                className="px-4 py-2 bg-dark-700/50 border border-gray-600/30 text-gray-300 rounded-lg hover:bg-dark-600/50 hover:border-gray-500/30 transition-all duration-200"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleSaveProvider}
                className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 bg-gradient-to-r from-cosmic-500 to-cosmic-600 hover:from-cosmic-600 hover:to-cosmic-700 text-white rounded-lg transition-all duration-200"
              >
                <Save className="w-4 h-4" />
                <span>{language === 'ar' ? 'حفظ' : 'Save'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIProvidersPanel; 