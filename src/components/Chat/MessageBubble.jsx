import React, { useState, useRef } from 'react';
import { Play, Pause, Download, Reply, Trash2, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const MessageBubble = ({ message, isOwn, onReply, onDelete, canDelete }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const audioRef = useRef(null);

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  const handleImageClick = (imageUrl) => {
    // Open image in new tab or modal
    window.open(imageUrl, '_blank');
  };

  const getMessageStatus = () => {
    if (message.type === 'voice' && !message.is_approved) {
      return (
        <div className="flex items-center text-yellow-600 text-xs mt-1">
          <Clock className="w-3 h-3 mr-1" />
          Pending approval
        </div>
      );
    }
    
    if (message.is_read) {
      return (
        <div className="flex items-center text-green-600 text-xs mt-1">
          <CheckCircle className="w-3 h-3 mr-1" />
          Read
        </div>
      );
    }
    
    return null;
  };

  const renderTextMessage = () => (
    <div className="space-y-2">
      {message.reply_to_message && (
        <div className="border-l-2 border-gray-300 pl-2 py-1 bg-gray-50 rounded text-sm">
          <p className="text-gray-600 font-medium">
            {message.reply_to_message.sender?.first_name}
          </p>
          <p className="text-gray-500 truncate">
            {message.reply_to_message.type === 'text' 
              ? message.reply_to_message.content 
              : `${message.reply_to_message.type} message`
            }
          </p>
        </div>
      )}
      
      <p className="whitespace-pre-wrap break-words">{message.content}</p>
    </div>
  );

  const renderImageMessage = () => (
    <div className="space-y-2">
      <div 
        className="cursor-pointer rounded-lg overflow-hidden max-w-xs"
        onClick={() => handleImageClick(message.file_url)}
      >
        <img
          src={message.file_url}
          alt="Shared image"
          className="w-full h-auto hover:opacity-90 transition-opacity"
          loading="lazy"
        />
      </div>
      
      {message.content && (
        <p className="text-sm">{message.content}</p>
      )}
    </div>
  );

  const renderVoiceMessage = () => {
    if (!message.is_approved && !isOwn) {
      return (
        <div className="flex items-center space-x-2 text-gray-500">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">Voice message pending approval</span>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-3 min-w-0">
        <button
          onClick={handlePlayAudio}
          className={`p-2 rounded-full transition-colors ${
            isOwn 
              ? 'bg-white bg-opacity-20 hover:bg-opacity-30' 
              : 'bg-purple-100 hover:bg-purple-200'
          }`}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </button>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <div className="flex-1 bg-gray-200 rounded-full h-1">
              <div className="bg-purple-500 h-1 rounded-full w-0"></div>
            </div>
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {formatDuration(message.duration_seconds || 0)}
            </span>
          </div>
        </div>

        <audio
          ref={audioRef}
          src={message.file_url}
          onEnded={handleAudioEnded}
          className="hidden"
        />
      </div>
    );
  };

  const renderSystemMessage = () => (
    <div className="text-center py-2">
      <div className="inline-block px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
        {message.content}
      </div>
    </div>
  );

  const renderMessageContent = () => {
    switch (message.type) {
      case 'text':
        return renderTextMessage();
      case 'image':
        return renderImageMessage();
      case 'voice':
        return renderVoiceMessage();
      case 'system':
        return renderSystemMessage();
      default:
        return <p>Unsupported message type</p>;
    }
  };

  // System messages are centered and don't have bubbles
  if (message.type === 'system') {
    return renderSystemMessage();
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}>
      <div
        className={`relative max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          isOwn
            ? 'bg-purple-600 text-white'
            : 'bg-gray-100 text-gray-900'
        }`}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* Sender name (for group chats or when not own message) */}
        {!isOwn && message.sender && (
          <p className="text-xs text-gray-500 mb-1 font-medium">
            {message.sender.first_name} {message.sender.last_name}
          </p>
        )}

        {/* Message content */}
        <div className="mb-1">
          {renderMessageContent()}
        </div>

        {/* Message metadata */}
        <div className={`flex items-center justify-between text-xs ${
          isOwn ? 'text-purple-200' : 'text-gray-500'
        }`}>
          <span>{formatTime(message.created_at)}</span>
          
          {/* Message status for own messages */}
          {isOwn && getMessageStatus()}
        </div>

        {/* Message actions */}
        {showActions && (
          <div className={`absolute top-0 ${
            isOwn ? 'right-full mr-2' : 'left-full ml-2'
          } flex items-center space-x-1 bg-white border border-gray-200 rounded-lg shadow-lg p-1`}>
            
            {/* Reply button */}
            <button
              onClick={() => onReply(message)}
              className="p-1 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded"
              title="Reply"
            >
              <Reply className="w-4 h-4" />
            </button>

            {/* Delete button (only for own messages) */}
            {canDelete && (
              <button
                onClick={() => onDelete(message.id)}
                className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {/* Download button for files */}
            {(message.type === 'image' || message.type === 'voice') && (
              <a
                href={message.file_url}
                download={message.file_name}
                className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble; 