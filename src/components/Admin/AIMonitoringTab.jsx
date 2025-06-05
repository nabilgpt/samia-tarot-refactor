import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Brain, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Eye, 
  Flag, 
  User,
  Shield,
  Monitor,
  Crown,
  RefreshCw,
  Filter,
  TrendingUp,
  Activity,
  MessageCircle,
  Phone,
  BarChart3,
  Zap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { supabase } from '../../lib/supabase';
import AIWatchdogService from '../../services/aiWatchdogService';
import MonitoringService from '../../services/monitoringService';
import CosmicCard from '../UI/CosmicCard';
import CosmicButton from '../UI/CosmicButton';

const AIMonitoringTab = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { language, showSuccess, showError } = useUI();
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, critical, high, medium, low, unresolved
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    loadAIAlerts();
    loadAIStats();
  }, [filter]);

  const loadAIAlerts = async () => {
    try {
      setLoading(true);
      // This would be implemented in a service to get AI alerts
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
          ),
          reviewer:profiles!ai_monitoring_alerts_reviewed_by_fkey(
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAlerts(data || []);
    } catch (error) {
      console.error('Error loading AI alerts:', error);
      showError('Failed to load AI monitoring alerts');
    } finally {
      setLoading(false);
    }
  };

  const loadAIStats = async () => {
    try {
      const result = await AIWatchdogService.getMonitoringStats();
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Error loading AI stats:', error);
    }
  };

  const handleReviewAlert = async () => {
    try {
      if (!selectedAlert || !reviewAction.trim()) {
        showError('Please select an action for the review');
        return;
      }

      const result = await MonitoringService.reviewAIAlert(
        user.id,
        selectedAlert.id,
        {
          action: reviewAction,
          notes: reviewNotes,
          resolved: reviewAction === 'resolved'
        }
      );

      if (result.success) {
        showSuccess('AI alert reviewed successfully');
        setShowReviewModal(false);
        setReviewAction('');
        setReviewNotes('');
        setSelectedAlert(null);
        loadAIAlerts();
      } else {
        showError(result.message);
      }
    } catch (error) {
      console.error('Error reviewing AI alert:', error);
      showError('Failed to review AI alert');
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'text-red-400 bg-red-500/20 border-red-400/30';
      case 'high':
        return 'text-orange-400 bg-orange-500/20 border-orange-400/30';
      case 'medium':
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-400/30';
      case 'low':
        return 'text-blue-400 bg-blue-500/20 border-blue-400/30';
      default:
        return 'text-gray-400 bg-gray-500/20 border-gray-400/30';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4" />;
      case 'high':
        return <Flag className="w-4 h-4" />;
      case 'medium':
        return <Eye className="w-4 h-4" />;
      case 'low':
        return <Activity className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getAlertTypeIcon = (alertType) => {
    switch (alertType) {
      case 'call_violation':
        return <Phone className="w-4 h-4" />;
      case 'chat_violation':
        return <MessageCircle className="w-4 h-4" />;
      case 'voice_message_violation':
        return <MessageCircle className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const alertTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - alertTime) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return language === 'ar' ? 'الآن' : 'Just now';
    } else if (diffInMinutes < 60) {
      return language === 'ar' ? `منذ ${diffInMinutes} دقيقة` : `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return language === 'ar' ? `منذ ${hours} ساعة` : `${hours}h ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return language === 'ar' ? `منذ ${days} يوم` : `${days}d ago`;
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'all') return true;
    if (filter === 'unresolved') return !alert.resolved;
    return alert.severity === filter;
  });

  const unresolvedCount = alerts.filter(alert => !alert.resolved).length;
  const criticalCount = alerts.filter(alert => alert.severity === 'critical').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {language === 'ar' ? 'المراقبة الذكية' : 'AI Monitoring'}
          </h2>
          <p className="text-gray-400">
            {language === 'ar' 
              ? 'نظام المراقبة الذكي للكشف عن المخالفات والسلوكيات المشبوهة'
              : 'AI-powered monitoring system for violation detection and behavior analysis'
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
          
          {unresolvedCount > 0 && (
            <div className="flex items-center space-x-2 rtl:space-x-reverse bg-yellow-500/20 border border-yellow-400/30 rounded-lg px-3 py-2">
              <Clock className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-300 font-medium">
                {unresolvedCount} {language === 'ar' ? 'غير محلول' : 'Unresolved'}
              </span>
            </div>
          )}
          
          <CosmicButton
            variant="ghost"
            size="sm"
            onClick={() => {
              loadAIAlerts();
              loadAIStats();
            }}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </CosmicButton>
        </div>
      </div>

      {/* AI Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <CosmicCard className="p-4" variant="glass">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-400">
                  {language === 'ar' ? 'إجمالي التنبيهات' : 'Total Alerts'}
                </p>
                <p className="text-xl font-bold text-white">{stats.totalAlerts}</p>
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
                  {language === 'ar' ? 'تنبيهات حرجة' : 'Critical Alerts'}
                </p>
                <p className="text-xl font-bold text-white">{stats.alertsBySeverity?.critical || 0}</p>
              </div>
            </div>
          </CosmicCard>

          <CosmicCard className="p-4" variant="glass">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-400">
                  {language === 'ar' ? 'محلولة' : 'Resolved'}
                </p>
                <p className="text-xl font-bold text-white">{stats.resolvedAlerts}</p>
              </div>
            </div>
          </CosmicCard>

          <CosmicCard className="p-4" variant="glass">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-400">
                  {language === 'ar' ? 'متوسط المخاطر' : 'Avg Risk Score'}
                </p>
                <p className="text-xl font-bold text-white">{Math.round(stats.averageRiskScore || 0)}</p>
              </div>
            </div>
          </CosmicCard>
        </div>
      )}

      {/* Filters */}
      <CosmicCard className="p-4" variant="glass">
        <div className="flex items-center space-x-4 rtl:space-x-reverse">
          <Filter className="w-5 h-5 text-gold-400" />
          <div className="flex space-x-2 rtl:space-x-reverse">
            {['all', 'critical', 'high', 'medium', 'low', 'unresolved'].map((filterType) => (
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
                  critical: 'حرج',
                  high: 'عالي',
                  medium: 'متوسط',
                  low: 'منخفض',
                  unresolved: 'غير محلول'
                }[filterType] : {
                  all: 'All',
                  critical: 'Critical',
                  high: 'High',
                  medium: 'Medium',
                  low: 'Low',
                  unresolved: 'Unresolved'
                }[filterType]}
              </button>
            ))}
          </div>
        </div>
      </CosmicCard>

      {/* Alerts List */}
      <div className="space-y-4">
        <AnimatePresence>
          {loading ? (
            <CosmicCard className="p-6" variant="glass">
              <div className="flex items-center justify-center">
                <RefreshCw className="w-6 h-6 animate-spin text-gold-400" />
                <span className="ml-2 text-gray-400">
                  {language === 'ar' ? 'جاري التحميل...' : 'Loading AI alerts...'}
                </span>
              </div>
            </CosmicCard>
          ) : filteredAlerts.length === 0 ? (
            <CosmicCard className="p-8" variant="glass">
              <div className="text-center">
                <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">
                  {language === 'ar' ? 'لا توجد تنبيهات' : 'No AI Alerts'}
                </h3>
                <p className="text-gray-400">
                  {language === 'ar' 
                    ? 'لا توجد تنبيهات من نظام المراقبة الذكي'
                    : 'No alerts from AI monitoring system'
                  }
                </p>
              </div>
            </CosmicCard>
          ) : (
            filteredAlerts.map((alert) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <CosmicCard 
                  className={`p-6 ${alert.severity === 'critical' ? 'border-red-400/50' : alert.severity === 'high' ? 'border-orange-400/50' : ''}`} 
                  variant="glass"
                  glow={alert.severity === 'critical' || alert.severity === 'high'}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 rtl:space-x-reverse flex-1">
                      {/* Alert Type Icon */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getSeverityColor(alert.severity)}`}>
                        {getAlertTypeIcon(alert.alert_type)}
                      </div>

                      {/* Alert Details */}
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 rtl:space-x-reverse mb-2">
                          <h3 className="text-lg font-semibold text-white">
                            {alert.client?.first_name} {alert.client?.last_name}
                            <span className="text-gray-400 mx-2">→</span>
                            {alert.reader?.first_name} {alert.reader?.last_name}
                          </h3>
                          
                          {/* Severity Badge */}
                          <div className={`flex items-center space-x-1 rtl:space-x-reverse px-2 py-1 rounded-lg border text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                            {getSeverityIcon(alert.severity)}
                            <span>{alert.severity}</span>
                          </div>

                          {/* Alert Type */}
                          <div className="px-2 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-400/30 text-xs font-medium">
                            {alert.alert_type.replace('_', ' ')}
                          </div>

                          {/* Status */}
                          {alert.resolved ? (
                            <div className="flex items-center space-x-1 rtl:space-x-reverse px-2 py-1 rounded-lg bg-green-500/20 border border-green-400/30">
                              <CheckCircle className="w-3 h-3 text-green-400" />
                              <span className="text-green-300 text-xs">Resolved</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1 rtl:space-x-reverse px-2 py-1 rounded-lg bg-yellow-500/20 border border-yellow-400/30">
                              <Clock className="w-3 h-3 text-yellow-400" />
                              <span className="text-yellow-300 text-xs">Pending</span>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-400 mb-3">
                          <div className="flex items-center space-x-1 rtl:space-x-reverse">
                            <Clock className="w-4 h-4" />
                            <span>{formatTimeAgo(alert.created_at)}</span>
                          </div>
                          
                          <div className="flex items-center space-x-1 rtl:space-x-reverse">
                            <Zap className="w-4 h-4" />
                            <span>{Math.round(alert.ai_confidence || 0)}% confidence</span>
                          </div>

                          {alert.human_reviewed && (
                            <div className="flex items-center space-x-1 rtl:space-x-reverse">
                              <Eye className="w-4 h-4" />
                              <span>Reviewed by {alert.reviewer?.first_name}</span>
                            </div>
                          )}
                        </div>

                        {/* Violation Details */}
                        {alert.violation_details && (
                          <div className="mt-3 p-3 bg-dark-700/50 border border-white/10 rounded-lg">
                            <p className="text-gray-300 text-sm">
                              <strong>Details:</strong> {JSON.stringify(alert.violation_details, null, 2)}
                            </p>
                          </div>
                        )}

                        {/* Human Action */}
                        {alert.human_action_taken && (
                          <div className="mt-3 p-3 bg-blue-900/30 border border-blue-500/30 rounded-lg">
                            <p className="text-blue-300 text-sm">
                              <strong>Action Taken:</strong> {alert.human_action_taken}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      {!alert.resolved && (
                        <CosmicButton
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setSelectedAlert(alert);
                            setShowReviewModal(true);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1 rtl:mr-0 rtl:ml-1" />
                          {language === 'ar' ? 'مراجعة' : 'Review'}
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

      {/* Review Alert Modal */}
      <AnimatePresence>
        {showReviewModal && selectedAlert && (
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
                  {language === 'ar' ? 'مراجعة تنبيه الذكاء الاصطناعي' : 'Review AI Alert'}
                </h3>
                <CosmicButton
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowReviewModal(false);
                    setReviewAction('');
                    setReviewNotes('');
                    setSelectedAlert(null);
                  }}
                >
                  ×
                </CosmicButton>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {language === 'ar' ? 'الإجراء المطلوب' : 'Action Required'}
                  </label>
                  <select
                    value={reviewAction}
                    onChange={(e) => setReviewAction(e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400/50"
                  >
                    <option value="">{language === 'ar' ? 'اختر إجراء' : 'Select Action'}</option>
                    <option value="false_positive">{language === 'ar' ? 'إيجابي خاطئ' : 'False Positive'}</option>
                    <option value="warning_issued">{language === 'ar' ? 'تحذير صادر' : 'Warning Issued'}</option>
                    <option value="user_contacted">{language === 'ar' ? 'تم التواصل مع المستخدم' : 'User Contacted'}</option>
                    <option value="escalated">{language === 'ar' ? 'تم التصعيد' : 'Escalated'}</option>
                    <option value="resolved">{language === 'ar' ? 'محلول' : 'Resolved'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {language === 'ar' ? 'ملاحظات المراجعة' : 'Review Notes'}
                  </label>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder={language === 'ar' ? 'اكتب ملاحظات حول مراجعة هذا التنبيه...' : 'Enter notes about reviewing this alert...'}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400/50"
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
                      setSelectedAlert(null);
                    }}
                  >
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </CosmicButton>
                  <CosmicButton
                    variant="primary"
                    className="flex-1"
                    onClick={handleReviewAlert}
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

export default AIMonitoringTab; 