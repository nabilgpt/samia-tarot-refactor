import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { CallAPI } from '../../api/callApi.js';
import { 
  AlertTriangle, 
  Phone, 
  PhoneOff, 
  Volume2, 
  VolumeX,
  Clock,
  User,
  X
} from 'lucide-react';

const IncomingCallModal = ({ callSession, onAccept, onDecline, onDismiss }) => {
  const { user } = useAuth();
  const [timeLeft, setTimeLeft] = useState(300); // 300 seconds (5 minutes) for emergency calls as per updated prompt
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);
  const intervalRef = useRef(null);
  const sirenIntervalRef = useRef(null);

  const isEmergency = callSession?.is_emergency || false;
  const canDecline = !isEmergency; // Cannot decline emergency calls as per prompt

  useEffect(() => {
    if (isEmergency) {
      startSiren();
      startCountdown();
    }

    return () => {
      stopSiren();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isEmergency]);

  const startSiren = () => {
    if (audioRef.current) {
      // Create emergency siren sound using Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Siren frequency modulation - persistent and loud
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.5);
      oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 1);

      gainNode.gain.setValueAtTime(0.8, audioContext.currentTime); // Louder for emergency
      oscillator.type = 'sine';

      oscillator.start();
      setIsPlaying(true);

      // Loop the siren persistently
      sirenIntervalRef.current = setInterval(() => {
        if (isPlaying) {
          const newOscillator = audioContext.createOscillator();
          const newGainNode = audioContext.createGain();

          newOscillator.connect(newGainNode);
          newGainNode.connect(audioContext.destination);

          newOscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          newOscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.5);
          newOscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 1);

          newGainNode.gain.setValueAtTime(0.8, audioContext.currentTime);
          newOscillator.type = 'sine';

          newOscillator.start();
          newOscillator.stop(audioContext.currentTime + 1);
        }
      }, 1000);

      // Store for cleanup
      audioRef.current = { oscillator, gainNode, audioContext, sirenIntervalRef };
    }
  };

  const stopSiren = () => {
    if (audioRef.current) {
      const { oscillator, gainNode, audioContext } = audioRef.current;
      
      try {
        if (sirenIntervalRef.current) clearInterval(sirenIntervalRef.current);
        if (oscillator) oscillator.stop();
        if (audioContext) audioContext.close();
      } catch (error) {
        console.error('Error stopping siren:', error);
      }
      
      audioRef.current = null;
      setIsPlaying(false);
    }
  };

  const startCountdown = () => {
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Auto-escalate when time runs out (300 seconds/5 minutes as per updated prompt)
          handleEscalation();
          return 0;
        }
        
        // Show 1-minute warning
        if (prev === 60) {
          // Create a more urgent siren pattern for the last minute
          if (audioRef.current && isPlaying) {
            stopSiren();
            setTimeout(() => startSiren(), 100); // Restart with more urgency
          }
        }
        
        return prev - 1;
      });
    }, 1000);
  };

  const handleEscalation = async () => {
    try {
      // Mark as escalated and notify admin/monitor
      await CallAPI.createCallEscalation({
        call_session_id: callSession.id,
        escalated_from: callSession.reader_id,
        escalated_to: null, // Will be auto-assigned to admin/monitor
        escalation_reason: 'Emergency call not answered within 5 minutes',
        escalation_type: 'no_answer',
        auto_escalation: true
      });

      if (onDismiss) {
        onDismiss();
      }
    } catch (error) {
      console.error('Error escalating call:', error);
    }
  };

  const handleAccept = () => {
    stopSiren();
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (onAccept) {
      onAccept(callSession);
    }
  };

  const handleDecline = () => {
    if (!canDecline) return; // Cannot decline emergency calls
    
    stopSiren();
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (onDecline) {
      onDecline(callSession);
    }
  };

  const toggleSiren = () => {
    if (isPlaying) {
      stopSiren();
    } else {
      startSiren();
    }
  };

  if (!callSession) return null;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50">
      {/* Flashing background for emergency */}
      {isEmergency && (
        <div className="absolute inset-0 bg-red-600/20 animate-pulse"></div>
      )}
      
      <div className={`
        bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl transform transition-all
        ${isEmergency ? 'border-4 border-red-500 animate-bounce' : 'border border-gray-200'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            {isEmergency ? (
              <AlertTriangle className="h-10 w-10 text-red-600 animate-pulse" />
            ) : (
              <Phone className="h-10 w-10 text-blue-600" />
            )}
            <div>
              <h2 className={`text-2xl font-bold ${isEmergency ? 'text-red-600' : 'text-gray-900'}`}>
                {isEmergency ? '🚨 EMERGENCY CALL' : 'Incoming Call'}
              </h2>
              {isEmergency && (
                <p className="text-sm text-red-500 font-medium animate-pulse">
                  IMMEDIATE RESPONSE REQUIRED
                </p>
              )}
            </div>
          </div>

          {/* Siren Control */}
          {isEmergency && (
            <button
              onClick={toggleSiren}
              className="p-3 rounded-full bg-red-100 hover:bg-red-200 transition-colors"
              title={isPlaying ? 'Mute Siren' : 'Unmute Siren'}
            >
              {isPlaying ? (
                <Volume2 className="h-6 w-6 text-red-600" />
              ) : (
                <VolumeX className="h-6 w-6 text-red-600" />
              )}
            </button>
          )}
        </div>

        {/* Caller Information */}
        <div className="mb-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center">
              <User className="h-8 w-8 text-white" />
            </div>
            <div>
              <p className="text-xl font-semibold text-gray-900">
                {callSession.user?.first_name} {callSession.user?.last_name}
              </p>
              <p className="text-sm text-gray-600">
                {isEmergency ? '🚨 Emergency Call' : 'Regular Call'}
              </p>
              <p className="text-sm text-gray-500">
                {callSession.call_type === 'video' ? '📹 Video Call' : '📞 Voice Call'}
              </p>
            </div>
          </div>

          {/* Call Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-700 mb-2">
              <strong>Service:</strong> {isEmergency ? 'Emergency Tarot Call' : 'Scheduled Reading'}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Duration:</strong> {callSession.scheduled_duration || 30} minutes
            </p>
          </div>
        </div>

        {/* Emergency Countdown */}
        {isEmergency && timeLeft > 0 && (
          <div className={`mb-6 p-4 border-2 rounded-lg ${
            timeLeft <= 60 
              ? 'bg-orange-50 border-orange-500 animate-pulse' 
              : 'bg-red-50 border-red-200'
          }`}>
            {/* 1-minute warning */}
            {timeLeft <= 60 && (
              <div className="mb-3 p-2 bg-orange-100 border border-orange-300 rounded-lg">
                <p className="text-orange-800 text-sm text-center font-bold animate-pulse">
                  ⚠️ FINAL WARNING: Only 1 minute remaining!
                </p>
              </div>
            )}
            
            <div className="flex items-center justify-center space-x-2">
              <Clock className={`h-6 w-6 animate-spin ${
                timeLeft <= 60 ? 'text-orange-600' : 'text-red-600'
              }`} />
              <span className={`font-bold text-2xl ${
                timeLeft <= 60 ? 'text-orange-600' : 'text-red-600'
              }`}>
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </span>
            </div>
            <p className={`text-sm text-center mt-2 font-medium ${
              timeLeft <= 60 ? 'text-orange-600' : 'text-red-500'
            }`}>
              Auto-escalate to Admin/Monitor if not answered
            </p>
            <div className={`w-full rounded-full h-2 mt-3 ${
              timeLeft <= 60 ? 'bg-orange-200' : 'bg-red-200'
            }`}>
              <div 
                className={`h-2 rounded-full transition-all duration-1000 ${
                  timeLeft <= 60 ? 'bg-orange-600' : 'bg-red-600'
                }`}
                style={{ width: `${(timeLeft / 300) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-4">
          {/* Decline Button (disabled for emergency) */}
          <button
            onClick={handleDecline}
            disabled={!canDecline}
            className={`flex-1 px-6 py-4 rounded-lg transition-colors flex items-center justify-center space-x-2 ${
              canDecline 
                ? 'bg-gray-600 text-white hover:bg-gray-700' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <PhoneOff className="h-5 w-5" />
            <span>{canDecline ? 'Decline' : 'Cannot Decline'}</span>
          </button>

          {/* Answer Button */}
          <button
            onClick={handleAccept}
            className={`flex-1 px-6 py-4 text-white rounded-lg transition-colors flex items-center justify-center space-x-2 ${
              isEmergency 
                ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            <Phone className="h-5 w-5" />
            <span>Answer Call</span>
          </button>
        </div>

        {/* Emergency Warning */}
        {isEmergency && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm text-center font-medium">
              ⚠️ EMERGENCY CALL: You cannot decline this call. If you cannot answer, it will be escalated to Admin/Monitor after 5 minutes.
            </p>
          </div>
        )}

        {/* Regular Call Info */}
        {!isEmergency && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 text-xs text-center">
              📞 Regular scheduled call - you can accept or decline
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default IncomingCallModal; 