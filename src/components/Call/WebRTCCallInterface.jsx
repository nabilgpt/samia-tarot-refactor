import React, { useState, useEffect, useRef } from 'react';
import { 
  PhoneIcon,
  PhoneXMarkIcon,
  VideoCameraIcon,
  VideoCameraSlashIcon,
  MicrophoneIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  CogIcon,
  UserIcon,
  ClockIcon,
  SignalIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import CallRecordingControls from './CallRecordingControls';

const WebRTCCallInterface = ({ 
  callSessionId, 
  isIncoming = false, 
  onCallEnd,
  onCallAccept,
  onCallDecline,
  className = '' 
}) => {
  const { user } = useAuth();
  const [callSession, setCallSession] = useState(null);
  const [callStatus, setCallStatus] = useState('connecting'); // connecting, connected, ended, failed
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState('good');
  const [peerConnection, setPeerConnection] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [deviceList, setDeviceList] = useState({ cameras: [], microphones: [], speakers: [] });
  const [selectedDevices, setSelectedDevices] = useState({
    camera: '',
    microphone: '',
    speaker: ''
  });

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const callStartTimeRef = useRef(null);
  const durationIntervalRef = useRef(null);
  const qualityCheckIntervalRef = useRef(null);

  // WebRTC Configuration
  const rtcConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  useEffect(() => {
    if (callSessionId) {
      loadCallSession();
      setupWebRTC();
    }

    return () => {
      cleanup();
    };
  }, [callSessionId]);

  useEffect(() => {
    if (callStatus === 'connected' && !callStartTimeRef.current) {
      callStartTimeRef.current = Date.now();
      startDurationTimer();
      startQualityMonitoring();
    }
  }, [callStatus]);

  const loadCallSession = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('webrtc_call_sessions')
        .select(`
          *,
          client:profiles!webrtc_call_sessions_client_id_fkey(id, email, display_name),
          reader:profiles!webrtc_call_sessions_reader_id_fkey(id, email, display_name)
        `)
        .eq('id', callSessionId)
        .single();

      if (error) throw error;
      setCallSession(data);

      // Set initial video preference
      setIsVideoEnabled(data.call_type === 'video');

    } catch (error) {
      console.error('Error loading call session:', error);
      setError('Failed to load call session');
    } finally {
      setIsLoading(false);
    }
  };

  const setupWebRTC = async () => {
    try {
      // Get available devices
      await getDeviceList();

      // Create peer connection
      const pc = new RTCPeerConnection(rtcConfiguration);
      setPeerConnection(pc);

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignalingMessage('ice-candidate', event.candidate);
        }
      };

      // Handle remote stream
      pc.ontrack = (event) => {
        const [stream] = event.streams;
        setRemoteStream(stream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log('Connection state:', pc.connectionState);
        switch (pc.connectionState) {
          case 'connected':
            setCallStatus('connected');
            break;
          case 'disconnected':
          case 'failed':
            setCallStatus('failed');
            setError('Connection failed');
            break;
          case 'closed':
            setCallStatus('ended');
            break;
        }
      };

      // Get user media
      if (!isIncoming) {
        await getUserMedia();
      }

      // Listen for signaling messages
      setupSignalingListener();

    } catch (error) {
      console.error('Error setting up WebRTC:', error);
      setError('Failed to setup call');
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

      // Add tracks to peer connection
      if (peerConnection) {
        stream.getTracks().forEach(track => {
          peerConnection.addTrack(track, stream);
        });
      }

      // Update device capabilities
      await updateDeviceCapabilities(stream);

    } catch (error) {
      console.error('Error getting user media:', error);
      setError('Failed to access camera/microphone');
    }
  };

  const getDeviceList = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(device => device.kind === 'videoinput');
      const microphones = devices.filter(device => device.kind === 'audioinput');
      const speakers = devices.filter(device => device.kind === 'audiooutput');

      setDeviceList({ cameras, microphones, speakers });

      // Set default devices
      if (cameras.length > 0 && !selectedDevices.camera) {
        setSelectedDevices(prev => ({ ...prev, camera: cameras[0].deviceId }));
      }
      if (microphones.length > 0 && !selectedDevices.microphone) {
        setSelectedDevices(prev => ({ ...prev, microphone: microphones[0].deviceId }));
      }

    } catch (error) {
      console.error('Error getting device list:', error);
    }
  };

  const updateDeviceCapabilities = async (stream) => {
    try {
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];

      const capabilities = {
        has_camera: !!videoTrack,
        has_microphone: !!audioTrack,
        browser_name: navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Other',
        os_name: navigator.platform,
        supported_codecs: ['VP8', 'VP9', 'H264'], // Default supported codecs
        max_resolution: videoTrack ? '1280x720' : null,
        webrtc_version: 'WebRTC 1.0'
      };

      await supabase
        .from('webrtc_device_capabilities')
        .upsert({
          user_id: user.id,
          call_session_id: callSessionId,
          ...capabilities
        });

    } catch (error) {
      console.error('Error updating device capabilities:', error);
    }
  };

  const setupSignalingListener = () => {
    const channel = supabase
      .channel(`webrtc_signaling_${callSessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'webrtc_signaling',
        filter: `call_session_id=eq.${callSessionId}`
      }, (payload) => {
        handleSignalingMessage(payload.new);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendSignalingMessage = async (type, data) => {
    try {
      await supabase
        .from('webrtc_signaling')
        .insert({
          call_session_id: callSessionId,
          sender_id: user.id,
          receiver_id: callSession?.client_id === user.id ? callSession?.reader_id : callSession?.client_id,
          message_type: type,
          message_data: data,
          sent_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error sending signaling message:', error);
    }
  };

  const handleSignalingMessage = async (message) => {
    if (message.sender_id === user.id) return; // Ignore own messages

    try {
      switch (message.message_type) {
        case 'offer':
          await handleOffer(message.message_data);
          break;
        case 'answer':
          await handleAnswer(message.message_data);
          break;
        case 'ice-candidate':
          await handleIceCandidate(message.message_data);
          break;
      }

      // Mark message as delivered
      await supabase
        .from('webrtc_signaling')
        .update({ delivered_at: new Date().toISOString() })
        .eq('id', message.id);

    } catch (error) {
      console.error('Error handling signaling message:', error);
    }
  };

  const handleOffer = async (offer) => {
    if (!peerConnection) return;

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    
    // Get user media for incoming call
    await getUserMedia();
    
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    
    await sendSignalingMessage('answer', answer);
  };

  const handleAnswer = async (answer) => {
    if (!peerConnection) return;
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  };

  const handleIceCandidate = async (candidate) => {
    if (!peerConnection) return;
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  };

  const startCall = async () => {
    try {
      if (!peerConnection || !localStream) return;

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      await sendSignalingMessage('offer', offer);
      
      // Update call session status
      await supabase
        .from('webrtc_call_sessions')
        .update({
          connection_status: 'connecting',
          session_started_at: new Date().toISOString()
        })
        .eq('id', callSessionId);

    } catch (error) {
      console.error('Error starting call:', error);
      setError('Failed to start call');
    }
  };

  const acceptCall = async () => {
    try {
      await getUserMedia();
      setCallStatus('connecting');
      onCallAccept?.(callSessionId);
    } catch (error) {
      console.error('Error accepting call:', error);
      setError('Failed to accept call');
    }
  };

  const declineCall = async () => {
    try {
      await supabase
        .from('webrtc_call_sessions')
        .update({
          connection_status: 'ended',
          session_ended_at: new Date().toISOString(),
          end_reason: 'declined'
        })
        .eq('id', callSessionId);

      onCallDecline?.(callSessionId);
      cleanup();
    } catch (error) {
      console.error('Error declining call:', error);
    }
  };

  const endCall = async () => {
    try {
      await supabase
        .from('webrtc_call_sessions')
        .update({
          connection_status: 'ended',
          session_ended_at: new Date().toISOString(),
          total_duration_seconds: callDuration,
          end_reason: 'user_ended'
        })
        .eq('id', callSessionId);

      onCallEnd?.(callSessionId);
      cleanup();
    } catch (error) {
      console.error('Error ending call:', error);
    }
  };

  const toggleVideo = async () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoEnabled;
        setIsVideoEnabled(!isVideoEnabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isMuted;
        setIsMuted(!isMuted);
      }
    }
  };

  const startDurationTimer = () => {
    durationIntervalRef.current = setInterval(() => {
      if (callStartTimeRef.current) {
        const duration = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
        setCallDuration(duration);
      }
    }, 1000);
  };

  const startQualityMonitoring = () => {
    qualityCheckIntervalRef.current = setInterval(async () => {
      if (peerConnection) {
        const stats = await peerConnection.getStats();
        // Process stats and update quality metrics
        // This is a simplified version - real implementation would analyze RTCStats
        logQualityMetrics(stats);
      }
    }, 5000);
  };

  const logQualityMetrics = async (stats) => {
    try {
      // Extract quality metrics from WebRTC stats
      let audioPacketsLost = 0;
      let videoPacketsLost = 0;
      let audioLatency = 0;
      let videoLatency = 0;

      stats.forEach(report => {
        if (report.type === 'inbound-rtp') {
          if (report.kind === 'audio') {
            audioPacketsLost = report.packetsLost || 0;
          } else if (report.kind === 'video') {
            videoPacketsLost = report.packetsLost || 0;
          }
        }
      });

      await supabase
        .from('webrtc_quality_logs')
        .insert({
          call_session_id: callSessionId,
          user_id: user.id,
          audio_packets_lost: audioPacketsLost,
          video_packets_lost: videoPacketsLost,
          audio_latency_ms: audioLatency,
          video_latency_ms: videoLatency,
          connection_quality_score: audioPacketsLost + videoPacketsLost < 10 ? 95 : 70,
          logged_at: new Date().toISOString()
        });

      // Update connection quality indicator
      const totalPacketsLost = audioPacketsLost + videoPacketsLost;
      if (totalPacketsLost < 5) {
        setConnectionQuality('excellent');
      } else if (totalPacketsLost < 15) {
        setConnectionQuality('good');
      } else if (totalPacketsLost < 30) {
        setConnectionQuality('fair');
      } else {
        setConnectionQuality('poor');
      }

    } catch (error) {
      console.error('Error logging quality metrics:', error);
    }
  };

  const cleanup = () => {
    // Stop all timers
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    if (qualityCheckIntervalRef.current) {
      clearInterval(qualityCheckIntervalRef.current);
    }

    // Stop media streams
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }

    // Close peer connection
    if (peerConnection) {
      peerConnection.close();
    }

    setCallStatus('ended');
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getQualityColor = (quality) => {
    switch (quality) {
      case 'excellent': return 'text-green-400';
      case 'good': return 'text-blue-400';
      case 'fair': return 'text-yellow-400';
      case 'poor': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-lg p-8 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
          <span className="ml-3 text-purple-300">Loading call...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-900/20 border border-red-500/30 rounded-lg p-6 ${className}`}>
        <div className="flex items-center gap-3">
          <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
          <div>
            <h3 className="text-red-400 font-medium">Call Error</h3>
            <p className="text-red-300 text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-lg overflow-hidden ${className}`}>
      {/* Call Header */}
      <div className="p-4 border-b border-purple-500/30 bg-gray-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold">
                {callSession?.client_id === user.id ? callSession?.reader?.display_name : callSession?.client?.display_name || 'Unknown User'}
              </h3>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-purple-300">{callStatus}</span>
                {callStatus === 'connected' && (
                  <>
                    <span className="text-gray-400">•</span>
                    <ClockIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300">{formatDuration(callDuration)}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Connection Quality */}
            <div className={`flex items-center gap-1 ${getQualityColor(connectionQuality)}`}>
              <SignalIcon className="w-4 h-4" />
              <span className="text-xs capitalize">{connectionQuality}</span>
            </div>

            {/* Settings */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <CogIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Video Area */}
      <div className="relative bg-black aspect-video">
        {/* Remote Video */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Local Video (Picture-in-Picture) */}
        {isVideoEnabled && (
          <div className="absolute top-4 right-4 w-32 h-24 bg-gray-800 rounded-lg overflow-hidden border-2 border-purple-500/50">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Call Status Overlay */}
        {callStatus !== 'connected' && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <div className="text-center">
              {callStatus === 'connecting' && (
                <>
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
                  <p className="text-white text-lg">Connecting...</p>
                </>
              )}
              
              {isIncoming && callStatus === 'ringing' && (
                <div className="space-y-4">
                  <p className="text-white text-lg">Incoming Call</p>
                  <div className="flex gap-4">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={acceptCall}
                      className="w-16 h-16 bg-green-600 hover:bg-green-700 rounded-full flex items-center justify-center text-white"
                    >
                      <PhoneIcon className="w-8 h-8" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={declineCall}
                      className="w-16 h-16 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center text-white"
                    >
                      <PhoneXMarkIcon className="w-8 h-8" />
                    </motion.button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Call Controls */}
      <div className="p-4 bg-gray-900/50">
        <div className="flex items-center justify-center gap-4">
          {/* Mute/Unmute */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleAudio}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
              isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-700'
            } text-white`}
          >
            {isMuted ? (
              <SpeakerXMarkIcon className="w-6 h-6" />
            ) : (
              <MicrophoneIcon className="w-6 h-6" />
            )}
          </motion.button>

          {/* Video Toggle */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleVideo}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
              !isVideoEnabled ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-700'
            } text-white`}
          >
            {isVideoEnabled ? (
              <VideoCameraIcon className="w-6 h-6" />
            ) : (
              <VideoCameraSlashIcon className="w-6 h-6" />
            )}
          </motion.button>

          {/* End Call */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={endCall}
            className="w-12 h-12 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center text-white transition-colors"
          >
            <PhoneXMarkIcon className="w-6 h-6" />
          </motion.button>

          {/* Start Call (for outgoing) */}
          {!isIncoming && callStatus === 'connecting' && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={startCall}
              className="w-12 h-12 bg-green-600 hover:bg-green-700 rounded-full flex items-center justify-center text-white transition-colors"
            >
              <PhoneIcon className="w-6 h-6" />
            </motion.button>
          )}
        </div>
      </div>

      {/* Recording Controls */}
      {callStatus === 'connected' && (
        <div className="border-t border-purple-500/30">
          <CallRecordingControls
            callId={callSessionId}
            callType="webrtc"
            className="m-4"
          />
        </div>
      )}
    </div>
  );
};

export default WebRTCCallInterface; 