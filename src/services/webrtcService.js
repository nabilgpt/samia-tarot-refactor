/**
 * 🎥 WebRTC Configuration Service
 * Centralized WebRTC configuration and utilities
 */

export class WebRTCService {
  static getConfiguration() {
    const config = {
      iceServers: [
        // Google STUN servers
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        
        // Additional STUN servers for better connectivity
        { urls: 'stun:stun.stunprotocol.org:3478' },
        { urls: 'stun:stun.voiparound.com' },
        { urls: 'stun:stun.voipbuster.com' }
      ],
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
      iceTransportPolicy: 'all'
    };

    // Add custom TURN servers if configured
    if (import.meta.env.VITE_TURN_SERVER_URL) {
      config.iceServers.push({
        urls: import.meta.env.VITE_TURN_SERVER_URL,
        username: import.meta.env.VITE_TURN_SERVER_USERNAME,
        credential: import.meta.env.VITE_TURN_SERVER_CREDENTIAL
      });
    }

    // Add Agora TURN servers if configured
    if (import.meta.env.VITE_AGORA_APP_ID) {
      // Agora provides TURN servers through their SDK
      console.log('Agora WebRTC configuration available');
    }

    // Add Twilio TURN servers if configured
    if (import.meta.env.TWILIO_ACCOUNT_SID) {
      // Twilio provides TURN servers through their API
      console.log('Twilio WebRTC configuration available');
    }

    return config;
  }

  static async testConnectivity() {
    try {
      const config = this.getConfiguration();
      const pc = new RTCPeerConnection(config);
      
      // Test ICE gathering
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          pc.close();
          reject(new Error('ICE gathering timeout'));
        }, 10000);

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            console.log('ICE candidate:', event.candidate.type, event.candidate.address);
          }
        };

        pc.onicegatheringstatechange = () => {
          if (pc.iceGatheringState === 'complete') {
            clearTimeout(timeout);
            pc.close();
            resolve(true);
          }
        };

        // Create a data channel to trigger ICE gathering
        pc.createDataChannel('test');
        pc.createOffer().then(offer => pc.setLocalDescription(offer));
      });
    } catch (error) {
      console.error('WebRTC connectivity test failed:', error);
      return false;
    }
  }

  static getMediaConstraints(isVideo = false) {
    return {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 44100
      },
      video: isVideo ? {
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        frameRate: { ideal: 30, max: 60 },
        facingMode: 'user'
      } : false
    };
  }

  static async getUserMedia(isVideo = false) {
    try {
      const constraints = this.getMediaConstraints(isVideo);
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      console.error('Failed to get user media:', error);
      throw error;
    }
  }

  static checkWebRTCSupport() {
    const support = {
      webrtc: !!window.RTCPeerConnection,
      getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      dataChannels: !!window.RTCDataChannel,
      webAudio: !!(window.AudioContext || window.webkitAudioContext)
    };

    const isSupported = Object.values(support).every(Boolean);
    
    return {
      supported: isSupported,
      features: support,
      recommendations: isSupported ? [] : this.getCompatibilityRecommendations(support)
    };
  }

  static getCompatibilityRecommendations(support) {
    const recommendations = [];
    
    if (!support.webrtc) {
      recommendations.push('Update your browser to a version that supports WebRTC');
    }
    
    if (!support.getUserMedia) {
      recommendations.push('Enable camera and microphone permissions');
    }
    
    if (!support.dataChannels) {
      recommendations.push('Update your browser for data channel support');
    }
    
    if (!support.webAudio) {
      recommendations.push('Update your browser for Web Audio API support');
    }
    
    return recommendations;
  }
}

export default WebRTCService;
