import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Play, 
  Pause, 
  Download, 
  Eye, 
  Flag, 
  Trash2, 
  Clock, 
  MapPin, 
  User,
  Shield,
  Monitor,
  Crown,
  RefreshCw,
  Filter,
  AlertTriangle,
  Volume2,
  FileText,
  Calendar
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import RecordingService from '../../services/recordingService';
import MonitoringService from '../../services/monitoringService';
import CosmicCard from '../UI/CosmicCard';
import CosmicButton from '../UI/CosmicButton';

const CallMonitoringTab = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { language, showSuccess, showError } = useUI();
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, flagged, ai_alerted, today
  const [playingRecording, setPlayingRecording] = useState(null);
  const [selectedRecording, setSelectedRecording] = useState(null);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [flagNotes, setFlagNotes] = useState('');

  useEffect(() => {
    loadRecordings();
  }, [filter]);

  const loadRecordings = async () => {
    try {
      setLoading(true);
      const filters = {};
      
      if (filter === 'flagged') {
        filters.flagged = true;
      } else if (filter === 'ai_alerted') {
        filters.aiAlerted = true;
      } else if (filter === 'today') {
        // This would be handled in the service
        filters.today = true;
      }

      const result = await RecordingService.getRecordings(filters);
      
      if (result.success) {
        setRecordings(result.data);
      } else {
        showError(result.message);
      }
    } catch (error) {
      console.error('Error loading recordings:', error);
      showError('Failed to load call recordings');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayRecording = (recording) => {
    if (playingRecording === recording.id) {
      setPlayingRecording(null);
    } else {
      setPlayingRecording(recording.id);
    }
  };

  const handleFlagRecording = async () => {
    try {
      if (!selectedRecording || !flagNotes.trim()) {
        showError('Please provide notes for flagging');
        return;
      }

      const result = await RecordingService.flagRecording(
        selectedRecording.id,
        user.id,
        flagNotes
      );

      if (result.success) {
        showSuccess('Recording flagged successfully');
        setShowFlagModal(false);
        setFlagNotes('');
        setSelectedRecording(null);
        loadRecordings();
      } else {
        showError(result.message);
      }
    } catch (error) {
      console.error('Error flagging recording:', error);
      showError('Failed to flag recording');
    }
  };

  const handleDeleteRecording = async (recordingId) => {
    try {
      if (!confirm('Are you sure you want to delete this recording? This action cannot be undone.')) {
        return;
      }

      const result = await RecordingService.deleteRecording(recordingId, user.id);

      if (result.success) {
        showSuccess('Recording deleted successfully');
        loadRecordings();
      } else {
        showError(result.message);
      }
    } catch (error) {
      console.error('Error deleting recording:', error);
      showError('Failed to delete recording');
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'client':
        return <User className="w-4 h-4" />;
      case 'reader':
        return <Eye className="w-4 h-4" />;
      case 'monitor':
        return <Monitor className="w-4 h-4" />;
      case 'admin':
        return <Crown className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'client':
        return 'bg-blue-500/20 text-blue-300 border-blue-400/30';
      case 'reader':
        return 'bg-purple-500/20 text-purple-300 border-purple-400/30';
      case 'monitor':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30';
      case 'admin':
        return 'bg-gold-500/20 text-gold-300 border-gold-400/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-400/30';
    }
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDateTime = (timestamp) => {
    return new Date(timestamp).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US');
  };

  const filteredRecordings = recordings.filter(recording => {
    if (filter === 'all') return true;
    if (filter === 'flagged') return recording.monitor_flagged;
    if (filter === 'ai_alerted') return recording.ai_alerted;
    if (filter === 'today') {
      const today = new Date().toDateString();
      return new Date(recording.call_start_time).toDateString() === today;
    }
    return true;
  });

  const flaggedCount = recordings.filter(r => r.monitor_flagged).length;
  const aiAlertedCount = recordings.filter(r => r.ai_alerted).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {language === 'ar' ? 'مراقبة المكالمات' : 'Call Monitoring'}
          </h2>
          <p className="text-gray-400">
            {language === 'ar' 
              ? 'مراجعة وإدارة تسجيلات المكالمات مع نظام المراقبة الذكي'
              : 'Review and manage call recordings with AI monitoring system'
            }
          </p>
        </div>
        
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          {flaggedCount > 0 && (
            <div className="flex items-center space-x-2 rtl:space-x-reverse bg-red-500/20 border border-red-400/30 rounded-lg px-3 py-2">
              <Flag className="w-4 h-4 text-red-400" />
              <span className="text-red-300 font-medium">
                {flaggedCount} {language === 'ar' ? 'مُعلم' : 'Flagged'}
              </span>
            </div>
          )}
          
          {aiAlertedCount > 0 && (
            <div className="flex items-center space-x-2 rtl:space-x-reverse bg-yellow-500/20 border border-yellow-400/30 rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-300 font-medium">
                {aiAlertedCount} {language === 'ar' ? 'تنبيه ذكي' : 'AI Alerts'}
              </span>
            </div>
          )}
          
          <CosmicButton
            variant="ghost"
            size="sm"
            onClick={loadRecordings}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </CosmicButton>
        </div>
      </div>

      {/* Filters */}
      <CosmicCard className="p-4" variant="glass">
        <div className="flex items-center space-x-4 rtl:space-x-reverse">
          <Filter className="w-5 h-5 text-gold-400" />
          <div className="flex space-x-2 rtl:space-x-reverse">
            {['all', 'flagged', 'ai_alerted', 'today'].map((filterType) => (
              <button
                key={filterType}
                onClick={() => setFilter(filterType)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 ${
                  filter === filterType
                    ? 'bg-gold-500/20 text-gold-300 border border-gold-400/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {language === 'ar' ? {
                  all: 'الكل',
                  flagged: 'مُعلم',
                  ai_alerted: 'تنبيه ذكي',
                  today: 'اليوم'
                }[filterType] : {
                  all: 'All',
                  flagged: 'Flagged',
                  ai_alerted: 'AI Alerts',
                  today: 'Today'
                }[filterType]}
              </button>
            ))}
          </div>
        </div>
      </CosmicCard>

      {/* Recordings List */}
      <div className="space-y-4">
        <AnimatePresence>
          {loading ? (
            <CosmicCard className="p-6" variant="glass">
              <div className="flex items-center justify-center">
                <RefreshCw className="w-6 h-6 animate-spin text-gold-400" />
                <span className="ml-2 text-gray-400">
                  {language === 'ar' ? 'جاري التحميل...' : 'Loading recordings...'}
                </span>
              </div>
            </CosmicCard>
          ) : filteredRecordings.length === 0 ? (
            <CosmicCard className="p-8" variant="glass">
              <div className="text-center">
                <Volume2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">
                  {language === 'ar' ? 'لا توجد تسجيلات' : 'No Recordings'}
                </h3>
                <p className="text-gray-400">
                  {language === 'ar' 
                    ? 'لا توجد تسجيلات مكالمات متاحة'
                    : 'No call recordings available'
                  }
                </p>
              </div>
            </CosmicCard>
          ) : (
            filteredRecordings.map((recording) => (
              <motion.div
                key={recording.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <CosmicCard 
                  className={`p-6 ${recording.monitor_flagged ? 'border-red-400/50' : recording.ai_alerted ? 'border-yellow-400/50' : ''}`} 
                  variant="glass"
                  glow={recording.monitor_flagged || recording.ai_alerted}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 rtl:space-x-reverse flex-1">
                      {/* Call Type Icon */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        recording.call_type === 'video' 
                          ? 'bg-gradient-to-br from-purple-500 to-pink-500' 
                          : 'bg-gradient-to-br from-blue-500 to-cyan-500'
                      }`}>
                        <Volume2 className="w-6 h-6 text-white" />
                      </div>

                      {/* Recording Details */}
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 rtl:space-x-reverse mb-2">
                          <h3 className="text-lg font-semibold text-white">
                            {recording.client?.first_name} {recording.client?.last_name} 
                            <span className="text-gray-400 mx-2">→</span>
                            {recording.reader?.first_name} {recording.reader?.last_name}
                          </h3>
                          
                          {/* Call Type Badge */}
                          <div className={`px-2 py-1 rounded-lg border text-xs font-medium ${
                            recording.call_type === 'video' 
                              ? 'bg-purple-500/20 text-purple-300 border-purple-400/30'
                              : 'bg-blue-500/20 text-blue-300 border-blue-400/30'
                          }`}>
                            {recording.call_type}
                          </div>

                          {/* Status Indicators */}
                          {recording.ai_alerted && (
                            <div className="flex items-center space-x-1 rtl:space-x-reverse px-2 py-1 rounded-lg bg-yellow-500/20 border border-yellow-400/30">
                              <AlertTriangle className="w-3 h-3 text-yellow-400" />
                              <span className="text-yellow-300 text-xs">AI Alert</span>
                            </div>
                          )}

                          {recording.monitor_flagged && (
                            <div className="flex items-center space-x-1 rtl:space-x-reverse px-2 py-1 rounded-lg bg-red-500/20 border border-red-400/30">
                              <Flag className="w-3 h-3 text-red-400" />
                              <span className="text-red-300 text-xs">Flagged</span>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-400 mb-3">
                          <div className="flex items-center space-x-1 rtl:space-x-reverse">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDateTime(recording.call_start_time)}</span>
                          </div>
                          
                          <div className="flex items-center space-x-1 rtl:space-x-reverse">
                            <Clock className="w-4 h-4" />
                            <span>{formatDuration(recording.duration_seconds || 0)}</span>
                          </div>
                          
                          <div className="flex items-center space-x-1 rtl:space-x-reverse">
                            <FileText className="w-4 h-4" />
                            <span>{formatFileSize(recording.file_size || 0)}</span>
                          </div>

                          {recording.booking?.service_type && (
                            <div className="flex items-center space-x-1 rtl:space-x-reverse">
                              <Shield className="w-4 h-4" />
                              <span>{recording.booking.service_type}</span>
                            </div>
                          )}
                        </div>

                        {recording.monitor_notes && (
                          <div className="mt-3 p-3 bg-red-900/30 border border-red-500/30 rounded-lg">
                            <p className="text-red-300 text-sm">
                              <strong>Monitor Notes:</strong> {recording.monitor_notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      {recording.recording_url && (
                        <CosmicButton
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePlayRecording(recording)}
                          title={language === 'ar' ? 'تشغيل التسجيل' : 'Play Recording'}
                        >
                          {playingRecording === recording.id ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </CosmicButton>
                      )}

                      <CosmicButton
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedRecording(recording);
                          setShowFlagModal(true);
                        }}
                        title={language === 'ar' ? 'تعليم التسجيل' : 'Flag Recording'}
                      >
                        <Flag className="w-4 h-4" />
                      </CosmicButton>

                      {recording.recording_url && (
                        <CosmicButton
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(recording.recording_url, '_blank')}
                          title={language === 'ar' ? 'تحميل التسجيل' : 'Download Recording'}
                        >
                          <Download className="w-4 h-4" />
                        </CosmicButton>
                      )}

                      <CosmicButton
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteRecording(recording.id)}
                        title={language === 'ar' ? 'حذف التسجيل' : 'Delete Recording'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </CosmicButton>
                    </div>
                  </div>

                  {/* Audio Player */}
                  {playingRecording === recording.id && recording.recording_url && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 pt-4 border-t border-white/10"
                    >
                      <audio
                        controls
                        className="w-full"
                        src={recording.recording_url}
                        onEnded={() => setPlayingRecording(null)}
                      >
                        Your browser does not support the audio element.
                      </audio>
                    </motion.div>
                  )}
                </CosmicCard>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Flag Recording Modal */}
      <AnimatePresence>
        {showFlagModal && (
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
                  {language === 'ar' ? 'تعليم التسجيل' : 'Flag Recording'}
                </h3>
                <CosmicButton
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowFlagModal(false);
                    setFlagNotes('');
                    setSelectedRecording(null);
                  }}
                >
                  ×
                </CosmicButton>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {language === 'ar' ? 'ملاحظات التعليم' : 'Flag Notes'}
                  </label>
                  <textarea
                    value={flagNotes}
                    onChange={(e) => setFlagNotes(e.target.value)}
                    placeholder={language === 'ar' ? 'اكتب سبب تعليم هذا التسجيل...' : 'Enter reason for flagging this recording...'}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400/50"
                    rows={4}
                  />
                </div>

                <div className="flex space-x-3 rtl:space-x-reverse">
                  <CosmicButton
                    variant="ghost"
                    className="flex-1"
                    onClick={() => {
                      setShowFlagModal(false);
                      setFlagNotes('');
                      setSelectedRecording(null);
                    }}
                  >
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </CosmicButton>
                  <CosmicButton
                    variant="warning"
                    className="flex-1"
                    onClick={handleFlagRecording}
                    disabled={!flagNotes.trim()}
                  >
                    <Flag className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
                    {language === 'ar' ? 'تعليم' : 'Flag'}
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

export default CallMonitoringTab; 