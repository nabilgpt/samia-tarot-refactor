import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CloudIcon,
  CogIcon,
  KeyIcon,
  ServerIcon,
  ChartBarIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useLanguage } from '../../../context/LanguageContext';
import { useAuth } from '../../../context/AuthContext';
import enhancedProvidersApi from '../../../services/enhancedProvidersApi';

// Tab Components
import ProvidersTab from './ProvidersTab';
import ServicesTab from './ServicesTab';
import ModelsTab from './ModelsTab';
import SecretsTab from './SecretsTab';

const EnhancedProvidersManagement = () => {
  const { currentLanguage } = useLanguage();
  const { profile } = useAuth();
  const isRTL = currentLanguage === 'ar';

  // State Management
  const [activeTab, setActiveTab] = useState('providers');
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState({
    providers: 0,
    services: 0,
    models: 0,
    secrets: 0,
    activeProviders: 0,
    totalUsage: 0
  });

  // Tab Configuration
  const tabs = [
    {
      id: 'providers',
      label: isRTL ? 'المقدمون' : 'Providers',
      icon: CloudIcon,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      description: isRTL ? 'إدارة مقدمي الخدمات' : 'Manage service providers'
    },
    {
      id: 'services',
      label: isRTL ? 'الخدمات' : 'Services',
      icon: ServerIcon,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20',
      description: isRTL ? 'إدارة الخدمات المتاحة' : 'Manage available services'
    },
    {
      id: 'models',
      label: isRTL ? 'النماذج' : 'Models',
      icon: CogIcon,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
      description: isRTL ? 'إدارة نماذج الذكاء الاصطناعي' : 'Manage AI models'
    },
    {
      id: 'secrets',
      label: isRTL ? 'الأسرار' : 'Secrets',
      icon: KeyIcon,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
      description: isRTL ? 'إدارة مفاتيح API والأسرار' : 'Manage API keys and secrets',
      restricted: true // Only super_admin can access
    }
  ];

  // Filter tabs based on user permissions
  const availableTabs = tabs.filter(tab => {
    if (tab.restricted && profile?.role !== 'super_admin') {
      return false;
    }
    return true;
  });

  // Load statistics
  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      
      // Load statistics from all endpoints
      const [
        providersResponse,
        servicesResponse,
        modelsResponse,
        secretsResponse
      ] = await Promise.all([
        enhancedProvidersApi.getProviders(),
        enhancedProvidersApi.getServices(),
        enhancedProvidersApi.getModels(),
        profile?.role === 'super_admin' ? enhancedProvidersApi.getSecrets() : Promise.resolve({ data: [] })
      ]);

      const providers = providersResponse.data || [];
      const services = servicesResponse.data || [];
      const models = modelsResponse.data || [];
      const secrets = secretsResponse.data || [];

      setStatistics({
        providers: providers.length,
        services: services.length,
        models: models.length,
        secrets: secrets.length,
        activeProviders: providers.filter(p => p.active).length,
        totalUsage: services.reduce((sum, s) => sum + (s.usage_count || 0), 0)
      });

    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatisticsUpdate = (newStats) => {
    setStatistics(prev => ({ ...prev, ...newStats }));
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'providers':
        return <ProvidersTab onStatisticsUpdate={handleStatisticsUpdate} />;
      case 'services':
        return <ServicesTab onStatisticsUpdate={handleStatisticsUpdate} />;
      case 'models':
        return <ModelsTab onStatisticsUpdate={handleStatisticsUpdate} />;
      case 'secrets':
        return <SecretsTab onStatisticsUpdate={handleStatisticsUpdate} />;
      default:
        return <ProvidersTab onStatisticsUpdate={handleStatisticsUpdate} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {isRTL ? 'إدارة المقدمين المحسنة' : 'Enhanced Providers Management'}
          </h1>
          <p className="text-gray-400">
            {isRTL 
              ? 'إدارة مقدمي الخدمات والنماذج والأسرار بشكل ديناميكي'
              : 'Dynamically manage service providers, models, and secrets'
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadStatistics}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {isRTL ? 'تحديث' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CloudIcon className="w-6 h-6 text-blue-400" />
            <div>
              <p className="text-sm text-gray-400">
                {isRTL ? 'المقدمون' : 'Providers'}
              </p>
              <p className="text-xl font-bold text-white">
                {statistics.providers}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <ServerIcon className="w-6 h-6 text-green-400" />
            <div>
              <p className="text-sm text-gray-400">
                {isRTL ? 'الخدمات' : 'Services'}
              </p>
              <p className="text-xl font-bold text-white">
                {statistics.services}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CogIcon className="w-6 h-6 text-purple-400" />
            <div>
              <p className="text-sm text-gray-400">
                {isRTL ? 'النماذج' : 'Models'}
              </p>
              <p className="text-xl font-bold text-white">
                {statistics.models}
              </p>
            </div>
          </div>
        </div>

        {profile?.role === 'super_admin' && (
          <div className="bg-gradient-to-br from-red-500/10 to-red-600/10 border border-red-500/20 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <KeyIcon className="w-6 h-6 text-red-400" />
              <div>
                <p className="text-sm text-gray-400">
                  {isRTL ? 'الأسرار' : 'Secrets'}
                </p>
                <p className="text-xl font-bold text-white">
                  {statistics.secrets}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 border border-cyan-500/20 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <ChartBarIcon className="w-6 h-6 text-cyan-400" />
            <div>
              <p className="text-sm text-gray-400">
                {isRTL ? 'المفعل' : 'Active'}
              </p>
              <p className="text-xl font-bold text-white">
                {statistics.activeProviders}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <ChartBarIcon className="w-6 h-6 text-yellow-400" />
            <div>
              <p className="text-sm text-gray-400">
                {isRTL ? 'الاستخدام' : 'Usage'}
              </p>
              <p className="text-xl font-bold text-white">
                {statistics.totalUsage.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-gray-800/50 rounded-lg p-1">
        <nav className="flex space-x-1" dir={isRTL ? 'rtl' : 'ltr'}>
          {availableTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  relative flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200
                  ${isActive 
                    ? `${tab.bgColor} ${tab.color} ${tab.borderColor} border shadow-lg` 
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-gray-800/30 rounded-lg border border-gray-700/50">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default EnhancedProvidersManagement; 