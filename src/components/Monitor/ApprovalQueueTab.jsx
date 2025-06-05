import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase.js';

const ApprovalQueueTab = ({ onUpdate }) => {
  const [voiceMessages, setVoiceMessages] = useState([]);
  const [profileUpdates, setProfileUpdates] = useState([]);
  const [aiReadings, setAiReadings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('voice');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(null);

  useEffect(() => {
    loadApprovalQueue();
  }, []);

  const loadApprovalQueue = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadVoiceMessages(),
        loadProfileUpdates(),
        loadAiReadings()
      ]);
    } catch (error) {
      console.error('Error loading approval queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadVoiceMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('voice_messages')
        .select(`
          *,
          sender:profiles!voice_messages_sender_id_fkey(first_name, last_name, email),
          booking:bookings(
            id,
            service:services(name, type)
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVoiceMessages(data || []);
    } catch (error) {
      console.error('Error loading voice messages:', error);
    }
  };

  const loadProfileUpdates = async () => {
    try {
      const { data, error } = await supabase
        .from('profile_updates')
        .select(`
          *,
          user:profiles!profile_updates_user_id_fkey(first_name, last_name, email, role)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfileUpdates(data || []);
    } catch (error) {
      console.error('Error loading profile updates:', error);
    }
  };

  const loadAiReadings = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_readings')
        .select(`
          *,
          user:profiles!ai_readings_user_id_fkey(first_name, last_name, email),
          booking:bookings(
            id,
            service:services(name, type)
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAiReadings(data || []);
    } catch (error) {
      console.error('Error loading AI readings:', error);
    }
  };

  const handleApproval = async (type, itemId, action, reason = '') => {
    try {
      const tableName = type === 'voice' ? 'voice_messages' : 
                       type === 'profile' ? 'profile_updates' : 'ai_readings';
      
      const { error } = await supabase
        .from(tableName)
        .update({ 
          status: action,
          reviewed_at: new Date().toISOString(),
          review_reason: reason
        })
        .eq('id', itemId);

      if (error) throw error;

      await loadApprovalQueue();
      onUpdate?.();
      setShowDetailModal(false);
      setSelectedItem(null);
    } catch (error) {
      console.error('Error updating approval status:', error);
    }
  };

  const playAudio = (audioUrl, messageId) => {
    if (playingAudio === messageId) {
      setPlayingAudio(null);
      return;
    }

    const audio = new Audio(audioUrl);
    setPlayingAudio(messageId);
    
    audio.onended = () => setPlayingAudio(null);
    audio.onerror = () => setPlayingAudio(null);
    
    audio.play().catch(error => {
      console.error('Error playing audio:', error);
      setPlayingAudio(null);
    });
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'voice': return '🎤';
      case 'profile': return '👤';
      case 'ai': return '🤖';
      default: return '📄';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const categories = [
    { id: 'voice', name: 'Voice Messages', count: voiceMessages.length, icon: '🎤' },
    { id: 'profile', name: 'Profile Updates', count: profileUpdates.length, icon: '👤' },
    { id: 'ai', name: 'AI Readings', count: aiReadings.length, icon: '🤖' }
  ];

  const getCurrentItems = () => {
    switch (activeCategory) {
      case 'voice': return voiceMessages;
      case 'profile': return profileUpdates;
      case 'ai': return aiReadings;
      default: return [];
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Approval Queue</h3>
        <button
          onClick={loadApprovalQueue}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh Queue
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md font-medium text-sm transition-colors ${
              activeCategory === category.id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="mr-2">{category.icon}</span>
            {category.name}
            {category.count > 0 && (
              <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                {category.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Items List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    Loading approval queue...
                  </td>
                </tr>
              ) : getCurrentItems().length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    No items pending approval
                  </td>
                </tr>
              ) : (
                getCurrentItems().map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">{getTypeIcon(activeCategory)}</span>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {activeCategory === 'voice' && `Voice Message #${item.id.slice(0, 8)}`}
                            {activeCategory === 'profile' && `Profile Update #${item.id.slice(0, 8)}`}
                            {activeCategory === 'ai' && `AI Reading #${item.id.slice(0, 8)}`}
                          </div>
                          <div className="text-sm text-gray-500">
                            {activeCategory === 'voice' && item.duration && `${item.duration}s duration`}
                            {activeCategory === 'profile' && item.update_type}
                            {activeCategory === 'ai' && item.reading_type}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {item.sender?.first_name || item.user?.first_name} {item.sender?.last_name || item.user?.last_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.sender?.email || item.user?.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                        {activeCategory === 'voice' && (item.booking?.service?.type || 'General')}
                        {activeCategory === 'profile' && (item.user?.role || 'User')}
                        {activeCategory === 'ai' && (item.booking?.service?.type || 'Reading')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${getPriorityColor(item.priority || 'medium')}`}>
                        {item.priority || 'Medium'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateTime(item.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {activeCategory === 'voice' && item.audio_url && (
                        <button
                          onClick={() => playAudio(item.audio_url, item.id)}
                          className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                            playingAudio === item.id
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }`}
                        >
                          {playingAudio === item.id ? '⏹️ Stop' : '▶️ Play'}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedItem({ ...item, type: activeCategory });
                          setShowDetailModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Review
                      </button>
                      <button
                        onClick={() => handleApproval(activeCategory, item.id, 'approved')}
                        className="text-green-600 hover:text-green-900"
                      >
                        ✅ Approve
                      </button>
                      <button
                        onClick={() => handleApproval(activeCategory, item.id, 'rejected')}
                        className="text-red-600 hover:text-red-900"
                      >
                        ❌ Reject
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {getTypeIcon(selectedItem.type)} Review {selectedItem.type === 'voice' ? 'Voice Message' : 
                 selectedItem.type === 'profile' ? 'Profile Update' : 'AI Reading'}
              </h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Submitted By</label>
                  <p className="text-gray-900">
                    {selectedItem.sender?.first_name || selectedItem.user?.first_name} {selectedItem.sender?.last_name || selectedItem.user?.last_name}
                  </p>
                  <p className="text-sm text-gray-500">{selectedItem.sender?.email || selectedItem.user?.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Submitted</label>
                  <p className="text-gray-900">{formatDateTime(selectedItem.created_at)}</p>
                </div>
              </div>

              {selectedItem.type === 'voice' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Audio Message</label>
                  {selectedItem.audio_url ? (
                    <div className="mt-2">
                      <audio controls className="w-full">
                        <source src={selectedItem.audio_url} type="audio/mpeg" />
                        Your browser does not support the audio element.
                      </audio>
                      <p className="text-sm text-gray-500 mt-1">Duration: {selectedItem.duration}s</p>
                    </div>
                  ) : (
                    <p className="text-gray-500">No audio file available</p>
                  )}
                </div>
              )}

              {selectedItem.type === 'profile' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Update Details</label>
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm"><strong>Type:</strong> {selectedItem.update_type}</p>
                    {selectedItem.changes && (
                      <div className="mt-2">
                        <strong>Changes:</strong>
                        <pre className="text-xs mt-1 whitespace-pre-wrap">{JSON.stringify(selectedItem.changes, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedItem.type === 'ai' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">AI Reading Content</label>
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm"><strong>Type:</strong> {selectedItem.reading_type}</p>
                    <p className="text-sm mt-2"><strong>Content:</strong></p>
                    <p className="text-sm mt-1">{selectedItem.content}</p>
                  </div>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => handleApproval(selectedItem.type, selectedItem.id, 'rejected', 'Rejected after review')}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  ❌ Reject
                </button>
                <button
                  onClick={() => handleApproval(selectedItem.type, selectedItem.id, 'approved', 'Approved after review')}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  ✅ Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalQueueTab; 