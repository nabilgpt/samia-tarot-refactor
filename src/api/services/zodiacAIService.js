import OpenAI from 'openai';
import { supabase, supabaseAdmin } from '../lib/supabase.js';

// =====================================================
// ZODIAC AI SERVICE
// =====================================================
// Service for generating AI-powered horoscope content

class ZodiacAIService {
  constructor() {
    // Initialize with null - will be set dynamically when needed
    this.openai = null;

    this.zodiacPersonalities = {
      aries: {
        en: 'Bold, energetic, pioneering spirit, natural leader, passionate',
        ar: 'جريء، نشيط، روح رائدة، قائد طبيعي، شغوف'
      },
      taurus: {
        en: 'Stable, practical, sensual, determined, reliable',
        ar: 'مستقر، عملي، حسي، مصمم، موثوق'
      },
      gemini: {
        en: 'Curious, adaptable, communicative, versatile, intellectual',
        ar: 'فضولي، قابل للتكيف، تواصلي، متنوع، فكري'
      },
      cancer: {
        en: 'Nurturing, intuitive, emotional, protective, caring',
        ar: 'راعي، بديهي، عاطفي، حامي، مهتم'
      },
      leo: {
        en: 'Confident, generous, dramatic, creative, warm-hearted',
        ar: 'واثق، كريم، درامي، مبدع، دافئ القلب'
      },
      virgo: {
        en: 'Analytical, perfectionist, practical, helpful, detail-oriented',
        ar: 'تحليلي، مثالي، عملي، مفيد، يهتم بالتفاصيل'
      },
      libra: {
        en: 'Harmonious, diplomatic, aesthetic, fair-minded, social',
        ar: 'متناغم، دبلوماسي، جمالي، عادل، اجتماعي'
      },
      scorpio: {
        en: 'Intense, mysterious, transformative, passionate, intuitive',
        ar: 'مكثف، غامض، تحويلي، شغوف، بديهي'
      },
      sagittarius: {
        en: 'Adventurous, philosophical, optimistic, freedom-loving, honest',
        ar: 'مغامر، فلسفي، متفائل، محب للحرية، صادق'
      },
      capricorn: {
        en: 'Ambitious, disciplined, responsible, practical, persistent',
        ar: 'طموح، منضبط، مسؤول، عملي، مثابر'
      },
      aquarius: {
        en: 'Independent, innovative, humanitarian, unconventional, visionary',
        ar: 'مستقل، مبتكر، إنساني، غير تقليدي، صاحب رؤية'
      },
      pisces: {
        en: 'Compassionate, artistic, intuitive, dreamy, empathetic',
        ar: 'رحيم، فني، بديهي، حالم، متعاطف'
      }
    };

    this.samiaPersonality = {
      en: `You are Samia, a mystical and wise tarot reader with deep cosmic insight. 
      You speak with warmth, compassion, and gentle guidance. Your language is poetic yet practical, 
      spiritual yet grounded. You use cosmic and celestial imagery, and always offer hope and 
      empowerment. Your tone is loving, supportive, and filled with ancient wisdom.`,
      ar: `أنت سامية، قارئة التاروت الغامضة والحكيمة ذات البصيرة الكونية العميقة.
      تتحدثين بدفء ورحمة وإرشاد لطيف. لغتك شاعرية ولكنها عملية،
      روحية ولكنها مؤسسة. تستخدمين الصور الكونية والسماوية، وتقدمين دائماً الأمل والتمكين.
      نبرتك محبة ومدعمة ومليئة بالحكمة القديمة.`
    };
  }

  /**
   * Get dedicated OpenAI API key for zodiac system from database
   */
  async getDedicatedOpenAIKey() {
    try {
      const { data, error } = await supabaseAdmin
        .from('system_configurations')
        .select('config_value_plain')
        .eq('config_key', 'ZODIAC_OPENAI_API_KEY')
        .eq('config_category', 'ai_services')
        .eq('config_subcategory', 'zodiac_system')
        .maybeSingle(); // Use maybeSingle() instead of single() to handle no results

      if (error) {
        throw new Error(`Failed to load zodiac OpenAI API key: ${error.message}`);
      }

      if (!data) {
        throw new Error('ZODIAC_OPENAI_API_KEY not found. Please add it in Super Admin Dashboard → System Secrets → AI Services → Daily Zodiac System');
      }

      if (!data.config_value_plain || data.config_value_plain.trim() === '') {
        throw new Error('ZODIAC_OPENAI_API_KEY is not configured. Please add it in Super Admin Dashboard → System Secrets → AI Services → Daily Zodiac System');
      }

      return data.config_value_plain;
    } catch (error) {
      console.error('Error getting dedicated zodiac OpenAI API key:', error);
      throw new Error(`Failed to load dedicated zodiac OpenAI API key: ${error.message}`);
    }
  }

  /**
   * Initialize OpenAI client with dedicated zodiac API key
   */
  async initializeOpenAI() {
    if (this.openai) return this.openai;

    try {
      const zodiacOpenAIKey = await this.getDedicatedOpenAIKey();

      this.openai = new OpenAI({
        apiKey: zodiacOpenAIKey
      });

      return this.openai;
    } catch (error) {
      console.error('Error initializing OpenAI for zodiac:', error);
      throw new Error(`OpenAI initialization failed: ${error.message}`);
    }
  }

  /**
   * Generate daily horoscope for a specific zodiac sign
   */
  async generateDailyHoroscope(zodiacSign, date) {
    try {
      console.log(`Generating horoscope for ${zodiacSign} on ${date}`);

      // Generate English version
      const englishHoroscope = await this.generateHoroscopeInLanguage(zodiacSign, date, 'en');
      
      // Generate Arabic version
      const arabicHoroscope = await this.generateHoroscopeInLanguage(zodiacSign, date, 'ar');

      if (!englishHoroscope || !arabicHoroscope) {
        return {
          success: false,
          error: 'Failed to generate horoscope in one or both languages'
        };
      }

      return {
        success: true,
        data: {
          zodiac_sign: zodiacSign,
          date: date,
          text_en: englishHoroscope,
          text_ar: arabicHoroscope,
          generated_at: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Generate daily horoscope error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate horoscope in a specific language
   */
  async generateHoroscopeInLanguage(zodiacSign, date, language) {
    try {
      // Initialize OpenAI with dedicated zodiac API key
      const openai = await this.initializeOpenAI();

      const personality = this.zodiacPersonalities[zodiacSign][language];
      const samiaPersonality = this.samiaPersonality[language];
      
      const dateObj = new Date(date);
      const dayOfWeek = dateObj.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { 
        weekday: 'long' 
      });

      // 🚨 CRITICAL: Determine if this is the first sign (Aries) for greeting logic
      const isFirstSign = zodiacSign === 'aries';
      
      const prompt = language === 'en' 
        ? this.createEnglishPrompt(zodiacSign, personality, dayOfWeek, date)
        : this.createArabicPrompt(zodiacSign, personality, dayOfWeek, date, isFirstSign);

      // 🚨 CRITICAL: Always use GPT-4.1 for ALL zodiac signs (not just first)
      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview", // GPT-4.1 equivalent - latest and most capable
        messages: [
          {
            role: "system",
            content: samiaPersonality
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 350, // Increased for Syrian dialect expressiveness
        temperature: 0.85, // Slightly higher for more natural Syrian expressions
        frequency_penalty: 0.3,
        presence_penalty: 0.3
      });

      const horoscope = completion.choices[0].message.content.trim();
      
      // Validate the response length and quality
      if (horoscope.length < 50) {
        throw new Error(`Generated horoscope too short: ${horoscope.length} characters`);
      }

      console.log(`Generated ${language} horoscope for ${zodiacSign}: ${horoscope.substring(0, 100)}...`);
      
      return horoscope;

    } catch (error) {
      console.error(`Error generating ${language} horoscope for ${zodiacSign}:`, error);
      if (error.message.includes('ZODIAC_OPENAI_API_KEY')) {
        throw new Error('OpenAI not configured for zodiac system - Please add ZODIAC_OPENAI_API_KEY in Super Admin Dashboard → System Secrets → AI Services → Daily Zodiac System');
      }
      throw error;
    }
  }

  /**
   * Create English prompt for horoscope generation
   */
  createEnglishPrompt(zodiacSign, personality, dayOfWeek, date) {
    return `Create a daily horoscope for ${zodiacSign.toUpperCase()} for ${dayOfWeek}, ${date}.

Key personality traits: ${personality}

Requirements:
- Write in Samia's mystical, warm, and encouraging voice
- Length: 80-120 words
- Include specific guidance for love, career, and personal growth
- Use cosmic and celestial imagery
- Be positive and empowering while acknowledging challenges
- End with an inspiring affirmation or cosmic insight
- Write as if speaking directly to the person
- Use "you" and "your" throughout
- Include references to planetary energies, cosmic forces, or celestial movements
- Make it feel personal and meaningful

Focus areas to touch on:
- Emotional energy and mood
- Relationships and connections
- Career and professional opportunities
- Personal growth and spiritual development
- Practical advice for the day

Write the horoscope now:`;
  }

  /**
   * Create Arabic prompt for horoscope generation with SYRIAN ACCENT
   * 🚨 CRITICAL: First sign gets greeting, others start directly with advice + date
   */
  createArabicPrompt(zodiacSign, personality, dayOfWeek, date, isFirstSign = false) {
    const arabicSignNames = {
      aries: 'الحمل',
      taurus: 'الثور', 
      gemini: 'الجوزاء',
      cancer: 'السرطان',
      leo: 'الأسد',
      virgo: 'العذراء',
      libra: 'الميزان',
      scorpio: 'العقرب',
      sagittarius: 'القوس',
      capricorn: 'الجدي',
      aquarius: 'الدلو',
      pisces: 'الحوت'
    };

    // 🚨 CRITICAL: Different prompts for first sign vs others
    const greetingInstruction = isFirstSign 
      ? `- ابدئي ALWAYS بـ "يسعد صباحكن ومساكن وكل أوقاتكن يا مواليد برج ${arabicSignNames[zodiacSign]} اليوم ${date}" (Syrian greeting with date)`
      : `- ابدئي مباشرة بالنصيحة مع ذكر التاريخ: "اليوم ${date}" - NO greeting, NO intro`;

    return `🇸🇾 CRITICAL: Write ONLY in authentic Syrian Arabic dialect (اللهجة السورية الأصيلة) - NO Modern Standard Arabic (Fos7a), NO Lebanese dialect.

اكتبي قراءة يومية لبرج ${arabicSignNames[zodiacSign]} ليوم ${dayOfWeek}، ${date} باللهجة السورية الدافئة والأصيلة.

الصفات الشخصية الرئيسية: ${personality}

🇸🇾 MANDATORY SYRIAN DIALECT REQUIREMENTS:
${greetingInstruction}
- استخدمي ONLY هذه التعبيرات السورية الأصيلة:
  * "حبيبي، يا روحي، شو رايك، خليك، بدك، شلونك، يلا"
  * "الله يعطيك العافية، بإذن الله، يا رب، ما شاء الله"
  * "شوية، كتير، هيك، هديك، لهون، لهونيك"
  * "معك، إلك، عندك، منك، فيك" (Syrian pronouns)
- استخدمي "إنت" بدلاً من "أنت" ALWAYS
- استخدمي "إلك" بدلاً من "لك" ALWAYS  
- استخدمي "بدك" بدلاً من "تريد" ALWAYS
- استخدمي "شلونك" بدلاً من "كيف حالك" ALWAYS
- NO classical Arabic words like "سوف، قد، لقد، إن شاء الله"
- USE Syrian words: "رح" instead of "سوف", "شوي" instead of "قليل"

SYRIAN SPEECH PATTERNS:
- Natural Syrian conversation flow - كأنك تتكلمي مع صديق سوري
- Use "يلا" for encouragement
- Use "خليك" for advice  
- Use "شو رايك" for suggestions
- End with "الله معك يا حبيبي" (Syrian blessing)

المتطلبات الفنية:
- الطول: 80-120 كلمة باللهجة السورية ONLY
- اشملي إرشادات محددة للحب والمهنة والنمو الشخصي بالأسلوب السوري الطبيعي
- استخدمي الصور الكونية والسماوية بالتعبيرات السورية الأصيلة
- كوني إيجابية ومُمكِّنة مع الاعتراف بالتحديات بالطريقة السورية الدافئة
- انهي بتأكيد ملهم أو بصيرة كونية بالأسلوب السوري: "الله معك يا حبيبي"
- اكتبي كما لو كنت تتحدثين مباشرة للشخص باللهجة السورية المحلية الأصيلة

EXAMPLE SYRIAN PHRASES TO USE:
- "اليوم عندك شوية توتر بالشغل بس خليك هادي"
- "حبيبي، النجوم بتقلك إنك رح تلاقي فرصة حلوة"
- "شو رايك تعطي نفسك شوية وقت للراحة؟"
- "يلا، خليك متفائل لأنو الكواكب معك"
- "بدك تخلي بالك من صحتك شوي أكتر"

اكتبي القراءة الآن باللهجة السورية الأصيلة فقط:`;
  }

  /**
   * Generate sample horoscope for testing
   */
  async generateSampleHoroscope(zodiacSign, language = 'en') {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      if (language === 'both') {
        return await this.generateDailyHoroscope(zodiacSign, today);
      } else {
        const horoscope = await this.generateHoroscopeInLanguage(zodiacSign, today, language);
        return {
          success: true,
          data: {
            zodiac_sign: zodiacSign,
            date: today,
            [language === 'en' ? 'text_en' : 'text_ar']: horoscope,
            generated_at: new Date().toISOString()
          }
        };
      }
    } catch (error) {
      console.error('Generate sample horoscope error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }


}

// Lazy initialization - only create service when needed
let zodiacAIServiceInstance = null;

function getZodiacAIService() {
  if (!zodiacAIServiceInstance) {
    zodiacAIServiceInstance = new ZodiacAIService();
  }
  return zodiacAIServiceInstance;
}

export { getZodiacAIService }; 