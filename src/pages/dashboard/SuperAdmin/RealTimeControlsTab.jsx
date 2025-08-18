import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../services/frontendApi.js';
import {
  EyeIcon,
  PlayIcon,
  StopIcon,
  PhoneIcon,
  ChatBubbleLeftIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  ClockIcon,
  SignalIcon,
  CpuChipIcon,
  ShieldCheckIcon,
  BellIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const RealTimeControlsTab = () => {
  const [activeSessions, setActiveSessions] = useState([]);
  const [systemHealth, setSystemHealth] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [showEndModal, setShowEndModal] = useState(false);
  const [message, setMessage] = useState('');
  const [realTimeMode, setRealTimeMode] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let interval;
    if (realTimeMode) {
      interval = setInterval(() => {
        loadData(true); // Silent refresh
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [realTimeMode]);

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      
      const [sessionsResult, healthResult] = await Promise.all([
        api.getActiveSessions(),
        api.getSystemHealth()
      ]);

      if (sessionsResult.success) {
        setActiveSessions(sessionsResult.data);
      }
      
      if (healthResult.success) {
        setSystemHealth(healthResult.data);
      }
    } catch (error) {
      if (!silent) {
        setMessage(`Error loading data: ${error.message}`);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleForceEndSession = async () => {
    try {
      setLoading(true);
      const result = await api.forceEndSession(
        selectedSession.id, 
        'Force ended by super admin via real-time controls'
      );
      
      if (result.success) {
        setMessage('Session ended successfully');
        setShowEndModal(false);
        await loadData();
      } else {
        setMessage(`Error ending session: ${result.error}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getSessionStatus = (session) => {
    const now = new Date();
    const start = new Date(session.scheduled_at);
    const end = new Date(start.getTime() + (session.duration || 60) * 60000);
    
    if (now < start) return { status: 'scheduled', color: 'yellow' };
    if (now > end) return { status: 'overdue', color: 'red' };
    return { status: 'active', color: 'green' };
  };

  const getHealthColor = (status) => {
    switch (status) {
      case 'healthy': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getHealthIcon = (status) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return '❓';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center">
            <EyeIcon className="w-8 h-8 text-cyan-400 mr-3" />
            Real-Time Controls
          </h2>
          <p className="text-cosmic-300 mt-1">
            Monitor and control all active sessions and system health
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setRealTimeMode(!realTimeMode)}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
              realTimeMode 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${realTimeMode ? 'bg-white animate-pulse' : 'bg-gray-400'}`} />
            <span>{realTimeMode ? 'Live Mode' : 'Paused'}</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => loadData()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Refresh
          </motion.button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg ${
            message.includes('Error') 
              ? 'bg-red-500/20 border border-red-500/30 text-red-400'
              : 'bg-green-500/20 border border-green-500/30 text-green-400'
          }`}
        >
          {message}
        </motion.div>
      )}

      {/* System Health Overview */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center">
          <CpuChipIcon className="w-5 h-5 text-green-400 mr-2" />
          System Health Monitor
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(systemHealth).filter(([key]) => key !== 'timestamp').map(([service, status]) => (
            <motion.div
              key={service}
              whileHover={{ scale: 1.02 }}
              className="bg-white/5 rounded-lg p-4 border border-white/10"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-cosmic-300 text-sm capitalize">
                  {service.replace('_', ' ')}
                </span>
                <span className="text-lg">
                  {getHealthIcon(status)}
                </span>
              </div>
              <div className={`text-sm font-medium ${getHealthColor(status)}`}>
                {String(status).charAt(0).toUpperCase() + String(status).slice(1)}
              </div>
            </motion.div>
          ))}
        </div>
        
        {systemHealth.timestamp && (
          <p className="text-cosmic-400 text-xs mt-4">
            Last updated: {new Date(systemHealth.timestamp).toLocaleString()}
          </p>
        )}
      </div>

      {/* Active Sessions */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center">
              <UserGroupIcon className="w-5 h-5 text-purple-400 mr-2" />
              Active Sessions ({activeSessions.length})
            </h3>
            <div className="flex items-center space-x-4">
              <span className="text-cosmic-300 text-sm">
                {realTimeMode && 'Auto-refreshing every 3 seconds'}
              </span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-cosmic-300">Loading active sessions...</p>
          </div>
        ) : activeSessions.length === 0 ? (
          <div className="p-8 text-center">
            <SignalIcon className="w-16 h-16 text-cosmic-300 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-white mb-2">No Active Sessions</h4>
            <p className="text-cosmic-300">All sessions are currently offline</p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {activeSessions.map((session) => {
              const sessionStatus = getSessionStatus(session);
              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-6 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full bg-${sessionStatus.color}-400 animate-pulse`} />
                      
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="text-white font-medium">
                            {session.service?.name || 'Unknown Service'}
                          </h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                            sessionStatus.status === 'active' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                            sessionStatus.status === 'scheduled' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                            'bg-red-500/20 text-red-400 border-red-500/30'
                          }`}>
                            {sessionStatus.status}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-cosmic-300">
                          <span>👤 {session.client?.first_name} {session.client?.last_name}</span>
                          <span>🔮 {session.reader?.first_name} {session.reader?.last_name}</span>
                          <span>⏰ {new Date(session.scheduled_at).toLocaleString()}</span>
                          <span>⏱️ {session.duration || 60}min</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {session.call_session && (
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          className="p-2 bg-green-500/20 rounded-lg"
                          title="Voice/Video Call Active"
                        >
                          <PhoneIcon className="w-4 h-4 text-green-400" />
                        </motion.div>
                      )}
                      
                      {session.messages?.length > 0 && (
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          className="p-2 bg-blue-500/20 rounded-lg"
                          title={`${session.messages.length} Messages`}
                        >
                          <ChatBubbleLeftIcon className="w-4 h-4 text-blue-400" />
                        </motion.div>
                      )}

                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          setSelectedSession(session);
                          setShowEndModal(true);
                        }}
                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                        title="Force End Session"
                      >
                        <StopIcon className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>

                  {/* Session Details */}
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div className="bg-white/5 rounded p-2">
                      <span className="text-cosmic-400">Session ID</span>
                      <p className="text-white font-mono">{session.id.slice(0, 8)}...</p>
                    </div>
                    <div className="bg-white/5 rounded p-2">
                      <span className="text-cosmic-400">Payment</span>
                      <p className="text-white">{session.payment_status || 'Unknown'}</p>
                    </div>
                    <div className="bg-white/5 rounded p-2">
                      <span className="text-cosmic-400">Type</span>
                      <p className="text-white">{session.service?.type || 'N/A'}</p>
                    </div>
                    <div className="bg-white/5 rounded p-2">
                      <span className="text-cosmic-400">Price</span>
                      <p className="text-white">{session.service?.price || 0} SAR</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6 cursor-pointer"
        >
          <div className="flex items-center space-x-3 mb-4">
            <BellIcon className="w-8 h-8 text-yellow-400" />
            <h3 className="text-lg font-bold text-white">Send Broadcast</h3>
          </div>
          <p className="text-cosmic-300 text-sm">
            Send system-wide notifications to all users
          </p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6 cursor-pointer"
        >
          <div className="flex items-center space-x-3 mb-4">
            <ShieldCheckIcon className="w-8 h-8 text-red-400" />
            <h3 className="text-lg font-bold text-white">Emergency Mode</h3>
          </div>
          <p className="text-cosmic-300 text-sm">
            Activate emergency mode for crisis situations
          </p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6 cursor-pointer"
        >
          <div className="flex items-center space-x-3 mb-4">
            <ClockIcon className="w-8 h-8 text-purple-400" />
            <h3 className="text-lg font-bold text-white">Maintenance</h3>
          </div>
          <p className="text-cosmic-300 text-sm">
            Schedule or activate maintenance mode
          </p>
        </motion.div>
      </div>

      {/* Force End Session Modal */}
      <AnimatePresence>
        {showEndModal && selectedSession && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-b from-bg-primary to-bg-secondary border border-red-500/30 rounded-2xl p-6 w-full max-w-md"
            >
              <div className="text-center">
                <ExclamationTriangleIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-4">Force End Session</h3>
                
                <div className="bg-white/5 rounded-lg p-4 mb-6 text-left">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-cosmic-300">Service:</span>
                      <span className="text-white">{selectedSession.service?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-cosmic-300">Client:</span>
                      <span className="text-white">
                        {selectedSession.client?.first_name} {selectedSession.client?.last_name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-cosmic-300">Reader:</span>
                      <span className="text-white">
                        {selectedSession.reader?.first_name} {selectedSession.reader?.last_name}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-cosmic-300 mb-6">
                  Are you sure you want to force end this active session? This action will immediately terminate the session and cannot be undone.
                </p>

                <div className="flex justify-center space-x-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowEndModal(false)}
                    className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleForceEndSession}
                    disabled={loading}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Ending...' : 'Force End Session'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RealTimeControlsTab; 