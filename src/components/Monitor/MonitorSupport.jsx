import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  HeadphonesIcon, 
  AlertTriangle,
  Send,
  Plus,
  FileText,
  MessageSquare,
  Clock,
  User,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Paperclip,
  Upload,
  X,
  ArrowUp
} from 'lucide-react';
import { useUI } from '../../context/UIContext';
import api from '../../services/frontendApi.js';

const MonitorSupport = () => {
  const { t } = useTranslation();
  const { language, showSuccess, showError } = useUI();
  const [loading, setLoading] = useState(true);
  const [escalations, setEscalations] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEscalation, setNewEscalation] = useState({
    subject: '',
    description: '',
    priority: 'medium',
    relatedItems: []
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

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
    loadEscalations();
  }, []);

  const loadEscalations = async () => {
    try {
      setLoading(true);
      // In a real implementation, this would fetch escalations from the API
      // For now, using mock data
      const mockEscalations = [
        {
          id: '1',
          subject: 'Urgent: Multiple harassment reports',
          description: 'Multiple users have reported the same reader for harassment. Need immediate admin intervention.',
          priority: 'critical',
          status: 'open',
          created_at: '2024-01-25T15:30:00Z',
          updated_at: '2024-01-25T15:30:00Z',
          related_items: ['report_123', 'report_124'],
          admin_response: null
        },
        {
          id: '2',
          subject: 'Technical issue with session monitoring',
          description: 'Unable to join session for monitoring due to technical issues. Audio/video not loading.',
          priority: 'high',
          status: 'in_progress',
          created_at: '2024-01-25T14:15:00Z',
          updated_at: '2024-01-25T16:00:00Z',
          related_items: ['session_567'],
          admin_response: 'Tech team investigating the issue.'
        },
        {
          id: '3',
          subject: 'Policy clarification needed',
          description: 'Need clarification on new content moderation policies for spiritual guidance sessions.',
          priority: 'medium',
          status: 'resolved',
          created_at: '2024-01-25T10:00:00Z',
          updated_at: '2024-01-25T11:30:00Z',
          related_items: [],
          admin_response: 'Updated policy guidelines sent to all monitors.'
        }
      ];
      setEscalations(mockEscalations);
    } catch (error) {
      console.error('Error loading escalations:', error);
      showError(language === 'ar' ? 'فشل في تحميل التصعيدات' : 'Failed to load escalations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEscalation = async () => {
    if (!newEscalation.subject || !newEscalation.description) {
      showError(language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    try {
      const response = await api.createEscalation(
        newEscalation.subject,
        newEscalation.description,
        newEscalation.priority,
        newEscalation.relatedItems
      );
      
      if (response.success) {
        showSuccess(language === 'ar' ? 'تم إنشاء التصعيد بنجاح' : 'Escalation created successfully');
        setShowCreateModal(false);
        setNewEscalation({
          subject: '',
          description: '',
          priority: 'medium',
          relatedItems: []
        });
        await loadEscalations();
      } else {
        showError(response.error || (language === 'ar' ? 'فشل في إنشاء التصعيد' : 'Failed to create escalation'));
      }
    } catch (error) {
      showError(language === 'ar' ? 'فشل في إنشاء التصعيد' : 'Failed to create escalation');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'high': return 'text-orange-400 bg-orange-500/20 border-orange-500/30';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'low': return 'text-green-400 bg-green-500/20 border-green-500/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'text-blue-400 bg-blue-500/20';
      case 'in_progress': return 'text-yellow-400 bg-yellow-500/20';
      case 'resolved': return 'text-green-400 bg-green-500/20';
      case 'closed': return 'text-gray-400 bg-gray-500/20';
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

  const filteredEscalations = escalations.filter(escalation => {
    const matchesSearch = !searchTerm || 
      escalation.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      escalation.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || escalation.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || escalation.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
          <div className="absolute inset-0 rounded-full border-2 border-green-400/20"></div>
        </div>
        <span className="ml-4 text-gray-300">
          {language === 'ar' ? 'جاري تحميل أدوات الدعم...' : 'Loading support tools...'}
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
      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
            {language === 'ar' ? 'أدوات الدعم' : 'Support Tools'}
          </h2>
          <p className="text-gray-400 mt-1">
            {language === 'ar' ? 'التصعيد للإدارة وطلب الدعم الفني' : 'Escalate to admin and request technical support'}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-3 py-2 bg-orange-500/20 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            <span className="text-orange-400 text-sm font-medium">
              {filteredEscalations.filter(e => e.status === 'open').length} {language === 'ar' ? 'مفتوح' : 'Open'}
            </span>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'ar' ? 'تصعيد جديد' : 'New Escalation'}</span>
          </motion.button>
          
          <button
            onClick={loadEscalations}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-colors"
          >
            {language === 'ar' ? 'تحديث' : 'Refresh'}
          </button>
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
                placeholder={language === 'ar' ? 'البحث في التصعيدات...' : 'Search escalations...'}
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-400/50 transition-colors"
              />
            </div>
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-green-400/50 transition-colors"
          >
            <option value="all">{language === 'ar' ? 'كل الحالات' : 'All Status'}</option>
            <option value="open">{language === 'ar' ? 'مفتوح' : 'Open'}</option>
            <option value="in_progress">{language === 'ar' ? 'قيد التقدم' : 'In Progress'}</option>
            <option value="resolved">{language === 'ar' ? 'تم حله' : 'Resolved'}</option>
            <option value="closed">{language === 'ar' ? 'مغلق' : 'Closed'}</option>
          </select>
          
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-green-400/50 transition-colors"
          >
            <option value="all">{language === 'ar' ? 'كل الأولويات' : 'All Priority'}</option>
            <option value="critical">{language === 'ar' ? 'خطير' : 'Critical'}</option>
            <option value="high">{language === 'ar' ? 'عالي' : 'High'}</option>
            <option value="medium">{language === 'ar' ? 'متوسط' : 'Medium'}</option>
            <option value="low">{language === 'ar' ? 'منخفض' : 'Low'}</option>
          </select>
        </div>
      </motion.div>

      {/* Escalations List */}
      <motion.div
        variants={containerVariants}
        className="space-y-4"
      >
        {filteredEscalations.map((escalation) => (
          <motion.div
            key={escalation.id}
            variants={itemVariants}
            whileHover={{ scale: 1.01, y: -2 }}
            className={`glassmorphism rounded-2xl p-6 border transition-all duration-300 ${
              escalation.priority === 'critical' 
                ? 'border-red-500/50 bg-red-500/5' 
                : escalation.priority === 'high'
                  ? 'border-orange-500/50 bg-orange-500/5'
                  : 'border-white/10 hover:border-green-400/30'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4 flex-1">
                <div className={`w-12 h-12 bg-gradient-to-br ${
                  escalation.priority === 'critical' ? 'from-red-500 to-pink-500' :
                  escalation.priority === 'high' ? 'from-orange-500 to-red-500' :
                  escalation.priority === 'medium' ? 'from-yellow-500 to-orange-500' :
                  'from-green-500 to-emerald-500'
                } rounded-xl flex items-center justify-center`}>
                  <ArrowUp className="w-6 h-6 text-white" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-1">
                        {escalation.subject}
                      </h3>
                      <p className="text-gray-300 text-sm mb-3 line-clamp-2">
                        {escalation.description}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-400 mb-3">
                        <span className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {formatDateTime(escalation.created_at)}
                        </span>
                        {escalation.related_items && escalation.related_items.length > 0 && (
                          <span className="flex items-center">
                            <Paperclip className="w-4 h-4 mr-1" />
                            {escalation.related_items.length} {language === 'ar' ? 'عنصر مرفق' : 'items attached'}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-3 mb-3">
                        <span className={`px-3 py-1 rounded-lg text-sm font-medium border ${getPriorityColor(escalation.priority)}`}>
                          {escalation.priority} {language === 'ar' ? 'أولوية' : 'priority'}
                        </span>
                        
                        <span className={`px-3 py-1 rounded-lg text-sm font-medium ${getStatusColor(escalation.status)}`}>
                          {escalation.status}
                        </span>
                      </div>
                      
                      {escalation.admin_response && (
                        <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                          <p className="text-sm text-blue-300 font-medium mb-1">
                            {language === 'ar' ? 'رد الإدارة:' : 'Admin Response:'}
                          </p>
                          <p className="text-sm text-gray-300">{escalation.admin_response}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {filteredEscalations.length === 0 && (
        <motion.div
          variants={itemVariants}
          className="text-center py-12"
        >
          <HeadphonesIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">
            {language === 'ar' ? 'لا توجد تصعيدات' : 'No Escalations'}
          </h3>
          <p className="text-gray-500">
            {language === 'ar' ? 'لا توجد تصعيدات تطابق المعايير المحددة' : 'No escalations match the selected criteria'}
          </p>
        </motion.div>
      )}

      {/* Create Escalation Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glassmorphism rounded-2xl p-6 border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">
                  {language === 'ar' ? 'إنشاء تصعيد جديد' : 'Create New Escalation'}
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 rounded-lg bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {language === 'ar' ? 'الموضوع *' : 'Subject *'}
                  </label>
                  <input
                    type="text"
                    value={newEscalation.subject}
                    onChange={(e) => setNewEscalation(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder={language === 'ar' ? 'أدخل موضوع التصعيد...' : 'Enter escalation subject...'}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-400/50 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {language === 'ar' ? 'الأولوية' : 'Priority'}
                  </label>
                  <select
                    value={newEscalation.priority}
                    onChange={(e) => setNewEscalation(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-green-400/50 transition-colors"
                  >
                    <option value="low">{language === 'ar' ? 'منخفض' : 'Low'}</option>
                    <option value="medium">{language === 'ar' ? 'متوسط' : 'Medium'}</option>
                    <option value="high">{language === 'ar' ? 'عالي' : 'High'}</option>
                    <option value="critical">{language === 'ar' ? 'خطير' : 'Critical'}</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {language === 'ar' ? 'الوصف *' : 'Description *'}
                  </label>
                  <textarea
                    value={newEscalation.description}
                    onChange={(e) => setNewEscalation(prev => ({ ...prev, description: e.target.value }))}
                    placeholder={language === 'ar' ? 'اشرح المشكلة أو طلب الدعم بالتفصيل...' : 'Explain the issue or support request in detail...'}
                    rows={6}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-400/50 transition-colors resize-none"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={handleCreateEscalation}
                  disabled={!newEscalation.subject || !newEscalation.description}
                  className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{language === 'ar' ? 'إرسال التصعيد' : 'Send Escalation'}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MonitorSupport; 