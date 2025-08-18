/**
 * Providers Tab Component
 * SAMIA TAROT - Enhanced Providers Management
 * 
 * Manages providers with table view, add/edit forms, and CRUD operations
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BuildingStorefrontIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

import enhancedProvidersApi from '../../../services/enhancedProvidersApi.js';
import { useLanguage } from '../../../context/LanguageContext.jsx';

// Modals
import ProviderFormModal from './Modals/ProviderFormModal.jsx';
import ProviderViewModal from './Modals/ProviderViewModal.jsx';
import DeleteConfirmModal from './Modals/DeleteConfirmModal.jsx';

const ProvidersTab = ({ onStatsChange }) => {
  const { language } = useLanguage();

  // State management
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    type: '',
    active: ''
  });
  const [sortConfig, setSortConfig] = useState({
    key: 'name',
    direction: 'asc'
  });

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);

  // Provider types
  const [providerTypes, setProviderTypes] = useState([]);

  // Load data on mount
  useEffect(() => {
    loadProviders();
    loadProviderTypes();
  }, []);

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => {
      loadProviders();
    };

    window.addEventListener('refreshData', handleRefresh);
    return () => window.removeEventListener('refreshData', handleRefresh);
  }, []);

  // Load providers with filters
  const loadProviders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filterParams = {
        search: searchTerm,
        type: filters.type || undefined,
        active: filters.active !== '' ? filters.active === 'true' : undefined,
        sortBy: sortConfig.key,
        sortOrder: sortConfig.direction
      };

      const response = await enhancedProvidersApi.getProviders(filterParams);
      
      if (response.success) {
        setProviders(response.data || []);
        // Update stats in parent component
        if (onStatsChange) {
          onStatsChange(prev => ({
            ...prev,
            providers: {
              total: response.data?.length || 0,
              active: response.data?.filter(p => p.active).length || 0
            }
          }));
        }
      } else {
        setError(response.error || 'Failed to load providers');
      }
    } catch (error) {
      console.error('Error loading providers:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Load provider types
  const loadProviderTypes = async () => {
    try {
      const response = await enhancedProvidersApi.getProviderTypes();
      if (response.success) {
        setProviderTypes(response.data || []);
      }
    } catch (error) {
      console.error('Error loading provider types:', error);
    }
  };

  // Refresh data when filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadProviders();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, filters, sortConfig]);

  // Handle sorting
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Handle provider creation
  const handleAddProvider = async (providerData) => {
    try {
      const response = await enhancedProvidersApi.createProvider(providerData);
      if (response.success) {
        setShowAddModal(false);
        loadProviders();
        return { success: true };
      } else {
        return { success: false, error: response.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Handle provider update
  const handleEditProvider = async (providerData) => {
    try {
      const response = await enhancedProvidersApi.updateProvider(selectedProvider.id, providerData);
      if (response.success) {
        setShowEditModal(false);
        setSelectedProvider(null);
        loadProviders();
        return { success: true };
      } else {
        return { success: false, error: response.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Handle provider deletion
  const handleDeleteProvider = async () => {
    try {
      const response = await enhancedProvidersApi.deleteProvider(selectedProvider.id);
      if (response.success) {
        setShowDeleteModal(false);
        setSelectedProvider(null);
        loadProviders();
        return { success: true };
      } else {
        return { success: false, error: response.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Get provider type label
  const getProviderTypeLabel = (type) => {
    const typeObj = providerTypes.find(t => t.value === type);
    return typeObj ? typeObj.label : type;
  };

  // Get provider type color
  const getProviderTypeColor = (type) => {
    const colors = {
      'AI': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'payments': 'bg-green-500/20 text-green-400 border-green-500/30',
      'tts': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'storage': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      'analytics': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'communication': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
      'security': 'bg-red-500/20 text-red-400 border-red-500/30',
      'other': 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    };
    return colors[type] || colors.other;
  };

  return (
    <div className="p-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">
            {language === 'ar' ? 'إدارة مقدمي الخدمات' : 'Providers Management'}
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            {language === 'ar' 
              ? `${providers.length} مقدم خدمة` 
              : `${providers.length} provider${providers.length !== 1 ? 's' : ''}`
            }
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all"
        >
          <PlusIcon className="h-5 w-5" />
          <span>{language === 'ar' ? 'إضافة مقدم خدمة' : 'Add Provider'}</span>
        </motion.button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder={language === 'ar' ? 'البحث في مقدمي الخدمات...' : 'Search providers...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {/* Type Filter */}
        <select
          value={filters.type}
          onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
          className="px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="">{language === 'ar' ? 'كل الأنواع' : 'All Types'}</option>
          {providerTypes.map(type => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>

        {/* Active Filter */}
        <select
          value={filters.active}
          onChange={(e) => setFilters(prev => ({ ...prev, active: e.target.value }))}
          className="px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="">{language === 'ar' ? 'كل الحالات' : 'All Status'}</option>
          <option value="true">{language === 'ar' ? 'نشط' : 'Active'}</option>
          <option value="false">{language === 'ar' ? 'غير نشط' : 'Inactive'}</option>
        </select>
      </div>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 flex items-center space-x-2"
          >
            <ExclamationTriangleIcon className="h-5 w-5" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        </div>
      )}

      {/* Providers Table */}
      {!loading && (
        <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('name')}
                      className="flex items-center space-x-1 hover:text-white"
                    >
                      <span>{language === 'ar' ? 'الاسم' : 'Name'}</span>
                      {sortConfig.key === 'name' && (
                        <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('type')}
                      className="flex items-center space-x-1 hover:text-white"
                    >
                      <span>{language === 'ar' ? 'النوع' : 'Type'}</span>
                      {sortConfig.key === 'type' && (
                        <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    {language === 'ar' ? 'الإحصائيات' : 'Stats'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    {language === 'ar' ? 'الحالة' : 'Status'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('created_at')}
                      className="flex items-center space-x-1 hover:text-white"
                    >
                      <span>{language === 'ar' ? 'تاريخ الإنشاء' : 'Created'}</span>
                      {sortConfig.key === 'created_at' && (
                        <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    {language === 'ar' ? 'الإجراءات' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {providers.map((provider) => (
                  <motion.tr
                    key={provider.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-700/30 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {provider.logo_url ? (
                          <img
                            src={provider.logo_url}
                            alt={provider.name}
                            className="h-8 w-8 rounded-full mr-3"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center mr-3">
                            <BuildingStorefrontIcon className="h-4 w-4 text-white" />
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-white">{provider.name}</div>
                          {provider.description && (
                            <div className="text-sm text-gray-400 truncate max-w-xs">
                              {provider.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getProviderTypeColor(provider.provider_type)}`}>
                  {getProviderTypeLabel(provider.provider_type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      <div className="flex space-x-4">
                        <span>{provider.stats?.services_count || 0} {language === 'ar' ? 'خدمة' : 'services'}</span>
                        <span>{provider.stats?.models_count || 0} {language === 'ar' ? 'نموذج' : 'models'}</span>
                        <span>{provider.stats?.secrets_count || 0} {language === 'ar' ? 'سر' : 'secrets'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                        provider.active
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {provider.active ? (
                          <>
                            <CheckCircleIcon className="h-3 w-3 mr-1" />
                            {language === 'ar' ? 'نشط' : 'Active'}
                          </>
                        ) : (
                          <>
                            <XCircleIcon className="h-3 w-3 mr-1" />
                            {language === 'ar' ? 'غير نشط' : 'Inactive'}
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {enhancedProvidersApi.formatDate(provider.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => {
                            setSelectedProvider(provider);
                            setShowViewModal(true);
                          }}
                          className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded-lg transition-colors"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => {
                            setSelectedProvider(provider);
                            setShowEditModal(true);
                          }}
                          className="p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/20 rounded-lg transition-colors"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => {
                            setSelectedProvider(provider);
                            setShowDeleteModal(true);
                          }}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {providers.length === 0 && !loading && (
            <div className="text-center py-12">
              <BuildingStorefrontIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-400">
                {language === 'ar' ? 'لا توجد مقدمو خدمات' : 'No providers found'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {language === 'ar' ? 'ابدأ بإضافة مقدم خدمة جديد' : 'Get started by adding a new provider'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <ProviderFormModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddProvider}
        providerTypes={providerTypes}
        title={language === 'ar' ? 'إضافة مقدم خدمة جديد' : 'Add New Provider'}
      />

      <ProviderFormModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedProvider(null);
        }}
        onSubmit={handleEditProvider}
        providerTypes={providerTypes}
        initialData={selectedProvider}
        title={language === 'ar' ? 'تعديل مقدم الخدمة' : 'Edit Provider'}
      />

      <ProviderViewModal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedProvider(null);
        }}
        provider={selectedProvider}
        providerTypes={providerTypes}
      />

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedProvider(null);
        }}
        onConfirm={handleDeleteProvider}
        title={language === 'ar' ? 'حذف مقدم الخدمة' : 'Delete Provider'}
        message={language === 'ar' 
          ? `هل أنت متأكد من حذف مقدم الخدمة "${selectedProvider?.name}"؟ هذا الإجراء لا يمكن التراجع عنه.`
          : `Are you sure you want to delete the provider "${selectedProvider?.name}"? This action cannot be undone.`
        }
      />
    </div>
  );
};

export default ProvidersTab; 