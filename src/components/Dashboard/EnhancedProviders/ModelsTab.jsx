import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  CpuChipIcon,
  SparklesIcon,
  CurrencyDollarIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { enhancedProvidersApi } from '../../../services/enhancedProvidersApi';

const ModelsTab = ({ language, onStatsChange }) => {
  const [models, setModels] = useState([]);
  const [services, setServices] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterService, setFilterService] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedModel, setSelectedModel] = useState(null);
  const [formData, setFormData] = useState({
    service_id: '',
    model_name: '',
    model_version: '',
    description: '',
    capabilities: [],
    pricing_model: 'per_token',
    input_cost_per_token: 0,
    output_cost_per_token: 0,
    context_length: 4096,
    max_tokens: 2048,
    is_active: true,
    metadata: {}
  });

  const pricingModels = [
    { value: 'per_token', label: language === 'ar' ? 'لكل رمز' : 'Per Token' },
    { value: 'per_request', label: language === 'ar' ? 'لكل طلب' : 'Per Request' },
    { value: 'per_minute', label: language === 'ar' ? 'لكل دقيقة' : 'Per Minute' },
    { value: 'fixed', label: language === 'ar' ? 'ثابت' : 'Fixed' },
    { value: 'free', label: language === 'ar' ? 'مجاني' : 'Free' }
  ];

  const capabilityOptions = [
    { value: 'text_generation', label: language === 'ar' ? 'توليد النصوص' : 'Text Generation' },
    { value: 'text_completion', label: language === 'ar' ? 'إكمال النصوص' : 'Text Completion' },
    { value: 'chat', label: language === 'ar' ? 'محادثة' : 'Chat' },
    { value: 'image_generation', label: language === 'ar' ? 'توليد الصور' : 'Image Generation' },
    { value: 'image_analysis', label: language === 'ar' ? 'تحليل الصور' : 'Image Analysis' },
    { value: 'speech_to_text', label: language === 'ar' ? 'تحويل الكلام إلى نص' : 'Speech to Text' },
    { value: 'text_to_speech', label: language === 'ar' ? 'تحويل النص إلى كلام' : 'Text to Speech' },
    { value: 'embedding', label: language === 'ar' ? 'التضمين' : 'Embedding' },
    { value: 'translation', label: language === 'ar' ? 'ترجمة' : 'Translation' },
    { value: 'moderation', label: language === 'ar' ? 'الإشراف' : 'Moderation' }
  ];

  useEffect(() => {
    loadModels();
    loadServices();
    loadProviders();
  }, []);

  const loadModels = async () => {
    try {
      setLoading(true);
      const response = await enhancedProvidersApi.getModels();
      if (response.success) {
        setModels(response.data || []);
        // Update stats if callback provided
        if (onStatsChange) {
          onStatsChange(prevStats => ({
            ...prevStats,
            models: {
              total: response.data?.length || 0,
              active: response.data?.filter(m => m.is_active).length || 0
            }
          }));
        }
      }
    } catch (error) {
      console.error('Error loading models:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async () => {
    try {
      const response = await enhancedProvidersApi.getServices();
      if (response.success) {
        setServices(response.data || []);
      }
    } catch (error) {
      console.error('Error loading services:', error);
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

  const filteredModels = models.filter(model => {
    const matchesSearch = !searchTerm || 
      model.model_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      model.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesService = !filterService || model.service_id === filterService;
    const matchesStatus = !filterStatus || 
      (filterStatus === 'active' && model.is_active) ||
      (filterStatus === 'inactive' && !model.is_active);
    
    return matchesSearch && matchesService && matchesStatus;
  });

  const handleAdd = () => {
    setFormData({
      service_id: '',
      model_name: '',
      model_version: '',
      description: '',
      capabilities: [],
      pricing_model: 'per_token',
      input_cost_per_token: 0,
      output_cost_per_token: 0,
      context_length: 4096,
      max_tokens: 2048,
      is_active: true,
      metadata: {}
    });
    setShowAddModal(true);
  };

  const handleEdit = (model) => {
    setSelectedModel(model);
    setFormData({ 
      ...model,
      capabilities: model.capabilities || []
    });
    setShowEditModal(true);
  };

  const handleView = (model) => {
    setSelectedModel(model);
    setShowViewModal(true);
  };

  const handleDelete = async (model) => {
    if (window.confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا النموذج؟' : 'Are you sure you want to delete this model?')) {
      try {
        const response = await enhancedProvidersApi.deleteModel(model.id);
        if (response.success) {
          await loadModels();
        }
      } catch (error) {
        console.error('Error deleting model:', error);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = selectedModel
        ? await enhancedProvidersApi.updateModel(selectedModel.id, formData)
        : await enhancedProvidersApi.createModel(formData);
      
      if (response.success) {
        await loadModels();
        setShowAddModal(false);
        setShowEditModal(false);
        setSelectedModel(null);
      }
    } catch (error) {
      console.error('Error saving model:', error);
    }
  };

  const getServiceName = (serviceId) => {
    const service = services.find(s => s.id === serviceId);
    return service?.service_name || 'Unknown';
  };

  const getProviderName = (serviceId) => {
    const service = services.find(s => s.id === serviceId);
    if (service) {
      const provider = providers.find(p => p.id === service.provider_id);
      return provider?.name || 'Unknown';
    }
    return 'Unknown';
  };

  const getCapabilityLabel = (capability) => {
    const cap = capabilityOptions.find(c => c.value === capability);
    return cap?.label || capability;
  };

  const getPricingModelLabel = (model) => {
    const pricing = pricingModels.find(p => p.value === model);
    return pricing?.label || model;
  };

  const formatCost = (cost) => {
    if (cost === 0) return 'Free';
    return `$${cost.toFixed(6)}`;
  };

  const handleCapabilityChange = (capability, checked) => {
    if (checked) {
      setFormData({
        ...formData,
        capabilities: [...formData.capabilities, capability]
      });
    } else {
      setFormData({
        ...formData,
        capabilities: formData.capabilities.filter(c => c !== capability)
      });
    }
  };

  const renderModal = (show, onClose, title, children) => {
    if (!show) return null;

    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-gradient-to-br from-[#1a0b2e] to-[#2d1b69] rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-purple-500/20"
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {language === 'ar' ? 'الخدمة' : 'Service'}
          </label>
          <select
            value={formData.service_id}
            onChange={(e) => setFormData({...formData, service_id: e.target.value})}
            className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
            required
          >
            <option value="">{language === 'ar' ? 'اختر الخدمة' : 'Select Service'}</option>
            {services.map(service => (
              <option key={service.id} value={service.id}>
                {getProviderName(service.id)} - {service.service_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {language === 'ar' ? 'اسم النموذج' : 'Model Name'}
          </label>
          <input
            type="text"
            value={formData.model_name}
            onChange={(e) => setFormData({...formData, model_name: e.target.value})}
            className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {language === 'ar' ? 'إصدار النموذج' : 'Model Version'}
          </label>
          <input
            type="text"
            value={formData.model_version}
            onChange={(e) => setFormData({...formData, model_version: e.target.value})}
            className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
            placeholder="v1.0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {language === 'ar' ? 'نموذج التسعير' : 'Pricing Model'}
          </label>
          <select
            value={formData.pricing_model}
            onChange={(e) => setFormData({...formData, pricing_model: e.target.value})}
            className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
          >
            {pricingModels.map(model => (
              <option key={model.value} value={model.value}>{model.label}</option>
            ))}
          </select>
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
        <label className="block text-sm font-medium text-gray-300 mb-3">
          {language === 'ar' ? 'القدرات' : 'Capabilities'}
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {capabilityOptions.map(capability => (
            <label key={capability.value} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.capabilities.includes(capability.value)}
                onChange={(e) => handleCapabilityChange(capability.value, e.target.checked)}
                className="w-4 h-4 text-purple-600 bg-gray-800 border-gray-600 rounded focus:ring-purple-500"
              />
              <span className="text-sm text-gray-300">{capability.label}</span>
            </label>
          ))}
        </div>
      </div>

      {formData.pricing_model === 'per_token' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {language === 'ar' ? 'تكلفة الإدخال لكل رمز' : 'Input Cost per Token'}
            </label>
            <input
              type="number"
              step="0.000001"
              value={formData.input_cost_per_token}
              onChange={(e) => setFormData({...formData, input_cost_per_token: parseFloat(e.target.value)})}
              className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {language === 'ar' ? 'تكلفة الإخراج لكل رمز' : 'Output Cost per Token'}
            </label>
            <input
              type="number"
              step="0.000001"
              value={formData.output_cost_per_token}
              onChange={(e) => setFormData({...formData, output_cost_per_token: parseFloat(e.target.value)})}
              className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
              min="0"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {language === 'ar' ? 'طول السياق' : 'Context Length'}
          </label>
          <input
            type="number"
            value={formData.context_length}
            onChange={(e) => setFormData({...formData, context_length: parseInt(e.target.value)})}
            className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
            min="1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {language === 'ar' ? 'الحد الأقصى للرموز' : 'Max Tokens'}
          </label>
          <input
            type="number"
            value={formData.max_tokens}
            onChange={(e) => setFormData({...formData, max_tokens: parseInt(e.target.value)})}
            className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
            min="1"
          />
        </div>
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
          {selectedModel ? (language === 'ar' ? 'تحديث' : 'Update') : (language === 'ar' ? 'إضافة' : 'Add')}
        </button>
      </div>
    </form>
  );

  const renderViewModal = () => {
    if (!selectedModel) return null;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              {language === 'ar' ? 'الخدمة' : 'Service'}
            </label>
            <p className="text-white">{getProviderName(selectedModel.service_id)} - {getServiceName(selectedModel.service_id)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              {language === 'ar' ? 'اسم النموذج' : 'Model Name'}
            </label>
            <p className="text-white">{selectedModel.model_name}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              {language === 'ar' ? 'الإصدار' : 'Version'}
            </label>
            <p className="text-white">{selectedModel.model_version || 'N/A'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              {language === 'ar' ? 'الحالة' : 'Status'}
            </label>
            <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
              selectedModel.is_active 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-red-500/20 text-red-400'
            }`}>
              {selectedModel.is_active ? (
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

        {selectedModel.description && (
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              {language === 'ar' ? 'الوصف' : 'Description'}
            </label>
            <p className="text-white">{selectedModel.description}</p>
          </div>
        )}

        {selectedModel.capabilities && selectedModel.capabilities.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              {language === 'ar' ? 'القدرات' : 'Capabilities'}
            </label>
            <div className="flex flex-wrap gap-2">
              {selectedModel.capabilities.map(capability => (
                <span key={capability} className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <SparklesIcon className="w-3 h-3 mr-1" />
                  {getCapabilityLabel(capability)}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              {language === 'ar' ? 'نموذج التسعير' : 'Pricing Model'}
            </label>
            <p className="text-white">{getPricingModelLabel(selectedModel.pricing_model)}</p>
          </div>
          {selectedModel.pricing_model === 'per_token' && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                {language === 'ar' ? 'التكلفة لكل رمز' : 'Cost per Token'}
              </label>
              <p className="text-white">
                Input: {formatCost(selectedModel.input_cost_per_token)} | Output: {formatCost(selectedModel.output_cost_per_token)}
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              {language === 'ar' ? 'طول السياق' : 'Context Length'}
            </label>
            <p className="text-white">{selectedModel.context_length?.toLocaleString()} tokens</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              {language === 'ar' ? 'الحد الأقصى للرموز' : 'Max Tokens'}
            </label>
            <p className="text-white">{selectedModel.max_tokens?.toLocaleString()} tokens</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              {language === 'ar' ? 'تاريخ الإنشاء' : 'Created At'}
            </label>
            <p className="text-white">{new Date(selectedModel.created_at).toLocaleString()}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              {language === 'ar' ? 'تاريخ التحديث' : 'Updated At'}
            </label>
            <p className="text-white">{new Date(selectedModel.updated_at).toLocaleString()}</p>
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
            {language === 'ar' ? 'إدارة النماذج' : 'Models Management'}
          </h2>
          <p className="text-gray-400 mt-1">
            {language === 'ar' ? 'إدارة نماذج الذكاء الاصطناعي والتكوينات' : 'Manage AI models and configurations'}
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          {language === 'ar' ? 'إضافة نموذج' : 'Add Model'}
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={language === 'ar' ? 'البحث في النماذج...' : 'Search models...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
          />
        </div>
        <select
          value={filterService}
          onChange={(e) => setFilterService(e.target.value)}
          className="px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
        >
          <option value="">{language === 'ar' ? 'جميع الخدمات' : 'All Services'}</option>
          {services.map(service => (
            <option key={service.id} value={service.id}>
              {getProviderName(service.id)} - {service.service_name}
            </option>
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
        </select>
      </div>

      {/* Models Table */}
      <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {language === 'ar' ? 'النموذج' : 'Model'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {language === 'ar' ? 'الخدمة' : 'Service'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {language === 'ar' ? 'القدرات' : 'Capabilities'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {language === 'ar' ? 'التسعير' : 'Pricing'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {language === 'ar' ? 'الحالة' : 'Status'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {language === 'ar' ? 'الإجراءات' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {filteredModels.map((model) => (
                <tr key={model.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <CpuChipIcon className="w-5 h-5 text-purple-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-white">{model.model_name}</div>
                        {model.model_version && (
                          <div className="text-sm text-gray-400">{model.model_version}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    <div>
                      <div className="font-medium">{getProviderName(model.service_id)}</div>
                      <div className="text-gray-400">{getServiceName(model.service_id)}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {model.capabilities?.slice(0, 2).map(capability => (
                        <span key={capability} className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          {getCapabilityLabel(capability)}
                        </span>
                      ))}
                      {model.capabilities?.length > 2 && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-500/20 text-gray-400 border border-gray-500/30">
                          +{model.capabilities.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    <div className="flex items-center">
                      <CurrencyDollarIcon className="w-4 h-4 mr-1" />
                      {getPricingModelLabel(model.pricing_model)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                      model.is_active 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {model.is_active ? (
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleView(model)}
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(model)}
                        className="text-yellow-400 hover:text-yellow-300 transition-colors"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(model)}
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

        {filteredModels.length === 0 && (
          <div className="text-center py-12">
            <CpuChipIcon className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">
              {language === 'ar' ? 'لا توجد نماذج' : 'No models found'}
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      {renderModal(
        showAddModal,
        () => setShowAddModal(false),
        language === 'ar' ? 'إضافة نموذج جديد' : 'Add New Model',
        renderForm()
      )}

      {renderModal(
        showEditModal,
        () => setShowEditModal(false),
        language === 'ar' ? 'تعديل النموذج' : 'Edit Model',
        renderForm()
      )}

      {renderModal(
        showViewModal,
        () => setShowViewModal(false),
        language === 'ar' ? 'تفاصيل النموذج' : 'Model Details',
        renderViewModal()
      )}
    </div>
  );
};

export default ModelsTab; 