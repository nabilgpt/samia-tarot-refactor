import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  X, 
  Eye, 
  MapPin, 
  User,
  Shield,
  Monitor,
  Crown,
  RefreshCw,
  Filter
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import EmergencyAlertsService from '../../services/emergencyAlertsService';
import CosmicCard from '../UI/CosmicCard';
import CosmicButton from '../UI/CosmicButton';

const EmergencyAlertsTab = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { language, showSuccess, showError } = useUI();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, acknowledged, resolved
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    loadAlerts();
    setupRealtimeSubscription();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [filter]);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const filters = filter === 'all' ? {} : { status: filter };
      const result = await EmergencyAlertsService.getAlertsForAdmin(filters);
      
      if (result.success) {
        setAlerts(result.data);
      } else {
        showError(result.message);
      }
    } catch (error) {
      console.error('Error loading alerts:', error);
      showError('Failed to load emergency alerts');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const subscriptionResult = EmergencyAlertsService.subscribeToAlerts((payload) => {
      console.log('Real-time alert update:', payload);
      
      if (payload.eventType === 'INSERT') {
        // New alert created
        loadAlerts(); // Reload to get full profile data
        
        // Show notification
        showSuccess(
          language === 'ar' 
            ? 'تنبيه طوارئ جديد!' 
            : 'New emergency alert!'
        );
      } else if (payload.eventType === 'UPDATE') {
        // Alert status updated
        loadAlerts();
      }
    });

    if (subscriptionResult.success) {
      setSubscription(subscriptionResult.subscription);
    }
  };

  const handleStatusUpdate = async (alertId, newStatus) => {
    try {
      const result = await EmergencyAlertsService.updateAlertStatus(
        alertId, 
        newStatus, 
        user.id
      );
      
      if (result.success) {
        showSuccess(
          language === 'ar' 
            ? `تم ${newStatus === 'resolved' ? 'حل' : 'تأكيد'} التنبيه بنجاح`
            : `Alert ${newStatus} successfully`
        );
        loadAlerts();
      } else {
        showError(result.message);
      }
    } catch (error) {
      console.error('Error updating alert status:', error);
      showError('Failed to update alert status');
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'text-red-400';
      case 'acknowledged':
        return 'text-yellow-400';
      case 'resolved':
        return 'text-green-400';
      default:
        return 'text-gray-400';
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
    return alert.status === filter;
  });

  const pendingCount = alerts.filter(alert => alert.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {language === 'ar' ? 'تنبيهات الطوارئ' : 'Emergency Alerts'}
          </h2>
          <p className="text-gray-400">
            {language === 'ar' 
              ? 'مراقبة ومعالجة تنبيهات الطوارئ من المستخدمين'
              : 'Monitor and handle emergency alerts from users'
            }
          </p>
        </div>
        
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          {pendingCount > 0 && (
            <div className="flex items-center space-x-2 rtl:space-x-reverse bg-red-500/20 border border-red-400/30 rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-red-300 font-medium">
                {pendingCount} {language === 'ar' ? 'معلق' : 'Pending'}
              </span>
            </div>
          )}
          
          <CosmicButton
            variant="ghost"
            size="sm"
            onClick={loadAlerts}
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
            {['all', 'pending', 'acknowledged', 'resolved'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 ${
                  filter === status
                    ? 'bg-gold-500/20 text-gold-300 border border-gold-400/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {language === 'ar' ? {
                  all: 'الكل',
                  pending: 'معلق',
                  acknowledged: 'مؤكد',
                  resolved: 'محلول'
                }[status] : status.charAt(0).toUpperCase() + status.slice(1)}
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
                  {language === 'ar' ? 'جاري التحميل...' : 'Loading alerts...'}
                </span>
              </div>
            </CosmicCard>
          ) : filteredAlerts.length === 0 ? (
            <CosmicCard className="p-8" variant="glass">
              <div className="text-center">
                <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">
                  {language === 'ar' ? 'لا توجد تنبيهات' : 'No Alerts'}
                </h3>
                <p className="text-gray-400">
                  {language === 'ar' 
                    ? 'لا توجد تنبيهات طوارئ في الوقت الحالي'
                    : 'No emergency alerts at the moment'
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
                  className={`p-6 ${alert.status === 'pending' ? 'border-red-400/50' : ''}`} 
                  variant="glass"
                  glow={alert.status === 'pending'}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 rtl:space-x-reverse flex-1">
                      {/* User Avatar */}
                      <div className="w-12 h-12 bg-gradient-to-br from-cosmic-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                        {alert.user_profile?.first_name?.[0] || 'U'}
                        {alert.user_profile?.last_name?.[0] || ''}
                      </div>

                      {/* Alert Details */}
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 rtl:space-x-reverse mb-2">
                          <h3 className="text-lg font-semibold text-white">
                            {alert.user_profile?.first_name} {alert.user_profile?.last_name}
                          </h3>
                          
                          {/* Role Badge */}
                          <div className={`flex items-center space-x-1 rtl:space-x-reverse px-2 py-1 rounded-lg border text-xs font-medium ${getRoleBadgeColor(alert.role)}`}>
                            {getRoleIcon(alert.role)}
                            <span>{alert.role}</span>
                          </div>

                          {/* Status */}
                          <span className={`text-sm font-medium ${getStatusColor(alert.status)}`}>
                            {alert.status}
                          </span>
                        </div>

                        <p className="text-gray-300 mb-3">{alert.message}</p>

                        <div className="flex items-center space-x-4 rtl:space-x-reverse text-sm text-gray-400">
                          <div className="flex items-center space-x-1 rtl:space-x-reverse">
                            <Clock className="w-4 h-4" />
                            <span>{formatTimeAgo(alert.created_at)}</span>
                          </div>
                          
                          {alert.location && (
                            <div className="flex items-center space-x-1 rtl:space-x-reverse">
                              <MapPin className="w-4 h-4" />
                              <span>{language === 'ar' ? 'الموقع متاح' : 'Location available'}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      {alert.status === 'pending' && (
                        <>
                          <CosmicButton
                            variant="warning"
                            size="sm"
                            onClick={() => handleStatusUpdate(alert.id, 'acknowledged')}
                          >
                            {language === 'ar' ? 'تأكيد' : 'Acknowledge'}
                          </CosmicButton>
                          <CosmicButton
                            variant="success"
                            size="sm"
                            onClick={() => handleStatusUpdate(alert.id, 'resolved')}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </CosmicButton>
                        </>
                      )}
                      
                      {alert.status === 'acknowledged' && (
                        <CosmicButton
                          variant="success"
                          size="sm"
                          onClick={() => handleStatusUpdate(alert.id, 'resolved')}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          {language === 'ar' ? 'حل' : 'Resolve'}
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
    </div>
  );
};

export default EmergencyAlertsTab; 