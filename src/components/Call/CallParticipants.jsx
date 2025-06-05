import React from 'react';
import { Users, Eye, EyeOff, Mic, MicOff, Video, VideoOff, Shield, Crown } from 'lucide-react';

const CallParticipants = ({ participants = [], currentUserId, className = '' }) => {
  if (!participants || participants.length === 0) {
    return null;
  }

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-3 w-3 text-yellow-400" />;
      case 'monitor':
        return <Shield className="h-3 w-3 text-blue-400" />;
      case 'reader':
        return <div className="w-3 h-3 bg-purple-500 rounded-full" />;
      case 'client':
        return <div className="w-3 h-3 bg-green-500 rounded-full" />;
      default:
        return <div className="w-3 h-3 bg-gray-500 rounded-full" />;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'text-yellow-400';
      case 'monitor':
        return 'text-blue-400';
      case 'reader':
        return 'text-purple-400';
      case 'client':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  const getParticipantName = (participant) => {
    // This would need to be populated from the API with user details
    return participant.user_name || `${participant.role} User`;
  };

  const isCurrentUser = (participant) => {
    return participant.user_id === currentUserId;
  };

  return (
    <div className={`bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 ${className}`}>
      <div className="flex items-center space-x-2 mb-2">
        <Users className="h-4 w-4 text-gray-400" />
        <span className="text-gray-400 text-sm font-medium">
          Participants ({participants.length})
        </span>
      </div>

      <div className="space-y-2">
        {participants.map((participant) => (
          <div
            key={participant.id}
            className={`flex items-center justify-between p-2 rounded-lg ${
              isCurrentUser(participant) 
                ? 'bg-purple-900/50 border border-purple-500/30' 
                : 'bg-gray-700/50'
            }`}
          >
            <div className="flex items-center space-x-2">
              {/* Role Icon */}
              {getRoleIcon(participant.role)}

              {/* Participant Name */}
              <span className={`text-sm font-medium ${getRoleColor(participant.role)}`}>
                {getParticipantName(participant)}
                {isCurrentUser(participant) && ' (You)'}
              </span>

              {/* Silent Mode Indicator */}
              {participant.is_silent && (
                <div className="flex items-center space-x-1">
                  <EyeOff className="h-3 w-3 text-gray-500" />
                  <span className="text-xs text-gray-500">Silent</span>
                </div>
              )}
            </div>

            {/* Media Status */}
            <div className="flex items-center space-x-1">
              {/* Audio Status */}
              {participant.audio_enabled ? (
                <Mic className="h-3 w-3 text-green-400" />
              ) : (
                <MicOff className="h-3 w-3 text-red-400" />
              )}

              {/* Video Status */}
              {participant.video_enabled ? (
                <Video className="h-3 w-3 text-green-400" />
              ) : (
                <VideoOff className="h-3 w-3 text-gray-500" />
              )}

              {/* Connection Status */}
              <div className={`w-2 h-2 rounded-full ${
                participant.connection_status === 'connected' 
                  ? 'bg-green-500' 
                  : participant.connection_status === 'connecting'
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`} />
            </div>
          </div>
        ))}
      </div>

      {/* Legend for roles */}
      <div className="mt-3 pt-2 border-t border-gray-600">
        <div className="grid grid-cols-2 gap-1 text-xs">
          <div className="flex items-center space-x-1">
            <Crown className="h-3 w-3 text-yellow-400" />
            <span className="text-gray-400">Admin</span>
          </div>
          <div className="flex items-center space-x-1">
            <Shield className="h-3 w-3 text-blue-400" />
            <span className="text-gray-400">Monitor</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-purple-500 rounded-full" />
            <span className="text-gray-400">Reader</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <span className="text-gray-400">Client</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallParticipants; 