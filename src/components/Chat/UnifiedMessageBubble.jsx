import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, Pause, Download, Reply, Trash2, Clock, 
  CheckCircle, AlertCircle, Eye, EyeOff, Volume2,
  FileText, Image as ImageIcon, Mic, Users, Lock
} from 'lucide-react';

const UnifiedMessageBubble = ({ 
  message, 
  isOwn, 
  onReply, 
  onDelete, 
  canDelete = false,
  showSender = true 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [showActions, setShowActions] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const audioRef = useRef(null);
  const progressInterval = useRef(null);

  useEffect(() => {
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, []);

  // Format timestamp
  const formatTime = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    // Less than 24 hours - show time
    if (diff < 86400000) {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      });
    }
    
    // More than 24 hours - show date and time
    return date.toLocaleDateString('en-US', { 
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format duration for audio
  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle audio playback
  const handlePlayAudio = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    } else {
      audioRef.current.play();
      // Update progress
      progressInterval.current = setInterval(() => {
        if (audioRef.current) {
          const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
          setPlaybackProgress(progress);
        }
      }, 100);
    }
    setIsPlaying(!isPlaying);
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setPlaybackProgress(0);
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
  };

  const handleAudioError = () => {
    setIsPlaying(false);
    console.error('Audio playback error');
  };

  // Handle image click
  const handleImageClick = (imageUrl) => {
    window.open(imageUrl, '_blank', 'noopener,noreferrer');
  };

  // Handle file download
  const handleDownload = (fileUrl, fileName) => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get message status indicator
  const getMessageStatus = () => {
    if (message.type === 'audio' && message.status === 'pending') {
      return (
        <div className="flex items-center text-yellow-600 text-xs mt-1">
          <Clock className="w-3 h-3 mr-1" />
          Pending approval
        </div>
      );
    }
    
    if (message.status === 'approved') {
      return (
        <div className="flex items-center text-green-600 text-xs mt-1">
          <CheckCircle className="w-3 h-3 mr-1" />
          Approved
        </div>
      );
    }

    if (message.read_by && message.read_by.length > 0) {
      return (
        <div className="flex items-center text-blue-600 text-xs mt-1">
          <Eye className="w-3 h-3 mr-1" />
          Read
        </div>
      );
    }
    
    return null;
  };

  // Render reply preview
  const renderReplyPreview = () => {
    if (!message.reply_to_message) return null;

    const replyMessage = message.reply_to_message;
    return (
      <div className="border-l-2 border-gray-300 pl-3 py-2 mb-2 bg-gray-50 rounded-r text-sm">
        <p className="text-gray-600 font-medium text-xs">
          {replyMessage.sender?.first_name || 'User'}
        </p>
        <p className="text-gray-500 truncate">
          {replyMessage.type === 'text' 
            ? replyMessage.content 
            : `${replyMessage.type} message`
          }
        </p>
      </div>
    );
  };

  // Render text message
  const renderTextMessage = () => (
    <div className="space-y-2">
      {renderReplyPreview()}
      <p className="whitespace-pre-wrap break-words leading-relaxed">
        {message.content}
      </p>
    </div>
  );

  // Render image message
  const renderImageMessage = () => (
    <div className="space-y-2">
      {renderReplyPreview()}
      
      <div className="relative max-w-xs">
        {!imageLoaded && !imageError && (
          <div className="w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
          </div>
        )}
        
        {imageError ? (
          <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-500">
              <ImageIcon className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">Image unavailable</p>
            </div>
          </div>
        ) : (
          <div 
            className="cursor-pointer rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
            onClick={() => handleImageClick(message.file_url)}
          >
            <img
              src={message.file_url}
              alt={message.file_name || "Shared image"}
              className={`w-full h-auto max-h-64 object-cover transition-opacity ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              loading="lazy"
            />
          </div>
        )}
      </div>
      
      {message.content && (
        <p className="text-sm mt-2">{message.content}</p>
      )}
    </div>
  );

  // Render voice/audio message
  const renderAudioMessage = () => {
    // Check if message needs approval and user can't see it
    if (message.status === 'pending' && !isOwn) {
      return (
        <div className="flex items-center space-x-3 text-gray-500 py-2">
          <div className="p-2 bg-gray-100 rounded-full">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <p className="text-sm">Voice message pending approval</p>
            <p className="text-xs text-gray-400">This message will be available once approved</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {renderReplyPreview()}
        
        <div className="flex items-center space-x-3 min-w-0 py-2">
          <button
            onClick={handlePlayAudio}
            className={`p-2 rounded-full transition-colors flex-shrink-0 ${
              isOwn 
                ? 'bg-white bg-opacity-20 hover:bg-opacity-30 text-white' 
                : 'bg-purple-100 hover:bg-purple-200 text-purple-700'
            }`}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </button>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <Volume2 className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-500">
                Voice message
              </span>
              <span className="text-xs text-gray-400">
                {formatDuration(message.duration_seconds)}
              </span>
            </div>
            
            {/* Progress bar */}
            <div className="relative">
              <div className={`w-full h-1 rounded-full ${
                isOwn ? 'bg-white bg-opacity-30' : 'bg-gray-200'
              }`}>
                <div 
                  className={`h-1 rounded-full transition-all duration-100 ${
                    isOwn ? 'bg-white' : 'bg-purple-500'
                  }`}
                  style={{ width: `${playbackProgress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Download button */}
          <button
            onClick={() => handleDownload(message.file_url, message.file_name)}
            className={`p-1 rounded transition-colors ${
              isOwn 
                ? 'text-white hover:bg-white hover:bg-opacity-20' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Download className="w-3 h-3" />
          </button>
        </div>

        <audio
          ref={audioRef}
          src={message.file_url}
          onEnded={handleAudioEnded}
          onError={handleAudioError}
          preload="metadata"
          className="hidden"
        />
      </div>
    );
  };

  // Render file message
  const renderFileMessage = () => (
    <div className="space-y-2">
      {renderReplyPreview()}
      
      <div 
        className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-opacity-80 transition-colors ${
          isOwn ? 'bg-white bg-opacity-20 border-white border-opacity-30' : 'bg-gray-50 border-gray-200'
        }`}
        onClick={() => handleDownload(message.file_url, message.file_name)}
      >
        <div className={`p-2 rounded ${isOwn ? 'bg-white bg-opacity-30' : 'bg-gray-200'}`}>
          <FileText className="w-4 h-4" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {message.file_name || 'File attachment'}
          </p>
          <p className="text-xs text-gray-500">
            {message.file_size ? `${Math.round(message.file_size / 1024)}KB` : 'Download'}
          </p>
        </div>
        
        <Download className="w-4 h-4 text-gray-400" />
      </div>
      
      {message.content && (
        <p className="text-sm">{message.content}</p>
      )}
    </div>
  );

  // Render system message
  const renderSystemMessage = () => (
    <div className="text-center py-2">
      <div className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
        {message.type === 'emergency' && <AlertTriangle className="w-3 h-3 mr-1 text-red-500" />}
        {message.content}
      </div>
    </div>
  );

  // Get message content based on type
  const renderMessageContent = () => {
    switch (message.type) {
      case 'text':
        return renderTextMessage();
      case 'image':
        return renderImageMessage();
      case 'audio':
      case 'voice':
        return renderAudioMessage();
      case 'file':
        return renderFileMessage();
      case 'system':
      case 'emergency':
        return renderSystemMessage();
      default:
        return <p className="text-gray-500 italic">Unsupported message type: {message.type}</p>;
    }
  };

  // System messages are centered and don't have bubbles
  if (message.type === 'system' || message.type === 'emergency') {
    return renderSystemMessage();
  }

  return (
    <div 
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${isOwn ? 'order-2' : 'order-1'}`}>
        {/* Sender name (for group chats or when not own message) */}
        {showSender && !isOwn && message.sender && (
          <div className="flex items-center space-x-2 mb-1 px-1">
            {message.sender.avatar_url && (
              <img 
                src={message.sender.avatar_url} 
                alt={message.sender.first_name}
                className="w-4 h-4 rounded-full"
              />
            )}
            <span className="text-xs text-gray-600 font-medium">
              {message.sender.first_name} {message.sender.last_name}
            </span>
            {message.sender.role && message.sender.role !== 'client' && (
              <span className="text-xs px-1 py-0.5 bg-purple-100 text-purple-600 rounded">
                {message.sender.role}
              </span>
            )}
          </div>
        )}

        {/* Message bubble */}
        <div
          className={`px-4 py-2 rounded-2xl shadow-sm ${
            isOwn
              ? 'bg-purple-600 text-white rounded-br-md'
              : 'bg-white border border-gray-200 text-gray-900 rounded-bl-md'
          }`}
        >
          {renderMessageContent()}
          
          {/* Message metadata */}
          <div className={`flex items-center justify-between mt-2 text-xs ${
            isOwn ? 'text-purple-100' : 'text-gray-500'
          }`}>
            <span>{formatTime(message.created_at)}</span>
            {getMessageStatus()}
          </div>
        </div>

        {/* Action buttons */}
        {showActions && (
          <div className={`flex items-center space-x-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${
            isOwn ? 'justify-end' : 'justify-start'
          }`}>
            {onReply && (
              <button
                onClick={() => onReply(message)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                title="Reply"
              >
                <Reply className="w-3 h-3" />
              </button>
            )}
            
            {canDelete && onDelete && (
              <button
                onClick={() => onDelete(message.id)}
                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedMessageBubble; 