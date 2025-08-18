import express from 'express';
import { supabase, supabaseAdmin } from '../lib/supabase.js';
import { authenticateToken } from '../middleware/auth.js';
import { unifiedTranslationService } from '../services/dynamicTranslationService.js';

const router = express.Router();

// ===========================================
// ENHANCED TRANSLATION FUNCTION WITH PROVIDER FALLBACK
// ===========================================
async function directTranslation(text, targetLanguage) {
  console.log(`🔄 [DECK TYPES TRANSLATION] Starting translation: "${text}" → ${targetLanguage}`);
  
  try {
    // Use the enhanced unified translation service with provider fallback
    const result = await unifiedTranslationService.translateText(
      text,
      targetLanguage,
      null, // Let service auto-detect source language
      {
        entityType: 'deck_types',
        source: 'deck_types_route',
        context: 'Tarot deck type name translation'
      }
    );

    if (result && result.trim() !== '') {
      console.log(`✅ [DECK TYPES TRANSLATION] Translation successful: "${text}" → "${result}"`);
      return result;
    } else {
      console.log(`⚠️ [DECK TYPES TRANSLATION] Translation service returned empty result, trying fallback`);
      return getEnhancedTranslation(text, targetLanguage);
    }

  } catch (error) {
    console.error(`❌ [DECK TYPES TRANSLATION] Translation service failed:`, error.message);
    console.log(`🔄 [DECK TYPES TRANSLATION] Falling back to enhanced translation mappings`);
    return getEnhancedTranslation(text, targetLanguage);
  }
}

// ===========================================
// ENHANCED TRANSLATION MAPPINGS (FALLBACK)
// ===========================================
// 🚀 ENHANCED TRANSLATION WITH WORD-BY-WORD FALLBACK
function getEnhancedTranslation(text, targetLanguage) {
  console.log(`🔄 [ENHANCED TRANSLATION] Processing fallback: "${text}" → ${targetLanguage}`);

  const translations = {
    // English to Arabic
    'en_to_ar': {
      // Existing mappings
      'horror': 'رعب',
      'nomad': 'بدوي', 
      'classic': 'كلاسيكي',
      'modern': 'حديث',
      'traditional': 'تقليدي',
      'mystical': 'غامض',
      'spiritual': 'روحي',
      'celtic': 'سلتي',
      'egyptian': 'مصري',
      'moroccan': 'مغربي',
      'tarot': 'تاروت',
      'oracle': 'أوراكل',
      'medieval': 'وسيط',
      'renaissance': 'نهضة',
      'contemporary': 'معاصر',
      'vintage': 'عتيق',
      'artistic': 'فني',
      'minimalist': 'بسيط',
      'colorful': 'ملون',
      'dark': 'مظلم',
      'light': 'فاتح',
      
      // 🆕 ENHANCED MAPPINGS FOR COMMON WORDS
      'night': 'ليل',
      'cat': 'قط',
      'moon': 'قمر',
      'star': 'نجم',
      'sun': 'شمس',
      'fire': 'نار',
      'water': 'ماء',
      'earth': 'أرض',
      'air': 'هواء',
      'love': 'حب',
      'death': 'موت',
      'life': 'حياة',
      'magic': 'سحر',
      'wisdom': 'حكمة',
      'power': 'قوة',
      'dream': 'حلم',
      'shadow': 'ظل',
      'angel': 'ملاك',
      'demon': 'شيطان',
      'crystal': 'كريستال',
      'witch': 'ساحرة',
      'wizard': 'ساحر',
      'fantasy': 'خيال',
      'mystery': 'غموض',
      'ancient': 'عتيق',
      'sacred': 'مقدس',
      'divine': 'إلهي',
      'cosmic': 'كوني',
      'royal': 'ملكي',
      'golden': 'ذهبي',
      'silver': 'فضي',
      'black': 'أسود',
      'white': 'أبيض',
      'red': 'أحمر',
      'blue': 'أزرق',
      'green': 'أخضر',
      'purple': 'بنفسجي',
      'pink': 'وردي',
      'brown': 'بني',
      'gray': 'رمادي',
      'yellow': 'أصفر',
      'orange': 'برتقالي',
      'rainbow': 'قوس قزح',
      'cosmic': 'فلكي',
      'ethereal': 'أثيري',
      'mystic': 'صوفي',
      'druid': 'درويد',
      'shaman': 'شامان',
      'oracle': 'عرافة',
      'fortune': 'حظ',
      'fate': 'قدر',
      'destiny': 'مصير',
      'karma': 'كارما',
      'chakra': 'شاكرا',
      'zen': 'زين',
      'buddha': 'بوذا',
      'goddess': 'إلهة',
      'phoenix': 'العنقاء',
      'dragon': 'تنين',
      'unicorn': 'وحيد القرن',
      'fairy': 'جنية',
      'vampire': 'مصاص دماء',
      'werewolf': 'رجل الذئب',
      'ghost': 'شبح',
      'spirit': 'روح',
      'soul': 'نفس',
      'mind': 'عقل',
      'heart': 'قلب',
      'body': 'جسم',
      'universe': 'كون',
      'galaxy': 'مجرة',
      'planet': 'كوكب',
      'space': 'فضاء',
      'time': 'وقت',
      'infinity': 'لا نهاية',
      'eternal': 'أبدي',
      'immortal': 'خالد',
      'mortal': 'فاني',
      'human': 'إنسان',
      'nature': 'طبيعة',
      'forest': 'غابة',
      'mountain': 'جبل',
      'river': 'نهر',
      'ocean': 'محيط',
      'desert': 'صحراء',
      'city': 'مدينة',
      'village': 'قرية',
      'castle': 'قلعة',
      'temple': 'معبد',
      'church': 'كنيسة',
      'mosque': 'مسجد',
      'garden': 'حديقة',
      'flower': 'زهرة',
      'tree': 'شجرة',
      'rose': 'وردة',
      'lily': 'زنبق',
      'lotus': 'لوتس',
      'butterfly': 'فراشة',
      'bird': 'طائر',
      'eagle': 'نسر',
      'raven': 'غراب',
      'dove': 'حمامة',
      'swan': 'بجعة',
      'wolf': 'ذئب',
      'lion': 'أسد',
      'tiger': 'نمر',
      'bear': 'دب',
      'snake': 'ثعبان',
      'spider': 'عنكبوت',
      'scorpion': 'عقرب',
      'crown': 'تاج',
      'sword': 'سيف',
      'shield': 'درع',
      'wand': 'عصا',
      'staff': 'طاقم',
      'chalice': 'كأس',
      'cup': 'كوب',
      'coin': 'عملة',
      'pentacle': 'نجمة خماسية',
      'key': 'مفتاح',
      'door': 'باب',
      'window': 'نافذة',
      'mirror': 'مرآة',
      'book': 'كتاب',
      'scroll': 'لفة',
      'candle': 'شمعة',
      'flame': 'لهب',
      'smoke': 'دخان',
      'mist': 'ضباب',
      'cloud': 'غيمة',
      'storm': 'عاصفة',
      'thunder': 'رعد',
      'lightning': 'برق',
      'rain': 'مطر',
      'snow': 'ثلج',
      'ice': 'جليد',
      'wind': 'رياح',
      'breeze': 'نسيم',
      'sunset': 'غروب',
      'sunrise': 'شروق',
      'dawn': 'فجر',
      'dusk': 'غسق',
      'midnight': 'منتصف الليل',
      'noon': 'ظهر',
      'morning': 'صباح',
      'evening': 'مساء',
      'day': 'يوم',
      'year': 'سنة',
      'season': 'موسم',
      'spring': 'ربيع',
      'summer': 'صيف',
      'autumn': 'خريف',
      'winter': 'شتاء',
      'january': 'يناير',
      'february': 'فبراير',
      'march': 'مارس',
      'april': 'أبريل',
      'may': 'مايو',
      'june': 'يونيو',
      'july': 'يوليو',
      'august': 'أغسطس',
      'september': 'سبتمبر',
      'october': 'أكتوبر',
      'november': 'نوفمبر',
      'december': 'ديسمبر'
    },
    
    // Arabic to English
    'ar_to_en': {
      'رعب': 'horror',
      'بدوي': 'nomad',
      'كلاسيكي': 'classic',
      'حديث': 'modern',
      'تقليدي': 'traditional',
      'غامض': 'mystical',
      'روحي': 'spiritual',
      'سلتي': 'celtic',
      'مصري': 'egyptian',
      'مغربي': 'moroccan',
      'تاروت': 'tarot',
      'أوراكل': 'oracle',
      'وسيط': 'medieval',
      'نهضة': 'renaissance',
      'معاصر': 'contemporary',
      'عتيق': 'vintage',
      'فني': 'artistic',
      'بسيط': 'minimalist',
      'ملون': 'colorful',
      'مظلم': 'dark',
      'فاتح': 'light',
      'ليل': 'night',
      'قط': 'cat',
      'قمر': 'moon',
      'نجم': 'star',
      'شمس': 'sun',
      'نار': 'fire',
      'ماء': 'water',
      'أرض': 'earth',
      'هواء': 'air',
      'حب': 'love',
      'موت': 'death',
      'حياة': 'life',
      'سحر': 'magic',
      'حكمة': 'wisdom',
      'قوة': 'power',
      'حلم': 'dream',
      'ظل': 'shadow',
      'ملاك': 'angel',
      'شيطان': 'demon',
      'كريستال': 'crystal',
      'ساحرة': 'witch',
      'ساحر': 'wizard',
      'خيال': 'fantasy',
      'غموض': 'mystery',
      'عتيق': 'ancient',
      'مقدس': 'sacred',
      'إلهي': 'divine',
      'كوني': 'cosmic',
      'ملكي': 'royal',
      'ذهبي': 'golden',
      'فضي': 'silver',
      'أسود': 'black',
      'أبيض': 'white',
      'أحمر': 'red',
      'أزرق': 'blue',
      'أخضر': 'green',
      'بنفسجي': 'purple',
      'وردي': 'pink',
      'بني': 'brown',
      'رمادي': 'gray',
      'أصفر': 'yellow',
      'برتقالي': 'orange',
      'قوس قزح': 'rainbow',
      'فلكي': 'cosmic',
      'أثيري': 'ethereal',
      'صوفي': 'mystic',
      'درويد': 'druid',
      'شامان': 'shaman',
      'عرافة': 'oracle',
      'حظ': 'fortune',
      'قدر': 'fate',
      'مصير': 'destiny',
      'كارما': 'karma',
      'شاكرا': 'chakra',
      'زين': 'zen',
      'بوذا': 'buddha',
      'إلهة': 'goddess',
      'العنقاء': 'phoenix',
      'تنين': 'dragon',
      'وحيد القرن': 'unicorn',
      'جنية': 'fairy',
      'مصاص دماء': 'vampire',
      'رجل الذئب': 'werewolf',
      'شبح': 'ghost',
      'روح': 'spirit',
      'نفس': 'soul',
      'عقل': 'mind',
      'قلب': 'heart',
      'جسم': 'body',
      'كون': 'universe',
      'مجرة': 'galaxy',
      'كوكب': 'planet',
      'فضاء': 'space',
      'وقت': 'time',
      'لا نهاية': 'infinity',
      'أبدي': 'eternal',
      'خالد': 'immortal',
      'فاني': 'mortal',
      'إنسان': 'human',
      'طبيعة': 'nature',
      'غابة': 'forest',
      'جبل': 'mountain',
      'نهر': 'river',
      'محيط': 'ocean',
      'صحراء': 'desert',
      'مدينة': 'city',
      'قرية': 'village',
      'قلعة': 'castle',
      'معبد': 'temple',
      'كنيسة': 'church',
      'مسجد': 'mosque',
      'حديقة': 'garden',
      'زهرة': 'flower',
      'شجرة': 'tree',
      'وردة': 'rose',
      'زنبق': 'lily',
      'لوتس': 'lotus',
      'فراشة': 'butterfly',
      'طائر': 'bird',
      'نسر': 'eagle',
      'غراب': 'raven',
      'حمامة': 'dove',
      'بجعة': 'swan',
      'ذئب': 'wolf',
      'أسد': 'lion',
      'نمر': 'tiger',
      'دب': 'bear',
      'ثعبان': 'snake',
      'عنكبوت': 'spider',
      'عقرب': 'scorpion',
      'تاج': 'crown',
      'سيف': 'sword',
      'درع': 'shield',
      'عصا': 'wand',
      'طاقم': 'staff',
      'كأس': 'chalice',
      'كوب': 'cup',
      'عملة': 'coin',
      'نجمة خماسية': 'pentacle',
      'مفتاح': 'key',
      'باب': 'door',
      'نافذة': 'window',
      'مرآة': 'mirror',
      'كتاب': 'book',
      'لفة': 'scroll',
      'شمعة': 'candle',
      'لهب': 'flame',
      'دخان': 'smoke',
      'ضباب': 'mist',
      'غيمة': 'cloud',
      'عاصفة': 'storm',
      'رعد': 'thunder',
      'برق': 'lightning',
      'مطر': 'rain',
      'ثلج': 'snow',
      'جليد': 'ice',
      'رياح': 'wind',
      'نسيم': 'breeze',
      'غروب': 'sunset',
      'شروق': 'sunrise',
      'فجر': 'dawn',
      'غسق': 'dusk',
      'منتصف الليل': 'midnight',
      'ظهر': 'noon',
      'صباح': 'morning',
      'مساء': 'evening',
      'يوم': 'day',
      'سنة': 'year',
      'موسم': 'season',
      'ربيع': 'spring',
      'صيف': 'summer',
      'خريف': 'autumn',
      'شتاء': 'winter',
      'يناير': 'january',
      'فبراير': 'february',
      'مارس': 'march',
      'أبريل': 'april',
      'مايو': 'may',
      'يونيو': 'june',
      'يوليو': 'july',
      'أغسطس': 'august',
      'سبتمبر': 'september',
      'أكتوبر': 'october',
      'نوفمبر': 'november',
      'ديسمبر': 'december'
    }
  };

  // Determine direction
  const direction = targetLanguage === 'ar' ? 'en_to_ar' : 'ar_to_en';
  const directTranslations = translations[direction];

  // Convert text to lowercase for matching
  const lowerText = text.toLowerCase().trim();
  
  // Try exact match first
  if (directTranslations[lowerText]) {
    const result = directTranslations[lowerText];
    console.log(`✅ [ENHANCED TRANSLATION] Exact match found: "${text}" → "${result}"`);
    return result;
  }

  // Try word-by-word translation for phrases
  const words = text.split(/\s+/);
  if (words.length > 1) {
    const translatedWords = words.map(word => {
      const lowerWord = word.toLowerCase().trim();
      return directTranslations[lowerWord] || word;
    });
    
    const result = translatedWords.join(' ');
    if (result !== text) {
      console.log(`✅ [ENHANCED TRANSLATION] Word-by-word translation: "${text}" → "${result}"`);
      return result;
    }
  }

  // No translation found
  console.log(`⚠️ [ENHANCED TRANSLATION] No translation found for: "${text}"`);
  return text; // Return original text as fallback
}

// Keep simple translation for backwards compatibility
function getSimpleTranslation(text, targetLanguage) {
  return getEnhancedTranslation(text, targetLanguage);
}

// Get all deck types
router.get('/deck-types', authenticateToken, async (req, res) => {
  try {
    console.log('🎯 [DECK TYPES] Fetching all deck types');
    
    const { data, error } = await supabaseAdmin
      .from('deck_types')
      .select('*')
      .order('name_en');

    if (error) {
      console.error('❌ [DECK TYPES] Database error:', error);
      return res.status(400).json({
        success: false,
        error: 'Failed to fetch deck types',
        details: error.message
      });
    }

    console.log(`✅ [DECK TYPES] Successfully fetched ${data?.length || 0} deck types`);
    
    res.json({
      success: true,
      data: data || []
    });

  } catch (error) {
    console.error('❌ [DECK TYPES] Server error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Create new deck type with dynamic bilingual processing
router.post('/deck-types', authenticateToken, async (req, res) => {
  try {
    const { name_en, name_ar } = req.body;
    
    console.log('🎯 [DECK TYPES] Creating new deck type with dynamic translation:', { name_en, name_ar });

    // Using statically imported unified translation service

    // Prepare data for bilingual processing
    const inputData = { name_en, name_ar };

    console.log('🔍 [DECK TYPES DEBUG] Input data received:', {
      name_en: inputData.name_en,
      name_ar: inputData.name_ar,
      name_en_empty: !inputData.name_en,
      name_ar_empty: !inputData.name_ar
    });

    // Process data using unified translation service
    const processedData = await unifiedTranslationService.processBilingualData(inputData, {
      fields: ['name'],
      entityType: 'deck_types',
      entityId: null,
      forceTranslation: true // FORCE TRANSLATION FOR TESTING
    });

    console.log('🔍 [DECK TYPES DEBUG] Dynamic bilingual processing completed:', {
      input: inputData,
      processed: processedData,
      translation_occurred: (processedData.name_en !== inputData.name_en || processedData.name_ar !== inputData.name_ar)
    });

    // Validation - ensure we have at least one name
    if (!processedData.name_en && !processedData.name_ar) {
      return res.status(400).json({
        success: false,
        error: 'At least one name (English or Arabic) is required'
      });
    }

    // Ensure final names meet length requirements
    if ((processedData.name_en && processedData.name_en.length > 50) || 
        (processedData.name_ar && processedData.name_ar.length > 50)) {
      return res.status(400).json({
        success: false,
        error: 'Deck type names must be 50 characters or less'
      });
    }

    // Check for duplicates using admin client
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('deck_types')
      .select('id')
      .or(`name_en.eq.${processedData.name_en || ''},name_ar.eq.${processedData.name_ar || ''}`)
      .limit(1);

    if (checkError) {
      console.error('❌ [DECK TYPES] Duplicate check error:', checkError);
      return res.status(400).json({
        success: false,
        error: 'Failed to check for duplicates',
        details: checkError.message
      });
    }

    if (existing && existing.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Deck type already exists'
      });
    }

    // Insert new deck type using admin client (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from('deck_types')
      .insert([{
        name_en: processedData.name_en?.trim() || null,
        name_ar: processedData.name_ar?.trim() || null,
        created_by: req.user.id,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ [DECK TYPES] Insert error:', error);
      return res.status(400).json({
        success: false,
        error: 'Failed to create deck type',
        details: error.message
      });
    }

    console.log(`✅ [DECK TYPES] Successfully created deck type with ID: ${data.id}`);
    
    // Get translation method info for response
    const translationStatus = await unifiedTranslationService.getSystemStatus();

    res.status(201).json({
      success: true,
      data,
      translation_info: {
        mode: translationStatus.translation_mode,
        provider: translationStatus.default_provider,
        method: (processedData.name_en !== inputData.name_en || processedData.name_ar !== inputData.name_ar) 
          ? 'dynamic_translation' 
          : 'auto_copy'
      }
    });

  } catch (error) {
    console.error('❌ [DECK TYPES] Server error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Update deck type with dynamic bilingual processing
router.put('/deck-types/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name_en, name_ar } = req.body;
    
    console.log('🔄 [DECK TYPES] Updating deck type:', { id, name_en, name_ar });

    // Validation
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Deck type ID is required'
      });
    }

    // Using statically imported unified translation service

    // Check if deck type exists
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('deck_types')
      .select('*')
      .eq('id', id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ [DECK TYPES] Error checking existence:', checkError);
      return res.status(400).json({
        success: false,
        error: 'Failed to verify deck type',
        details: checkError.message
      });
    }

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Deck type not found'
      });
    }

    // Prepare data for bilingual processing
    const inputData = { name_en, name_ar };

    // Process data using unified translation service
    const processedData = await unifiedTranslationService.processBilingualData(inputData, {
      fields: ['name'],
      entityType: 'deck_types',
      entityId: id,
      forceTranslation: false
    });

    console.log('🔄 [DECK TYPES] Dynamic bilingual processing completed:', {
      input: inputData,
      processed: processedData
    });

    // Validation - ensure we have at least one name
    if (!processedData.name_en && !processedData.name_ar) {
      return res.status(400).json({
        success: false,
        error: 'At least one name (English or Arabic) is required'
      });
    }

    // Ensure final names meet length requirements
    if ((processedData.name_en && processedData.name_en.length > 50) || 
        (processedData.name_ar && processedData.name_ar.length > 50)) {
      return res.status(400).json({
        success: false,
        error: 'Deck type names must be 50 characters or less'
      });
    }

    // Check for duplicates (excluding current record)
    const { data: duplicates, error: dupError } = await supabaseAdmin
      .from('deck_types')
      .select('id')
      .neq('id', id)
      .or(`name_en.eq.${processedData.name_en || ''},name_ar.eq.${processedData.name_ar || ''}`)
      .limit(1);

    if (dupError) {
      console.error('❌ [DECK TYPES] Duplicate check error:', dupError);
      return res.status(400).json({
        success: false,
        error: 'Failed to check for duplicates',
        details: dupError.message
      });
    }

    if (duplicates && duplicates.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Deck type with this name already exists'
      });
    }

    // Update the deck type using admin client (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from('deck_types')
      .update({
        name_en: processedData.name_en?.trim() || null,
        name_ar: processedData.name_ar?.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ [DECK TYPES] Update error:', error);
      return res.status(400).json({
        success: false,
        error: 'Failed to update deck type',
        details: error.message
      });
    }

    console.log(`✅ [DECK TYPES] Successfully updated deck type with ID: ${id}`);
    
    // Get translation method info for response
    const translationStatus = await unifiedTranslationService.getSystemStatus();

    res.json({
      success: true,
      data,
      translation_info: {
        mode: translationStatus.translation_mode,
        provider: translationStatus.default_provider,
        method: (processedData.name_en !== inputData.name_en || processedData.name_ar !== inputData.name_ar) 
          ? 'dynamic_translation' 
          : 'auto_copy'
      }
    });

  } catch (error) {
    console.error('❌ [DECK TYPES] Server error during update:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Delete deck type (Super Admin Only)
router.delete('/deck-types/:id', authenticateToken, async (req, res) => {
  try {
    const { role } = req.profile;
    console.log('🗑️ [DECK TYPES] Delete request from user role:', role);

    // Check if user is super admin
    if (role !== 'super_admin') {
      console.log('❌ [DECK TYPES] Access denied - not super admin');
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Only super admins can delete deck types'
      });
    }

    const { id } = req.params;
    console.log('🗑️ [DECK TYPES] Attempting to delete deck type with ID:', id);

    // Validation
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Deck type ID is required'
      });
    }

    // Check if deck type exists before deletion
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('deck_types')
      .select('id, name_en, name_ar')
      .eq('id', id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ [DECK TYPES] Error checking existence:', checkError);
      return res.status(400).json({
        success: false,
        error: 'Failed to verify deck type',
        details: checkError.message
      });
    }

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Deck type not found'
      });
    }

    // Delete the deck type using admin client (bypasses RLS)
    const { error } = await supabaseAdmin
      .from('deck_types')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ [DECK TYPES] Delete error:', error);
      return res.status(400).json({
        success: false,
        error: 'Failed to delete deck type',
        details: error.message
      });
    }

    console.log(`✅ [DECK TYPES] Successfully deleted deck type: ${existing.name_en} (${existing.name_ar})`);
    
    res.json({
      success: true,
      message: 'Deck type deleted successfully',
      deleted_item: {
        id,
        name_en: existing.name_en,
        name_ar: existing.name_ar
      }
    });

  } catch (error) {
    console.error('❌ [DECK TYPES] Server error during deletion:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Auto-translate text endpoint - Direct Translation System
router.post('/auto-translate', authenticateToken, async (req, res) => {
  try {
    const { text, from_language, to_language } = req.body;
    
    console.log('🔄 [DIRECT AUTO TRANSLATE] Request:', { text, from_language, to_language });

    if (!text || !to_language) {
      return res.status(400).json({
        success: false,
        error: 'Text and target language are required'
      });
    }

    // Use bulletproof translation function
    const translatedText = await directTranslation(text, to_language);
    
    // Determine translation method based on result
    let translationMethod = 'auto_copy'; // Default fallback
    if (translatedText !== text) {
      translationMethod = 'real_translation';
    }

    console.log(`🎯 [AUTO-TRANSLATE] Final result: "${text}" → "${translatedText}" (method: ${translationMethod})`);

    res.json({
      success: true,
      translated_text: translatedText,
      from_language,
      to_language,
      original_text: text,
      translation_method: translationMethod,
      translation_quality: translatedText !== text ? 'success' : 'fallback'
    });

  } catch (error) {
    console.error('❌ [DIRECT AUTO TRANSLATE] Server error:', error);
    res.status(500).json({
      success: false,
      error: 'Translation failed',
      details: error.message
    });
  }
});

export default router; 