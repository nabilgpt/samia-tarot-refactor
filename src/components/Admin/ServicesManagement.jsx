import React, { useState, useEffect } from 'react';
import { Plus, Star, Users, Edit, Trash2, Filter, Search, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import AddServiceModal from './AddServiceModal';

/**
 * 🌟 SERVICES MANAGEMENT - Admin Dashboard Component
 * 
 * Features:
 * ✅ Complete services list with VIP indicators
 * ✅ Add Service integration (no mocks)
 * ✅ Real-time updates after service creation
 * ✅ Filtering and search functionality
 * ✅ Bilingual support
 * ✅ Cosmic theme consistency
 */

const ServicesManagement = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  // ===================================
  // STATE MANAGEMENT
  // ===================================

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    is_vip: '',
    is_active: '',
    reader_id: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  // ===================================
  // DATA LOADING
  // ===================================

  useEffect(() => {
    loadServices();
  }, [filters, pagination.page]);

  const loadServices = async () => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('⚠️ [ServicesManagement] No authentication token available, skipping load');
        return;
      }

      // Build query parameters
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });

      // Add filters
      if (filters.type) params.append('type', filters.type);
      if (filters.is_vip !== '') params.append('is_vip', filters.is_vip);
      if (filters.is_active !== '') params.append('is_active', filters.is_active);
      if (filters.reader_id) params.append('reader_id', filters.reader_id);

      const response = await fetch(`/api/services/admin?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Filter by search term locally for real-time search
        let filteredServices = data.data || [];
        if (filters.search) {
          const searchTerm = filters.search.toLowerCase();
          filteredServices = filteredServices.filter(service => 
            service.name_ar.toLowerCase().includes(searchTerm) ||
            service.name_en.toLowerCase().includes(searchTerm) ||
            service.reader_name?.toLowerCase().includes(searchTerm)
          );
        }

        setServices(filteredServices);
        
        if (data.pagination) {
          setPagination(prev => ({
            ...prev,
            total: data.pagination.total,
            pages: data.pagination.pages
          }));
        }

        console.log(`✅ Loaded ${filteredServices.length} services`);
      } else {
        throw new Error(data.error || 'Failed to load services');
      }

    } catch (error) {
      console.error('❌ Error loading services:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ===================================
  // EVENT HANDLERS
  // ===================================

  const handleAddService = () => {
    setShowAddModal(true);
  };

  const handleServiceAdded = (newService) => {
    // Add new service to the list
    setServices(prev => [newService, ...prev]);
    console.log('✅ Service added to list:', newService);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Reset to first page when filtering
    setPagination(prev => ({
      ...prev,
      page: 1
    }));
  };

  const handleRefresh = () => {
    loadServices();
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const getServiceTypeLabel = (type) => {
    const typeLabels = {
      tarot: { ar: 'قراءة التاروت', en: 'Tarot Reading' },
      coffee: { ar: 'قراءة القهوة', en: 'Coffee Reading' },
      dream: { ar: 'تفسير الأحلام', en: 'Dream Interpretation' },
      numerology: { ar: 'علم الأرقام', en: 'Numerology' },
      astrology: { ar: 'علم التنجيم', en: 'Astrology' },
      general_reading: { ar: 'قراءة عامة', en: 'General Reading' },
      relationship: { ar: 'قراءة العلاقات', en: 'Relationship Reading' },
      career: { ar: 'إرشاد مهني', en: 'Career Guidance' },
      spiritual: { ar: 'إرشاد روحي', en: 'Spiritual Guidance' }
    };
    
    return typeLabels[type] ? typeLabels[type][isRTL ? 'ar' : 'en'] : type;
  };

  return (
    <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      
      {/* ===== HEADER ===== */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {isRTL ? 'إدارة الخدمات' : 'Services Management'}
          </h2>
          <p className="text-purple-300">
            {isRTL ? 'إدارة الخدمات العادية و VIP مع تحديد القراء' : 'Manage regular and VIP services with reader assignment'}
          </p>
        </div>

        <button
          onClick={handleAddService}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl"
        >
          <Plus className="w-5 h-5" />
          {isRTL ? 'إضافة خدمة' : 'Add Service'}
        </button>
      </div>

      {/* ===== FILTERS & SEARCH ===== */}
      <div className="bg-white/5 backdrop-blur-sm border border-purple-300/20 rounded-xl p-6">
        <div className="grid md:grid-cols-4 gap-4 mb-4">
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-purple-300" />
            <input
              type="text"
              placeholder={isRTL ? 'البحث في الخدمات...' : 'Search services...'}
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/10 border border-purple-300/30 rounded-lg text-white placeholder-purple-300/60 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Type Filter */}
          <select
            value={filters.type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            className="px-4 py-2 bg-white/10 border border-purple-300/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="" className="bg-gray-800">
              {isRTL ? 'جميع الأنواع' : 'All Types'}
            </option>
            <option value="tarot" className="bg-gray-800">{getServiceTypeLabel('tarot')}</option>
            <option value="coffee" className="bg-gray-800">{getServiceTypeLabel('coffee')}</option>
            <option value="dream" className="bg-gray-800">{getServiceTypeLabel('dream')}</option>
            <option value="numerology" className="bg-gray-800">{getServiceTypeLabel('numerology')}</option>
            <option value="astrology" className="bg-gray-800">{getServiceTypeLabel('astrology')}</option>
          </select>

          {/* VIP Filter */}
          <select
            value={filters.is_vip}
            onChange={(e) => handleFilterChange('is_vip', e.target.value)}
            className="px-4 py-2 bg-white/10 border border-purple-300/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="" className="bg-gray-800">
              {isRTL ? 'VIP & عادية' : 'VIP & Regular'}
            </option>
            <option value="true" className="bg-gray-800">
              {isRTL ? 'VIP فقط' : 'VIP Only'}
            </option>
            <option value="false" className="bg-gray-800">
              {isRTL ? 'عادية فقط' : 'Regular Only'}
            </option>
          </select>

          {/* Status Filter */}
          <select
            value={filters.is_active}
            onChange={(e) => handleFilterChange('is_active', e.target.value)}
            className="px-4 py-2 bg-white/10 border border-purple-300/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="" className="bg-gray-800">
              {isRTL ? 'جميع الحالات' : 'All Status'}
            </option>
            <option value="true" className="bg-gray-800">
              {isRTL ? 'نشط' : 'Active'}
            </option>
            <option value="false" className="bg-gray-800">
              {isRTL ? 'غير نشط' : 'Inactive'}
            </option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-purple-300">
            {isRTL 
              ? `عرض ${services.length} من ${pagination.total} خدمة`
              : `Showing ${services.length} of ${pagination.total} services`
            }
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600/50 text-white rounded-lg hover:bg-purple-600/70 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {isRTL ? 'تحديث' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ===== ERROR MESSAGE ===== */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 text-red-300">
          {error}
        </div>
      )}

      {/* ===== SERVICES LIST ===== */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
          <span className="ml-3 text-purple-300">
            {isRTL ? 'جاري التحميل...' : 'Loading...'}
          </span>
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-purple-300/50 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            {isRTL ? 'لا توجد خدمات' : 'No Services Found'}
          </h3>
          <p className="text-purple-300">
            {isRTL ? 'قم بإضافة خدمة جديدة للبدء' : 'Add a new service to get started'}
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {services.map((service) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 backdrop-blur-sm border border-purple-300/20 rounded-xl p-6 hover:bg-white/10 transition-all"
            >
              <div className="flex items-start justify-between">
                
                {/* Service Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-xl font-semibold text-white">
                      {isRTL ? service.name_ar : service.name_en}
                    </h3>
                    
                    {/* VIP Badge */}
                    {service.is_vip && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium rounded-full">
                        <Star className="w-3 h-3" />
                        VIP
                      </span>
                    )}
                    
                    {/* Status Badge */}
                    <span className={`
                      inline-flex items-center px-2 py-1 text-xs font-medium rounded-full
                      ${service.is_active 
                        ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                        : 'bg-red-500/20 text-red-300 border border-red-500/30'
                      }
                    `}>
                      {service.is_active ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'غير نشط' : 'Inactive')}
                    </span>
                  </div>

                  <p className="text-purple-300 mb-4 line-clamp-2">
                    {isRTL ? service.description_ar : service.description_en}
                  </p>

                  <div className="grid md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-purple-300">{isRTL ? 'النوع:' : 'Type:'}</span>
                      <span className="text-white ml-2">{getServiceTypeLabel(service.type)}</span>
                    </div>
                    <div>
                      <span className="text-purple-300">{isRTL ? 'السعر:' : 'Price:'}</span>
                      <span className="text-white ml-2 font-semibold">{formatPrice(service.price)}</span>
                    </div>
                    <div>
                      <span className="text-purple-300">{isRTL ? 'المدة:' : 'Duration:'}</span>
                      <span className="text-white ml-2">{service.duration_minutes} {isRTL ? 'دقيقة' : 'min'}</span>
                    </div>
                    <div>
                      <span className="text-purple-300">{isRTL ? 'القارئ:' : 'Reader:'}</span>
                      <span className="text-white ml-2">{service.reader_name || service.reader_display_name}</span>
                    </div>
                  </div>

                  {/* Statistics */}
                  {(service.total_bookings > 0 || service.total_revenue > 0) && (
                    <div className="flex items-center gap-6 mt-4 pt-4 border-t border-purple-300/20">
                      <div className="text-sm">
                        <span className="text-purple-300">{isRTL ? 'الحجوزات:' : 'Bookings:'}</span>
                        <span className="text-white ml-2 font-semibold">{service.total_bookings || 0}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-purple-300">{isRTL ? 'الإيرادات:' : 'Revenue:'}</span>
                        <span className="text-white ml-2 font-semibold">{formatPrice(service.total_revenue || 0)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  <button
                    className="p-2 text-purple-300 hover:text-white hover:bg-purple-600/50 rounded-lg transition-colors"
                    title={isRTL ? 'تعديل' : 'Edit'}
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    className="p-2 text-red-300 hover:text-white hover:bg-red-600/50 rounded-lg transition-colors"
                    title={isRTL ? 'حذف' : 'Delete'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ===== PAGINATION ===== */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
            disabled={pagination.page === 1}
            className="px-4 py-2 bg-purple-600/50 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-600/70 transition-colors"
          >
            {isRTL ? 'السابق' : 'Previous'}
          </button>
          
          <span className="px-4 py-2 text-purple-300">
            {isRTL 
              ? `صفحة ${pagination.page} من ${pagination.pages}`
              : `Page ${pagination.page} of ${pagination.pages}`
            }
          </span>
          
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
            disabled={pagination.page === pagination.pages}
            className="px-4 py-2 bg-purple-600/50 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-600/70 transition-colors"
          >
            {isRTL ? 'التالي' : 'Next'}
          </button>
        </div>
      )}

      {/* ===== ADD SERVICE MODAL ===== */}
      <AddServiceModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onServiceAdded={handleServiceAdded}
      />
    </div>
  );
};

export default ServicesManagement;
