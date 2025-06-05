import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  ToggleLeft,
  DollarSign,
  Clock,
  Star,
  Eye,
  EyeOff,
  Users,
  Search,
  Filter,
  Save,
  X
} from 'lucide-react';
import { useUI } from '../../../context/UIContext';

const ServicesManagement = () => {
  const { t } = useTranslation();
  const { language, showSuccess, showError } = useUI();
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState([]);
  const [readers, setReaders] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.1,
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12
      }
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Mock data for demonstration
      setServices([
        {
          id: '1',
          name: language === 'ar' ? 'قراءة التاروت' : 'Tarot Reading',
          name_ar: 'قراءة التاروت',
          name_en: 'Tarot Reading',
          type: 'tarot',
          description: language === 'ar' ? 'قراءة شاملة لأوراق التاروت' : 'Comprehensive tarot card reading',
          description_ar: 'قراءة شاملة لأوراق التاروت',
          description_en: 'Comprehensive tarot card reading',
          price: 50,
          duration_minutes: 30,
          is_active: true,
          assigned_readers: 12,
          total_bookings: 245,
          avg_rating: 4.8,
          created_at: '2024-01-10T10:00:00Z'
        },
        {
          id: '2',
          name: language === 'ar' ? 'قراءة الكف' : 'Palm Reading',
          name_ar: 'قراءة الكف',
          name_en: 'Palm Reading',
          type: 'palm',
          description: language === 'ar' ? 'تحليل خطوط اليد' : 'Hand lines analysis',
          description_ar: 'تحليل خطوط اليد',
          description_en: 'Hand lines analysis',
          price: 40,
          duration_minutes: 25,
          is_active: true,
          assigned_readers: 8,
          total_bookings: 189,
          avg_rating: 4.6,
          created_at: '2024-01-12T14:30:00Z'
        },
        {
          id: '3',
          name: language === 'ar' ? 'قراءة الفنجان' : 'Coffee Cup Reading',
          name_ar: 'قراءة الفنجان',
          name_en: 'Coffee Cup Reading',
          type: 'coffee',
          description: language === 'ar' ? 'قراءة الطالع من الفنجان' : 'Fortune telling from coffee grounds',
          description_ar: 'قراءة الطالع من الفنجان',
          description_en: 'Fortune telling from coffee grounds',
          price: 35,
          duration_minutes: 20,
          is_active: false,
          assigned_readers: 5,
          total_bookings: 67,
          avg_rating: 4.3,
          created_at: '2024-01-15T09:15:00Z'
        }
      ]);

      setReaders([
        { id: '1', name: 'Sarah Ahmed', specialties: ['tarot', 'palm'] },
        { id: '2', name: 'Mohamed Ali', specialties: ['coffee', 'tarot'] },
        { id: '3', name: 'Fatima Hassan', specialties: ['palm', 'coffee'] }
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      showError(language === 'ar' ? 'فشل في تحميل البيانات' : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleServiceToggle = async (serviceId, currentStatus) => {
    try {
      // API call to toggle service status
      setServices(services.map(service => 
        service.id === serviceId ? { ...service, is_active: !currentStatus } : service
      ));
      showSuccess(
        language === 'ar' 
          ? !currentStatus ? 'تم تفعيل الخدمة' : 'تم إلغاء تفعيل الخدمة'
          : !currentStatus ? 'Service activated' : 'Service deactivated'
      );
    } catch (error) {
      showError(language === 'ar' ? 'فشل في تحديث حالة الخدمة' : 'Failed to update service status');
    }
  };

  const handleServiceDelete = async (serviceId) => {
    if (window.confirm(language === 'ar' ? 'هل تريد حذف هذه الخدمة؟' : 'Are you sure you want to delete this service?')) {
      try {
        // API call to delete service
        setServices(services.filter(service => service.id !== serviceId));
        showSuccess(language === 'ar' ? 'تم حذف الخدمة بنجاح' : 'Service deleted successfully');
      } catch (error) {
        showError(language === 'ar' ? 'فشل في حذف الخدمة' : 'Failed to delete service');
      }
    }
  };

  const getServiceTypeIcon = (type) => {
    switch (type) {
      case 'tarot': return '🔮';
      case 'palm': return '🤲';
      case 'coffee': return '☕';
      case 'astrology': return '⭐';
      case 'numerology': return '🔢';
      default: return '✨';
    }
  };

  const getServiceTypeColor = (type) => {
    switch (type) {
      case 'tarot': return 'from-purple-500 to-indigo-500';
      case 'palm': return 'from-pink-500 to-rose-500';
      case 'coffee': return 'from-amber-500 to-orange-500';
      case 'astrology': return 'from-blue-500 to-cyan-500';
      case 'numerology': return 'from-green-500 to-emerald-500';
      default: return 'from-gray-500 to-slate-500';
    }
  };

  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || service.type === filterType;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && service.is_active) ||
                         (filterStatus === 'inactive' && !service.is_active);
    
    return matchesSearch && matchesType && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400"></div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      >
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-green-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
            {language === 'ar' ? 'إدارة الخدمات' : 'Services Management'}
          </h2>
          <p className="text-gray-400 mt-1">
            {language === 'ar' ? 'إدارة جميع الخدمات المتاحة والقراء المخصصين' : 'Manage all available services and assigned readers'}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-colors shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'ar' ? 'إضافة خدمة' : 'Add Service'}</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        variants={itemVariants}
        className="glassmorphism rounded-2xl p-6 border border-white/10"
      >
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={language === 'ar' ? 'البحث في الخدمات...' : 'Search services...'}
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gold-400/50 transition-colors"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-4">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-gold-400/50 transition-colors"
            >
              <option value="all">{language === 'ar' ? 'كل الأنواع' : 'All Types'}</option>
              <option value="tarot">{language === 'ar' ? 'تاروت' : 'Tarot'}</option>
              <option value="palm">{language === 'ar' ? 'كف' : 'Palm'}</option>
              <option value="coffee">{language === 'ar' ? 'فنجان' : 'Coffee'}</option>
              <option value="astrology">{language === 'ar' ? 'فلك' : 'Astrology'}</option>
              <option value="numerology">{language === 'ar' ? 'أرقام' : 'Numerology'}</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-gold-400/50 transition-colors"
            >
              <option value="all">{language === 'ar' ? 'كل الحالات' : 'All Status'}</option>
              <option value="active">{language === 'ar' ? 'نشط' : 'Active'}</option>
              <option value="inactive">{language === 'ar' ? 'غير نشط' : 'Inactive'}</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-gray-400 text-sm">
            {language === 'ar' 
              ? `عرض ${filteredServices.length} من ${services.length} خدمة`
              : `Showing ${filteredServices.length} of ${services.length} services`
            }
          </p>
        </div>
      </motion.div>

      {/* Services Grid */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
      >
        {filteredServices.map((service) => (
          <motion.div
            key={service.id}
            variants={itemVariants}
            whileHover={{ scale: 1.02, y: -5 }}
            className="glassmorphism rounded-2xl p-6 border border-white/10 hover:border-gold-400/30 transition-all duration-300 group overflow-hidden relative"
          >
            {/* Background gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${getServiceTypeColor(service.type)} opacity-5 group-hover:opacity-10 transition-opacity duration-300`}></div>
            
            <div className="relative z-10">
              {/* Service Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 bg-gradient-to-br ${getServiceTypeColor(service.type)} rounded-xl flex items-center justify-center shadow-lg`}>
                    <span className="text-2xl">{getServiceTypeIcon(service.type)}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white group-hover:text-gold-300 transition-colors">
                      {service.name}
                    </h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className={`w-2 h-2 rounded-full ${service.is_active ? 'bg-green-400' : 'bg-red-400'}`}></div>
                      <span className={`text-sm ${service.is_active ? 'text-green-400' : 'text-red-400'}`}>
                        {service.is_active ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'غير نشط' : 'Inactive')}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleServiceToggle(service.id, service.is_active)}
                    className={`p-2 rounded-lg transition-colors ${
                      service.is_active 
                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
                        : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    }`}
                  >
                    {service.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setEditingService(service)}
                    className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleServiceDelete(service.id)}
                    className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Service Description */}
              <p className="text-gray-400 text-sm mb-4">{service.description}</p>

              {/* Service Details */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-gold-400" />
                  <span className="text-white font-semibold">${service.price}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span className="text-white">{service.duration_minutes}min</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-green-400" />
                  <span className="text-white">{service.assigned_readers} {language === 'ar' ? 'قارئ' : 'readers'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span className="text-white">{service.avg_rating}</span>
                </div>
              </div>

              {/* Statistics */}
              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <p className="text-lg font-semibold text-white">{service.total_bookings}</p>
                    <p className="text-xs text-gray-400">{language === 'ar' ? 'حجز' : 'Bookings'}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-green-400">
                      ${(service.total_bookings * service.price).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">{language === 'ar' ? 'إيرادات' : 'Revenue'}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-blue-400">
                      {Math.round(service.total_bookings / service.assigned_readers)}
                    </p>
                    <p className="text-xs text-gray-400">{language === 'ar' ? 'متوسط/قارئ' : 'Avg/Reader'}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Service Stats Summary */}
      <motion.div
        variants={itemVariants}
        className="glassmorphism rounded-2xl p-8 border border-white/10"
      >
        <h3 className="text-2xl font-bold text-gold-300 mb-6">
          {language === 'ar' ? 'إحصائيات الخدمات' : 'Service Statistics'}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Settings className="w-8 h-8 text-white" />
            </div>
            <p className="text-2xl font-bold text-white">{services.length}</p>
            <p className="text-gray-400 text-sm">{language === 'ar' ? 'إجمالي الخدمات' : 'Total Services'}</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Eye className="w-8 h-8 text-white" />
            </div>
            <p className="text-2xl font-bold text-white">{services.filter(s => s.is_active).length}</p>
            <p className="text-gray-400 text-sm">{language === 'ar' ? 'خدمات نشطة' : 'Active Services'}</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Users className="w-8 h-8 text-white" />
            </div>
            <p className="text-2xl font-bold text-white">{services.reduce((sum, s) => sum + s.assigned_readers, 0)}</p>
            <p className="text-gray-400 text-sm">{language === 'ar' ? 'قراء مخصصون' : 'Assigned Readers'}</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-3">
              <DollarSign className="w-8 h-8 text-white" />
            </div>
            <p className="text-2xl font-bold text-white">
              ${Math.round(services.reduce((sum, s) => sum + (s.total_bookings * s.price), 0) / 1000)}K
            </p>
            <p className="text-gray-400 text-sm">{language === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue'}</p>
          </div>
        </div>
      </motion.div>

      {/* Add/Edit Service Modal */}
      <AnimatePresence>
        {(showAddModal || editingService) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowAddModal(false);
              setEditingService(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glassmorphism rounded-2xl p-8 max-w-2xl w-full border border-white/20 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gold-300">
                  {editingService 
                    ? (language === 'ar' ? 'تعديل الخدمة' : 'Edit Service')
                    : (language === 'ar' ? 'إضافة خدمة جديدة' : 'Add New Service')
                  }
                </h3>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingService(null);
                  }}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {language === 'ar' ? 'اسم الخدمة (عربي)' : 'Service Name (Arabic)'}
                  </label>
                  <input
                    type="text"
                    defaultValue={editingService?.name_ar || ''}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-gold-400/50 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {language === 'ar' ? 'اسم الخدمة (إنجليزي)' : 'Service Name (English)'}
                  </label>
                  <input
                    type="text"
                    defaultValue={editingService?.name_en || ''}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-gold-400/50 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {language === 'ar' ? 'نوع الخدمة' : 'Service Type'}
                  </label>
                  <select
                    defaultValue={editingService?.type || 'tarot'}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-gold-400/50 transition-colors"
                  >
                    <option value="tarot">{language === 'ar' ? 'تاروت' : 'Tarot'}</option>
                    <option value="palm">{language === 'ar' ? 'كف' : 'Palm'}</option>
                    <option value="coffee">{language === 'ar' ? 'فنجان' : 'Coffee'}</option>
                    <option value="astrology">{language === 'ar' ? 'فلك' : 'Astrology'}</option>
                    <option value="numerology">{language === 'ar' ? 'أرقام' : 'Numerology'}</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {language === 'ar' ? 'السعر ($)' : 'Price ($)'}
                  </label>
                  <input
                    type="number"
                    defaultValue={editingService?.price || ''}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-gold-400/50 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {language === 'ar' ? 'المدة (دقيقة)' : 'Duration (minutes)'}
                  </label>
                  <input
                    type="number"
                    defaultValue={editingService?.duration_minutes || ''}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-gold-400/50 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {language === 'ar' ? 'الحالة' : 'Status'}
                  </label>
                  <select
                    defaultValue={editingService?.is_active ? 'active' : 'inactive'}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-gold-400/50 transition-colors"
                  >
                    <option value="active">{language === 'ar' ? 'نشط' : 'Active'}</option>
                    <option value="inactive">{language === 'ar' ? 'غير نشط' : 'Inactive'}</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {language === 'ar' ? 'الوصف (عربي)' : 'Description (Arabic)'}
                </label>
                <textarea
                  rows={3}
                  defaultValue={editingService?.description_ar || ''}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-gold-400/50 transition-colors resize-none"
                />
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {language === 'ar' ? 'الوصف (إنجليزي)' : 'Description (English)'}
                </label>
                <textarea
                  rows={3}
                  defaultValue={editingService?.description_en || ''}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-gold-400/50 transition-colors resize-none"
                />
              </div>
              
              <div className="flex items-center justify-end space-x-4 mt-8">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingService(null);
                  }}
                  className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-gold-500 to-gold-600 text-gray-900 font-medium rounded-lg hover:from-gold-600 hover:to-gold-700 transition-colors">
                  <Save className="w-4 h-4" />
                  <span>{language === 'ar' ? 'حفظ' : 'Save'}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ServicesManagement; 