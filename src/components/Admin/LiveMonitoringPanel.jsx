import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Monitor, 
  AlertTriangle, 
  Eye, 
  Volume2, 
  MessageCircle, 
  Users, 
  Clock, 
  Activity,
  Zap,
  Shield,
  Play,
  Pause,
  StopCircle,
  Flag,
  Bell,
  BellRing,
  Headphones,
  Video,
  Phone,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { supabase } from '../../lib/supabase';
import MonitoringService from '../../services/monitoringService';
import AIWatchdogService from '../../services/aiWatchdogService';
import CosmicCard from '../UI/CosmicCard';
import CosmicButton from '../UI/CosmicButton';

const LiveMonitoringPanel = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { language, showSuccess, showError } = useUI();
  const [activeSessions, setActiveSessions] = useState([]);
  const [aiAlerts, setAiAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [alertSound, setAlertSound] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const alertAudioRef = useRef(null);
  const refreshIntervalRef = useRef(null);

  useEffect(() => {
    loadActiveSessions();
    loadAIAlerts();
    
    if (autoRefresh) {
      startAutoRefresh();
    }

    // Subscribe to real-time updates
    const subscription = subscribeToUpdates();

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [autoRefresh]);

  const loadActiveSessions = async () => {
    try {
      setLoading(true);
      
      // Get active call recordings
      const { data: callRecordings, error: callError } = await supabase
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
            status,
            call_type
          )
        `)
        .is('call_end_time', null)
        .order('call_start_time', { ascending: false });

      // Get active chat sessions
      const { data: chatSessions, error: chatError } = await supabase
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
          booking:bookings(
            service_type,
            status
          )
        `)
        .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // Last 2 hours
        .order('created_at', { ascending: false });

      if (callError || chatError) {
        throw callError || chatError;
      }

      // Combine and format sessions
      const sessions = [
        ...(callRecordings || []).map(recording => ({
          id: recording.id,
          type: 'call',
          sessionTag: determineSessionTag(recording),
          riskScore: calculateRiskScore(recording),
          client: recording.client,
          reader: recording.reader,
          booking: recording.booking,
          startTime: recording.call_start_time,
          duration: Date.now() - new Date(recording.call_start_time).getTime(),
          aiAlerted: recording.ai_alerted,
          monitorFlagged: recording.monitor_flagged,
          emergencyFlagged: recording.emergency_flagged,
          callType: recording.call_type
        })),
        ...(chatSessions || []).map(chat => ({
          id: chat.id,
          type: 'chat',
          sessionTag: chat.session_tag || 'safe',
          riskScore: chat.ai_risk_score || 0,
          client: chat.client,
          reader: chat.reader,
          booking: chat.booking,
          startTime: chat.created_at,
          duration: Date.now() - new Date(chat.created_at).getTime(),
          aiAlerted: chat.ai_alerted,
          monitorFlagged: chat.monitor_flagged,
          messageType: chat.message_type
        }))
      ];

      setActiveSessions(sessions);
    } catch (error) {
      console.error('Error loading active sessions:', error);
      showError('Failed to load active sessions');
    } finally {
      setLoading(false);
    }
  };

  const loadAIAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_monitoring_alerts')
        .select(`
          *,
          client:profiles!ai_monitoring_alerts_client_id_fkey(
            first_name,
            last_name,
            avatar_url
          ),
          reader:profiles!ai_monitoring_alerts_reader_id_fkey(
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('resolved', false)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      setAiAlerts(data || []);
    } catch (error) {
      console.error('Error loading AI alerts:', error);
    }
  };

  const startAutoRefresh = () => {
    refreshIntervalRef.current = setInterval(() => {
      loadActiveSessions();
      loadAIAlerts();
    }, 10000); // Refresh every 10 seconds
  };

  const subscribeToUpdates = () => {
    return supabase
      .channel('live_monitoring')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_monitoring_alerts'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            handleNewAlert(payload.new);
          }
          loadAIAlerts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_recordings'
        },
        () => {
          loadActiveSessions();
        }
      )
      .subscribe();
  };

  const handleNewAlert = (alert) => {
    // Play alert sound if enabled
    if (alertSound && alertAudioRef.current) {
      alertAudioRef.current.play().catch(console.error);
    }

    // Show notification
    if (alert.severity === 'critical') {
      showError(`Critical AI Alert: ${alert.alert_type}`);
    } else {
      showSuccess(`New AI Alert: ${alert.alert_type}`);
    }
  };

  const handleJoinSession = async (session) => {
    try {
      setSelectedSession(session);
      setShowJoinModal(true);
    } catch (error) {
      console.error('Error joining session:', error);
      showError('Failed to join session');
    }
  };

  const handleStopSession = async (session) => {
    try {
      if (!confirm('Are you sure you want to stop this session?')) {
        return;
      }

      const result = await MonitoringService.stopCall(
        user.id,
        session.booking.id,
        'Monitor intervention - session stopped'
      );

      if (result.success) {
        showSuccess('Session stopped successfully');
        loadActiveSessions();
      } else {
        showError(result.message);
      }
    } catch (error) {
      console.error('Error stopping session:', error);
      showError('Failed to stop session');
    }
  };

  const handleFlagSession = async (session) => {
    try {
      const result = await MonitoringService.flagContent(user.id, {
        type: session.type === 'call' ? 'call_recording' : 'chat_message',
        targetId: session.id,
        reason: 'Monitor flagged during live monitoring',
        severity: session.sessionTag === 'critical' ? 'high' : 'medium',
        notes: 'Flagged during live monitoring session'
      });

      if (result.success) {
        showSuccess('Session flagged successfully');
        loadActiveSessions();
      } else {
        showError(result.message);
      }
    } catch (error) {
      console.error('Error flagging session:', error);
      showError('Failed to flag session');
    }
  };

  const determineSessionTag = (recording) => {
    if (recording.emergency_flagged) return 'critical';
    if (recording.monitor_flagged) return 'suspicious';
    if (recording.ai_alerted) return 'needs_review';
    return 'safe';
  };

  const calculateRiskScore = (recording) => {
    let score = 0;
    if (recording.ai_alerted) score += 30;
    if (recording.monitor_flagged) score += 40;
    if (recording.emergency_flagged) score += 50;
    return Math.min(score, 100);
  };

  const getSessionTagColor = (tag) => {
    switch (tag) {
      case 'critical':
        return 'bg-red-500/20 text-red-300 border-red-400/30';
      case 'suspicious':
        return 'bg-orange-500/20 text-orange-300 border-orange-400/30';
      case 'needs_review':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30';
      case 'safe':
        return 'bg-green-500/20 text-green-300 border-green-400/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-400/30';
    }
  };

  const formatDuration = (milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'high':
        return <Flag className="w-4 h-4 text-orange-400" />;
      case 'medium':
        return <Eye className="w-4 h-4 text-yellow-400" />;
      case 'low':
        return <Activity className="w-4 h-4 text-blue-400" />;
      default:
        return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  const criticalSessions = activeSessions.filter(s => s.sessionTag === 'critical');
  const suspiciousSessions = activeSessions.filter(s => s.sessionTag === 'suspicious');
  const criticalAlerts = aiAlerts.filter(a => a.severity === 'critical');

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {language === 'ar' ? 'لوحة المراقبة المباشرة' : 'Live Monitoring Panel'}
          </h2>
          <p className="text-gray-400">
            {language === 'ar' 
              ? 'مراقبة الجلسات النشطة في الوقت الفعلي مع تنبيهات الذكاء الاصطناعي'
              : 'Real-time monitoring of active sessions with AI alerts'
            }
          </p>
        </div>
        
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          {criticalAlerts.length > 0 && (
            <div className="flex items-center space-x-2 rtl:space-x-reverse bg-red-500/20 border border-red-400/30 rounded-lg px-3 py-2 animate-pulse">
              <BellRing className="w-4 h-4 text-red-400" />
              <span className="text-red-300 font-medium">
                {criticalAlerts.length} {language === 'ar' ? 'تنبيه حرج' : 'Critical'}
              </span>
            </div>
          )}
          
          <CosmicButton
            variant="ghost"
            size="sm"
            onClick={() => setAlertSound(!alertSound)}
            className={alertSound ? 'text-gold-400' : 'text-gray-400'}
          >
            {alertSound ? <Bell className="w-4 h-4" /> : <BellRing className="w-4 h-4" />}
          </CosmicButton>
          
          <CosmicButton
            variant="ghost"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'text-gold-400' : 'text-gray-400'}
          >
            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
          </CosmicButton>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <CosmicCard className="p-4" variant="glass">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <Monitor className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-400">
                {language === 'ar' ? 'الجلسات النشطة' : 'Active Sessions'}
              </p>
              <p className="text-xl font-bold text-white">{activeSessions.length}</p>
            </div>
          </div>
        </CosmicCard>

        <CosmicCard className="p-4" variant="glass">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-400">
                {language === 'ar' ? 'جلسات حرجة' : 'Critical Sessions'}
              </p>
              <p className="text-xl font-bold text-white">{criticalSessions.length}</p>
            </div>
          </div>
        </CosmicCard>

        <CosmicCard className="p-4" variant="glass">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-lg flex items-center justify-center">
              <Eye className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-400">
                {language === 'ar' ? 'جلسات مشبوهة' : 'Suspicious Sessions'}
              </p>
              <p className="text-xl font-bold text-white">{suspiciousSessions.length}</p>
            </div>
          </div>
        </CosmicCard>

        <CosmicCard className="p-4" variant="glass">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-400">
                {language === 'ar' ? 'تنبيهات الذكاء الاصطناعي' : 'AI Alerts'}
              </p>
              <p className="text-xl font-bold text-white">{aiAlerts.length}</p>
            </div>
          </div>
        </CosmicCard>
      </div>

      {/* Active Sessions */}
      <CosmicCard className="p-6" variant="glass">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            {language === 'ar' ? 'الجلسات النشطة' : 'Active Sessions'}
          </h3>
          <CosmicButton
            variant="ghost"
            size="sm"
            onClick={loadActiveSessions}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </CosmicButton>
        </div>

        <div className="space-y-3">
          <AnimatePresence>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-gold-400" />
                <span className="ml-2 text-gray-400">
                  {language === 'ar' ? 'جاري التحميل...' : 'Loading sessions...'}
                </span>
              </div>
            ) : activeSessions.length === 0 ? (
              <div className="text-center py-8">
                <Monitor className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">
                  {language === 'ar' ? 'لا توجد جلسات نشطة' : 'No Active Sessions'}
                </h3>
                <p className="text-gray-400">
                  {language === 'ar' 
                    ? 'لا توجد جلسات نشطة للمراقبة حالياً'
                    : 'No active sessions to monitor at the moment'
                  }
                </p>
              </div>
            ) : (
              activeSessions.map((session) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className={`p-4 rounded-lg border ${
                    session.sessionTag === 'critical' 
                      ? 'border-red-400/50 bg-red-900/20' 
                      : session.sessionTag === 'suspicious'
                      ? 'border-orange-400/50 bg-orange-900/20'
                      : 'border-white/10 bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 rtl:space-x-reverse flex-1">
                      {/* Session Type Icon */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        session.type === 'call' 
                          ? session.callType === 'video'
                            ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                            : 'bg-gradient-to-br from-blue-500 to-cyan-500'
                          : 'bg-gradient-to-br from-green-500 to-emerald-500'
                      }`}>
                        {session.type === 'call' ? (
                          session.callType === 'video' ? (
                            <Video className="w-6 h-6 text-white" />
                          ) : (
                            <Phone className="w-6 h-6 text-white" />
                          )
                        ) : (
                          <MessageCircle className="w-6 h-6 text-white" />
                        )}
                      </div>

                      {/* Session Details */}
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 rtl:space-x-reverse mb-2">
                          <h4 className="text-white font-medium">
                            {session.client?.first_name} {session.client?.last_name}
                            <span className="text-gray-400 mx-2">→</span>
                            {session.reader?.first_name} {session.reader?.last_name}
                          </h4>
                          
                          {/* Session Tag */}
                          <div className={`px-2 py-1 rounded-lg border text-xs font-medium ${getSessionTagColor(session.sessionTag)}`}>
                            {session.sessionTag}
                          </div>

                          {/* Risk Score */}
                          {session.riskScore > 0 && (
                            <div className="px-2 py-1 rounded-lg bg-red-500/20 border border-red-400/30 text-xs font-medium text-red-300">
                              Risk: {session.riskScore}%
                            </div>
                          )}
                        </div>

                        <div className="flex items-center space-x-4 rtl:space-x-reverse text-sm text-gray-400">
                          <div className="flex items-center space-x-1 rtl:space-x-reverse">
                            <Clock className="w-4 h-4" />
                            <span>{formatDuration(session.duration)}</span>
                          </div>
                          
                          <div className="flex items-center space-x-1 rtl:space-x-reverse">
                            <Shield className="w-4 h-4" />
                            <span>{session.booking?.service_type}</span>
                          </div>

                          {session.aiAlerted && (
                            <div className="flex items-center space-x-1 rtl:space-x-reverse text-yellow-400">
                              <Zap className="w-4 h-4" />
                              <span>AI Alert</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <CosmicButton
                        variant="ghost"
                        size="sm"
                        onClick={() => handleJoinSession(session)}
                        title={language === 'ar' ? 'انضم للجلسة' : 'Join Session'}
                      >
                        <Headphones className="w-4 h-4" />
                      </CosmicButton>

                      <CosmicButton
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFlagSession(session)}
                        title={language === 'ar' ? 'تعليم الجلسة' : 'Flag Session'}
                      >
                        <Flag className="w-4 h-4" />
                      </CosmicButton>

                      <CosmicButton
                        variant="danger"
                        size="sm"
                        onClick={() => handleStopSession(session)}
                        title={language === 'ar' ? 'إيقاف الجلسة' : 'Stop Session'}
                      >
                        <StopCircle className="w-4 h-4" />
                      </CosmicButton>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </CosmicCard>

      {/* AI Alerts Panel */}
      <CosmicCard className="p-6" variant="glass">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            {language === 'ar' ? 'تنبيهات الذكاء الاصطناعي' : 'AI Alerts'}
          </h3>
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            {criticalAlerts.length > 0 && (
              <div className="px-2 py-1 rounded-lg bg-red-500/20 border border-red-400/30 text-xs font-medium text-red-300 animate-pulse">
                {criticalAlerts.length} Critical
              </div>
            )}
            <CosmicButton
              variant="ghost"
              size="sm"
              onClick={loadAIAlerts}
            >
              <RefreshCw className="w-4 h-4" />
            </CosmicButton>
          </div>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          <AnimatePresence>
            {aiAlerts.length === 0 ? (
              <div className="text-center py-8">
                <Zap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">
                  {language === 'ar' ? 'لا توجد تنبيهات' : 'No Active Alerts'}
                </h3>
                <p className="text-gray-400">
                  {language === 'ar' 
                    ? 'لا توجد تنبيهات من نظام الذكاء الاصطناعي'
                    : 'No alerts from AI monitoring system'
                  }
                </p>
              </div>
            ) : (
              aiAlerts.map((alert) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className={`p-3 rounded-lg border ${
                    alert.severity === 'critical' 
                      ? 'border-red-400/50 bg-red-900/20' 
                      : 'border-white/10 bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                      {getSeverityIcon(alert.severity)}
                      <div>
                        <p className="text-white font-medium text-sm">
                          {alert.client?.first_name} {alert.client?.last_name} → {alert.reader?.first_name} {alert.reader?.last_name}
                        </p>
                        <p className="text-gray-400 text-xs">
                          {alert.alert_type.replace('_', ' ')} • {Math.round(alert.ai_confidence)}% confidence
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(alert.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </CosmicCard>

      {/* Join Session Modal */}
      <AnimatePresence>
        {showJoinModal && selectedSession && (
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-dark-800/95 backdrop-blur-xl border border-gold-400/20 rounded-2xl p-6 max-w-md w-full shadow-2xl"
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">
                  {language === 'ar' ? 'انضم للجلسة' : 'Join Session'}
                </h3>
                <CosmicButton
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowJoinModal(false);
                    setSelectedSession(null);
                  }}
                >
                  ×
                </CosmicButton>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-white/5 rounded-lg">
                  <p className="text-white font-medium">
                    {selectedSession.client?.first_name} {selectedSession.client?.last_name}
                    <span className="text-gray-400 mx-2">→</span>
                    {selectedSession.reader?.first_name} {selectedSession.reader?.last_name}
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    {selectedSession.type} • {formatDuration(selectedSession.duration)}
                  </p>
                </div>

                <div className="flex space-x-3 rtl:space-x-reverse">
                  <CosmicButton
                    variant="ghost"
                    className="flex-1"
                    onClick={() => {
                      setShowJoinModal(false);
                      setSelectedSession(null);
                    }}
                  >
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </CosmicButton>
                  <CosmicButton
                    variant="primary"
                    className="flex-1"
                    onClick={() => {
                      // Implement join session logic
                      showSuccess('Joining session as silent monitor...');
                      setShowJoinModal(false);
                      setSelectedSession(null);
                    }}
                  >
                    <Headphones className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
                    {language === 'ar' ? 'انضم' : 'Join'}
                  </CosmicButton>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alert Sound */}
      <audio
        ref={alertAudioRef}
        preload="auto"
        src="/sounds/alert.mp3" // Add alert sound file
      />
    </div>
  );
};

export default LiveMonitoringPanel; 