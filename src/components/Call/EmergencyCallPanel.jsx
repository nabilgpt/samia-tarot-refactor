import React, { useState, useEffect, useRef } from 'react';
import { 
  PhoneIcon,
  PhoneXMarkIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  SpeakerWaveIcon,
  UserIcon,
  ShieldCheckIcon,
  BellAlertIcon,
  CheckCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import CallRecordingControls from './CallRecordingControls';

const EmergencyCallPanel = ({ 
  emergencyCallId, 
  onCallEnd,
  onCallAccept,
  isReader = false,
  className = '' 
}) => {
  const { user } = useAuth();
  const [emergencyCall, setEmergencyCall] = useState(null);
  const [callStatus, setCallStatus] = useState('pending'); // pending, connected, escalated, ended
  const [callDuration, setCallDuration] = useState(0);
  const [escalationLevel, setEscalationLevel] = useState(0);
  const [activeSirens, setActiveSirens] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEscalationAlert, setShowEscalationAlert] = useState(false);
  const [lastEscalationTime, setLastEscalationTime] = useState(null);

  const callStartTimeRef = useRef(null);
  const durationIntervalRef = useRef(null);
  const escalationTimeoutRef = useRef(null);

  useEffect(() => {
    if (emergencyCallId) {
      loadEmergencyCall();
      setupRealtimeSubscriptions();
    }

    return () => {
      cleanup();
    };
  }, [emergencyCallId]);

  useEffect(() => {
    if (callStatus === 'connected' && !callStartTimeRef.current) {
      callStartTimeRef.current = Date.now();
      startDurationTimer();
    }
  }, [callStatus]);

  useEffect(() => {
    if (escalationLevel > 0) {
      setShowEscalationAlert(true);
      const timer = setTimeout(() => setShowEscalationAlert(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [escalationLevel]);

  const loadEmergencyCall = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('emergency_calls')
        .select(`
          *,
          client:profiles!emergency_calls_client_id_fkey(id, email, display_name),
          reader:profiles!emergency_calls_reader_id_fkey(id, email, display_name)
        `)
        .eq('id', emergencyCallId)
        .single();

      if (error) throw error;
      
      setEmergencyCall(data);
      setCallStatus(data.call_status);
      setEscalationLevel(data.escalation_level || 0);
      
      if (data.call_started_at) {
        callStartTimeRef.current = new Date(data.call_started_at).getTime();
        startDurationTimer();
      }

      // Load active sirens for current user
      await loadActiveSirens();

    } catch (error) {
      console.error('Error loading emergency call:', error);
      setError('Failed to load emergency call');
    } finally {
      setIsLoading(false);
    }
  };

  const loadActiveSirens = async () => {
    try {
      const { data } = await supabase
        .rpc('get_active_sirens_for_role', {
          p_user_id: user.id,
          p_user_role: isReader ? 'reader' : 'client'
        });

      setActiveSirens(data || []);
    } catch (error) {
      console.error('Error loading active sirens:', error);
    }
  };

  const setupRealtimeSubscriptions = () => {
    // Subscribe to emergency call updates
    const callChannel = supabase
      .channel(`emergency_call_${emergencyCallId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'emergency_calls',
        filter: `id=eq.${emergencyCallId}`
      }, (payload) => {
        const updatedCall = payload.new;
        setEmergencyCall(updatedCall);
        setCallStatus(updatedCall.call_status);
        setEscalationLevel(updatedCall.escalation_level || 0);
      })
      .subscribe();

    // Subscribe to escalation events
    const escalationChannel = supabase
      .channel(`escalation_${emergencyCallId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'emergency_escalation_timeline',
        filter: `emergency_call_id=eq.${emergencyCallId}`
      }, (payload) => {
        setLastEscalationTime(new Date().toISOString());
        setShowEscalationAlert(true);
      })
      .subscribe();

    // Subscribe to siren control updates
    const sirenChannel = supabase
      .channel(`sirens_${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'emergency_siren_control'
      }, () => {
        loadActiveSirens();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(callChannel);
      supabase.removeChannel(escalationChannel);
      supabase.removeChannel(sirenChannel);
    };
  };

  const acceptEmergencyCall = async () => {
    try {
      const { error } = await supabase
        .rpc('handle_emergency_call_accepted', {
          p_call_id: emergencyCallId,
          p_reader_id: user.id
        });

      if (error) throw error;

      setCallStatus('connected');
      onCallAccept?.(emergencyCallId);

    } catch (error) {
      console.error('Error accepting emergency call:', error);
      setError('Failed to accept call');
    }
  };

  const endEmergencyCall = async () => {
    try {
      const { error } = await supabase
        .from('emergency_calls')
        .update({
          call_status: 'ended',
          call_ended_at: new Date().toISOString(),
          total_call_duration_seconds: callDuration,
          end_reason: 'user_ended'
        })
        .eq('id', emergencyCallId);

      if (error) throw error;

      // Stop any active sirens
      if (activeSirens.length > 0) {
        await Promise.all(
          activeSirens.map(siren => 
            supabase.rpc('stop_emergency_siren', {
              p_siren_id: siren.id,
              p_stopped_by: user.id
            })
          )
        );
      }

      onCallEnd?.(emergencyCallId);
      cleanup();

    } catch (error) {
      console.error('Error ending emergency call:', error);
      setError('Failed to end call');
    }
  };

  const acknowledgeSiren = async (sirenId) => {
    try {
      await supabase.rpc('acknowledge_emergency_siren', {
        p_siren_id: sirenId,
        p_acknowledged_by: user.id
      });

      setActiveSirens(prev => prev.filter(siren => siren.id !== sirenId));
    } catch (error) {
      console.error('Error acknowledging siren:', error);
    }
  };

  const startDurationTimer = () => {
    durationIntervalRef.current = setInterval(() => {
      if (callStartTimeRef.current) {
        const duration = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
        setCallDuration(duration);
      }
    }, 1000);
  };

  const cleanup = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    if (escalationTimeoutRef.current) {
      clearTimeout(escalationTimeoutRef.current);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getEscalationColor = (level) => {
    switch (level) {
      case 0: return 'text-green-400';
      case 1: return 'text-yellow-400';
      case 2: return 'text-orange-400';
      case 3: return 'text-red-400';
      case 4:
      case 5: return 'text-red-500';
      default: return 'text-gray-400';
    }
  };

  const getEscalationLabel = (level) => {
    switch (level) {
      case 0: return 'Normal';
      case 1: return 'Elevated';
      case 2: return 'High';
      case 3: return 'Critical';
      case 4: return 'Emergency';
      case 5: return 'Maximum';
      default: return 'Unknown';
    }
  };

  const getSirenTypeIcon = (type) => {
    switch (type) {
      case 'emergency_siren':
        return '🚨';
      case 'critical_alarm':
        return '⚠️';
      case 'urgent_alert':
        return '🔔';
      case 'standard_alert':
      default:
        return '📢';
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-gradient-to-br from-red-900/30 to-orange-900/30 border border-red-500/30 rounded-lg p-8 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-400"></div>
          <span className="ml-3 text-red-300">Loading emergency call...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-900/20 border border-red-500/30 rounded-lg p-6 ${className}`}>
        <div className="flex items-center gap-3">
          <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
          <div>
            <h3 className="text-red-400 font-medium">Emergency Call Error</h3>
            <p className="text-red-300 text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br from-red-900/30 to-orange-900/30 border border-red-500/30 rounded-lg overflow-hidden ${className}`}>
      {/* Emergency Header */}
      <div className="p-4 border-b border-red-500/30 bg-red-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center animate-pulse">
              <ExclamationTriangleIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">EMERGENCY CALL</h3>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-red-300 font-medium">{callStatus.toUpperCase()}</span>
                {callStatus === 'connected' && (
                  <>
                    <span className="text-gray-400">•</span>
                    <ClockIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300 font-mono">{formatDuration(callDuration)}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Escalation Level Indicator */}
          <div className={`flex items-center gap-2 ${getEscalationColor(escalationLevel)}`}>
            <BellAlertIcon className="w-5 h-5" />
            <div className="text-right">
              <div className="text-sm font-bold">Level {escalationLevel}</div>
              <div className="text-xs">{getEscalationLabel(escalationLevel)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Sirens Alert */}
      <AnimatePresence>
        {activeSirens.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-red-800/40 border-b border-red-500/30"
          >
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-red-200 font-semibold text-sm">Active Emergency Alerts</h4>
                <span className="text-xs text-red-300">{activeSirens.length} active</span>
              </div>
              <div className="space-y-2">
                {activeSirens.map(siren => (
                  <div key={siren.id} className="flex items-center justify-between bg-red-900/30 rounded p-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getSirenTypeIcon(siren.siren_type)}</span>
                      <div>
                        <div className="text-white text-sm font-medium">
                          {siren.siren_type.replace('_', ' ').toUpperCase()}
                        </div>
                        <div className="text-red-300 text-xs">
                          Intensity: {siren.intensity_level}% • Pattern: {siren.alert_pattern}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => acknowledgeSiren(siren.id)}
                      className="p-1 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                      title="Acknowledge Alert"
                    >
                      <CheckCircleIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Escalation Alert */}
      <AnimatePresence>
        {showEscalationAlert && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-yellow-800/40 border-b border-yellow-500/30"
          >
            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BellAlertIcon className="w-5 h-5 text-yellow-400 animate-pulse" />
                <span className="text-yellow-200 font-medium">
                  Call escalated to Level {escalationLevel}
                </span>
              </div>
              <button
                onClick={() => setShowEscalationAlert(false)}
                className="text-yellow-300 hover:text-yellow-200"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Call Participants */}
      <div className="p-4 border-b border-red-500/30">
        <div className="grid grid-cols-2 gap-4">
          {/* Client Info */}
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <UserIcon className="w-4 h-4 text-blue-400" />
              <span className="text-blue-300 text-sm font-medium">Client</span>
            </div>
            <div className="text-white font-medium">
              {emergencyCall?.client?.display_name || emergencyCall?.client?.email || 'Unknown Client'}
            </div>
            <div className="text-gray-300 text-xs">
              Emergency Caller
            </div>
          </div>

          {/* Reader Info */}
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheckIcon className="w-4 h-4 text-green-400" />
              <span className="text-green-300 text-sm font-medium">Reader</span>
            </div>
            <div className="text-white font-medium">
              {emergencyCall?.reader?.display_name || emergencyCall?.reader?.email || 'Awaiting Assignment'}
            </div>
            <div className="text-gray-300 text-xs">
              {emergencyCall?.reader_id ? 'Assigned Reader' : 'No reader assigned'}
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Details */}
      <div className="p-4 border-b border-red-500/30 bg-gray-900/30">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-red-300">Priority:</span>
            <span className="text-white ml-2 font-medium">
              {emergencyCall?.priority_level?.toUpperCase() || 'HIGH'}
            </span>
          </div>
          <div>
            <span className="text-red-300">Call Type:</span>
            <span className="text-white ml-2">
              {emergencyCall?.call_type === 'video' ? 'Video Call' : 'Audio Call'}
            </span>
          </div>
          <div>
            <span className="text-red-300">Created:</span>
            <span className="text-white ml-2">
              {emergencyCall?.created_at ? new Date(emergencyCall.created_at).toLocaleString() : 'Unknown'}
            </span>
          </div>
          <div>
            <span className="text-red-300">Status:</span>
            <span className="text-white ml-2 capitalize">
              {emergencyCall?.call_status || 'Unknown'}
            </span>
          </div>
        </div>
      </div>

      {/* Call Controls */}
      <div className="p-4 bg-gray-900/50">
        <div className="flex items-center justify-center gap-4">
          {/* Accept Call (for readers) */}
          {isReader && callStatus === 'pending' && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={acceptEmergencyCall}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              <PhoneIcon className="w-5 h-5" />
              Accept Emergency Call
            </motion.button>
          )}

          {/* End Call */}
          {(callStatus === 'connected' || (isReader && callStatus === 'pending')) && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={endEmergencyCall}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              <PhoneXMarkIcon className="w-5 h-5" />
              End Emergency Call
            </motion.button>
          )}

          {/* Waiting indicator for clients */}
          {!isReader && callStatus === 'pending' && (
            <div className="flex items-center gap-3 text-orange-300">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-400"></div>
              <span>Connecting you to an available reader...</span>
            </div>
          )}
        </div>
      </div>

      {/* Recording Controls */}
      {callStatus === 'connected' && (
        <div className="border-t border-red-500/30">
          <CallRecordingControls
            callId={emergencyCallId}
            callType="emergency"
            className="m-4"
          />
        </div>
      )}

      {/* Emergency Notice */}
      <div className="p-3 bg-red-900/40 border-t border-red-500/30">
        <div className="flex items-center gap-2 text-red-200 text-xs">
          <ExclamationTriangleIcon className="w-4 h-4" />
          <span>
            This is an emergency call. All conversations are recorded for quality and safety purposes.
          </span>
        </div>
      </div>
    </div>
  );
};

export default EmergencyCallPanel; 