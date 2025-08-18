import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Flag, 
  AlertTriangle, 
  Shield,
  User,
  Clock,
  Eye,
  FileText,
  MessageSquare,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  MoreHorizontal,
  UserX,
  AlertCircle,
  Calendar,
  Edit3,
  Save,
  X,
  Plus
} from 'lucide-react';
import { useUI } from '../../context/UIContext';
import api from '../../services/frontendApi.js';

const MonitorReports = ({ onStatsUpdate }) => {
  const { t } = useTranslation();
  const { language, showSuccess, showError } = useUI();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [selectedReport, setSelectedReport] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [internalNote, setInternalNote] = useState('');
  const [processing, setProcessing] = useState(false);

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
    loadReports();
  }, []);

  useEffect(() => {
    filterReports();
  }, [reports, searchTerm, statusFilter, severityFilter]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await api.getViolationReports({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        severity: severityFilter !== 'all' ? severityFilter : undefined
      });
      
      if (response.success) {
        setReports(response.data);
      } else {
        console.error('Failed to load violation reports:', response.status);
        setReports([]);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      showError(language === 'ar' ? 'فشل في تحميل التقارير' : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const filterReports = () => {
    let filtered = reports;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(report => {
        const reporterName = `${report.reporter?.first_name} ${report.reporter?.last_name}`;
        const reportedUserName = `${report.reported_user?.first_name} ${report.reported_user?.last_name}`;
        
        return report.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               report.violation_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               reporterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
               reportedUserName.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(report => report.status === statusFilter);
    }

    // Filter by severity
    if (severityFilter !== 'all') {
      filtered = filtered.filter(report => report.severity === severityFilter);
    }

    setFilteredReports(filtered);
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'text-red-500 bg-red-500/20 border-red-500/30';
      case 'high': return 'text-orange-400 bg-orange-500/20 border-orange-500/30';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'low': return 'text-green-400 bg-green-500/20 border-green-500/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'text-blue-400 bg-blue-500/20';
      case 'investigating': return 'text-yellow-400 bg-yellow-500/20';
      case 'resolved': return 'text-green-400 bg-green-500/20';
      case 'closed': return 'text-gray-400 bg-gray-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getViolationTypeIcon = (type) => {
    switch (type) {
      case 'inappropriate_content': return AlertTriangle;
      case 'harassment': return UserX;
      case 'spam': return MessageSquare;
      case 'fraud': return Shield;
      default: return Flag;
    }
  };

  const handleUpdateStatus = async (reportId, newStatus) => {
    try {
      setProcessing(true);
      const response = await api.updateViolationReport(reportId, { status: newStatus });
      
      if (response.success) {
        showSuccess(language === 'ar' ? 'تم تحديث حالة التقرير' : 'Report status updated');
        await loadReports();
        onStatsUpdate?.();
      } else {
        showError(response.error || (language === 'ar' ? 'فشل في تحديث التقرير' : 'Failed to update report'));
      }
    } catch (error) {
      showError(language === 'ar' ? 'فشل في تحديث التقرير' : 'Failed to update report');
    } finally {
      setProcessing(false);
    }
  };

  const handleAddNote = async () => {
    if (!selectedReport || !internalNote.trim()) return;

    try {
      setProcessing(true);
      const response = await api.addInternalNote(selectedReport.id, internalNote);
      
      if (response.success) {
        showSuccess(language === 'ar' ? 'تمت إضافة الملاحظة' : 'Note added successfully');
        setShowNoteModal(false);
        setInternalNote('');
        await loadReports();
      } else {
        showError(response.error || (language === 'ar' ? 'فشل في إضافة الملاحظة' : 'Failed to add note'));
      }
    } catch (error) {
      showError(language === 'ar' ? 'فشل في إضافة الملاحظة' : 'Failed to add note');
    } finally {
      setProcessing(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-400"></div>
          <div className="absolute inset-0 rounded-full border-2 border-red-400/20"></div>
        </div>
        <span className="ml-4 text-gray-300">
          {language === 'ar' ? 'جاري تحميل التقارير...' : 'Loading reports...'}
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
          <h2 className="text-2xl font-bold bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
            {language === 'ar' ? 'التقارير والمخالفات' : 'Reports & Violations'}
          </h2>
          <p className="text-gray-400 mt-1">
            {language === 'ar' ? 'إدارة البلاغات ومراقبة المخالفات' : 'Manage reports and monitor violations'}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-3 py-2 bg-red-500/20 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-red-400 text-sm font-medium">
              {filteredReports.filter(r => r.status !== 'resolved' && r.status !== 'closed').length} {language === 'ar' ? 'مفتوح' : 'Open'}
            </span>
          </div>
          
          <button
            onClick={loadReports}
            className="px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg hover:from-red-600 hover:to-orange-600 transition-colors"
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
                placeholder={language === 'ar' ? 'البحث في التقارير...' : 'Search reports...'}
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-red-400/50 transition-colors"
              />
            </div>
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-red-400/50 transition-colors"
          >
            <option value="all">{language === 'ar' ? 'كل الحالات' : 'All Status'}</option>
            <option value="open">{language === 'ar' ? 'مفتوح' : 'Open'}</option>
            <option value="investigating">{language === 'ar' ? 'قيد التحقيق' : 'Investigating'}</option>
            <option value="resolved">{language === 'ar' ? 'تم حله' : 'Resolved'}</option>
            <option value="closed">{language === 'ar' ? 'مغلق' : 'Closed'}</option>
          </select>
          
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-red-400/50 transition-colors"
          >
            <option value="all">{language === 'ar' ? 'كل المستويات' : 'All Severity'}</option>
            <option value="critical">{language === 'ar' ? 'خطير' : 'Critical'}</option>
            <option value="high">{language === 'ar' ? 'عالي' : 'High'}</option>
            <option value="medium">{language === 'ar' ? 'متوسط' : 'Medium'}</option>
            <option value="low">{language === 'ar' ? 'منخفض' : 'Low'}</option>
          </select>
        </div>
      </motion.div>

      {/* Reports List */}
      <motion.div
        variants={containerVariants}
        className="space-y-4"
      >
        {filteredReports.map((report) => {
          const ViolationIcon = getViolationTypeIcon(report.violation_type);
          const reporterName = `${report.reporter?.first_name} ${report.reporter?.last_name}`;
          const reportedUserName = `${report.reported_user?.first_name} ${report.reported_user?.last_name}`;
          
          return (
            <motion.div
              key={report.id}
              variants={itemVariants}
              whileHover={{ scale: 1.01, y: -2 }}
              className={`glassmorphism rounded-2xl p-6 border transition-all duration-300 ${
                report.severity === 'critical' 
                  ? 'border-red-500/50 bg-red-500/5' 
                  : report.severity === 'high'
                    ? 'border-orange-500/50 bg-orange-500/5'
                    : 'border-white/10 hover:border-red-400/30'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className={`w-12 h-12 bg-gradient-to-br ${
                    report.severity === 'critical' ? 'from-red-500 to-pink-500' :
                    report.severity === 'high' ? 'from-orange-500 to-red-500' :
                    report.severity === 'medium' ? 'from-yellow-500 to-orange-500' :
                    'from-green-500 to-teal-500'
                  } rounded-xl flex items-center justify-center`}>
                    <ViolationIcon className="w-6 h-6 text-white" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-white mb-1">
                          {report.violation_type.replace('_', ' ').toUpperCase()}
                        </h3>
                        <p className="text-gray-300 text-sm mb-2 line-clamp-2">
                          {report.description}
                        </p>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-400 mb-3">
                          <span className="flex items-center">
                            <User className="w-4 h-4 mr-1" />
                            {language === 'ar' ? 'مبلغ:' : 'Reporter:'} {reporterName}
                          </span>
                          <span className="flex items-center">
                            <UserX className="w-4 h-4 mr-1" />
                            {language === 'ar' ? 'المبلغ عنه:' : 'Reported:'} {reportedUserName}
                          </span>
                          <span className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {formatDateTime(report.created_at)}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <span className={`px-3 py-1 rounded-lg text-sm font-medium border ${getSeverityColor(report.severity)}`}>
                            {report.severity} {language === 'ar' ? 'خطورة' : 'severity'}
                          </span>
                          
                          <span className={`px-3 py-1 rounded-lg text-sm font-medium ${getStatusColor(report.status)}`}>
                            {report.status}
                          </span>
                          
                          {report.assigned_monitor && (
                            <span className="text-sm text-purple-400">
                              {language === 'ar' ? 'مُعيّن لـ' : 'Assigned to'} {report.assigned_monitor.first_name}
                            </span>
                          )}
                          
                          {report.internal_notes && report.internal_notes.length > 0 && (
                            <span className="flex items-center text-sm text-blue-400">
                              <FileText className="w-4 h-4 mr-1" />
                              {report.internal_notes.length} {language === 'ar' ? 'ملاحظة' : 'notes'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setSelectedReport(report);
                      setShowDetailModal(true);
                    }}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    <span>{language === 'ar' ? 'عرض' : 'View'}</span>
                  </motion.button>
                  
                  <button
                    onClick={() => {
                      setSelectedReport(report);
                      setShowNoteModal(true);
                    }}
                    className="p-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
                    title={language === 'ar' ? 'إضافة ملاحظة' : 'Add note'}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  
                  <button className="p-2 rounded-lg bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {filteredReports.length === 0 && (
        <motion.div
          variants={itemVariants}
          className="text-center py-12"
        >
          <CheckCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">
            {language === 'ar' ? 'لا توجد تقارير' : 'No Reports Found'}
          </h3>
          <p className="text-gray-500">
            {language === 'ar' ? 'لا توجد تقارير تطابق المعايير المحددة' : 'No reports match the selected criteria'}
          </p>
        </motion.div>
      )}

      {/* Report Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedReport && (
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
              className="glassmorphism rounded-2xl p-6 border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">
                  {language === 'ar' ? 'تفاصيل التقرير' : 'Report Details'}
                </h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 rounded-lg bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Report Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {language === 'ar' ? 'نوع المخالفة' : 'Violation Type'}
                    </label>
                    <div className="p-3 bg-white/5 rounded-lg text-white">
                      {selectedReport.violation_type}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {language === 'ar' ? 'مستوى الخطورة' : 'Severity'}
                    </label>
                    <div className={`p-3 rounded-lg text-sm font-medium ${getSeverityColor(selectedReport.severity)}`}>
                      {selectedReport.severity}
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {language === 'ar' ? 'الوصف' : 'Description'}
                  </label>
                  <div className="p-4 bg-white/5 rounded-lg text-white">
                    {selectedReport.description}
                  </div>
                </div>
                
                {/* Status Update */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {language === 'ar' ? 'تحديث الحالة' : 'Update Status'}
                  </label>
                  <div className="flex items-center space-x-2">
                    {['open', 'investigating', 'resolved', 'closed'].map(status => (
                      <button
                        key={status}
                        onClick={() => handleUpdateStatus(selectedReport.id, status)}
                        disabled={processing || selectedReport.status === status}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          selectedReport.status === status
                            ? 'bg-purple-500/30 text-purple-300'
                            : 'bg-white/10 text-gray-300 hover:bg-white/20'
                        } disabled:opacity-50`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Internal Notes */}
                {selectedReport.internal_notes && selectedReport.internal_notes.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {language === 'ar' ? 'الملاحظات الداخلية' : 'Internal Notes'}
                    </label>
                    <div className="space-y-2">
                      {selectedReport.internal_notes.map((note, index) => (
                        <div key={index} className="p-3 bg-white/5 rounded-lg">
                          <p className="text-white text-sm">{note.note}</p>
                          <p className="text-gray-400 text-xs mt-1">
                            {formatDateTime(note.created_at)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Note Modal */}
      <AnimatePresence>
        {showNoteModal && selectedReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowNoteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glassmorphism rounded-2xl p-6 border border-white/10 max-w-md w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">
                  {language === 'ar' ? 'إضافة ملاحظة داخلية' : 'Add Internal Note'}
                </h3>
                <button
                  onClick={() => setShowNoteModal(false)}
                  className="p-2 rounded-lg bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {language === 'ar' ? 'الملاحظة' : 'Note'}
                  </label>
                  <textarea
                    value={internalNote}
                    onChange={(e) => setInternalNote(e.target.value)}
                    placeholder={language === 'ar' ? 'أدخل ملاحظة داخلية...' : 'Enter internal note...'}
                    rows={4}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400/50 transition-colors resize-none"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-3 mt-6">
                <button
                  onClick={() => setShowNoteModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={handleAddNote}
                  disabled={!internalNote.trim() || processing}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors disabled:opacity-50"
                >
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

export default MonitorReports; 