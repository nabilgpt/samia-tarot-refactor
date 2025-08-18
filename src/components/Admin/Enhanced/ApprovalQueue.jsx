import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  User, 
  Calendar,
  FileText,
  MessageSquare,
  AlertTriangle,
  Filter,
  Search,
  Download,
  Star,
  MapPin,
  Phone,
  Mail,
  Edit3,
  Save,
  X
} from 'lucide-react';
import { useUI } from '../../../context/UIContext';
import api from '../../../services/frontendApi.js';
import WorkingHoursApprovalQueue from '../../admin/WorkingHoursApprovalQueue';
import SpreadApprovalTab from '../SpreadApprovalTab';
import SpreadVisualEditor from '../SpreadVisualEditor';

const ApprovalQueue = () => {
  const { t } = useTranslation();
  const { language, showSuccess, showError } = useUI();
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [spreadApprovals, setSpreadApprovals] = useState([]);
  const [filteredSpreadApprovals, setFilteredSpreadApprovals] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSpreadEditor, setShowSpreadEditor] = useState(false);
  const [approvalReason, setApprovalReason] = useState('');

  // Tabs configuration
  const tabs = [
    {
      id: 'general',
      name: language === 'ar' ? 'الموافقات العامة' : 'General Approvals',
      icon: Shield,
      description: language === 'ar' ? 'طلبات تسجيل القراء وتحديث الملفات' : 'Reader registrations and profile updates'
    },
    {
      id: 'spreads',
      name: language === 'ar' ? 'انتشارات التاروت' : 'Tarot Spreads',
      icon: Star,
      description: language === 'ar' ? 'الموافقة على انتشارات التاروت المخصصة' : 'Custom tarot spread approvals'
    },
    {
      id: 'working-hours',
      name: language === 'ar' ? 'ساعات العمل' : 'Working Hours',
      icon: Clock,
      description: language === 'ar' ? 'طلبات تغيير ساعات العمل' : 'Working hours change requests'
    }
  ];

  // Helper functions
  const getRequestTypeIcon = (type) => {
    switch (type) {
      case 'reader_registration': return User;
      case 'profile_update': return User;
      case 'service_addition': return Calendar;
      case 'account_reactivation': return Shield;
      default: return User;
    }
  };

  const getRequestTypeLabel = (type) => {
    switch (type) {
      case 'reader_registration': 
        return language === 'ar' ? 'تسجيل قارئ' : 'Reader Registration';
      case 'profile_update': 
        return language === 'ar' ? 'تحديث الملف' : 'Profile Update';
      case 'service_addition': 
        return language === 'ar' ? 'إضافة خدمة' : 'Service Addition';
      case 'account_reactivation': 
        return language === 'ar' ? 'إعادة تفعيل الحساب' : 'Account Reactivation';
      default: 
        return type;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-400 bg-red-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20';
      case 'low': return 'text-green-400 bg-green-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-yellow-400 bg-yellow-500/20';
      case 'approved': return 'text-green-400 bg-green-500/20';
      case 'rejected': return 'text-red-400 bg-red-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

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
    console.log('🔄 [DEBUG] Tab changed to:', activeTab);
    if (activeTab === 'general') {
      loadRequests();
    } else if (activeTab === 'spreads') {
      console.log('🎯 [DEBUG] Loading spreads for tab switch');
      loadSpreadApprovals();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'general') {
      filterRequests();
    } else if (activeTab === 'spreads') {
      filterSpreadApprovals();
    }
  }, [requests, spreadApprovals, filter, searchTerm, activeTab]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await api.getApprovalRequests();
      
      if (response.success) {
        setRequests(response.data);
      } else {
        console.error('Failed to load approval requests:', response.error);
        setRequests([]);
      }
    } catch (error) {
      console.error('Error loading requests:', error);
      showError(language === 'ar' ? 'فشل في تحميل الطلبات' : 'Failed to load requests');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSpreadApprovals = async () => {
    try {
      console.log('🧪 [DEBUG] loadSpreadApprovals called');
      setLoading(true);
      const response = await api.getSpreadApprovals();
      console.log('📊 [DEBUG] Spread API Response:', response);
      
      if (response.success) {
        console.log('✅ [DEBUG] Setting spreadApprovals:', response.data);
        setSpreadApprovals(response.data);
      } else {
        console.error('❌ [DEBUG] Failed to load spread approvals:', response.error);
        setSpreadApprovals([]);
      }
    } catch (error) {
      console.error('💥 [DEBUG] Error loading spread approvals:', error);
      showError(language === 'ar' ? 'فشل في تحميل موافقات الانتشارات' : 'Failed to load spread approvals');
      setSpreadApprovals([]);
    } finally {
      setLoading(false);
    }
  };

  const filterRequests = () => {
    let filtered = requests;

    // Status filter
    if (filter !== 'all') {
      filtered = filtered.filter(request => request.status === filter);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(request =>
        (request.requested_by_profile?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         request.requested_by_profile?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         request.requested_by_profile?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         request.type.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredRequests(filtered);
  };

  const filterSpreadApprovals = () => {
    let filtered = spreadApprovals;

    // Status filter
    if (filter !== 'all') {
      filtered = filtered.filter(spread => spread.status === filter);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(spread =>
        (spread.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         spread.creator?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         spread.creator?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         spread.creator?.email?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredSpreadApprovals(filtered);
  };

  const handleApproval = async (requestId, action, reason = '') => {
    try {
      setLoading(true);
      
      const response = await api.processApprovalRequest(requestId, action, reason);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to process approval');
      }
      
      // Update request status in state
      setRequests(prev => prev.map(req => 
        req.id === requestId 
          ? { ...req, status: action, approval_reason: reason }
          : req
      ));
      
      showSuccess(
        language === 'ar' 
          ? `تم ${action === 'approved' ? 'قبول' : 'رفض'} الطلب بنجاح`
          : `Request ${action} successfully`
      );
      
      setShowDetailModal(false);
      setSelectedRequest(null);
      setApprovalReason('');
      
    } catch (error) {
      console.error('Error processing approval:', error);
      showError(language === 'ar' ? 'فشل في معالجة الطلب' : 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  const handleSpreadApproval = async (spreadId, action, reason = '') => {
    try {
      console.log('🧪 [DEBUG] api.processSpreadApproval called:', { spreadId, action, reason });
      setLoading(true);
      const response = await api.processSpreadApproval(spreadId, action, reason);
      console.log('📊 [DEBUG] AdminAPI process response:', response);
      
      if (response.success) {
        console.log('✅ [DEBUG] AdminAPI process success');
        showSuccess(language === 'ar' ? 
          `تم ${action === 'approved' ? 'قبول' : 'رفض'} الانتشار بنجاح` : 
          `Spread ${action} successfully`
        );
        
        // Refresh the spreads list
        loadSpreadApprovals();
        setShowDetailModal(false);
      } else {
        console.error('❌ [DEBUG] AdminAPI process failed:', response.error);
        showError(language === 'ar' ? 'فشل في معالجة موافقة الانتشار' : 'Failed to process spread approval');
      }
    } catch (error) {
      console.error('Error processing spread approval:', error);
      showError(language === 'ar' ? 'فشل في معالجة موافقة الانتشار' : 'Failed to process spread approval');
    } finally {
      setLoading(false);
    }
  };

  const handleSpreadSave = async (updatedSpread) => {
    try {
      setLoading(true);
      console.log('💾 [DEBUG] Saving spread updates:', updatedSpread);
      
      // Update the spread via API
      const response = await api.processSpreadApproval(updatedSpread.id, 'update', '', updatedSpread);
      
      if (response.success) {
        showSuccess(language === 'ar' ? 'تم حفظ التغييرات بنجاح' : 'Changes saved successfully');
        
        // Update the local state
        setSelectedRequest(updatedSpread);
        
        // Refresh the spreads list
        loadSpreadApprovals();
        
        // Close the editor
        setShowSpreadEditor(false);
      } else {
        showError(language === 'ar' ? 'فشل في حفظ التغييرات' : 'Failed to save changes');
      }
    } catch (error) {
      console.error('Error saving spread:', error);
      showError(language === 'ar' ? 'فشل في حفظ التغييرات' : 'Failed to save changes');
    } finally {
      setLoading(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return renderGeneralApprovals();
      case 'spreads':
        return renderSpreadApprovals();
      case 'working-hours':
        return <WorkingHoursApprovalQueue />;
      default:
        return renderGeneralApprovals();
    }
  };

  const renderSpreadApprovals = () => {
    console.log('🖼️ [DEBUG] renderSpreadApprovals called');
    console.log('📊 [DEBUG] filteredSpreadApprovals:', filteredSpreadApprovals);
    console.log('📊 [DEBUG] spreadApprovals state:', spreadApprovals);
    
    return (
      <motion.div
        variants={containerVariants}
        className="space-y-4"
      >
        {filteredSpreadApprovals.length === 0 ? (
          <div className="text-center py-12">
            <Star className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">
              {language === 'ar' ? 'لا توجد انتشارات بانتظار الموافقة' : 'No Pending Spreads'}
            </h3>
            <p className="text-gray-400">
              {language === 'ar' ? 'جميع انتشارات التاروت تمت مراجعتها' : 'All tarot spreads have been reviewed'}
            </p>
          </div>
        ) : (
          filteredSpreadApprovals.map((spread) => (
            <motion.div
              key={spread.id}
              variants={itemVariants}
              className="glassmorphism rounded-2xl p-6 border border-white/10 hover:border-gold-400/30 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                    <Star className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {spread.name || 'Untitled Spread'}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      {language === 'ar' ? 'انتشار تاروت مخصص' : 'Custom Tarot Spread'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(spread.status)}`}>
                    {spread.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm">
                <div className="flex items-center text-gray-400">
                  <User className="w-4 h-4 mr-2" />
                  {spread.creator?.first_name} {spread.creator?.last_name}
                </div>
                <div className="flex items-center text-gray-400">
                  <Mail className="w-4 h-4 mr-2" />
                  {spread.creator?.email}
                </div>
                <div className="flex items-center text-gray-400">
                  <Calendar className="w-4 h-4 mr-2" />
                  {new Date(spread.created_at).toLocaleDateString()}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-gray-400 text-sm">
                  {language === 'ar' ? 'تم إنشاؤها في' : 'Created on'}: {new Date(spread.created_at).toLocaleDateString()}
                </p>
                
                <div className="flex items-center space-x-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setSelectedRequest(spread);
                      setShowDetailModal(true);
                    }}
                    className="flex items-center space-x-2 px-3 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    <span>{language === 'ar' ? 'عرض التفاصيل' : 'View Details'}</span>
                  </motion.button>

                  {spread.status === 'pending' && (
                    <>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSpreadApproval(spread.id, 'approved', '')}
                        className="flex items-center space-x-2 px-3 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/30 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>{language === 'ar' ? 'قبول' : 'Approve'}</span>
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSpreadApproval(spread.id, 'rejected', '')}
                        className="flex items-center space-x-2 px-3 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>{language === 'ar' ? 'رفض' : 'Reject'}</span>
                      </motion.button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </motion.div>
    );
  };

  const renderGeneralApprovals = () => {
    // ... existing general approvals content ...
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-white">
              {language === 'ar' ? 'الموافقات العامة' : 'General Approvals'}
            </h3>
            <p className="text-gray-400 mt-1">
              {language === 'ar' ? 'إدارة طلبات التسجيل وتحديث الملفات' : 'Manage registration and profile update requests'}
            </p>
          </div>
        </div>

        {/* Rest of the existing general approvals content */}
        {/* This would include all the existing approval queue functionality */}
        <div className="text-center py-12">
          <Shield className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-white mb-2">General Approvals</h3>
          <p className="text-gray-400">
            Reader registration and profile update requests will appear here.
          </p>
        </div>
      </div>
    );
  };

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
      className="
        h-full 
        flex flex-col 
        min-h-0
        overflow-hidden
      "
    >
      {/* Header - Fixed */}
      <motion.div
        variants={itemVariants}
        className="
          flex-shrink-0 
          flex flex-col lg:flex-row lg:items-center lg:justify-between 
          gap-4 mb-6
          px-2
        "
      >
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent">
            {language === 'ar' ? 'طابور الموافقات' : 'Approval Queue'}
          </h2>
          <p className="text-gray-400 mt-1">
            {language === 'ar' ? 'مراجعة وموافقة طلبات القراء والتحديثات' : 'Review and approve reader requests and updates'}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>{language === 'ar' ? 'تصدير التقرير' : 'Export Report'}</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Scrollable Content Area */}
      <div className="
        flex-1 
        min-h-0 
        overflow-y-auto overflow-x-hidden
        scrollbar-thin scrollbar-track-gray-900 scrollbar-thumb-purple-600/50
        hover:scrollbar-thumb-purple-500/70
        px-2
      ">
        <div className="space-y-6 pb-8">
          {/* Stats Cards */}
          <motion.div
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-4 gap-6"
          >
            {(activeTab === 'spreads' ? [
              {
                title: language === 'ar' ? 'انتشارات معلقة' : 'Pending Spreads',
                value: spreadApprovals.filter(s => s.status === 'pending').length,
                icon: Clock,
                color: 'from-yellow-500 to-orange-500'
              },
              {
                title: language === 'ar' ? 'انتشارات مقبولة' : 'Approved Spreads',
                value: spreadApprovals.filter(s => s.status === 'approved').length,
                icon: CheckCircle,
                color: 'from-green-500 to-emerald-500'
              },
              {
                title: language === 'ar' ? 'انتشارات مرفوضة' : 'Rejected Spreads',
                value: spreadApprovals.filter(s => s.status === 'rejected').length,
                icon: XCircle,
                color: 'from-red-500 to-pink-500'
              },
              {
                title: language === 'ar' ? 'إجمالي الانتشارات' : 'Total Spreads',
                value: spreadApprovals.length,
                icon: Star,
                color: 'from-purple-500 to-pink-500'
              }
            ] : [
              {
                title: language === 'ar' ? 'طلبات معلقة' : 'Pending Requests',
                value: requests.filter(r => r.status === 'pending').length,
                icon: Clock,
                color: 'from-yellow-500 to-orange-500'
              },
              {
                title: language === 'ar' ? 'طلبات مقبولة' : 'Approved Today',
                value: requests.filter(r => r.status === 'approved').length,
                icon: CheckCircle,
                color: 'from-green-500 to-emerald-500'
              },
              {
                title: language === 'ar' ? 'طلبات مرفوضة' : 'Rejected Today',
                value: requests.filter(r => r.status === 'rejected').length,
                icon: XCircle,
                color: 'from-red-500 to-pink-500'
              },
              {
                title: language === 'ar' ? 'أولوية عالية' : 'High Priority',
                value: requests.filter(r => r.priority === 'high' && r.status === 'pending').length,
                icon: AlertTriangle,
                color: 'from-red-500 to-rose-500'
              }
            ]).map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  whileHover={{ scale: 1.02, y: -5 }}
                  className="glassmorphism rounded-2xl p-6 border border-white/10 hover:border-gold-400/30 transition-all duration-300"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm font-medium mb-1">
                        {stat.title}
                      </p>
                      <p className="text-3xl font-bold text-white">
                        {stat.value}
                      </p>
                    </div>
                    <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center shadow-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Tabs */}
          <div className="flex border-b border-gray-700">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-purple-400 border-b-2 border-purple-400'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.name}
              </button>
            ))}
          </div>

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
                placeholder={language === 'ar' ? 'البحث في الطلبات...' : 'Search requests...'}
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gold-400/50 transition-colors"
              />
            </div>
          </div>

          {/* Filter */}
          <div className="flex items-center space-x-4">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-gold-400/50 transition-colors"
            >
              <option value="all">{language === 'ar' ? 'كل الطلبات' : 'All Requests'}</option>
              <option value="pending">{language === 'ar' ? 'معلقة' : 'Pending'}</option>
              <option value="approved">{language === 'ar' ? 'مقبولة' : 'Approved'}</option>
              <option value="rejected">{language === 'ar' ? 'مرفوضة' : 'Rejected'}</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-gray-400 text-sm">
            {language === 'ar' 
              ? `عرض ${filteredRequests.length} من ${requests.length} طلب`
              : `Showing ${filteredRequests.length} of ${requests.length} requests`
            }
          </p>
        </div>
      </motion.div>

      {/* Tab Content */}
      {renderTabContent()}

      {/* Requests List for General Tab */}
      {activeTab === 'general' && (
        <motion.div
          variants={containerVariants}
          className="space-y-4"
        >
          {filteredRequests.map((request) => {
            const TypeIcon = getRequestTypeIcon(request.type);
            return (
              <motion.div
                key={request.id}
                variants={itemVariants}
                className="glassmorphism rounded-2xl p-6 border border-white/10 hover:border-gold-400/30 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                      <TypeIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {request.requested_by_profile?.first_name} {request.requested_by_profile?.last_name}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        {getRequestTypeLabel(request.type)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(request.priority)}`}>
                      {request.priority}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                      {request.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm">
                  <div className="flex items-center text-gray-400">
                    <Mail className="w-4 h-4 mr-2" />
                    {request.requested_by_profile?.email}
                  </div>
                  <div className="flex items-center text-gray-400">
                    <Phone className="w-4 h-4 mr-2" />
                    {request.requested_by_profile?.phone}
                  </div>
                  <div className="flex items-center text-gray-400">
                    <MapPin className="w-4 h-4 mr-2" />
                    {request.requested_by_profile?.country}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-gray-400 text-sm">
                    Submitted: {new Date(request.submitted_at).toLocaleDateString()}
                  </p>
                  
                  <div className="flex items-center space-x-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowDetailModal(true);
                      }}
                      className="flex items-center space-x-2 px-3 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View Details</span>
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowDetailModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-dark-800 rounded-2xl border border-purple-500/20 p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">
                  {activeTab === 'spreads' 
                    ? `Spread Details - ${selectedRequest.name || 'Untitled Spread'}`
                    : `Request Details - ${selectedRequest.requested_by_profile?.first_name} ${selectedRequest.requested_by_profile?.last_name}`
                  }
                </h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                {/* Information */}
                <div className="bg-dark-700/50 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-2">
                    {activeTab === 'spreads' ? 'Spread Information' : 'Request Information'}
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {activeTab === 'spreads' ? (
                      <>
                        <div>
                          <span className="text-gray-400">Name:</span>
                          <span className="text-white ml-2">{selectedRequest.name || 'Untitled Spread'}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Creator:</span>
                          <span className="text-white ml-2">
                            {selectedRequest.creator?.first_name} {selectedRequest.creator?.last_name}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Status:</span>
                          <span className={`ml-2 px-2 py-1 rounded text-xs ${getStatusColor(selectedRequest.status)}`}>
                            {selectedRequest.status}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Created:</span>
                          <span className="text-white ml-2">
                            {new Date(selectedRequest.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Layout Type:</span>
                          <span className="text-white ml-2">{selectedRequest.layout_type || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Language:</span>
                          <span className="text-white ml-2">{selectedRequest.language || 'N/A'}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <span className="text-gray-400">Type:</span>
                          <span className="text-white ml-2">{getRequestTypeLabel(selectedRequest.type)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Priority:</span>
                          <span className={`ml-2 px-2 py-1 rounded text-xs ${getPriorityColor(selectedRequest.priority)}`}>
                            {selectedRequest.priority}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Status:</span>
                          <span className={`ml-2 px-2 py-1 rounded text-xs ${getStatusColor(selectedRequest.status)}`}>
                            {selectedRequest.status}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Submitted:</span>
                          <span className="text-white ml-2">
                            {new Date(selectedRequest.submitted_at || selectedRequest.created_at).toLocaleString()}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Data */}
                <div className="bg-dark-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-white">
                      {activeTab === 'spreads' ? 'Spread Layout' : 'Request Data'}
                    </h4>
                    {activeTab === 'spreads' && (
                      <button
                        onClick={() => setShowSpreadEditor(true)}
                        className="flex items-center space-x-2 px-3 py-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-500/30 transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>{language === 'ar' ? 'فتح المحرر' : 'Open Editor'}</span>
                      </button>
                    )}
                  </div>
                  
                  {activeTab === 'spreads' ? (
                    <div className="bg-dark-800 rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        <div>
                          <span className="text-gray-400">Assignment Mode:</span>
                          <span className="text-white ml-2 capitalize">
                            {selectedRequest.assignment_mode || 'manual'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Positions:</span>
                          <span className="text-white ml-2">
                            {selectedRequest.positions?.length || 0} cards
                          </span>
                        </div>
                      </div>
                      
                      {/* Simple Layout Preview */}
                      <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-lg p-4 border border-white/10">
                        <div className="text-center text-gray-400 mb-4">
                          <Star className="w-8 h-8 mx-auto mb-2" />
                          <p className="text-sm">
                            {language === 'ar' 
                              ? 'انقر على "فتح المحرر" لمشاهدة التخطيط الكامل وتعديله'
                              : 'Click "Open Editor" to view and edit the full layout'
                            }
                          </p>
                        </div>
                        
                        {selectedRequest.positions && selectedRequest.positions.length > 0 && (
                          <div className="grid grid-cols-3 gap-2">
                            {selectedRequest.positions.slice(0, 6).map((position, index) => (
                              <div 
                                key={index}
                                className="bg-white/5 rounded p-2 text-center"
                              >
                                <div className="text-xs text-gold-400 mb-1">
                                  {language === 'ar' ? 'موضع' : 'Pos'} {position.position}
                                </div>
                                <div className="text-xs text-white truncate">
                                  {language === 'ar' ? position.position_name_ar : position.position_name_en}
                                </div>
                              </div>
                            ))}
                            {selectedRequest.positions.length > 6 && (
                              <div className="bg-white/5 rounded p-2 text-center text-gray-400 text-xs">
                                +{selectedRequest.positions.length - 6} more
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <pre className="text-gray-300 text-sm bg-dark-800 p-3 rounded overflow-auto">
                      {JSON.stringify(selectedRequest.data || selectedRequest, null, 2)}
                    </pre>
                  )}
                </div>

                {/* Actions */}
                {selectedRequest.status === 'pending' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        {activeTab === 'spreads' ? 'Admin Notes (Optional)' : 'Approval Reason (Optional)'}
                      </label>
                      <textarea
                        value={approvalReason}
                        onChange={(e) => setApprovalReason(e.target.value)}
                        rows="3"
                        className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none resize-none"
                        placeholder="Add a reason for your decision..."
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => 
                          activeTab === 'spreads' 
                            ? handleSpreadApproval(selectedRequest.id, 'approved', approvalReason)
                            : handleApproval(selectedRequest.id, 'approved', approvalReason)
                        }
                        disabled={loading}
                        className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </button>
                      
                      <button
                        onClick={() => 
                          activeTab === 'spreads' 
                            ? handleSpreadApproval(selectedRequest.id, 'rejected', approvalReason)
                            : handleApproval(selectedRequest.id, 'rejected', approvalReason)
                        }
                        disabled={loading}
                        className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

          {/* Tab Content */}
          {renderTabContent()}

          {/* Requests List for General Tab */}
          {activeTab === 'general' && (
            <motion.div
              variants={containerVariants}
              className="space-y-4"
            >
              {filteredRequests.map((request) => {
                const TypeIcon = getRequestTypeIcon(request.type);
                return (
                  <motion.div
                    key={request.id}
                    variants={itemVariants}
                    className="glassmorphism rounded-2xl p-6 border border-white/10 hover:border-gold-400/30 transition-all duration-300"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                          <TypeIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">
                            {request.requested_by_profile?.first_name} {request.requested_by_profile?.last_name}
                          </h3>
                          <p className="text-gray-400 text-sm">
                            {getRequestTypeLabel(request.type)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(request.priority)}`}>
                          {request.priority}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm">
                      <div className="flex items-center text-gray-400">
                        <Mail className="w-4 h-4 mr-2" />
                        {request.requested_by_profile?.email}
                      </div>
                      <div className="flex items-center text-gray-400">
                        <Phone className="w-4 h-4 mr-2" />
                        {request.requested_by_profile?.phone}
                      </div>
                      <div className="flex items-center text-gray-400">
                        <MapPin className="w-4 h-4 mr-2" />
                        {request.requested_by_profile?.country}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-gray-400 text-sm">
                        Submitted: {new Date(request.submitted_at).toLocaleDateString()}
                      </p>
                      
                      <div className="flex items-center space-x-2">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowDetailModal(true);
                          }}
                          className="flex items-center space-x-2 px-3 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          <span>View Details</span>
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowDetailModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="
                bg-dark-800 
                rounded-2xl 
                border border-purple-500/20 
                w-full max-w-2xl 
                max-h-[90vh] 
                overflow-hidden
                flex flex-col
              "
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header - Fixed */}
              <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-white/10">
                <h3 className="text-xl font-semibold text-white">
                  {activeTab === 'spreads' ? 'Spread Details' : 'Request Details'}
                </h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content - Scrollable */}
              <div className="
                flex-1 
                min-h-0 
                overflow-y-auto overflow-x-hidden
                scrollbar-thin scrollbar-track-gray-900 scrollbar-thumb-purple-600/50
                hover:scrollbar-thumb-purple-500/70
              ">
                <div className="p-6 space-y-6">
                  {/* Info */}
                  <div className="bg-dark-700/50 rounded-lg p-4">
                    <h4 className="font-medium text-white mb-3">Information</h4>
                    <div className="grid grid-cols-1 gap-2 text-sm">
                      {activeTab === 'spreads' ? (
                        <>
                          <div>
                            <span className="text-gray-400">Creator:</span>
                            <span className="text-white ml-2">
                              {selectedRequest.creator?.first_name} {selectedRequest.creator?.last_name}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">Status:</span>
                            <span className={`ml-2 px-2 py-1 rounded text-xs ${getStatusColor(selectedRequest.status)}`}>
                              {selectedRequest.status}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">Created:</span>
                            <span className="text-white ml-2">
                              {new Date(selectedRequest.created_at).toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">Layout Type:</span>
                            <span className="text-white ml-2">{selectedRequest.layout_type || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Language:</span>
                            <span className="text-white ml-2">{selectedRequest.language || 'N/A'}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <span className="text-gray-400">Type:</span>
                            <span className="text-white ml-2">{getRequestTypeLabel(selectedRequest.type)}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Priority:</span>
                            <span className={`ml-2 px-2 py-1 rounded text-xs ${getPriorityColor(selectedRequest.priority)}`}>
                              {selectedRequest.priority}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">Status:</span>
                            <span className={`ml-2 px-2 py-1 rounded text-xs ${getStatusColor(selectedRequest.status)}`}>
                              {selectedRequest.status}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">Submitted:</span>
                            <span className="text-white ml-2">
                              {new Date(selectedRequest.submitted_at || selectedRequest.created_at).toLocaleString()}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Data */}
                  <div className="bg-dark-700/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-white">
                        {activeTab === 'spreads' ? 'Spread Layout' : 'Request Data'}
                      </h4>
                      {activeTab === 'spreads' && (
                        <button
                          onClick={() => setShowSpreadEditor(true)}
                          className="flex items-center space-x-2 px-3 py-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-500/30 transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                          <span>{language === 'ar' ? 'فتح المحرر' : 'Open Editor'}</span>
                        </button>
                      )}
                    </div>
                    
                    {activeTab === 'spreads' ? (
                      <div className="bg-dark-800 rounded-lg p-4">
                        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                          <div>
                            <span className="text-gray-400">Assignment Mode:</span>
                            <span className="text-white ml-2 capitalize">
                              {selectedRequest.assignment_mode || 'manual'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">Positions:</span>
                            <span className="text-white ml-2">
                              {selectedRequest.positions?.length || 0} cards
                            </span>
                          </div>
                        </div>
                        
                        {/* Simple Layout Preview */}
                        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-lg p-4 border border-white/10">
                          <div className="text-center text-gray-400 mb-4">
                            <Star className="w-8 h-8 mx-auto mb-2" />
                            <p className="text-sm">
                              {language === 'ar' 
                                ? 'انقر على "فتح المحرر" لمشاهدة التخطيط الكامل وتعديله'
                                : 'Click "Open Editor" to view and edit the full layout'
                              }
                            </p>
                          </div>
                          
                          {selectedRequest.positions && selectedRequest.positions.length > 0 && (
                            <div className="grid grid-cols-3 gap-2">
                              {selectedRequest.positions.slice(0, 6).map((position, index) => (
                                <div 
                                  key={index}
                                  className="bg-white/5 rounded p-2 text-center"
                                >
                                  <div className="text-xs text-gold-400 mb-1">
                                    {language === 'ar' ? 'موضع' : 'Pos'} {position.position}
                                  </div>
                                  <div className="text-xs text-white truncate">
                                    {language === 'ar' ? position.position_name_ar : position.position_name_en}
                                  </div>
                                </div>
                              ))}
                              {selectedRequest.positions.length > 6 && (
                                <div className="bg-white/5 rounded p-2 text-center text-gray-400 text-xs">
                                  +{selectedRequest.positions.length - 6} more
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <pre className="text-gray-300 text-sm bg-dark-800 p-3 rounded overflow-auto">
                        {JSON.stringify(selectedRequest.data || selectedRequest, null, 2)}
                      </pre>
                    )}
                  </div>

                  {/* Actions */}
                  {selectedRequest.status === 'pending' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          {activeTab === 'spreads' ? 'Admin Notes (Optional)' : 'Approval Reason (Optional)'}
                        </label>
                        <textarea
                          value={approvalReason}
                          onChange={(e) => setApprovalReason(e.target.value)}
                          rows="3"
                          className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none resize-none"
                          placeholder="Add a reason for your decision..."
                        />
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => 
                            activeTab === 'spreads' 
                              ? handleSpreadApproval(selectedRequest.id, 'approved', approvalReason)
                              : handleApproval(selectedRequest.id, 'approved', approvalReason)
                          }
                          disabled={loading}
                          className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </button>
                        
                        <button
                          onClick={() => 
                            activeTab === 'spreads' 
                              ? handleSpreadApproval(selectedRequest.id, 'rejected', approvalReason)
                              : handleApproval(selectedRequest.id, 'rejected', approvalReason)
                          }
                          disabled={loading}
                          className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spread Visual Editor Modal */}
      <AnimatePresence>
        {showSpreadEditor && selectedRequest && activeTab === 'spreads' && (
          <SpreadVisualEditor
            spread={selectedRequest}
            onSave={handleSpreadSave}
            onClose={() => setShowSpreadEditor(false)}
            isAdmin={true}
            language={language}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ApprovalQueue; 