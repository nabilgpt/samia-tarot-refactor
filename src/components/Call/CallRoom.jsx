import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { CallAPI } from '../../api/callApi.js';
import CallTimer from './CallTimer.jsx';
import CallControls from './CallControls.jsx';
import CallParticipants from './CallParticipants.jsx';
import RecordingManager from './RecordingManager.jsx';
import Peer from 'peerjs';
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
  Shield
} from 'lucide-react';

const CallRoom = ({ callSessionId, onCallEnd }) => {
  const { user, profile } = useAuth();
  const [callSession, setCallSession] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peer, setPeer] = useState(null);
  const [connection, setConnection] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState('good');
  const [participants, setParticipants] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [callStarted, setCallStarted] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const qualityCheckIntervalRef = useRef(null);

  // Load call session data
  useEffect(() => {
    loadCallSession();
  }, [callSessionId]);

  // Initialize PeerJS when call session is loaded
  useEffect(() => {
    if (callSession && !peer) {
      initializePeerJS();
    }
  }, [callSession]);

  // Subscribe to call session updates
  useEffect(() => {
    if (!callSessionId) return;

    const subscription = CallAPI.subscribeToCallSession(callSessionId, (payload) => {
      if (payload.new) {
        setCallSession(prev => ({ ...prev, ...payload.new }));
        
        // Handle call end
        if (payload.new.status === 'ended') {
          handleCallEnd();
        }
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [callSessionId]);

  // Subscribe to participants updates
  useEffect(() => {
    if (!callSessionId) return;

    const subscription = CallAPI.subscribeToCallParticipants(callSessionId, (payload) => {
      loadParticipants();
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [callSessionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const loadCallSession = async () => {
    try {
      setLoading(true);
      const result = await CallAPI.getCallSession(callSessionId);
      if (result.success) {
        setCallSession(result.data);
        setIsVideoEnabled(result.data.call_type === 'video');
        await loadParticipants();
      } else {
        setError('Failed to load call session');
      }
    } catch (error) {
      console.error('Error loading call session:', error);
      setError('Failed to load call session');
    } finally {
      setLoading(false);
    }
  };

  const loadParticipants = async () => {
    try {
      const result = await CallAPI.getCallSession(callSessionId);
      if (result.success && result.data.participants) {
        setParticipants(result.data.participants);
      }
    } catch (error) {
      console.error('Error loading participants:', error);
    }
  };

  
  // Enhanced WebRTC Configuration
  const getWebRTCConfiguration = () => {
    const config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ],
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    };

    // Add TURN servers if configured
    if (process.env.VITE_TURN_SERVER_URL) {
      config.iceServers.push({
        urls: process.env.VITE_TURN_SERVER_URL,
        username: process.env.VITE_TURN_SERVER_USERNAME,
        credential: process.env.VITE_TURN_SERVER_CREDENTIAL
      });
    }

    // Add Twilio TURN servers if configured
    if (process.env.TWILIO_ACCOUNT_SID) {
      // Twilio provides TURN servers - would need to fetch from their API
      console.log('Twilio WebRTC configuration available');
    }

    return config;
  };

  const initializePeerJS = async () => {
    try {
      // Create PeerJS instance with configuration
      const peerInstance = new Peer(user.id, {
        host: 'localhost', // Configure your PeerJS server
        port: 9000,
        path: '/peerjs',
        config: getWebRTCConfiguration(),
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });

      setPeer(peerInstance);

      // Handle peer events
      peerInstance.on('open', (id) => {
        console.log('PeerJS connected with ID:', id);
      });

      peerInstance.on('call', (call) => {
        // Answer incoming call
        handleIncomingCall(call);
      });

      peerInstance.on('connection', (conn) => {
        setConnection(conn);
        setIsConnected(true);
      });

      peerInstance.on('error', (error) => {
        console.error('PeerJS error:', error);
        setError('Connection failed');
      });

      // Get user media
      await getUserMedia();

      // Start call if user is the initiator
      if (shouldInitiateCall()) {
        await startCall();
      }

      // Start recording if enabled
      if (callSession.is_emergency || profile?.role === 'admin') {
        startRecording();
      }

    } catch (error) {
      console.error('Error initializing PeerJS:', error);
      setError('Failed to initialize call');
    }
  };

  const getUserMedia = async () => {
    try {
      const constraints = {
        audio: true,
        video: isVideoEnabled ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        } : false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      return stream;
    } catch (error) {
      console.error('Error getting user media:', error);
      setError('Failed to access camera/microphone');
      throw error;
    }
  };

  const shouldInitiateCall = () => {
    // Client initiates regular calls, system initiates emergency calls
    return callSession.user_id === user.id && !callSession.is_emergency;
  };

  const startCall = async () => {
    try {
      if (!peer || !localStream) return;

      // Get the other participant's peer ID
      const otherParticipant = participants.find(p => p.user_id !== user.id);
      if (!otherParticipant) {
        console.error('No other participant found');
        return;
      }

      // Make call using PeerJS
      const call = peer.call(otherParticipant.user_id, localStream);
      
      call.on('stream', (remoteStream) => {
        setRemoteStream(remoteStream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
        setIsConnected(true);
      });

      call.on('close', () => {
        setIsConnected(false);
      });

      // Update call status to ringing
      await CallAPI.startCallSession(callSessionId);
      setCallStarted(true);

    } catch (error) {
      console.error('Error starting call:', error);
      setError('Failed to start call');
    }
  };

  const handleIncomingCall = async (call) => {
    try {
      if (!localStream) {
        await getUserMedia();
      }

      // Answer the call
      call.answer(localStream);

      call.on('stream', (remoteStream) => {
        setRemoteStream(remoteStream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
        setIsConnected(true);
      });

      call.on('close', () => {
        setIsConnected(false);
      });

      // Update call status to active
      await CallAPI.startCallSession(callSessionId);
      setCallStarted(true);

    } catch (error) {
      console.error('Error answering call:', error);
      setError('Failed to answer call');
    }
  };

  const startQualityMonitoring = () => {
    qualityCheckIntervalRef.current = setInterval(() => {
      // PeerJS doesn't expose WebRTC stats directly, so we'll simulate quality monitoring
      // In a real implementation, you'd need to access the underlying RTCPeerConnection
      const quality = Math.random() > 0.8 ? 'poor' : Math.random() > 0.5 ? 'fair' : 'good';
      setConnectionQuality(quality);

      // Submit quality metrics
      CallAPI.submitCallQualityMetrics({
        call_session_id: callSessionId,
        user_id: user.id,
        connection_strength: quality === 'good' ? 5 : quality === 'fair' ? 3 : 1,
        packet_loss: Math.random() * 5 // Simulated packet loss
      });
    }, 5000);
  };

  const startRecording = () => {
    try {
      if (!localStream) return;

      const options = {
        mimeType: 'video/webm;codecs=vp9,opus'
      };

      mediaRecorderRef.current = new MediaRecorder(localStream, options);
      recordedChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        await uploadRecording(blob);
      };

      mediaRecorderRef.current.start(1000); // Record in 1-second chunks
      setIsRecording(true);

    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const uploadRecording = async (blob) => {
    try {
      const file = new File([blob], `call_${callSessionId}_${Date.now()}.webm`, {
        type: 'video/webm'
      });

      await CallAPI.uploadRecording(file, callSessionId, 'video');
    } catch (error) {
      console.error('Error uploading recording:', error);
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const handleCallEnd = useCallback(async () => {
    try {
      // Stop recording
      stopRecording();

      // End call session
      await CallAPI.endCallSession(callSessionId);

      // Remove participant
      await CallAPI.removeCallParticipant(callSessionId, user.id);

      // Cleanup
      cleanup();

      // Notify parent component
      if (onCallEnd) {
        onCallEnd();
      }

    } catch (error) {
      console.error('Error ending call:', error);
    }
  }, [callSessionId, user.id, onCallEnd]);

  const cleanup = () => {
    // Stop quality monitoring
    if (qualityCheckIntervalRef.current) {
      clearInterval(qualityCheckIntervalRef.current);
    }

    // Stop recording
    stopRecording();

    // Close PeerJS connection
    if (connection) {
      connection.close();
      setConnection(null);
    }

    // Destroy PeerJS instance
    if (peer) {
      peer.destroy();
      setPeer(null);
    }

    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    // Clear video elements
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  };

  const getConnectionQualityColor = () => {
    switch (connectionQuality) {
      case 'good': return 'text-green-500';
      case 'fair': return 'text-yellow-500';
      case 'poor': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white">Connecting to call...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-white mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {callSession?.is_emergency && (
              <AlertTriangle className="h-5 w-5 text-red-500" />
            )}
            <h1 className="text-white font-semibold">
              {callSession?.is_emergency ? 'Emergency Call' : 'Call Session'}
            </h1>
          </div>
          
          {/* Connection Quality */}
          <div className={`flex items-center space-x-1 ${getConnectionQualityColor()}`}>
            <div className="w-2 h-2 rounded-full bg-current"></div>
            <span className="text-sm capitalize">{connectionQuality}</span>
          </div>

          {/* Recording Indicator */}
          {isRecording && (
            <div className="flex items-center space-x-1 text-red-500">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              <span className="text-sm">Recording</span>
            </div>
          )}
        </div>

        {/* Call Timer */}
        {callStarted && callSession && (
          <CallTimer
            startTime={callSession.start_time}
            duration={callSession.scheduled_duration}
            onTimeUp={handleCallEnd}
            isEmergency={callSession.is_emergency}
          />
        )}

        {/* Admin/Monitor Badge */}
        {(profile?.role === 'admin' || profile?.role === 'monitor') && (
          <div className="flex items-center space-x-1 text-blue-400">
            <Shield className="h-4 w-4" />
            <span className="text-sm">{profile.role}</span>
          </div>
        )}
      </div>

      {/* Video Area */}
      <div className="flex-1 relative">
        {/* Remote Video */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Local Video */}
        <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        </div>

        {/* Participants Panel */}
        <CallParticipants
          participants={participants}
          currentUserId={user.id}
          className="absolute top-4 left-4"
        />

        {/* No Video Placeholder */}
        {!isVideoEnabled && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            <div className="text-center">
              <div className="w-24 h-24 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">
                  {callSession?.reader?.first_name?.[0] || callSession?.user?.first_name?.[0]}
                </span>
              </div>
              <p className="text-white text-lg">
                {callSession?.reader?.first_name} {callSession?.reader?.last_name}
              </p>
              <p className="text-gray-400">Voice Call</p>
            </div>
          </div>
        )}
      </div>

      {/* Call Controls */}
      <CallControls
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onEndCall={handleCallEnd}
        isConnected={isConnected}
        callType={callSession?.call_type}
        isEmergency={callSession?.is_emergency}
      />
    </div>
  );
};

export default CallRoom; 