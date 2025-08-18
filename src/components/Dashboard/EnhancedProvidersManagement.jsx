/**
 * Enhanced Providers & Secrets Management Component
 * SAMIA TAROT - Dashboard Enhancement
 * 
 * Main component for managing providers, services, models, and secrets
 * with tabbed interface and cosmic theme preservation
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BuildingStorefrontIcon,
  CogIcon,
  CubeIcon,
  KeyIcon,
  ChartBarIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

import enhancedProvidersApi from '../../services/enhancedProvidersApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';

// Tab Components
import ProvidersTab from './EnhancedProviders/ProvidersTab.jsx';
import ServicesTab from './EnhancedProviders/ServicesTab.jsx';
import ModelsTab from './EnhancedProviders/ModelsTab.jsx';
import SecretsTab from './EnhancedProviders/SecretsTab.jsx';
import StatsTab from './EnhancedProviders/StatsTab.jsx';

const EnhancedProvidersManagement = () => {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  
  // State management
  const [activeTab, setActiveTab] = useState('providers');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  // Tab configuration
  const tabs = [
    {
      id: 'providers',
      name: language === 'ar' ? 'مقدمو الخدمات' : 'Providers',
      icon: BuildingStorefrontIcon,
      description: language === 'ar' ? 'إدارة مقدمي الخدمات' : 'Manage service providers',
      requiresAdmin: true
    },
    {
      id: 'services',
      name: language === 'ar' ? 'الخدمات' : 'Services',
      icon: CogIcon,
      description: language === 'ar' ? 'إدارة الخدمات المتاحة' : 'Manage available services',
      requiresAdmin: true
    },
    {
      id: 'models',
      name: language === 'ar' ? 'النماذج' : 'Models',
      icon: CubeIcon,
      description: language === 'ar' ? 'إدارة نماذج الذكاء الاصطناعي' : 'Manage AI models',
      requiresAdmin: true
    },
    {
      id: 'secrets',
      name: language === 'ar' ? 'المفاتيح السرية' : 'Secrets',
      icon: KeyIcon,
      description: language === 'ar' ? 'إدارة المفاتيح والأسرار' : 'Manage API keys and secrets',
      requiresSuperAdmin: true
    },
    {
      id: 'stats',
      name: language === 'ar' ? 'الإحصائيات' : 'Statistics',
      icon: ChartBarIcon,
      description: language === 'ar' ? 'عرض الإحصائيات العامة' : 'View system statistics',
      requiresAdmin: true
    }
  ];

  // Filter tabs based on user role
  const visibleTabs = tabs.filter(tab => {
    if (tab.requiresSuperAdmin && user?.role !== 'super_admin') {
      return false;
    }
    if (tab.requiresAdmin && !['admin', 'super_admin'].includes(user?.role)) {
      return false;
    }
    return true;
  });

  // Load initial data
  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await enhancedProvidersApi.getStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setError(null);
  };

  const handleRefresh = () => {
    loadStats();
    // Trigger refresh in active tab component
    const event = new CustomEvent('refreshData');
    window.dispatchEvent(event);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'providers':
        return <ProvidersTab onStatsChange={setStats} />;
      case 'services':
        return <ServicesTab onStatsChange={setStats} />;
      case 'models':
        return <ModelsTab onStatsChange={setStats} />;
      case 'secrets':
        return <SecretsTab onStatsChange={setStats} />;
      case 'stats':
        return <StatsTab stats={stats} onRefresh={loadStats} />;
      default:
        return <ProvidersTab onStatsChange={setStats} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a1b3e] to-[#2d1b69] p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent">
                {language === 'ar' ? 'إدارة مقدمي الخدمات المحسنة' : 'Enhanced Providers Management'}
              </h1>
              <p className="text-gray-400 mt-2">
                {language === 'ar' 
                  ? 'إدارة شاملة لمقدمي الخدمات والمفاتيح السرية' 
                  : 'Comprehensive management of service providers and API secrets'
                }
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Refresh Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleRefresh}
                disabled={loading}
                className={`
                  flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all
                  ${loading 
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
                  }
                `}
              >
                <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                <span>{language === 'ar' ? 'تحديث' : 'Refresh'}</span>
              </motion.button>
              
              {/* Stats Summary */}
              {stats && (
                <div className="flex items-center space-x-4 text-sm text-gray-400">
                  <div className="flex items-center space-x-1">
                    <BuildingStorefrontIcon className="h-4 w-4" />
                    <span>{stats.providers?.total || 0}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <CogIcon className="h-4 w-4" />
                    <span>{stats.services?.total || 0}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <CubeIcon className="h-4 w-4" />
                    <span>{stats.models?.total || 0}</span>
                  </div>
                  {user?.role === 'super_admin' && (
                    <div className="flex items-center space-x-1">
                      <KeyIcon className="h-4 w-4" />
                      <span>{stats.secrets?.total || 0}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex space-x-1 bg-gray-800/50 p-1 rounded-lg backdrop-blur-sm">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <motion.button
                  key={tab.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleTabChange(tab.id)}
                  className={`
                    flex items-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all
                    ${isActive
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    }
                  `}
                >
                  <Icon className="h-5 w-5" />
                  <span className="hidden sm:inline">{tab.name}</span>
                </motion.button>
              );
            })}
          </div>
          
          {/* Tab Description */}
          <div className="mt-2 text-sm text-gray-400">
            {visibleTabs.find(tab => tab.id === activeTab)?.description}
          </div>
        </motion.div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800/30 backdrop-blur-sm rounded-xl border border-gray-700/50"
        >
          {renderTabContent()}
        </motion.div>
      </div>
    </div>
  );
};

export default EnhancedProvidersManagement; 