#!/usr/bin/env node

/**
 * 🎥 SAMIA TAROT - WebRTC Configuration Fix
 * Sets up proper WebRTC configuration for video calls
 */

import fs from 'fs';
import path from 'path';

class WebRTCConfigFixer {
  constructor() {
    this.configUpdates = [];
    this.errors = [];
  }

  async fixWebRTCConfiguration() {
    console.log('🎥 SAMIA TAROT - WebRTC Configuration Fix');
    console.log('═══════════════════════════════════════════\n');

    try {
      // 1. Update CallRoom component with better WebRTC config
      await this.updateCallRoomComponent();
      
      // 2. Create WebRTC configuration service
      await this.createWebRTCConfigService();
      
      // 3. Update environment variables documentation
      await this.updateEnvironmentDocs();
      
      // 4. Create WebRTC test utility
      await this.createWebRTCTestUtility();

      this.generateReport();

    } catch (error) {
      console.error('💥 WebRTC configuration fix failed:', error);
      throw error;
    }
  }

  async updateCallRoomComponent() {
    console.log('🔧 1. Updating CallRoom component...');
    
    try {
      const callRoomPath = 'src/components/Call/CallRoom.jsx';
      
      if (fs.existsSync(callRoomPath)) {
        let content = fs.readFileSync(callRoomPath, 'utf8');
        
        // Check if WebRTC config needs updating
        if (!content.includes('getWebRTCConfiguration')) {
          console.log('   ⚠️  Adding WebRTC configuration method...');
          
          // Add WebRTC configuration method
          const webrtcConfigMethod = `
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
`;

          // Insert the method before the initializePeerJS function
          content = content.replace(
            'const initializePeerJS = async () => {',
            webrtcConfigMethod + '\n  const initializePeerJS = async () => {'
          );

          // Update PeerJS configuration to use the new method
          content = content.replace(
            /config: \{[^}]+\}/,
            'config: getWebRTCConfiguration()'
          );

          fs.writeFileSync(callRoomPath, content);
          console.log('   ✅ CallRoom component updated with enhanced WebRTC config');
          this.configUpdates.push('CallRoom component WebRTC configuration');
        } else {
          console.log('   ✅ CallRoom component already has WebRTC configuration');
          this.configUpdates.push('CallRoom component (already configured)');
        }
      } else {
        console.log('   ⚠️  CallRoom component not found');
        this.errors.push('CallRoom component missing');
      }

    } catch (error) {
      console.log('   ❌ Failed to update CallRoom component:', error.message);
      this.errors.push('CallRoom component update failed: ' + error.message);
    }
  }

  async createWebRTCConfigService() {
    console.log('🔧 2. Creating WebRTC configuration service...');
    
    try {
      const servicePath = 'src/services/webrtcService.js';
      
      if (!fs.existsSync(servicePath)) {
        const webrtcServiceContent = `/**
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
`;

        fs.writeFileSync(servicePath, webrtcServiceContent);
        console.log('   ✅ WebRTC service created');
        this.configUpdates.push('WebRTC configuration service');
      } else {
        console.log('   ✅ WebRTC service already exists');
        this.configUpdates.push('WebRTC service (already exists)');
      }

    } catch (error) {
      console.log('   ❌ Failed to create WebRTC service:', error.message);
      this.errors.push('WebRTC service creation failed: ' + error.message);
    }
  }

  async updateEnvironmentDocs() {
    console.log('🔧 3. Updating environment documentation...');
    
    try {
      // Add WebRTC environment variables to .env.example
      const envExamplePath = '.env.example';
      
      if (fs.existsSync(envExamplePath)) {
        let content = fs.readFileSync(envExamplePath, 'utf8');
        
        if (!content.includes('VITE_TURN_SERVER_URL')) {
          const webrtcEnvVars = `
# WebRTC Configuration
VITE_TURN_SERVER_URL=turn:your-turn-server.com:3478
VITE_TURN_SERVER_USERNAME=your_turn_username
VITE_TURN_SERVER_CREDENTIAL=your_turn_credential

# Agora WebRTC (Alternative)
VITE_AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_app_certificate

# Twilio WebRTC (Alternative)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
`;

          content += webrtcEnvVars;
          fs.writeFileSync(envExamplePath, content);
          console.log('   ✅ Environment documentation updated');
          this.configUpdates.push('Environment variables documentation');
        } else {
          console.log('   ✅ Environment documentation already includes WebRTC');
          this.configUpdates.push('Environment documentation (already updated)');
        }
      } else {
        console.log('   ⚠️  .env.example file not found');
        this.errors.push('.env.example file missing');
      }

    } catch (error) {
      console.log('   ❌ Failed to update environment docs:', error.message);
      this.errors.push('Environment documentation update failed: ' + error.message);
    }
  }

  async createWebRTCTestUtility() {
    console.log('🔧 4. Creating WebRTC test utility...');
    
    try {
      const testUtilityPath = 'src/utils/webrtcTest.js';
      
      if (!fs.existsSync(testUtilityPath)) {
        const testUtilityContent = `/**
 * 🧪 WebRTC Test Utility
 * Test WebRTC connectivity and configuration
 */

import WebRTCService from '../services/webrtcService.js';

export class WebRTCTester {
  static async runConnectivityTest() {
    console.log('🧪 Running WebRTC connectivity test...');
    
    const results = {
      browserSupport: WebRTCService.checkWebRTCSupport(),
      iceGathering: false,
      mediaAccess: false,
      errors: []
    };

    try {
      // Test ICE gathering
      results.iceGathering = await WebRTCService.testConnectivity();
      console.log('✅ ICE gathering test:', results.iceGathering ? 'PASS' : 'FAIL');
    } catch (error) {
      results.errors.push('ICE gathering failed: ' + error.message);
      console.log('❌ ICE gathering test: FAIL -', error.message);
    }

    try {
      // Test media access
      const stream = await WebRTCService.getUserMedia(false);
      if (stream) {
        results.mediaAccess = true;
        stream.getTracks().forEach(track => track.stop());
        console.log('✅ Media access test: PASS');
      }
    } catch (error) {
      results.errors.push('Media access failed: ' + error.message);
      console.log('❌ Media access test: FAIL -', error.message);
    }

    return results;
  }

  static generateReport(results) {
    console.log('\\n📊 WebRTC Test Report:');
    console.log('═══════════════════════');
    
    console.log('🌐 Browser Support:');
    console.log('  WebRTC:', results.browserSupport.features.webrtc ? '✅' : '❌');
    console.log('  getUserMedia:', results.browserSupport.features.getUserMedia ? '✅' : '❌');
    console.log('  Data Channels:', results.browserSupport.features.dataChannels ? '✅' : '❌');
    console.log('  Web Audio:', results.browserSupport.features.webAudio ? '✅' : '❌');
    
    console.log('\\n🔗 Connectivity:');
    console.log('  ICE Gathering:', results.iceGathering ? '✅' : '❌');
    console.log('  Media Access:', results.mediaAccess ? '✅' : '❌');
    
    if (results.errors.length > 0) {
      console.log('\\n❌ Errors:');
      results.errors.forEach((error, index) => {
        console.log(\`  \${index + 1}. \${error}\`);
      });
    }

    if (!results.browserSupport.supported) {
      console.log('\\n💡 Recommendations:');
      results.browserSupport.recommendations.forEach((rec, index) => {
        console.log(\`  \${index + 1}. \${rec}\`);
      });
    }

    const overallScore = [
      results.browserSupport.supported,
      results.iceGathering,
      results.mediaAccess
    ].filter(Boolean).length;

    console.log(\`\\n📈 Overall Score: \${overallScore}/3\`);
    
    if (overallScore === 3) {
      console.log('🎉 WebRTC is fully functional!');
    } else if (overallScore >= 2) {
      console.log('⚠️  WebRTC is mostly functional with minor issues');
    } else {
      console.log('❌ WebRTC has significant issues that need attention');
    }

    return overallScore;
  }
}

export default WebRTCTester;
`;

        fs.writeFileSync(testUtilityPath, testUtilityContent);
        console.log('   ✅ WebRTC test utility created');
        this.configUpdates.push('WebRTC test utility');
      } else {
        console.log('   ✅ WebRTC test utility already exists');
        this.configUpdates.push('WebRTC test utility (already exists)');
      }

    } catch (error) {
      console.log('   ❌ Failed to create WebRTC test utility:', error.message);
      this.errors.push('WebRTC test utility creation failed: ' + error.message);
    }
  }

  generateReport() {
    console.log('\n🎯 WEBRTC CONFIGURATION REPORT');
    console.log('═══════════════════════════════════════\n');

    console.log('✅ CONFIGURATION UPDATES:');
    console.log('─────────────────────────');
    if (this.configUpdates.length > 0) {
      this.configUpdates.forEach((update, index) => {
        console.log(`${index + 1}. ${update}`);
      });
    } else {
      console.log('No configuration updates were needed.');
    }

    if (this.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      console.log('──────────');
      this.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    console.log('\n📋 NEXT STEPS:');
    console.log('──────────────');
    console.log('1. Configure WebRTC environment variables in .env');
    console.log('2. Test WebRTC connectivity using the test utility');
    console.log('3. Set up TURN servers for production (recommended)');
    console.log('4. Test video calls across different networks');
    console.log('5. Monitor WebRTC connection quality in production');

    console.log('\n💡 PRODUCTION RECOMMENDATIONS:');
    console.log('─────────────────────────────');
    console.log('• Use dedicated TURN servers for better connectivity');
    console.log('• Consider Agora or Twilio for enterprise-grade WebRTC');
    console.log('• Implement connection quality monitoring');
    console.log('• Add fallback mechanisms for poor connections');
    console.log('• Test across different browsers and devices');
  }
}

// Run the WebRTC configuration fix
async function runWebRTCConfigFix() {
  try {
    const fixer = new WebRTCConfigFixer();
    await fixer.fixWebRTCConfiguration();
  } catch (error) {
    console.error('💥 WebRTC configuration fix failed:', error);
    process.exit(1);
  }
}

// Execute the fix
runWebRTCConfigFix(); 