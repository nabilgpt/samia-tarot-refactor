import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  CheckCircle, 
  XCircle,
  Clock,
  User,
  MessageSquare,
  Play,
  Pause,
  Eye,
  AlertTriangle,
  Filter,
  Search,
  RefreshCw,
  FileText,
  Mic,
  Bot,
  Star,
  Calendar,
  Settings,
  UserCheck,
  DollarSign,
  Trash2,
  Edit,
  Plus
} from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { ApprovalAPI } from '../../api/approvalApi';

const MonitorApprovalQueue = () => {
  const { t } = useTranslation();
  const { language, showSuccess, showError } = useUI();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0,
    targetCounts: {}
  });

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
    loadApprovalData();
    loadStats();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [requests, searchTerm, statusFilter, activeCategory]);

  const loadApprovalData = async () => {
    try {
      setLoading(true);
      const response = await ApprovalAPI.getAllRequests(1, 100, { status: statusFilter });
      
      if (response.success) {
        setRequests(response.data);
      } else {
        showError(language === 'ar' ? 'فشل في تحميل طلبات الموافقة' : 'Failed to load approval requests');
      }
    } catch (error) {
      console.error('Error loading approval data:', error);
      showError(language === 'ar' ? 'فشل في تحميل البيانات' : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await ApprovalAPI.getApprovalStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const filterRequests = () => {
    let filtered = requests;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(request => {
        const requesterName = `${request.requester?.first_name || ''} ${request.requester?.last_name || ''}`;
        const target = request.target || '';
        const actionType = request.action_type || '';
        
        return requesterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
               target.toLowerCase().includes(searchTerm.toLowerCase()) ||
               actionType.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    // Filter by category (target type)
    if (activeCategory !== 'all') {
      filtered = filtered.filter(request => request.target === activeCategory);
    }

    setFilteredRequests(filtered);
  };

  const handleApproval = async (requestId, action, reason = '') => {
    try {
      const response = await ApprovalAPI.reviewRequest(requestId, action, reason);
      
      if (response.success) {
        await loadApprovalData();
        await loadStats();
        setShowDetailModal(false);
        setShowRejectModal(false);
        setSelectedRequest(null);
        setRejectReason('');
        
        showSuccess(
          language === 'ar' 
            ? action === 'approved' ? 'تمت الموافقة بنجاح' : 'تم الرفض بنجاح'
            : action === 'approved' ? 'Request approved successfully' : 'Request rejected successfully'
        );
      } else {
        showError(response.error || (language === 'ar' ? 'فشل في تحديث الطلب' : 'Failed to update request'));
      }
    } catch (error) {
      showError(language === 'ar' ? 'فشل في تحديث الطلب' : 'Failed to update request');
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

  const categories = [
    { 
      id: 'all', 
      name: language === 'ar' ? 'الكل' : 'All', 
      count: requests.length, 
      icon: FileText,
      color: 'from-gray-500 to-slate-500'
    },
    { 
      id: 'profile', 
      name: language === 'ar' ? 'الملف الشخصي' : 'Profile', 
      count: stats.targetCounts.profile || 0, 
      icon: User,
      color: 'from-blue-500 to-cyan-500'
    },
    { 
      id: 'service', 
      name: language === 'ar' ? 'الخدمات' : 'Services', 
      count: stats.targetCounts.service || 0, 
      icon: Settings,
      color: 'from-purple-500 to-indigo-500'
    },
    { 
      id: 'schedule', 
      name: language === 'ar' ? 'الجدول' : 'Schedule', 
      count: stats.targetCounts.schedule || 0, 
      icon: Calendar,
      color: 'from-green-500 to-emerald-500'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
          <div className="absolute inset-0 rounded-full border-2 border-purple-400/20"></div>
        </div>
        <span className="ml-4 text-gray-300">
          {language === 'ar' ? 'جاري تحميل طلبات الموافقة...' : 'Loading approval requests...'}
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
            {language === 'ar' ? 'طلبات الموافقة' : 'Approval Requests'}
          </h2>
          <p className="text-gray-400 mt-1">
            {language === 'ar' ? 'مراجعة والموافقة على تغييرات القراء' : 'Review and approve reader changes'}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="flex items-center space-x-2 px-3 py-2 bg-yellow-500/20 rounded-lg">
              <Clock className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-400 text-sm font-medium">
                {stats.pending} {language === 'ar' ? 'معلق' : 'Pending'}
              </span>
            </div>
            <div className="flex items-center space-x-2 px-3 py-2 bg-green-500/20 rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-green-400 text-sm font-medium">
                {stats.approved} {language === 'ar' ? 'موافق' : 'Approved'}
              </span>
            </div>
            <div className="flex items-center space-x-2 px-3 py-2 bg-red-500/20 rounded-lg">
              <XCircle className="w-4 h-4 text-red-400" />
              <span className="text-red-400 text-sm font-medium">
                {stats.rejected} {language === 'ar' ? 'مرفوض' : 'Rejected'}
              </span>
            </div>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              loadApprovalData();
              loadStats();
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{language === 'ar' ? 'تحديث' : 'Refresh'}</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Category Tabs and Filters */}
      <motion.div
        variants={itemVariants}
        className="glassmorphism rounded-2xl p-6 border border-white/10"
      >
        <div className="flex flex-wrap gap-3 mb-6">
          {categories.map((category) => {
            const IconComponent = category.icon;
            return (
              <motion.button
                key={category.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveCategory(category.id)}
                className={`flex items-center space-x-3 px-6 py-3 rounded-xl transition-all duration-300 ${
                  activeCategory === category.id
                    ? `bg-gradient-to-r ${category.color} text-white shadow-lg`
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <IconComponent className="w-5 h-5" />
                <span className="font-medium">{category.name}</span>
                {category.count > 0 && (
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    activeCategory === category.id ? 'bg-white/20' : 'bg-purple-500/20 text-purple-400'
                  }`}>
                    {category.count}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Filters */}
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
            onChange={(e) => {
              setStatusFilter(e.target.value);
              loadApprovalData();
            }}
            className="px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-400/50 transition-colors"
          >
            <option value="pending">{language === 'ar' ? 'معلق' : 'Pending'}</option>
            <option value="approved">{language === 'ar' ? 'موافق عليه' : 'Approved'}</option>
            <option value="rejected">{language === 'ar' ? 'مرفوض' : 'Rejected'}</option>
          </select>
          
          <div className="text-sm text-gray-400 flex items-center">
            {language === 'ar' 
              ? `عرض ${filteredRequests.length} من ${requests.length} طلب`
              : `Showing ${filteredRequests.length} of ${requests.length} requests`
            }
          </div>
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
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      {request.requester?.avatar_url ? (
                        <img 
                          src={request.requester.avatar_url} 
                          alt="Requester" 
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-6 h-6 text-white" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-1">
                        <h3 className="font-semibold text-white">
                          {request.requester ? 
                            `${request.requester.first_name} ${request.requester.last_name}` : 
                            'Unknown User'
                          }
                        </h3>
                        <div className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium ${getActionColor(request.action_type)}`}>
                          <ActionIcon className="w-3 h-3" />
                          <span className="capitalize">{request.action_type}</span>
                        </div>
                        <div className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium bg-gradient-to-r ${getTargetColor(request.target)} text-white`}>
                          <TargetIcon className="w-3 h-3" />
                          <span className="capitalize">{request.target}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-400 mb-2">
                        {request.requester?.email || 'No email'}
                      </p>
                      
                      {/* Change Preview */}
                      <div className="bg-white/5 rounded-lg p-3 mb-3">
                        {renderChangePreview(request)}
                      </div>
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatDateTime(request.created_at)}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          request.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                          request.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {request.status}
                        </span>
                      </div>
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
                    <>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleApproval(request.id, 'approved')}
                        className="flex items-center space-x-1 px-3 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>{language === 'ar' ? 'موافقة' : 'Approve'}</span>
                      </motion.button>
                      
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowRejectModal(true);
                        }}
                        className="flex items-center space-x-1 px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>{language === 'ar' ? 'رفض' : 'Reject'}</span>
                      </motion.button>
                    </>
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
          <CheckCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">
            {language === 'ar' ? 'لا توجد طلبات' : 'No Requests Found'}
          </h3>
          <p className="text-gray-500">
            {language === 'ar' ? 'لا توجد طلبات تطابق المعايير المحددة' : 'No requests match the selected criteria'}
          </p>
        </motion.div>
      )}

      {/* Reject Modal */}
      <AnimatePresence>
        {showRejectModal && selectedRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowRejectModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glassmorphism rounded-2xl p-6 border border-white/10 max-w-md w-full"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">
                  {language === 'ar' ? 'رفض الطلب' : 'Reject Request'}
                </h3>
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="p-2 rounded-lg bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {language === 'ar' ? 'سبب الرفض' : 'Rejection Reason'}
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder={language === 'ar' ? 'اشرح سبب رفض هذا الطلب...' : 'Explain why this request is being rejected...'}
                    rows={4}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-red-400/50 transition-colors resize-none"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-3 mt-6">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={() => handleApproval(selectedRequest.id, 'rejected', rejectReason)}
                  disabled={!rejectReason.trim()}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-colors disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  <span>{language === 'ar' ? 'رفض الطلب' : 'Reject Request'}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MonitorApprovalQueue; 