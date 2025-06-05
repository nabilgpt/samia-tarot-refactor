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
  User
} from 'lucide-react';

const CallNotification = ({ notification, onAccept, onDecline, onDismiss }) => {
  const { user } = useAuth();
  const [timeLeft, setTimeLeft] = useState(300); // 300 seconds (5 minutes) for emergency calls as per updated prompt
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);
  const intervalRef = useRef(null);

  const isEmergency = notification?.is_emergency || false;
  const isSiren = notification?.is_siren || false;

  useEffect(() => {
    if (isEmergency && isSiren) {
      startSiren();
      startCountdown();
    }

    return () => {
      stopSiren();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isEmergency, isSiren]);

  const startSiren = () => {
    if (audioRef.current) {
      // Create emergency siren sound using Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Siren frequency modulation
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.5);
      oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 1);

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      oscillator.type = 'sine';

      oscillator.start();
      setIsPlaying(true);

      // Loop the siren
      const sirenInterval = setInterval(() => {
        if (isPlaying) {
          const newOscillator = audioContext.createOscillator();
          const newGainNode = audioContext.createGain();

          newOscillator.connect(newGainNode);
          newGainNode.connect(audioContext.destination);

          newOscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          newOscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.5);
          newOscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 1);

          newGainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          newOscillator.type = 'sine';

          newOscillator.start();
          newOscillator.stop(audioContext.currentTime + 1);
        }
      }, 1000);

      // Store for cleanup
      audioRef.current = { oscillator, gainNode, audioContext, sirenInterval };
    }
  };

  const stopSiren = () => {
    if (audioRef.current) {
      const { oscillator, gainNode, audioContext, sirenInterval } = audioRef.current;
      
      try {
        if (sirenInterval) clearInterval(sirenInterval);
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
          // Auto-escalate when time runs out
          handleEscalation();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleEscalation = async () => {
    try {
      // Mark as escalated and notify admin
      await CallAPI.createCallEscalation({
        call_session_id: notification.call_session_id,
        escalated_from: notification.call_session?.reader_id,
        escalated_to: null, // Will be auto-assigned to admin
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
      onAccept(notification);
    }
  };

  const handleDecline = () => {
    stopSiren();
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (onDecline) {
      onDecline(notification);
    }
  };

  const toggleSiren = () => {
    if (isPlaying) {
      stopSiren();
    } else {
      startSiren();
    }
  };

  if (!notification) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50">
      <div className={`
        bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl
        ${isEmergency ? 'border-4 border-red-500 animate-pulse' : 'border border-gray-200'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            {isEmergency ? (
              <AlertTriangle className="h-8 w-8 text-red-600 animate-bounce" />
            ) : (
              <Phone className="h-8 w-8 text-blue-600" />
            )}
            <div>
              <h2 className={`text-xl font-bold ${isEmergency ? 'text-red-600' : 'text-gray-900'}`}>
                {isEmergency ? 'EMERGENCY CALL' : 'Incoming Call'}
              </h2>
              {isEmergency && (
                <p className="text-sm text-red-500 font-medium">
                  IMMEDIATE RESPONSE REQUIRED
                </p>
              )}
            </div>
          </div>

          {/* Siren Control */}
          {isSiren && (
            <button
              onClick={toggleSiren}
              className="p-2 rounded-full bg-red-100 hover:bg-red-200 transition-colors"
              title={isPlaying ? 'Mute Siren' : 'Unmute Siren'}
            >
              {isPlaying ? (
                <Volume2 className="h-5 w-5 text-red-600" />
              ) : (
                <VolumeX className="h-5 w-5 text-red-600" />
              )}
            </button>
          )}
        </div>

        {/* Caller Information */}
        <div className="mb-6">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                {notification.call_session?.user?.first_name} {notification.call_session?.user?.last_name}
              </p>
              <p className="text-sm text-gray-600">
                {isEmergency ? 'Emergency Call' : 'Regular Call'}
              </p>
            </div>
          </div>

          {/* Call Details */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-700 mb-2">
              <strong>Message:</strong> {notification.message}
            </p>
            {notification.call_session?.call_type && (
              <p className="text-sm text-gray-600">
                <strong>Type:</strong> {notification.call_session.call_type === 'video' ? 'Video Call' : 'Voice Call'}
              </p>
            )}
          </div>
        </div>

        {/* Emergency Countdown */}
        {isEmergency && timeLeft > 0 && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-center space-x-2">
              <Clock className="h-5 w-5 text-red-600" />
              <span className="text-red-600 font-bold text-lg">
                Auto-escalate in {timeLeft}s
              </span>
            </div>
            <p className="text-red-500 text-xs text-center mt-1">
              Call will be escalated to admin if not answered
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          {/* Decline/Dismiss Button */}
          <button
            onClick={handleDecline}
            className="flex-1 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2"
          >
            <PhoneOff className="h-5 w-5" />
            <span>{isEmergency ? 'Cannot Decline' : 'Decline'}</span>
          </button>

          {/* Accept Button */}
          <button
            onClick={handleAccept}
            className={`flex-1 px-4 py-3 text-white rounded-lg transition-colors flex items-center justify-center space-x-2 ${
              isEmergency 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            <Phone className="h-5 w-5" />
            <span>Answer Call</span>
          </button>
        </div>

        {/* Emergency Warning */}
        {isEmergency && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-xs text-center">
              ⚠️ This is an emergency call. You cannot decline this call. If you cannot answer, it will be escalated to admin.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallNotification; 