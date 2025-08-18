import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';

const SpreadApprovalTab = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [pendingSpreads, setPendingSpreads] = useState([]);
  const [selectedSpread, setSelectedSpread] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [spreadStats, setSpreadStats] = useState({});
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionReasonAr, setRejectionReasonAr] = useState('');

  useEffect(() => {
    loadPendingSpreads();
    loadSpreadStats();
  }, []);

  const loadPendingSpreads = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/spread-manager/spreads?status=pending', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to load pending spreads');

      const data = await response.json();
      setPendingSpreads(data.data || []);
    } catch (error) {
      console.error('Error loading pending spreads:', error);
      toast.error('Error loading pending spreads');
    } finally {
      setLoading(false);
    }
  };

  const loadSpreadStats = async () => {
    try {
      const response = await fetch('/api/spread-manager/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to load stats');

      const data = await response.json();
      setSpreadStats(data.data || {});
    } catch (error) {
      console.error('Error loading spread stats:', error);
    }
  };

  const handleApproval = async (spreadId, approve) => {
    setLoading(true);
    try {
      const requestBody = {
        approve: approve
      };

      if (!approve) {
        requestBody.rejection_reason = rejectionReason;
        requestBody.rejection_reason_ar = rejectionReasonAr;
      }

      const response = await fetch(`/api/spread-manager/spreads/${spreadId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process approval');
      }

      toast.success(approve ? 'Spread approved successfully!' : 'Spread rejected');
      
      // Reset modal state
      setShowApprovalModal(false);
      setSelectedSpread(null);
      setRejectionReason('');
      setRejectionReasonAr('');
      
      // Reload data
      await Promise.all([loadPendingSpreads(), loadSpreadStats()]);
    } catch (error) {
      console.error('Error processing approval:', error);
      toast.error(error.message || 'Error processing approval');
    } finally {
      setLoading(false);
    }
  };

  const openApprovalModal = (spread) => {
    setSelectedSpread(spread);
    setShowApprovalModal(true);
    setRejectionReason('');
    setRejectionReasonAr('');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading && pendingSpreads.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-white">Loading pending spreads...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-black/40 rounded-lg p-4 border border-yellow-500/30">
          <div className="text-yellow-400 text-sm font-semibold">Pending Approval</div>
          <div className="text-white text-2xl font-bold">{spreadStats.pending_spreads || 0}</div>
        </div>
        <div className="bg-black/40 rounded-lg p-4 border border-green-500/30">
          <div className="text-green-400 text-sm font-semibold">Approved</div>
          <div className="text-white text-2xl font-bold">{spreadStats.approved_spreads || 0}</div>
        </div>
        <div className="bg-black/40 rounded-lg p-4 border border-red-500/30">
          <div className="text-red-400 text-sm font-semibold">Rejected</div>
          <div className="text-white text-2xl font-bold">{spreadStats.rejected_spreads || 0}</div>
        </div>
        <div className="bg-black/40 rounded-lg p-4 border border-purple-500/30">
          <div className="text-purple-400 text-sm font-semibold">Total Spreads</div>
          <div className="text-white text-2xl font-bold">{spreadStats.total_spreads || 0}</div>
        </div>
      </div>

      {/* Pending Spreads */}
      <div className="bg-black/30 backdrop-blur-sm rounded-lg p-6 border border-purple-500/30">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Pending Spreads ({pendingSpreads.length})</h2>
          <button
            onClick={() => loadPendingSpreads()}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Refresh
          </button>
        </div>

        {pendingSpreads.length === 0 ? (
          <div className="text-center py-8 text-purple-200">
            No pending spreads for approval
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {pendingSpreads.map((spread) => (
              <div key={spread.id} className="bg-black/40 rounded-lg p-4 border border-purple-500/20">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-white font-semibold text-lg">{spread.name}</h3>
                    {spread.name_ar && (
                      <p className="text-purple-200 text-sm">{spread.name_ar}</p>
                    )}
                  </div>
                  <span className="px-2 py-1 rounded-full text-xs text-white bg-yellow-500">
                    Pending
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-2 text-sm text-purple-200 mb-4">
                  <div>
                    <strong>Creator:</strong> {spread.creator?.email || 'Unknown'}
                  </div>
                  <div>
                    <strong>Category:</strong> {spread.category?.name_en || 'N/A'}
                  </div>
                  <div>
                    <strong>Deck:</strong> {spread.deck?.name || 'N/A'}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><strong>Cards:</strong> {spread.card_count}</div>
                    <div><strong>Mode:</strong> {spread.mode}</div>
                  </div>
                  <div>
                    <strong>Layout:</strong> {spread.layout}
                  </div>
                  <div>
                    <strong>Created:</strong> {formatDate(spread.created_at)}
                  </div>
                </div>

                {/* Description */}
                {spread.description && (
                  <div className="mb-4">
                    <strong className="text-white text-sm">Description:</strong>
                    <p className="text-purple-200 text-sm mt-1">{spread.description}</p>
                    {spread.description_ar && (
                      <p className="text-purple-200 text-sm mt-1 font-arabic">{spread.description_ar}</p>
                    )}
                  </div>
                )}

                {/* Question */}
                {spread.question && (
                  <div className="mb-4">
                    <strong className="text-white text-sm">Question:</strong>
                    <p className="text-purple-200 text-sm mt-1">{spread.question}</p>
                    {spread.question_ar && (
                      <p className="text-purple-200 text-sm mt-1 font-arabic">{spread.question_ar}</p>
                    )}
                  </div>
                )}

                {/* Cards Info */}
                {spread.cards && spread.cards.length > 0 && (
                  <div className="mb-4">
                    <strong className="text-white text-sm">Positions: {spread.cards.length}</strong>
                    <div className="text-purple-200 text-xs mt-1">
                      {spread.mode === 'manual' ? 'Manual card assignment required' : 'Auto-assign on approval'}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-2 pt-3 border-t border-purple-500/20">
                  <button
                    onClick={() => openApprovalModal(spread)}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 text-sm font-semibold"
                  >
                    Review & Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approval Modal */}
      {showApprovalModal && selectedSpread && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-purple-500/30">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Review Spread</h2>
              <button
                onClick={() => setShowApprovalModal(false)}
                className="text-purple-200 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Spread Details */}
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-white font-semibold text-lg">{selectedSpread.name}</h3>
                  {selectedSpread.name_ar && (
                    <p className="text-purple-200">{selectedSpread.name_ar}</p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-purple-200 text-sm">Created by</div>
                  <div className="text-white font-semibold">{selectedSpread.creator?.email}</div>
                  <div className="text-purple-300 text-xs">{formatDate(selectedSpread.created_at)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-black/30 rounded-lg">
                <div>
                  <div className="text-purple-300 text-sm">Category</div>
                  <div className="text-white">{selectedSpread.category?.name_en}</div>
                </div>
                <div>
                  <div className="text-purple-300 text-sm">Deck</div>
                  <div className="text-white">{selectedSpread.deck?.name}</div>
                </div>
                <div>
                  <div className="text-purple-300 text-sm">Cards</div>
                  <div className="text-white">{selectedSpread.card_count}</div>
                </div>
                <div>
                  <div className="text-purple-300 text-sm">Mode</div>
                  <div className="text-white capitalize">{selectedSpread.mode}</div>
                </div>
              </div>

              {selectedSpread.description && (
                <div className="p-4 bg-black/30 rounded-lg">
                  <div className="text-purple-300 text-sm mb-2">Description</div>
                  <p className="text-white">{selectedSpread.description}</p>
                  {selectedSpread.description_ar && (
                    <p className="text-purple-200 mt-2 font-arabic">{selectedSpread.description_ar}</p>
                  )}
                </div>
              )}

              {selectedSpread.question && (
                <div className="p-4 bg-black/30 rounded-lg">
                  <div className="text-purple-300 text-sm mb-2">Question</div>
                  <p className="text-white">{selectedSpread.question}</p>
                  {selectedSpread.question_ar && (
                    <p className="text-purple-200 mt-2 font-arabic">{selectedSpread.question_ar}</p>
                  )}
                </div>
              )}

              {/* Positions Preview */}
              {selectedSpread.cards && selectedSpread.cards.length > 0 && (
                <div className="p-4 bg-black/30 rounded-lg">
                  <div className="text-purple-300 text-sm mb-3">Spread Positions ({selectedSpread.cards.length})</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {selectedSpread.cards
                      .sort((a, b) => a.position - b.position)
                      .map(card => (
                        <div key={card.id} className="bg-black/40 rounded p-2 text-center">
                          <div className="text-white text-sm font-semibold">Position {card.position}</div>
                          {card.position_name && (
                            <div className="text-purple-200 text-xs">{card.position_name}</div>
                          )}
                          {selectedSpread.mode === 'manual' && (
                            <div className="text-yellow-300 text-xs mt-1">Manual Assignment</div>
                          )}
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>

            {/* Rejection Reason Fields */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-white font-semibold mb-2">
                  Rejection Reason (English) - Optional
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-black/30 border border-red-500/30 rounded-lg text-white placeholder-red-300 focus:outline-none focus:border-red-500"
                  placeholder="Enter reason for rejection (optional)"
                />
              </div>
              
              <div>
                <label className="block text-white font-semibold mb-2">
                  Rejection Reason (Arabic) - Optional
                </label>
                <textarea
                  value={rejectionReasonAr}
                  onChange={(e) => setRejectionReasonAr(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-black/30 border border-red-500/30 rounded-lg text-white placeholder-red-300 focus:outline-none focus:border-red-500 font-arabic"
                  placeholder="سبب الرفض بالعربية (اختياري)"
                  dir="rtl"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowApprovalModal(false)}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApproval(selectedSpread.id, false)}
                disabled={loading}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Rejecting...' : 'Reject'}
              </button>
              <button
                onClick={() => handleApproval(selectedSpread.id, true)}
                disabled={loading}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Approving...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpreadApprovalTab; 