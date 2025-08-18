import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, 
  Brain, 
  Shield, 
  AlertTriangle, 
  Clock, 
  CheckCircle,
  Users,
  Star,
  Volume2,
  VolumeX,
  Download,
  Share2,
  Lock,
  Zap,
  FileText,
  Monitor
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../hooks/useSocket';
import api from '../../services/frontendApi.js';

const ReaderAIDashboard = ({ sessionId, clientId, onInterpretationUpdate }) => {
  const { profile } = useAuth();
  const socket = useSocket();
  
  const [sessionData, setSessionData] = useState(null);
  const [openedCards, setOpenedCards] = useState([]);
  const [aiDrafts, setAiDrafts] = useState({});
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [readerNotes, setReaderNotes] = useState('');
  const [finalInterpretation, setFinalInterpretation] = useState('');
  const [activeTab, setActiveTab] = useState('cards');
  const [error, setError] = useState('');
  const [auditLog, setAuditLog] = useState([]);

  // Role-based access control
  const canAccessAI = ['reader', 'admin', 'super_admin'].includes(profile?.role);

  // Load session data
  useEffect(() => {
    if (sessionId) {
      loadSessionData();
    }
  }, [sessionId]);

  // WebSocket event handlers for live sync
  useEffect(() => {
    if (socket && sessionId) {
      socket.emit('join-reading-session', { sessionId, userType: 'reader' });
      
      // Listen for client card openings
      socket.on('card-opened', handleCardOpened);
      
      // Listen for session completion
      socket.on('session-completed', handleSessionCompleted);
      
      return () => {
        socket.off('card-opened');
        socket.off('session-completed');
      };
    }
  }, [socket, sessionId]);

  // Load session data from API
  const loadSessionData = async () => {
    try {
      const result = await api.getReadingSession(sessionId);
      if (result.success) {
        setSessionData(result.data);
        setOpenedCards(result.data.cards_drawn || []);
        setReaderNotes(result.data.notes || '');
        setFinalInterpretation(result.data.overall_interpretation || '');
        
        // Load existing AI drafts if available
        if (result.data.ai_insights) {
          setAiDrafts(result.data.ai_insights);
        }
      } else {
        setError('Failed to load session data');
      }
    } catch (err) {
      setError('Error loading session');
      console.error('Session loading error:', err);
    }
  };

  // Handle real-time card opening from client
  const handleCardOpened = useCallback((data) => {
    console.log('📡 Card opened by client:', data);
    
    const newCard = {
      ...data.cardData,
      position: data.cardIndex,
      position_name: data.position?.name || `Card ${data.cardIndex + 1}`,
      openedAt: new Date(data.timestamp).toISOString()
    };
    
    setOpenedCards(prev => {
      const updated = [...prev];
      updated[data.cardIndex] = newCard;
      return updated;
    });

    // Auto-generate AI draft for the opened card
    if (canAccessAI) {
      generateAIDraftForCard(newCard, data.cardIndex);
    }

    // Log the card opening event
    logAuditEvent('card_opened_by_client', {
      cardIndex: data.cardIndex,
      cardName: data.cardData?.name,
      timestamp: data.timestamp
    });
  }, [canAccessAI]);

  // Handle session completion
  const handleSessionCompleted = useCallback((data) => {
    console.log('📡 Session completed by client:', data);
    setOpenedCards(data.allCards || []);
    
    // Generate comprehensive AI analysis
    if (canAccessAI && data.allCards?.length > 0) {
      generateComprehensiveAIAnalysis(data.allCards);
    }

    logAuditEvent('session_completed', {
      totalCards: data.allCards?.length || 0,
      completedAt: data.completedAt
    });
  }, [canAccessAI]);

  // Generate AI draft for a specific card
  const generateAIDraftForCard = async (cardData, cardIndex) => {
    if (!canAccessAI) {
      logUnauthorizedAccess('ai_draft_generation_blocked');
      return;
    }

    setIsGeneratingAI(true);
    
    try {
      const result = await api.generateCardInterpretation(sessionId, {
        card: cardData,
        position: cardData.position_name,
        question: sessionData?.question,
        context: sessionData?.question_category
      });

      if (result.success) {
        setAiDrafts(prev => ({
          ...prev,
          [cardIndex]: {
            interpretation: result.data.interpretation,
            confidence_score: result.data.confidence_score,
            generated_at: new Date().toISOString(),
            model_version: result.data.model_version
          }
        }));

        // Log AI content generation
        logAIAccess('ai_draft_generated', cardData.id);
      } else {
        console.error('Failed to generate AI draft:', result.error);
      }
    } catch (err) {
      console.error('AI generation error:', err);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Generate comprehensive AI analysis for all cards
  const generateComprehensiveAIAnalysis = async (allCards) => {
    if (!canAccessAI) return;

    setIsGeneratingAI(true);

    try {
      const result = await api.generateFullReading(sessionId, {
        cards: allCards,
        spread: sessionData?.spread,
        question: sessionData?.question,
        category: sessionData?.question_category
      });

      if (result.success) {
        setAiDrafts(prev => ({
          ...prev,
          comprehensive: {
            overall_interpretation: result.data.overall_interpretation,
            key_themes: result.data.key_themes,
            card_relationships: result.data.card_relationships,
            guidance: result.data.guidance,
            confidence_score: result.data.confidence_score,
            generated_at: new Date().toISOString()
          }
        }));

        logAIAccess('comprehensive_ai_analysis_generated');
      }
    } catch (err) {
      console.error('Comprehensive AI analysis error:', err);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Log AI content access
  const logAIAccess = async (action, cardId = null) => {
    try {
      await fetch('/api/audit/ai-reading', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          session_id: sessionId,
          card_id: cardId,
          action,
          timestamp: new Date().toISOString(),
          metadata: { 
            component: 'ReaderAIDashboard',
            user_role: profile?.role,
            authorized: true
          }
        })
      });
    } catch (error) {
      console.error('Failed to log AI access:', error);
    }
  };

  // Log unauthorized access attempts
  const logUnauthorizedAccess = async (attemptedAction) => {
    try {
      await fetch('/api/audit/ai-reading', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          session_id: sessionId,
          action: 'unauthorized_access_attempt',
          timestamp: new Date().toISOString(),
          metadata: { 
            attempted_action: attemptedAction,
            user_role: profile?.role,
            blocked: true,
            security_level: 'high'
          }
        })
      });
    } catch (error) {
      console.error('Failed to log unauthorized access:', error);
    }
  };

  // Log general audit events
  const logAuditEvent = async (action, metadata = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action,
      metadata
    };
    
    setAuditLog(prev => [logEntry, ...prev].slice(0, 50)); // Keep last 50 events
  };

  // Save reader interpretation
  const saveInterpretation = async () => {
    try {
      const result = await api.updateReadingSession(sessionId, {
        notes: readerNotes,
        overall_interpretation: finalInterpretation,
        status: 'completed',
        completed_at: new Date().toISOString()
      });

      if (result.success) {
        onInterpretationUpdate && onInterpretationUpdate({
          notes: readerNotes,
          interpretation: finalInterpretation
        });
        
        logAuditEvent('interpretation_saved', {
          notes_length: readerNotes.length,
          interpretation_length: finalInterpretation.length
        });
      } else {
        setError('Failed to save interpretation');
      }
    } catch (err) {
      setError('Error saving interpretation');
      console.error('Save error:', err);
    }
  };

  // AI Content Warning Component
  const AIWarningHeader = () => (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-red-900/30 border-2 border-red-500/50 rounded-xl p-4 mb-4"
    >
      <div className="flex items-center gap-2 text-red-300 mb-2">
        <Shield className="w-6 h-6" />
        <span className="font-bold text-lg">⚠️ ASSISTANT DRAFT – NOT FOR CLIENT DELIVERY</span>
      </div>
      <p className="text-red-200 text-sm">
        This AI-generated content is for reader reference only. Do not copy, share, or deliver directly to clients.
        All access to this content is monitored and logged.
      </p>
    </motion.div>
  );

  // Copy-Protected Content Wrapper
  const CopyProtectedContent = ({ children, contentType = 'ai_content' }) => {
    const handleCopyAttempt = useCallback((e) => {
      e.preventDefault();
      logAuditEvent('copy_attempt_blocked', { contentType });
      console.warn('🚫 Copy attempt blocked on AI content');
    }, [contentType]);

    const handleContextMenu = useCallback((e) => {
      e.preventDefault();
      logAuditEvent('context_menu_blocked', { contentType });
    }, [contentType]);

    const handleSelectStart = useCallback((e) => {
      e.preventDefault();
    }, []);

    useEffect(() => {
      // Log AI content view
      logAIAccess('ai_content_viewed');
    }, []);

    return (
      <div
        onCopy={handleCopyAttempt}
        onContextMenu={handleContextMenu}
        onSelectStart={handleSelectStart}
        onDragStart={(e) => e.preventDefault()}
        style={{ 
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
          WebkitTouchCallout: 'none',
          WebkitUserDrag: 'none'
        }}
        className="relative"
      >
        {/* Semi-transparent overlay to prevent selection */}
        <div className="absolute inset-0 bg-transparent z-10 pointer-events-none" />
        
        <div className="relative z-0">
          {children}
        </div>

        {/* Watermark */}
        <div className="absolute top-2 right-2 text-xs text-red-400 font-mono opacity-50 pointer-events-none">
          AI-DRAFT-CONFIDENTIAL
        </div>
      </div>
    );
  };

  // Render unauthorized access warning
  if (!canAccessAI) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-pink-950 p-6 flex items-center justify-center">
        <div className="max-w-md mx-auto bg-red-900/30 border-2 border-red-500/50 rounded-xl p-8 text-center">
          <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-300 mb-4">Access Denied</h2>
          <p className="text-red-200 mb-4">
            You do not have permission to access AI content. Only authorized readers, admins, and super admins can view AI drafts.
          </p>
          <p className="text-red-300 text-sm">
            This access attempt has been logged for security purposes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="reader-ai-dashboard min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-pink-950 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Reader Dashboard</h1>
        <p className="text-purple-300">Session ID: {sessionId}</p>
        {sessionData?.question && (
          <div className="mt-4 p-4 bg-purple-900/30 rounded-lg border border-purple-500/30">
            <p className="text-purple-200 text-sm font-medium mb-1">Client's Question:</p>
            <p className="text-white italic">"{sessionData.question}"</p>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-lg"
        >
          <p className="text-red-300 text-sm">{error}</p>
        </motion.div>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-purple-900/20 rounded-lg p-1">
        {[
          { id: 'cards', label: 'Live Cards', icon: Eye },
          { id: 'ai', label: 'AI Drafts', icon: Brain },
          { id: 'notes', label: 'Interpretation', icon: FileText },
          { id: 'audit', label: 'Audit Log', icon: Monitor }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white shadow-lg'
                : 'text-purple-300 hover:bg-purple-800/50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="font-medium">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* Live Cards Tab */}
        {activeTab === 'cards' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-purple-900/20 rounded-xl border border-purple-500/30 p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Client's Card Progress
              </h3>
              
              {openedCards.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {openedCards.map((cardData, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-purple-800/30 rounded-lg p-4 border border-purple-500/30"
                    >
                      {/* Position Label */}
                      <div className="mb-3">
                        <span className="text-sm font-medium text-purple-300 bg-purple-900/50 px-2 py-1 rounded-full">
                          {cardData.position_name || `Card ${index + 1}`}
                        </span>
                      </div>

                      {/* Card Display */}
                      <div className="relative w-20 h-32 mx-auto mb-4">
                        <div className="w-full h-full bg-white rounded-lg shadow-lg border-2 border-gold-400 overflow-hidden">
                          {cardData.image_url ? (
                            <img
                              src={cardData.is_reversed ? 
                                cardData.image_reversed_url || cardData.image_url : 
                                cardData.image_url
                              }
                              alt={cardData.name}
                              className={`w-full h-full object-cover ${
                                cardData.is_reversed ? 'transform rotate-180' : ''
                              }`}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-indigo-100">
                              <div className="text-center p-2">
                                <Star className="w-4 h-4 mx-auto mb-1 text-purple-600" />
                                <div className="text-xs font-medium text-purple-800">
                                  {cardData.name}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {cardData.is_reversed && (
                          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                            Reversed
                          </div>
                        )}
                      </div>

                      {/* Card Info */}
                      <div className="text-center">
                        <h4 className="font-semibold text-white mb-1">
                          {cardData.name}
                        </h4>
                        <p className="text-sm text-purple-300">
                          {cardData.suit && cardData.suit !== 'major_arcana' && (
                            <span className="capitalize">{cardData.suit}</span>
                          )}
                          {cardData.arcana_type === 'major' && (
                            <span>Major Arcana</span>
                          )}
                        </p>
                        
                        {cardData.openedAt && (
                          <p className="text-xs text-purple-400 mt-2">
                            Opened: {new Date(cardData.openedAt).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">Waiting for Client</h3>
                  <p className="text-purple-300">The client hasn't started opening cards yet.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* AI Drafts Tab */}
        {activeTab === 'ai' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <AIWarningHeader />
            
            <div className="bg-purple-900/20 rounded-xl border border-purple-500/30 p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Brain className="w-5 h-5" />
                AI Content Drafts
              </h3>
              
              {Object.keys(aiDrafts).length > 0 ? (
                <div className="space-y-6">
                  {/* Individual Card Drafts */}
                  {Object.entries(aiDrafts).map(([cardIndex, draft]) => {
                    if (cardIndex === 'comprehensive') return null;
                    
                    const cardData = openedCards[parseInt(cardIndex)];
                    if (!cardData) return null;

                    return (
                      <div key={cardIndex} className="bg-purple-800/30 rounded-lg p-4 border border-purple-500/30">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-sm font-medium text-purple-300 bg-purple-900/50 px-2 py-1 rounded-full">
                            {cardData.position_name || `Card ${parseInt(cardIndex) + 1}`}
                          </span>
                          <span className="text-white font-medium">{cardData.name}</span>
                          {cardData.is_reversed && (
                            <span className="text-xs text-red-400 bg-red-900/30 px-2 py-1 rounded">
                              Reversed
                            </span>
                          )}
                        </div>
                        
                        <CopyProtectedContent contentType={`card_${cardIndex}_interpretation`}>
                          <div className="bg-purple-900/40 rounded-lg p-4 border border-purple-600/30">
                            <p className="text-purple-100 leading-relaxed">{draft.interpretation}</p>
                            
                            {draft.confidence_score && (
                              <div className="mt-3 flex items-center gap-2 text-xs text-purple-400">
                                <Zap className="w-3 h-3" />
                                <span>Confidence: {(draft.confidence_score * 100).toFixed(1)}%</span>
                                {draft.generated_at && (
                                  <span className="ml-2">
                                    Generated: {new Date(draft.generated_at).toLocaleTimeString()}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </CopyProtectedContent>
                      </div>
                    );
                  })}

                  {/* Comprehensive Analysis */}
                  {aiDrafts.comprehensive && (
                    <div className="bg-purple-800/30 rounded-lg p-4 border border-purple-500/30">
                      <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <Brain className="w-5 h-5" />
                        Comprehensive Analysis
                      </h4>
                      
                      <CopyProtectedContent contentType="comprehensive_analysis">
                        <div className="space-y-4">
                          {aiDrafts.comprehensive.overall_interpretation && (
                            <div className="bg-purple-900/40 rounded-lg p-4">
                              <h5 className="text-purple-300 font-medium mb-2">Overall Interpretation</h5>
                              <p className="text-purple-100 leading-relaxed">
                                {aiDrafts.comprehensive.overall_interpretation}
                              </p>
                            </div>
                          )}
                          
                          {aiDrafts.comprehensive.key_themes && (
                            <div className="bg-purple-900/40 rounded-lg p-4">
                              <h5 className="text-purple-300 font-medium mb-2">Key Themes</h5>
                              <div className="flex flex-wrap gap-2">
                                {aiDrafts.comprehensive.key_themes.map((theme, index) => (
                                  <span
                                    key={index}
                                    className="px-3 py-1 bg-indigo-900/50 text-indigo-200 text-sm rounded-full border border-indigo-500/30"
                                  >
                                    {theme}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {aiDrafts.comprehensive.guidance && (
                            <div className="bg-purple-900/40 rounded-lg p-4">
                              <h5 className="text-purple-300 font-medium mb-2">Guidance</h5>
                              <p className="text-purple-100 leading-relaxed">
                                {aiDrafts.comprehensive.guidance}
                              </p>
                            </div>
                          )}
                        </div>
                      </CopyProtectedContent>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Brain className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No AI Drafts Available</h3>
                  <p className="text-purple-300">AI drafts will be generated as the client opens cards.</p>
                  {isGeneratingAI && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="mt-4"
                    >
                      <Zap className="w-8 h-8 text-gold-400 mx-auto" />
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Reader Notes & Interpretation Tab */}
        {activeTab === 'notes' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-purple-900/20 rounded-xl border border-purple-500/30 p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Your Interpretation
              </h3>
              
              {/* Reader Notes */}
              <div className="mb-6">
                <label className="block text-purple-300 font-medium mb-2">
                  Private Notes
                </label>
                <textarea
                  value={readerNotes}
                  onChange={(e) => setReaderNotes(e.target.value)}
                  className="w-full h-32 bg-purple-900/40 border border-purple-600/30 rounded-lg p-4 text-white placeholder-purple-400 focus:outline-none focus:border-purple-400"
                  placeholder="Your private notes about this reading..."
                />
              </div>

              {/* Final Interpretation */}
              <div className="mb-6">
                <label className="block text-purple-300 font-medium mb-2">
                  Client Interpretation
                </label>
                <textarea
                  value={finalInterpretation}
                  onChange={(e) => setFinalInterpretation(e.target.value)}
                  className="w-full h-48 bg-purple-900/40 border border-purple-600/30 rounded-lg p-4 text-white placeholder-purple-400 focus:outline-none focus:border-purple-400"
                  placeholder="Write your interpretation for the client here..."
                />
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  onClick={saveInterpretation}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg"
                >
                  Save Interpretation
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Audit Log Tab */}
        {activeTab === 'audit' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-purple-900/20 rounded-xl border border-purple-500/30 p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                Session Audit Log
              </h3>
              
              {auditLog.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {auditLog.map((entry, index) => (
                    <div
                      key={index}
                      className="bg-purple-800/30 rounded-lg p-3 border border-purple-600/30"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-purple-300 font-medium text-sm">
                          {entry.action.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        <span className="text-purple-400 text-xs">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                        <div className="text-purple-200 text-xs">
                          {JSON.stringify(entry.metadata, null, 2)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Monitor className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                  <p className="text-purple-300">No audit events recorded yet.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Loading Overlay */}
      {isGeneratingAI && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        >
          <div className="bg-gradient-to-br from-purple-900 to-indigo-900 p-8 rounded-xl border-2 border-gold-400 text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="mb-4"
            >
              <Brain className="w-12 h-12 text-gold-400 mx-auto" />
            </motion.div>
            <h3 className="text-xl font-bold text-white mb-2">
              Generating AI Draft
            </h3>
            <p className="text-purple-200">
              Creating interpretation draft for your reference...
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ReaderAIDashboard; 