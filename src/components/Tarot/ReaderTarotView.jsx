import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, 
  Volume2, 
  VolumeX, 
  Brain, 
  MessageSquare, 
  Clock,
  Star,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Download,
  Share2
} from 'lucide-react';
import { TarotAPI } from '../../api/tarotApi.js';
import { aiReadingService } from '../../services/aiReadingService.js';
import { ttsService } from '../../services/ttsService.js';
import { useAuth } from '../../context/AuthContext.jsx';

const ReaderTarotView = ({ 
  sessionId, 
  bookingId, 
  clientId,
  onReadingUpdate 
}) => {
  const { user } = useAuth();
  const [session, setSession] = useState(null);
  const [aiReading, setAiReading] = useState(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [readerNotes, setReaderNotes] = useState('');
  const [interpretation, setInterpretation] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('cards'); // cards, ai, notes

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  useEffect(() => {
    if (session?.cards_drawn?.length > 0 && !aiReading) {
      generateAIReading();
    }
  }, [session]);

  const loadSession = async () => {
    try {
      const result = await TarotAPI.getReadingSession(sessionId);
      if (result.success) {
        setSession(result.data);
        setReaderNotes(result.data.notes || '');
        setInterpretation(result.data.overall_interpretation || '');
        
        // Load existing AI reading if available
        if (result.data.ai_insights) {
          setAiReading(result.data.ai_insights);
        }
      } else {
        setError('Failed to load session');
      }
    } catch (err) {
      setError('Error loading session');
    }
  };

  const generateAIReading = async () => {
    if (!session?.cards_drawn?.length) return;

    setIsLoadingAI(true);
    setError('');

    try {
      const result = await aiReadingService.generateReading({
        cards: session.cards_drawn,
        question: session.question,
        category: session.question_category,
        spread: session.spread,
        client_context: {
          id: clientId,
          previous_readings: [] // Could be enhanced with history
        }
      });

      if (result.success) {
        setAiReading(result.data);
        
        // Save AI reading to session
        await TarotAPI.updateReadingSession(sessionId, {
          ai_insights: result.data,
          confidence_score: result.data.confidence_score
        });
      } else {
        setError('Failed to generate AI reading');
      }
    } catch (err) {
      setError('Error generating AI reading');
    } finally {
      setIsLoadingAI(false);
    }
  };

  const playAIReading = async () => {
    if (!aiReading?.overall_message) return;

    setIsPlayingAudio(true);
    
    try {
      const audioResult = await ttsService.generateSpeech(
        aiReading.overall_message,
        {
          voice: 'alloy', // OpenAI voice
          speed: 0.9,
          format: 'mp3'
        }
      );

      if (audioResult.success) {
        setAudioUrl(audioResult.audioUrl);
        
        // Play the audio
        const audio = new Audio(audioResult.audioUrl);
        audio.onended = () => setIsPlayingAudio(false);
        audio.onerror = () => {
          setIsPlayingAudio(false);
          setError('Failed to play audio');
        };
        
        await audio.play();
      } else {
        setError('Failed to generate speech');
        setIsPlayingAudio(false);
      }
    } catch (err) {
      setError('Error playing AI reading');
      setIsPlayingAudio(false);
    }
  };

  const stopAudio = () => {
    // Stop any playing audio
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    setIsPlayingAudio(false);
  };

  const saveReaderInput = async () => {
    setIsUpdating(true);
    setError('');

    try {
      const result = await TarotAPI.updateReadingSession(sessionId, {
        notes: readerNotes,
        overall_interpretation: interpretation,
        status: interpretation ? 'completed' : 'in_progress'
      });

      if (result.success) {
        setSession(result.data);
        onReadingUpdate && onReadingUpdate(result.data);
      } else {
        setError('Failed to save reading');
      }
    } catch (err) {
      setError('Error saving reading');
    } finally {
      setIsUpdating(false);
    }
  };

  const renderCardsView = () => (
    <div className="space-y-6">
      {/* Session Info */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Session Details</h3>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            session?.status === 'active' ? 'bg-green-100 text-green-800' :
            session?.status === 'completed' ? 'bg-blue-100 text-blue-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {session?.status || 'Unknown'}
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Question:</span>
            <p className="text-gray-600 mt-1">{session?.question || 'No question provided'}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Category:</span>
            <p className="text-gray-600 mt-1 capitalize">{session?.question_category || 'General'}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Spread:</span>
            <p className="text-gray-600 mt-1">{session?.spread?.name || 'Custom Spread'}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Started:</span>
            <p className="text-gray-600 mt-1">
              {session?.started_at ? new Date(session.started_at).toLocaleString() : 'Not started'}
            </p>
          </div>
        </div>
      </div>

      {/* Cards Display */}
      {session?.cards_drawn?.length > 0 ? (
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Client&apos;s Cards</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {session.cards_drawn.map((cardData, index) => (
              <motion.div
                key={cardData.card_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                {/* Position Label */}
                <div className="mb-3">
                  <span className="text-sm font-medium text-purple-600 bg-purple-100 px-3 py-1 rounded-full">
                    {session.spread?.positions?.[index]?.name || `Position ${index + 1}`}
                  </span>
                </div>

                {/* Card Image */}
                <div className="relative w-32 h-48 mx-auto mb-4">
                  <div className="w-full h-full bg-white rounded-lg shadow-lg border-2 border-gray-200 overflow-hidden">
                    {cardData.card?.image_url ? (
                      <img
                        src={cardData.is_reversed ? 
                          cardData.card.image_reversed_url || cardData.card.image_url : 
                          cardData.card.image_url
                        }
                        alt={cardData.card.name}
                        className={`w-full h-full object-cover ${
                          cardData.is_reversed ? 'transform rotate-180' : ''
                        }`}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-indigo-100">
                        <div className="text-center p-4">
                          <Eye className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                          <div className="text-sm font-medium text-purple-800">
                            {cardData.card?.name || 'Unknown Card'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Reversed Indicator */}
                  {cardData.is_reversed && (
                    <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      Reversed
                    </div>
                  )}
                </div>

                {/* Card Info */}
                <div className="text-center">
                  <h4 className="font-semibold text-gray-900 mb-1">
                    {cardData.card?.name || 'Unknown Card'}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {cardData.card?.suit && cardData.card.suit !== 'major_arcana' && (
                      <span className="capitalize">{cardData.card.suit}</span>
                    )}
                    {cardData.card?.arcana_type === 'major' && (
                      <span>Major Arcana</span>
                    )}
                  </p>
                  
                  {/* Quick Meaning */}
                  <div className="mt-2 text-xs text-gray-500">
                    <p className="font-medium">
                      {cardData.is_reversed ? 'Reversed:' : 'Upright:'}
                    </p>
                    <p className="mt-1">
                      {cardData.is_reversed ? 
                        cardData.card?.reversed_meaning?.substring(0, 100) + '...' :
                        cardData.card?.upright_meaning?.substring(0, 100) + '...'
                      }
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Waiting for Cards</h3>
          <p className="text-gray-600">The client hasn&apos;t selected their cards yet.</p>
        </div>
      )}
    </div>
  );

  const renderAIView = () => (
    <div className="space-y-6">
      {/* AI Reading Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Brain className="w-6 h-6 text-blue-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">AI Reading Assistant</h3>
          </div>
          
          <div className="flex items-center gap-3">
            {aiReading?.confidence_score && (
              <div className="flex items-center text-sm">
                <Star className="w-4 h-4 text-yellow-500 mr-1" />
                <span className="font-medium">
                  {Math.round(aiReading.confidence_score * 100)}% confidence
                </span>
              </div>
            )}
            
            <button
              onClick={generateAIReading}
              disabled={isLoadingAI}
              className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingAI ? 'animate-spin' : ''}`} />
              Regenerate
            </button>
          </div>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800 mb-1">AI Draft — Not for Client Delivery</p>
              <p className="text-yellow-700">
                This AI-generated reading is for your reference only. Use it as inspiration for your own interpretation.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Reading Content */}
      {isLoadingAI ? (
        <div className="bg-white rounded-lg p-8 text-center shadow-sm border">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-gray-600">Generating AI reading...</p>
        </div>
      ) : aiReading ? (
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          {/* Audio Controls */}
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-lg font-semibold text-gray-900">AI Interpretation</h4>
            
            <div className="flex items-center gap-2">
              <button
                onClick={isPlayingAudio ? stopAudio : playAIReading}
                disabled={!aiReading.overall_message}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {isPlayingAudio ? (
                  <>
                    <VolumeX className="w-4 h-4 mr-2" />
                    Stop Audio
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 mr-2" />
                    Play Reading
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Overall Message */}
          <div className="mb-6">
            <h5 className="font-medium text-gray-900 mb-3">Overall Message</h5>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700 leading-relaxed">
                {aiReading.overall_message}
              </p>
            </div>
          </div>

          {/* Card-by-Card Analysis */}
          {aiReading.card_interpretations && (
            <div className="mb-6">
              <h5 className="font-medium text-gray-900 mb-3">Card Analysis</h5>
              <div className="space-y-4">
                {aiReading.card_interpretations.map((cardInterp, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <span className="text-sm font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded">
                        Position {index + 1}
                      </span>
                      <span className="ml-3 font-medium text-gray-900">
                        {cardInterp.card_name}
                      </span>
                      {cardInterp.is_reversed && (
                        <span className="ml-2 text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                          Reversed
                        </span>
                      )}
                    </div>
                    <p className="text-gray-700 text-sm">
                      {cardInterp.interpretation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Themes */}
          {aiReading.key_themes && (
            <div className="mb-6">
              <h5 className="font-medium text-gray-900 mb-3">Key Themes</h5>
              <div className="flex flex-wrap gap-2">
                {aiReading.key_themes.map((theme, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-indigo-100 text-indigo-800 text-sm rounded-full"
                  >
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Advice */}
          {aiReading.advice && (
            <div>
              <h5 className="font-medium text-gray-900 mb-3">Guidance & Advice</h5>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800">
                  {aiReading.advice}
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No AI Reading Available</h3>
          <p className="text-gray-600 mb-4">Generate an AI reading to get insights and suggestions.</p>
          <button
            onClick={generateAIReading}
            disabled={!session?.cards_drawn?.length}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            Generate AI Reading
          </button>
        </div>
      )}
    </div>
  );

  const renderNotesView = () => (
    <div className="space-y-6">
      {/* Reader Notes */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Private Notes</h3>
        <textarea
          value={readerNotes}
          onChange={(e) => setReaderNotes(e.target.value)}
          placeholder="Add your private notes about this reading session..."
          className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
        />
      </div>

      {/* Client Interpretation */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Interpretation</h3>
        <textarea
          value={interpretation}
          onChange={(e) => setInterpretation(e.target.value)}
          placeholder="Write your interpretation for the client..."
          className="w-full h-48 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
        />
        
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-gray-500">
            This will be shared with the client
          </div>
          
          <button
            onClick={saveReaderInput}
            disabled={isUpdating}
            className="flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50"
          >
            {isUpdating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Save Reading
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-red-900 mb-2">Error</h3>
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={() => {
            setError('');
            loadSession();
          }}
          className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="bg-white rounded-lg p-8 text-center shadow-sm border">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"
        />
        <p className="text-gray-600">Loading session...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Tarot Reading Session</h1>
        <p className="text-gray-600">
          Manage your reading with AI assistance and client interaction tools
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <nav className="flex space-x-8">
          {[
            { id: 'cards', name: 'Cards & Session', icon: Eye },
            { id: 'ai', name: 'AI Assistant', icon: Brain },
            { id: 'notes', name: 'Notes & Reading', icon: MessageSquare }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'cards' && renderCardsView()}
          {activeTab === 'ai' && renderAIView()}
          {activeTab === 'notes' && renderNotesView()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default ReaderTarotView; 