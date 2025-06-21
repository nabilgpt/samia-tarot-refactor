// ===============================================
// OPENAI FRONTEND SERVICE
// ===============================================

import { apiService } from './api';

class OpenAIService {
  constructor() {
    this.baseURL = '/api/ai';
  }

  // Generate tarot reading using OpenAI
  async generateTarotReading(readingData) {
    try {
      const response = await apiService.post(`${this.baseURL}/generate-reading`, readingData);
      return response.data;
    } catch (error) {
      console.error('Error generating tarot reading:', error);
      throw this.handleError(error);
    }
  }

  // Generate general AI text
  async generateText(textData) {
    try {
      const response = await apiService.post(`${this.baseURL}/generate-text`, textData);
      return response.data;
    } catch (error) {
      console.error('Error generating text:', error);
      throw this.handleError(error);
    }
  }

  // Get AI usage statistics
  async getUsageStats(params = {}) {
    try {
      const response = await apiService.get(`${this.baseURL}/usage-stats`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching usage stats:', error);
      throw this.handleError(error);
    }
  }

  // Test OpenAI connection (Admin only)
  async testConnection() {
    try {
      const response = await apiService.get(`${this.baseURL}/test-connection`);
      return response.data;
    } catch (error) {
      console.error('Error testing OpenAI connection:', error);
      throw this.handleError(error);
    }
  }

  // Helper methods for different reading types
  async generateCardInterpretation(cardName, position, question, sessionId = null) {
    return this.generateTarotReading({
      prompt: question,
      reading_type: 'card_interpretation',
      cards: [{ name: cardName, position, reversed: false }],
      question,
      session_id: sessionId
    });
  }

  async generateFullReading(cards, spreadType, question, sessionId = null) {
    return this.generateTarotReading({
      prompt: question,
      reading_type: 'full_reading',
      cards,
      spread_type: spreadType,
      question,
      session_id: sessionId
    });
  }

  async generateQuickGuidance(question, sessionId = null) {
    return this.generateTarotReading({
      prompt: question,
      reading_type: 'quick_guidance',
      question,
      session_id: sessionId
    });
  }

  // AI-powered card suggestion
  async suggestCards(question, numberOfCards = 3) {
    try {
      const prompt = `Based on the question "${question}", suggest ${numberOfCards} tarot cards that would be most relevant for this reading. Provide only the card names, separated by commas.`;
      
      const response = await this.generateText({
        prompt,
        max_tokens: 100,
        temperature: 0.7
      });

      // Parse the response to extract card names
      const cardNames = response.data.response
        .split(',')
        .map(name => name.trim())
        .filter(name => name.length > 0)
        .slice(0, numberOfCards);

      return { success: true, cards: cardNames };
    } catch (error) {
      console.error('Error suggesting cards:', error);
      throw this.handleError(error);
    }
  }

  // AI-powered spread recommendation
  async recommendSpread(question, readingType = 'general') {
    try {
      const prompt = `For the question "${question}" and reading type "${readingType}", recommend the most appropriate tarot spread. Provide the spread name and a brief description of why it's suitable.`;
      
      const response = await this.generateText({
        prompt,
        max_tokens: 150,
        temperature: 0.6
      });

      return { success: true, recommendation: response.data.response };
    } catch (error) {
      console.error('Error recommending spread:', error);
      throw this.handleError(error);
    }
  }

  // Generate reading summary
  async generateReadingSummary(readingData) {
    try {
      const { cards, question, interpretation } = readingData;
      
      const prompt = `Summarize this tarot reading in 2-3 sentences:
Question: ${question}
Cards: ${cards.map(card => `${card.name} (${card.position})`).join(', ')}
Interpretation: ${interpretation}

Provide a concise summary that captures the main message and guidance.`;

      const response = await this.generateText({
        prompt,
        max_tokens: 100,
        temperature: 0.5
      });

      return { success: true, summary: response.data.response };
    } catch (error) {
      console.error('Error generating reading summary:', error);
      throw this.handleError(error);
    }
  }

  // Generate follow-up questions
  async generateFollowUpQuestions(readingData) {
    try {
      const { question, interpretation } = readingData;
      
      const prompt = `Based on this tarot reading:
Original Question: ${question}
Reading Result: ${interpretation}

Generate 3 thoughtful follow-up questions that would help the person gain deeper insight. Each question should be on a new line.`;

      const response = await this.generateText({
        prompt,
        max_tokens: 150,
        temperature: 0.7
      });

      // Parse the response to extract questions
      const questions = response.data.response
        .split('\n')
        .map(q => q.trim())
        .filter(q => q.length > 0 && q.includes('?'))
        .slice(0, 3);

      return { success: true, questions };
    } catch (error) {
      console.error('Error generating follow-up questions:', error);
      throw this.handleError(error);
    }
  }

  // Error handling
  handleError(error) {
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 429:
          return new Error('AI service quota exceeded. Please try again later.');
        case 400:
          return new Error(data.details || 'Invalid request to AI service.');
        case 401:
          return new Error('Authentication required for AI services.');
        case 403:
          return new Error('Access denied to AI services.');
        case 500:
          return new Error('AI service temporarily unavailable.');
        default:
          return new Error(data.error || 'AI service error occurred.');
      }
    }
    
    return error;
  }

  // Utility methods
  formatReadingForStorage(readingResult) {
    return {
      id: readingResult.session_id,
      reading: readingResult.reading,
      type: readingResult.reading_type,
      timestamp: readingResult.timestamp,
      tokens_used: readingResult.tokens_used
    };
  }

  calculateReadingCost(tokensUsed, pricePerToken = 0.0001) {
    return (tokensUsed * pricePerToken).toFixed(4);
  }

  // Validation helpers
  validateReadingRequest(readingData) {
    const { prompt, reading_type, cards } = readingData;

    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Question or prompt is required');
    }

    if (prompt.length > 2000) {
      throw new Error('Question is too long (maximum 2000 characters)');
    }

    if (reading_type === 'card_interpretation' || reading_type === 'full_reading') {
      if (!cards || cards.length === 0) {
        throw new Error('Cards are required for this reading type');
      }
    }

    return true;
  }
}

// Create and export service instance
const openaiService = new OpenAIService();
export default openaiService;

// Named exports for specific functions
export {
  openaiService
}; 