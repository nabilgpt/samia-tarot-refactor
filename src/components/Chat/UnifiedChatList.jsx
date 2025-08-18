import React from 'react';
import { MessageCircle, Volume2, Phone, Clock, Users, AlertTriangle } from 'lucide-react';

const UnifiedChatList = ({ 
  sessions, 
  selectedSessionId, 
  onSessionSelect, 
  currentUserId,
  loading 
}) => {
  
  // Format time for display
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // Less than 1 minute
    if (diff < 60000) {
      return 'Just now';
    }
    
    // Less than 1 hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes}m ago`;
    }
    
    // Less than 24 hours
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    }
    
    // Less than 7 days
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000);
      return `${days}d ago`;
    }
    
    // More than 7 days - show date
    return date.toLocaleDateString();
  };

  // Get session display info
  const getSessionDisplayInfo = (session) => {
    const info = {
      title: '',
      subtitle: '',
      icon: MessageCircle,
      iconColor: 'text-gray-400'
    };

    switch (session.type) {
      case 'booking':
        info.title = 'Booking Session';
        info.subtitle = `${session.participants?.length || 0} participants`;
        info.icon = MessageCircle;
        info.iconColor = 'text-blue-500';
        break;
        
      case 'emergency':
        info.title = 'Emergency Call';
        info.subtitle = 'Priority support';
        info.icon = AlertTriangle;
        info.iconColor = 'text-red-500';
        break;
        
      case 'general':
        info.title = 'General Chat';
        info.subtitle = 'Conversation';
        info.icon = MessageCircle;
        info.iconColor = 'text-green-500';
        break;
        
      case 'support':
        info.title = 'Support Chat';
        info.subtitle = 'Customer support';
        info.icon = Users;
        info.iconColor = 'text-purple-500';
        break;
        
      default:
        info.title = 'Chat Session';
        info.subtitle = 'Conversation';
    }

    // Override with custom title if available
    if (session.metadata?.title) {
      info.title = session.metadata.title;
    }

    return info;
  };

  // Get last message preview
  const getLastMessagePreview = (session) => {
    if (!session.last_message) {
      return { text: 'No messages yet', isSystem: true };
    }

    const message = session.last_message;
    
    switch (message.type) {
      case 'text':
        return { 
          text: message.content || 'Message', 
          isSystem: false 
        };
        
      case 'audio':
        return { 
          text: '🎵 Voice message', 
          isSystem: false 
        };
        
      case 'image':
        return { 
          text: '📷 Image', 
          isSystem: false 
        };
        
      case 'file':
        return { 
          text: '📎 File attachment', 
          isSystem: false 
        };
        
      case 'video':
        return { 
          text: '🎥 Video', 
          isSystem: false 
        };
        
      case 'system':
        return { 
          text: message.content || 'System message', 
          isSystem: true 
        };
        
      case 'emergency':
        return { 
          text: '🚨 Emergency alert', 
          isSystem: true 
        };
        
      default:
        return { 
          text: message.content || 'Message', 
          isSystem: false 
        };
    }
  };

  // Get session status indicator
  const getStatusIndicator = (session) => {
    switch (session.status) {
      case 'active':
        return null; // No indicator for active sessions
        
      case 'paused':
        return (
          <div className="flex items-center text-yellow-500">
            <Clock className="w-3 h-3 mr-1" />
            <span className="text-xs">Paused</span>
          </div>
        );
        
      case 'ended':
        return (
          <div className="flex items-center text-gray-400">
            <span className="text-xs">Ended</span>
          </div>
        );
        
      case 'locked':
        return (
          <div className="flex items-center text-red-500">
            <span className="text-xs">Locked</span>
          </div>
        );
        
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-4">
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center space-x-3 p-3">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations</h3>
          <p className="text-gray-500 text-sm">Start a new conversation to begin messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="divide-y divide-gray-100">
        {sessions.map((session) => {
          const displayInfo = getSessionDisplayInfo(session);
          const lastMessage = getLastMessagePreview(session);
          const statusIndicator = getStatusIndicator(session);
          const isSelected = session.id === selectedSessionId;
          const hasUnread = session.unread_count > 0;
          
          const IconComponent = displayInfo.icon;
          
          return (
            <div
              key={session.id}
              onClick={() => onSessionSelect(session.id)}
              className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                isSelected ? 'bg-purple-50 border-r-2 border-purple-500' : ''
              }`}
            >
              <div className="flex items-start space-x-3">
                {/* Session Icon */}
                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                  session.type === 'emergency' ? 'bg-red-100' :
                  session.type === 'booking' ? 'bg-blue-100' :
                  session.type === 'support' ? 'bg-purple-100' :
                  'bg-gray-100'
                }`}>
                  <IconComponent className={`w-6 h-6 ${displayInfo.iconColor}`} />
                </div>

                {/* Session Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={`text-sm font-medium truncate ${
                      hasUnread ? 'text-gray-900' : 'text-gray-700'
                    }`}>
                      {displayInfo.title}
                    </h3>
                    
                    <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                      {/* Unread Count */}
                      {hasUnread && (
                        <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-purple-500 rounded-full">
                          {session.unread_count > 99 ? '99+' : session.unread_count}
                        </span>
                      )}
                      
                      {/* Last Message Time */}
                      {session.last_message_at && (
                        <span className="text-xs text-gray-400">
                          {formatTime(session.last_message_at)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Session Subtitle and Status */}
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-500 truncate">
                      {displayInfo.subtitle}
                    </p>
                    {statusIndicator}
                  </div>

                  {/* Last Message Preview */}
                  <div className="flex items-center space-x-2">
                    <p className={`text-sm truncate flex-1 ${
                      lastMessage.isSystem ? 'text-gray-400 italic' :
                      hasUnread ? 'text-gray-900 font-medium' : 'text-gray-600'
                    }`}>
                      {lastMessage.text}
                    </p>
                    
                    {/* Message Type Indicators */}
                    {session.last_message?.type === 'audio' && (
                      <Volume2 className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    )}
                  </div>

                  {/* Session Metadata */}
                  {session.type === 'emergency' && (
                    <div className="mt-2 flex items-center space-x-1">
                      <AlertTriangle className="w-3 h-3 text-red-500" />
                      <span className="text-xs text-red-600 font-medium">Priority Support</span>
                    </div>
                  )}
                  
                  {session.participants?.length > 2 && (
                    <div className="mt-1 flex items-center space-x-1">
                      <Users className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {session.participants.length} participants
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

export default UnifiedChatList; 