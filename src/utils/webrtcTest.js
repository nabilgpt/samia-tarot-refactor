/**
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
    console.log('\n📊 WebRTC Test Report:');
    console.log('═══════════════════════');
    
    console.log('🌐 Browser Support:');
    console.log('  WebRTC:', results.browserSupport.features.webrtc ? '✅' : '❌');
    console.log('  getUserMedia:', results.browserSupport.features.getUserMedia ? '✅' : '❌');
    console.log('  Data Channels:', results.browserSupport.features.dataChannels ? '✅' : '❌');
    console.log('  Web Audio:', results.browserSupport.features.webAudio ? '✅' : '❌');
    
    console.log('\n🔗 Connectivity:');
    console.log('  ICE Gathering:', results.iceGathering ? '✅' : '❌');
    console.log('  Media Access:', results.mediaAccess ? '✅' : '❌');
    
    if (results.errors.length > 0) {
      console.log('\n❌ Errors:');
      results.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }

    if (!results.browserSupport.supported) {
      console.log('\n💡 Recommendations:');
      results.browserSupport.recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`);
      });
    }

    const overallScore = [
      results.browserSupport.supported,
      results.iceGathering,
      results.mediaAccess
    ].filter(Boolean).length;

    console.log(`\n📈 Overall Score: ${overallScore}/3`);
    
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
