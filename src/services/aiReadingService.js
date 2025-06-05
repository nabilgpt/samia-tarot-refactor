import { TarotAPI } from '../api/tarotApi.js';

// Note: In production, this should be handled by a secure backend service
// This is a simplified version for demonstration
class AIReadingService {
  constructor() {
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    this.baseUrl = 'https://api.openai.com/v1';
    this.model = 'gpt-4';
  }

  async generateReading(readingData) {
    try {
      const { cards_drawn, question, question_category, spread } = readingData;
      
      // Get AI template for the category
      const templatesResult = await TarotAPI.getAITemplates(question_category);
      const template = templatesResult.data?.[0];
      
      if (!template) {
        throw new Error('No AI template found for this category');
      }

      // Format cards for the prompt
      const cardsText = this.formatCardsForPrompt(cards_drawn);
      
      // Build the prompt
      const prompt = this.buildPrompt(template, {
        spread_name: spread.name,
        cards_with_positions: cardsText,
        question: question || 'General guidance',
        category: question_category
      });

      // Generate the reading
      const response = await this.callOpenAI(prompt);
      
      // Parse and validate response
      const reading = this.parseAIResponse(response, template.response_format);
      
      // Calculate confidence score
      const confidence = this.calculateConfidence(reading, cards_drawn);
      
      return {
        success: true,
        data: {
          ...reading,
          confidence_score: confidence,
          ai_model: this.model,
          generated_at: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async generateCardInterpretation(card, position, context, isReversed = false) {
    try {
      const prompt = this.buildCardInterpretationPrompt(card, position, context, isReversed);
      const response = await this.callOpenAI(prompt);
      
      return {
        success: true,
        data: {
          interpretation: response,
          card_id: card.id,
          position,
          context,
          is_reversed: isReversed,
          generated_at: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async generateInsights(cardsDrawn, spread, question) {
    try {
      const prompt = this.buildInsightsPrompt(cardsDrawn, spread, question);
      const response = await this.callOpenAI(prompt);
      
      const insights = JSON.parse(response);
      
      return {
        success: true,
        data: insights
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  formatCardsForPrompt(cardsDrawn) {
    return cardsDrawn.map(cardData => {
      const card = cardData.card;
      const reversedText = cardData.is_reversed ? ' (Reversed)' : '';
      
      return `Position ${cardData.position} - ${cardData.position_name} (${cardData.position_meaning}): ${card.name}${reversedText}
      Keywords: ${cardData.is_reversed ? card.keywords?.join(', ') || 'N/A' : card.keywords?.join(', ') || 'N/A'}
      Meaning: ${cardData.is_reversed ? card.reversed_meaning || 'Blocked or internal energy' : card.upright_meaning || 'Positive energy'}`;
    }).join('\n\n');
  }

  buildPrompt(template, variables) {
    let prompt = template.prompt_template;
    
    // Replace variables in the template
    Object.keys(variables).forEach(key => {
      const placeholder = `{${key}}`;
      prompt = prompt.replace(new RegExp(placeholder, 'g'), variables[key]);
    });
    
    // Add response format instruction
    prompt += '\n\nPlease respond in valid JSON format matching this structure: ' + 
              JSON.stringify(template.response_format);
    
    return prompt;
  }

  buildCardInterpretationPrompt(card, position, context, isReversed) {
    const reversedText = isReversed ? ' in its reversed position' : '';
    const contextText = context ? ` in the context of ${context}` : '';
    
    return `As an expert tarot reader, provide a detailed interpretation of ${card.name}${reversedText} appearing in the ${position} position${contextText}.

Card Details:
- Name: ${card.name}
- Suit: ${card.suit}
- Element: ${card.element || 'N/A'}
- Keywords: ${isReversed ? card.keywords?.join(', ') || 'N/A' : card.keywords?.join(', ') || 'N/A'}
- Traditional Meaning: ${isReversed ? card.reversed_meaning || 'Blocked energy' : card.upright_meaning || 'Positive energy'}

Please provide:
1. The specific meaning of this card in this position
2. How it relates to the querent's situation
3. Practical advice based on this card
4. Any warnings or opportunities it reveals

Keep the interpretation insightful, compassionate, and practical. Limit to 200-300 words.`;
  }

  buildInsightsPrompt(cardsDrawn, spread, question) {
    const cardsText = this.formatCardsForPrompt(cardsDrawn);
    
    return `As an expert tarot reader, analyze the following ${spread.name} spread and provide deep insights about the patterns and connections between the cards.

Question: ${question || 'General guidance'}
Spread: ${spread.name}
Cards drawn:
${cardsText}

Please analyze and return a JSON object with the following structure:
{
  "overall_energy": "description of the overall energy of the reading",
  "key_themes": ["theme1", "theme2", "theme3"],
  "card_relationships": "how the cards relate to and influence each other",
  "timeline_insights": "insights about past, present, and future if applicable",
  "spiritual_guidance": "deeper spiritual message from the cards",
  "practical_advice": "concrete steps the querent can take",
  "warnings": "any cautions or challenges highlighted",
  "opportunities": "positive potentials and opportunities shown",
  "emotional_landscape": "the emotional journey revealed by the cards",
  "outcome_probability": "likelihood of positive outcome (high/medium/low)"
}

Focus on the connections between cards, not just individual meanings. Look for patterns in suits, numbers, and themes.`;
  }

  async callOpenAI(prompt) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are Samia, an expert tarot reader with deep knowledge of card meanings, spreads, and spiritual guidance. You provide compassionate, insightful, and practical readings that help people understand their situations and make positive changes in their lives.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  parseAIResponse(response, expectedFormat) {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(response);
      
      // Validate against expected format
      const formatKeys = Object.keys(expectedFormat);
      const responseKeys = Object.keys(parsed);
      
      // Check if all required keys are present
      const missingKeys = formatKeys.filter(key => !responseKeys.includes(key));
      if (missingKeys.length > 0) {
        console.warn('Missing keys in AI response:', missingKeys);
      }
      
      return parsed;
    } catch (error) {
      // If JSON parsing fails, return as text interpretation
      return {
        overall_interpretation: response,
        individual_cards: [],
        relationships: '',
        overall_message: response,
        advice: 'Please consult with a human reader for more detailed guidance.',
        confidence: 0.5
      };
    }
  }

  calculateConfidence(reading, cardsDrawn) {
    let confidence = 0.7; // Base confidence
    
    // Increase confidence based on response completeness
    if (reading.individual_cards && reading.individual_cards.length > 0) {
      confidence += 0.1;
    }
    
    if (reading.overall_message && reading.overall_message.length > 50) {
      confidence += 0.1;
    }
    
    if (reading.advice && reading.advice.length > 30) {
      confidence += 0.05;
    }
    
    // Decrease confidence for reversed cards (more complex interpretation)
    const reversedCount = cardsDrawn.filter(c => c.is_reversed).length;
    const reversedRatio = reversedCount / cardsDrawn.length;
    confidence -= reversedRatio * 0.1;
    
    // Ensure confidence is between 0 and 1
    return Math.max(0, Math.min(1, confidence));
  }

  async processAIQueue() {
    try {
      // Get next reading from queue
      const queueResult = await TarotAPI.getNextAIReading();
      
      if (!queueResult.success || !queueResult.data) {
        return { success: true, message: 'No readings in queue' };
      }
      
      const queueItem = queueResult.data;
      
      try {
        // Generate the reading
        const readingResult = await this.generateReading(queueItem.input_data);
        
        if (readingResult.success) {
          // Mark as completed
          await TarotAPI.completeAIReading(queueItem.id, readingResult.data);
          
          return {
            success: true,
            message: 'Reading generated successfully',
            data: readingResult.data
          };
        } else {
          // Mark as failed
          await TarotAPI.failAIReading(queueItem.id, readingResult.error);
          
          return {
            success: false,
            error: readingResult.error
          };
        }
      } catch (error) {
        // Mark as failed
        await TarotAPI.failAIReading(queueItem.id, error.message);
        
        return {
          success: false,
          error: error.message
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Utility methods for different reading types
  async generateNumerologyReading(birthDate, question) {
    const prompt = `As a numerology expert, provide a reading based on the birth date ${birthDate} and the question: "${question}".

Calculate and interpret:
1. Life Path Number
2. Expression Number
3. Soul Urge Number
4. Current year influence
5. Personal guidance

Provide practical insights and guidance in a compassionate tone.`;

    try {
      const response = await this.callOpenAI(prompt);
      return {
        success: true,
        data: {
          interpretation: response,
          reading_type: 'numerology',
          generated_at: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async generateAstrologyReading(birthData, question) {
    const { date, time, location } = birthData;
    
    const prompt = `As an astrology expert, provide insights based on birth data: ${date} at ${time} in ${location}, for the question: "${question}".

Focus on:
1. Current planetary transits
2. Relevant astrological influences
3. Timing and opportunities
4. Personal guidance

Provide practical and spiritual insights.`;

    try {
      const response = await this.callOpenAI(prompt);
      return {
        success: true,
        data: {
          interpretation: response,
          reading_type: 'astrology',
          generated_at: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export const aiReadingService = new AIReadingService(); 