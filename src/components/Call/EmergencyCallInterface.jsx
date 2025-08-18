import React, { useState, useEffect, useRef } from 'react';
import { 
  MicrophoneIcon, 
  VideoCameraIcon, 
  PhoneXMarkIcon,
  PlayIcon,
  StopIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ExclamationTriangleIcon,
  ClockIcon
} from '@heroicons/react/24/solid';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

const EmergencyCallInterface = ({ 
  emergencyCallId, 
  callSessionId, 
  callType, 
  isClient = true,
  onCallEnd 
}) => {
  const { user } = useAuth();
  const [callState, setCallState] = useState('connecting'); // connecting, active, ended
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState('');
  
  // UI Controls
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(callType === 'video' && isClient);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [showControls, setShowControls] = useState(true);

  // Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const callStartTime = useRef(null);
  const durationInterval = useRef(null);

  // WebRTC Configuration
  const rtcConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  useEffect(() => {
    initializeCall();
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (callState === 'active' && !callStartTime.current) {
      callStartTime.current = Date.now();
      startDurationTimer();
    }
  }, [callState]);

  const initializeCall = async () => {
    try {
      // Get user media based on call type
      const constraints = {
        audio: true,
        video: callType === 'video' && isClient ? isCameraOn : false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Initialize peer connection
      const pc = new RTCPeerConnection(rtcConfiguration);
      setPeerConnection(pc);

      // Add local stream to peer connection
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

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          // Send ICE candidate to remote peer via signaling server
          sendSignalingMessage({
            type: 'ice-candidate',
            candidate: event.candidate,
            callSessionId
          });
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log('Connection state:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          setCallState('active');
          startRecordingIfEnabled();
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          setCallState('ended');
          handleCallEnd();
        }
      };

      // Set up signaling for WebRTC
      setupSignaling(pc);

      // Start call session
      await startCallSession();

    } catch (err) {
      console.error('Error initializing call:', err);
      setError('Failed to initialize call. Please check your camera and microphone permissions.');
    }
  };

  const setupSignaling = (pc) => {
    // Subscribe to real-time signaling messages
    const signaling = supabase
      .channel(`call_signaling_${callSessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'call_signaling',
        filter: `call_session_id=eq.${callSessionId}`
      }, async (payload) => {
        const message = payload.new;
        
        switch (message.signal_type) {
          case 'offer':
            await handleOffer(pc, message.signal_data);
            break;
          case 'answer':
            await handleAnswer(pc, message.signal_data);
            break;
          case 'ice-candidate':
            await handleIceCandidate(pc, message.signal_data);
            break;
        }
      })
      .subscribe();

    return () => {
      signaling.unsubscribe();
    };
  };

  const sendSignalingMessage = async (message) => {
    try {
      await supabase
        .from('call_signaling')
        .insert({
          call_session_id: callSessionId,
          signal_type: message.type,
          signal_data: message,
          sender_id: user.id
        });
    } catch (err) {
      console.error('Error sending signaling message:', err);
    }
  };

  const handleOffer = async (pc, offer) => {
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      sendSignalingMessage({
        type: 'answer',
        answer: answer
      });
    } catch (err) {
      console.error('Error handling offer:', err);
    }
  };

  const handleAnswer = async (pc, answer) => {
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (err) {
      console.error('Error handling answer:', err);
    }
  };

  const handleIceCandidate = async (pc, candidate) => {
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error('Error handling ICE candidate:', err);
    }
  };

  const startCallSession = async () => {
    try {
      const response = await fetch(`/api/emergency-calls/session/${callSessionId}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to start call session');
      }

      const result = await response.json();
      
      if (result.data.recording_enabled) {
        setIsRecording(true);
      }
    } catch (err) {
      console.error('Error starting call session:', err);
      setError('Failed to start call session');
    }
  };

  const startRecordingIfEnabled = async () => {
    // Recording is handled server-side for emergency calls
    // This just updates the UI state
    setIsRecording(true);
  };

  const startDurationTimer = () => {
    durationInterval.current = setInterval(() => {
      if (callStartTime.current) {
        const elapsed = Math.floor((Date.now() - callStartTime.current) / 1000);
        setCallDuration(elapsed);
      }
    }, 1000);
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleCamera = () => {
    if (localStream && callType === 'video' && isClient) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
      }
    }
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    // Note: Speaker control is limited in web browsers
    // This is mainly for UI feedback
  };

  const handleCallEnd = async () => {
    try {
      const duration = Math.floor(callDuration / 60); // Convert to minutes
      
      const response = await fetch(`/api/emergency-calls/session/${callSessionId}/end`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          duration_minutes: duration
        })
      });

      if (!response.ok) {
        throw new Error('Failed to end call session');
      }

      cleanup();
      onCallEnd?.(duration);
    } catch (err) {
      console.error('Error ending call:', err);
      cleanup();
      onCallEnd?.(0);
    }
  };

  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnection) {
      peerConnection.close();
    }
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
    }
    setCallState('ended');
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (callState === 'ended') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Call Ended</h2>
          <p className="text-gray-300 mb-4">Duration: {formatDuration(callDuration)}</p>
          <p className="text-gray-400">Thank you for using our emergency service.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gray-900 overflow-hidden">
      {/* Emergency Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-red-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-6 h-6 mr-2 animate-pulse" />
            <span className="font-bold">EMERGENCY CALL</span>
            {isRecording && (
              <div className="ml-4 flex items-center">
                <div className="w-3 h-3 bg-red-300 rounded-full animate-pulse mr-2"></div>
                <span className="text-sm">Recording</span>
              </div>
            )}
          </div>
          <div className="flex items-center">
            <ClockIcon className="w-5 h-5 mr-2" />
            <span className="font-mono text-lg">{formatDuration(callDuration)}</span>
          </div>
        </div>
      </div>

      {/* Video Container */}
      <div className="relative w-full h-screen pt-16">
        {/* Remote Video (Main) */}
        {callType === 'video' && (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
        )}

        {/* Audio-only placeholder */}
        {callType === 'audio' && (
          <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-purple-900 to-indigo-900">
            <div className="text-center">
              <div className="w-32 h-32 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <MicrophoneIcon className="w-16 h-16 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Audio Call</h3>
              <p className="text-gray-300">Emergency consultation in progress</p>
            </div>
          </div>
        )}

        {/* Local Video (Picture-in-Picture) */}
        {callType === 'video' && isClient && (
          <div className="absolute top-20 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-purple-500">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
            {!isCameraOn && (
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                <VideoCameraIcon className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </div>
        )}

        {/* Call Status Overlay */}
        {callState === 'connecting' && (
          <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
              <h3 className="text-xl font-bold text-white mb-2">Connecting...</h3>
              <p className="text-gray-300">Please wait while we establish the connection</p>
            </div>
          </div>
        )}

        {/* Error Overlay */}
        {error && (
          <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
            <div className="text-center max-w-md mx-auto p-6">
              <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Connection Error</h3>
              <p className="text-gray-300 mb-4">{error}</p>
              <button
                onClick={handleCallEnd}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg"
              >
                End Call
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Call Controls */}
      {showControls && callState === 'active' && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-6">
          <div className="flex items-center justify-center space-x-4">
            {/* Mute Button */}
            <button
              onClick={toggleMute}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 ${
                isMuted 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              <MicrophoneIcon 
                className={`w-6 h-6 ${isMuted ? 'text-white' : 'text-gray-300'}`} 
              />
            </button>

            {/* Camera Button (Client only for video calls) */}
            {callType === 'video' && isClient && (
              <button
                onClick={toggleCamera}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 ${
                  !isCameraOn 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                <VideoCameraIcon 
                  className={`w-6 h-6 ${!isCameraOn ? 'text-white' : 'text-gray-300'}`} 
                />
              </button>
            )}

            {/* Speaker Button */}
            <button
              onClick={toggleSpeaker}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 ${
                !isSpeakerOn 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {isSpeakerOn ? (
                <SpeakerWaveIcon className="w-6 h-6 text-gray-300" />
              ) : (
                <SpeakerXMarkIcon className="w-6 h-6 text-white" />
              )}
            </button>

            {/* End Call Button */}
            <button
              onClick={handleCallEnd}
              className="w-16 h-16 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center transition-all duration-200 transform hover:scale-105"
            >
              <PhoneXMarkIcon className="w-8 h-8 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Hide/Show Controls Toggle */}
      <button
        onClick={() => setShowControls(!showControls)}
        className="absolute top-20 left-4 bg-black bg-opacity-50 text-white p-2 rounded-lg"
      >
        {showControls ? 'Hide' : 'Show'} Controls
      </button>
    </div>
  );
};

export default EmergencyCallInterface; 