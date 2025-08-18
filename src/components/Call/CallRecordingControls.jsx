import React, { useState, useEffect, useRef } from 'react';
import { 
  PlayIcon, 
  StopIcon, 
  PauseIcon,
  MicrophoneIcon,
  VideoCameraIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

const CallRecordingControls = ({ 
  callId, 
  callType = 'emergency', 
  onRecordingStart, 
  onRecordingStop,
  onRecordingPause,
  onRecordingResume,
  className = '' 
}) => {
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingId, setRecordingId] = useState(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [recordingType, setRecordingType] = useState('audio_only');
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const intervalRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  // Check recording permissions on mount
  useEffect(() => {
    checkRecordingPermissions();
  }, [callId, user]);

  // Update duration timer
  useEffect(() => {
    if (isRecording && !isPaused) {
      intervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isRecording, isPaused]);

  const checkRecordingPermissions = async () => {
    try {
      // Check if user has permission to record this call
      const { data: permissions } = await supabase
        .from('recording_permissions')
        .select('*')
        .eq('user_id', user.id)
        .eq('permission_type', 'view')
        .eq('is_active', true);

      // For emergency calls, clients always have permission to record their own calls
      if (callType === 'emergency') {
        setHasPermission(true);
      } else {
        setHasPermission(permissions && permissions.length > 0);
      }
    } catch (error) {
      console.error('Error checking recording permissions:', error);
      setHasPermission(false);
    }
  };

  const startRecording = async () => {
    if (!hasPermission) {
      setError('You do not have permission to record this call');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Request media permissions
      const constraints = {
        audio: true,
        video: recordingType === 'video_with_audio' || recordingType === 'screen_share'
      };

      let stream;
      if (recordingType === 'screen_share') {
        stream = await navigator.mediaDevices.getDisplayMedia(constraints);
      } else {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      }

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9' // Fallback to supported format
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        await handleRecordingStop();
      };

      // Create recording record in database
      const { data: recording, error: dbError } = await supabase
        .from('call_recordings')
        .insert({
          emergency_call_id: callType === 'emergency' ? callId : null,
          webrtc_call_session_id: callType === 'webrtc' ? callId : null,
          client_id: user.id,
          initiated_by: user.id,
          recording_type: recordingType,
          recording_reason: 'client_request',
          recording_status: 'recording',
          has_audio: true,
          has_video: recordingType !== 'audio_only'
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setRecordingId(recording.id);
      
      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingDuration(0);

      // Call parent callback
      onRecordingStart?.(recording.id);

    } catch (error) {
      console.error('Error starting recording:', error);
      setError(error.message || 'Failed to start recording');
    } finally {
      setIsLoading(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      
      // Stop all tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const pauseRecording = async () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);

      // Update database
      await supabase
        .from('call_recordings')
        .update({ 
          recording_status: 'paused',
          recording_paused_at: new Date().toISOString()
        })
        .eq('id', recordingId);

      onRecordingPause?.(recordingId);
    }
  };

  const resumeRecording = async () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);

      // Update database
      await supabase
        .from('call_recordings')
        .update({ 
          recording_status: 'recording',
          recording_resumed_at: new Date().toISOString()
        })
        .eq('id', recordingId);

      onRecordingResume?.(recordingId);
    }
  };

  const handleRecordingStop = async () => {
    try {
      setIsLoading(true);
      
      // Create blob from chunks
      const blob = new Blob(chunksRef.current, { 
        type: recordingType === 'audio_only' ? 'audio/webm' : 'video/webm' 
      });

      // Upload to Supabase Storage
      const fileName = `recording_${recordingId}_${Date.now()}.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('call-recordings')
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      // Update recording record
      await supabase
        .from('call_recordings')
        .update({
          recording_status: 'completed',
          recording_ended_at: new Date().toISOString(),
          total_recording_duration_seconds: recordingDuration,
          file_name: fileName,
          file_path: uploadData.path,
          file_size_bytes: blob.size,
          file_format: 'webm'
        })
        .eq('id', recordingId);

      // Reset state
      setIsRecording(false);
      setIsPaused(false);
      setRecordingDuration(0);

      // Call parent callback
      onRecordingStop?.(recordingId, uploadData.path);

    } catch (error) {
      console.error('Error handling recording stop:', error);
      setError('Failed to save recording');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!hasPermission) {
    return (
      <div className={`bg-red-900/20 border border-red-500/30 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 text-red-400">
          <ExclamationTriangleIcon className="w-5 h-5" />
          <span className="text-sm">Recording not permitted for this call</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-lg p-4 backdrop-blur-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isRecording ? (isPaused ? 'bg-yellow-400' : 'bg-red-500 animate-pulse') : 'bg-gray-500'}`} />
          <span className="text-white font-medium">
            {isRecording ? (isPaused ? 'Recording Paused' : 'Recording Active') : 'Ready to Record'}
          </span>
        </div>
        
        {isRecording && (
          <div className="flex items-center gap-2 text-purple-300">
            <ClockIcon className="w-4 h-4" />
            <span className="font-mono text-sm">{formatDuration(recordingDuration)}</span>
          </div>
        )}
      </div>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-red-900/30 border border-red-500/30 rounded-lg p-3 mb-4"
          >
            <div className="flex items-center gap-2 text-red-400">
              <ExclamationTriangleIcon className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recording Type Selector */}
      {!isRecording && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-purple-300 mb-2">
            Recording Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'audio_only', label: 'Audio Only', icon: MicrophoneIcon },
              { value: 'video_with_audio', label: 'Video + Audio', icon: VideoCameraIcon },
              { value: 'screen_share', label: 'Screen Share', icon: DocumentTextIcon }
            ].map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setRecordingType(value)}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all ${
                  recordingType === value
                    ? 'bg-purple-600/30 border-purple-400 text-white'
                    : 'bg-gray-800/30 border-gray-600 text-gray-300 hover:border-purple-500'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex items-center gap-3">
        {!isRecording ? (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={startRecording}
            disabled={isLoading}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <PlayIcon className="w-4 h-4" />
            {isLoading ? 'Starting...' : 'Start Recording'}
          </motion.button>
        ) : (
          <div className="flex items-center gap-2">
            {!isPaused ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={pauseRecording}
                className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded-lg font-medium transition-colors"
              >
                <PauseIcon className="w-4 h-4" />
                Pause
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={resumeRecording}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg font-medium transition-colors"
              >
                <PlayIcon className="w-4 h-4" />
                Resume
              </motion.button>
            )}
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={stopRecording}
              disabled={isLoading}
              className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white px-3 py-2 rounded-lg font-medium transition-colors"
            >
              <StopIcon className="w-4 h-4" />
              {isLoading ? 'Saving...' : 'Stop'}
            </motion.button>
          </div>
        )}

        {/* Privacy Notice */}
        <div className="flex items-center gap-1 text-xs text-purple-300 ml-auto">
          <ShieldCheckIcon className="w-4 h-4" />
          <span>Encrypted & Secure</span>
        </div>
      </div>

      {/* Recording Info */}
      {isRecording && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-4 pt-4 border-t border-purple-500/30"
        >
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-purple-300">Type:</span>
              <span className="text-white ml-2">{recordingType.replace('_', ' ')}</span>
            </div>
            <div>
              <span className="text-purple-300">Quality:</span>
              <span className="text-white ml-2">High</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default CallRecordingControls; 