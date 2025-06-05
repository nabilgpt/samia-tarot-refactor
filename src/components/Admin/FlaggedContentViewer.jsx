import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Flag, 
  AlertTriangle, 
  Eye, 
  MessageCircle, 
  Phone, 
  Video, 
  Clock, 
  User, 
  Filter, 
  Search, 
  Download, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Calendar,
  Volume2,
  FileText,
  Zap,
  Shield,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { supabase } from '../../lib/supabase';
import AIWatchdogService from '../../services/aiWatchdogService';
import MonitoringService from '../../services/monitoringService';
import CosmicCard from '../UI/CosmicCard';
import CosmicButton from '../UI/CosmicButton';

const FlaggedContentViewer = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { language, showSuccess, showError } = useUI();
  const [flaggedContent, setFlaggedContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: 'all', // all, call, chat, voice
    severity: 'all', // all, critical, high, medium, low
    timeRange: 'all', // all, today, week, month
    status: 'all', // all, reviewed, unreviewed
    user: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContent, setSelectedContent] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    loadFlaggedContent();
  }, [filters]);

  const loadFlaggedContent = async () => {
    try {
      setLoading(true);
      
      // Get flagged call recordings
      let callQuery = supabase
        .from('call_recordings')
        .select(`
          *,
          client:profiles!call_recordings_client_id_fkey(
            first_name,
            last_name,
            avatar_url
          ),
          reader:profiles!call_recordings_reader_id_fkey(
            first_name,
            last_name,
            avatar_url
          ),
          booking:bookings(
            service_type,
            status
          )
        `)
        .or('ai_alerted.eq.true,monitor_flagged.eq.true')
        .order('flagged_at', { ascending: false });

      // Get flagged chat messages
      let chatQuery = supabase
        .from('chat_monitoring')
        .select(`
          *,
          client:profiles!chat_monitoring_client_id_fkey(
            first_name,
            last_name,
            avatar_url
          ),
          reader:profiles!chat_monitoring_reader_id_fkey(
            first_name,
            last_name,
            avatar_url
          ),
          message:messages(
            content,
            type,
            voice_url
          )
        `)
        .or('ai_alerted.eq.true,monitor_flagged.eq.true')
        .order('reviewed_at', { ascending: false });

      // Apply filters
      if (filters.timeRange !== 'all') {
        const timeFilter = getTimeFilter(filters.timeRange);
        callQuery = callQuery.gte('flagged_at', timeFilter);
        chatQuery = chatQuery.gte('created_at', timeFilter);
      }

      const [callResult, chatResult] = await Promise.all([
        callQuery,
        chatQuery
      ]);

      if (callResult.error || chatResult.error) {
        throw callResult.error || chatResult.error;
      }

      // Combine and format content
      const content = [
        ...(callResult.data || []).map(recording => ({
          id: recording.id,
          type: 'call',
          subType: recording.call_type,
          client: recording.client,
          reader: recording.reader,
          booking: recording.booking,
          aiAlerted: recording.ai_alerted,
          monitorFlagged: recording.monitor_flagged,
          emergencyFlagged: recording.emergency_flagged,
          flaggedAt: recording.flagged_at,
          flaggedBy: recording.flagged_by,
          notes: recording.monitor_notes,
          reviewStatus: recording.monitor_flagged ? 'reviewed' : 'unreviewed',
          severity: determineSeverity(recording),
          riskScore: calculateRiskScore(recording),
          duration: recording.duration_seconds,
          recordingUrl: recording.recording_url,
          createdAt: recording.call_start_time
        })),
        ...(chatResult.data || []).map(chat => ({
          id: chat.id,
          type: 'chat',
          subType: chat.message_type,
          client: chat.client,
          reader: chat.reader,
          message: chat.message,
          content: chat.message_content,
          aiAlerted: chat.ai_alerted,
          monitorFlagged: chat.monitor_flagged,
          flaggedAt: chat.reviewed_at,
          flaggedBy: chat.reviewed_by,
          notes: chat.monitor_notes,
          reviewStatus: chat.monitor_reviewed ? 'reviewed' : 'unreviewed',
          severity: determineChatSeverity(chat),
          riskScore: chat.ai_risk_score || 0,
          sessionTag: chat.session_tag,
          emotions: chat.ai_emotions,
          createdAt: chat.created_at
        }))
      ];

      // Apply additional filters
      let filteredContent = content;

      if (filters.type !== 'all') {
        if (filters.type === 'voice') {
          filteredContent = filteredContent.filter(item => 
            (item.type === 'call') || 
            (item.type === 'chat' && item.subType === 'voice')
          );
        } else {
          filteredContent = filteredContent.filter(item => item.type === filters.type);
        }
      }

      if (filters.severity !== 'all') {
        filteredContent = filteredContent.filter(item => item.severity === filters.severity);
      }

      if (filters.status !== 'all') {
        filteredContent = filteredContent.filter(item => item.reviewStatus === filters.status);
      }

      if (searchTerm) {
        filteredContent = filteredContent.filter(item => 
          item.client?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.client?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.reader?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.reader?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.notes?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      // Sort by flagged date
      filteredContent.sort((a, b) => new Date(b.flaggedAt || b.createdAt) - new Date(a.flaggedAt || a.createdAt));

      setFlaggedContent(filteredContent);
    } catch (error) {
      console.error('Error loading flagged content:', error);
      showError('Failed to load flagged content');
    } finally {
      setLoading(false);
    }
  };

  const getTimeFilter = (range) => {
    const now = new Date();
    switch (range) {
      case 'today':
        return new Date(now.setHours(0, 0, 0, 0)).toISOString();
      case 'week':
        return new Date(now.setDate(now.getDate() - 7)).toISOString();
      case 'month':
        return new Date(now.setMonth(now.getMonth() - 1)).toISOString();
      default:
        return null;
    }
  };

  const determineSeverity = (recording) => {
    if (recording.emergency_flagged) return 'critical';
    if (recording.monitor_flagged && recording.ai_alerted) return 'high';
    if (recording.monitor_flagged) return 'medium';
    if (recording.ai_alerted) return 'low';
    return 'low';
  };

  const determineChatSeverity = (chat) => {
    if (chat.session_tag === 'critical') return 'critical';
    if (chat.session_tag === 'suspicious') return 'high';
    if (chat.ai_risk_score > 70) return 'medium';
    return 'low';
  };

  const calculateRiskScore = (recording) => {
    let score = 0;
    if (recording.ai_alerted) score += 30;
    if (recording.monitor_flagged) score += 40;
    if (recording.emergency_flagged) score += 50;
    return Math.min(score, 100);
  };

  const handleReviewContent = async () => {
    try {
      if (!selectedContent || !reviewAction) {
        showError('Please select an action for the review');
        return;
      }

      let result;
      if (selectedContent.type === 'call') {
        result = await MonitoringService.flagContent(user.id, {
          type: 'call_recording',
          targetId: selectedContent.id,
          reason: reviewAction,
          severity: selectedContent.severity,
          notes: reviewNotes
        });
      } else {
        result = await MonitoringService.flagContent(user.id, {
          type: 'chat_message',
          targetId: selectedContent.id,
          reason: reviewAction,
          severity: selectedContent.severity,
          notes: reviewNotes
        });
      }

      if (result.success) {
        showSuccess('Content reviewed successfully');
        setShowReviewModal(false);
        setReviewAction('');
        setReviewNotes('');
        setSelectedContent(null);
        loadFlaggedContent();
      } else {
        showError(result.message);
      }
    } catch (error) {
      console.error('Error reviewing content:', error);
      showError('Failed to review content');
    }
  };

  const handleAIFeedback = async (content, feedback) => {
    try {
      // Find related AI alert
      const { data: alerts, error } = await supabase
        .from('ai_monitoring_alerts')
        .select('id')
        .or(
          content.type === 'call' 
            ? `call_recording_id.eq.${content.id}`
            : `chat_monitoring_id.eq.${content.id}`
        )
        .limit(1);

      if (error) throw error;

      if (alerts && alerts.length > 0) {
        const result = await AIWatchdogService.processAIFeedback(
          alerts[0].id,
          feedback,
          user.id
        );

        if (result.success) {
          showSuccess(`AI feedback recorded: ${feedback}`);
          loadFlaggedContent();
        } else {
          showError('Failed to record AI feedback');
        }
      }
    } catch (error) {
      console.error('Error providing AI feedback:', error);
      showError('Failed to provide AI feedback');
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/20 text-red-300 border-red-400/30';
      case 'high':
        return 'bg-orange-500/20 text-orange-300 border-orange-400/30';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30';
      case 'low':
        return 'bg-blue-500/20 text-blue-300 border-blue-400/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-400/30';
    }
  };

  const getTypeIcon = (type, subType) => {
    if (type === 'call') {
      return subType === 'video' ? (
        <Video className="w-4 h-4" />
      ) : (
        <Phone className="w-4 h-4" />
      );
    } else if (type === 'chat') {
      return subType === 'voice' ? (
        <Volume2 className="w-4 h-4" />
      ) : (
        <MessageCircle className="w-4 h-4" />
      );
    }
    return <FileText className="w-4 h-4" />;
  };

  const formatDateTime = (timestamp) => {
    return new Date(timestamp).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US');
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const criticalCount = flaggedContent.filter(c => c.severity === 'critical').length;
  const unreviewedCount = flaggedContent.filter(c => c.reviewStatus === 'unreviewed').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {language === 'ar' ? 'عارض المحتوى المُعلم' : 'Flagged Content Viewer'}
          </h2>
          <p className="text-gray-400">
            {language === 'ar' 
              ? 'مراجعة وإدارة جميع المحتوى المُعلم بواسطة نظام الذكاء الاصطناعي'
              : 'Review and manage all content flagged by AI monitoring system'
            }
          </p>
        </div>
        
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          {criticalCount > 0 && (
            <div className="flex items-center space-x-2 rtl:space-x-reverse bg-red-500/20 border border-red-400/30 rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-red-300 font-medium">
                {criticalCount} {language === 'ar' ? 'حرج' : 'Critical'}
              </span>
            </div>
          )}
          
          {unreviewedCount > 0 && (
            <div className="flex items-center space-x-2 rtl:space-x-reverse bg-yellow-500/20 border border-yellow-400/30 rounded-lg px-3 py-2">
              <Eye className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-300 font-medium">
                {unreviewedCount} {language === 'ar' ? 'غير مراجع' : 'Unreviewed'}
              </span>
            </div>
          )}
          
          <CosmicButton
            variant="ghost"
            size="sm"
            onClick={loadFlaggedContent}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </CosmicButton>
        </div>
      </div>

      {/* Filters and Search */}
      <CosmicCard className="p-4" variant="glass">
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={language === 'ar' ? 'البحث في المحتوى المُعلم...' : 'Search flagged content...'}
              className="w-full pl-10 rtl:pl-3 rtl:pr-10 pr-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400/50"
            />
          </div>

          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {language === 'ar' ? 'النوع' : 'Type'}
              </label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({...filters, type: e.target.value})}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-400/50"
              >
                <option value="all">{language === 'ar' ? 'الكل' : 'All'}</option>
                <option value="call">{language === 'ar' ? 'مكالمات' : 'Calls'}</option>
                <option value="chat">{language === 'ar' ? 'محادثات' : 'Chat'}</option>
                <option value="voice">{language === 'ar' ? 'رسائل صوتية' : 'Voice Messages'}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {language === 'ar' ? 'الخطورة' : 'Severity'}
              </label>
              <select
                value={filters.severity}
                onChange={(e) => setFilters({...filters, severity: e.target.value})}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-400/50"
              >
                <option value="all">{language === 'ar' ? 'الكل' : 'All'}</option>
                <option value="critical">{language === 'ar' ? 'حرج' : 'Critical'}</option>
                <option value="high">{language === 'ar' ? 'عالي' : 'High'}</option>
                <option value="medium">{language === 'ar' ? 'متوسط' : 'Medium'}</option>
                <option value="low">{language === 'ar' ? 'منخفض' : 'Low'}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {language === 'ar' ? 'الفترة الزمنية' : 'Time Range'}
              </label>
              <select
                value={filters.timeRange}
                onChange={(e) => setFilters({...filters, timeRange: e.target.value})}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-400/50"
              >
                <option value="all">{language === 'ar' ? 'الكل' : 'All Time'}</option>
                <option value="today">{language === 'ar' ? 'اليوم' : 'Today'}</option>
                <option value="week">{language === 'ar' ? 'هذا الأسبوع' : 'This Week'}</option>
                <option value="month">{language === 'ar' ? 'هذا الشهر' : 'This Month'}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {language === 'ar' ? 'حالة المراجعة' : 'Review Status'}
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-400/50"
              >
                <option value="all">{language === 'ar' ? 'الكل' : 'All'}</option>
                <option value="reviewed">{language === 'ar' ? 'مراجع' : 'Reviewed'}</option>
                <option value="unreviewed">{language === 'ar' ? 'غير مراجع' : 'Unreviewed'}</option>
              </select>
            </div>

            <div className="flex items-end">
              <CosmicButton
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilters({
                    type: 'all',
                    severity: 'all',
                    timeRange: 'all',
                    status: 'all',
                    user: ''
                  });
                  setSearchTerm('');
                }}
                className="w-full"
              >
                {language === 'ar' ? 'إعادة تعيين' : 'Reset'}
              </CosmicButton>
            </div>
          </div>
        </div>
      </CosmicCard>

      {/* Content List */}
      <div className="space-y-4">
        <AnimatePresence>
          {loading ? (
            <CosmicCard className="p-6" variant="glass">
              <div className="flex items-center justify-center">
                <RefreshCw className="w-6 h-6 animate-spin text-gold-400" />
                <span className="ml-2 text-gray-400">
                  {language === 'ar' ? 'جاري التحميل...' : 'Loading flagged content...'}
                </span>
              </div>
            </CosmicCard>
          ) : flaggedContent.length === 0 ? (
            <CosmicCard className="p-8" variant="glass">
              <div className="text-center">
                <Flag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">
                  {language === 'ar' ? 'لا يوجد محتوى مُعلم' : 'No Flagged Content'}
                </h3>
                <p className="text-gray-400">
                  {language === 'ar' 
                    ? 'لا يوجد محتوى مُعلم يطابق المعايير المحددة'
                    : 'No flagged content matches the selected criteria'
                  }
                </p>
              </div>
            </CosmicCard>
          ) : (
            flaggedContent.map((content) => (
              <motion.div
                key={content.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <CosmicCard 
                  className={`p-6 ${content.severity === 'critical' ? 'border-red-400/50' : ''}`} 
                  variant="glass"
                  glow={content.severity === 'critical'}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 rtl:space-x-reverse flex-1">
                      {/* Content Type Icon */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getSeverityColor(content.severity)}`}>
                        {getTypeIcon(content.type, content.subType)}
                      </div>

                      {/* Content Details */}
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 rtl:space-x-reverse mb-2">
                          <h3 className="text-lg font-semibold text-white">
                            {content.client?.first_name} {content.client?.last_name}
                            <span className="text-gray-400 mx-2">→</span>
                            {content.reader?.first_name} {content.reader?.last_name}
                          </h3>
                          
                          {/* Severity Badge */}
                          <div className={`px-2 py-1 rounded-lg border text-xs font-medium ${getSeverityColor(content.severity)}`}>
                            {content.severity}
                          </div>

                          {/* Type Badge */}
                          <div className="px-2 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-400/30 text-xs font-medium">
                            {content.type} {content.subType && `(${content.subType})`}
                          </div>

                          {/* Status Badge */}
                          <div className={`px-2 py-1 rounded-lg border text-xs font-medium ${
                            content.reviewStatus === 'reviewed' 
                              ? 'bg-green-500/20 text-green-300 border-green-400/30'
                              : 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30'
                          }`}>
                            {content.reviewStatus}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-400 mb-3">
                          <div className="flex items-center space-x-1 rtl:space-x-reverse">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDateTime(content.flaggedAt || content.createdAt)}</span>
                          </div>
                          
                          {content.duration && (
                            <div className="flex items-center space-x-1 rtl:space-x-reverse">
                              <Clock className="w-4 h-4" />
                              <span>{formatDuration(content.duration)}</span>
                            </div>
                          )}

                          {content.riskScore > 0 && (
                            <div className="flex items-center space-x-1 rtl:space-x-reverse">
                              <Zap className="w-4 h-4" />
                              <span>Risk: {content.riskScore}%</span>
                            </div>
                          )}
                        </div>

                        {/* Content Preview */}
                        {content.content && (
                          <div className="mt-3 p-3 bg-dark-700/50 border border-white/10 rounded-lg">
                            <p className="text-gray-300 text-sm line-clamp-3">
                              <strong>Content:</strong> {content.content}
                            </p>
                          </div>
                        )}

                        {/* Monitor Notes */}
                        {content.notes && (
                          <div className="mt-3 p-3 bg-blue-900/30 border border-blue-500/30 rounded-lg">
                            <p className="text-blue-300 text-sm">
                              <strong>Monitor Notes:</strong> {content.notes}
                            </p>
                          </div>
                        )}

                        {/* AI Emotions */}
                        {content.emotions && Object.keys(content.emotions).length > 0 && (
                          <div className="mt-3 p-3 bg-purple-900/30 border border-purple-500/30 rounded-lg">
                            <p className="text-purple-300 text-sm">
                              <strong>AI Emotions:</strong> {Object.entries(content.emotions)
                                .filter(([key, value]) => value > 0.1)
                                .map(([key, value]) => `${key}: ${Math.round(value * 100)}%`)
                                .join(', ')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      {content.aiAlerted && (
                        <>
                          <CosmicButton
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAIFeedback(content, 'accurate')}
                            title={language === 'ar' ? 'تنبيه دقيق' : 'Accurate Alert'}
                          >
                            <ThumbsUp className="w-4 h-4" />
                          </CosmicButton>

                          <CosmicButton
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAIFeedback(content, 'false_positive')}
                            title={language === 'ar' ? 'تنبيه خاطئ' : 'False Positive'}
                          >
                            <ThumbsDown className="w-4 h-4" />
                          </CosmicButton>
                        </>
                      )}

                      <CosmicButton
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedContent(content);
                          setShowReviewModal(true);
                        }}
                        title={language === 'ar' ? 'مراجعة المحتوى' : 'Review Content'}
                      >
                        <Eye className="w-4 h-4" />
                      </CosmicButton>

                      {content.recordingUrl && (
                        <CosmicButton
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(content.recordingUrl, '_blank')}
                          title={language === 'ar' ? 'تحميل التسجيل' : 'Download Recording'}
                        >
                          <Download className="w-4 h-4" />
                        </CosmicButton>
                      )}
                    </div>
                  </div>
                </CosmicCard>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Review Content Modal */}
      <AnimatePresence>
        {showReviewModal && selectedContent && (
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-dark-800/95 backdrop-blur-xl border border-gold-400/20 rounded-2xl p-6 max-w-lg w-full shadow-2xl"
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">
                  {language === 'ar' ? 'مراجعة المحتوى' : 'Review Content'}
                </h3>
                <CosmicButton
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowReviewModal(false);
                    setReviewAction('');
                    setReviewNotes('');
                    setSelectedContent(null);
                  }}
                >
                  ×
                </CosmicButton>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {language === 'ar' ? 'إجراء المراجعة' : 'Review Action'}
                  </label>
                  <select
                    value={reviewAction}
                    onChange={(e) => setReviewAction(e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-400/50"
                  >
                    <option value="">{language === 'ar' ? 'اختر إجراء' : 'Select Action'}</option>
                    <option value="approved">{language === 'ar' ? 'موافق عليه' : 'Approved'}</option>
                    <option value="warning_issued">{language === 'ar' ? 'تحذير صادر' : 'Warning Issued'}</option>
                    <option value="content_removed">{language === 'ar' ? 'المحتوى محذوف' : 'Content Removed'}</option>
                    <option value="user_suspended">{language === 'ar' ? 'المستخدم موقوف' : 'User Suspended'}</option>
                    <option value="escalated">{language === 'ar' ? 'تم التصعيد' : 'Escalated'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {language === 'ar' ? 'ملاحظات المراجعة' : 'Review Notes'}
                  </label>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder={language === 'ar' ? 'اكتب ملاحظات حول مراجعة هذا المحتوى...' : 'Enter notes about reviewing this content...'}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-400/50"
                    rows={4}
                  />
                </div>

                <div className="flex space-x-3 rtl:space-x-reverse">
                  <CosmicButton
                    variant="ghost"
                    className="flex-1"
                    onClick={() => {
                      setShowReviewModal(false);
                      setReviewAction('');
                      setReviewNotes('');
                      setSelectedContent(null);
                    }}
                  >
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </CosmicButton>
                  <CosmicButton
                    variant="primary"
                    className="flex-1"
                    onClick={handleReviewContent}
                    disabled={!reviewAction}
                  >
                    <CheckCircle className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
                    {language === 'ar' ? 'مراجعة' : 'Review'}
                  </CosmicButton>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FlaggedContentViewer; 