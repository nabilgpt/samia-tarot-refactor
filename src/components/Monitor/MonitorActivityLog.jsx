import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Activity, 
  Clock, 
  User,
  Search,
  Filter,
  Calendar,
  Download,
  Eye,
  CheckCircle,
  Flag,
  MessageSquare,
  Settings
} from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { MonitorAPI } from '../../api/monitorApi';

const MonitorActivityLog = () => {
  const { t } = useTranslation();
  const { language, showSuccess, showError } = useUI();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('today');

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
    loadActivityLogs();
  }, [actionFilter, dateFilter]);

  useEffect(() => {
    filterLogs();
  }, [logs, searchTerm]);

  const loadActivityLogs = async () => {
    try {
      setLoading(true);
      const filters = {
        action: actionFilter !== 'all' ? actionFilter : undefined,
        from_date: getDateFilterValue(dateFilter)
      };
      
      const response = await MonitorAPI.getActivityLogs(filters);
      
      if (response.success) {
        setLogs(response.data);
      } else {
        // Mock data for demonstration
        const mockLogs = [
          {
            id: '1',
            action: 'session_monitor_join',
            description: 'Joined session 12345 for monitoring',
            created_at: '2024-01-25T15:30:00Z',
            ip_address: '192.168.1.100',
            user_agent: 'Mozilla/5.0...',
            monitor: {
              first_name: 'Current',
              last_name: 'Monitor'
            }
          },
          {
            id: '2',
            action: 'session_flagged',
            description: 'Flagged session 67890: Inappropriate content detected',
            created_at: '2024-01-25T15:15:00Z',
            ip_address: '192.168.1.100',
            user_agent: 'Mozilla/5.0...',
            monitor: {
              first_name: 'Current',
              last_name: 'Monitor'
            }
          },
          {
            id: '3',
            action: 'approval_processed',
            description: 'approve message 123: Content reviewed and approved',
            created_at: '2024-01-25T14:45:00Z',
            ip_address: '192.168.1.100',
            user_agent: 'Mozilla/5.0...',
            monitor: {
              first_name: 'Current',
              last_name: 'Monitor'
            }
          }
        ];
        setLogs(mockLogs);
      }
    } catch (error) {
      console.error('Error loading activity logs:', error);
      showError(language === 'ar' ? 'فشل في تحميل سجل النشاط' : 'Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    if (!searchTerm) {
      setFilteredLogs(logs);
      return;
    }
    
    const filtered = logs.filter(log => 
      log.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    setFilteredLogs(filtered);
  };

  const getDateFilterValue = (filter) => {
    const now = new Date();
    switch (filter) {
      case 'today':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      case 'week': {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return weekAgo.toISOString();
      }
      case 'month': {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return monthAgo.toISOString();
      }
      default:
        return undefined;
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'session_monitor_join': return Eye;
      case 'session_flagged': return Flag;
      case 'approval_processed': return CheckCircle;
      case 'report_updated': return MessageSquare;
      case 'note_added': return MessageSquare;
      case 'escalation_created': return Flag;
      default: return Activity;
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'session_monitor_join': return 'text-blue-400 bg-blue-500/20';
      case 'session_flagged': return 'text-red-400 bg-red-500/20';
      case 'approval_processed': return 'text-green-400 bg-green-500/20';
      case 'report_updated': return 'text-yellow-400 bg-yellow-500/20';
      case 'note_added': return 'text-purple-400 bg-purple-500/20';
      case 'escalation_created': return 'text-orange-400 bg-orange-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
          <div className="absolute inset-0 rounded-full border-2 border-cyan-400/20"></div>
        </div>
        <span className="ml-4 text-gray-300">
          {language === 'ar' ? 'جاري تحميل سجل النشاط...' : 'Loading activity logs...'}
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
          <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
            {language === 'ar' ? 'سجل النشاط' : 'Activity Log'}
          </h2>
          <p className="text-gray-400 mt-1">
            {language === 'ar' ? 'تتبع جميع أنشطة المراقبة والإجراءات' : 'Track all monitoring activities and actions'}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={loadActivityLogs}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-colors"
          >
            {language === 'ar' ? 'تحديث' : 'Refresh'}
          </button>
          
          <button className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-colors">
            <Download className="w-4 h-4" />
            <span>{language === 'ar' ? 'تصدير' : 'Export'}</span>
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
                placeholder={language === 'ar' ? 'البحث في السجل...' : 'Search logs...'}
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400/50 transition-colors"
              />
            </div>
          </div>
          
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-cyan-400/50 transition-colors"
          >
            <option value="all">{language === 'ar' ? 'كل الإجراءات' : 'All Actions'}</option>
            <option value="session_monitor_join">{language === 'ar' ? 'مراقبة الجلسات' : 'Session Monitoring'}</option>
            <option value="session_flagged">{language === 'ar' ? 'الإبلاغ' : 'Flagging'}</option>
            <option value="approval_processed">{language === 'ar' ? 'معالجة الموافقات' : 'Approval Processing'}</option>
            <option value="report_updated">{language === 'ar' ? 'تحديث التقارير' : 'Report Updates'}</option>
          </select>
          
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-cyan-400/50 transition-colors"
          >
            <option value="today">{language === 'ar' ? 'اليوم' : 'Today'}</option>
            <option value="week">{language === 'ar' ? 'هذا الأسبوع' : 'This Week'}</option>
            <option value="month">{language === 'ar' ? 'هذا الشهر' : 'This Month'}</option>
            <option value="all">{language === 'ar' ? 'الكل' : 'All Time'}</option>
          </select>
        </div>
      </motion.div>

      {/* Activity Log */}
      <motion.div
        variants={containerVariants}
        className="space-y-3"
      >
        {filteredLogs.map((log) => {
          const ActionIcon = getActionIcon(log.action);
          
          return (
            <motion.div
              key={log.id}
              variants={itemVariants}
              whileHover={{ scale: 1.01, x: 5 }}
              className="glassmorphism rounded-xl p-4 border border-white/10 hover:border-cyan-400/30 transition-all duration-300"
            >
              <div className="flex items-start space-x-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getActionColor(log.action)}`}>
                  <ActionIcon className="w-5 h-5" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white font-medium mb-1">
                        {log.description}
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-gray-400">
                        <span className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {formatDateTime(log.created_at)}
                        </span>
                        <span className="flex items-center">
                          <User className="w-4 h-4 mr-1" />
                          {log.monitor?.first_name} {log.monitor?.last_name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {log.ip_address}
                        </span>
                      </div>
                    </div>
                    
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium ${getActionColor(log.action)}`}>
                      {log.action.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {filteredLogs.length === 0 && (
        <motion.div
          variants={itemVariants}
          className="text-center py-12"
        >
          <Activity className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">
            {language === 'ar' ? 'لا توجد أنشطة' : 'No Activity Found'}
          </h3>
          <p className="text-gray-500">
            {language === 'ar' ? 'لا توجد أنشطة تطابق المعايير المحددة' : 'No activities match the selected criteria'}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default MonitorActivityLog; 