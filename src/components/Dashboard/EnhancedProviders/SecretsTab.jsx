import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  XCircleIcon,
  KeyIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { enhancedProvidersApi } from '../../../services/enhancedProvidersApi';

const SecretsTab = ({ language, onStatsChange }) => {
  const [secrets, setSecrets] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProvider, setFilterProvider] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedSecret, setSelectedSecret] = useState(null);
  const [visibleSecrets, setVisibleSecrets] = useState(new Set());
  const [formData, setFormData] = useState({
    provider_id: '',
    secret_name: '',
    secret_type: '',
    description: '',
    secret_value: '',
    is_active: true,
    expires_at: '',
    metadata: {}
  });

  const secretTypes = [
    { value: 'api_key', label: language === 'ar' ? 'مفتاح API' : 'API Key' },
    { value: 'access_token', label: language === 'ar' ? 'رمز الوصول' : 'Access Token' },
    { value: 'refresh_token', label: language === 'ar' ? 'رمز التحديث' : 'Refresh Token' },
    { value: 'webhook_secret', label: language === 'ar' ? 'سر Webhook' : 'Webhook Secret' },
    { value: 'client_secret', label: language === 'ar' ? 'سر العميل' : 'Client Secret' },
    { value: 'private_key', label: language === 'ar' ? 'مفتاح خاص' : 'Private Key' },
    { value: 'certificate', label: language === 'ar' ? 'شهادة' : 'Certificate' },
    { value: 'password', label: language === 'ar' ? 'كلمة مرور' : 'Password' },
    { value: 'other', label: language === 'ar' ? 'أخرى' : 'Other' }
  ];

  useEffect(() => {
    loadSecrets();
    loadProviders();
  }, []);

  const loadSecrets = async () => {
    try {
      setLoading(true);
      const response = await enhancedProvidersApi.getSecrets();
      if (response.success) {
        setSecrets(response.data || []);
        // Update stats if callback provided
        if (onStatsChange) {
          onStatsChange(prevStats => ({
            ...prevStats,
            secrets: {
              total: response.data?.length || 0,
              active: response.data?.filter(s => s.is_active).length || 0,
              expiring: response.data?.filter(s => s.expires_at && new Date(s.expires_at) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).length || 0
            }
          }));
        }
      }
    } catch (error) {
      console.error('Error loading secrets:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProviders = async () => {
    try {
      const response = await enhancedProvidersApi.getProviders();
      if (response.success) {
        setProviders(response.data || []);
      }
    } catch (error) {
      console.error('Error loading providers:', error);
    }
  };

  const filteredSecrets = secrets.filter(secret => {
    const matchesSearch = !searchTerm || 
      secret.secret_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      secret.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesProvider = !filterProvider || secret.provider_id === filterProvider;
    const matchesStatus = !filterStatus || 
      (filterStatus === 'active' && secret.is_active) ||
      (filterStatus === 'inactive' && !secret.is_active) ||
      (filterStatus === 'expiring' && secret.expires_at && new Date(secret.expires_at) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    
    const matchesType = !filterType || secret.secret_type === filterType;
    
    return matchesSearch && matchesProvider && matchesStatus && matchesType;
  });

  const handleAdd = () => {
    setFormData({
      provider_id: '',
      secret_name: '',
      secret_type: '',
      description: '',
      secret_value: '',
      is_active: true,
      expires_at: '',
      metadata: {}
    });
    setShowAddModal(true);
  };

  const handleEdit = (secret) => {
    setSelectedSecret(secret);
    setFormData({ 
      ...secret,
      secret_value: '' // Don't pre-populate secret value for security
    });
    setShowEditModal(true);
  };

  const handleView = (secret) => {
    setSelectedSecret(secret);
    setShowViewModal(true);
  };

  const handleDelete = async (secret) => {
    if (window.confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا السر؟ هذا الإجراء لا يمكن التراجع عنه.' : 'Are you sure you want to delete this secret? This action cannot be undone.')) {
      try {
        const response = await enhancedProvidersApi.deleteSecret(secret.id);
        if (response.success) {
          await loadSecrets();
        }
      } catch (error) {
        console.error('Error deleting secret:', error);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = selectedSecret
        ? await enhancedProvidersApi.updateSecret(selectedSecret.id, formData)
        : await enhancedProvidersApi.createSecret(formData);
      
      if (response.success) {
        await loadSecrets();
        setShowAddModal(false);
        setShowEditModal(false);
        setSelectedSecret(null);
      }
    } catch (error) {
      console.error('Error saving secret:', error);
    }
  };

  const toggleSecretVisibility = (secretId) => {
    setVisibleSecrets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(secretId)) {
        newSet.delete(secretId);
      } else {
        newSet.add(secretId);
      }
      return newSet;
    });
  };

  const getProviderName = (providerId) => {
    const provider = providers.find(p => p.id === providerId);
    return provider?.name || 'Unknown';
  };

  const getSecretTypeLabel = (type) => {
    const secretType = secretTypes.find(t => t.value === type);
    return secretType?.label || type;
  };

  const getSecretTypeColor = (type) => {
    const colors = {
      api_key: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      access_token: 'bg-green-500/20 text-green-400 border-green-500/30',
      refresh_token: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      webhook_secret: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
      client_secret: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      private_key: 'bg-red-500/20 text-red-400 border-red-500/30',
      certificate: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
      password: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      other: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    };
    return colors[type] || colors.other;
  };

  const isExpiring = (expiresAt) => {
    if (!expiresAt) return false;
    const expiryDate = new Date(expiresAt);
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return expiryDate < thirtyDaysFromNow;
  };

  const isExpired = (expiresAt) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const maskSecret = (value) => {
    if (!value) return '';
    if (value.length <= 8) return '•'.repeat(value.length);
    return value.substring(0, 4) + '•'.repeat(Math.max(8, value.length - 8)) + value.substring(value.length - 4);
  };

  const renderModal = (show, onClose, title, children) => {
    if (!show) return null;

    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-gradient-to-br from-[#1a0b2e] to-[#2d1b69] rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-purple-500/20"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <XCircleIcon className="w-6 h-6 text-gray-400" />
            </button>
          </div>
          {children}
        </motion.div>
      </div>
    );
  };

  const renderForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {language === 'ar' ? 'المزود' : 'Provider'}
          </label>
          <select
            value={formData.provider_id}
            onChange={(e) => setFormData({...formData, provider_id: e.target.value})}
            className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
            required
          >
            <option value="">{language === 'ar' ? 'اختر المزود' : 'Select Provider'}</option>
            {providers.map(provider => (
              <option key={provider.id} value={provider.id}>{provider.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {language === 'ar' ? 'اسم السر' : 'Secret Name'}
          </label>
          <input
            type="text"
            value={formData.secret_name}
            onChange={(e) => setFormData({...formData, secret_name: e.target.value})}
            className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {language === 'ar' ? 'نوع السر' : 'Secret Type'}
          </label>
          <select
            value={formData.secret_type}
            onChange={(e) => setFormData({...formData, secret_type: e.target.value})}
            className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
            required
          >
            <option value="">{language === 'ar' ? 'اختر النوع' : 'Select Type'}</option>
            {secretTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {language === 'ar' ? 'تاريخ الانتهاء' : 'Expiry Date'}
          </label>
          <input
            type="datetime-local"
            value={formData.expires_at}
            onChange={(e) => setFormData({...formData, expires_at: e.target.value})}
            className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {language === 'ar' ? 'الوصف' : 'Description'}
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
          rows="3"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {language === 'ar' ? 'قيمة السر' : 'Secret Value'}
        </label>
        <div className="relative">
          <textarea
            value={formData.secret_value}
            onChange={(e) => setFormData({...formData, secret_value: e.target.value})}
            className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none font-mono"
            rows="4"
            required={!selectedSecret}
            placeholder={selectedSecret ? language === 'ar' ? 'اتركه فارغاً للاحتفاظ بالقيمة الحالية' : 'Leave empty to keep current value' : ''}
          />
          <div className="absolute top-2 right-2 flex items-center space-x-2">
            <ShieldCheckIcon className="w-4 h-4 text-green-400" />
            <span className="text-xs text-green-400">{language === 'ar' ? 'مشفر' : 'Encrypted'}</span>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {language === 'ar' ? 'سيتم تشفير هذه القيمة تلقائياً عند الحفظ' : 'This value will be automatically encrypted when saved'}
        </p>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="is_active"
          checked={formData.is_active}
          onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
          className="w-4 h-4 text-purple-600 bg-gray-800 border-gray-600 rounded focus:ring-purple-500"
        />
        <label htmlFor="is_active" className="ml-2 text-sm text-gray-300">
          {language === 'ar' ? 'نشط' : 'Active'}
        </label>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={() => {
            setShowAddModal(false);
            setShowEditModal(false);
          }}
          className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
        >
          {language === 'ar' ? 'إلغاء' : 'Cancel'}
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all"
        >
          {selectedSecret ? (language === 'ar' ? 'تحديث' : 'Update') : (language === 'ar' ? 'إضافة' : 'Add')}
        </button>
      </div>
    </form>
  );

  const renderViewModal = () => {
    if (!selectedSecret) return null;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              {language === 'ar' ? 'المزود' : 'Provider'}
            </label>
            <p className="text-white">{getProviderName(selectedSecret.provider_id)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              {language === 'ar' ? 'اسم السر' : 'Secret Name'}
            </label>
            <p className="text-white">{selectedSecret.secret_name}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              {language === 'ar' ? 'نوع السر' : 'Secret Type'}
            </label>
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getSecretTypeColor(selectedSecret.secret_type)}`}>
              {getSecretTypeLabel(selectedSecret.secret_type)}
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              {language === 'ar' ? 'الحالة' : 'Status'}
            </label>
            <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
              selectedSecret.is_active 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-red-500/20 text-red-400'
            }`}>
              {selectedSecret.is_active ? (
                <>
                  <CheckCircleIcon className="w-3 h-3 mr-1" />
                  {language === 'ar' ? 'نشط' : 'Active'}
                </>
              ) : (
                <>
                  <XCircleIcon className="w-3 h-3 mr-1" />
                  {language === 'ar' ? 'غير نشط' : 'Inactive'}
                </>
              )}
            </span>
          </div>
        </div>

        {selectedSecret.description && (
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              {language === 'ar' ? 'الوصف' : 'Description'}
            </label>
            <p className="text-white">{selectedSecret.description}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            {language === 'ar' ? 'قيمة السر' : 'Secret Value'}
          </label>
          <div className="flex items-center space-x-2">
            <div className="flex-1 p-3 bg-gray-800/50 border border-gray-600 rounded-lg font-mono text-white">
              {visibleSecrets.has(selectedSecret.id) 
                ? selectedSecret.secret_value 
                : maskSecret(selectedSecret.secret_value)
              }
            </div>
            <button
              onClick={() => toggleSecretVisibility(selectedSecret.id)}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              {visibleSecrets.has(selectedSecret.id) ? (
                <EyeSlashIcon className="w-5 h-5" />
              ) : (
                <EyeIcon className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {selectedSecret.expires_at && (
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              {language === 'ar' ? 'تاريخ الانتهاء' : 'Expiry Date'}
            </label>
            <div className="flex items-center space-x-2">
              <p className="text-white">{new Date(selectedSecret.expires_at).toLocaleString()}</p>
              {isExpired(selectedSecret.expires_at) && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-red-500/20 text-red-400">
                  <XCircleIcon className="w-3 h-3 mr-1" />
                  {language === 'ar' ? 'منتهي الصلاحية' : 'Expired'}
                </span>
              )}
              {!isExpired(selectedSecret.expires_at) && isExpiring(selectedSecret.expires_at) && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-yellow-500/20 text-yellow-400">
                  <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
                  {language === 'ar' ? 'ينتهي قريباً' : 'Expiring Soon'}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              {language === 'ar' ? 'تاريخ الإنشاء' : 'Created At'}
            </label>
            <p className="text-white">{new Date(selectedSecret.created_at).toLocaleString()}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              {language === 'ar' ? 'تاريخ التحديث' : 'Updated At'}
            </label>
            <p className="text-white">{new Date(selectedSecret.updated_at).toLocaleString()}</p>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">
            {language === 'ar' ? 'إدارة الأسرار' : 'Secrets Management'}
          </h2>
          <p className="text-gray-400 mt-1">
            {language === 'ar' ? 'إدارة آمنة للمفاتيح والأسرار المشفرة' : 'Secure management of encrypted keys and secrets'}
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          {language === 'ar' ? 'إضافة سر' : 'Add Secret'}
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={language === 'ar' ? 'البحث في الأسرار...' : 'Search secrets...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
          />
        </div>
        <select
          value={filterProvider}
          onChange={(e) => setFilterProvider(e.target.value)}
          className="px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
        >
          <option value="">{language === 'ar' ? 'جميع المزودين' : 'All Providers'}</option>
          {providers.map(provider => (
            <option key={provider.id} value={provider.id}>{provider.name}</option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
        >
          <option value="">{language === 'ar' ? 'جميع الأنواع' : 'All Types'}</option>
          {secretTypes.map(type => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
        >
          <option value="">{language === 'ar' ? 'جميع الحالات' : 'All Status'}</option>
          <option value="active">{language === 'ar' ? 'نشط' : 'Active'}</option>
          <option value="inactive">{language === 'ar' ? 'غير نشط' : 'Inactive'}</option>
          <option value="expiring">{language === 'ar' ? 'ينتهي قريباً' : 'Expiring Soon'}</option>
        </select>
      </div>

      {/* Secrets Table */}
      <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {language === 'ar' ? 'السر' : 'Secret'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {language === 'ar' ? 'المزود' : 'Provider'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {language === 'ar' ? 'النوع' : 'Type'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {language === 'ar' ? 'الحالة' : 'Status'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {language === 'ar' ? 'الانتهاء' : 'Expiry'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {language === 'ar' ? 'الإجراءات' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {filteredSecrets.map((secret) => (
                <tr key={secret.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <KeyIcon className="w-5 h-5 text-purple-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-white">{secret.secret_name}</div>
                        {secret.description && (
                          <div className="text-sm text-gray-400 truncate max-w-xs">{secret.description}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {getProviderName(secret.provider_id)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getSecretTypeColor(secret.secret_type)}`}>
                      {getSecretTypeLabel(secret.secret_type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                      secret.is_active 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {secret.is_active ? (
                        <>
                          <CheckCircleIcon className="w-3 h-3 mr-1" />
                          {language === 'ar' ? 'نشط' : 'Active'}
                        </>
                      ) : (
                        <>
                          <XCircleIcon className="w-3 h-3 mr-1" />
                          {language === 'ar' ? 'غير نشط' : 'Inactive'}
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {secret.expires_at ? (
                      <div className="flex items-center space-x-2">
                        <ClockIcon className="w-4 h-4" />
                        <span>{new Date(secret.expires_at).toLocaleDateString()}</span>
                        {isExpired(secret.expires_at) && (
                          <span className="inline-flex items-center px-1 py-0.5 text-xs font-medium rounded-full bg-red-500/20 text-red-400">
                            {language === 'ar' ? 'منتهي' : 'Expired'}
                          </span>
                        )}
                        {!isExpired(secret.expires_at) && isExpiring(secret.expires_at) && (
                          <span className="inline-flex items-center px-1 py-0.5 text-xs font-medium rounded-full bg-yellow-500/20 text-yellow-400">
                            {language === 'ar' ? 'قريباً' : 'Soon'}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-500">{language === 'ar' ? 'لا ينتهي' : 'No expiry'}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleView(secret)}
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(secret)}
                        className="text-yellow-400 hover:text-yellow-300 transition-colors"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(secret)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSecrets.length === 0 && (
          <div className="text-center py-12">
            <LockClosedIcon className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">
              {language === 'ar' ? 'لا توجد أسرار' : 'No secrets found'}
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      {renderModal(
        showAddModal,
        () => setShowAddModal(false),
        language === 'ar' ? 'إضافة سر جديد' : 'Add New Secret',
        renderForm()
      )}

      {renderModal(
        showEditModal,
        () => setShowEditModal(false),
        language === 'ar' ? 'تعديل السر' : 'Edit Secret',
        renderForm()
      )}

      {renderModal(
        showViewModal,
        () => setShowViewModal(false),
        language === 'ar' ? 'تفاصيل السر' : 'Secret Details',
        renderViewModal()
      )}
    </div>
  );
};

export default SecretsTab; 