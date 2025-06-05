import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase.js';

const SurveillanceTab = ({ onUpdate }) => {
  const [recordings, setRecordings] = useState([]);
  const [chatLogs, setChatLogs] = useState([]);
  const [flaggedContent, setFlaggedContent] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState('recordings');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(null);
  const [filterDate, setFilterDate] = useState('today');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadSurveillanceData();
  }, [filterDate]);

  const loadSurveillanceData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadRecordings(),
        loadChatLogs(),
        loadFlaggedContent()
      ]);
    } catch (error) {
      console.error('Error loading surveillance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecordings = async () => {
    try {
      const dateFilter = getDateFilter();
      const { data, error } = await supabase
        .from('call_recordings')
        .select(`
          *,
          booking:bookings(
            id,
            status,
            client:profiles!bookings_user_id_fkey(first_name, last_name, email),
            reader:profiles!bookings_reader_id_fkey(first_name, last_name, email),
            service:services(name, type)
          )
        `)
        .gte('created_at', dateFilter)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecordings(data || []);
    } catch (error) {
      console.error('Error loading recordings:', error);
    }
  };

  const loadChatLogs = async () => {
    try {
      const dateFilter = getDateFilter();
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(first_name, last_name, email),
          booking:bookings(
            id,
            client:profiles!bookings_user_id_fkey(first_name, last_name, email),
            reader:profiles!bookings_reader_id_fkey(first_name, last_name, email),
            service:services(name, type)
          )
        `)
        .gte('created_at', dateFilter)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setChatLogs(data || []);
    } catch (error) {
      console.error('Error loading chat logs:', error);
    }
  };

  const loadFlaggedContent = async () => {
    try {
      const dateFilter = getDateFilter();
      const { data, error } = await supabase
        .from('flagged_content')
        .select(`
          *,
          reporter:profiles!flagged_content_reporter_id_fkey(first_name, last_name, email),
          target_user:profiles!flagged_content_target_user_id_fkey(first_name, last_name, email),
          booking:bookings(
            id,
            service:services(name, type)
          )
        `)
        .gte('created_at', dateFilter)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFlaggedContent(data || []);
    } catch (error) {
      console.error('Error loading flagged content:', error);
    }
  };

  const getDateFilter = () => {
    const now = new Date();
    switch (filterDate) {
      case 'today':
        return new Date(now.setHours(0, 0, 0, 0)).toISOString();
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return new Date(now.setHours(0, 0, 0, 0)).toISOString();
    }
  };

  const flagContent = async (contentType, contentId, reason) => {
    try {
      const { error } = await supabase
        .from('flagged_content')
        .insert({
          content_type: contentType,
          content_id: contentId,
          reason: reason,
          status: 'pending',
          flagged_by: 'monitor'
        });

      if (error) throw error;

      // Update the original content to mark as flagged
      const tableName = contentType === 'message' ? 'messages' : 'call_recordings';
      await supabase
        .from(tableName)
        .update({ flagged: true, flagged_at: new Date().toISOString() })
        .eq('id', contentId);

      await loadSurveillanceData();
      onUpdate?.();
      alert('Content flagged successfully');
    } catch (error) {
      console.error('Error flagging content:', error);
      alert('Failed to flag content');
    }
  };

  const playRecording = (audioUrl, recordingId) => {
    if (playingAudio === recordingId) {
      setPlayingAudio(null);
      return;
    }

    const audio = new Audio(audioUrl);
    setPlayingAudio(recordingId);
    
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
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getContentTypeIcon = (type) => {
    switch (type) {
      case 'recordings': return '📞';
      case 'chats': return '💬';
      case 'flagged': return '🚩';
      default: return '📄';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredData = () => {
    let data = [];
    switch (activeView) {
      case 'recordings': data = recordings; break;
      case 'chats': data = chatLogs; break;
      case 'flagged': data = flaggedContent; break;
      default: data = [];
    }

    if (!searchQuery) return data;

    return data.filter(item => {
      const searchText = searchQuery.toLowerCase();
      return (
        item.booking?.client?.first_name?.toLowerCase().includes(searchText) ||
        item.booking?.client?.last_name?.toLowerCase().includes(searchText) ||
        item.booking?.reader?.first_name?.toLowerCase().includes(searchText) ||
        item.booking?.reader?.last_name?.toLowerCase().includes(searchText) ||
        item.content?.toLowerCase().includes(searchText) ||
        item.reason?.toLowerCase().includes(searchText)
      );
    });
  };

  const views = [
    { id: 'recordings', name: 'Call Recordings', count: recordings.length, icon: '📞' },
    { id: 'chats', name: 'Chat Logs', count: chatLogs.length, icon: '💬' },
    { id: 'flagged', name: 'Flagged Content', count: flaggedContent.length, icon: '🚩' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Message/Call Surveillance</h3>
        <div className="flex space-x-2">
          <select
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>
          <button
            onClick={loadSurveillanceData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex space-x-4">
        <input
          type="text"
          placeholder="Search by user name, content, or reason..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* View Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {views.map((view) => (
          <button
            key={view.id}
            onClick={() => setActiveView(view.id)}
            className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md font-medium text-sm transition-colors ${
              activeView === view.id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="mr-2">{view.icon}</span>
            {view.name}
            {view.count > 0 && (
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                {view.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Content</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Participants</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    Loading surveillance data...
                  </td>
                </tr>
              ) : filteredData().length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    No {activeView} found
                  </td>
                </tr>
              ) : (
                filteredData().map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">{getContentTypeIcon(activeView)}</span>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {activeView === 'recordings' && `Call Recording #${item.id.slice(0, 8)}`}
                            {activeView === 'chats' && `Message #${item.id.slice(0, 8)}`}
                            {activeView === 'flagged' && `Flagged ${item.content_type} #${item.content_id?.slice(0, 8)}`}
                          </div>
                          <div className="text-sm text-gray-500">
                            {activeView === 'recordings' && item.duration && `${Math.floor(item.duration / 60)}:${(item.duration % 60).toString().padStart(2, '0')}`}
                            {activeView === 'chats' && item.content && item.content.substring(0, 50) + (item.content.length > 50 ? '...' : '')}
                            {activeView === 'flagged' && item.reason}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          Client: {item.booking?.client?.first_name} {item.booking?.client?.last_name}
                        </div>
                        <div className="text-gray-500">
                          Reader: {item.booking?.reader?.first_name} {item.booking?.reader?.last_name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full font-medium">
                        {item.booking?.service?.name || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateTime(item.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.flagged ? (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full font-medium">
                          Flagged
                        </span>
                      ) : activeView === 'flagged' ? (
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${getSeverityColor(item.severity)}`}>
                          {item.severity || 'Medium'}
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                          Normal
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {activeView === 'recordings' && item.recording_url && (
                        <button
                          onClick={() => playRecording(item.recording_url, item.id)}
                          className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                            playingAudio === item.id
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }`}
                        >
                          {playingAudio === item.id ? '⏹️ Stop' : '▶️ Listen'}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedItem({ ...item, viewType: activeView });
                          setShowDetailModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View Details
                      </button>
                      {!item.flagged && activeView !== 'flagged' && (
                        <button
                          onClick={() => {
                            const reason = prompt('Enter reason for flagging:');
                            if (reason) {
                              flagContent(
                                activeView === 'recordings' ? 'recording' : 'message',
                                item.id,
                                reason
                              );
                            }
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          🚩 Flag
                        </button>
                      )}
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
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {getContentTypeIcon(selectedItem.viewType)} {selectedItem.viewType === 'recordings' ? 'Call Recording' : 
                 selectedItem.viewType === 'chats' ? 'Chat Message' : 'Flagged Content'} Details
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
                  <label className="block text-sm font-medium text-gray-700">Client</label>
                  <p className="text-gray-900">
                    {selectedItem.booking?.client?.first_name} {selectedItem.booking?.client?.last_name}
                  </p>
                  <p className="text-sm text-gray-500">{selectedItem.booking?.client?.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Reader</label>
                  <p className="text-gray-900">
                    {selectedItem.booking?.reader?.first_name} {selectedItem.booking?.reader?.last_name}
                  </p>
                  <p className="text-sm text-gray-500">{selectedItem.booking?.reader?.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Service</label>
                  <p className="text-gray-900">{selectedItem.booking?.service?.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Time</label>
                  <p className="text-gray-900">{formatDateTime(selectedItem.created_at)}</p>
                </div>
              </div>

              {selectedItem.viewType === 'recordings' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Call Recording</label>
                  {selectedItem.recording_url ? (
                    <div className="mt-2">
                      <audio controls className="w-full">
                        <source src={selectedItem.recording_url} type="audio/mpeg" />
                        Your browser does not support the audio element.
                      </audio>
                      <p className="text-sm text-gray-500 mt-1">
                        Duration: {Math.floor(selectedItem.duration / 60)}:{(selectedItem.duration % 60).toString().padStart(2, '0')}
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-500">No recording available</p>
                  )}
                </div>
              )}

              {selectedItem.viewType === 'chats' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Message Content</label>
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm">{selectedItem.content}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      Type: {selectedItem.type} | Sender: {selectedItem.sender?.first_name} {selectedItem.sender?.last_name}
                    </p>
                  </div>
                </div>
              )}

              {selectedItem.viewType === 'flagged' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Flag Details</label>
                  <div className="mt-2 p-3 bg-red-50 rounded-lg">
                    <p className="text-sm"><strong>Reason:</strong> {selectedItem.reason}</p>
                    <p className="text-sm mt-1"><strong>Severity:</strong> {selectedItem.severity}</p>
                    <p className="text-sm mt-1"><strong>Status:</strong> {selectedItem.status}</p>
                    {selectedItem.reporter && (
                      <p className="text-sm mt-1">
                        <strong>Reported by:</strong> {selectedItem.reporter.first_name} {selectedItem.reporter.last_name}
                      </p>
                    )}
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
                {!selectedItem.flagged && selectedItem.viewType !== 'flagged' && (
                  <button
                    onClick={() => {
                      const reason = prompt('Enter reason for flagging:');
                      if (reason) {
                        flagContent(
                          selectedItem.viewType === 'recordings' ? 'recording' : 'message',
                          selectedItem.id,
                          reason
                        );
                        setShowDetailModal(false);
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    🚩 Flag Content
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SurveillanceTab; 