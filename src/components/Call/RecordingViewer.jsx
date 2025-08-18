import React, { useState, useEffect, useRef } from 'react';
import { 
  PlayIcon, 
  PauseIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
  EyeIcon,
  EyeSlashIcon,
  ClockIcon,
  UserIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

const RecordingViewer = ({ recordingId, className = '' }) => {
  const { user } = useAuth();
  const [recording, setRecording] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showTranscription, setShowTranscription] = useState(false);
  const [transcription, setTranscription] = useState(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accessLogged, setAccessLogged] = useState(false);

  const videoRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (recordingId) {
      loadRecording();
    }
  }, [recordingId]);

  useEffect(() => {
    if (recording && hasPermission && !accessLogged) {
      logAccess();
    }
  }, [recording, hasPermission, accessLogged]);

  const loadRecording = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check permission first
      const { data: permissions } = await supabase
        .from('recording_permissions')
        .select('*')
        .eq('recording_id', recordingId)
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (!permissions || permissions.length === 0) {
        setHasPermission(false);
        setError('You do not have permission to view this recording');
        return;
      }

      setHasPermission(true);

      // Load recording details
      const { data: recordingData, error: recordingError } = await supabase
        .from('call_recordings')
        .select(`
          *,
          emergency_calls (
            client_id,
            reader_id,
            call_started_at,
            call_ended_at
          ),
          webrtc_call_sessions (
            client_id,
            reader_id,
            session_started_at,
            session_ended_at
          )
        `)
        .eq('id', recordingId)
        .single();

      if (recordingError) throw recordingError;

      setRecording(recordingData);

      // Load transcription if available
      const { data: transcriptionData } = await supabase
        .from('recording_transcriptions')
        .select('*')
        .eq('recording_id', recordingId)
        .eq('is_active', true)
        .single();

      if (transcriptionData) {
        setTranscription(transcriptionData);
      }

    } catch (error) {
      console.error('Error loading recording:', error);
      setError(error.message || 'Failed to load recording');
    } finally {
      setIsLoading(false);
    }
  };

  const logAccess = async () => {
    try {
      await supabase
        .from('recording_access_logs')
        .insert({
          recording_id: recordingId,
          accessed_by: user.id,
          access_type: 'view',
          access_started_at: new Date().toISOString(),
          ip_address: await fetch('https://api.ipify.org?format=json')
            .then(res => res.json())
            .then(data => data.ip)
            .catch(() => 'unknown'),
          user_agent: navigator.userAgent
        });

      setAccessLogged(true);
    } catch (error) {
      console.error('Error logging access:', error);
    }
  };

  const getSignedUrl = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('call-recordings')
        .createSignedUrl(recording.file_path, 3600); // 1 hour expiry

      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error('Error getting signed URL:', error);
      return null;
    }
  };

  const handlePlay = async () => {
    if (!recording) return;

    const mediaElement = recording.has_video ? videoRef.current : audioRef.current;
    
    if (!mediaElement.src) {
      const signedUrl = await getSignedUrl();
      if (signedUrl) {
        mediaElement.src = signedUrl;
      } else {
        setError('Failed to load recording file');
        return;
      }
    }

    if (isPlaying) {
      mediaElement.pause();
    } else {
      mediaElement.play();
    }
  };

  const handleTimeUpdate = (e) => {
    setCurrentTime(e.target.currentTime);
  };

  const handleLoadedMetadata = (e) => {
    setDuration(e.target.duration);
  };

  const handleSeek = (e) => {
    const mediaElement = recording.has_video ? videoRef.current : audioRef.current;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const newTime = pos * duration;
    
    mediaElement.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (newVolume) => {
    const mediaElement = recording.has_video ? videoRef.current : audioRef.current;
    mediaElement.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const mediaElement = recording.has_video ? videoRef.current : audioRef.current;
    if (isMuted) {
      mediaElement.volume = volume;
      setIsMuted(false);
    } else {
      mediaElement.volume = 0;
      setIsMuted(true);
    }
  };

  const handleSpeedChange = (speed) => {
    const mediaElement = recording.has_video ? videoRef.current : audioRef.current;
    mediaElement.playbackRate = speed;
    setPlaybackSpeed(speed);
  };

  const downloadRecording = async () => {
    try {
      const signedUrl = await getSignedUrl();
      if (signedUrl) {
        const link = document.createElement('a');
        link.href = signedUrl;
        link.download = recording.file_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Log download access
        await supabase
          .from('recording_access_logs')
          .insert({
            recording_id: recordingId,
            accessed_by: user.id,
            access_type: 'download',
            access_started_at: new Date().toISOString()
          });
      }
    } catch (error) {
      console.error('Error downloading recording:', error);
      setError('Failed to download recording');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className={`bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-lg p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
          <span className="ml-3 text-purple-300">Loading recording...</span>
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
            <h3 className="text-red-400 font-medium">Error Loading Recording</h3>
            <p className="text-red-300 text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className={`bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-6 ${className}`}>
        <div className="flex items-center gap-3">
          <ShieldCheckIcon className="w-6 h-6 text-yellow-400" />
          <div>
            <h3 className="text-yellow-400 font-medium">Access Restricted</h3>
            <p className="text-yellow-300 text-sm mt-1">You do not have permission to view this recording.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-lg overflow-hidden ${className}`}>
      {/* Recording Header */}
      <div className="p-4 border-b border-purple-500/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold flex items-center gap-2">
              {recording.has_video ? (
                <VideoCameraIcon className="w-5 h-5" />
              ) : (
                <SpeakerWaveIcon className="w-5 h-5" />
              )}
              {recording.recording_type.replace('_', ' ').toUpperCase()} Recording
            </h3>
            <p className="text-purple-300 text-sm mt-1">
              {formatDate(recording.recording_started_at)} • {formatTime(recording.total_recording_duration_seconds || 0)}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {transcription && (
              <button
                onClick={() => setShowTranscription(!showTranscription)}
                className={`p-2 rounded-lg transition-colors ${
                  showTranscription 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                title="Toggle Transcription"
              >
                <DocumentTextIcon className="w-4 h-4" />
              </button>
            )}
            
            <button
              onClick={downloadRecording}
              className="p-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
              title="Download Recording"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Media Player */}
      <div className="p-4">
        {recording.has_video ? (
          <video
            ref={videoRef}
            className="w-full rounded-lg bg-black"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            controls={false}
          />
        ) : (
          <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-lg p-8 flex items-center justify-center">
            <SpeakerWaveIcon className="w-16 h-16 text-purple-400" />
            <audio
              ref={audioRef}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
            />
          </div>
        )}

        {/* Custom Controls */}
        <div className="mt-4 space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div 
              className="h-2 bg-gray-700 rounded-full cursor-pointer relative"
              onClick={handleSeek}
            >
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
              <div 
                className="absolute top-1/2 transform -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg"
                style={{ left: `${(currentTime / duration) * 100}%` }}
              />
            </div>
            
            <div className="flex justify-between text-sm text-purple-300">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handlePlay}
                className="w-12 h-12 bg-purple-600 hover:bg-purple-700 rounded-full flex items-center justify-center text-white transition-colors"
              >
                {isPlaying ? (
                  <PauseIcon className="w-6 h-6" />
                ) : (
                  <PlayIcon className="w-6 h-6 ml-1" />
                )}
              </motion.button>

              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="p-2 text-gray-300 hover:text-white transition-colors"
                >
                  {isMuted ? (
                    <SpeakerXMarkIcon className="w-5 h-5" />
                  ) : (
                    <SpeakerWaveIcon className="w-5 h-5" />
                  )}
                </button>
                
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-20 accent-purple-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-purple-300">Speed:</span>
              <select
                value={playbackSpeed}
                onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                className="bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600"
              >
                <option value={0.5}>0.5x</option>
                <option value={0.75}>0.75x</option>
                <option value={1}>1x</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2x</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Transcription Panel */}
      <AnimatePresence>
        {showTranscription && transcription && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-purple-500/30 bg-gray-900/50"
          >
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <DocumentTextIcon className="w-5 h-5 text-purple-400" />
                <h4 className="text-white font-medium">Transcription</h4>
                <span className="text-xs text-purple-300">
                  Confidence: {Math.round(transcription.average_confidence_score * 100)}%
                </span>
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-4 max-h-60 overflow-y-auto">
                <div className="space-y-3">
                  {transcription.transcript_segments?.map((segment, index) => (
                    <div key={index} className="flex gap-3">
                      <span className="text-purple-300 text-sm font-mono min-w-[60px]">
                        {formatTime(segment.start_time)}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <UserIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-300 text-sm font-medium">
                            {segment.speaker_label || 'Unknown'}
                          </span>
                        </div>
                        <p className="text-white text-sm">{segment.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recording Metadata */}
      <div className="p-4 border-t border-purple-500/30 bg-gray-900/30">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-purple-300">File Size:</span>
            <span className="text-white ml-2">
              {recording.file_size_bytes ? `${(recording.file_size_bytes / (1024 * 1024)).toFixed(1)} MB` : 'Unknown'}
            </span>
          </div>
          <div>
            <span className="text-purple-300">Format:</span>
            <span className="text-white ml-2">{recording.file_format?.toUpperCase() || 'WebM'}</span>
          </div>
          <div>
            <span className="text-purple-300">Quality:</span>
            <span className="text-white ml-2">{recording.recording_quality || 'Standard'}</span>
          </div>
          <div>
            <span className="text-purple-300">Encryption:</span>
            <span className="text-white ml-2">
              {recording.is_encrypted ? 'Encrypted' : 'Standard'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecordingViewer; 