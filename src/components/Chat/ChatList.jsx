import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { ChatAPI } from '../../api/chatApi.js';
import { UserAPI } from '../../api/userApi.js';
import { MessageCircle, Clock, Lock, VolumeX, Volume2 } from 'lucide-react';

const ChatList = ({ onChatSelect, selectedBookingId }) => {
  const { user, profile } = useAuth();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState({});

  useEffect(() => {
    loadChats();
    
    // Subscribe to chat notifications for real-time updates
    const subscription = ChatAPI.subscribeToChatNotifications(user.id, (notification) => {
      if (notification.type === 'new_message') {
        loadChats(); // Refresh chat list
        updateUnreadCount(notification.booking_id);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [user.id]);

  const loadChats = async () => {
    try {
      setLoading(true);
      
      // Get user's bookings with chat sessions
      const bookingsResult = await UserAPI.getUserBookings(user.id);
      if (!bookingsResult.success) {
        throw new Error(bookingsResult.error);
      }

      // Filter bookings that have chat sessions and are confirmed
      const chatBookings = bookingsResult.data.filter(booking => 
        booking.status === 'confirmed' || booking.status === 'in_progress' || booking.status === 'completed'
      );

      // Get chat sessions for each booking
      const chatPromises = chatBookings.map(async (booking) => {
        const sessionResult = await ChatAPI.getChatSession(booking.id);
        if (sessionResult.success) {
          // Get latest message
          const messagesResult = await ChatAPI.getMessages(booking.id, 1);
          const latestMessage = messagesResult.success && messagesResult.data.length > 0 
            ? messagesResult.data[0] 
            : null;

          return {
            ...sessionResult.data,
            booking,
            latestMessage
          };
        }
        return null;
      });

      const chatSessions = (await Promise.all(chatPromises)).filter(Boolean);
      
      // Sort by latest message time
      chatSessions.sort((a, b) => {
        const timeA = a.latestMessage?.created_at || a.created_at;
        const timeB = b.latestMessage?.created_at || b.created_at;
        return new Date(timeB) - new Date(timeA);
      });

      setChats(chatSessions);

      // Load unread counts
      const unreadPromises = chatSessions.map(async (chat) => {
        const messagesResult = await ChatAPI.getMessages(chat.booking_id);
        if (messagesResult.success) {
          const unreadCount = messagesResult.data.filter(msg => 
            !msg.is_read && msg.sender_id !== user.id
          ).length;
          return { bookingId: chat.booking_id, count: unreadCount };
        }
        return { bookingId: chat.booking_id, count: 0 };
      });

      const unreadResults = await Promise.all(unreadPromises);
      const unreadMap = {};
      unreadResults.forEach(({ bookingId, count }) => {
        unreadMap[bookingId] = count;
      });
      setUnreadCounts(unreadMap);

    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUnreadCount = async (bookingId) => {
    const messagesResult = await ChatAPI.getMessages(bookingId);
    if (messagesResult.success) {
      const unreadCount = messagesResult.data.filter(msg => 
        !msg.is_read && msg.sender_id !== user.id
      ).length;
      setUnreadCounts(prev => ({ ...prev, [bookingId]: unreadCount }));
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const getOtherParticipant = (chat) => {
    if (profile.role === 'client') {
      return chat.booking?.reader || { first_name: 'Reader', last_name: '' };
    } else {
      return chat.booking?.client || { first_name: 'Client', last_name: '' };
    }
  };

  const getMessagePreview = (message) => {
    if (!message) return 'No messages yet';
    
    switch (message.type) {
      case 'text':
        return message.content.length > 50 
          ? message.content.substring(0, 50) + '...'
          : message.content;
      case 'image':
        return '📷 Image';
      case 'voice':
        return message.is_approved ? '🎵 Voice message' : '🎵 Voice message (pending approval)';
      case 'system':
        return message.content;
      default:
        return 'Message';
    }
  };

  const getStatusIcon = (chat) => {
    if (chat.status === 'locked') {
      return <Lock className="w-4 h-4 text-red-500" />;
    }
    
    if (chat.latestMessage?.type === 'voice' && !chat.latestMessage?.is_approved) {
      return <VolumeX className="w-4 h-4 text-yellow-500" />;
    }

    return <MessageCircle className="w-4 h-4 text-gray-400" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Chats</h3>
        <p className="text-gray-600">
          Your confirmed bookings will appear here when chat is available.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
        <button
          onClick={loadChats}
          className="text-purple-600 hover:text-purple-700 text-sm"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-1">
        {chats.map((chat) => {
          const otherParticipant = getOtherParticipant(chat);
          const isSelected = selectedBookingId === chat.booking_id;
          const unreadCount = unreadCounts[chat.booking_id] || 0;

          return (
            <div
              key={chat.id}
              onClick={() => onChatSelect(chat.booking_id)}
              className={`p-4 rounded-lg cursor-pointer transition-colors ${
                isSelected
                  ? 'bg-purple-50 border-2 border-purple-200'
                  : 'bg-white border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start space-x-3">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {otherParticipant.avatar_url ? (
                    <img
                      src={otherParticipant.avatar_url}
                      alt={`${otherParticipant.first_name} ${otherParticipant.last_name}`}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                      <span className="text-purple-600 font-medium text-lg">
                        {otherParticipant.first_name?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Chat Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {otherParticipant.first_name} {otherParticipant.last_name}
                    </h3>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(chat)}
                      {chat.latestMessage && (
                        <span className="text-xs text-gray-500">
                          {formatTime(chat.latestMessage.created_at)}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-1">
                    {chat.booking?.service?.name}
                  </p>

                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500 truncate">
                      {getMessagePreview(chat.latestMessage)}
                    </p>
                    
                    {unreadCount > 0 && (
                      <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>

                  {/* Chat Status */}
                  {chat.status === 'locked' && (
                    <div className="mt-2 flex items-center text-xs text-red-600">
                      <Lock className="w-3 h-3 mr-1" />
                      Chat locked
                    </div>
                  )}

                  {/* Usage indicators for clients */}
                  {profile.role === 'client' && (
                    <div className="mt-2 flex space-x-4 text-xs text-gray-500">
                      <span>
                        Text: {chat.client_text_chars_used}/{chat.max_text_chars}
                      </span>
                      <span>
                        Voice: {Math.floor(chat.client_voice_seconds_used / 60)}m/{Math.floor(chat.max_voice_seconds / 60)}m
                      </span>
                      <span>
                        Images: {chat.client_images_sent}/{chat.max_images}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ChatList; 