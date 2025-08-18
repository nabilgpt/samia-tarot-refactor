import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ServerIcon,
  CogIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { enhancedProvidersApi } from '../../../services/enhancedProvidersApi';

const ServicesTab = ({ language, onStatsChange }) => {
  const [services, setServices] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProvider, setFilterProvider] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [formData, setFormData] = useState({
    provider_id: '',
    service_name: '',
    service_type: '',
    description: '',
    endpoint_url: '',
    api_version: '',
    is_active: true,
    rate_limit: 100,
    timeout_seconds: 30,
    retry_attempts: 3,
    metadata: {}
  });

  const serviceTypes = [
    { value: 'chat', label: language === 'ar' ? 'محادثة' : 'Chat' },
    { value: 'completion', label: language === 'ar' ? 'إكمال النص' : 'Completion' },
    { value: 'embedding', label: language === 'ar' ? 'التضمين' : 'Embedding' },
    { value: 'image', label: language === 'ar' ? 'صور' : 'Image' },
    { value: 'audio', label: language === 'ar' ? 'صوت' : 'Audio' },
    { value: 'payment', label: language === 'ar' ? 'دفع' : 'Payment' },
    { value: 'storage', label: language === 'ar' ? 'تخزين' : 'Storage' },
    { value: 'other', label: language === 'ar' ? 'أخرى' : 'Other' }
  ];

  useEffect(() => {
    loadServices();
    loadProviders();
  }, []);

  const loadServices = async () => {
    try {
      setLoading(true);
      const response = await enhancedProvidersApi.getServices();
      if (response.success) {
        setServices(response.data || []);
        // Update stats if callback provided
        if (onStatsChange) {
          onStatsChange(prevStats => ({
            ...prevStats,
            services: {
              total: response.data?.length || 0,
              active: response.data?.filter(s => s.is_active).length || 0
            }
          }));
        }
      }
    } catch (error) {
      console.error('Error loading services:', error);
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

  const filteredServices = services.filter(service => {
    const matchesSearch = !searchTerm || 
      service.service_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesProvider = !filterProvider || service.provider_id === filterProvider;
    const matchesStatus = !filterStatus || 
      (filterStatus === 'active' && service.is_active) ||
      (filterStatus === 'inactive' && !service.is_active);
    
    return matchesSearch && matchesProvider && matchesStatus;
  });

  const handleAdd = () => {
    setFormData({
      provider_id: '',
      service_name: '',
      service_type: '',
      description: '',
      endpoint_url: '',
      api_version: '',
      is_active: true,
      rate_limit: 100,
      timeout_seconds: 30,
      retry_attempts: 3,
      metadata: {}
    });
    setShowAddModal(true);
  };

  const handleEdit = (service) => {
    setSelectedService(service);
    setFormData({ ...service });
    setShowEditModal(true);
  };

  const handleView = (service) => {
    setSelectedService(service);
    setShowViewModal(true);
  };

  const handleDelete = async (service) => {
    if (window.confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذه الخدمة؟' : 'Are you sure you want to delete this service?')) {
      try {
        const response = await enhancedProvidersApi.deleteService(service.id);
        if (response.success) {
          await loadServices();
        }
      } catch (error) {
        console.error('Error deleting service:', error);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = selectedService
        ? await enhancedProvidersApi.updateService(selectedService.id, formData)
        : await enhancedProvidersApi.createService(formData);
      
      if (response.success) {
        await loadServices();
        setShowAddModal(false);
        setShowEditModal(false);
        setSelectedService(null);
      }
    } catch (error) {
      console.error('Error saving service:', error);
    }
  };

  const getProviderName = (providerId) => {
    const provider = providers.find(p => p.id === providerId);
    return provider?.name || 'Unknown';
  };

  const getServiceTypeLabel = (type) => {
    const serviceType = serviceTypes.find(t => t.value === type);
    return serviceType?.label || type;
  };

  const getServiceTypeColor = (type) => {
    const colors = {
      chat: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      completion: 'bg-green-500/20 text-green-400 border-green-500/30',
      embedding: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      image: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
      audio: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      payment: 'bg-red-500/20 text-red-400 border-red-500/30',
      storage: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
      other: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    };
    return colors[type] || colors.other;
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
            {language === 'ar' ? 'اسم الخدمة' : 'Service Name'}
          </label>
          <input
            type="text"
            value={formData.service_name}
            onChange={(e) => setFormData({...formData, service_name: e.target.value})}
            className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {language === 'ar' ? 'نوع الخدمة' : 'Service Type'}
          </label>
          <select
            value={formData.service_type}
            onChange={(e) => setFormData({...formData, service_type: e.target.value})}
            className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
            required
          >
            <option value="">{language === 'ar' ? 'اختر النوع' : 'Select Type'}</option>
            {serviceTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {language === 'ar' ? 'إصدار API' : 'API Version'}
          </label>
          <input
            type="text"
            value={formData.api_version}
            onChange={(e) => setFormData({...formData, api_version: e.target.value})}
            className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
            placeholder="v1"
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
          {language === 'ar' ? 'رابط النقطة النهائية' : 'Endpoint URL'}
        </label>
        <input
          type="url"
          value={formData.endpoint_url}
          onChange={(e) => setFormData({...formData, endpoint_url: e.target.value})}
          className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
          placeholder="https://api.example.com/v1"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {language === 'ar' ? 'حد المعدل' : 'Rate Limit'}
          </label>
          <input
            type="number"
            value={formData.rate_limit}
            onChange={(e) => setFormData({...formData, rate_limit: parseInt(e.target.value)})}
            className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
            min="1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {language === 'ar' ? 'مهلة الانتظار (ثواني)' : 'Timeout (seconds)'}
          </label>
          <input
            type="number"
            value={formData.timeout_seconds}
            onChange={(e) => setFormData({...formData, timeout_seconds: parseInt(e.target.value)})}
            className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
            min="1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {language === 'ar' ? 'محاولات إعادة المحاولة' : 'Retry Attempts'}
          </label>
          <input
            type="number"
            value={formData.retry_attempts}
            onChange={(e) => setFormData({...formData, retry_attempts: parseInt(e.target.value)})}
            className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
            min="0"
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
          {selectedService ? (language === 'ar' ? 'تحديث' : 'Update') : (language === 'ar' ? 'إضافة' : 'Add')}
        </button>
      </div>
    </form>
  );

  const renderViewModal = () => {
    if (!selectedService) return null;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              {language === 'ar' ? 'المزود' : 'Provider'}
            </label>
            <p className="text-white">{getProviderName(selectedService.provider_id)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              {language === 'ar' ? 'اسم الخدمة' : 'Service Name'}
            </label>
            <p className="text-white">{selectedService.service_name}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              {language === 'ar' ? 'نوع الخدمة' : 'Service Type'}
            </label>
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getServiceTypeColor(selectedService.service_type)}`}>
              {getServiceTypeLabel(selectedService.service_type)}
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              {language === 'ar' ? 'الحالة' : 'Status'}
            </label>
            <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
              selectedService.is_active 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-red-500/20 text-red-400'
            }`}>
              {selectedService.is_active ? (
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

        {selectedService.description && (
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              {language === 'ar' ? 'الوصف' : 'Description'}
            </label>
            <p className="text-white">{selectedService.description}</p>
          </div>
        )}

        {selectedService.endpoint_url && (
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              {language === 'ar' ? 'رابط النقطة النهائية' : 'Endpoint URL'}
            </label>
            <p className="text-white font-mono text-sm bg-gray-800/50 p-2 rounded border">
              {selectedService.endpoint_url}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              {language === 'ar' ? 'حد المعدل' : 'Rate Limit'}
            </label>
            <p className="text-white">{selectedService.rate_limit}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              {language === 'ar' ? 'مهلة الانتظار' : 'Timeout'}
            </label>
            <p className="text-white">{selectedService.timeout_seconds}s</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              {language === 'ar' ? 'محاولات إعادة المحاولة' : 'Retry Attempts'}
            </label>
            <p className="text-white">{selectedService.retry_attempts}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              {language === 'ar' ? 'تاريخ الإنشاء' : 'Created At'}
            </label>
            <p className="text-white">{new Date(selectedService.created_at).toLocaleString()}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              {language === 'ar' ? 'تاريخ التحديث' : 'Updated At'}
            </label>
            <p className="text-white">{new Date(selectedService.updated_at).toLocaleString()}</p>
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
            {language === 'ar' ? 'إدارة الخدمات' : 'Services Management'}
          </h2>
          <p className="text-gray-400 mt-1">
            {language === 'ar' ? 'إدارة خدمات المزودين والتكوينات' : 'Manage provider services and configurations'}
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          {language === 'ar' ? 'إضافة خدمة' : 'Add Service'}
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={language === 'ar' ? 'البحث في الخدمات...' : 'Search services...'}
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
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
        >
          <option value="">{language === 'ar' ? 'جميع الحالات' : 'All Status'}</option>
          <option value="active">{language === 'ar' ? 'نشط' : 'Active'}</option>
          <option value="inactive">{language === 'ar' ? 'غير نشط' : 'Inactive'}</option>
        </select>
      </div>

      {/* Services Table */}
      <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {language === 'ar' ? 'الخدمة' : 'Service'}
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
                  {language === 'ar' ? 'الإعدادات' : 'Config'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {language === 'ar' ? 'الإجراءات' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {filteredServices.map((service) => (
                <tr key={service.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <ServerIcon className="w-5 h-5 text-purple-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-white">{service.service_name}</div>
                        {service.description && (
                          <div className="text-sm text-gray-400 truncate max-w-xs">{service.description}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {getProviderName(service.provider_id)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getServiceTypeColor(service.service_type)}`}>
                      {getServiceTypeLabel(service.service_type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                      service.is_active 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {service.is_active ? (
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
                    <div className="flex items-center space-x-2">
                      <span className="flex items-center">
                        <CogIcon className="w-4 h-4 mr-1" />
                        {service.rate_limit}/min
                      </span>
                      <span className="flex items-center">
                        <ClockIcon className="w-4 h-4 mr-1" />
                        {service.timeout_seconds}s
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleView(service)}
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(service)}
                        className="text-yellow-400 hover:text-yellow-300 transition-colors"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(service)}
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

        {filteredServices.length === 0 && (
          <div className="text-center py-12">
            <ServerIcon className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">
              {language === 'ar' ? 'لا توجد خدمات' : 'No services found'}
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      {renderModal(
        showAddModal,
        () => setShowAddModal(false),
        language === 'ar' ? 'إضافة خدمة جديدة' : 'Add New Service',
        renderForm()
      )}

      {renderModal(
        showEditModal,
        () => setShowEditModal(false),
        language === 'ar' ? 'تعديل الخدمة' : 'Edit Service',
        renderForm()
      )}

      {renderModal(
        showViewModal,
        () => setShowViewModal(false),
        language === 'ar' ? 'تفاصيل الخدمة' : 'Service Details',
        renderViewModal()
      )}
    </div>
  );
};

export default ServicesTab; 