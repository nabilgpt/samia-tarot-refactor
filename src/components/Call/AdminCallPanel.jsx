import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { CallAPI } from '../../api/callApi.js';
import { 
  Eye, 
  EyeOff, 
  Phone, 
  PhoneOff, 
  AlertTriangle, 
  Clock, 
  Users,
  Shield,
  Crown,
  Play,
  Pause,
  Volume2,
  Settings,
  Filter,
  Search,
  RefreshCw
} from 'lucide-react';

const AdminCallPanel = ({ className = '' }) => {
  const { user, profile } = useAuth();
  const [activeCalls, setActiveCalls] = useState([]);
  const [emergencyCalls, setEmergencyCalls] = useState([]);
  const [escalations, setEscalations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, emergency, escalated
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCall, setSelectedCall] = useState(null);
  const [joinedCalls, setJoinedCalls] = useState(new Set());

  const isAdmin = profile?.role === 'admin';
  const isMonitor = profile?.role === 'monitor';

  useEffect(() => {
    if (isAdmin || isMonitor) {
      loadCallData();
      
      // Set up real-time subscriptions
      const interval = setInterval(loadCallData, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [isAdmin, isMonitor]);

  const loadCallData = async () => {
    try {
      setLoading(true);

      // Load active calls
      const activeCallsResult = await CallAPI.getUserCallSessions(null, { 
        status: 'active',
        limit: 50 
      });
      if (activeCallsResult.success) {
        setActiveCalls(activeCallsResult.data);
      }

      // Load emergency calls
      const emergencyResult = await CallAPI.getUserCallSessions(null, { 
        isEmergency: true,
        limit: 20 
      });
      if (emergencyResult.success) {
        setEmergencyCalls(emergencyResult.data);
      }

      // Load escalations
      const escalationsResult = await CallAPI.getCallEscalations({ 
        status: 'pending',
        escalatedTo: user.id 
      });
      if (escalationsResult.success) {
        setEscalations(escalationsResult.data);
      }

    } catch (error) {
      console.error('Error loading call data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStealthJoin = async (callSession) => {
    try {
      // Add admin/monitor as silent participant
      const result = await CallAPI.addCallParticipant(
        callSession.id, 
        user.id, 
        profile.role, 
        true // silent mode
      );

      if (result.success) {
        setJoinedCalls(prev => new Set([...prev, callSession.id]));
        // In a real implementation, this would open the call room in stealth mode
        console.log('Joined call in stealth mode:', callSession.id);
      }
    } catch (error) {
      console.error('Error joining call:', error);
    }
  };

  const handleLeaveCall = async (callSessionId) => {
    try {
      await CallAPI.removeCallParticipant(callSessionId, user.id);
      setJoinedCalls(prev => {
        const newSet = new Set(prev);
        newSet.delete(callSessionId);
        return newSet;
      });
    } catch (error) {
      console.error('Error leaving call:', error);
    }
  };

  const handleEndCall = async (callSessionId) => {
    if (!window.confirm('Are you sure you want to end this call? This action cannot be undone.')) {
      return;
    }

    try {
      await CallAPI.endCallSession(callSessionId);
      await loadCallData(); // Refresh data
    } catch (error) {
      console.error('Error ending call:', error);
    }
  };

  const handleEscalationResponse = async (escalation, action) => {
    try {
      // Update escalation status
      const updates = {
        status: action === 'accept' ? 'acknowledged' : 'resolved',
        resolved_at: new Date().toISOString()
      };

      // In a real implementation, you'd have an update escalation API
      console.log('Escalation response:', escalation.id, action, updates);
      await loadCallData(); // Refresh data
    } catch (error) {
      console.error('Error responding to escalation:', error);
    }
  };

  const getFilteredCalls = () => {
    let calls = [];
    
    switch (filter) {
      case 'emergency':
        calls = emergencyCalls;
        break;
      case 'escalated':
        calls = activeCalls.filter(call => call.status === 'escalated');
        break;
      default:
        calls = activeCalls;
    }

    if (searchTerm) {
      calls = calls.filter(call => 
        call.user?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        call.user?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        call.reader?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        call.reader?.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return calls;
  };

  const formatDuration = (startTime) => {
    if (!startTime) return '00:00';
    const now = new Date();
    const start = new Date(startTime);
    const diff = Math.floor((now - start) / 1000);
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getCallStatusColor = (call) => {
    if (call.is_emergency) return 'text-red-600';
    if (call.status === 'escalated') return 'text-orange-600';
    return 'text-green-600';
  };

  const getCallStatusBg = (call) => {
    if (call.is_emergency) return 'bg-red-50 border-red-200';
    if (call.status === 'escalated') return 'bg-orange-50 border-orange-200';
    return 'bg-green-50 border-green-200';
  };

  if (!isAdmin && !isMonitor) {
    return (
      <div className={`bg-gray-100 rounded-lg p-6 ${className}`}>
        <div className="text-center">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-600">This panel is only accessible to admin and monitor roles.</p>
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
            <h2 className="text-xl font-bold text-gray-900">Call Oversight Panel</h2>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
              {profile.role}
            </span>
          </div>
          <button
            onClick={loadCallData}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Filters and Search */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-600" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Calls</option>
              <option value="emergency">Emergency Only</option>
              <option value="escalated">Escalated</option>
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

      {/* Stats */}
      <div className="p-6 border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Phone className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-blue-600">Active Calls</p>
                <p className="text-2xl font-bold text-blue-900">{activeCalls.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm text-red-600">Emergency Calls</p>
                <p className="text-2xl font-bold text-red-900">{emergencyCalls.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-orange-600">Escalations</p>
                <p className="text-2xl font-bold text-orange-900">{escalations.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-green-600">Monitoring</p>
                <p className="text-2xl font-bold text-green-900">{joinedCalls.size}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Calls List */}
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {filter === 'all' ? 'Active Calls' : 
           filter === 'emergency' ? 'Emergency Calls' : 'Escalated Calls'}
        </h3>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading calls...</p>
          </div>
        ) : getFilteredCalls().length === 0 ? (
          <div className="text-center py-8">
            <Phone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No calls found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {getFilteredCalls().map((call) => (
              <div
                key={call.id}
                className={`border rounded-lg p-4 ${getCallStatusBg(call)}`}
              >
                <div className="flex items-center justify-between">
                  {/* Call Info */}
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {call.is_emergency && (
                        <AlertTriangle className="h-5 w-5 text-red-600 animate-pulse" />
                      )}
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-gray-900">
                            {call.user?.first_name} {call.user?.last_name}
                          </span>
                          <span className="text-gray-400">↔</span>
                          <span className="font-semibold text-gray-900">
                            {call.reader?.first_name} {call.reader?.last_name}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className={getCallStatusColor(call)}>
                            {call.is_emergency ? 'EMERGENCY' : call.status.toUpperCase()}
                          </span>
                          <span>{call.call_type.toUpperCase()}</span>
                          <span className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatDuration(call.start_time)}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    {/* Stealth Join/Leave */}
                    {joinedCalls.has(call.id) ? (
                      <button
                        onClick={() => handleLeaveCall(call.id)}
                        className="flex items-center space-x-1 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                      >
                        <EyeOff className="h-4 w-4" />
                        <span>Leave</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStealthJoin(call)}
                        className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                      >
                        <Eye className="h-4 w-4" />
                        <span>Monitor</span>
                      </button>
                    )}

                    {/* End Call (Admin only) */}
                    {isAdmin && (
                      <button
                        onClick={() => handleEndCall(call.id)}
                        className="flex items-center space-x-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                      >
                        <PhoneOff className="h-4 w-4" />
                        <span>End</span>
                      </button>
                    )}

                    {/* Settings */}
                    <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                      <Settings className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Escalations Section */}
      {escalations.length > 0 && (
        <div className="p-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Escalations</h3>
          <div className="space-y-3">
            {escalations.map((escalation) => (
              <div key={escalation.id} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{escalation.escalation_reason}</p>
                    <p className="text-sm text-gray-600">
                      From: {escalation.escalated_from_user?.first_name} {escalation.escalated_from_user?.last_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(escalation.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEscalationResponse(escalation, 'accept')}
                      className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleEscalationResponse(escalation, 'dismiss')}
                      className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCallPanel; 