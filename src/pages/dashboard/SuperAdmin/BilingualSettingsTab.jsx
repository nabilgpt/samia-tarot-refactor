// ============================================================================
// SAMIA TAROT - BILINGUAL SETTINGS TAB COMPONENT
// Translation settings and provider configuration (NO secrets or credentials)
// ============================================================================
// Date: 2025-07-13 (REFACTORED)
// Purpose: Pure translation settings management with complete separation from secrets
// Security: Admin/Super Admin access, no sensitive data handling
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { 
  Languages, Globe, Sparkles, Settings, Save, AlertCircle, Trash2, Plus, Crown, RefreshCw,
  Bot, BarChart3, Zap, Database, Copy, CheckCircle, ExternalLink, Activity, 
  Clock, DollarSign, Cpu, Wifi, WifiOff, Star, Edit3, Search, Filter, Sliders,
  TrendingUp, Users, MessageSquare, Target, Brain, Cloud, HardDrive, TestTube
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import bilingualSettingsService from '../../../services/bilingualSettingsService';
import api from '../../../services/frontendApi.js';

const BilingualSettingsTab = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Enhanced state for translation-focused system
  const [activeSection, setActiveSection] = useState('overview');
  const [providers, setProviders] = useState([]);
  const [translationSettings, setTranslationSettings] = useState({});
  const [providerAssignments, setProviderAssignments] = useState({});
  const [analytics, setAnalytics] = useState(null);
  const [providerHealth, setProviderHealth] = useState({});
  
  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [showAddProviderModal, setShowAddProviderModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);
  const [editingSetting, setEditingSetting] = useState(null);
  const [showAddSettingModal, setShowAddSettingModal] = useState(false);
  const [testingProvider, setTestingProvider] = useState(null);

  // New provider form state (NON-SENSITIVE DATA ONLY)
  const [newProvider, setNewProvider] = useState({
    provider_key: '',
    provider_name: '',
    provider_type: 'openai',
    company_name: '',
    homepage_url: '',
    documentation_url: '',
    supported_languages: ['en', 'ar'],
    supported_features: ['translation', 'context_preservation'],
    rate_limit_per_minute: 60,
    rate_limit_per_hour: 1000,
    max_requests_per_day: 10000,
    timeout_seconds: 30,
    pricing_model: 'token_based',
    cost_per_request: 0.0020,
    cost_per_1k_tokens: 0.0020,
    is_active: true,
    description: '',
    notes: '',
    tags: []
  });

  // New setting form state
  const [newSetting, setNewSetting] = useState({
    setting_key: '',
    setting_category: 'general',
    setting_value: '',
    setting_type: 'string',
    display_name_en: '',
    display_name_ar: '',
    description_en: '',
    description_ar: '',
    is_user_configurable: true,
    is_required: false,
    default_value: '',
    ui_component: 'text',
    ui_options: {},
    display_order: 1
  });

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (profile?.role === 'super_admin' || profile?.role === 'admin') {
        loadAllData();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [profile?.role]);

  useEffect(() => {
    loadAllData();
  }, []);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadAllData = async () => {
    if (!profile?.role || !['admin', 'super_admin'].includes(profile.role)) return;
    
    setLoading(true);
    try {
      await Promise.all([
        loadProviders(),
        loadTranslationSettings(),
        loadProviderAssignments(),
        loadAnalytics(),
        loadProviderHealth()
      ]);
    } catch (error) {
      console.error('Error loading bilingual system data:', error);
      toast.error('خطأ في تحميل بيانات النظام');
    } finally {
      setLoading(false);
    }
  };

  const loadProviders = useCallback(async () => {
    try {
      console.log('🔄 [BILINGUAL-SETTINGS] Loading providers...');
      
      const response = await bilingualSettingsService.getProviders({ active_only: false });
      
      if (response.success) {
        setProviders(response.data.providers || []);
        console.log(`✅ [BILINGUAL-SETTINGS] Loaded ${response.data.total} providers`);
      } else {
        // Fallback to separate calls if unified endpoint fails
        const [translationResponse, aiResponse] = await Promise.all([
          api.get('/dynamic-translation/providers').catch(e => ({ data: { success: false, data: [] } })),
          api.get('/dynamic-ai/providers?active_only=true').catch(e => ({ data: { success: false, data: [] } }))
        ]);

        let allProviders = [];

        // Add translation-specific providers
        if (translationResponse.data.success) {
          const translationProviders = translationResponse.data.data || [];
          allProviders = [...translationProviders];
          console.log(`✅ [BILINGUAL-SETTINGS] Fallback: Loaded ${translationProviders.length} translation providers`);
        }

        // Add general AI providers that support translation
        if (aiResponse.data.success) {
          const aiProviders = aiResponse.data.data || [];
          const translationCapableProviders = aiProviders
            .filter(p => p.supports_text_generation && p.is_active)
            .map(p => ({
              id: `ai_${p.id}`,
              name: p.name.toLowerCase(),
              display_name_en: p.name,
              display_name_ar: p.name,
              description_en: p.description || `${p.provider_type} provider`,
              description_ar: p.description || `مقدم ${p.provider_type}`,
              api_endpoint_url: p.api_endpoint || '',
              authentication_type: 'bearer_token',
              supports_languages: ['en', 'ar'],
              max_tokens_per_request: p.tokens_per_minute || 1500,
              supports_batch_translation: false,
              supports_context_preservation: true,
              is_active: p.is_active,
              is_default_provider: p.is_default,
              provider_type: p.provider_type,
              source: 'ai_providers',
              created_at: p.created_at,
              updated_at: p.updated_at
            }));

          const existingNames = allProviders.map(p => p.name.toLowerCase());
          const newAiProviders = translationCapableProviders.filter(p => 
            !existingNames.includes(p.name.toLowerCase())
          );
          
          allProviders = [...allProviders, ...newAiProviders];
          console.log(`✅ [BILINGUAL-SETTINGS] Fallback: Added ${newAiProviders.length} AI providers`);
        }

        console.log(`✅ [BILINGUAL-SETTINGS] Fallback: Total providers loaded: ${allProviders.length}`);
        setProviders(allProviders);
      }
    } catch (error) {
      console.error('Error loading providers:', error);
      toast.error('فشل في تحميل مقدمي الخدمة');
    }
  }, []);

  const loadTranslationSettings = useCallback(async () => {
    try {
      console.log('🔄 [BILINGUAL-SETTINGS] Loading translation settings...');
      
      const response = await bilingualSettingsService.getTranslationSettings({ active_only: false });
      
      if (response.success) {
        setTranslationSettings(response.data.settings || {});
        console.log(`✅ [BILINGUAL-SETTINGS] Loaded ${response.data.total} translation settings`);
      }
    } catch (error) {
      console.error('Error loading translation settings:', error);
    }
  }, []);

  const loadProviderAssignments = useCallback(async () => {
    try {
      console.log('🔄 [BILINGUAL-SETTINGS] Loading provider assignments...');
      
      const response = await bilingualSettingsService.getProviderAssignments();
      
      if (response.success) {
        setProviderAssignments(response.data.assignments || {});
        console.log(`✅ [BILINGUAL-SETTINGS] Loaded provider assignments`);
      }
    } catch (error) {
      console.error('Error loading provider assignments:', error);
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    try {
      const response = await bilingualSettingsService.getAnalytics({ date_range: '7d' });
      
      if (response.success) {
        setAnalytics(response.data);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  }, []);

  const loadProviderHealth = useCallback(async () => {
    try {
      const response = await bilingualSettingsService.getProviderHealth();
      
      if (response.success) {
        setProviderHealth(response.data.health || {});
      }
    } catch (error) {
      console.error('Error loading provider health:', error);
    }
  }, []);

  // ============================================================================
  // SETTINGS MANAGEMENT
  // ============================================================================

  const handleSaveTranslationSetting = async (settingId, newValue) => {
    try {
      setSaving(true);
      
      const response = await bilingualSettingsService.updateTranslationSetting(settingId, {
        setting_value: newValue
      });

      if (response.success) {
        await loadTranslationSettings();
        setEditingSetting(null);
        toast.success('تم حفظ الإعداد بنجاح');
      }
    } catch (error) {
      console.error('Error saving setting:', error);
      toast.error('خطأ في حفظ الإعداد');
    } finally {
      setSaving(false);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await api.get('/dynamic-translation/settings');
      if (response.data.success) {
        const settingsData = response.data.data || {};
        console.log(`✅ [BILINGUAL-SETTINGS] Loaded ${Object.keys(settingsData).length} settings`);
        
        // Debug: Show raw data structure
        console.log('[BILINGUAL-SETTINGS] 🔍 Raw settings data:', settingsData);
        
        // Debug: Show sample raw values 
        const firstKey = Object.keys(settingsData)[0];
        if (firstKey) {
          const sampleSetting = settingsData[firstKey];
          console.log(`[BILINGUAL-SETTINGS] 🔍 Sample raw setting "${firstKey}":`, sampleSetting);
          if (typeof sampleSetting === 'object' && 'value' in sampleSetting) {
            console.log(`[BILINGUAL-SETTINGS] 🔍 Sample raw value: "${sampleSetting.value}" (${typeof sampleSetting.value})`);
          }
        }
        
        setSettings(settingsData);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('فشل في تحميل الإعدادات');
    }
  };

  const handleSaveSettings = async (updatedSettings) => {
    try {
      setSaving(true);
      const response = await api.put('/dynamic-translation/settings', {
        settings: updatedSettings
      });
      
      if (response.data.success) {
        // Preserve the original object structure while updating values
        setSettings(prev => {
          const updated = { ...prev };
          Object.keys(updatedSettings).forEach(key => {
            if (updated[key] && typeof updated[key] === 'object' && 'value' in updated[key]) {
              // Preserve object structure, only update the value
              updated[key] = {
                ...updated[key],
                value: updatedSettings[key]
              };
            } else {
              // Create new object structure if it doesn't exist
              updated[key] = {
                value: updatedSettings[key],
                description_en: '',
                description_ar: '',
                category: 'general',
                is_system_setting: false,
                updated_at: new Date().toISOString()
              };
            }
          });
          return updated;
        });
        toast.success('تم حفظ إعدادات الترجمة بنجاح! 🎉');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('خطأ في حفظ إعدادات الترجمة');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateProvider = async () => {
    try {
      console.log('🔄 [BILINGUAL-SETTINGS] Creating new provider:', newProvider);
      
      const response = await api.post('/dynamic-translation/providers', newProvider);
      if (response.data.success) {
        console.log('✅ [BILINGUAL-SETTINGS] Provider created successfully');
        
        // Refresh providers list to include the new provider
        await loadProviders();
        
        setShowAddProviderModal(false);
        setNewProvider({
          name: '',
          display_name_en: '',
          display_name_ar: '',
          description_en: '',
          description_ar: '',
          api_endpoint_url: '',
          authentication_type: 'bearer_token',
          supports_languages: ['en', 'ar'],
          max_tokens_per_request: 1500,
          estimated_cost_per_1k_tokens: 0.0020,
          supports_batch_translation: false,
          supports_context_preservation: true,
          is_active: true,
          provider_type: 'openai'
        });
        
        toast.success('تم إنشاء مقدم الخدمة بنجاح! 🎉');
      }
    } catch (error) {
      console.error('Error creating provider:', error);
      toast.error('فشل في إنشاء مقدم الخدمة');
    }
  };

  const handleUpdateProvider = async (providerId, updateData) => {
    try {
      console.log('🔄 [BILINGUAL-SETTINGS] Updating provider:', providerId);
      
      const response = await api.put(`/dynamic-translation/providers/${providerId}`, updateData);
      if (response.data.success) {
        console.log('✅ [BILINGUAL-SETTINGS] Provider updated successfully');
        
        // Refresh providers list to show updated data
        await loadProviders();
        
        toast.success('تم تحديث مقدم الخدمة بنجاح! ✅');
      }
    } catch (error) {
      console.error('Error updating provider:', error);
      toast.error('فشل في تحديث مقدم الخدمة');
    }
  };

  const handleDeleteProvider = async (providerId) => {
    if (!confirm('هل أنت متأكد من حذف مقدم الخدمة هذا؟')) return;
    
    try {
      console.log('🔄 [BILINGUAL-SETTINGS] Deleting provider:', providerId);
      
      const response = await api.delete(`/dynamic-translation/providers/${providerId}`);
      if (response.data.success) {
        console.log('✅ [BILINGUAL-SETTINGS] Provider deleted successfully');
        
        // Refresh providers list to remove deleted provider
        await loadProviders();
        
        toast.success('تم حذف مقدم الخدمة بنجاح');
      }
    } catch (error) {
      console.error('Error deleting provider:', error);
      toast.error('فشل في حذف مقدم الخدمة');
    }
  };



  const handleTestProvider = async (provider) => {
    setTestingProvider(provider.id);
    try {
      const response = await api.post(`/dynamic-translation/providers/${provider.id}/test`, {
        test_text: 'مرحبا، هذا اختبار سريع للترجمة.',
        target_language: 'en'
      });
      
      if (response.data.success && response.data.test_result.success) {
        toast.success(`اختبار ${provider.display_name_en} نجح! ✅`);
        
        // Refresh providers to update test status
        await loadProviders();
      } else {
        toast.error(`اختبار ${provider.display_name_en} فشل! ❌`);
      }
    } catch (error) {
      console.error('Error testing provider:', error);
      toast.error(`فشل اختبار ${provider.display_name_en}`);
    } finally {
      setTestingProvider(null);
    }
  };

  const handleSetAsDefault = async (provider) => {
    console.log('🔄 [BILINGUAL-SETTINGS] Setting default provider:', provider.name);
    
    await handleSaveSettings({
      default_provider: provider.name
    });
    
    // Refresh providers list to reflect new default
    await loadProviders();
  };

  // Force refresh providers when section changes to settings
  useEffect(() => {
    if (activeSection === 'settings') {
      loadProviders();
    }
  }, [activeSection, loadProviders]);

  const sections = [
    { id: 'overview', name: 'نظرة عامة', icon: Globe },
    { id: 'providers', name: 'مقدمو الخدمة', icon: Bot },
    { id: 'settings', name: 'الإعدادات', icon: Settings },
    { id: 'analytics', name: 'التحليلات', icon: BarChart3 }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Languages className="w-8 h-8 text-purple-400" />
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
            نظام الترجمة الثنائية المتقدم
          </h2>
        </div>
        <p className="text-gray-300 text-lg">
          إدارة مقدمي الذكاء الاصطناعي والإعدادات العامة للترجمة
        </p>
      </div>

      {/* Section Navigation */}
      <div className="flex flex-wrap gap-2 p-2 bg-white/5 backdrop-blur-sm border border-white/20 rounded-2xl">
        {sections.map((section) => (
          <button
            key={`section-${section.id}`}
            onClick={() => setActiveSection(section.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 ${
              activeSection === section.id
                ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white border border-purple-400/50'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <section.icon className="w-4 h-4" />
            <span className="font-medium">{section.name}</span>
          </button>
        ))}
      </div>

      {/* Section Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {activeSection === 'overview' && <OverviewSection settings={translationSettings} providers={providers} analytics={analytics} />}
          {activeSection === 'providers' && (
            <ProvidersSection 
              providers={providers}
              onUpdate={handleUpdateProvider}
              onDelete={handleDeleteProvider}
              onTest={handleTestProvider}
              onSetDefault={handleSetAsDefault}
              testingProvider={testingProvider}
              onAddNew={() => setShowAddProviderModal(true)}
            />
          )}
          {activeSection === 'settings' && (
            <SettingsSection 
              settings={translationSettings}
              providers={providers}
              onSave={handleSaveSettings}
              saving={saving}
            />
          )}
          {activeSection === 'analytics' && <AnalyticsSection analytics={analytics} />}
        </motion.div>
      </AnimatePresence>

      {/* Add Provider Modal */}
      <AnimatePresence>
        {showAddProviderModal && (
          <AddProviderModal
            newProvider={newProvider}
            setNewProvider={setNewProvider}
            onSave={handleCreateProvider}
            onClose={() => setShowAddProviderModal(false)}
          />
        )}
      </AnimatePresence>


    </div>
  );
};

// =====================================================
// OVERVIEW SECTION COMPONENT
// =====================================================
const OverviewSection = ({ settings, providers, analytics }) => {
  // Safe guard to ensure providers is an array
  const providersArray = Array.isArray(providers) ? providers : [];
  const activeProviders = providersArray.filter(p => p && p.is_active);
  const defaultProvider = providersArray.find(p => p && p.is_default_provider);
  const currentMode = settings?.global_translation_mode?.value || 'auto-copy';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Current Status */}
      <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-400/30 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="w-6 h-6 text-purple-400" />
          <h3 className="text-xl font-semibold text-white">الحالة الحالية</h3>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-300">نمط الترجمة:</span>
            <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
              {currentMode === 'auto-translate' ? 'ترجمة تلقائية' : 'نسخ تلقائي'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-300">المقدم الافتراضي:</span>
            <span className="text-cyan-400">{defaultProvider?.display_name_ar || 'غير محدد'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-300">المقدمون النشطون:</span>
            <span className="text-white font-semibold">{activeProviders.length}</span>
          </div>
        </div>
        </div>
        
      {/* Performance Stats */}
      {analytics && (
        <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-400/30 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="w-6 h-6 text-blue-400" />
            <h3 className="text-xl font-semibold text-white">إحصائيات الأداء</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">إجمالي الطلبات:</span>
              <span className="text-white font-semibold">{analytics.total_requests}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">نسبة النجاح:</span>
              <span className="text-green-400">
                {analytics.total_requests > 0 
                  ? `${Math.round((analytics.successful_requests / analytics.total_requests) * 100)}%`
                  : '0%'
                }
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">متوسط الزمن:</span>
              <span className="text-cyan-400">{analytics.average_response_time}ms</span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-400/30 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Zap className="w-6 h-6 text-green-400" />
          <h3 className="text-xl font-semibold text-white">إجراءات سريعة</h3>
        </div>
          <div className="space-y-3">
          <div className="text-sm text-gray-300">
            • إضافة مقدم خدمة جديد
          </div>
          <div className="text-sm text-gray-300">
            • اختبار المقدمين النشطين
          </div>
          <div className="text-sm text-gray-300">
            • تحديث الإعدادات العامة
            </div>
          <div className="text-sm text-gray-300">
            • عرض تقارير التحليلات
          </div>
        </div>
      </div>
    </div>
  );
};

// =====================================================
// PROVIDERS SECTION COMPONENT
// =====================================================
const ProvidersSection = ({ providers, onUpdate, onDelete, onTest, onSetDefault, testingProvider, onAddNew }) => {
  // Safe guard to ensure providers is an array
  const providersArray = Array.isArray(providers) ? providers : [];
  
  return (
    <div className="space-y-6">
      {/* Add Provider Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold text-white">مقدمو خدمات الذكاء الاصطناعي</h3>
        <button
          onClick={onAddNew}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all duration-300"
        >
          <Plus className="w-4 h-4" />
          إضافة مقدم جديد
        </button>
      </div>

      {/* Providers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {providersArray.filter(Boolean).map((provider) => (
                      <ProviderCard
              key={`provider-card-${provider.id || provider.name}`}
              provider={provider}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onTest={onTest}
              onSetDefault={onSetDefault}
              isTesting={testingProvider === provider.id}
            />
        ))}
      </div>
    </div>
  );
};

// =====================================================
// PROVIDER CARD COMPONENT
// =====================================================
const ProviderCard = ({ provider, onUpdate, onDelete, onTest, onSetDefault, isTesting }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'text-green-400';
      case 'failed': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4" />;
      case 'failed': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
        <motion.div
      layout
      className={`border-2 rounded-2xl p-6 transition-all duration-300 ${
        provider.is_default_provider
          ? 'border-purple-400/50 bg-purple-500/10'
          : provider.is_active
          ? 'border-green-400/30 bg-green-500/5'
          : 'border-gray-600/30 bg-gray-800/20'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-lg font-semibold text-white">{provider.display_name_ar}</h4>
            {provider.is_default_provider && (
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
            )}
          </div>
          <p className="text-sm text-gray-400">{provider.description_ar}</p>
        </div>
        <div className={`flex items-center gap-1 ${getStatusColor(provider.test_status)}`}>
          {getStatusIcon(provider.test_status)}
          <span className="text-xs">{provider.test_status || 'غير مختبر'}</span>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <span className="text-gray-400">اللغات المدعومة:</span>
          <p className="text-white">{provider.supports_languages?.length || 0} لغة</p>
        </div>
        <div>
          <span className="text-gray-400">الحد الأقصى للرموز:</span>
          <p className="text-white">{provider.max_tokens_per_request?.toLocaleString()}</p>
        </div>
        <div>
          <span className="text-gray-400">التكلفة لكل 1K رمز:</span>
          <p className="text-white">${provider.estimated_cost_per_1k_tokens}</p>
        </div>
        <div>
          <span className="text-gray-400">آخر اختبار:</span>
          <p className="text-white">
            {provider.last_tested_at 
              ? new Date(provider.last_tested_at).toLocaleDateString('ar-SA')
              : 'لم يختبر بعد'
            }
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onTest(provider)}
          disabled={isTesting}
          className="flex items-center gap-1 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-xs disabled:opacity-50"
        >
          {isTesting ? (
            <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <TestTube className="w-3 h-3" />
          )}
          اختبار
        </button>



        {!provider.is_default_provider && provider.is_active && (
          <button
            onClick={() => onSetDefault(provider)}
            className="flex items-center gap-1 px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors text-xs"
          >
            <Star className="w-3 h-3" />
            افتراضي
          </button>
        )}

        <button
          onClick={() => onUpdate(provider.id, { is_active: !provider.is_active })}
          className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-colors text-xs ${
            provider.is_active 
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
          }`}
        >
          {provider.is_active ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
          {provider.is_active ? 'إيقاف' : 'تفعيل'}
        </button>

        {!provider.is_default_provider && (
          <button
            onClick={() => onDelete(provider.id)}
            className="flex items-center gap-1 px-3 py-1 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-xs"
          >
            <Trash2 className="w-3 h-3" />
            حذف
          </button>
        )}
      </div>
    </motion.div>
  );
};

// =====================================================
// SETTINGS SECTION COMPONENT
// =====================================================
const SettingsSection = ({ settings, providers, onSave, saving }) => {
  const [localSettings, setLocalSettings] = useState({});

  // Helper function to intelligently parse setting values
  const normalizeSettingValue = (val) => {
    console.log(`[BILINGUAL-SETTINGS] 🔍 normalizeSettingValue input: "${val}" (${typeof val})`);
    
    // If it's not a string, return as-is
    if (typeof val !== 'string') {
      console.log(`[BILINGUAL-SETTINGS] 🔍 normalizeSettingValue output (non-string): ${val} (${typeof val})`);
      return val;
    }
    
    // 🚀 BULLETPROOF: Remove all surrounding quotes (handles multiple JSON.stringify layers)
    let cleanVal = val.trim();
    while (cleanVal.startsWith('"') && cleanVal.endsWith('"') && cleanVal.length > 1) {
      cleanVal = cleanVal.slice(1, -1);
    }
    
    console.log(`[BILINGUAL-SETTINGS] 🔍 After quote removal: "${cleanVal}"`);
    
    // Handle boolean string representations
    if (cleanVal === 'true') {
      console.log(`[BILINGUAL-SETTINGS] 🔍 normalizeSettingValue output (boolean): true`);
      return true;
    }
    if (cleanVal === 'false') {
      console.log(`[BILINGUAL-SETTINGS] 🔍 normalizeSettingValue output (boolean): false`);
      return false;
    }
    
    // Handle number string representations
    if (/^-?\d+(\.\d+)?$/.test(cleanVal)) {
      const num = parseFloat(cleanVal);
      if (!isNaN(num)) {
        console.log(`[BILINGUAL-SETTINGS] 🔍 normalizeSettingValue output (number): ${num}`);
        return num;
      }
    }
    
    // For plain strings like "auto-copy", "openai", etc., return cleaned string
    console.log(`[BILINGUAL-SETTINGS] 🔍 normalizeSettingValue output (string): "${cleanVal}"`);
    return cleanVal;
  };

  useEffect(() => {
    // 🛡️ BULLETPROOF: Multiple layers of protection
    try {
      // Layer 1: Check if settings exists and is not empty
      if (!settings || typeof settings !== 'object' || Object.keys(settings).length === 0) {
        console.log('[BILINGUAL-SETTINGS] 🔄 Settings not ready yet, waiting...');
        return;
      }

      console.log(`[BILINGUAL-SETTINGS] 🔍 Processing ${Object.keys(settings).length} settings...`);

      const parsed = {};
      let processedCount = 0;
      
      // Layer 2: Safe iteration with validation
      Object.keys(settings).forEach(key => {
        try {
          const setting = settings[key];
          
          // Layer 3: Multiple checks for setting validity
          if (setting === null || setting === undefined) {
            console.warn(`[BILINGUAL-SETTINGS] ⚠️ Setting "${key}" is null/undefined`);
            return;
          }
          
          // Handle both object format and primitive format
          if (typeof setting === 'object' && 'value' in setting) {
            // Object format from backend: { value: "...", description_en: "...", ... }
            parsed[key] = normalizeSettingValue(setting.value);
            processedCount++;
          } else {
            // Primitive format (legacy or after save): true, "auto-copy", etc.
            parsed[key] = normalizeSettingValue(setting);
            processedCount++;
          }
        } catch (keyError) {
          console.error(`[BILINGUAL-SETTINGS] ❌ Error processing setting "${key}":`, keyError);
        }
      });
      
      setLocalSettings(parsed);
      console.log(`✅ [BILINGUAL-SETTINGS] Processed ${processedCount}/${Object.keys(settings).length} settings`);
      
      // Show sample processed values with proper types
      const samples = Object.keys(parsed).slice(0, 3).map(key => {
        const value = parsed[key];
        const displayValue = typeof value === 'string' ? `"${value}"` : value;
        return `${key}: ${displayValue} (${typeof value})`;
      });
      console.log(`[BILINGUAL-SETTINGS] 🔍 Sample processed values:`, samples);
      
    } catch (error) {
      console.error('[BILINGUAL-SETTINGS] ❌ Critical error in settings processing:', error);
    }
  }, [settings]);

  const handleSettingChange = (key, value) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = () => {
    onSave(localSettings);
  };

  const activeProviders = Array.isArray(providers) ? providers.filter(p => p && p.is_active) : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold text-white">إعدادات النظام العامة</h3>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:shadow-lg transition-all duration-300 disabled:opacity-50"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          حفظ الإعدادات
        </button>
                </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Translation Mode */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
          <h4 className="text-xl font-semibold text-white mb-4">نمط الترجمة</h4>
          <div className="space-y-3">
            {[
              { value: 'auto-copy', label: 'نسخ تلقائي', desc: 'نسخ النص بدون ترجمة' },
              { value: 'auto-translate', label: 'ترجمة تلقائية', desc: 'ترجمة ذكية باستخدام AI' }
            ].map(mode => (
              <label key={`mode-${mode.value}`} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="translation_mode"
                  value={mode.value}
                  checked={localSettings.global_translation_mode === mode.value}
                  onChange={(e) => handleSettingChange('global_translation_mode', e.target.value)}
                  className="mt-1 w-4 h-4 text-purple-400 bg-transparent border-2 border-purple-400 focus:ring-purple-400"
                />
                <div>
                  <div className="font-medium text-white">{mode.label}</div>
                  <div className="text-sm text-gray-400">{mode.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Default Provider */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
          <h4 className="text-xl font-semibold text-white mb-4">مقدم الخدمة الافتراضي</h4>
          <select
            value={localSettings.default_provider || ''}
            onChange={(e) => handleSettingChange('default_provider', e.target.value)}
            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-400 focus:border-transparent"
          >
            <option value="">اختر مقدم الخدمة</option>
            {activeProviders.map(provider => (
              <option key={`provider-option-${provider.id || provider.name}`} value={provider.name}>
                {provider.display_name_ar}
              </option>
            ))}
          </select>
          <p className="mt-2 text-sm text-gray-400">
            سيتم استخدام هذا المقدم لجميع عمليات الترجمة التلقائية
          </p>
        </div>

        {/* Fallback Settings */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
          <h4 className="text-xl font-semibold text-white mb-4">إعدادات الاحتياط</h4>
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={localSettings.enable_provider_fallback || false}
                onChange={(e) => handleSettingChange('enable_provider_fallback', e.target.checked)}
                className="w-4 h-4 text-purple-400 bg-transparent border-2 border-purple-400 rounded focus:ring-purple-400"
              />
              <div>
                <div className="font-medium text-white">تفعيل الاحتياط للمقدمين</div>
                <div className="text-sm text-gray-400">التبديل التلقائي لمقدم آخر عند الفشل</div>
              </div>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={localSettings.cache_translations || false}
                onChange={(e) => handleSettingChange('cache_translations', e.target.checked)}
                className="w-4 h-4 text-purple-400 bg-transparent border-2 border-purple-400 rounded focus:ring-purple-400"
              />
              <div>
                <div className="font-medium text-white">حفظ الترجمات مؤقتاً</div>
                <div className="text-sm text-gray-400">تحسين الأداء وتقليل التكاليف</div>
              </div>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={localSettings.enable_usage_analytics || false}
                onChange={(e) => handleSettingChange('enable_usage_analytics', e.target.checked)}
                className="w-4 h-4 text-purple-400 bg-transparent border-2 border-purple-400 rounded focus:ring-purple-400"
              />
              <div>
                <div className="font-medium text-white">تتبع الاستخدام والأداء</div>
                <div className="text-sm text-gray-400">جمع إحصائيات لتحسين النظام</div>
              </div>
            </label>
              </div>
            </div>
            
        {/* Quality Settings */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
          <h4 className="text-xl font-semibold text-white mb-4">إعدادات الجودة</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                حد الجودة المقبول (0.0 - 1.0)
              </label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={localSettings.translation_quality_threshold || 0.7}
                onChange={(e) => handleSettingChange('translation_quality_threshold', parseFloat(e.target.value))}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-400 focus:border-transparent"
              />
              <p className="mt-1 text-sm text-gray-400">
                الترجمات أقل من هذا المستوى سيتم رفضها
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// =====================================================
// ANALYTICS SECTION COMPONENT
// =====================================================
const AnalyticsSection = ({ analytics }) => {
  if (!analytics) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-400">لا توجد بيانات تحليلية متاحة</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-white">تحليلات النظام</h3>
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-400/30 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-6 h-6 text-blue-400" />
            <h4 className="font-semibold text-white">إجمالي الطلبات</h4>
          </div>
          <p className="text-2xl font-bold text-white">{analytics.total_requests?.toLocaleString()}</p>
        </div>

        <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-400/30 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-6 h-6 text-green-400" />
            <h4 className="font-semibold text-white">طلبات ناجحة</h4>
          </div>
          <p className="text-2xl font-bold text-white">{analytics.successful_requests?.toLocaleString()}</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-400/30 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-6 h-6 text-yellow-400" />
            <h4 className="font-semibold text-white">متوسط الزمن</h4>
          </div>
          <p className="text-2xl font-bold text-white">{analytics.average_response_time}ms</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-400/30 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-6 h-6 text-purple-400" />
            <h4 className="font-semibold text-white">التكلفة الإجمالية</h4>
          </div>
          <p className="text-2xl font-bold text-white">${analytics.total_cost_estimate?.toFixed(4)}</p>
        </div>
                </div>

      {/* Provider Performance */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
        <h4 className="text-xl font-semibold text-white mb-4">أداء المقدمين</h4>
        <div className="space-y-4">
          {Object.entries(analytics.by_provider || {}).map(([provider, stats]) => (
            <div key={`provider-stats-${provider}`} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                <div>
                <h5 className="font-medium text-white">{provider}</h5>
                <p className="text-sm text-gray-400">
                  {stats.total} طلب • {stats.successful} ناجح • {stats.failed} فاشل
                </p>
                </div>
              <div className="text-right">
                <p className="font-medium text-white">{stats.avg_response_time}ms</p>
                <p className="text-sm text-gray-400">${stats.total_cost?.toFixed(4)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// =====================================================
// ADD PROVIDER MODAL COMPONENT
// =====================================================
const AddProviderModal = ({ newProvider, setNewProvider, onSave, onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">إضافة مقدم خدمة جديد</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">الاسم المعرف</label>
              <input
                type="text"
                value={newProvider.name}
                onChange={(e) => setNewProvider(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-400"
                placeholder="مثال: my-provider"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">الاسم الإنجليزي</label>
              <input
                type="text"
                value={newProvider.display_name_en}
                onChange={(e) => setNewProvider(prev => ({ ...prev, display_name_en: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-400"
                placeholder="My AI Provider"
              />
              </div>
              </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">الاسم العربي</label>
            <input
              type="text"
              value={newProvider.display_name_ar}
              onChange={(e) => setNewProvider(prev => ({ ...prev, display_name_ar: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-400"
              placeholder="مقدم الذكاء الاصطناعي"
            />
              </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">الوصف الإنجليزي</label>
              <textarea
                value={newProvider.description_en}
                onChange={(e) => setNewProvider(prev => ({ ...prev, description_en: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-400"
                rows="3"
                placeholder="Description of the AI provider..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">الوصف العربي</label>
              <textarea
                value={newProvider.description_ar}
                onChange={(e) => setNewProvider(prev => ({ ...prev, description_ar: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-400"
                rows="3"
                placeholder="وصف مقدم الذكاء الاصطناعي..."
              />
            </div>
      </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">رابط API</label>
            <input
              type="url"
              value={newProvider.api_endpoint_url}
              onChange={(e) => setNewProvider(prev => ({ ...prev, api_endpoint_url: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-400"
              placeholder="https://api.example.com/v1/translate"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">نوع المصادقة</label>
              <select
                value={newProvider.authentication_type}
                onChange={(e) => setNewProvider(prev => ({ ...prev, authentication_type: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-400"
              >
                <option value="bearer_token">Bearer Token</option>
                <option value="api_key">API Key</option>
                <option value="oauth">OAuth</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">حد الرموز</label>
              <input
                type="number"
                value={newProvider.max_tokens_per_request}
                onChange={(e) => setNewProvider(prev => ({ ...prev, max_tokens_per_request: parseInt(e.target.value) }))}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">التكلفة لكل 1K رمز</label>
              <input
                type="number"
                step="0.0001"
                value={newProvider.estimated_cost_per_1k_tokens}
                onChange={(e) => setNewProvider(prev => ({ ...prev, estimated_cost_per_1k_tokens: parseFloat(e.target.value) }))}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-400"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={onSave}
            className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all duration-300"
          >
            إنشاء المقدم
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default BilingualSettingsTab; 