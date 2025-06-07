// SAMIA TAROT API Test Script
// =============================================================================

const axios = require('axios');

const baseURL = 'http://localhost:5000';

async function testAPI() {
  console.log('🔮 Testing SAMIA TAROT API...\n');
  
  const tests = [
    {
      name: 'Health Check',
      url: '/health',
      method: 'get'
    },
    {
      name: 'API Info',
      url: '/api',
      method: 'get'
    },
    {
      name: 'Tarot Test',
      url: '/api/tarot/test',
      method: 'get'
    },
    {
      name: 'Tarot Cards',
      url: '/api/tarot/cards',
      method: 'get'
    },
    {
      name: 'Tarot Spreads',
      url: '/api/tarot/spreads',
      method: 'get'
    }
  ];
  
  for (const test of tests) {
    try {
      console.log(`Testing ${test.name}...`);
      const response = await axios({
        method: test.method,
        url: `${baseURL}${test.url}`,
        timeout: 5000
      });
      
      console.log(`✅ ${test.name}: ${response.status} - ${response.statusText}`);
      
      if (test.url === '/health' && response.data) {
        console.log(`   Database: ${response.data.services?.database || 'unknown'}`);
      }
      
    } catch (error) {
      if (error.response) {
        console.log(`❌ ${test.name}: ${error.response.status} - ${error.response.statusText}`);
      } else {
        console.log(`❌ ${test.name}: ${error.message}`);
      }
    }
    console.log('');
  }
  
  console.log('🎯 API Test Complete!\n');
}

// Run the test
testAPI().catch(console.error); 