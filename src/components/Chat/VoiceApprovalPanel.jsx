import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../services/frontendApi.js';
import { Play, Pause, Check, X, Clock, Volume2, AlertTriangle } from 'lucide-react';

const VoiceApprovalPanel = ({ onClose, onApprovalUpdate }) => {
  const { user } = useAuth();
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [playingId, setPlayingId] = useState(null);
  const [reviewNotes, setReviewNotes] = useState({});
  const audioRefs = useRef({});

  useEffect(() => {
    loadPendingApprovals();
    
    // Subscribe to real-time updates
    const subscription = api.subscribeToVoiceApprovals((payload) => {
      if (payload.eventType === 'INSERT') {
        loadPendingApprovals();
      } else if (payload.eventType === 'UPDATE') {
        loadPendingApprovals();
      }
    });

    return () => {
      subscription?.unsubscribe();
      // Stop all playing audio
      Object.values(audioRefs.current).forEach(audio => {
        if (audio) audio.pause();
      });
    };
  }, []);

  const loadPendingApprovals = async () => {
    try {
      setLoading(true);
      const result = await api.getPendingVoiceApprovals();
      
      if (result.success) {
        setPendingApprovals(result.data);
      }
    } catch (error) {
      console.error('Error loading pending approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (approvalId, approved, notes = '') => {
    try {
      setProcessingId(approvalId);
      
      const result = await api.approveVoiceNote(approvalId, user.id, approved, notes);
      
      if (result.success) {
        // Remove from pending list
        setPendingApprovals(prev => prev.filter(approval => approval.id !== approvalId));
        
        // Clear notes
        setReviewNotes(prev => {
          const updated = { ...prev };
          delete updated[approvalId];
          return updated;
        });
        
        // Update parent component
        onApprovalUpdate?.();
        
        // Show success message
        alert(approved ? 'Voice note approved successfully' : 'Voice note rejected');
      } else {
        alert('Failed to process approval: ' + result.error);
      }
    } catch (error) {
      console.error('Error processing approval:', error);
      alert('An error occurred while processing the approval');
    } finally {
      setProcessingId(null);
    }
  };

  const handlePlayAudio = (approvalId, audioUrl) => {
    const audio = audioRefs.current[approvalId];
    
    if (!audio) {
      // Create new audio element
      const newAudio = new Audio(audioUrl);
      audioRefs.current[approvalId] = newAudio;
      
      newAudio.onended = () => {
        setPlayingId(null);
      };
      
      newAudio.onerror = () => {
        alert('Error playing audio file');
        setPlayingId(null);
      };
      
      newAudio.play();
      setPlayingId(approvalId);
    } else {
      if (playingId === approvalId) {
        audio.pause();
        setPlayingId(null);
      } else {
        // Stop other playing audio
        Object.entries(audioRefs.current).forEach(([id, audioEl]) => {
          if (id !== approvalId && audioEl) {
            audioEl.pause();
          }
        });
        
        audio.play();
        setPlayingId(approvalId);
      }
    }
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Voice Approvals</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Volume2 className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Voice Approvals</h2>
            {pendingApprovals.length > 0 && (
              <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                {pendingApprovals.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {pendingApprovals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <Volume2 className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Pending Approvals
            </h3>
            <p className="text-gray-600">
              All voice notes have been reviewed
            </p>
          </div>
        ) : (
          <div className="space-y-4 p-4">
            {pendingApprovals.map((approval) => (
              <div
                key={approval.id}
                className="bg-gray-50 rounded-lg p-4 border border-gray-200"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium text-gray-900">
                        {approval.reader?.first_name} {approval.reader?.last_name}
                      </h4>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                        Pending
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600">
                      {approval.booking?.service?.name} • {approval.booking?.client?.first_name} {approval.booking?.client?.last_name}
                    </p>
                    
                    <p className="text-xs text-gray-500 mt-1">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {formatTime(approval.created_at)}
                    </p>
                  </div>
                </div>

                {/* Audio Player */}
                <div className="bg-white rounded-lg p-3 mb-3">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handlePlayAudio(approval.id, approval.message?.file_url)}
                      className="p-2 bg-purple-100 hover:bg-purple-200 rounded-full transition-colors"
                      disabled={!approval.message?.file_url}
                    >
                      {playingId === approval.id ? (
                        <Pause className="w-4 h-4 text-purple-600" />
                      ) : (
                        <Play className="w-4 h-4 text-purple-600" />
                      )}
                    </button>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">
                          Voice Message
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDuration(approval.message?.duration_seconds || 0)}
                        </span>
                      </div>
                      
                      <div className="mt-1 bg-gray-200 rounded-full h-1">
                        <div className="bg-purple-500 h-1 rounded-full w-0"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Review Notes */}
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Review Notes (Optional)
                  </label>
                  <textarea
                    value={reviewNotes[approval.id] || ''}
                    onChange={(e) => setReviewNotes(prev => ({
                      ...prev,
                      [approval.id]: e.target.value
                    }))}
                    placeholder="Add notes about this voice message..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    rows={2}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleApproval(approval.id, true, reviewNotes[approval.id])}
                    disabled={processingId === approval.id}
                    className="flex-1 flex items-center justify-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {processingId === approval.id ? (
                      <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        Approve
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => handleApproval(approval.id, false, reviewNotes[approval.id])}
                    disabled={processingId === approval.id}
                    className="flex-1 flex items-center justify-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {processingId === approval.id ? (
                      <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    ) : (
                      <>
                        <X className="w-4 h-4 mr-1" />
                        Reject
                      </>
                    )}
                  </button>
                </div>

                {/* Warning for inappropriate content */}
                <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                    <div className="text-xs text-yellow-800">
                      <p className="font-medium">Review Guidelines:</p>
                      <ul className="list-disc list-inside mt-1 space-y-0.5">
                        <li>Check for inappropriate language or content</li>
                        <li>Ensure the message is relevant to the reading</li>
                        <li>Verify audio quality is acceptable</li>
                        <li>Reject if content violates platform policies</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-600 text-center">
          <p>Review voice messages before they are visible to clients</p>
          <p className="mt-1">
            <strong>{pendingApprovals.length}</strong> pending approval{pendingApprovals.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </div>
  );
};

export default VoiceApprovalPanel; 