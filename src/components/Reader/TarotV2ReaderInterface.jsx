import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, EyeOff, Edit3, Save, Check, X, AlertTriangle, 
  Clock, User, Sparkles, Lock, Unlock, Star, MessageSquare,
  ThumbsUp, ThumbsDown, FileText, Settings
} from 'lucide-react';
import { getRTLClasses, getMobileRowClasses } from '../../utils/rtlUtils';
import { useResponsive } from '../../hooks/useResponsive';

const TarotV2ReaderInterface = ({ readingId, onClose }) => {
  const [reading, setReading] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingInterpretation, setEditingInterpretation] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [interpretationEdits, setInterpretationEdits] = useState({});
  const [approving, setApproving] = useState(false);
  const { isMobile } = useResponsive();

  useEffect(() => {
    if (readingId) {
      fetchReading();
    }
  }, [readingId]);

  const fetchReading = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tarot-v2/reader/readings/${readingId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch reading');
      }

      const data = await response.json();
      setReading(data.data);
      
      // Initialize edit states
      const editStates = {};
      data.data.interpretations?.forEach(interp => {
        editStates[interp.id] = {
          reader_interpretation_final: interp.reader_interpretation_final || interp.ai_interpretation_draft || '',
          reader_keywords: interp.reader_keywords || interp.ai_keywords || [],
          reader_notes: interp.reader_notes || '',
          reader_confidence: interp.reader_confidence || 4,
          reader_approved: interp.reader_approved || false
        };
      });
      setInterpretationEdits(editStates);
      setError(null);
    } catch (err) {
      console.error('Error fetching reading:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateInterpretation = async (interpretationId, updates) => {
    try {
      const response = await fetch(`/api/tarot-v2/reader/readings/${readingId}/interpretations/${interpretationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update interpretation');
      }

      // Refresh reading data
      await fetchReading();
      setEditingInterpretation(null);
    } catch (err) {
      console.error('Error updating interpretation:', err);
      alert('Failed to update interpretation: ' + err.message);
    }
  };

  const approveForReveal = async () => {
    try {
      setApproving(true);
      const response = await fetch(`/api/tarot-v2/reader/readings/${readingId}/approve-for-reveal`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to approve reading');
      }

      alert('Reading approved and revealed to client successfully!');
      await fetchReading();
    } catch (err) {
      console.error('Error approving reading:', err);
      alert('Failed to approve reading: ' + err.message);
    } finally {
      setApproving(false);
    }
  };

  const handleEditSave = (interpretationId) => {
    const edits = interpretationEdits[interpretationId];
    if (!edits) return;

    updateInterpretation(interpretationId, edits);
  };

  const handleEditCancel = (interpretationId) => {
    // Reset to original values
    const original = reading.interpretations.find(i => i.id === interpretationId);
    if (original) {
      setInterpretationEdits(prev => ({
        ...prev,
        [interpretationId]: {
          reader_interpretation_final: original.reader_interpretation_final || original.ai_interpretation_draft || '',
          reader_keywords: original.reader_keywords || original.ai_keywords || [],
          reader_notes: original.reader_notes || '',
          reader_confidence: original.reader_confidence || 4,
          reader_approved: original.reader_approved || false
        }
      }));
    }
    setEditingInterpretation(null);
  };

  const updateEditState = (interpretationId, field, value) => {
    setInterpretationEdits(prev => ({
      ...prev,
      [interpretationId]: {
        ...prev[interpretationId],
        [field]: value
      }
    }));
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'ai_draft_ready': { 
        icon: Sparkles, 
        color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
        text: 'AI Draft Ready' 
      },
      'reader_reviewing': { 
        icon: Eye, 
        color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
        text: 'Under Review' 
      },
      'reader_editing': { 
        icon: Edit3, 
        color: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
        text: 'Being Edited' 
      },
      'reader_approved': { 
        icon: Check, 
        color: 'text-green-400 bg-green-500/10 border-green-500/30',
        text: 'Approved' 
      },
      'ready_for_reveal': { 
        icon: Unlock, 
        color: 'text-cosmic-accent bg-cosmic-accent/10 border-cosmic-accent/30',
        text: 'Ready for Reveal' 
      },
      'revealed_to_client': { 
        icon: Eye, 
        color: 'text-green-400 bg-green-500/10 border-green-500/30',
        text: 'Revealed to Client' 
      }
    };

    const config = statusConfig[status] || { 
      icon: Clock, 
      color: 'text-cosmic-text/60 bg-cosmic-panel/10 border-cosmic-accent/20',
      text: 'Processing' 
    };
    
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.text}
      </span>
    );
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 4) return 'text-green-400';
    if (confidence >= 3) return 'text-yellow-400';
    return 'text-red-400';
  };

  const canApproveReading = () => {
    if (!reading?.interpretations) return false;
    return reading.interpretations.every(interp => 
      interpretationEdits[interp.id]?.reader_approved || interp.reader_approved
    );
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'interpretations', label: 'Interpretations', icon: MessageSquare },
    { id: 'client-info', label: 'Client Info', icon: User }
  ];

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 border-2 border-cosmic-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-cosmic-text/70">Loading reading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-red-400/50 mx-auto mb-4" />
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={fetchReading}
          className="px-4 py-2 bg-cosmic-accent hover:bg-cosmic-accent/80 rounded-lg text-white transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!reading) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 text-cosmic-text/30 mx-auto mb-4" />
        <p className="text-cosmic-text/60">Reading not found</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${getRTLClasses()}`}>
      {/* Header */}
      <div className="bg-cosmic-panel/20 backdrop-blur-sm border border-cosmic-accent/30 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-cosmic-text mb-2">
              Reader Interface: {reading.tarot_spreads?.name || 'Tarot Reading'}
            </h2>
            <p className="text-cosmic-text/70 text-sm">
              Client: {reading.profiles?.display_name || reading.profiles?.first_name || 'Anonymous'} • 
              {reading.total_cards} cards • ${reading.total_price_usd}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {getStatusBadge(reading.status)}
            
            {/* AI Content Warning */}
            <div className="flex items-center gap-1 px-2 py-1 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-xs">
              <Lock className="w-3 h-3" />
              <span>AI Protected</span>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-cosmic-text/60 block">Created</span>
            <span className="text-cosmic-text font-medium">
              {new Date(reading.created_at).toLocaleDateString()}
            </span>
          </div>
          
          <div>
            <span className="text-cosmic-text/60 block">AI Confidence</span>
            <span className={`font-medium ${getConfidenceColor(reading.ai_confidence_score * 5)}`}>
              {reading.ai_confidence_score ? `${Math.round(reading.ai_confidence_score * 100)}%` : 'N/A'}
            </span>
          </div>
          
          <div>
            <span className="text-cosmic-text/60 block">Modifications</span>
            <span className="text-cosmic-text font-medium">
              {reading.reader_modifications_count || 0}
            </span>
          </div>
          
          <div>
            <span className="text-cosmic-text/60 block">Payment</span>
            <span className={`font-medium ${
              reading.payment_status === 'paid' ? 'text-green-400' : 'text-yellow-400'
            }`}>
              {reading.payment_status}
            </span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-1 bg-cosmic-panel/20 p-1 rounded-xl`}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 flex-1
                ${activeTab === tab.id 
                  ? 'bg-cosmic-accent text-white shadow-lg' 
                  : 'text-cosmic-text/70 hover:text-cosmic-text hover:bg-cosmic-panel/30'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {!isMobile && <span className="font-medium">{tab.label}</span>}
            </button>
          );
        })}
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
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Reading Summary */}
              <div className="bg-cosmic-panel/20 backdrop-blur-sm border border-cosmic-accent/30 rounded-xl p-6">
                <h3 className="text-lg font-bold text-cosmic-text mb-4">Reading Summary</h3>
                
                <div className="space-y-4">
                  <div>
                    <span className="text-cosmic-text/60 text-sm block mb-1">Spread</span>
                    <p className="text-cosmic-text">{reading.tarot_spreads?.name}</p>
                    {reading.tarot_spreads?.description && (
                      <p className="text-cosmic-text/70 text-sm mt-1">{reading.tarot_spreads?.description}</p>
                    )}
                  </div>
                  
                  <div>
                    <span className="text-cosmic-text/60 text-sm block mb-1">Deck</span>
                    <p className="text-cosmic-text">{reading.tarot_decks?.name}</p>
                    {reading.tarot_decks?.description && (
                      <p className="text-cosmic-text/70 text-sm mt-1">{reading.tarot_decks?.description}</p>
                    )}
                  </div>

                  {reading.ai_model_used && (
                    <div>
                      <span className="text-cosmic-text/60 text-sm block mb-1">AI Model</span>
                      <p className="text-cosmic-text">{reading.ai_model_used}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Approval Section */}
              {canApproveReading() && reading.status !== 'revealed_to_client' && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
                  <div className="flex items-start gap-3">
                    <Check className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-green-400 font-semibold mb-2">
                        Ready for Client Reveal
                      </h3>
                      <p className="text-green-400/80 text-sm mb-4">
                        All interpretations have been reviewed and approved. You can now reveal this reading to the client.
                      </p>
                      
                      <button
                        onClick={approveForReveal}
                        disabled={approving}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-500/30 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
                      >
                        {approving ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Revealing...
                          </>
                        ) : (
                          <>
                            <Unlock className="w-4 h-4" />
                            Reveal to Client
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'interpretations' && (
            <div className="space-y-6">
              {reading.interpretations?.map((interpretation) => {
                const isEditing = editingInterpretation === interpretation.id;
                const editData = interpretationEdits[interpretation.id] || {};
                
                return (
                  <motion.div
                    key={interpretation.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-cosmic-panel/20 backdrop-blur-sm border border-cosmic-accent/30 rounded-xl p-6"
                  >
                    {/* Card Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-semibold text-cosmic-text">
                          {interpretation.position_name} - {interpretation.tarot_cards?.name}
                        </h4>
                        <p className="text-cosmic-text/60 text-sm">
                          Position {interpretation.position_in_spread} • {interpretation.card_orientation}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {interpretation.reader_approved && (
                          <span className="px-2 py-1 bg-green-500/10 border border-green-500/30 rounded text-green-400 text-xs">
                            Approved
                          </span>
                        )}
                        
                        <button
                          onClick={() => setEditingInterpretation(isEditing ? null : interpretation.id)}
                          className="p-2 text-cosmic-text/60 hover:text-cosmic-accent rounded-lg hover:bg-cosmic-panel/20 transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* AI Draft (Always visible to readers) */}
                    <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-blue-400" />
                        <span className="text-blue-400 font-medium text-sm">AI Draft (Reader Only)</span>
                      </div>
                      <p className="text-blue-400/80 text-sm">
                        {interpretation.ai_interpretation_draft || 'No AI draft available'}
                      </p>
                      {interpretation.ai_keywords && interpretation.ai_keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {interpretation.ai_keywords.map((keyword, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 bg-blue-500/20 border border-blue-500/30 rounded text-blue-400 text-xs"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Reader Interpretation */}
                    {isEditing ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-cosmic-text mb-2">
                            Final Interpretation (Visible to Client)
                          </label>
                          <textarea
                            value={editData.reader_interpretation_final || ''}
                            onChange={(e) => updateEditState(interpretation.id, 'reader_interpretation_final', e.target.value)}
                            className="w-full px-3 py-2 bg-cosmic-dark/50 border border-cosmic-accent/30 rounded-lg text-cosmic-text placeholder-cosmic-text/50 focus:border-cosmic-accent focus:outline-none resize-none"
                            rows="4"
                            placeholder="Edit the interpretation that will be shown to the client..."
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-cosmic-text mb-2">
                            Keywords (comma-separated)
                          </label>
                          <input
                            type="text"
                            value={Array.isArray(editData.reader_keywords) ? editData.reader_keywords.join(', ') : ''}
                            onChange={(e) => updateEditState(interpretation.id, 'reader_keywords', e.target.value.split(',').map(k => k.trim()).filter(k => k))}
                            className="w-full px-3 py-2 bg-cosmic-dark/50 border border-cosmic-accent/30 rounded-lg text-cosmic-text placeholder-cosmic-text/50 focus:border-cosmic-accent focus:outline-none"
                            placeholder="love, growth, opportunity..."
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-cosmic-text mb-2">
                              Confidence Level
                            </label>
                            <select
                              value={editData.reader_confidence || 4}
                              onChange={(e) => updateEditState(interpretation.id, 'reader_confidence', parseInt(e.target.value))}
                              className="w-full px-3 py-2 bg-cosmic-dark/50 border border-cosmic-accent/30 rounded-lg text-cosmic-text focus:border-cosmic-accent focus:outline-none"
                            >
                              <option value={1}>1 - Low Confidence</option>
                              <option value={2}>2 - Below Average</option>
                              <option value={3}>3 - Average</option>
                              <option value={4}>4 - High Confidence</option>
                              <option value={5}>5 - Very High Confidence</option>
                            </select>
                          </div>

                          <div className="flex items-end">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editData.reader_approved || false}
                                onChange={(e) => updateEditState(interpretation.id, 'reader_approved', e.target.checked)}
                                className="w-4 h-4 text-cosmic-accent bg-cosmic-dark border-cosmic-accent/30 rounded focus:ring-cosmic-accent"
                              />
                              <span className="text-sm font-medium text-cosmic-text">
                                Approve for Client
                              </span>
                            </label>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-cosmic-text mb-2">
                            Internal Notes (Reader Only)
                          </label>
                          <textarea
                            value={editData.reader_notes || ''}
                            onChange={(e) => updateEditState(interpretation.id, 'reader_notes', e.target.value)}
                            className="w-full px-3 py-2 bg-cosmic-dark/50 border border-cosmic-accent/30 rounded-lg text-cosmic-text placeholder-cosmic-text/50 focus:border-cosmic-accent focus:outline-none resize-none"
                            rows="2"
                            placeholder="Internal notes for your reference..."
                          />
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={() => handleEditSave(interpretation.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-cosmic-accent hover:bg-cosmic-accent/80 rounded-lg text-white font-medium transition-colors"
                          >
                            <Save className="w-4 h-4" />
                            Save Changes
                          </button>
                          
                          <button
                            onClick={() => handleEditCancel(interpretation.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-cosmic-panel/20 hover:bg-cosmic-panel/30 border border-cosmic-accent/30 rounded-lg text-cosmic-text transition-colors"
                          >
                            <X className="w-4 h-4" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {interpretation.reader_interpretation_final ? (
                          <div className="p-3 bg-cosmic-accent/10 border border-cosmic-accent/30 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Eye className="w-4 h-4 text-cosmic-accent" />
                              <span className="text-cosmic-accent font-medium text-sm">Final Interpretation (Client Visible)</span>
                            </div>
                            <p className="text-cosmic-text text-sm">
                              {interpretation.reader_interpretation_final}
                            </p>
                          </div>
                        ) : (
                          <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-yellow-400" />
                              <span className="text-yellow-400 text-sm">No final interpretation yet - click edit to create</span>
                            </div>
                          </div>
                        )}

                        {interpretation.reader_notes && (
                          <div className="p-3 bg-cosmic-panel/10 border border-cosmic-accent/20 rounded-lg">
                            <span className="text-cosmic-text/60 text-sm block mb-1">Internal Notes:</span>
                            <p className="text-cosmic-text/80 text-sm">{interpretation.reader_notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}

          {activeTab === 'client-info' && (
            <div className="bg-cosmic-panel/20 backdrop-blur-sm border border-cosmic-accent/30 rounded-xl p-6">
              <h3 className="text-lg font-bold text-cosmic-text mb-4">Client Information</h3>
              
              <div className="space-y-4">
                <div>
                  <span className="text-cosmic-text/60 text-sm block mb-1">Name</span>
                  <p className="text-cosmic-text">
                    {reading.profiles?.display_name || 
                     `${reading.profiles?.first_name || ''} ${reading.profiles?.last_name || ''}`.trim() ||
                     'Anonymous Client'}
                  </p>
                </div>
                
                <div>
                  <span className="text-cosmic-text/60 text-sm block mb-1">Email</span>
                  <p className="text-cosmic-text">{reading.profiles?.email || 'Not provided'}</p>
                </div>
                
                <div>
                  <span className="text-cosmic-text/60 text-sm block mb-1">Reading Requested</span>
                  <p className="text-cosmic-text">
                    {new Date(reading.created_at).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>

                <div>
                  <span className="text-cosmic-text/60 text-sm block mb-1">Payment Status</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    reading.payment_status === 'paid' 
                      ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                      : 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400'
                  }`}>
                    {reading.payment_status}
                  </span>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Action Footer */}
      <div className="flex gap-3">
        <button
          onClick={fetchReading}
          className="flex-1 px-4 py-3 bg-cosmic-panel/20 hover:bg-cosmic-panel/30 border border-cosmic-accent/30 rounded-lg text-cosmic-text transition-colors"
        >
          Refresh
        </button>
        
        {onClose && (
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-cosmic-accent hover:bg-cosmic-accent/80 rounded-lg text-white font-medium transition-colors"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
};

export default TarotV2ReaderInterface;