import { useState, useCallback } from 'react';
import configService from '../services/configService';

export const useAI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Generate tarot reading using active AI provider
  const generateTarotReading = useCallback(async (cards, question, spread = 'three-card') => {
    try {
      setLoading(true);
      setError(null);

      const messages = [
        {
          role: 'system',
          content: `You are SAMIA, a mystical and wise tarot reader with deep knowledge of the cosmic forces. 
          You provide insightful, compassionate, and detailed tarot readings. 
          Always maintain a mystical and spiritual tone while being helpful and encouraging.
          Format your response with clear sections for each card and an overall interpretation.`
        },
        {
          role: 'user',
          content: `Please provide a ${spread} tarot reading for the question: "${question}"
          
          The cards drawn are: ${cards.map((card, index) => `${index + 1}. ${card.name} (${card.reversed ? 'Reversed' : 'Upright'})`).join(', ')}
          
          Please provide:
          1. Individual interpretation for each card in its position
          2. How the cards relate to each other
          3. Overall guidance and advice
          4. A mystical closing message`
        }
      ];

      const response = await configService.makeAICall(messages, {
        temperature: 0.8,
        max_tokens: 1500
      });

      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate personalized advice
  const generateAdvice = useCallback(async (userProfile, situation) => {
    try {
      setLoading(true);
      setError(null);

      const messages = [
        {
          role: 'system',
          content: `You are SAMIA, a wise spiritual advisor who provides personalized guidance based on cosmic wisdom and intuition. 
          Your advice is always compassionate, insightful, and empowering.`
        },
        {
          role: 'user',
          content: `Please provide personalized spiritual guidance for someone with the following profile:
          ${userProfile ? `Name: ${userProfile.name}, Interests: ${userProfile.interests || 'General spiritual guidance'}` : 'General seeker'}
          
          Their current situation: ${situation}
          
          Please provide:
          1. Spiritual insights about their situation
          2. Practical guidance and next steps
          3. Affirmations or mantras that might help
          4. A message of hope and encouragement`
        }
      ];

      const response = await configService.makeAICall(messages, {
        temperature: 0.7,
        max_tokens: 1000
      });

      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate dream interpretation
  const interpretDream = useCallback(async (dreamDescription, emotions) => {
    try {
      setLoading(true);
      setError(null);

      const messages = [
        {
          role: 'system',
          content: `You are SAMIA, a mystical dream interpreter with deep knowledge of symbolism, psychology, and spiritual meanings. 
          You help people understand the hidden messages in their dreams with wisdom and compassion.`
        },
        {
          role: 'user',
          content: `Please interpret this dream:
          
          Dream: ${dreamDescription}
          Emotions felt: ${emotions || 'Not specified'}
          
          Please provide:
          1. Symbolic meanings of key elements
          2. Possible psychological interpretations
          3. Spiritual or mystical significance
          4. Guidance on how to apply this dream's message`
        }
      ];

      const response = await configService.makeAICall(messages, {
        temperature: 0.8,
        max_tokens: 1200
      });

      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate meditation guidance
  const generateMeditation = useCallback(async (intention, duration = '10 minutes', experience = 'beginner') => {
    try {
      setLoading(true);
      setError(null);

      const messages = [
        {
          role: 'system',
          content: `You are SAMIA, a spiritual guide who creates personalized meditation experiences. 
          Your meditations are calming, transformative, and tailored to the individual's needs.`
        },
        {
          role: 'user',
          content: `Please create a ${duration} guided meditation for a ${experience} practitioner.
          
          Intention: ${intention}
          
          Please provide:
          1. A brief introduction and preparation
          2. Step-by-step meditation guidance
          3. Visualization or breathing techniques
          4. A gentle closing and integration
          
          Format it as a script that can be read aloud or followed silently.`
        }
      ];

      const response = await configService.makeAICall(messages, {
        temperature: 0.7,
        max_tokens: 1300
      });

      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate astrology insights
  const generateAstrologyReading = useCallback(async (birthData, question) => {
    try {
      setLoading(true);
      setError(null);

      const messages = [
        {
          role: 'system',
          content: `You are SAMIA, a knowledgeable astrologer who provides insightful readings based on celestial influences. 
          Your interpretations blend traditional astrology with modern psychological insights.`
        },
        {
          role: 'user',
          content: `Please provide an astrological reading based on:
          
          Birth Information: ${birthData}
          Question/Focus: ${question}
          
          Please provide:
          1. Key astrological influences
          2. Current planetary transits and their effects
          3. Guidance based on the cosmic energies
          4. Timing suggestions for important decisions`
        }
      ];

      const response = await configService.makeAICall(messages, {
        temperature: 0.8,
        max_tokens: 1400
      });

      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate chat response for live sessions
  const generateChatResponse = useCallback(async (conversation, context) => {
    try {
      setLoading(true);
      setError(null);

      const systemMessage = {
        role: 'system',
        content: `You are SAMIA, a compassionate and wise spiritual advisor conducting a live consultation. 
        Respond naturally and helpfully to the client's messages. Keep responses concise but meaningful.
        Context: ${context || 'General spiritual consultation'}`
      };

      const messages = [systemMessage, ...conversation];

      const response = await configService.makeAICall(messages, {
        temperature: 0.7,
        max_tokens: 500
      });

      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get available AI providers
  const getProviders = useCallback(async () => {
    try {
      return await configService.getAllAIProviders();
    } catch (err) {
      setError(err.message);
      return [];
    }
  }, []);

  // Get active AI provider info
  const getActiveProvider = useCallback(async () => {
    try {
      return await configService.getActiveAIProvider();
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  // Clear any cached AI configurations
  const refreshConfig = useCallback(() => {
    configService.clearCache('active_ai_provider');
  }, []);

  return {
    // State
    loading,
    error,
    
    // AI Generation Methods
    generateTarotReading,
    generateAdvice,
    interpretDream,
    generateMeditation,
    generateAstrologyReading,
    generateChatResponse,
    
    // Provider Management
    getProviders,
    getActiveProvider,
    refreshConfig,
    
    // Utility
    clearError: () => setError(null)
  };
};

export default useAI; 