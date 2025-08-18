// =====================================================
// SAMIA TAROT - ROLE-SAFE FLEXIBLE TAROT SPREAD MANAGER
// Complete rebuild for automatic card assignment system
// 🔒 Readers: Spread creation only (no card selection)
// ✅ Clients: Full card visibility and interaction
// =====================================================

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Plus, 
  Minus,
  Flame,
  Grid,
  Layout,
  Target,
  Save,
  BookOpen,
  Settings,
  Sparkles,
  Users,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { useLanguage } from '../../context/LanguageContext';
import { MonolingualTextarea } from '../UI/BilingualFormComponents';
import api from '../../services/frontendApi';
import Button from '../Button';

const FlexibleTarotSpreadManager = () => {
  const { t, i18n } = useTranslation();
  const { user, profile } = useAuth();
  const { language, showSuccess, showError } = useUI();
  const { 
    currentLanguage, 
    getFieldName, 
    createSingleLanguageFormData,
    getLocalizedText 
  } = useLanguage();
  
  // Core states
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [availableDecks, setAvailableDecks] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [view, setView] = useState('create'); // 'create' or 'sessions'

  // Spread configuration (Reader-controlled) - Updated for bilingual support
  const [spreadConfig, setSpreadConfig] = useState({
    deck_id: '',
    layout_type: 'grid',
    card_count: 3,
    question_ar: '',
    question_en: '',
    question_category: 'general',
    client_id: '' // For readers creating sessions for clients
  });

  const isReader = profile?.role === 'reader';
  const isClient = profile?.role === 'client';
  const isAdmin = ['admin', 'super_admin'].includes(profile?.role);

  // Load data on mount
  useEffect(() => {
    loadAvailableDecks();
    loadSessions();
  }, []);

  const loadAvailableDecks = async () => {
    try {
      setLoading(true);
      const response = await api.get('/flexible-tarot/decks');
      if (response.data.success) {
        setAvailableDecks(response.data.data);
        // Auto-select first deck
        if (response.data.data.length > 0) {
          setSpreadConfig(prev => ({ ...prev, deck_id: response.data.data[0].id }));
        }
      }
    } catch (error) {
      console.error('Error loading decks:', error);
      showError(language === 'ar' ? 'فشل في تحميل الأوراق' : 'Failed to load decks');
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async () => {
    try {
      const response = await api.get('/flexible-tarot/sessions');
      if (response.data.success) {
        setSessions(response.data.data);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  // 🎯 CREATE SPREAD WITH AUTOMATIC CARD ASSIGNMENT
  const createSpread = async () => {
    if (!spreadConfig.deck_id) {
      showError(language === 'ar' ? 'يرجى اختيار مجموعة الأوراق' : 'Please select a deck');
      return;
    }

    if (isReader && !spreadConfig.client_id) {
      showError(language === 'ar' ? 'يرجى تحديد العميل' : 'Please specify client ID');
      return;
    }

    try {
      setCreating(true);

      // Create bilingual session data
      const sessionData = {
        deck_id: spreadConfig.deck_id,
        layout_type: spreadConfig.layout_type,
        card_count: parseInt(spreadConfig.card_count),
        question_category: spreadConfig.question_category
      };

      // Add bilingual question fields
      if (spreadConfig.question_ar && spreadConfig.question_ar.trim()) {
        sessionData.question_ar = spreadConfig.question_ar;
      }
      if (spreadConfig.question_en && spreadConfig.question_en.trim()) {
        sessionData.question_en = spreadConfig.question_en;
      }

      // Add client_id for readers
      if (isReader) {
        sessionData.client_id = spreadConfig.client_id;
      }

      const response = await api.post('/flexible-tarot/sessions', sessionData);
      
      if (response.data.success) {
        setCurrentSession(response.data.data);
        loadSessions(); // Refresh sessions list
        showSuccess(
          language === 'ar' 
            ? `تم إنشاء الانتشار مع ${response.data.data.card_count} بطاقة أوتوماتيكياً`
            : `Spread created with ${response.data.data.card_count} cards automatically assigned`
        );
        
        // Reset form
        setSpreadConfig(prev => ({
          ...prev,
          question_ar: '',
          question_en: '',
          client_id: ''
        }));
      }
    } catch (error) {
      console.error('Error creating spread:', error);
      showError(language === 'ar' ? 'فشل في إنشاء الانتشار' : 'Failed to create spread');
    } finally {
      setCreating(false);
    }
  };

  // 🔢 CARD COUNT CONTROLS (+/-)
  const adjustCardCount = (delta) => {
    const selectedDeck = availableDecks.find(d => d.id === spreadConfig.deck_id);
    const maxCards = selectedDeck?.total_cards || 78;
    const currentCount = parseInt(spreadConfig.card_count) || 3;
    const newCount = Math.min(Math.max(currentCount + delta, 1), maxCards);
    
    setSpreadConfig(prev => ({ ...prev, card_count: newCount }));
  };

  // 📱 RENDER SPREAD CREATION FORM
  const renderSpreadCreation = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">
          {language === 'ar' ? '🔮 إنشاء انتشار مرن' : '🔮 Create Flexible Spread'}
        </h2>
        <p className="text-gray-400">
          {isReader 
            ? (language === 'ar' ? 'اختر التخطيط والعدد - البطاقات تُختار أوتوماتيكياً' : 'Choose layout and count - cards assigned automatically')
            : (language === 'ar' ? 'إنشاء انتشار شخصي للقراءة' : 'Create a personal spread for reading')
          }
        </p>
      </div>

      {/* Deck Selection */}
      <div className="bg-dark-800/50 rounded-2xl p-6 border border-white/10">
        <h3 className="text-lg font-semibold text-gold-400 mb-4 flex items-center">
          <BookOpen className="w-5 h-5 mr-2" />
          {language === 'ar' ? 'اختيار مجموعة الأوراق' : 'Deck Selection'}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableDecks.map(deck => (
            <motion.div
              key={deck.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSpreadConfig(prev => ({ ...prev, deck_id: deck.id }))}
              className={`
                p-4 rounded-xl border-2 cursor-pointer transition-all duration-300
                ${spreadConfig.deck_id === deck.id 
                  ? 'border-gold-500 bg-gold-500/10' 
                  : 'border-white/20 bg-dark-700/30 hover:border-gold-500/50'
                }
              `}
            >
              <h4 className="font-medium text-white truncate">{deck.name}</h4>
              <p className="text-xs text-gray-400 mt-1">{deck.total_cards} {language === 'ar' ? 'بطاقة' : 'cards'}</p>
              <p className="text-xs text-gold-400 mt-1">{deck.deck_type}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Layout and Card Count */}
      <div className="bg-dark-800/50 rounded-2xl p-6 border border-white/10">
        <h3 className="text-lg font-semibold text-gold-400 mb-4 flex items-center">
          <Layout className="w-5 h-5 mr-2" />
          {language === 'ar' ? 'تخطيط الانتشار' : 'Spread Layout'}
        </h3>

        {/* Layout Type */}
        <div className="mb-6">
          <label className="block text-gray-300 mb-2">
            {language === 'ar' ? 'نوع التخطيط' : 'Layout Type'}
          </label>
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: 'grid', icon: Grid, label: language === 'ar' ? 'شبكة' : 'Grid' },
              { value: 'list', icon: Layout, label: language === 'ar' ? 'قائمة' : 'List' },
              { value: 'circle', icon: Target, label: language === 'ar' ? 'دائرة' : 'Circle' }
            ].map(layout => (
              <motion.button
                key={layout.value}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSpreadConfig(prev => ({ ...prev, layout_type: layout.value }))}
                className={`
                  p-4 rounded-lg border-2 transition-all duration-300 flex flex-col items-center space-y-2
                  ${spreadConfig.layout_type === layout.value 
                    ? 'border-gold-500 bg-gold-500/10 text-gold-400' 
                    : 'border-white/20 bg-dark-700/30 text-gray-400 hover:border-gold-500/50'
                  }
                `}
              >
                <layout.icon className="w-6 h-6" />
                <span className="text-sm font-medium">{layout.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Card Count */}
        <div>
          <label className="block text-gray-300 mb-2">
            {language === 'ar' ? 'عدد البطاقات' : 'Number of Cards'}
          </label>
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => adjustCardCount(-1)}
              className="w-10 h-10 bg-dark-600 border border-white/20 rounded-lg flex items-center justify-center text-gold-400 hover:border-gold-500/50 transition-colors"
            >
              <Minus className="w-4 h-4" />
            </motion.button>
            
            <div className="bg-dark-700 border border-white/20 rounded-lg px-4 py-2 min-w-[80px] text-center">
              <span className="text-xl font-bold text-white">{spreadConfig.card_count}</span>
              <div className="text-xs text-gray-400">
                {language === 'ar' ? 'بطاقة' : 'cards'}
              </div>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => adjustCardCount(1)}
              className="w-10 h-10 bg-dark-600 border border-white/20 rounded-lg flex items-center justify-center text-gold-400 hover:border-gold-500/50 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Question & Client (for readers) */}
      <div className="bg-dark-800/50 rounded-2xl p-6 border border-white/10">
        <h3 className="text-lg font-semibold text-gold-400 mb-4 flex items-center">
          <Settings className="w-5 h-5 mr-2" />
          {language === 'ar' ? 'تفاصيل إضافية' : 'Additional Details'}
        </h3>

        {/* Client ID for readers */}
        {isReader && (
          <div className="mb-4">
            <label className="block text-gray-300 mb-2">
              {language === 'ar' ? 'معرف العميل *' : 'Client ID *'}
            </label>
            <input
              type="text"
              value={spreadConfig.client_id}
              onChange={(e) => setSpreadConfig(prev => ({ ...prev, client_id: e.target.value }))}
              placeholder={language === 'ar' ? 'أدخل معرف العميل' : 'Enter client ID'}
              className="w-full px-4 py-2 bg-dark-700 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
            />
          </div>
        )}

        {/* Question - Single Language UX */}
        <MonolingualTextarea
          name={getFieldName('question')}
          labelKey="forms.labels.question"
          placeholderKey="forms.placeholders.question"
          value={spreadConfig[getFieldName('question')]}
          onChange={(value) => setSpreadConfig(prev => ({ ...prev, [getFieldName('question')]: value }))}
          rows={3}
          className="cosmic-form-field"
        />
      </div>

      {/* Create Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={createSpread}
        disabled={creating || !spreadConfig.deck_id}
        className={`
          w-full py-4 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center justify-center space-x-2 rtl:space-x-reverse
          ${creating || !spreadConfig.deck_id
            ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed' 
            : 'bg-gradient-to-r from-gold-500 to-orange-500 text-white hover:from-gold-600 hover:to-orange-600 shadow-lg hover:shadow-gold-500/25'
          }
        `}
      >
        {creating ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <span>{language === 'ar' ? 'إنشاء الانتشار...' : 'Creating Spread...'}</span>
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            <span>{language === 'ar' ? '🎴 إنشاء انتشار أوتوماتيكي' : '🎴 Create Automatic Spread'}</span>
          </>
        )}
      </motion.button>
    </div>
  );

  // 📋 RENDER SESSIONS LIST
  const renderSessionsList = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">
          {language === 'ar' ? '📚 جلسات الانتشار' : '📚 Spread Sessions'}
        </h2>
        <p className="text-gray-400">
          {isReader 
            ? (language === 'ar' ? 'جلساتك مع البطاقات المخفية' : 'Your sessions with hidden cards')
            : (language === 'ar' ? 'جلساتك مع إمكانية رؤية البطاقات' : 'Your sessions with full card visibility')
          }
        </p>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-dark-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-12 h-12 text-gray-500" />
          </div>
          <p className="text-gray-400">
            {language === 'ar' ? 'لا توجد جلسات بعد' : 'No sessions yet'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map(session => (
            <motion.div
              key={session.id}
              whileHover={{ scale: 1.02 }}
              onClick={() => setCurrentSession(session)}
              className="bg-dark-800/50 border border-white/10 rounded-2xl p-6 cursor-pointer hover:border-gold-500/30 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white truncate">
                  {session.deck?.name || 'Unknown Deck'}
                </h3>
                <span className={`
                  px-2 py-1 rounded-full text-xs font-medium
                  ${session.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}
                `}>
                  {session.status}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">{language === 'ar' ? 'البطاقات:' : 'Cards:'}</span>
                  <span className="text-white">
                    {session.card_count} 
                    {isReader && (
                      <span className="text-xs text-gray-500 ml-2">
                        ({language === 'ar' ? 'مخفية' : 'hidden'})
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">{language === 'ar' ? 'التخطيط:' : 'Layout:'}</span>
                  <span className="text-white">{session.layout_type}</span>
                </div>
                {(session.question_ar || session.question_en) && (
                  <div className="mt-3 p-2 bg-dark-700/50 rounded-lg">
                    <p className="text-xs text-gray-300 truncate">
                      {getLocalizedText(session, 'question')}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  {isReader ? (
                    <EyeOff className="w-4 h-4 text-gray-500" />
                  ) : (
                    <Eye className="w-4 h-4 text-gold-400" />
                  )}
                  <span className="text-xs text-gray-400">
                    {new Date(session.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="flex items-center space-x-1 rtl:space-x-reverse">
                  {session.cards_drawn?.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full ${
                        isReader ? 'bg-gray-600' : 'bg-gold-500'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );

  // 🎴 RENDER SESSION DETAILS
  const renderSessionDetails = () => {
    if (!currentSession) return null;

    const cardPositions = currentSession.cards_drawn || [];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {language === 'ar' ? '🎴 تفاصيل الانتشار' : '🎴 Spread Details'}
            </h2>
            <p className="text-gray-400">
              {currentSession.deck?.name} • {currentSession.layout_type} • {currentSession.card_count} {language === 'ar' ? 'بطاقة' : 'cards'}
            </p>
          </div>
          <button
            onClick={() => setCurrentSession(null)}
            className="px-4 py-2 bg-dark-700 text-gray-300 rounded-lg hover:bg-dark-600 transition-colors"
          >
            {language === 'ar' ? 'رجوع' : 'Back'}
          </button>
        </div>

        {/* Question */}
        {(currentSession.question_ar || currentSession.question_en) && (
          <div className="bg-dark-800/50 border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-gold-400 mb-2">
              {language === 'ar' ? 'السؤال' : 'Question'}
            </h3>
            <p className="text-gray-300">
              {getLocalizedText(currentSession, 'question')}
            </p>
          </div>
        )}

        {/* Cards Display */}
        <div className="bg-dark-800/50 border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-gold-400 mb-4">
            {language === 'ar' ? 'البطاقات' : 'Cards'}
            <span className="text-sm text-gray-400 ml-2">
              ({cardPositions.length}/{currentSession.card_count})
            </span>
          </h3>

          <div className={`
            ${currentSession.layout_type === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4' : ''}
            ${currentSession.layout_type === 'list' ? 'space-y-4' : ''}
            ${currentSession.layout_type === 'circle' ? 'relative h-96 flex items-center justify-center' : ''}
          `}>
            {cardPositions.map((cardData, index) => {
              const circlePosition = currentSession.layout_type === 'circle' ? {
                position: 'absolute',
                transform: `rotate(${(360 / cardPositions.length) * index}deg) translateY(-120px) rotate(-${(360 / cardPositions.length) * index}deg)`
              } : {};

              return (
                <motion.div
                  key={`card-${cardData.position || index}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={circlePosition}
                  className={`
                    relative bg-dark-700/50 border border-white/10 rounded-xl p-4 transition-all duration-300
                    ${currentSession.layout_type === 'list' ? 'flex items-center space-x-4 rtl:space-x-reverse' : ''}
                    ${isReader ? 'opacity-70' : 'hover:border-gold-500/30'}
                  `}
                >
                  {isReader ? (
                    // 🚫 READER VIEW: Hidden placeholders only
                    <>
                      <div className={`
                        flex-shrink-0 bg-gradient-to-br from-gray-600/20 to-gray-800/20 border border-gray-600/30 rounded-lg flex items-center justify-center
                        ${currentSession.layout_type === 'list' ? 'w-16 h-16' : 'w-full h-32 mb-3'}
                      `}>
                        <div className="text-center">
                          <span role="img" aria-label="hidden" className="text-2xl mb-1">🂠</span>
                          <div className="text-xs text-gray-400">
                            {language === 'ar' ? 'مخفية' : 'Hidden'}
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-white truncate text-sm">
                          {language === 'ar' ? '🂠 بطاقة مخفية' : '🂠 Hidden Card'}
                        </h4>
                        <div className="text-xs text-gray-500 mt-1">
                          {language === 'ar' ? `الموضع ${cardData.position}` : `Position ${cardData.position}`}
                        </div>
                      </div>
                    </>
                  ) : (
                    // ✅ CLIENT/ADMIN VIEW: Full card details
                    <>
                      <div className={`
                        flex-shrink-0 bg-gradient-to-br from-gold-500/20 to-purple-600/20 rounded-lg flex items-center justify-center
                        ${currentSession.layout_type === 'list' ? 'w-16 h-16' : 'w-full h-32 mb-3'}
                      `}>
                        {cardData.card?.image_url ? (
                          <img 
                            src={cardData.card.image_url} 
                            alt={cardData.card.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <Sparkles className="w-8 h-8 text-gold-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-white truncate text-sm">
                          {language === 'ar' ? cardData.card?.name_ar : cardData.card?.name}
                        </h4>
                        <p className="text-xs text-gray-400 mt-1">
                          {cardData.card?.suit} • {cardData.card?.arcana_type}
                        </p>
                        {cardData.card?.meaning && (
                          <p className="text-xs text-gray-300 mt-2 line-clamp-2">
                            {language === 'ar' ? cardData.card.meaning_ar : cardData.card.meaning}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header Navigation */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold gradient-text">
            {language === 'ar' ? 'مدير الانتشار المرن' : 'Flexible Spread Manager'}
          </h1>
          <p className="text-gray-400 mt-1">
            {isReader 
              ? (language === 'ar' ? 'إنشاء انتشارات مع البطاقات المخفية' : 'Create spreads with hidden cards')
              : (language === 'ar' ? 'إنشاء وعرض انتشارات التاروت' : 'Create and view tarot spreads')
            }
          </p>
        </div>

        {!currentSession && (
          <div className="flex space-x-2 rtl:space-x-reverse">
            <button
              onClick={() => setView('create')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                view === 'create' 
                  ? 'bg-gold-500 text-white' 
                  : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
              }`}
            >
              {language === 'ar' ? 'إنشاء' : 'Create'}
            </button>
            <button
              onClick={() => setView('sessions')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                view === 'sessions' 
                  ? 'bg-gold-500 text-white' 
                  : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
              }`}
            >
              {language === 'ar' ? 'الجلسات' : 'Sessions'}
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin"></div>
          </div>
        ) : currentSession ? (
          renderSessionDetails()
        ) : view === 'create' ? (
          renderSpreadCreation()
        ) : (
          renderSessionsList()
        )}
      </AnimatePresence>
    </div>
  );
};

export default FlexibleTarotSpreadManager;
