// Test Frontend Status
const axios = require('axios');

async function testFrontend() {
  try {
    console.log('🎨 Testing Frontend on http://localhost:3000...\n');
    
    const response = await axios.get('http://localhost:3000', {
      timeout: 5000,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    
    if (response.status === 200) {
      console.log('✅ Frontend is responding!');
      console.log(`📊 Status: ${response.status}`);
      console.log(`📝 Content-Type: ${response.headers['content-type']}`);
      
      if (response.data.includes('SAMIA TAROT')) {
        console.log('🔮 SAMIA TAROT title found in response!');
      }
      
      if (response.data.includes('tailwind') || response.data.includes('css')) {
        console.log('🎨 CSS appears to be loading!');
      }
      
      console.log('\n✅ Frontend test completed successfully!');
    }
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Frontend is not running on port 3000');
    } else {
      console.log(`❌ Frontend test failed: ${error.message}`);
    }
  }
}

testFrontend(); 