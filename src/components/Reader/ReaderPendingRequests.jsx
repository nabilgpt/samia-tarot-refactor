import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Trash2,
  Plus,
  User,
  Settings,
  Calendar,
  DollarSign,
  FileText,
  Star,
  Mic,
  AlertTriangle,
  RefreshCw,
  MessageSquare,
  Filter,
  Search
} from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { ApprovalAPI } from '../../api/approvalApi';

const ReaderPendingRequests = () => {
  const { t } = useTranslation();
  const { language, showSuccess, showError } = useUI();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [targetFilter, setTargetFilter] = useState('all');

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
    loadRequests();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [requests, searchTerm, statusFilter, targetFilter]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await ApprovalAPI.getMyRequests();
      
      if (response.success) {
        setRequests(response.data);
      } else {
        showError(language === 'ar' ? 'فشل في تحميل طلباتك' : 'Failed to load your requests');
      }
    } catch (error) {
      console.error('Error loading requests:', error);
      showError(language === 'ar' ? 'فشل في تحميل البيانات' : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filterRequests = () => {
    let filtered = requests;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(request => {
        const target = request.target || '';
        const actionType = request.action_type || '';
        const status = request.status || '';
        
        return target.toLowerCase().includes(searchTerm.toLowerCase()) ||
               actionType.toLowerCase().includes(searchTerm.toLowerCase()) ||
               status.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(request => request.status === statusFilter);
    }

    // Filter by target type
    if (targetFilter !== 'all') {
      filtered = filtered.filter(request => request.target === targetFilter);
    }

    setFilteredRequests(filtered);
  };

  const handleCancelRequest = async (requestId) => {
    try {
      const response = await ApprovalAPI.cancelRequest(requestId);
      
      if (response.success) {
        await loadRequests();
        showSuccess(language === 'ar' ? 'تم إلغاء الطلب بنجاح' : 'Request cancelled successfully');
      } else {
        showError(response.error || (language === 'ar' ? 'فشل في إلغاء الطلب' : 'Failed to cancel request'));
      }
    } catch (error) {
      showError(language === 'ar' ? 'فشل في إلغاء الطلب' : 'Failed to cancel request');
    }
  };

  const getTargetIcon = (target) => {
    switch (target) {
      case 'profile': return User;
      case 'service': return Settings;
      case 'schedule': return Calendar;
      case 'working_hours': return Clock;
      case 'price': return DollarSign;
      case 'bio': return FileText;
      case 'specialties': return Star;
      case 'media': return Mic;
      default: return FileText;
    }
  };

  const getTargetColor = (target) => {
    switch (target) {
      case 'profile': return 'from-blue-500 to-cyan-500';
      case 'service': return 'from-purple-500 to-indigo-500';
      case 'schedule': return 'from-green-500 to-emerald-500';
      case 'working_hours': return 'from-yellow-500 to-orange-500';
      case 'price': return 'from-pink-500 to-rose-500';
      case 'bio': return 'from-teal-500 to-cyan-500';
      case 'specialties': return 'from-amber-500 to-yellow-500';
      case 'media': return 'from-red-500 to-pink-500';
      default: return 'from-gray-500 to-slate-500';
    }
  };

  const getActionIcon = (actionType) => {
    switch (actionType) {
      case 'add': return Plus;
      case 'edit': return Edit;
      case 'delete': return Trash2;
      default: return Edit;
    }
  };

  const getActionColor = (actionType) => {
    switch (actionType) {
      case 'add': return 'text-green-400 bg-green-500/20';
      case 'edit': return 'text-blue-400 bg-blue-500/20';
      case 'delete': return 'text-red-400 bg-red-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return Clock;
      case 'approved': return CheckCircle;
      case 'rejected': return XCircle;
      case 'cancelled': return XCircle;
      default: return Clock;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-yellow-400 bg-yellow-500/20';
      case 'approved': return 'text-green-400 bg-green-500/20';
      case 'rejected': return 'text-red-400 bg-red-500/20';
      case 'cancelled': return 'text-gray-400 bg-gray-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderChangePreview = (request) => {
    const { target, action_type, old_value, new_value } = request;
    
    if (target === 'profile') {
      return (
        <div className="space-y-2">
          {Object.keys(new_value || {}).map(key => (
            <div key={key} className="flex items-center justify-between text-sm">
              <span className="text-gray-400 capitalize">{key.replace('_', ' ')}:</span>
              <div className="flex items-center space-x-2">
                {old_value?.[key] && (
                  <span className="text-gray-500 line-through">{old_value[key]}</span>
                )}
                <span className="text-green-400">{new_value[key]}</span>
              </div>
            </div>
          ))}
        </div>
      );
    }
    
    if (target === 'service') {
      return (
        <div className="space-y-2">
          <div className="text-sm">
            <span className="text-gray-400">Action: </span>
            <span className="text-white capitalize">{action_type}</span>
          </div>
          {new_value?.service_name && (
            <div className="text-sm">
              <span className="text-gray-400">Service: </span>
              <span className="text-white">{new_value.service_name}</span>
            </div>
          )}
          {new_value?.price && (
            <div className="text-sm">
              <span className="text-gray-400">Price: </span>
              <span className="text-green-400">${new_value.price}</span>
            </div>
          )}
          {new_value?.duration_minutes && (
            <div className="text-sm">
              <span className="text-gray-400">Duration: </span>
              <span className="text-white">{new_value.duration_minutes} min</span>
            </div>
          )}
        </div>
      );
    }
    
    return (
      <div className="text-sm text-gray-400">
        {action_type} {target} change
      </div>
    );
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
          <div className="absolute inset-0 rounded-full border-2 border-purple-400/20"></div>
        </div>
        <span className="ml-4 text-gray-300">
          {language === 'ar' ? 'جاري تحميل طلباتك...' : 'Loading your requests...'}
        </span>
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
      {/* Header with Stats */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
            {language === 'ar' ? 'طلباتي' : 'My Requests'}
          </h2>
          <p className="text-gray-400 mt-1">
            {language === 'ar' ? 'تتبع طلبات التغيير المرسلة للموافقة' : 'Track your change requests pending approval'}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="flex items-center space-x-2 px-3 py-2 bg-yellow-500/20 rounded-lg">
              <Clock className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-400 text-sm font-medium">
                {pendingCount} {language === 'ar' ? 'معلق' : 'Pending'}
              </span>
            </div>
            <div className="flex items-center space-x-2 px-3 py-2 bg-green-500/20 rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-green-400 text-sm font-medium">
                {approvedCount} {language === 'ar' ? 'موافق' : 'Approved'}
              </span>
            </div>
            <div className="flex items-center space-x-2 px-3 py-2 bg-red-500/20 rounded-lg">
              <XCircle className="w-4 h-4 text-red-400" />
              <span className="text-red-400 text-sm font-medium">
                {rejectedCount} {language === 'ar' ? 'مرفوض' : 'Rejected'}
              </span>
            </div>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={loadRequests}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{language === 'ar' ? 'تحديث' : 'Refresh'}</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        variants={itemVariants}
        className="glassmorphism rounded-2xl p-6 border border-white/10"
      >
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={language === 'ar' ? 'البحث في الطلبات...' : 'Search requests...'}
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400/50 transition-colors"
              />
            </div>
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-400/50 transition-colors"
          >
            <option value="all">{language === 'ar' ? 'كل الحالات' : 'All Status'}</option>
            <option value="pending">{language === 'ar' ? 'معلق' : 'Pending'}</option>
            <option value="approved">{language === 'ar' ? 'موافق عليه' : 'Approved'}</option>
            <option value="rejected">{language === 'ar' ? 'مرفوض' : 'Rejected'}</option>
            <option value="cancelled">{language === 'ar' ? 'ملغي' : 'Cancelled'}</option>
          </select>
          
          <select
            value={targetFilter}
            onChange={(e) => setTargetFilter(e.target.value)}
            className="px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-400/50 transition-colors"
          >
            <option value="all">{language === 'ar' ? 'كل الأنواع' : 'All Types'}</option>
            <option value="profile">{language === 'ar' ? 'الملف الشخصي' : 'Profile'}</option>
            <option value="service">{language === 'ar' ? 'الخدمات' : 'Services'}</option>
            <option value="schedule">{language === 'ar' ? 'الجدول' : 'Schedule'}</option>
            <option value="working_hours">{language === 'ar' ? 'ساعات العمل' : 'Working Hours'}</option>
          </select>
        </div>
        
        <div className="mt-4 text-sm text-gray-400">
          {language === 'ar' 
            ? `عرض ${filteredRequests.length} من ${requests.length} طلب`
            : `Showing ${filteredRequests.length} of ${requests.length} requests`
          }
        </div>
      </motion.div>

      {/* Requests List */}
      <motion.div
        variants={containerVariants}
        className="space-y-4"
      >
        {filteredRequests.map((request) => {
          const TargetIcon = getTargetIcon(request.target);
          const ActionIcon = getActionIcon(request.action_type);
          const StatusIcon = getStatusIcon(request.status);
          
          return (
            <motion.div
              key={request.id}
              variants={itemVariants}
              whileHover={{ scale: 1.01, y: -2 }}
              className="glassmorphism rounded-2xl p-6 border border-white/10 hover:border-purple-400/30 transition-all duration-300"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className={`w-12 h-12 bg-gradient-to-br ${getTargetColor(request.target)} rounded-full flex items-center justify-center`}>
                      <TargetIcon className="w-6 h-6 text-white" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-white capitalize">
                          {language === 'ar' ? 
                            `${request.action_type === 'add' ? 'إضافة' : request.action_type === 'edit' ? 'تعديل' : 'حذف'} ${request.target === 'profile' ? 'الملف الشخصي' : request.target === 'service' ? 'خدمة' : request.target}` :
                            `${request.action_type} ${request.target}`
                          }
                        </h3>
                        
                        <div className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium ${getActionColor(request.action_type)}`}>
                          <ActionIcon className="w-3 h-3" />
                          <span className="capitalize">{request.action_type}</span>
                        </div>
                        
                        <div className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium ${getStatusColor(request.status)}`}>
                          <StatusIcon className="w-3 h-3" />
                          <span className="capitalize">{request.status}</span>
                        </div>
                      </div>
                      
                      {/* Change Preview */}
                      <div className="bg-white/5 rounded-lg p-3 mb-3">
                        {renderChangePreview(request)}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {formatDateTime(request.created_at)}
                          </span>
                          {request.reviewed_at && (
                            <span className="flex items-center">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {formatDateTime(request.reviewed_at)}
                            </span>
                          )}
                        </div>
                        
                        {request.review_reason && (
                          <div className="flex items-center text-xs text-gray-400">
                            <MessageSquare className="w-3 h-3 mr-1" />
                            <span>{language === 'ar' ? 'يوجد تعليق' : 'Has comment'}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Admin Comments */}
                      {request.review_reason && (
                        <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                          <div className="flex items-center space-x-2 mb-2">
                            <MessageSquare className="w-4 h-4 text-blue-400" />
                            <span className="text-sm font-medium text-blue-400">
                              {language === 'ar' ? 'تعليق المشرف:' : 'Admin Comment:'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-300">{request.review_reason}</p>
                          {request.admin_first_name && (
                            <p className="text-xs text-gray-500 mt-1">
                              - {request.admin_first_name} {request.admin_last_name}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setSelectedRequest(request);
                      setShowDetailModal(true);
                    }}
                    className="flex items-center space-x-1 px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    <span>{language === 'ar' ? 'عرض' : 'View'}</span>
                  </motion.button>
                  
                  {request.status === 'pending' && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleCancelRequest(request.id)}
                      className="flex items-center space-x-1 px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>{language === 'ar' ? 'إلغاء' : 'Cancel'}</span>
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Empty State */}
      {filteredRequests.length === 0 && (
        <motion.div
          variants={itemVariants}
          className="text-center py-12"
        >
          <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">
            {language === 'ar' ? 'لا توجد طلبات' : 'No Requests Found'}
          </h3>
          <p className="text-gray-500">
            {requests.length === 0 ? (
              language === 'ar' ? 'لم تقم بإرسال أي طلبات بعد' : 'You haven\'t submitted any requests yet'
            ) : (
              language === 'ar' ? 'لا توجد طلبات تطابق المعايير المحددة' : 'No requests match the selected criteria'
            )}
          </p>
        </motion.div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowDetailModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glassmorphism rounded-2xl p-6 border border-white/10 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">
                  {language === 'ar' ? 'تفاصيل الطلب' : 'Request Details'}
                </h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 rounded-lg bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Request Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      {language === 'ar' ? 'النوع' : 'Type'}
                    </label>
                    <div className="flex items-center space-x-2">
                      {React.createElement(getTargetIcon(selectedRequest.target), { className: "w-4 h-4 text-purple-400" })}
                      <span className="text-white capitalize">{selectedRequest.target}</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      {language === 'ar' ? 'الإجراء' : 'Action'}
                    </label>
                    <div className="flex items-center space-x-2">
                      {React.createElement(getActionIcon(selectedRequest.action_type), { className: "w-4 h-4 text-blue-400" })}
                      <span className="text-white capitalize">{selectedRequest.action_type}</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      {language === 'ar' ? 'الحالة' : 'Status'}
                    </label>
                    <div className={`flex items-center space-x-2 px-2 py-1 rounded-lg w-fit ${getStatusColor(selectedRequest.status)}`}>
                      {React.createElement(getStatusIcon(selectedRequest.status), { className: "w-4 h-4" })}
                      <span className="capitalize text-sm font-medium">{selectedRequest.status}</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      {language === 'ar' ? 'تاريخ الإرسال' : 'Submitted'}
                    </label>
                    <span className="text-white">{formatDateTime(selectedRequest.created_at)}</span>
                  </div>
                </div>
                
                {/* Changes */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-3">
                    {language === 'ar' ? 'التغييرات المطلوبة' : 'Requested Changes'}
                  </label>
                  <div className="bg-white/5 rounded-lg p-4">
                    {renderChangePreview(selectedRequest)}
                  </div>
                </div>
                
                {/* Admin Review */}
                {selectedRequest.review_reason && (
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-3">
                      {language === 'ar' ? 'تعليق المشرف' : 'Admin Review'}
                    </label>
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                      <p className="text-gray-300 mb-2">{selectedRequest.review_reason}</p>
                      {selectedRequest.admin_first_name && (
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <span>- {selectedRequest.admin_first_name} {selectedRequest.admin_last_name}</span>
                          <span>{formatDateTime(selectedRequest.reviewed_at)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  {language === 'ar' ? 'إغلاق' : 'Close'}
                </button>
                
                {selectedRequest.status === 'pending' && (
                  <button
                    onClick={() => {
                      handleCancelRequest(selectedRequest.id);
                      setShowDetailModal(false);
                    }}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>{language === 'ar' ? 'إلغاء الطلب' : 'Cancel Request'}</span>
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ReaderPendingRequests; 