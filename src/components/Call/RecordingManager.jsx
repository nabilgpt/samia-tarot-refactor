import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../services/frontendApi.js';
import { 
  Play, 
  Pause, 
  Download, 
  Trash2, 
  Eye, 
  EyeOff,
  Volume2,
  VolumeX,
  MoreVertical,
  Shield,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { hasAdminOrMonitorAccess, hasAdminAccess } from '../../utils/roleHelpers';

const RecordingManager = ({ callSessionId, className = '' }) => {
  const { user, profile } = useAuth();
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecording, setSelectedRecording] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [error, setError] = useState(null);

  const isAdminOrMonitor = hasAdminOrMonitorAccess(profile?.role);

  useEffect(() => {
    if (callSessionId && isAdminOrMonitor) {
      loadRecordings();
    }
  }, [callSessionId, isAdminOrMonitor]);

  const loadRecordings = async () => {
    try {
      setLoading(true);
      const result = await api.getCallRecordings(callSessionId);
      if (result.success) {
        setRecordings(result.data);
      } else {
        setError('Failed to load recordings');
      }
    } catch (error) {
      console.error('Error loading recordings:', error);
      setError('Failed to load recordings');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPause = (recording) => {
    if (selectedRecording?.id === recording.id) {
      setIsPlaying(!isPlaying);
    } else {
      setSelectedRecording(recording);
      setIsPlaying(true);
    }
  };

  const handleDownload = async (recording) => {
    try {
      const response = await fetch(recording.recording_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `call_recording_${recording.id}.${recording.recording_type === 'video' ? 'webm' : 'wav'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading recording:', error);
      setError('Failed to download recording');
    }
  };

  const handleDelete = async (recording) => {
    if (!window.confirm('Are you sure you want to delete this recording? This action cannot be undone.')) {
      return;
    }

    try {
      // In a real implementation, you'd have a delete API endpoint
      console.log('Deleting recording:', recording.id);
      await loadRecordings(); // Refresh the list
    } catch (error) {
      console.error('Error deleting recording:', error);
      setError('Failed to delete recording');
    }
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getRecordingTypeIcon = (type) => {
    switch (type) {
      case 'video':
        return '🎥';
      case 'audio':
        return '🎵';
      case 'screen':
        return '🖥️';
      default:
        return '📁';
    }
  };

  if (!isAdminOrMonitor) {
    return (
      <div className={`bg-gray-100 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2 text-gray-600">
          <Shield className="h-5 w-5" />
          <span className="text-sm">Recording access restricted to admin and monitor roles</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
          <span className="text-sm text-gray-600">Loading recordings...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2 text-red-600">
          <AlertTriangle className="h-5 w-5" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Call Recordings</h3>
            <span className="text-sm text-gray-500">({recordings.length})</span>
          </div>
          <button
            onClick={loadRecordings}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Recordings List */}
      <div className="p-4">
        {recordings.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">📹</div>
            <p className="text-gray-500 text-sm">No recordings available</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recordings.map((recording) => (
              <div
                key={recording.id}
                className={`border rounded-lg p-3 transition-colors ${
                  selectedRecording?.id === recording.id 
                    ? 'border-blue-300 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  {/* Recording Info */}
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">
                      {getRecordingTypeIcon(recording.recording_type)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">
                          {recording.recording_type.charAt(0).toUpperCase() + recording.recording_type.slice(1)} Recording
                        </span>
                        {recording.is_processed && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            Processed
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(recording.created_at).toLocaleString()}</span>
                        </span>
                        {recording.duration && (
                          <span>{formatDuration(recording.duration)}</span>
                        )}
                        {recording.file_size && (
                          <span>{formatFileSize(recording.file_size)}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center space-x-2">
                    {/* Play/Pause */}
                    <button
                      onClick={() => handlePlayPause(recording)}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-full transition-colors"
                      title={isPlaying && selectedRecording?.id === recording.id ? 'Pause' : 'Play'}
                    >
                      {isPlaying && selectedRecording?.id === recording.id ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </button>

                    {/* Download */}
                    <button
                      onClick={() => handleDownload(recording)}
                      className="p-2 text-green-600 hover:bg-green-100 rounded-full transition-colors"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </button>

                    {/* Delete (Admin only) */}
                    {hasAdminAccess(profile?.role) && (
                      <button
                        onClick={() => handleDelete(recording)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-full transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}

                    {/* More Options */}
                    <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Audio/Video Player */}
                {selectedRecording?.id === recording.id && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    {recording.recording_type === 'video' ? (
                      <video
                        src={recording.recording_url}
                        controls
                        className="w-full max-h-64 rounded-lg"
                        onLoadedMetadata={(e) => setDuration(e.target.duration)}
                        onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                      />
                    ) : (
                      <audio
                        src={recording.recording_url}
                        controls
                        className="w-full"
                        onLoadedMetadata={(e) => setDuration(e.target.duration)}
                        onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                      />
                    )}

                    {/* Volume Control */}
                    <div className="flex items-center space-x-2 mt-2">
                      <Volume2 className="h-4 w-4 text-gray-600" />
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={volume}
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-sm text-gray-600">{Math.round(volume * 100)}%</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Recordings are automatically saved for security and quality purposes</span>
          <div className="flex items-center space-x-1">
            <Shield className="h-4 w-4" />
            <span>Secure Access</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecordingManager; 