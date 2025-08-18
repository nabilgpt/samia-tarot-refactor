import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { supabase } from '../../lib/supabase.js';
import { 
  Send, Image, Mic, MicOff, Reply, ArrowLeft, 
  Phone, VideoIcon, Settings, Lock, Users,
  AlertTriangle, Clock, CheckCircle 
} from 'lucide-react';
import UnifiedAudioRecorder from './UnifiedAudioRecorder.jsx';
import UnifiedMessageBubble from './UnifiedMessageBubble.jsx';

const UnifiedChatThread = ({ 
  sessionId, 
  currentUserId, 
  onBack, 
  onSessionUpdate 
}) => {
  const { user, profile } = useAuth();
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messagesSubscription = useRef(null);

  // Load session and messages
  const loadChatData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load session details
      const sessionResponse = await fetch(`/api/chat/sessions/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!sessionResponse.ok) {
        throw new Error('Failed to load session');
      }

      const sessionData = await sessionResponse.json();
      setSession(sessionData.data);

      // Load messages
      const messagesResponse = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!messagesResponse.ok) {
        throw new Error('Failed to load messages');
      }

      const messagesData = await messagesResponse.json();
      setMessages(messagesData.data || []);

      // Mark messages as read
      await markMessagesAsRead();

    } catch (err) {
      console.error('Error loading chat data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Mark messages as read
  const markMessagesAsRead = async () => {
    try {
      await fetch(`/api/chat/sessions/${sessionId}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  };

  // Setup real-time subscriptions
  const setupSubscriptions = useCallback(() => {
    // Subscribe to new messages
    messagesSubscription.current = supabase
      .channel(`chat-messages-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          console.log('Message update:', payload);
          
          if (payload.eventType === 'INSERT') {
            setMessages(prev => [...prev, payload.new]);
            scrollToBottom();
            
            // Mark as read if not from current user
            if (payload.new.sender_id !== currentUserId) {
              setTimeout(markMessagesAsRead, 500);
            }
          } else if (payload.eventType === 'UPDATE') {
            setMessages(prev => prev.map(msg => 
              msg.id === payload.new.id ? payload.new : msg
            ));
          } else if (payload.eventType === 'DELETE') {
            setMessages(prev => prev.filter(msg => msg.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      if (messagesSubscription.current) {
        messagesSubscription.current.unsubscribe();
      }
    };
  }, [sessionId, currentUserId]);

  // Scroll to bottom
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Initialize component
  useEffect(() => {
    if (sessionId) {
      loadChatData();
      const cleanup = setupSubscriptions();
      
      return cleanup;
    }
  }, [sessionId, loadChatData, setupSubscriptions]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send text message
  const handleSendMessage = async () => {
    if (!messageText.trim() || sending) return;

    try {
      setSending(true);
      setError(null);

      const messageData = {
        content: messageText.trim(),
        reply_to_message_id: replyTo?.id || null
      };

      const response = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      // Clear input and reply
      setMessageText('');
      setReplyTo(null);

    } catch (err) {
      console.error('Error sending message:', err);
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);
      if (replyTo) {
        formData.append('reply_to_message_id', replyTo.id);
      }

      const response = await fetch(`/api/chat/sessions/${sessionId}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload file');
      }

      // Clear reply
      setReplyTo(null);

    } catch (err) {
      console.error('Error uploading file:', err);
      setError(err.message);
    } finally {
      setUploading(false);
      // Clear file input
      event.target.value = '';
    }
  };

  // Handle voice message
  const handleVoiceMessage = async (audioBlob, duration) => {
    try {
      setSending(true);
      setError(null);

      const formData = new FormData();
      formData.append('voice', audioBlob, 'voice_message.webm');
      formData.append('duration', duration.toString());
      if (replyTo) {
        formData.append('reply_to_message_id', replyTo.id);
      }

      const response = await fetch(`/api/chat/sessions/${sessionId}/voice`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send voice message');
      }

      setShowAudioRecorder(false);
      setReplyTo(null);

    } catch (err) {
      console.error('Error sending voice message:', err);
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  // Handle typing indicator
  const handleTyping = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing indicator (implement if needed)
    typingTimeoutRef.current = setTimeout(() => {
      // Stop typing indicator
    }, 3000);
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    } else {
      handleTyping();
    }
  };

  // Delete message
  const handleDeleteMessage = async (messageId) => {
    try {
      const response = await fetch(`/api/chat/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete message');
      }
    } catch (err) {
      console.error('Error deleting message:', err);
      setError(err.message);
    }
  };

  // Get session display info
  const getSessionTitle = () => {
    if (!session) return 'Chat';
    
    if (session.type === 'emergency') {
      return '🚨 Emergency Support';
    }
    
    if (session.booking_id) {
      return `Reading Session - ${session.service_name || 'Tarot Reading'}`;
    }
    
    return session.title || 'General Chat';
  };

  // Check if user can send messages
  const canSendMessage = () => {
    return session?.status === 'active' && !sending && !uploading;
  };

  // Get remaining limits (if applicable)
  const getRemainingLimits = () => {
    if (!session || profile.role !== 'client') return null;
    
    return {
      text: session.text_limit_remaining || 0,
      voice: session.voice_limit_remaining || 0,
      images: session.image_limit_remaining || 0
    };
  };

  const remainingLimits = getRemainingLimits();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg lg:hidden"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">
              {getSessionTitle()}
            </h2>
            {session && (
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                {session.status === 'active' && (
                  <span className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                    Active
                  </span>
                )}
                {session.status === 'locked' && (
                  <span className="flex items-center text-red-600">
                    <Lock className="w-3 h-3 mr-1" />
                    Completed
                  </span>
                )}
                {session.participants?.length > 2 && (
                  <span className="flex items-center">
                    <Users className="w-3 h-3 mr-1" />
                    {session.participants.length} participants
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {session?.type === 'emergency' && (
            <div className="flex items-center text-red-600 text-sm">
              <AlertTriangle className="w-4 h-4 mr-1" />
              Priority
            </div>
          )}
          
          <button className="p-2 hover:bg-gray-100 rounded-lg">
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Usage Limits (for clients) */}
      {remainingLimits && (
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
          <div className="flex space-x-4 text-xs text-gray-600">
            <span>Text: {remainingLimits.text} chars left</span>
            <span>Voice: {Math.floor(remainingLimits.voice / 60)}m left</span>
            <span>Images: {remainingLimits.images} left</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-200">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <MessageCircle className="w-12 h-12 mx-auto" />
            </div>
            <p className="text-gray-500">No messages yet</p>
            <p className="text-sm text-gray-400">Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <UnifiedMessageBubble
              key={message.id}
              message={message}
              isOwn={message.sender_id === currentUserId}
              onReply={setReplyTo}
              onDelete={handleDeleteMessage}
              canDelete={message.sender_id === currentUserId}
            />
          ))
        )}

        {/* Typing Indicators */}
        {typingUsers.length > 0 && (
          <div className="flex items-center space-x-2 text-gray-500 text-sm">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span>Typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview */}
      {replyTo && (
        <div className="px-4 py-2 bg-blue-50 border-t border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-blue-600 font-medium">
                Replying to {replyTo.sender?.first_name || 'User'}
              </p>
              <p className="text-sm text-gray-600 truncate">
                {replyTo.type === 'text' ? replyTo.content : `${replyTo.type} message`}
              </p>
            </div>
            <button
              onClick={() => setReplyTo(null)}
              className="text-blue-600 hover:text-blue-800"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Audio Recorder */}
      {showAudioRecorder && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
          <UnifiedAudioRecorder
            onSend={handleVoiceMessage}
            onCancel={() => setShowAudioRecorder(false)}
            maxDuration={remainingLimits?.voice || 600}
          />
        </div>
      )}

      {/* Message Input */}
      {canSendMessage() && (
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex items-end space-x-2">
            {/* File Upload */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || (remainingLimits?.images <= 0)}
              className="p-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Image className="w-5 h-5" />
            </button>

            {/* Voice Recording */}
            <button
              onClick={() => setShowAudioRecorder(!showAudioRecorder)}
              disabled={sending || (remainingLimits?.voice <= 0)}
              className={`p-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                showAudioRecorder ? 'text-red-600' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {showAudioRecorder ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Text Input */}
            <div className="flex-1">
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                disabled={sending || (remainingLimits?.text <= 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none disabled:opacity-50"
                rows={1}
                style={{ minHeight: '40px', maxHeight: '120px' }}
              />
            </div>

            {/* Send Button */}
            <button
              onClick={handleSendMessage}
              disabled={!messageText.trim() || sending}
              className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <div className="w-5 h-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,audio/*,.pdf,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      )}

      {/* Session Completed Message */}
      {session?.status === 'locked' && (
        <div className="p-4 bg-gray-50 border-t border-gray-200 text-center">
          <div className="flex items-center justify-center text-gray-600">
            <CheckCircle className="w-5 h-5 mr-2" />
            <span>This conversation has been completed</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedChatThread; 