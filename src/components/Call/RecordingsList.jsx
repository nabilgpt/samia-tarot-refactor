import React, { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  PlayIcon,
  VideoCameraIcon,
  SpeakerWaveIcon,
  ClockIcon,
  CalendarDaysIcon,
  UserIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import RecordingViewer from './RecordingViewer';

const RecordingsList = ({ callId, callType, className = '' }) => {
  const { user } = useAuth();
  const [recordings, setRecordings] = useState([]);
  const [filteredRecordings, setFilteredRecordings] = useState([]);
  const [selectedRecording, setSelectedRecording] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showViewer, setShowViewer] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  const recordingsPerPage = 10;

  useEffect(() => {
    loadRecordings();
  }, [callId, callType, currentPage]);

  useEffect(() => {
    filterAndSortRecordings();
  }, [recordings, searchTerm, filterType, sortBy]);

  const loadRecordings = async () => {
    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
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
          ),
          recording_permissions!inner (
            permission_type,
            is_active
          )
        `)
        .eq('recording_permissions.user_id', user.id)
        .eq('recording_permissions.is_active', true);

      // Filter by specific call if provided
      if (callId && callType) {
        if (callType === 'emergency') {
          query = query.eq('emergency_call_id', callId);
        } else if (callType === 'webrtc') {
          query = query.eq('webrtc_call_session_id', callId);
        }
      }

      // Pagination
      const from = (currentPage - 1) * recordingsPerPage;
      const to = from + recordingsPerPage - 1;
      
      const { data, error: recordingsError, count } = await query
        .order('recording_started_at', { ascending: false })
        .range(from, to);

      if (recordingsError) throw recordingsError;

      setRecordings(data || []);
      setTotalPages(Math.ceil((count || 0) / recordingsPerPage));

    } catch (error) {
      console.error('Error loading recordings:', error);
      setError(error.message || 'Failed to load recordings');
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortRecordings = () => {
    let filtered = [...recordings];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(recording => 
        recording.recording_reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recording.recording_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recording.file_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(recording => recording.recording_type === filterType);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.recording_started_at) - new Date(a.recording_started_at);
        case 'oldest':
          return new Date(a.recording_started_at) - new Date(b.recording_started_at);
        case 'duration':
          return (b.total_recording_duration_seconds || 0) - (a.total_recording_duration_seconds || 0);
        case 'size':
          return (b.file_size_bytes || 0) - (a.file_size_bytes || 0);
        default:
          return 0;
      }
    });

    setFilteredRecordings(filtered);
  };

  const handleViewRecording = (recording) => {
    setSelectedRecording(recording);
    setShowViewer(true);
  };

  const handleDownloadRecording = async (recording) => {
    try {
      const { data, error } = await supabase.storage
        .from('call-recordings')
        .createSignedUrl(recording.file_path, 3600);

      if (error) throw error;

      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = recording.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Log download access
      await supabase
        .from('recording_access_logs')
        .insert({
          recording_id: recording.id,
          accessed_by: user.id,
          access_type: 'download',
          access_started_at: new Date().toISOString()
        });

    } catch (error) {
      console.error('Error downloading recording:', error);
      setError('Failed to download recording');
    }
  };

  const handleDeleteRecording = async (recordingId) => {
    try {
      const recording = recordings.find(r => r.id === recordingId);
      
      // Delete file from storage
      if (recording.file_path) {
        await supabase.storage
          .from('call-recordings')
          .remove([recording.file_path]);
      }

      // Delete database record
      const { error } = await supabase
        .from('call_recordings')
        .delete()
        .eq('id', recordingId);

      if (error) throw error;

      // Update local state
      setRecordings(prev => prev.filter(r => r.id !== recordingId));
      setDeleteConfirm(null);

    } catch (error) {
      console.error('Error deleting recording:', error);
      setError('Failed to delete recording');
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRecordingTypeIcon = (type) => {
    switch (type) {
      case 'video_with_audio':
      case 'screen_share':
        return VideoCameraIcon;
      case 'audio_only':
      default:
        return SpeakerWaveIcon;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-400';
      case 'recording':
        return 'text-red-400';
      case 'paused':
        return 'text-yellow-400';
      case 'failed':
        return 'text-red-500';
      default:
        return 'text-gray-400';
    }
  };

  if (showViewer && selectedRecording) {
    return (
      <div className={className}>
        <div className="mb-4">
          <button
            onClick={() => {
              setShowViewer(false);
              setSelectedRecording(null);
            }}
            className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            Back to Recordings List
          </button>
        </div>
        <RecordingViewer recordingId={selectedRecording.id} />
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-lg ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-purple-500/30">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">
            Call Recordings
            {callId && (
              <span className="text-sm font-normal text-purple-300 ml-2">
                for {callType} call #{callId}
              </span>
            )}
          </h2>
          <div className="text-sm text-purple-300">
            {filteredRecordings.length} of {recordings.length} recordings
          </div>
        </div>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search recordings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
            />
          </div>

          {/* Type Filter */}
          <div className="relative">
            <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none appearance-none"
            >
              <option value="all">All Types</option>
              <option value="audio_only">Audio Only</option>
              <option value="video_with_audio">Video + Audio</option>
              <option value="screen_share">Screen Share</option>
            </select>
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="duration">Longest Duration</option>
            <option value="size">Largest Size</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={loadRecordings}
            disabled={isLoading}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 bg-red-900/30 border-b border-red-500/30"
          >
            <div className="flex items-center gap-2 text-red-400">
              <ExclamationTriangleIcon className="w-5 h-5" />
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-300 hover:text-red-200"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading State */}
      {isLoading && (
        <div className="p-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
          <span className="ml-3 text-purple-300">Loading recordings...</span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredRecordings.length === 0 && (
        <div className="p-8 text-center">
          <SpeakerWaveIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-300 mb-2">No Recordings Found</h3>
          <p className="text-gray-400">
            {searchTerm || filterType !== 'all' 
              ? 'Try adjusting your search or filters' 
              : 'No call recordings are available yet'}
          </p>
        </div>
      )}

      {/* Recordings List */}
      {!isLoading && filteredRecordings.length > 0 && (
        <div className="divide-y divide-purple-500/20">
          {filteredRecordings.map((recording) => {
            const IconComponent = getRecordingTypeIcon(recording.recording_type);
            
            return (
              <motion.div
                key={recording.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 hover:bg-purple-900/20 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {/* Recording Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-purple-600/30 rounded-lg flex items-center justify-center">
                        <IconComponent className="w-6 h-6 text-purple-400" />
                      </div>
                    </div>

                    {/* Recording Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-medium truncate">
                          {recording.recording_type.replace('_', ' ').toUpperCase()} Recording
                        </h3>
                        <span className={`text-xs px-2 py-1 rounded-full bg-gray-800 ${getStatusColor(recording.recording_status)}`}>
                          {recording.recording_status}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-300">
                        <div className="flex items-center gap-1">
                          <CalendarDaysIcon className="w-4 h-4" />
                          {formatDate(recording.recording_started_at)}
                        </div>
                        <div className="flex items-center gap-1">
                          <ClockIcon className="w-4 h-4" />
                          {formatDuration(recording.total_recording_duration_seconds)}
                        </div>
                        <div className="flex items-center gap-1">
                          <span>📁</span>
                          {formatFileSize(recording.file_size_bytes)}
                        </div>
                      </div>
                      
                      {recording.recording_reason && (
                        <p className="text-xs text-purple-300 mt-1">
                          Reason: {recording.recording_reason.replace('_', ' ')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleViewRecording(recording)}
                      className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                      title="View Recording"
                    >
                      <EyeIcon className="w-4 h-4" />
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleDownloadRecording(recording)}
                      className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      title="Download Recording"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4" />
                    </motion.button>

                    {/* Delete button only for recording owner */}
                    {recording.initiated_by === user.id && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setDeleteConfirm(recording.id)}
                        className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        title="Delete Recording"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </motion.button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-purple-500/30 flex items-center justify-between">
          <div className="text-sm text-purple-300">
            Page {currentPage} of {totalPages}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-lg transition-colors"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
            
            <span className="px-3 py-1 bg-purple-600 text-white rounded-lg">
              {currentPage}
            </span>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-lg transition-colors"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-800 border border-red-500/30 rounded-lg p-6 max-w-md mx-4"
            >
              <div className="flex items-center gap-3 mb-4">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
                <h3 className="text-lg font-semibold text-white">Delete Recording</h3>
              </div>
              
              <p className="text-gray-300 mb-6">
                Are you sure you want to delete this recording? This action cannot be undone.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteRecording(deleteConfirm)}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RecordingsList; 