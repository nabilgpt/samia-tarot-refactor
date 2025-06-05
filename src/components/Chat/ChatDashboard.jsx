import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { ChatAPI } from '../../api/chatApi.js';
import ChatList from './ChatList.jsx';
import ChatThread from './ChatThread.jsx';
import VoiceApprovalPanel from './VoiceApprovalPanel.jsx';
import { MessageCircle, Volume2, Bell, Settings } from 'lucide-react';

const ChatDashboard = () => {
  const { user, profile } = useAuth();
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [showVoiceApprovals, setShowVoiceApprovals] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    loadDashboardData();
    
    // Subscribe to real-time notifications
    const subscription = ChatAPI.subscribeToChatNotifications(user.id, (notification) => {
      setNotifications(prev => [notification, ...prev.slice(0, 9)]); // Keep last 10
      
      if (notification.type === 'new_message') {
        updateUnreadCount();
      }
    });

    // Subscribe to voice approvals for admins
    let voiceSubscription = null;
    if (profile.role === 'admin' || profile.role === 'monitor') {
      voiceSubscription = ChatAPI.subscribeToVoiceApprovals((payload) => {
        if (payload.eventType === 'INSERT') {
          setPendingApprovals(prev => prev + 1);
        } else if (payload.eventType === 'UPDATE') {
          setPendingApprovals(prev => Math.max(0, prev - 1));
        }
      });
    }

    return () => {
      subscription?.unsubscribe();
      voiceSubscription?.unsubscribe();
    };
  }, [user.id, profile.role]);

  const loadDashboardData = async () => {
    await Promise.all([
      updateUnreadCount(),
      loadPendingApprovals()
    ]);
  };

  const updateUnreadCount = async () => {
    const result = await ChatAPI.getUnreadMessageCount(user.id);
    if (result.success) {
      setUnreadCount(result.count);
    }
  };

  const loadPendingApprovals = async () => {
    if (profile.role === 'admin' || profile.role === 'monitor') {
      const result = await ChatAPI.getPendingVoiceApprovals();
      if (result.success) {
        setPendingApprovals(result.data.length);
      }
    }
  };

  const handleChatSelect = (bookingId) => {
    setSelectedBookingId(bookingId);
    // Mark messages as read when opening chat
    ChatAPI.markMessagesAsRead(bookingId, user.id);
    updateUnreadCount();
  };

  const handleBackToList = () => {
    setSelectedBookingId(null);
    updateUnreadCount();
  };

  const markAllNotificationsAsRead = async () => {
    const result = await ChatAPI.markAllNotificationsAsRead(user.id);
    if (result.success) {
      setNotifications([]);
    }
  };

  // Mobile responsive: show either list or thread
  const isMobile = window.innerWidth < 768;
  const showList = !isMobile || !selectedBookingId;
  const showThread = !isMobile || selectedBookingId;

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <MessageCircle className="w-6 h-6 text-purple-600" />
            <h1 className="text-xl font-semibold text-gray-900">Messages</h1>
            
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* Voice Approvals (Admin/Monitor only) */}
            {(profile.role === 'admin' || profile.role === 'monitor') && (
              <button
                onClick={() => setShowVoiceApprovals(!showVoiceApprovals)}
                className={`relative p-2 rounded-lg transition-colors ${
                  showVoiceApprovals 
                    ? 'bg-purple-100 text-purple-600' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title="Voice Note Approvals"
              >
                <Volume2 className="w-5 h-5" />
                {pendingApprovals > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                    {pendingApprovals > 99 ? '99+' : pendingApprovals}
                  </span>
                )}
              </button>
            )}

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={markAllNotificationsAsRead}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-blue-500 rounded-full">
                    {notifications.length}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {notifications.length > 0 && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="p-3 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900">Recent Activity</h3>
                      <button
                        onClick={markAllNotificationsAsRead}
                        className="text-sm text-purple-600 hover:text-purple-700"
                      >
                        Clear all
                      </button>
                    </div>
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.slice(0, 5).map((notification, index) => (
                      <div key={index} className="p-3 border-b border-gray-100 last:border-b-0">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            {notification.type === 'new_message' && (
                              <MessageCircle className="w-4 h-4 text-blue-500" />
                            )}
                            {notification.type === 'voice_approved' && (
                              <Volume2 className="w-4 h-4 text-green-500" />
                            )}
                            {notification.type === 'chat_locked' && (
                              <Settings className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900">
                              {notification.type === 'new_message' && 'New message received'}
                              {notification.type === 'voice_approved' && 'Voice note approved'}
                              {notification.type === 'chat_locked' && 'Chat session locked'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(notification.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Voice Approval Panel (Admin/Monitor) */}
        {showVoiceApprovals && (profile.role === 'admin' || profile.role === 'monitor') && (
          <div className="w-80 border-r border-gray-200 bg-white">
            <VoiceApprovalPanel 
              onClose={() => setShowVoiceApprovals(false)}
              onApprovalUpdate={loadPendingApprovals}
            />
          </div>
        )}

        {/* Chat List */}
        {showList && (
          <div className={`${isMobile ? 'w-full' : 'w-80'} border-r border-gray-200 bg-white overflow-hidden`}>
            <div className="h-full overflow-y-auto p-4">
              <ChatList 
                onChatSelect={handleChatSelect}
                selectedBookingId={selectedBookingId}
              />
            </div>
          </div>
        )}

        {/* Chat Thread */}
        {showThread && selectedBookingId && (
          <div className="flex-1 bg-white">
            <ChatThread 
              bookingId={selectedBookingId}
              onBack={handleBackToList}
            />
          </div>
        )}

        {/* Empty State */}
        {!selectedBookingId && !isMobile && (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Select a conversation
              </h3>
              <p className="text-gray-600">
                Choose a chat from the list to start messaging
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Navigation Helper */}
      {isMobile && selectedBookingId && (
        <div className="bg-white border-t border-gray-200 p-2">
          <button
            onClick={handleBackToList}
            className="w-full py-2 text-purple-600 text-center font-medium"
          >
            ← Back to Conversations
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatDashboard; 