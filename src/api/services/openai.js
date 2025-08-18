// ===============================================
// OPENAI SERVICE CONFIGURATION - SECURE IMPLEMENTATION
// Compliant with ENVIRONMENT_SECURITY_POLICY.md
// All credentials retrieved from Super Admin Dashboard
// ===============================================

import { supabaseAdmin } from '../lib/supabase.js';
import { OpenAI } from 'openai';

// ===============================================
// SECURE CREDENTIAL MANAGEMENT
// ===============================================

/**
 * Get OpenAI API key from Super Admin Dashboard (system_configurations)
 * Compliant with ENVIRONMENT_SECURITY_POLICY.md
 */
async function getOpenAICredentials() {
  try {
    // Get OpenAI API key from dashboard
    const { data: apiKeyConfig, error: keyError } = await supabaseAdmin
      .from('system_configurations')
      .select('config_value_plain, config_value_encrypted, is_encrypted')
      .eq('config_key', 'OPENAI_API_KEY')
      .eq('config_category', 'ai_services')
      .single();

    if (keyError || !apiKeyConfig) {
      throw new Error('OpenAI API key not configured. Please set it in Super Admin Dashboard → System Secrets → AI Services');
    }

    // Get OpenAI Organization ID from dashboard
    const { data: orgConfig, error: orgError } = await supabaseAdmin
      .from('system_configurations')
      .select('config_value_plain, config_value_encrypted, is_encrypted')
      .eq('config_key', 'OPENAI_ORG_ID')
      .eq('config_category', 'ai_services')
      .maybeSingle(); // Optional parameter

    const apiKey = apiKeyConfig.is_encrypted 
      ? apiKeyConfig.config_value_encrypted // TODO: Implement decryption
      : apiKeyConfig.config_value_plain;

    const organization = orgConfig?.is_encrypted
      ? orgConfig.config_value_encrypted // TODO: Implement decryption  
      : orgConfig?.config_value_plain;

    if (!apiKey || apiKey.trim() === '' || apiKey === 'CONFIGURE_VIA_DASHBOARD') {
      throw new Error('OpenAI API key is not configured. Please add it in Super Admin Dashboard → System Secrets → AI Services');
    }

    // Get default model from dashboard
    const { data: modelConfig } = await supabaseAdmin
      .from('system_configurations')
      .select('config_value_plain')
      .eq('config_key', 'OPENAI_DEFAULT_MODEL')
      .eq('config_category', 'ai_services')
      .maybeSingle();

    const model = modelConfig?.config_value_plain || 'gpt-4o';

    return {
      apiKey,
      organization,
      model
    };
  } catch (error) {
    console.error('❌ Error loading OpenAI credentials from dashboard:', error);
    throw new Error(`Failed to load OpenAI credentials: ${error.message}. Please configure them in Super Admin Dashboard → System Secrets → AI Services`);
  }
}

/**
 * Initialize OpenAI client with dashboard credentials
 */
async function createOpenAIClient() {
  const credentials = await getOpenAICredentials();
  
  const config = {
    apiKey: credentials.apiKey
  };

  // Add organization if configured
  if (credentials.organization) {
    config.organization = credentials.organization;
  }

  return new OpenAI(config);
}

/**
 * Get OpenAI configuration (cached for performance)
 */
let configCache = null;
let lastConfigLoad = 0;
const configCacheExpiry = 5 * 60 * 1000; // 5 minutes

async function getOpenAIConfig() {
  const now = Date.now();
  
  if (configCache && (now - lastConfigLoad) < configCacheExpiry) {
    return configCache;
  }

  try {
    const credentials = await getOpenAICredentials();
    configCache = credentials;
    lastConfigLoad = now;
    
    console.log('✅ OpenAI configuration loaded from dashboard');
    return configCache;
  } catch (error) {
    console.error('❌ Failed to load OpenAI configuration:', error);
    throw error;
  }
}

// ===============================================
// OPENAI CLIENT OPERATIONS
// ===============================================

/**
 * Test OpenAI connection using dashboard credentials
 */
async function testOpenAIConnection() {
  try {
    const openai = await createOpenAIClient();
    const config = await getOpenAIConfig();
    
    const response = await openai.chat.completions.create({
      model: config.model,
      messages: [{ role: 'user', content: 'Hello, this is a connection test.' }],
      max_tokens: 10
    });
    
    console.log('✅ OpenAI connection test successful');
    return { success: true, data: response };
  } catch (error) {
    console.error('❌ OpenAI connection test failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Make OpenAI API call with automatic credential management
 */
async function makeOpenAICall(messages, options = {}) {
  try {
    const openai = await createOpenAIClient();
    const config = await getOpenAIConfig();
    
    const {
      model = config.model,
      temperature = 0.7,
      max_tokens = 1000,
      ...otherOptions
    } = options;

    const response = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens,
      ...otherOptions
    });

    return response;
  } catch (error) {
    console.error('❌ OpenAI API call failed:', error);
    throw error;
  }
}

// ===============================================
// TAROT-SPECIFIC PROMPTS
// ===============================================

const tarotPrompts = {
  cardInterpretation: (cardName, position, question) => `
    As a professional tarot reader, provide an insightful interpretation for the ${cardName} card in the ${position} position for the question: "${question}".
    
    Please include:
    1. The core meaning of this card in this position
    2. How it relates to the specific question asked
    3. Practical guidance or advice
    4. Any important symbols or imagery to consider
    
    Keep the response mystical yet grounded, and limit to 150-200 words.
  `,
  
  fullReading: (cards, spread, question) => `
    Provide a comprehensive tarot reading for the following spread:
    
    Question: ${question}
    Spread Type: ${spread}
    Cards: ${cards.map(card => `${card.name} in ${card.position}`).join(', ')}
    
    Please provide:
    1. An overview of the reading's main themes
    2. Individual card interpretations in context
    3. How the cards interact with each other
    4. A clear conclusion with actionable guidance
    
    Maintain a professional, empathetic, and mystical tone. Limit to 400-500 words.
  `,
  
  quickGuidance: (question) => `
    Provide quick spiritual guidance for: "${question}"
    
    Offer:
    1. Immediate insight
    2. A suggested perspective
    3. One practical action step
    
    Keep response concise (50-75 words) but meaningful.
  `
};

// ===============================================
// EXPORTS
// ===============================================

export {
  createOpenAIClient,
  getOpenAIConfig,
  getOpenAICredentials,
  testOpenAIConnection,
  makeOpenAICall,
  tarotPrompts
};

// ES6 exports only - full ES module compliance 