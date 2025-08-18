import React, { useState, useEffect, useCallback } from 'react';
import {
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  DocumentArrowDownIcon,
  DocumentArrowUpIcon,
  Cog6ToothIcon,
  FolderIcon,
  FolderPlusIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import systemSecretsApi from '../../services/systemSecretsApi';

const SystemSecretsTab = () => {
  const [secrets, setSecrets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('create'); // 'create', 'edit', 'delete', 'view', 'export', 'import'
  const [selectedSecret, setSelectedSecret] = useState(null);
  const [showValues, setShowValues] = useState({});
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [providerData, setProviderData] = useState([]); // For dynamic providers
  const [availableProviders, setAvailableProviders] = useState([]); // For cascading dropdown

  // Form state for the modal - UPDATED for dynamic categories with foreign keys
  const [formData, setFormData] = useState({
    provider_id: '', // For UI purposes - not sent to backend
    secret_key: '',  // Required by backend (was config_key)
    secret_category_id: '', // Required by backend (Foreign Key)
    secret_subcategory_id: '', // Optional by backend (Foreign Key)
    secret_value: '', // Required by backend (was config_value)
    display_name: '', // Required by backend
    description: '', // Optional
    provider_name: '', // Optional - extracted from selected provider
    is_active: true, // Optional - defaults to true
    environment: 'all', // Optional - defaults to 'all'
  });

  // NEW STATE FOR DYNAMIC CATEGORIES & SUBCATEGORIES
  const [availableCategories, setAvailableCategories] = useState([]);
  const [availableSubcategories, setAvailableSubcategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);

  // NEW STATE FOR INLINE CATEGORY/SUBCATEGORY MANAGEMENT
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);
  const [categoryModalType, setCategoryModalType] = useState('create'); // 'create', 'edit'
  const [subcategoryModalType, setSubcategoryModalType] = useState('create'); // 'create', 'edit'
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingSubcategory, setEditingSubcategory] = useState(null);

  // Category form state
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    display_name_en: '',
    display_name_ar: '',
    description_en: '',
    description_ar: '',
    sort_order: 0,
    is_active: true
  });

  // Subcategory form state
  const [subcategoryForm, setSubcategoryForm] = useState({
    category_id: '',
    name: '',
    display_name_en: '',
    display_name_ar: '',
    description_en: '',
    description_ar: '',
    display_order: 999,
    is_active: true
  });

  // Load data on component mount
  useEffect(() => {
    loadSecrets();
    loadProviders();
    loadCategories(); // Load categories for dynamic dropdowns
    console.log("Dynamic categories system initialized");
  }, [selectedCategory, searchTerm, showActiveOnly]);

  const loadSecrets = async () => {
    try {
      setLoading(true);
      
      // Task 2: Call without params to fetch all secrets unconditionally for debugging.
      const response = await systemSecretsApi.getSecrets();
      console.log("API RAW RESPONSE (no params)", response.data || response);
      
      const rawSecretsData = response.data.secrets;
      let secretsArray = [];
      if (rawSecretsData && typeof rawSecretsData === 'object' && !Array.isArray(rawSecretsData)) {
        secretsArray = Object.values(rawSecretsData).flat();
      } else if (Array.isArray(rawSecretsData)) {
        secretsArray = rawSecretsData;
      }
      console.log("Collected secretsArray:", secretsArray);
      
      const sanitized = secretsArray.filter(item => item && item.id);

      const normalizedAndSanitized = sanitized.map(s => ({
        id: s.id,
        config_key: s.config_key || s.secret_key || s.display_name || 'Missing Key',
        category: s.category || s.secret_category || 'uncategorized',
        config_value_masked: s.config_value_masked || '••••••••',
        is_active: s.is_active !== undefined ? s.is_active : false,
        last_updated: s.last_updated || s.updated_at || s.created_at || '-',
        description: s.description || '-'
      }));
      
      setSecrets(normalizedAndSanitized);

      setError(null);
    } catch (err) {
      setError('Failed to load system secrets');
      console.error('Load secrets error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProviders = async () => {
    try {
      // Fetches all provider definitions, including their default keys
      const response = await systemSecretsApi.getProviders(); // Assuming this endpoint exists
      setProviderData(response.data || []);
    } catch (err) {
      console.error('Load provider data error:', err);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const response = await systemSecretsApi.getAuditLogs({ limit: 100 });
      setAuditLogs(response.data);
    } catch (err) {
      console.error('Load audit logs error:', err);
    }
  };

  // NEW FUNCTIONS FOR DYNAMIC CATEGORY/SUBCATEGORY MANAGEMENT

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await systemSecretsApi.getCategories();
      
      if (response.success) {
        setAvailableCategories(response.data || []);
      } else {
        throw new Error('Failed to load categories');
      }
    } catch (err) {
      console.error('Load categories error:', err);
      setError('Failed to load categories');
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadSubcategories = async (categoryId) => {
    if (!categoryId) {
      setAvailableSubcategories([]);
      return;
    }

    try {
      setLoadingSubcategories(true);
      const response = await systemSecretsApi.getSubcategories(categoryId);
      
      if (response.success) {
        setAvailableSubcategories(response.data || []);
      } else {
        throw new Error('Failed to load subcategories');
      }
    } catch (err) {
      console.error('Load subcategories error:', err);
      setError('Failed to load subcategories');
    } finally {
      setLoadingSubcategories(false);
    }
  };

  const handleCategoryChange = (e) => {
    const categoryId = e.target.value;
    setFormData(prev => ({
      ...prev,
      secret_category_id: categoryId,
      secret_subcategory_id: '' // Reset subcategory when category changes
    }));
    
    // Load subcategories for the selected category
    loadSubcategories(categoryId);
  };

  const handleSubcategoryChange = (e) => {
    const subcategoryId = e.target.value;
    setFormData(prev => ({
      ...prev,
      secret_subcategory_id: subcategoryId
    }));
  };

  const handleCreateSecret = () => {
    setModalType('create');
    setFormData({
      provider_id: '', // For UI purposes - not sent to backend
      secret_key: '',  // Required by backend
      secret_category_id: '', // Required by backend (Foreign Key)
      secret_subcategory_id: '', // Optional by backend (Foreign Key)
      secret_value: '', // Required by backend
      display_name: '', // Required by backend
      description: '', // Optional
      provider_name: '', // Optional
      is_active: true, // Optional
      environment: 'all', // Optional
    });
    
    // Reset subcategories when creating new secret
    setAvailableSubcategories([]);
    setShowModal(true);
    };

  const handleEditSecret = async (secret) => {
    // **Guard Clause**
    if (!secret || !secret.id) {
      setError('Cannot edit a secret without a valid ID.');
      return;
    }
    try {
      // Get full secret details including actual value
      const response = await systemSecretsApi.getSecret(secret.id);
      const secretData = response.data;
      
      setSelectedSecret(secretData);
      setFormData({
        provider_id: secretData.provider_id || '', // For UI purposes
        secret_key: secretData.secret_key,  // From backend
        secret_category_id: secretData.secret_category_id || '', // From backend (Foreign Key)
        secret_subcategory_id: secretData.secret_subcategory_id || '', // From backend (Foreign Key)
        secret_value: secretData.secret_value, // From backend (decrypted)
        display_name: secretData.display_name, // From backend
        description: secretData.description || '',
        provider_name: secretData.provider_name || '',
        is_active: secretData.is_active,
        environment: secretData.environment || 'all',
      });
      
      // Load subcategories for the selected category if it exists
      if (secretData.secret_category_id) {
        loadSubcategories(secretData.secret_category_id);
      }
      setModalType('edit');
      setShowModal(true);
    } catch (err) {
      setError('Failed to load secret details');
            }
  };

  const handleDeleteSecret = (secret) => {
    // **Guard Clause**
    if (!secret || !secret.id) {
      setError('Cannot delete a secret without a valid ID.');
      return;
    }
    setSelectedSecret(secret);
    setModalType('delete');
    setShowModal(true);
  };

  const handleViewSecret = async (secret) => {
    // **Guard Clause**
    if (!secret || !secret.id) {
      setError('Cannot view a secret without a valid ID.');
      return;
    }
    try {
      const response = await systemSecretsApi.getSecret(secret.id);
      setSelectedSecret(response.data);
      setModalType('view');
      setShowModal(true);
    } catch (err) {
      setError('Failed to load secret details');
    }
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
    
    try {
      if (modalType === 'create') {
        // Prepare data for backend - using foreign key fields
        const backendData = {
          secret_key: formData.secret_key,
          secret_category_id: formData.secret_category_id,
          secret_subcategory_id: formData.secret_subcategory_id || null,
          secret_value: formData.secret_value,
          display_name: formData.display_name,
          description: formData.description,
          provider_name: formData.provider_name,
          environment: formData.environment || 'all',
          is_active: formData.is_active !== undefined ? formData.is_active : true
        };
        await systemSecretsApi.createSecret(backendData);
      } else if (modalType === 'edit') {
        await systemSecretsApi.updateSecret(selectedSecret.id, formData);
      } else if (modalType === 'delete') {
        await systemSecretsApi.deleteSecret(selectedSecret.id, { confirm: true });
      }
      
      setShowModal(false);
      loadSecrets();
      setError(null);
        } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
        }
    };

  const handleProviderChange = (e) => {
    const providerId = e.target.value;
    const selectedProvider = providerData.find(p => p.id === providerId);
    
    if (selectedProvider) {
      setFormData(prev => ({
        ...prev,
        provider_id: providerId, // For UI selection only
        secret_key: selectedProvider.configuration_key || '', // Backend expects secret_key
        provider_name: selectedProvider.name || '', // Backend expects provider_name
        display_name: `${selectedProvider.name} API Key` || '', // Backend expects display_name
        // Note: Category and subcategory are now selected separately via dropdowns
      }));
    } else {
      // Reset form when no provider selected
      setFormData(prev => ({ 
        ...prev, 
        provider_id: '', 
        secret_key: '', 
        provider_name: '',
        display_name: ''
        // Note: Keep category/subcategory selections intact
      }));
    }
  };

  const handleExport = async () => {
        try {
      const response = await systemSecretsApi.exportSecrets({
        include_values: true,
        categories: selectedCategory !== 'all' ? [selectedCategory] : []
      });
      
      // Download as JSON file
      const blob = new Blob([JSON.stringify(response.data, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `samia-tarot-secrets-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
        } catch (err) {
      setError('Export failed');
        }
    };
    
    const handleTestConnection = async (secret) => {
      // **Guard Clause**
      if (!secret || !secret.id) {
        setError('Cannot test a secret without a valid ID.');
        return;
      }
      try {
        const response = await systemSecretsApi.testConnection(secret.id);
      alert(`Connection test: ${response.data.message}`);
      } catch (err) {
        alert(`Connection test failed: ${err.response?.data?.message || 'Unknown error'}`);
      }
    };

  const handleBulkExport = async () => {
    try {
      setLoading(true);
      const response = await systemSecretsApi.exportSecrets({
        categories: selectedCategory !== 'all' ? [selectedCategory] : [],
        include_inactive: !showActiveOnly,
        mask_values: false
      });
      
      // Download as JSON file
      const blob = new Blob([JSON.stringify(response.data, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `samia-tarot-secrets-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setError(null);
    } catch (err) {
      setError('Bulk export failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleBulkImport = () => {
    setModalType('import');
    setShowModal(true);
  };

  const handleBulkPopulate = async () => {
    if (!confirm('This will auto-populate the database with default system secrets. Continue?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await systemSecretsApi.bulkPopulate({
        overwrite: false,
        categories: selectedCategory !== 'all' ? [selectedCategory] : []
      });
      
      alert(`Bulk populate completed:\n- Created: ${response.data.created}\n- Updated: ${response.data.updated}\n- Skipped: ${response.data.skipped}\n- Errors: ${response.data.errors.length}`);
      
      if (response.data.errors.length > 0) {
        console.error('Bulk populate errors:', response.data.errors);
      }
      
      loadSecrets();
      setError(null);
    } catch (err) {
      setError('Bulk populate failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleFileImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      const text = await file.text();
      const importData = JSON.parse(text);
      
      // Validate import data structure
      if (!importData.secrets || !Array.isArray(importData.secrets)) {
        throw new Error('Invalid import file format. Expected JSON with "secrets" array.');
      }

      const response = await systemSecretsApi.importSecrets({
        secrets: importData.secrets,
        overwrite: confirm('Overwrite existing secrets with same keys?')
      });
      
      alert(`Import completed:\n- Created: ${response.data.created}\n- Updated: ${response.data.updated}\n- Skipped: ${response.data.skipped}\n- Errors: ${response.data.errors.length}`);
      
      if (response.data.errors.length > 0) {
        console.error('Import errors:', response.data.errors);
      }
      
      loadSecrets();
      setShowModal(false);
      setError(null);
    } catch (err) {
      setError('Import failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const toggleShowValue = (secretId) => {
    setShowValues(prev => ({
      ...prev,
      [secretId]: !prev[secretId]
    }));
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'payment': return '💳';
      case 'ai': return '🤖';
      case 'database': return '🗄️';
      case 'backup': return '💾';
      case 'external_api': return '🔗';
      case 'security': return '🔒';
      case 'system': return '⚙️';
      default: return '📋';
    }
  };

  const getStatusColor = (isActive) => {
    return isActive ? 'text-green-400' : 'text-red-400';
  };

  const filteredSecrets = secrets.filter(secret => {
    const key = secret.config_key || '';
    const desc = secret.description || '';

    const matchesCategory = selectedCategory === 'all' || secret.category === selectedCategory;
    const matchesSearch = !searchTerm || 
      key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      desc.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesActive = !showActiveOnly || secret.is_active;
    
    return matchesCategory && matchesSearch && matchesActive;
        });
  
  // **Temporary Debug Log**
  useEffect(() => {
    // console.log('--- Inspecting Filtered Secrets ---');
    // console.log('Filtered secrets for render:', filteredSecrets);
  }, [filteredSecrets]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheckIcon className="h-8 w-8 text-purple-400" />
            System Secrets Management
          </h2>
          <p className="text-gray-400 mt-1">
            Secure configuration management for all system secrets and API keys
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAuditLogs(!showAuditLogs)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <DocumentTextIcon className="h-5 w-5" />
            Audit Logs
          </button>
          <button
            onClick={handleBulkPopulate}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 transition-colors"
            title="Auto-populate with default system secrets"
          >
            <KeyIcon className="h-5 w-5" />
            Auto-Populate
          </button>
          <button
            onClick={handleBulkImport}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <ArrowUpTrayIcon className="h-5 w-5" />
            Bulk Import
          </button>
          <button
            onClick={handleBulkExport}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
            Bulk Export
          </button>
                <button 
            onClick={handleCreateSecret}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                >
                    <PlusIcon className="h-5 w-5" />
            Add Secret
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 flex items-center gap-2">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
          <span className="text-red-200">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            <XCircleIcon className="h-5 w-5" />
                </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-gray-800/50 rounded-lg p-4 space-y-4">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-64">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search secrets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
                </div>

          {/* Category Filter */}
          <div className="min-w-48">
                <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Categories</option>
              {categories.map((category, idx) => (
                <option key={`category-filter-${category.name || idx}`} value={category.name}>
                  {getCategoryIcon(category.name)} {category.label} ({category.count})
                        </option>
                    ))}
                </select>
            </div>

          {/* Active Only Toggle */}
          <label className="flex items-center gap-2 text-white">
            <input
              type="checkbox"
              checked={showActiveOnly}
              onChange={(e) => setShowActiveOnly(e.target.checked)}
              className="rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500"
            />
            Active Only
          </label>
        </div>
      </div>

      {/* Secrets List */}
            <div className="bg-gray-800/50 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-700/50">
                        <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Configuration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
                        </tr>
                    </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredSecrets.map((secret, idx) => (
                <tr key={secret.id || secret.config_key || idx} className="hover:bg-gray-700/30 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <KeyIcon className="h-4 w-4 text-purple-400" />
                        <span className="text-white font-medium">{secret.config_key || '-'}</span>
                      </div>
                      <p className="text-gray-400 text-sm mt-1">{secret.description || '-'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-700 text-gray-300">
                      {getCategoryIcon(secret.category?.display_name_en)}
                      {secret.category?.display_name_en || secret.secret_category || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-300 font-mono text-sm">
                        {showValues[secret.id] ? '••••••••' : (secret.config_value_masked || '••••••••')}
                      </span>
                      <button
                        onClick={() => toggleShowValue(secret.id)}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        {showValues[secret.id] ? (
                          <EyeSlashIcon className="h-4 w-4" />
                        ) : (
                          <EyeIcon className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                                    </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 ${getStatusColor(secret.is_active)}`}>
                      {secret.is_active ? (
                        <CheckCircleIcon className="h-4 w-4" />
                      ) : (
                        <XCircleIcon className="h-4 w-4" />
                      )}
                      {secret.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-gray-400 text-sm">
                      <ClockIcon className="h-4 w-4" />
                      {secret.last_updated && secret.last_updated !== '-' ? new Date(secret.last_updated).toLocaleDateString() : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleViewSecret(secret)}
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                        title="View Details"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEditSecret(secret)}
                        className="text-yellow-400 hover:text-yellow-300 transition-colors"
                        title="Edit"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleTestConnection(secret)}
                        className="text-green-400 hover:text-green-300 transition-colors"
                        title="Test Connection"
                      >
                        <CheckCircleIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSecret(secret)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
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
            <KeyIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-300">No secrets found</h3>
            <p className="mt-1 text-sm text-gray-400">
              {searchTerm || selectedCategory !== 'all' 
                ? 'Try adjusting your filters'
                : 'Get started by creating your first system secret'
              }
            </p>
          </div>
        )}
      </div>

      {/* Audit Logs Panel */}
      {showAuditLogs && (
        <div key={`audit-logs-panel-${showAuditLogs}`} className="bg-gray-800/50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Audit Logs</h3>
            <button
              onClick={() => {
                setShowAuditLogs(false);
                loadAuditLogs();
              }}
              className="text-gray-400 hover:text-white"
            >
              <XCircleIcon className="h-5 w-5" />
            </button>
          </div>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {auditLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded">
                <div>
                  <span className="text-white font-medium">{log.config_key}</span>
                  <span className="ml-2 text-gray-400">({log.action})</span>
                </div>
                <div className="text-gray-400 text-sm">
                  {new Date(log.performed_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">
              {modalType === 'create' && 'Create System Secret'}
              {modalType === 'edit' && 'Edit System Secret'}
              {modalType === 'delete' && 'Delete System Secret'}
              {modalType === 'view' && 'View System Secret'}
              {modalType === 'import' && 'Bulk Import System Secrets'}
            </h3>

            {modalType === 'delete' ? (
              <div>
                <p className="text-gray-300 mb-4">
                  Are you sure you want to delete the secret "{selectedSecret?.config_key}"?
                  This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : modalType === 'import' ? (
              <div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Select JSON File
                    </label>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileImport}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700"
                    />
                  </div>
                  <div className="bg-gray-700/50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Import Instructions:</h4>
                    <ul className="text-sm text-gray-400 space-y-1">
                      <li>• Upload a JSON file with the correct format</li>
                      <li>• File should contain a "secrets" array</li>
                      <li>• Existing secrets with same keys will be skipped unless overwrite is confirmed</li>
                      <li>• Use the bulk export feature to get the correct format</li>
                    </ul>
                  </div>
                </div>
                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : modalType === 'view' ? (
              <div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Configuration Key
                    </label>
                    <p className="text-white bg-gray-700 p-2 rounded">{selectedSecret?.config_key}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Value
                    </label>
                    <p className="text-white bg-gray-700 p-2 rounded font-mono break-all">
                      {selectedSecret?.config_value}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Category
                    </label>
                    <p className="text-white bg-gray-700 p-2 rounded">{selectedSecret?.category}</p>
                  </div>
                  {selectedSecret?.description && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Description
                      </label>
                      <p className="text-white bg-gray-700 p-2 rounded">{selectedSecret.description}</p>
                    </div>
                  )}
                </div>
                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* DYNAMIC PROVIDER DROPDOWN (Task 1) */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Provider *
                  </label>
                  <select
                    value={formData.provider_id}
                    onChange={handleProviderChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  >
                    <option value="">Select a Provider</option>
                    {providerData.map(provider => (
                      <option key={provider.id} value={provider.id}>
                        {provider.name} ({provider.category})
                      </option>
                    ))}
                  </select>
                </div>

                {/* SECRET KEY (Backend Required Field) */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Secret Key *
                  </label>
                  <input
                    type="text"
                    value={formData.secret_key}
                    onChange={(e) => setFormData({ ...formData, secret_key: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., openai_api_key"
                    required
                    disabled={modalType === 'edit'} 
                  />
                </div>

                {/* DYNAMIC CATEGORY DROPDOWN */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-300">
                      Category *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setCategoryModalType('create');
                        setCategoryForm({
                          name: '',
                          name_en: '',
                          name_ar: '',
                          description_en: '',
                          description_ar: '',
                          display_order: 999,
                          is_active: true
                        });
                        setShowCategoryModal(true);
                      }}
                      className="text-purple-400 hover:text-purple-300 transition-colors"
                      title="Add New Category"
                    >
                      <FolderPlusIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <select
                    value={formData.secret_category_id}
                    onChange={handleCategoryChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                    disabled={loadingCategories}
                  >
                    <option value="">
                      {loadingCategories ? 'Loading categories...' : 'Select a Category'}
                    </option>
                    {availableCategories.map(category => (
                      <option key={`category-${category.id}`} value={category.id}>
                        {category.name_en}
                        {category.secrets_count > 0 && ` (${category.secrets_count} secrets)`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* DYNAMIC SUBCATEGORY DROPDOWN */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-300">
                      Subcategory
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (!formData.secret_category_id) {
                          alert('Please select a category first');
                          return;
                        }
                        setSubcategoryModalType('create');
                        setSubcategoryForm({
                          category_id: formData.secret_category_id,
                          name: '',
                          name_en: '',
                          name_ar: '',
                          description_en: '',
                          description_ar: '',
                          display_order: 999,
                          is_active: true
                        });
                        setShowSubcategoryModal(true);
                      }}
                      className="text-purple-400 hover:text-purple-300 transition-colors"
                      title="Add New Subcategory"
                      disabled={!formData.secret_category_id}
                    >
                      <TagIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <select
                    value={formData.secret_subcategory_id}
                    onChange={handleSubcategoryChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    disabled={loadingSubcategories || !formData.secret_category_id}
                  >
                    <option value="">
                      {!formData.secret_category_id 
                        ? 'Select a category first'
                        : loadingSubcategories 
                          ? 'Loading subcategories...' 
                          : 'Select a Subcategory (Optional)'
                      }
                    </option>
                    {availableSubcategories.map(subcategory => (
                      <option key={`subcategory-${subcategory.id}`} value={subcategory.id}>
                        {subcategory.name_en}
                        {subcategory.secrets_count > 0 && ` (${subcategory.secrets_count} secrets)`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* DISPLAY NAME (Backend Required Field) */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., OpenAI API Key"
                    required
                  />
                </div>

                {/* SECRET VALUE (Backend Required Field) */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Secret Value *
                  </label>
                  <textarea
                    value={formData.secret_value}
                    onChange={(e) => setFormData({ ...formData, secret_value: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                    placeholder="Enter the secret value"
                    rows={3}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Brief description of this secret"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500"
                  />
                  <label htmlFor="is_active" className="text-sm text-gray-300">
                    Active
                  </label>
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                  >
                    {modalType === 'create' ? 'Create' : 'Update'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* CATEGORY MANAGEMENT MODAL */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">
              {categoryModalType === 'create' ? 'Add New Category' : 'Edit Category'}
            </h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                if (categoryModalType === 'create') {
                  const response = await systemSecretsApi.createCategory(categoryForm);
                  
                  if (!response.success) {
                    throw new Error(response.error || 'Failed to create category');
                  }
                } else {
                  const response = await systemSecretsApi.updateCategory(editingCategory.id, categoryForm);
                  
                  if (!response.success) {
                    throw new Error(response.error || 'Failed to update category');
                  }
                }

                // Refresh categories and close modal
                await loadCategories();
                setShowCategoryModal(false);
                setError(null);
              } catch (err) {
                setError(`Failed to ${categoryModalType} category: ${err.message}`);
              }
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Category Name (English) *
                </label>
                <input
                  type="text"
                  value={categoryForm.display_name_en}
                  onChange={(e) => setCategoryForm({...categoryForm, display_name_en: e.target.value, name: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., AI Services"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Category Name (Arabic)
                </label>
                <input
                  type="text"
                  value={categoryForm.display_name_ar}
                  onChange={(e) => setCategoryForm({...categoryForm, display_name_ar: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., خدمات الذكاء الاصطناعي"
                  dir="rtl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Description (English)
                </label>
                <textarea
                  value={categoryForm.description_en}
                  onChange={(e) => setCategoryForm({...categoryForm, description_en: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Brief description"
                  rows={2}
                />
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  {categoryModalType === 'create' ? 'Create Category' : 'Update Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUBCATEGORY MANAGEMENT MODAL */}
      {showSubcategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">
              {subcategoryModalType === 'create' ? 'Add New Subcategory' : 'Edit Subcategory'}
            </h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                if (subcategoryModalType === 'create') {
                  const response = await systemSecretsApi.createSubcategory(subcategoryForm);
                  
                  if (!response.success) {
                    throw new Error(response.error || 'Failed to create subcategory');
                  }
                } else {
                  const response = await systemSecretsApi.updateSubcategory(editingSubcategory.id, subcategoryForm);
                  
                  if (!response.success) {
                    throw new Error(response.error || 'Failed to update subcategory');
                  }
                }

                // Refresh subcategories and close modal
                if (formData.secret_category_id) {
                  await loadSubcategories(formData.secret_category_id);
                }
                setShowSubcategoryModal(false);
                setError(null);
              } catch (err) {
                setError(`Failed to ${subcategoryModalType} subcategory: ${err.message}`);
              }
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Subcategory Name (English) *
                </label>
                <input
                  type="text"
                  value={subcategoryForm.display_name_en}
                  onChange={(e) => setSubcategoryForm({...subcategoryForm, display_name_en: e.target.value, name: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., OpenAI Services"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Subcategory Name (Arabic)
                </label>
                <input
                  type="text"
                  value={subcategoryForm.display_name_ar}
                  onChange={(e) => setSubcategoryForm({...subcategoryForm, display_name_ar: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., خدمات OpenAI"
                  dir="rtl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Description (English)
                </label>
                <textarea
                  value={subcategoryForm.description_en}
                  onChange={(e) => setSubcategoryForm({...subcategoryForm, description_en: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Brief description"
                  rows={2}
                />
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowSubcategoryModal(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  {subcategoryModalType === 'create' ? 'Create Subcategory' : 'Update Subcategory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </div>
    );
};

export default SystemSecretsTab; 