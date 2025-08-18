import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../services/frontendApi.js';
import RecordingManager from './RecordingManager.jsx';
import { 
  Phone, 
  Video, 
  Clock, 
  Calendar,
  User,
  AlertTriangle,
  Download,
  Play,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Shield,
  Crown
} from 'lucide-react';
import { hasAdminAccess } from '../../utils/roleHelpers';

const CallLogsTab = ({ className = '' }) => {
  const { user, profile } = useAuth();
  const [callLogs, setCallLogs] = useState([]);
  const [emergencyLogs, setEmergencyLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, emergency, completed, failed
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCall, setSelectedCall] = useState(null);
  const [showRecordings, setShowRecordings] = useState(false);
  const [dateRange, setDateRange] = useState('week'); // week, month, all

  const isAdmin = hasAdminAccess(profile?.role);
  const isMonitor = profile?.role === 'monitor';

  useEffect(() => {
    if (isAdmin || isMonitor) {
      loadCallLogs();
    }
  }, [isAdmin, isMonitor, filter, dateRange]);

  const loadCallLogs = async () => {
    try {
      setLoading(true);

      // Calculate date filter
      let dateFilter = null;
      if (dateRange === 'week') {
        dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      } else if (dateRange === 'month') {
        dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      }

      // Load call sessions
      const callLogsResult = await api.getUserCallSessions(null, {
        status: filter === 'all' ? null : filter,
        isEmergency: filter === 'emergency' ? true : null,
        limit: 100
      });

      if (callLogsResult.success) {
        let logs = callLogsResult.data;
        
        // Apply date filter
        if (dateFilter) {
          logs = logs.filter(log => new Date(log.created_at) >= dateFilter);
        }
        
        setCallLogs(logs);
      }

      // Load emergency logs
      if (filter === 'emergency' || filter === 'all') {
        const emergencyResult = await api.getEmergencyLogs({
          limit: 50
        });
        if (emergencyResult.success) {
          setEmergencyLogs(emergencyResult.data);
        }
      }

    } catch (error) {
      console.error('Error loading call logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredLogs = () => {
    let logs = callLogs;

    if (searchTerm) {
      logs = logs.filter(log => 
        log.user?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.reader?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.reader?.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  };

  const formatDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return 'N/A';
    const duration = Math.floor((new Date(endTime) - new Date(startTime)) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status, isEmergency) => {
    if (isEmergency) return 'text-red-600 bg-red-50';
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'active': return 'text-blue-600 bg-blue-50';
      case 'failed': return 'text-red-600 bg-red-50';
      case 'escalated': return 'text-orange-600 bg-orange-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status, isEmergency) => {
    if (isEmergency) return <AlertTriangle className="h-4 w-4" />;
    switch (status) {
      case 'completed': return <Phone className="h-4 w-4" />;
      case 'active': return <Video className="h-4 w-4" />;
      case 'failed': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const handleViewRecordings = (callLog) => {
    setSelectedCall(callLog);
    setShowRecordings(true);
  };

  if (!isAdmin && !isMonitor) {
    return (
      <div className={`bg-gray-100 rounded-lg p-6 ${className}`}>
        <div className="text-center">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-600">Call logs are only accessible to admin and monitor roles.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            {isAdmin ? (
              <Crown className="h-6 w-6 text-yellow-600" />
            ) : (
              <Shield className="h-6 w-6 text-blue-600" />
            )}
            <h2 className="text-xl font-bold text-gray-900">Call Logs & Recordings</h2>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
              {profile.role}
            </span>
          </div>
          <button
            onClick={loadCallLogs}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-600" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Calls</option>
              <option value="emergency">Emergency Only</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="escalated">Escalated</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-600" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="all">All Time</option>
            </select>
          </div>

          <div className="flex-1 relative">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by participant name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>
      </div>

      {/* Call Logs Table */}
      <div className="p-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading call logs...</p>
          </div>
        ) : getFilteredLogs().length === 0 ? (
          <div className="text-center py-8">
            <Phone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No call logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Call Details</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Participants</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Duration</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredLogs().map((log) => (
                  <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${getStatusColor(log.status, log.is_emergency)}`}>
                          {getStatusIcon(log.status, log.is_emergency)}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">
                              {log.call_type === 'video' ? 'Video Call' : 'Voice Call'}
                            </span>
                            {log.is_emergency && (
                              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                                EMERGENCY
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            {formatDateTime(log.created_at)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <User className="h-3 w-3 text-green-600" />
                          <span className="text-sm text-gray-900">
                            {log.user?.first_name} {log.user?.last_name}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-purple-500 rounded-full" />
                          <span className="text-sm text-gray-900">
                            {log.reader?.first_name} {log.reader?.last_name}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm">
                        <p className="text-gray-900">
                          {formatDuration(log.start_time, log.end_time)}
                        </p>
                        <p className="text-gray-600">
                          Scheduled: {log.scheduled_duration || 30}min
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(log.status, log.is_emergency)}`}>
                        {log.is_emergency ? 'EMERGENCY' : log.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewRecordings(log)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          title="View Recordings"
                        >
                          <Play className="h-4 w-4" />
                        </button>
                        <button
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Emergency Logs Section */}
      {(filter === 'emergency' || filter === 'all') && emergencyLogs.length > 0 && (
        <div className="p-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Call Logs</h3>
          <div className="space-y-3">
            {emergencyLogs.slice(0, 10).map((log) => (
              <div key={log.id} className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="font-medium text-gray-900">
                        Emergency Call - {log.emergency_type}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatDateTime(log.timestamp)} - Priority: {log.priority_level}/5
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    log.status === 'resolved' ? 'bg-green-100 text-green-800' :
                    log.status === 'escalated' ? 'bg-orange-100 text-orange-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {log.status.toUpperCase()}
                  </span>
                </div>
                {log.notes && (
                  <p className="mt-2 text-sm text-gray-700">{log.notes}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recording Modal */}
      {showRecordings && selectedCall && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Call Recordings - {selectedCall.call_type === 'video' ? 'Video' : 'Voice'} Call
              </h3>
              <button
                onClick={() => setShowRecordings(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                ✕
              </button>
            </div>
            <RecordingManager callSessionId={selectedCall.id} />
          </div>
        </div>
      )}
    </div>
  );
};

export default CallLogsTab; 