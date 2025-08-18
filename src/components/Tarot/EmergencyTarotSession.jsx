import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  Clock, 
  Phone, 
  Sparkles,
  CheckCircle,
  XCircle,
  Loader
} from 'lucide-react';
import api from '../../services/frontendApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import TarotCardPicker from './TarotCardPicker.jsx';
import ReaderTarotView from './ReaderTarotView.jsx';

const EmergencyTarotSession = ({ 
  bookingId, 
  callId,
  isReader = false,
  onSessionComplete,
  onSessionCancel 
}) => {
  const { user } = useAuth();
  const [sessionState, setSessionState] = useState('initializing'); // initializing, waiting, active, completed, cancelled
  const [session, setSession] = useState(null);
  const [spreadConfig, setSpreadConfig] = useState(null);
  const [error, setError] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(null);

  useEffect(() => {
    initializeEmergencySession();
  }, [bookingId]);

  useEffect(() => {
    // Set up timer for emergency session timeout
    if (sessionState === 'waiting' && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleSessionTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [sessionState, timeRemaining]);

  const initializeEmergencySession = async () => {
    try {
      setSessionState('initializing');
      setError('');

      // Create emergency tarot session
      const sessionResult = await api.createEmergencySession({
        booking_id: bookingId,
        call_id: callId,
        user_id: user.id,
        session_type: 'emergency_tarot'
      });

      if (!sessionResult.success) {
        throw new Error(sessionResult.error);
      }

      // Get quick 3-card spread for emergency readings
      const spreadResult = await api.getSpread('emergency-3-card');
      if (!spreadResult.success) {
        // Fallback to simple 3-card spread
        setSpreadConfig({
          id: 'emergency-default',
          name: 'Emergency Reading',
          card_count: 3,
          positions: [
            { name: 'Current Situation', meaning: 'What is happening now' },
            { name: 'Challenge', meaning: 'What needs attention' },
            { name: 'Guidance', meaning: 'What you need to know' }
          ]
        });
      } else {
        setSpreadConfig(spreadResult.data);
      }

      setSession(sessionResult.data);
      setSessionState('waiting');
      setTimeRemaining(300); // 5 minutes for emergency card selection

    } catch (err) {
      setError(err.message || 'Failed to initialize emergency session');
      setSessionState('cancelled');
    }
  };

  const handleCardsSelected = async (selectedCards) => {
    try {
      setSessionState('active');
      
      // Update session with selected cards
      const updateResult = await api.updateEmergencySession(session.id, {
        cards_drawn: selectedCards,
        status: 'cards_selected',
        cards_selected_at: new Date().toISOString()
      });

      if (updateResult.success) {
        setSession(updateResult.data);
        
        // Notify reader if this is client view
        if (!isReader) {
          onSessionComplete && onSessionComplete({
            session: updateResult.data,
            cards: selectedCards
          });
        }
      }
    } catch (err) {
      setError('Failed to save card selection');
    }
  };

  const handleSessionTimeout = () => {
    setSessionState('cancelled');
    setError('Emergency session timed out');
    onSessionCancel && onSessionCancel('timeout');
  };

  const handleSessionComplete = (readingData) => {
    setSessionState('completed');
    onSessionComplete && onSessionComplete(readingData);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderInitializing = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-12"
    >
      <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Loader className="w-8 h-8 text-white" />
        </motion.div>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        Preparing Emergency Reading
      </h2>
      <p className="text-gray-600">
        Setting up your urgent tarot session...
      </p>
    </motion.div>
  );

  const renderWaiting = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-8"
    >
      {/* Emergency Header */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-6 mb-8">
        <div className="flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-red-600 mr-3" />
          <h2 className="text-2xl font-bold text-red-900">Emergency Tarot Reading</h2>
        </div>
        
        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center text-red-700">
            <Phone className="w-4 h-4 mr-2" />
            <span>During Call</span>
          </div>
          
          {timeRemaining && (
            <div className="flex items-center text-orange-700">
              <Clock className="w-4 h-4 mr-2" />
              <span className="font-mono font-bold">
                {formatTime(timeRemaining)} remaining
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="max-w-md mx-auto mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Quick Guidance Needed
        </h3>
        <p className="text-gray-600 mb-4">
          Select 3 cards quickly for immediate insight during your call. 
          This reading will help provide clarity on your urgent situation.
        </p>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> You have {timeRemaining && formatTime(timeRemaining)} to select your cards 
            before the session times out.
          </p>
        </div>
      </div>

      {/* Card Picker for Client */}
      {!isReader && spreadConfig && (
        <TarotCardPicker
          bookingId={bookingId}
          sessionId={session?.id}
          spreadConfig={spreadConfig}
          onCardsSelected={handleCardsSelected}
          onSessionComplete={handleSessionComplete}
        />
      )}

      {/* Waiting message for Reader */}
      {isReader && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8">
          <Sparkles className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Waiting for Client
          </h3>
          <p className="text-blue-700">
            Your client is selecting cards for an emergency reading. 
            You&apos;ll see their cards once they&apos;re done.
          </p>
          
          {timeRemaining && (
            <div className="mt-4 text-sm text-blue-600">
              Time remaining: <span className="font-mono font-bold">
                {formatTime(timeRemaining)}
              </span>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );

  const renderActive = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="py-6"
    >
      {/* Session Header */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-center">
          <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
          <h3 className="text-lg font-semibold text-green-900">
            Emergency Reading Active
          </h3>
        </div>
      </div>

      {/* Reader View */}
      {isReader && session && (
        <ReaderTarotView
          sessionId={session.id}
          bookingId={bookingId}
          clientId={session.client_id}
          onReadingUpdate={handleSessionComplete}
        />
      )}

      {/* Client View - Show selected cards */}
      {!isReader && session?.cards_drawn && (
        <div className="text-center">
          <h3 className="text-xl font-bold text-gray-900 mb-6">
            Your Emergency Cards
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-8">
            {session.cards_drawn.map((cardData, index) => (
              <motion.div
                key={cardData.card_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.2 }}
                className="text-center"
              >
                <div className="mb-3">
                  <span className="text-sm font-medium text-purple-600 bg-purple-100 px-3 py-1 rounded-full">
                    {spreadConfig?.positions[index]?.name || `Card ${index + 1}`}
                  </span>
                </div>
                
                <div className="w-32 h-48 mx-auto mb-4 bg-white rounded-lg shadow-lg border-2 border-gray-200 overflow-hidden">
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
                        <Sparkles className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                        <div className="text-sm font-medium text-purple-800">
                          {cardData.card?.name || 'Unknown Card'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <h4 className="font-semibold text-gray-900">
                  {cardData.card?.name || 'Unknown Card'}
                  {cardData.is_reversed && (
                    <span className="text-red-600 text-sm ml-2">(Reversed)</span>
                  )}
                </h4>
              </motion.div>
            ))}
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h4 className="font-semibold text-blue-900 mb-2">
              Reading in Progress
            </h4>
            <p className="text-blue-700">
              Your reader is interpreting your cards. Continue your call while they prepare your reading.
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );

  const renderCompleted = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-12"
    >
      <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        Emergency Reading Complete
      </h2>
      <p className="text-gray-600 mb-6">
        Your urgent tarot reading has been completed. Continue your call with your reader.
      </p>
    </motion.div>
  );

  const renderCancelled = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-12"
    >
      <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
        <XCircle className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        Session Cancelled
      </h2>
      <p className="text-gray-600 mb-6">
        {error || 'The emergency reading session was cancelled.'}
      </p>
      
      <button
        onClick={initializeEmergencySession}
        className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
      >
        Try Again
      </button>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 p-4">
      <div className="max-w-6xl mx-auto">
        <AnimatePresence mode="wait">
          {sessionState === 'initializing' && renderInitializing()}
          {sessionState === 'waiting' && renderWaiting()}
          {sessionState === 'active' && renderActive()}
          {sessionState === 'completed' && renderCompleted()}
          {sessionState === 'cancelled' && renderCancelled()}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default EmergencyTarotSession; 