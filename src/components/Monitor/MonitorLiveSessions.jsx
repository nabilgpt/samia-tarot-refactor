import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Video, 
  Phone, 
  Eye, 
  Flag,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Users,
  Clock,
  AlertTriangle,
  Shield,
  Monitor,
  MessageSquare,
  MoreHorizontal,
  Search,
  Filter,
  User,
  Calendar,
  Mic,
  MicOff,
  X
} from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { MonitorAPI } from '../../api/monitorApi';

const MonitorLiveSessions = ({ onStatsUpdate }) => {
  const { t } = useTranslation();
  const { language, showSuccess, showError } = useUI();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSession, setSelectedSession] = useState(null);
  const [monitoringSession, setMonitoringSession] = useState(null);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [flagSeverity, setFlagSeverity] = useState('medium');

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
    loadActiveSessions();
    const interval = setInterval(loadActiveSessions, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    filterSessions();
  }, [sessions, searchTerm, statusFilter]);

  const loadActiveSessions = async () => {
    try {
      setLoading(true);
      const response = await MonitorAPI.getActiveSessions();
      
      if (response.success) {
        setSessions(response.data);
      } else {
        // Mock data for demonstration
        const mockSessions = [
          {
            id: '1',
            status: 'in_progress',
            session_type: 'video',
            started_at: '2024-01-25T15:30:00Z',
            duration: 15,
            services: {
              name: 'Tarot Reading',
              name_ar: 'قراءة التاروت',
              type: 'tarot',
              duration: 30
            },
            client: {
              first_name: 'Ahmed',
              last_name: 'Al-Rashid',
              avatar_url: null
            },
            reader: {
              first_name: 'Samia',
              last_name: 'Al-Mystique',
              avatar_url: null
            },
            session_data: {
              quality: 'good',
              participants_count: 2,
              audio_enabled: true,
              video_enabled: true
            },
            flagged_reports: []
          },
          {
            id: '2',
            status: 'active',
            session_type: 'audio',
            started_at: '2024-01-25T15:15:00Z',
            duration: 30,
            services: {
              name: 'Astrology Consultation',
              name_ar: 'استشارة فلكية',
              type: 'astrology',
              duration: 45
            },
            client: {
              first_name: 'Fatima',
              last_name: 'Al-Zahra',
              avatar_url: null
            },
            reader: {
              first_name: 'Omar',
              last_name: 'Al-Kindi',
              avatar_url: null
            },
            session_data: {
              quality: 'excellent',
              participants_count: 2,
              audio_enabled: true,
              video_enabled: false
            },
            flagged_reports: []
          },
          {
            id: '3',
            status: 'in_progress',
            session_type: 'video',
            started_at: '2024-01-25T15:00:00Z',
            duration: 45,
            services: {
              name: 'Palm Reading',
              name_ar: 'قراءة الكف',
              type: 'palmistry',
              duration: 30
            },
            client: {
              first_name: 'Khalid',
              last_name: 'Al-Mansouri',
              avatar_url: null
            },
            reader: {
              first_name: 'Layla',
              last_name: 'Al-Fares',
              avatar_url: null
            },
            session_data: {
              quality: 'fair',
              participants_count: 2,
              audio_enabled: true,
              video_enabled: true
            },
            flagged_reports: [
              {
                id: 'flag1',
                reason: 'Inappropriate content detected',
                severity: 'high',
                created_at: '2024-01-25T15:30:00Z'
              }
            ]
          }
        ];
        setSessions(mockSessions);
      }
    } catch (error) {
      console.error('Error loading active sessions:', error);
      showError(language === 'ar' ? 'فشل في تحميل الجلسات النشطة' : 'Failed to load active sessions');
    } finally {
      setLoading(false);
    }
  };

  const filterSessions = () => {
    let filtered = sessions;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(session => {
        const serviceName = language === 'ar' ? session.services?.name_ar : session.services?.name;
        const clientName = `${session.client?.first_name} ${session.client?.last_name}`;
        const readerName = `${session.reader?.first_name} ${session.reader?.last_name}`;
        
        return serviceName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
               readerName.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(session => session.status === statusFilter);
    }

    setFilteredSessions(filtered);
  };

  const getSessionDuration = (startedAt) => {
    const start = new Date(startedAt);
    const now = new Date();
    const diffMinutes = Math.floor((now - start) / (1000 * 60));
    return diffMinutes;
  };

  const getQualityColor = (quality) => {
    switch (quality) {
      case 'excellent': return 'text-green-400 bg-green-500/20';
      case 'good': return 'text-blue-400 bg-blue-500/20';
      case 'fair': return 'text-yellow-400 bg-yellow-500/20';
      case 'poor': return 'text-red-400 bg-red-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const handleJoinSession = async (sessionId) => {
    try {
      setMonitoringSession(sessionId);
      const response = await MonitorAPI.joinSessionAsMonitor(sessionId, 'current_monitor_id');
      
      if (response.success) {
        showSuccess(language === 'ar' ? 'انضممت للجلسة كمراقب' : 'Joined session as monitor');
        // In a real implementation, this would open the session monitoring interface
        console.log('Monitoring session:', sessionId);
      } else {
        showError(response.error || (language === 'ar' ? 'فشل في الانضمام للجلسة' : 'Failed to join session'));
        setMonitoringSession(null);
      }
    } catch (error) {
      showError(language === 'ar' ? 'فشل في الانضمام للجلسة' : 'Failed to join session');
      setMonitoringSession(null);
    }
  };

  const handleFlagSession = async () => {
    if (!selectedSession || !flagReason) return;

    try {
      const response = await MonitorAPI.flagSession(selectedSession.id, flagReason, flagSeverity);
      
      if (response.success) {
        showSuccess(language === 'ar' ? 'تم الإبلاغ عن الجلسة' : 'Session flagged successfully');
        setShowFlagModal(false);
        setFlagReason('');
        setSelectedSession(null);
        await loadActiveSessions();
        onStatsUpdate?.();
      } else {
        showError(response.error || (language === 'ar' ? 'فشل في الإبلاغ عن الجلسة' : 'Failed to flag session'));
      }
    } catch (error) {
      showError(language === 'ar' ? 'فشل في الإبلاغ عن الجلسة' : 'Failed to flag session');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
          <div className="absolute inset-0 rounded-full border-2 border-purple-400/20"></div>
        </div>
        <span className="ml-4 text-gray-300">
          {language === 'ar' ? 'جاري تحميل الجلسات...' : 'Loading sessions...'}
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
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
            {language === 'ar' ? 'الجلسات المباشرة' : 'Live Sessions Monitor'}
          </h2>
          <p className="text-gray-400 mt-1">
            {language === 'ar' ? 'مراقبة الجلسات الصوتية والمرئية النشطة' : 'Monitor active audio and video sessions'}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-3 py-2 bg-green-500/20 rounded-lg">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-green-400 text-sm font-medium">
              {filteredSessions.length} {language === 'ar' ? 'جلسة نشطة' : 'Active'}
            </span>
          </div>
          
          <button
            onClick={loadActiveSessions}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors"
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
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={language === 'ar' ? 'البحث في الجلسات...' : 'Search sessions...'}
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
            <option value="in_progress">{language === 'ar' ? 'قيد التقدم' : 'In Progress'}</option>
            <option value="active">{language === 'ar' ? 'نشط' : 'Active'}</option>
          </select>
        </div>
      </motion.div>

      {/* Sessions List */}
      <motion.div
        variants={containerVariants}
        className="space-y-4"
      >
        {filteredSessions.map((session) => {
          const serviceName = language === 'ar' ? session.services?.name_ar : session.services?.name;
          const clientName = `${session.client?.first_name} ${session.client?.last_name}`;
          const readerName = `${session.reader?.first_name} ${session.reader?.last_name}`;
          const duration = getSessionDuration(session.started_at);
          const isMonitoring = monitoringSession === session.id;
          const hasFlaggedReports = session.flagged_reports?.length > 0;
          
          return (
            <motion.div
              key={session.id}
              variants={itemVariants}
              whileHover={{ scale: 1.01, y: -2 }}
              className={`glassmorphism rounded-2xl p-6 border transition-all duration-300 ${
                hasFlaggedReports 
                  ? 'border-red-500/50 bg-red-500/5' 
                  : isMonitoring 
                    ? 'border-purple-500/50 bg-purple-500/5'
                    : 'border-white/10 hover:border-purple-400/30'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                    session.session_type === 'video' 
                      ? 'bg-gradient-to-br from-blue-500 to-cyan-500' 
                      : 'bg-gradient-to-br from-green-500 to-teal-500'
                  }`}>
                    {session.session_type === 'video' ? (
                      <Video className="w-8 h-8 text-white" />
                    ) : (
                      <Phone className="w-8 h-8 text-white" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-1">
                          {serviceName}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-400 mb-2">
                          <span className="flex items-center">
                            <User className="w-4 h-4 mr-1" />
                            {language === 'ar' ? 'عميل:' : 'Client:'} {clientName}
                          </span>
                          <span className="flex items-center">
                            <Shield className="w-4 h-4 mr-1" />
                            {language === 'ar' ? 'قارئ:' : 'Reader:'} {readerName}
                          </span>
                          <span className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {duration} {language === 'ar' ? 'دقيقة' : 'min'}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-3 mb-3">
                          <span className={`px-3 py-1 rounded-lg text-sm font-medium ${getQualityColor(session.session_data?.quality)}`}>
                            {session.session_data?.quality || 'unknown'} {language === 'ar' ? 'جودة' : 'quality'}
                          </span>
                          
                          <span className="flex items-center space-x-1 text-gray-400 text-sm">
                            <Users className="w-4 h-4" />
                            <span>{session.session_data?.participants_count || 0}</span>
                          </span>
                          
                          {session.session_data?.audio_enabled && (
                            <Mic className="w-4 h-4 text-green-400" />
                          )}
                          {!session.session_data?.audio_enabled && (
                            <MicOff className="w-4 h-4 text-red-400" />
                          )}
                          
                          {session.session_data?.video_enabled && (
                            <Video className="w-4 h-4 text-blue-400" />
                          )}
                          
                          {hasFlaggedReports && (
                            <div className="flex items-center space-x-1">
                              <Flag className="w-4 h-4 text-red-400" />
                              <span className="text-red-400 text-sm font-medium">
                                {session.flagged_reports.length} {language === 'ar' ? 'تقرير' : 'reports'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  {!isMonitoring ? (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleJoinSession(session.id)}
                      className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      <span>{language === 'ar' ? 'مراقبة' : 'Monitor'}</span>
                    </motion.button>
                  ) : (
                    <div className="flex items-center space-x-2 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg">
                      <Eye className="w-4 h-4 animate-pulse" />
                      <span>{language === 'ar' ? 'تحت المراقبة' : 'Monitoring'}</span>
                    </div>
                  )}
                  
                  <button
                    onClick={() => {
                      setSelectedSession(session);
                      setShowFlagModal(true);
                    }}
                    className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                    title={language === 'ar' ? 'الإبلاغ عن مخالفة' : 'Flag violation'}
                  >
                    <Flag className="w-4 h-4" />
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

      {filteredSessions.length === 0 && (
        <motion.div
          variants={itemVariants}
          className="text-center py-12"
        >
          <Monitor className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">
            {language === 'ar' ? 'لا توجد جلسات نشطة' : 'No Active Sessions'}
          </h3>
          <p className="text-gray-500">
            {language === 'ar' ? 'لا توجد جلسات نشطة للمراقبة حالياً' : 'No active sessions to monitor at the moment'}
          </p>
        </motion.div>
      )}

      {/* Flag Session Modal */}
      <AnimatePresence>
        {showFlagModal && selectedSession && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowFlagModal(false)}
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
                  {language === 'ar' ? 'الإبلاغ عن مخالفة' : 'Flag Session'}
                </h3>
                <button
                  onClick={() => setShowFlagModal(false)}
                  className="p-2 rounded-lg bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {language === 'ar' ? 'مستوى الخطورة' : 'Severity Level'}
                  </label>
                  <select
                    value={flagSeverity}
                    onChange={(e) => setFlagSeverity(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-400/50 transition-colors"
                  >
                    <option value="low">{language === 'ar' ? 'منخفض' : 'Low'}</option>
                    <option value="medium">{language === 'ar' ? 'متوسط' : 'Medium'}</option>
                    <option value="high">{language === 'ar' ? 'عالي' : 'High'}</option>
                    <option value="critical">{language === 'ar' ? 'خطير' : 'Critical'}</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {language === 'ar' ? 'سبب الإبلاغ' : 'Reason for Flagging'}
                  </label>
                  <textarea
                    value={flagReason}
                    onChange={(e) => setFlagReason(e.target.value)}
                    placeholder={language === 'ar' ? 'اشرح سبب الإبلاغ عن هذه الجلسة...' : 'Explain why you are flagging this session...'}
                    rows={4}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400/50 transition-colors resize-none"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-3 mt-6">
                <button
                  onClick={() => setShowFlagModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={handleFlagSession}
                  disabled={!flagReason}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg hover:from-red-600 hover:to-pink-600 transition-colors disabled:opacity-50"
                >
                  {language === 'ar' ? 'إبلاغ' : 'Flag Session'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MonitorLiveSessions; 