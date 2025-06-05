import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SuperAdminAPI from '../../../api/superAdminApi.js';
import {
  DocumentTextIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserIcon,
  ShieldCheckIcon,
  EyeIcon,
  TrashIcon,
  PencilIcon
} from '@heroicons/react/24/outline';

const AuditLogsTab = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    action_type: '',
    user_id: '',
    severity: '',
    start_date: '',
    end_date: '',
    sortBy: 'created_at',
    sortOrder: 'desc',
    limit: 100
  });
  const [stats, setStats] = useState({});
  const [realTimeEnabled, setRealTimeEnabled] = useState(false);

  const actionTypes = [
    'user_login',
    'user_logout',
    'user_created',
    'user_updated',
    'user_deleted',
    'profile_updated',
    'role_changed',
    'booking_created',
    'booking_updated',
    'booking_cancelled',
    'payment_processed',
    'payment_failed',
    'message_sent',
    'call_started',
    'call_ended',
    'service_created',
    'service_updated',
    'service_deleted',
    'system_setting_changed',
    'impersonation_started',
    'impersonation_ended',
    'admin_action',
    'security_alert',
    'api_access',
    'file_upload',
    'data_export'
  ];

  const severityLevels = ['info', 'warning', 'error', 'critical'];

  useEffect(() => {
    loadLogs();
    loadStats();
  }, [filters]);

  useEffect(() => {
    let interval;
    if (realTimeEnabled) {
      interval = setInterval(() => {
        loadLogs(true); // Silent refresh
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [realTimeEnabled, filters]);

  const loadLogs = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const result = await SuperAdminAPI.getAuditLogs(filters);
      if (result.success) {
        setLogs(result.data);
      } else {
        console.error('Error loading logs:', result.error);
      }
    } catch (error) {
      console.error('Error:', error.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const result = await SuperAdminAPI.getAuditStats();
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error.message);
    }
  };

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'User', 'Action', 'Severity', 'IP Address', 'User Agent', 'Details'].join(','),
      ...logs.map(log => [
        new Date(log.created_at).toLocaleString(),
        log.user_email || 'System',
        log.action_type,
        log.severity,
        log.ip_address || '',
        log.user_agent || '',
        JSON.stringify(log.details || {}).replace(/,/g, ';')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'error': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'warning': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'info': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
      case 'error':
        return <XCircleIcon className="w-4 h-4" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-4 h-4" />;
      case 'info':
        return <CheckCircleIcon className="w-4 h-4" />;
      default:
        return <ClockIcon className="w-4 h-4" />;
    }
  };

  const getActionIcon = (actionType) => {
    if (actionType.includes('user')) return <UserIcon className="w-4 h-4" />;
    if (actionType.includes('security') || actionType.includes('impersonation')) return <ShieldCheckIcon className="w-4 h-4" />;
    if (actionType.includes('system')) return <DocumentTextIcon className="w-4 h-4" />;
    return <ClockIcon className="w-4 h-4" />;
  };

  const formatActionType = (actionType) => {
    return actionType.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = Math.floor((now - time) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center">
            <DocumentTextIcon className="w-8 h-8 text-green-400 mr-3" />
            Audit Logs
          </h2>
          <p className="text-cosmic-300 mt-1">
            Monitor all system activities and security events
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setRealTimeEnabled(!realTimeEnabled)}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
              realTimeEnabled 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${realTimeEnabled ? 'bg-white animate-pulse' : 'bg-gray-400'}`} />
            <span>{realTimeEnabled ? 'Live' : 'Paused'}</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={exportLogs}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
            <span>Export</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => loadLogs()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Refresh
          </motion.button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-cosmic-300 text-sm">Total Events</p>
              <p className="text-2xl font-bold text-white">{stats.total_events || 0}</p>
            </div>
            <DocumentTextIcon className="w-8 h-8 text-blue-400" />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-cosmic-300 text-sm">Security Alerts</p>
              <p className="text-2xl font-bold text-red-400">{stats.security_alerts || 0}</p>
            </div>
            <ShieldCheckIcon className="w-8 h-8 text-red-400" />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-cosmic-300 text-sm">User Actions</p>
              <p className="text-2xl font-bold text-green-400">{stats.user_actions || 0}</p>
            </div>
            <UserIcon className="w-8 h-8 text-green-400" />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-cosmic-300 text-sm">System Events</p>
              <p className="text-2xl font-bold text-purple-400">{stats.system_events || 0}</p>
            </div>
            <ClockIcon className="w-8 h-8 text-purple-400" />
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cosmic-300 w-5 h-5" />
            <input
              type="text"
              placeholder="Search logs..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-cosmic-300 focus:border-purple-400 focus:outline-none"
            />
          </div>

          <select
            value={filters.action_type}
            onChange={(e) => setFilters(prev => ({ ...prev, action_type: e.target.value }))}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none"
          >
            <option value="">All Actions</option>
            {actionTypes.map(type => (
              <option key={type} value={type}>{formatActionType(type)}</option>
            ))}
          </select>

          <select
            value={filters.severity}
            onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value }))}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none"
          >
            <option value="">All Severities</option>
            {severityLevels.map(level => (
              <option key={level} value={level}>{level.charAt(0).toUpperCase() + level.slice(1)}</option>
            ))}
          </select>

          <input
            type="date"
            value={filters.start_date}
            onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none"
          />

          <input
            type="date"
            value={filters.end_date}
            onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none"
          />

          <select
            value={filters.limit}
            onChange={(e) => setFilters(prev => ({ ...prev, limit: parseInt(e.target.value) }))}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none"
          >
            <option value={50}>50 Records</option>
            <option value={100}>100 Records</option>
            <option value={250}>250 Records</option>
            <option value={500}>500 Records</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-cosmic-300">Loading audit logs...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-cosmic-300">Timestamp</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-cosmic-300">User</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-cosmic-300">Action</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-cosmic-300">Severity</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-cosmic-300">Details</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-cosmic-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {logs.map((log) => (
                  <motion.tr
                    key={log.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white text-sm">
                          {new Date(log.created_at).toLocaleString()}
                        </p>
                        <p className="text-cosmic-400 text-xs">
                          {getTimeAgo(log.created_at)}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {log.user_email?.charAt(0).toUpperCase() || 'S'}
                        </div>
                        <div>
                          <p className="text-white text-sm">
                            {log.user_email || 'System'}
                          </p>
                          <p className="text-cosmic-400 text-xs">
                            {log.ip_address}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {getActionIcon(log.action_type)}
                        <span className="text-white text-sm">
                          {formatActionType(log.action_type)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center space-x-1 ${getSeverityColor(log.severity)}`}>
                          {getSeverityIcon(log.severity)}
                          <span>{log.severity}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-cosmic-300 text-sm max-w-xs truncate">
                        {log.details ? JSON.stringify(log.details).slice(0, 100) + '...' : 'No details'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => {
                            setSelectedLog(log);
                            setShowDetailModal(true);
                          }}
                          className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>

            {logs.length === 0 && (
              <div className="p-8 text-center text-cosmic-300">
                No audit logs found matching your criteria
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedLog && (
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
              className="bg-gradient-to-b from-bg-primary to-bg-secondary border border-white/20 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Audit Log Details</h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-cosmic-300 hover:text-white"
                >
                  <XCircleIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-cosmic-300 mb-1">
                      Timestamp
                    </label>
                    <p className="text-white">
                      {new Date(selectedLog.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-cosmic-300 mb-1">
                      Action Type
                    </label>
                    <p className="text-white">
                      {formatActionType(selectedLog.action_type)}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-cosmic-300 mb-1">
                      User
                    </label>
                    <p className="text-white">
                      {selectedLog.user_email || 'System'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-cosmic-300 mb-1">
                      Severity
                    </label>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(selectedLog.severity)}`}>
                      {selectedLog.severity}
                    </span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-cosmic-300 mb-1">
                      IP Address
                    </label>
                    <p className="text-white">
                      {selectedLog.ip_address || 'N/A'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-cosmic-300 mb-1">
                      Session ID
                    </label>
                    <p className="text-white text-xs font-mono">
                      {selectedLog.session_id || 'N/A'}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-cosmic-300 mb-1">
                    User Agent
                  </label>
                  <p className="text-white text-sm">
                    {selectedLog.user_agent || 'N/A'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-cosmic-300 mb-1">
                    Details
                  </label>
                  <div className="bg-white/5 rounded-lg p-4">
                    <pre className="text-cosmic-300 text-sm whitespace-pre-wrap overflow-x-auto">
                      {selectedLog.details ? JSON.stringify(selectedLog.details, null, 2) : 'No additional details'}
                    </pre>
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowDetailModal(false)}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Close
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AuditLogsTab; 