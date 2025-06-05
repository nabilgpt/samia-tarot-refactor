import React from 'react';
import { 
  Phone, 
  PhoneOff, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Settings,
  Users,
  AlertTriangle,
  Shield,
  MoreVertical
} from 'lucide-react';

const CallControls = ({
  isAudioEnabled,
  isVideoEnabled,
  onToggleAudio,
  onToggleVideo,
  onEndCall,
  isConnected,
  callType,
  isEmergency = false
}) => {
  const controlButtonClass = "p-4 rounded-full transition-all duration-200 hover:scale-110";
  const activeButtonClass = "bg-gray-700 text-white";
  const inactiveButtonClass = "bg-red-600 text-white";
  const endCallButtonClass = "bg-red-600 text-white hover:bg-red-700";

  return (
    <div className="bg-gray-800 p-6">
      <div className="flex items-center justify-center space-x-6">
        {/* Audio Toggle */}
        <button
          onClick={onToggleAudio}
          className={`${controlButtonClass} ${
            isAudioEnabled ? activeButtonClass : inactiveButtonClass
          }`}
          title={isAudioEnabled ? 'Mute Audio' : 'Unmute Audio'}
        >
          {isAudioEnabled ? (
            <Mic className="h-6 w-6" />
          ) : (
            <MicOff className="h-6 w-6" />
          )}
        </button>

        {/* Video Toggle (only for video calls) */}
        {callType === 'video' && (
          <button
            onClick={onToggleVideo}
            className={`${controlButtonClass} ${
              isVideoEnabled ? activeButtonClass : inactiveButtonClass
            }`}
            title={isVideoEnabled ? 'Turn Off Video' : 'Turn On Video'}
          >
            {isVideoEnabled ? (
              <Video className="h-6 w-6" />
            ) : (
              <VideoOff className="h-6 w-6" />
            )}
          </button>
        )}

        {/* End Call Button */}
        <button
          onClick={onEndCall}
          className={`${controlButtonClass} ${endCallButtonClass} px-8`}
          title="End Call"
        >
          <PhoneOff className="h-6 w-6" />
        </button>

        {/* Emergency Indicator */}
        {isEmergency && (
          <div className="flex items-center space-x-2 px-4 py-2 bg-red-900/50 rounded-full">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <span className="text-red-400 text-sm font-medium">EMERGENCY</span>
          </div>
        )}

        {/* Connection Status */}
        <div className="flex items-center space-x-2 px-4 py-2 bg-gray-700/50 rounded-full">
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`}></div>
          <span className="text-gray-300 text-sm">
            {isConnected ? 'Connected' : 'Connecting...'}
          </span>
        </div>

        {/* More Options */}
        <button
          className={`${controlButtonClass} ${activeButtonClass}`}
          title="More Options"
        >
          <MoreVertical className="h-6 w-6" />
        </button>
      </div>

      {/* Emergency Warning */}
      {isEmergency && (
        <div className="mt-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <p className="text-red-400 text-sm font-medium">
              This is an emergency call. Recording is automatically enabled for safety purposes.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallControls; 