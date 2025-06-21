// ===============================================
// OPENAI SERVICE CONFIGURATION
// ===============================================

const { OpenAI } = require('openai');

// OpenAI configuration
const openaiConfig = {
  apiKey: process.env.OPENAI_API_KEY || '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',
  organization: process.env.OPENAI_ORG_ID || 'org-86Ph6EJRXApTkzhnBzt32XQw',
  model: process.env.OPENAI_MODEL || 'gpt-4-1'
};

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: openaiConfig.apiKey,
  organization: openaiConfig.organization,
});

// Validate OpenAI configuration
const validateOpenAIConfig = () => {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️ OPENAI_API_KEY not found in environment variables, using default key');
  }
  
  if (!process.env.OPENAI_ORG_ID) {
    console.warn('⚠️ OPENAI_ORG_ID not found in environment variables, using default org');
  }
  
  console.log('✅ OpenAI configuration loaded');
};

// Test OpenAI connection
const testOpenAIConnection = async () => {
  try {
    const response = await openai.chat.completions.create({
      model: openaiConfig.model,
      messages: [{ role: 'user', content: 'Hello, this is a connection test.' }],
      max_tokens: 10
    });
    
    console.log('✅ OpenAI connection test successful');
    return { success: true, data: response };
  } catch (error) {
    console.error('❌ OpenAI connection test failed:', error.message);
    return { success: false, error: error.message };
  }
};

// Initialize validation
validateOpenAIConfig();

// Tarot-specific prompt templates
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

module.exports = {
  openai,
  openaiConfig,
  validateOpenAIConfig,
  testOpenAIConnection,
  tarotPrompts
}; 