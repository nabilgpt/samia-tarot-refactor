import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase.js';

const MonitoringTab = ({ onUpdate }) => {
  const [activeChats, setActiveChats] = useState([]);
  const [readerMetrics, setReaderMetrics] = useState([]);
  const [chatLogs, setChatLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showMetricsModal, setShowMetricsModal] = useState(false);

  useEffect(() => {
    loadMonitoringData();
    // Set up real-time monitoring
    const interval = setInterval(loadMonitoringData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadMonitoringData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadActiveChats(),
        loadReaderMetrics(),
        loadChatLogs()
      ]);
    } catch (error) {
      console.error('Error loading monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadActiveChats = async () => {
    try {
      // Get active bookings with recent messages
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          scheduled_at,
          client:profiles!bookings_user_id_fkey(first_name, last_name, email),
          reader:profiles!bookings_reader_id_fkey(first_name, last_name, email),
          service:services(name, type),
          messages(id, created_at, type)
        `)
        .in('status', ['confirmed', 'in_progress'])
        .gte('scheduled_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      // Filter to only bookings with recent messages (active chats)
      const activeChats = data?.filter(booking => 
        booking.messages && booking.messages.length > 0 &&
        booking.messages.some(msg => 
          new Date(msg.created_at) > new Date(Date.now() - 60 * 60 * 1000) // Last hour
        )
      ) || [];

      setActiveChats(activeChats);
    } catch (error) {
      console.error('Error loading active chats:', error);
    }
  };

  const loadReaderMetrics = async () => {
    try {
      // Get reader performance metrics
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          created_at,
          bookings:bookings!bookings_reader_id_fkey(
            id,
            status,
            created_at,
            scheduled_at,
            reviews(rating)
          )
        `)
        .eq('role', 'reader');

      if (error) throw error;

      const metrics = data?.map(reader => {
        const bookings = reader.bookings || [];
        const completedBookings = bookings.filter(b => b.status === 'completed');
        const totalRatings = completedBookings.flatMap(b => b.reviews || []);
        const avgRating = totalRatings.length > 0 
          ? totalRatings.reduce((sum, r) => sum + r.rating, 0) / totalRatings.length 
          : 0;

        // Calculate this month's bookings
        const thisMonth = new Date();
        thisMonth.setDate(1);
        const thisMonthBookings = bookings.filter(b => 
          new Date(b.created_at) >= thisMonth
        );

        return {
          ...reader,
          totalBookings: bookings.length,
          completedBookings: completedBookings.length,
          thisMonthBookings: thisMonthBookings.length,
          avgRating: avgRating.toFixed(1),
          responseTime: Math.floor(Math.random() * 30) + 5, // Mock response time
          onlineStatus: Math.random() > 0.3 ? 'online' : 'offline' // Mock online status
        };
      }) || [];

      setReaderMetrics(metrics);
    } catch (error) {
      console.error('Error loading reader metrics:', error);
    }
  };

  const loadChatLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          type,
          created_at,
          sender_id,
          booking:bookings(
            id,
            client:profiles!bookings_user_id_fkey(first_name, last_name),
            reader:profiles!bookings_reader_id_fkey(first_name, last_name),
            service:services(name)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setChatLogs(data || []);
    } catch (error) {
      console.error('Error loading chat logs:', error);
    }
  };

  const emergencyOverride = async (bookingId) => {
    if (!confirm('Are you sure you want to perform an emergency override? This will immediately end the session.')) {
      return;
    }

    try {
      // Update booking status to cancelled
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (bookingError) throw bookingError;

      // Send system message
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          booking_id: bookingId,
          content: 'Session terminated by administrator for safety reasons.',
          type: 'system',
          sender_id: null
        });

      if (messageError) throw messageError;

      await loadMonitoringData();
      onUpdate?.();
      alert('Emergency override completed successfully.');
    } catch (error) {
      console.error('Error performing emergency override:', error);
      alert('Failed to perform emergency override.');
    }
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'bg-green-100 text-green-800';
      case 'offline': return 'bg-gray-100 text-gray-800';
      case 'busy': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

         return ( 
    <div className="space-y-6">

      {/* Monitoring Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-2xl">💬</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Chats</p>
              <p className="text-2xl font-bold text-gray-900">{activeChats.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">🔮</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Online Readers</p>
              <p className="text-2xl font-bold text-gray-900">
                {readerMetrics.filter(r => r.onlineStatus === 'online').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <span className="text-2xl">📊</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Response</p>
              <p className="text-2xl font-bold text-gray-900">
                {readerMetrics.length > 0 
                  ? Math.round(readerMetrics.reduce((sum, r) => sum + r.responseTime, 0) / readerMetrics.length)
                  : 0}s
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <span className="text-2xl">⭐</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Rating</p>
              <p className="text-2xl font-bold text-gray-900">
                {readerMetrics.length > 0 
                  ? (readerMetrics.reduce((sum, r) => sum + parseFloat(r.avgRating || 0), 0) / readerMetrics.length).toFixed(1)
                  : '0.0'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Chats */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-lg font-semibold text-gray-900">Active Chat Sessions</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Session</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reader</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activeChats.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    No active chat sessions
                  </td>
                </tr>
              ) : (
                activeChats.map((chat) => {
                  const duration = Math.floor((new Date() - new Date(chat.scheduled_at)) / (1000 * 60));
                  return (
                    <tr key={chat.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        #{chat.id.slice(0, 8)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {chat.client?.first_name} {chat.client?.last_name}
                        </div>
                        <div className="text-sm text-gray-500">{chat.client?.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {chat.reader?.first_name} {chat.reader?.last_name}
                        </div>
                        <div className="text-sm text-gray-500">{chat.reader?.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {chat.service?.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {duration} min
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          chat.status === 'in_progress' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {chat.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => {
                            setSelectedChat(chat);
                            setShowChatModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Monitor
                        </button>
                        <button
                          onClick={() => emergencyOverride(chat.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Override
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reader Performance */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-lg font-semibold text-gray-900">Reader Performance</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reader</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Bookings</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">This Month</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Rating</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Response Time</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {readerMetrics.slice(0, 10).map((reader) => (
                <tr key={reader.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {reader.first_name} {reader.last_name}
                    </div>
                    <div className="text-sm text-gray-500">{reader.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(reader.onlineStatus)}`}>
                      {reader.onlineStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {reader.totalBookings}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {reader.thisMonthBookings}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ⭐ {reader.avgRating}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {reader.responseTime}s
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Chat Monitoring Modal */}
      {showChatModal && selectedChat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Chat Monitoring</h3>
              <button
                onClick={() => setShowChatModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <h4 className="font-medium text-gray-900 mb-3">Recent Messages</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {chatLogs
                    .filter(log => log.booking?.id === selectedChat.id)
                    .slice(0, 20)
                    .map((message) => (
                      <div key={message.id} className="text-sm">
                        <span className="text-gray-500">{formatDateTime(message.created_at)}</span>
                        <span className="ml-2 font-medium">
                          {message.sender_id === selectedChat.reader?.id ? 'Reader' : 'Client'}:
                        </span>
                        <span className="ml-1">{message.content}</span>
                      </div>
                    ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Session Info</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Client:</span> {selectedChat.client?.first_name} {selectedChat.client?.last_name}
                  </div>
                  <div>
                    <span className="font-medium">Reader:</span> {selectedChat.reader?.first_name} {selectedChat.reader?.last_name}
                  </div>
                  <div>
                    <span className="font-medium">Service:</span> {selectedChat.service?.name}
                  </div>
                  <div>
                    <span className="font-medium">Started:</span> {formatDateTime(selectedChat.scheduled_at)}
                  </div>
                  <div>
                    <span className="font-medium">Status:</span> {selectedChat.status}
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <button
                    onClick={() => emergencyOverride(selectedChat.id)}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Emergency Override
                  </button>
                  <button
                    onClick={() => setShowChatModal(false)}
                    className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Close Monitor
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Modal */}
      {showMetricsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Platform Analytics</h3>
              <button
                onClick={() => setShowMetricsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Top Performing Readers</h4>
                <div className="space-y-2">
                  {readerMetrics
                    .sort((a, b) => b.thisMonthBookings - a.thisMonthBookings)
                    .slice(0, 5)
                    .map((reader, index) => (
                      <div key={reader.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div>
                          <span className="font-medium">#{index + 1}</span>
                          <span className="ml-2">{reader.first_name} {reader.last_name}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {reader.thisMonthBookings} bookings • ⭐ {reader.avgRating}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">System Health</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Active Sessions</span>
                    <span className="font-medium">{activeChats.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Online Readers</span>
                    <span className="font-medium">{readerMetrics.filter(r => r.onlineStatus === 'online').length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Total Messages Today</span>
                    <span className="font-medium">
                      {chatLogs.filter(log => 
                        new Date(log.created_at).toDateString() === new Date().toDateString()
                      ).length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Platform Uptime</span>
                    <span className="font-medium text-green-600">99.9%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonitoringTab; 