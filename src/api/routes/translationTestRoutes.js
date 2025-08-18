import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { unifiedTranslationService } from '../services/dynamicTranslationService.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { makeOpenAICall, getOpenAICredentials } from '../services/openai.js';

const router = express.Router();

// =====================================================
// TRANSLATION PROVIDERS SANITY TEST ENDPOINT
// Tests all configured providers with real API calls
// =====================================================

router.post('/test-all', authenticateToken, async (req, res) => {
  console.log('\n🔍 [TRANSLATION TEST] ==========================================');
  console.log('🔍 [TRANSLATION TEST] Starting comprehensive provider testing...');
  console.log('🔍 [TRANSLATION TEST] ==========================================\n');

  const testReport = {
    timestamp: new Date().toISOString(),
    overallStatus: 'pending',
    providers: [],
    summary: {
      total: 0,
      successful: 0,
      failed: 0
    },
    configSource: 'dashboard', // Not .env!
    testPhrase: {
      en: "This is a live translation test",
      ar: "هذا اختبار ترجمة مباشر"
    }
  };

  try {
    // =====================================================
    // STEP 1: Load Configuration from Dashboard (Not .env!)
    // =====================================================
    console.log('📋 [TRANSLATION TEST] Step 1: Loading configuration from dashboard...');
    
    const settings = await unifiedTranslationService.getTranslationSettings();
    console.log('✅ [TRANSLATION TEST] Dashboard settings loaded:', {
      translationEnabled: settings.translationEnabled,
      defaultProvider: settings.defaultProvider,
      fallbackToCopy: settings.fallbackToCopy
    });

    if (!settings.translationEnabled) {
      const msg = 'Translation is disabled in dashboard settings';
      console.log('⚠️ [TRANSLATION TEST]', msg);
      testReport.overallStatus = 'disabled';
      testReport.message = msg;
      return res.json(testReport);
    }

    // =====================================================
    // STEP 2: Load AI Providers from Dashboard
    // =====================================================
    console.log('\n📋 [TRANSLATION TEST] Step 2: Loading AI providers configuration...');
    
    const { data: aiProviders, error: providersError } = await supabaseAdmin
      .from('ai_providers')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (providersError) {
      throw new Error(`Failed to load AI providers: ${providersError.message}`);
    }

    console.log(`✅ [TRANSLATION TEST] Found ${aiProviders?.length || 0} active providers`);
    aiProviders?.forEach(provider => {
      console.log(`  - ${provider.name} (${provider.provider_type}): ${provider.is_active ? 'ACTIVE' : 'INACTIVE'}`);
    });

    // =====================================================
    // STEP 3: Test Each Provider with Real API Calls
    // =====================================================
    console.log('\n🧪 [TRANSLATION TEST] Step 3: Testing providers with real API calls...\n');

    // Test OpenAI Provider
    if (aiProviders?.some(p => p.name === 'openai' && p.is_active)) {
      await testOpenAIProvider(testReport);
    } else {
      console.log('⚠️ [TRANSLATION TEST] OpenAI provider not found or inactive');
      testReport.providers.push({
        provider: 'openai',
        status: 'not_configured',
        error: 'Provider not found or inactive in dashboard',
        usedConfig: null
      });
    }

    // Test Google Translate Provider (if implemented)
    if (aiProviders?.some(p => p.name === 'google' && p.is_active)) {
      await testGoogleProvider(testReport);
    } else {
      console.log('⚠️ [TRANSLATION TEST] Google provider not found or inactive');
      testReport.providers.push({
        provider: 'google',
        status: 'not_implemented',
        error: 'Provider not implemented yet',
        usedConfig: null
      });
    }

    // =====================================================
    // STEP 4: Calculate Summary
    // =====================================================
    testReport.summary.total = testReport.providers.length;
    testReport.summary.successful = testReport.providers.filter(p => p.status === 'success').length;
    testReport.summary.failed = testReport.providers.filter(p => p.status === 'failed').length;
    
    if (testReport.summary.successful > 0) {
      testReport.overallStatus = testReport.summary.failed === 0 ? 'all_success' : 'partial_success';
    } else {
      testReport.overallStatus = 'all_failed';
    }

    console.log('\n📊 [TRANSLATION TEST] ==========================================');
    console.log('📊 [TRANSLATION TEST] FINAL SUMMARY:');
    console.log(`📊 [TRANSLATION TEST] Total Providers: ${testReport.summary.total}`);
    console.log(`📊 [TRANSLATION TEST] Successful: ${testReport.summary.successful}`);
    console.log(`📊 [TRANSLATION TEST] Failed: ${testReport.summary.failed}`);
    console.log(`📊 [TRANSLATION TEST] Overall Status: ${testReport.overallStatus.toUpperCase()}`);
    console.log('📊 [TRANSLATION TEST] ==========================================\n');

    res.json(testReport);

  } catch (error) {
    console.error('❌ [TRANSLATION TEST] Fatal error:', error);
    testReport.overallStatus = 'error';
    testReport.error = error.message;
    res.status(500).json(testReport);
  }
});

// =====================================================
// OPENAI PROVIDER TEST FUNCTION
// =====================================================
async function testOpenAIProvider(testReport) {
  const startTime = Date.now();
  const providerTest = {
    provider: 'openai',
    status: 'pending',
    usedConfig: null,
    tests: {},
    durationMs: 0,
    error: null
  };

  try {
    console.log('🤖 [TRANSLATION TEST] Testing OpenAI provider...');

    // Load OpenAI credentials from dashboard
    const credentials = await getOpenAICredentials();
    if (!credentials || !credentials.apiKey) {
      throw new Error('OpenAI API key not configured in dashboard');
    }

    providerTest.usedConfig = {
      apiKeyMasked: credentials.apiKey.substring(0, 8) + '****',
      baseURL: credentials.baseURL || 'https://api.openai.com/v1',
      model: credentials.model || 'gpt-3.5-turbo',
      configSource: 'dashboard'
    };

    console.log('✅ [TRANSLATION TEST] OpenAI config loaded:', providerTest.usedConfig);

    // Test EN → AR Translation
    console.log('🔄 [TRANSLATION TEST] Testing EN → AR translation...');
    const enToArResult = await unifiedTranslationService.translateText(
      testReport.testPhrase.en,
      'ar',
      'en',
      { entityType: 'test', source: 'sanity_check' }
    );

    if (enToArResult && enToArResult.trim() !== '') {
      providerTest.tests.en_to_ar = {
        input: testReport.testPhrase.en,
        output: enToArResult,
        status: 'success'
      };
      console.log(`✅ [TRANSLATION TEST] EN → AR Success: "${enToArResult}"`);
    } else {
      throw new Error('EN → AR translation returned empty result');
    }

    // Test AR → EN Translation
    console.log('🔄 [TRANSLATION TEST] Testing AR → EN translation...');
    const arToEnResult = await unifiedTranslationService.translateText(
      testReport.testPhrase.ar,
      'en',
      'ar',
      { entityType: 'test', source: 'sanity_check' }
    );

    if (arToEnResult && arToEnResult.trim() !== '') {
      providerTest.tests.ar_to_en = {
        input: testReport.testPhrase.ar,
        output: arToEnResult,
        status: 'success'
      };
      console.log(`✅ [TRANSLATION TEST] AR → EN Success: "${arToEnResult}"`);
    } else {
      throw new Error('AR → EN translation returned empty result');
    }

    providerTest.status = 'success';
    console.log('🎉 [TRANSLATION TEST] OpenAI provider test PASSED!');

  } catch (error) {
    providerTest.status = 'failed';
    providerTest.error = error.message;
    console.error('❌ [TRANSLATION TEST] OpenAI provider test FAILED:', error.message);
  }

  providerTest.durationMs = Date.now() - startTime;
  testReport.providers.push(providerTest);
}

// =====================================================
// GOOGLE PROVIDER TEST FUNCTION
// =====================================================
async function testGoogleProvider(testReport) {
  const providerTest = {
    provider: 'google',
    status: 'not_implemented',
    usedConfig: null,
    tests: {},
    durationMs: 0,
    error: 'Google Translate provider not yet implemented'
  };

  console.log('⚠️ [TRANSLATION TEST] Google Translate provider not implemented yet');
  testReport.providers.push(providerTest);
}

export default router; 