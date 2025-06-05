import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { ChatAPI } from '../../api/chatApi.js';
import { Send, Image, Mic, MicOff, Reply, Trash2, Lock, Clock } from 'lucide-react';
import AudioRecorder from './AudioRecorder.jsx';
import MessageBubble from './MessageBubble.jsx';

const ChatThread = ({ bookingId, onBack }) => {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [chatSession, setChatSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [error, setError] = useState(null);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (bookingId) {
      loadChatData();
      
      // Subscribe to real-time message updates
      const messageSubscription = ChatAPI.subscribeToMessages(bookingId, (payload) => {
        if (payload.eventType === 'INSERT') {
          setMessages(prev => [...prev, payload.new]);
          scrollToBottom();
        } else if (payload.eventType === 'UPDATE') {
          setMessages(prev => prev.map(msg => 
            msg.id === payload.new.id ? payload.new : msg
          ));
        } else if (payload.eventType === 'DELETE') {
          setMessages(prev => prev.filter(msg => msg.id !== payload.old.id));
        }
      });

      // Subscribe to chat notifications
      const notificationSubscription = ChatAPI.subscribeToChatNotifications(user.id, (notification) => {
        if (notification.booking_id === bookingId) {
          if (notification.type === 'typing') {
            handleTypingIndicator(notification.data);
          } else if (notification.type === 'chat_locked') {
            loadChatSession();
          }
        }
      });

      // Mark messages as read when component mounts
      ChatAPI.markMessagesAsRead(bookingId, user.id);

      return () => {
        messageSubscription?.unsubscribe();
        notificationSubscription?.unsubscribe();
      };
    }
  }, [bookingId, user.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChatData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await Promise.all([
        loadChatSession(),
        loadMessages()
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadChatSession = async () => {
    const result = await ChatAPI.getChatSession(bookingId);
    if (result.success) {
      setChatSession(result.data);
    } else {
      throw new Error(result.error);
    }
  };

  const loadMessages = async () => {
    const result = await ChatAPI.getMessages(bookingId);
    if (result.success) {
      setMessages(result.data);
    } else {
      throw new Error(result.error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleTypingIndicator = (data) => {
    if (data.sender_id !== user.id) {
      setTypingUsers(prev => {
        const filtered = prev.filter(u => u.id !== data.sender_id);
        return [...filtered, { id: data.sender_id, timestamp: data.timestamp }];
      });

      // Remove typing indicator after 3 seconds
      setTimeout(() => {
        setTypingUsers(prev => prev.filter(u => u.id !== data.sender_id));
      }, 3000);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || sending || chatSession?.status === 'locked') return;

    try {
      setSending(true);
      setError(null);

      const result = await ChatAPI.sendTextMessage(
        bookingId,
        user.id,
        messageText,
        replyTo?.id
      );

      if (result.success) {
        setMessageText('');
        setReplyTo(null);
        // Message will be added via real-time subscription
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || chatSession?.status === 'locked') return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    try {
      setSending(true);
      setError(null);

      const result = await ChatAPI.sendImageMessage(bookingId, user.id, file);
      
      if (!result.success) {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
      event.target.value = ''; // Reset file input
    }
  };

  const handleVoiceMessage = async (audioBlob, duration) => {
    if (chatSession?.status === 'locked') return;

    try {
      setSending(true);
      setError(null);

      const result = await ChatAPI.sendVoiceMessage(bookingId, user.id, audioBlob, duration);
      
      if (result.success) {
        setShowAudioRecorder(false);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleTyping = () => {
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing indicator
    ChatAPI.sendTypingIndicator(bookingId, user.id);

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      // Typing indicator will auto-expire
    }, 3000);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    } else {
      handleTyping();
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      const result = await ChatAPI.deleteMessage(messageId, user.id);
      if (!result.success) {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLockChat = async () => {
    if (profile.role !== 'reader') return;

    try {
      const result = await ChatAPI.lockChatSession(bookingId, user.id);
      if (result.success) {
        await loadChatSession();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const canSendMessage = () => {
    return chatSession?.status === 'active' && !sending;
  };

  const getRemainingLimits = () => {
    if (!chatSession || profile.role !== 'client') return null;

    return {
      text: chatSession.max_text_chars - chatSession.client_text_chars_used,
      voice: chatSession.max_voice_seconds - chatSession.client_voice_seconds_used,
      images: chatSession.max_images - chatSession.client_images_sent
    };
  };

  const getOtherParticipant = () => {
    if (!chatSession?.booking) return null;
    
    if (profile.role === 'client') {
      return chatSession.booking.reader;
    } else {
      return chatSession.booking.client;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!chatSession) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Chat session not found</p>
        <button
          onClick={onBack}
          className="mt-4 text-purple-600 hover:text-purple-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  const otherParticipant = getOtherParticipant();
  const remainingLimits = getRemainingLimits();

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="text-gray-600 hover:text-gray-800"
          >
            ←
          </button>
          
          {otherParticipant && (
            <>
              {otherParticipant.avatar_url ? (
                <img
                  src={otherParticipant.avatar_url}
                  alt={`${otherParticipant.first_name} ${otherParticipant.last_name}`}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <span className="text-purple-600 font-medium">
                    {otherParticipant.first_name?.[0]?.toUpperCase()}
                  </span>
                </div>
              )}
              
              <div>
                <h3 className="font-medium text-gray-900">
                  {otherParticipant.first_name} {otherParticipant.last_name}
                </h3>
                <p className="text-sm text-gray-600">
                  {chatSession.booking?.service?.name}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {chatSession.status === 'locked' && (
            <div className="flex items-center text-red-600 text-sm">
              <Lock className="w-4 h-4 mr-1" />
              Locked
            </div>
          )}
          
          {profile.role === 'reader' && chatSession.status === 'active' && (
            <button
              onClick={handleLockChat}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
            >
              Finish Reading
            </button>
          )}
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
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isOwn={message.sender_id === user.id}
            onReply={setReplyTo}
            onDelete={handleDeleteMessage}
            canDelete={message.sender_id === user.id}
          />
        ))}

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
                Replying to {replyTo.sender?.first_name}
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
          <AudioRecorder
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
            {/* Image Upload */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={sending || (remainingLimits?.images <= 0)}
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
        </div>
      )}

      {/* Chat Locked Message */}
      {chatSession.status === 'locked' && (
        <div className="p-4 bg-red-50 border-t border-red-200 text-center">
          <div className="flex items-center justify-center text-red-600">
            <Lock className="w-5 h-5 mr-2" />
            <span>This chat has been locked by the reader</span>
          </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
    </div>
  );
};

export default ChatThread; 