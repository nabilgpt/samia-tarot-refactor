import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Video, VideoOff, Mic, MicOff, Phone, PhoneOff, Users, Clock,
  Settings, Maximize2, Minimize2, Volume2, VolumeX, Monitor,
  AlertTriangle, Shield, Eye, EyeOff, RotateCcw, Wifi
} from 'lucide-react';
import { getRTLClasses } from '../../utils/rtlUtils';
import CallConsentModal from './CallConsentModal';
import EmergencyExtensionModal from './EmergencyExtensionModal';
import CallRecordingIndicator from './CallRecordingIndicator';

const VideoCallInterface = ({ 
  sessionId, 
  userRole, // 'client' or 'reader'
  onCallEnd,
  onEmergencyExtension,
  sessionDetails 
}) => {
  // Core call state
  const [callStatus, setCallStatus] = useState('initializing'); // initializing, connecting, connected, ended
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState(5);
  
  // UI state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Call timing
  const [callDuration, setCallDuration] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  
  // Modals
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [consentType, setConsentType] = useState('call_participation');
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingConsent, setRecordingConsent] = useState(false);
  
  // Emergency extension
  const [canRequestExtension, setCanRequestExtension] = useState(true);
  const [extensionCount, setExtensionCount] = useState(0);
  
  // Video refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const callTimerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  
  // WebRTC connection management
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);

  // Initialize call and request permissions
  useEffect(() => {
    if (sessionDetails) {
      setTimeRemaining(sessionDetails.max_duration_minutes * 60);
      setIsRecording(sessionDetails.recording_enabled);
      initializeCall();
    }
    
    return () => {
      cleanup();
    };
  }, [sessionId]);

  // Call timer
  useEffect(() => {
    if (callStatus === 'connected') {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
        setTimeRemaining(prev => Math.max(0, prev - 1));
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    }

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [callStatus]);

  // Auto-hide controls
  useEffect(() => {
    if (showControls) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 5000);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls]);

  // Emergency extension warning
  useEffect(() => {
    if (timeRemaining <= 300 && timeRemaining > 0 && canRequestExtension) { // 5 minutes remaining
      // Show subtle warning that time is running low
    }
  }, [timeRemaining, canRequestExtension]);

  const initializeCall = async () => {
    try {
      setCallStatus('connecting');
      
      // Request media permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoEnabled ? { width: 1280, height: 720 } : false,
        audio: true
      });
      
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Initialize WebRTC peer connection
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          // Add TURN servers here for production
        ]
      });

      // Add local stream tracks
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Handle remote stream
      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        setRemoteStream(remoteStream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        setConnectionQuality(getConnectionQuality(pc.connectionState));
        
        if (pc.connectionState === 'connected') {
          setCallStatus('connected');
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setCallStatus('ended');
        }
      };

      setPeerConnection(pc);
      
      // Show consent modal if needed
      if (!sessionDetails?.client_consent_given || !sessionDetails?.reader_consent_given) {
        setShowConsentModal(true);
      }
      
    } catch (error) {
      console.error('Failed to initialize call:', error);
      setCallStatus('ended');
    }
  };

  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnection) {
      peerConnection.close();
    }
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
    }
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
  };

  const getConnectionQuality = (state) => {
    switch (state) {
      case 'connected': return 5;
      case 'connecting': return 3;
      case 'disconnected': return 1;
      case 'failed': return 0;
      default: return 2;
    }
  };

  const toggleVideo = async () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = async () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const videoTrack = screenStream.getVideoTracks()[0];
        
        // Replace video track in peer connection
        const sender = peerConnection.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        );
        
        if (sender) {
          await sender.replaceTrack(videoTrack);
        }
        
        videoTrack.onended = () => {
          setIsScreenSharing(false);
          // Switch back to camera
          const cameraTrack = localStream.getVideoTracks()[0];
          if (sender && cameraTrack) {
            sender.replaceTrack(cameraTrack);
          }
        };
        
        setIsScreenSharing(true);
      } else {
        // Switch back to camera
        const cameraTrack = localStream.getVideoTracks()[0];
        const sender = peerConnection.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        );
        
        if (sender && cameraTrack) {
          await sender.replaceTrack(cameraTrack);
        }
        
        setIsScreenSharing(false);
      }
    } catch (error) {
      console.error('Screen sharing error:', error);
    }
  };

  const handleEndCall = () => {
    setCallStatus('ended');
    cleanup();
    onCallEnd?.();
  };

  const handleConsentGranted = async (consentData) => {
    try {
      const response = await fetch(`/api/calls/sessions/${sessionId}/consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          consent_type: consentData.consent_type,
          consent_given: true
        })
      });

      if (response.ok) {
        if (consentData.consent_type === 'recording') {
          setRecordingConsent(true);
        }
        setShowConsentModal(false);
      }
    } catch (error) {
      console.error('Consent error:', error);
    }
  };

  const handleEmergencyExtension = (extensionData) => {
    onEmergencyExtension?.(extensionData);
    setExtensionCount(prev => prev + 1);
    setTimeRemaining(prev => prev + (extensionData.additional_minutes * 60));
    setShowEmergencyModal(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getQualityColor = (quality) => {
    if (quality >= 4) return 'text-green-400';
    if (quality >= 2) return 'text-yellow-400';
    return 'text-red-400';
  };

  const handleMouseMove = () => {
    setShowControls(true);
  };

  if (callStatus === 'ended') {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center text-white"
        >
          <PhoneOff className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h2 className="text-2xl font-bold mb-2">Call Ended</h2>
          <p className="text-cosmic-text/60 mb-6">
            Duration: {formatTime(callDuration)}
          </p>
          <button
            onClick={onCallEnd}
            className="px-6 py-3 bg-cosmic-accent hover:bg-cosmic-accent/80 rounded-lg font-medium transition-colors"
          >
            Return to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div 
      className={`fixed inset-0 bg-black ${getRTLClasses()}`}
      onMouseMove={handleMouseMove}
    >
      {/* Recording Indicator */}
      {isRecording && recordingConsent && (
        <CallRecordingIndicator 
          isRecording={isRecording}
          duration={callDuration}
          className="absolute top-4 left-4 z-40"
        />
      )}

      {/* Connection Quality Indicator */}
      <div className="absolute top-4 right-4 z-40 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
        <Wifi className={`w-4 h-4 ${getQualityColor(connectionQuality)}`} />
        <span className={`text-sm ${getQualityColor(connectionQuality)}`}>
          {connectionQuality}/5
        </span>
      </div>

      {/* Call Timer and Status */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-40 bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2">
        <div className="flex items-center gap-4 text-white text-sm">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {formatTime(callDuration)}
          </div>
          
          {timeRemaining > 0 && (
            <div className={`flex items-center gap-2 ${timeRemaining <= 300 ? 'text-red-400' : ''}`}>
              <span>Remaining:</span>
              {formatTime(timeRemaining)}
            </div>
          )}
          
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${
              callStatus === 'connected' ? 'bg-green-400' : 
              callStatus === 'connecting' ? 'bg-yellow-400' : 'bg-red-400'
            }`} />
            <span className="capitalize">{callStatus}</span>
          </div>
        </div>
      </div>

      {/* Video Streams */}
      <div className="relative w-full h-full">
        {/* Remote Video (Main) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover bg-cosmic-dark"
        />

        {/* Local Video (Picture-in-Picture) */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute top-20 right-4 w-48 h-36 bg-cosmic-dark border-2 border-cosmic-accent/30 rounded-lg overflow-hidden cursor-pointer"
          onClick={() => setIsFullscreen(!isFullscreen)}
        >
          {isVideoEnabled ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-cosmic-panel">
              <VideoOff className="w-8 h-8 text-cosmic-text/60" />
            </div>
          )}
          
          {/* Local video controls overlay */}
          <div className="absolute bottom-2 left-2 right-2 flex justify-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); toggleVideo(); }}
              className={`p-1.5 rounded-full ${isVideoEnabled ? 'bg-cosmic-panel/80' : 'bg-red-500/80'} text-white`}
            >
              {isVideoEnabled ? <Video className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); toggleAudio(); }}
              className={`p-1.5 rounded-full ${isAudioEnabled ? 'bg-cosmic-panel/80' : 'bg-red-500/80'} text-white`}
            >
              {isAudioEnabled ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
            </button>
          </div>
        </motion.div>
      </div>

      {/* Call Controls */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6"
          >
            <div className="flex items-center justify-center gap-4">
              {/* Video Toggle */}
              <button
                onClick={toggleVideo}
                className={`p-4 rounded-full transition-colors ${
                  isVideoEnabled ? 'bg-cosmic-panel/80 hover:bg-cosmic-panel' : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {isVideoEnabled ? <Video className="w-6 h-6 text-white" /> : <VideoOff className="w-6 h-6 text-white" />}
              </button>

              {/* Audio Toggle */}
              <button
                onClick={toggleAudio}
                className={`p-4 rounded-full transition-colors ${
                  isAudioEnabled ? 'bg-cosmic-panel/80 hover:bg-cosmic-panel' : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {isAudioEnabled ? <Mic className="w-6 h-6 text-white" /> : <MicOff className="w-6 h-6 text-white" />}
              </button>

              {/* Screen Share */}
              <button
                onClick={toggleScreenShare}
                className={`p-4 rounded-full transition-colors ${
                  isScreenSharing ? 'bg-cosmic-accent hover:bg-cosmic-accent/80' : 'bg-cosmic-panel/80 hover:bg-cosmic-panel'
                }`}
              >
                <Monitor className="w-6 h-6 text-white" />
              </button>

              {/* Emergency Extension (Client Only) */}
              {userRole === 'client' && timeRemaining <= 600 && canRequestExtension && (
                <button
                  onClick={() => setShowEmergencyModal(true)}
                  className="p-4 rounded-full bg-orange-500 hover:bg-orange-600 transition-colors"
                >
                  <AlertTriangle className="w-6 h-6 text-white" />
                </button>
              )}

              {/* End Call */}
              <button
                onClick={handleEndCall}
                className="p-4 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
              >
                <PhoneOff className="w-6 h-6 text-white" />
              </button>

              {/* Settings */}
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-4 rounded-full bg-cosmic-panel/80 hover:bg-cosmic-panel transition-colors"
              >
                <Settings className="w-6 h-6 text-white" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Consent Modal */}
      <CallConsentModal
        isOpen={showConsentModal}
        onClose={() => setShowConsentModal(false)}
        onConsent={handleConsentGranted}
        consentType={consentType}
        sessionDetails={sessionDetails}
      />

      {/* Emergency Extension Modal */}
      <EmergencyExtensionModal
        isOpen={showEmergencyModal}
        onClose={() => setShowEmergencyModal(false)}
        onSubmit={handleEmergencyExtension}
        sessionId={sessionId}
        extensionCount={extensionCount}
        timeRemaining={timeRemaining}
      />
    </div>
  );
};

export default VideoCallInterface;