import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  Check, 
  X, 
  Eye, 
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Calendar,
  User,
  AlertCircle,
  CheckCircle,
  XCircle,
  Hourglass,
  MessageSquare,
  FileText,
  Loader,
  RefreshCw,
  Archive,
  Users
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { WorkingHoursAPI } from '../../api/workingHoursApi';

const WorkingHoursApprovalQueue = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState('');
  const [reviewReason, setReviewReason] = useState('');
  const [expandedRequests, setExpandedRequests] = useState(new Set());

  // Filters and search
  const [filters, setFilters] = useState({
    status: 'pending',
    action_type: 'all',
    reader_id: 'all',
    dateRange: 'all'
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0
  });

  const [errors, setErrors] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');

  // Load data
  const loadPendingRequests = useCallback(async () => {
    try {
      setLoading(true);
      const result = await WorkingHoursAPI.getPendingRequests();
      if (result.success) {
        setPendingRequests(result.data);
        setStats(prev => ({ ...prev, pending: result.data.length }));
      } else {
        setErrors([result.error]);
      }
    } catch (error) {
      setErrors(['Failed to load pending requests']);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAllRequests = useCallback(async () => {
    try {
      setLoading(true);
      const result = await WorkingHoursAPI.getAllRequests(currentPage, 20, {
        status: filters.status === 'all' ? undefined : filters.status,
        action_type: filters.action_type === 'all' ? undefined : filters.action_type,
        reader_id: filters.reader_id === 'all' ? undefined : filters.reader_id
      });
      
      if (result.success) {
        setAllRequests(result.data);
        setPagination(result.pagination);
        
        // Update stats
        const newStats = result.data.reduce((acc, request) => {
          acc[request.status] = (acc[request.status] || 0) + 1;
          return acc;
        }, { pending: 0, approved: 0, rejected: 0, cancelled: 0 });
        setStats(newStats);
      } else {
        setErrors([result.error]);
      }
    } catch (error) {
      setErrors(['Failed to load requests']);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]);

  useEffect(() => {
    if (activeTab === 'pending') {
      loadPendingRequests();
    } else {
      loadAllRequests();
    }
  }, [activeTab, loadPendingRequests, loadAllRequests]);

  // Handle review
  const handleReview = (request, action) => {
    setSelectedRequest(request);
    setReviewAction(action);
    setReviewReason('');
    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedRequest || !reviewAction) return;

    try {
      setLoading(true);
      setErrors([]);

      const result = await WorkingHoursAPI.reviewRequest(
        selectedRequest.id,
        reviewAction,
        reviewReason || null
      );

      if (result.success) {
        setSuccessMessage(result.message);
        setShowReviewModal(false);
        setSelectedRequest(null);
        setReviewAction('');
        setReviewReason('');
        
        // Reload data
        if (activeTab === 'pending') {
          loadPendingRequests();
        } else {
          loadAllRequests();
        }
      } else {
        setErrors([result.error]);
      }
    } catch (error) {
      setErrors(['Failed to submit review']);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (request) => {
    try {
      setLoading(true);
      const result = await WorkingHoursAPI.getRequestDetails(request.id);
      
      if (result.success) {
        setSelectedRequest({ ...request, ...result.data });
      } else {
        setErrors([result.error]);
      }
    } catch (error) {
      setErrors(['Failed to load request details']);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (requestId) => {
    const newExpanded = new Set(expandedRequests);
    if (newExpanded.has(requestId)) {
      newExpanded.delete(requestId);
    } else {
      newExpanded.add(requestId);
    }
    setExpandedRequests(newExpanded);
  };

  // Helper functions
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'approved': return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'rejected': return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'cancelled': return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Hourglass className="w-4 h-4" />;
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      case 'cancelled': return <X className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getActionTypeColor = (actionType) => {
    switch (actionType) {
      case 'add': return 'text-green-400 bg-green-500/20';
      case 'edit': return 'text-blue-400 bg-blue-500/20';
      case 'delete': return 'text-red-400 bg-red-500/20';
      case 'bulk_add': return 'text-purple-400 bg-purple-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const formatRequestedChanges = (changes, actionType) => {
    if (actionType === 'bulk_add' && changes.slots) {
      return `${changes.slots.length} time slots`;
    }

    if (changes.date && changes.start_time && changes.end_time) {
      return `${changes.date} ${changes.start_time}-${changes.end_time}`;
    }

    return JSON.stringify(changes, null, 2);
  };

  const filteredRequests = (activeTab === 'pending' ? pendingRequests : allRequests)
    .filter(request => {
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          request.reader_first_name?.toLowerCase().includes(searchLower) ||
          request.reader_last_name?.toLowerCase().includes(searchLower) ||
          request.reader_email?.toLowerCase().includes(searchLower) ||
          request.action_type.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 bg-green-500/20 border border-green-500/30 rounded-lg flex items-center gap-3"
          >
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-green-300">{successMessage}</span>
            <button
              onClick={() => setSuccessMessage('')}
              className="ml-auto text-green-400 hover:text-green-300"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {errors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg"
          >
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span className="text-red-300 font-medium">Error</span>
              <button
                onClick={() => setErrors([])}
                className="ml-auto text-red-400 hover:text-red-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ul className="text-red-300 text-sm space-y-1">
              {errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="w-6 h-6 text-purple-400" />
          <h2 className="text-2xl font-bold text-white">Working Hours Approval Queue</h2>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => activeTab === 'pending' ? loadPendingRequests() : loadAllRequests()}
            disabled={loading}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { key: 'pending', label: 'Pending', icon: Hourglass, color: 'yellow' },
          { key: 'approved', label: 'Approved', icon: CheckCircle, color: 'green' },
          { key: 'rejected', label: 'Rejected', icon: XCircle, color: 'red' },
          { key: 'cancelled', label: 'Cancelled', icon: X, color: 'gray' }
        ].map((stat) => (
          <motion.div
            key={stat.key}
            className={`p-4 bg-black/30 backdrop-blur-sm rounded-xl border border-${stat.color}-500/20 hover:border-${stat.color}-500/40 transition-all`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">{stat.label}</p>
                <p className={`text-2xl font-bold text-${stat.color}-400`}>
                  {stats[stat.key] || 0}
                </p>
              </div>
              <stat.icon className={`w-8 h-8 text-${stat.color}-400`} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        {[
          { id: 'pending', name: 'Pending Requests', icon: Hourglass },
          { id: 'all', name: 'All Requests', icon: Archive }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.name}
          </button>
        ))}
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col lg:flex-row gap-4 p-4 bg-black/30 rounded-lg border border-purple-500/20">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by reader name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-dark-700 border border-gray-600 rounded px-3 py-1 text-white placeholder-gray-400 min-w-64"
          />
        </div>

        {activeTab === 'all' && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="bg-dark-700 border border-gray-600 rounded px-3 py-1 text-white"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <select
              value={filters.action_type}
              onChange={(e) => setFilters(prev => ({ ...prev, action_type: e.target.value }))}
              className="bg-dark-700 border border-gray-600 rounded px-3 py-1 text-white"
            >
              <option value="all">All Actions</option>
              <option value="add">Add</option>
              <option value="edit">Edit</option>
              <option value="delete">Delete</option>
              <option value="bulk_add">Bulk Add</option>
            </select>
          </div>
        )}
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 text-purple-400 animate-spin" />
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-white mb-2">No requests found</h3>
          <p className="text-gray-400">
            {activeTab === 'pending' 
              ? 'All working hours requests have been reviewed.'
              : 'No requests match your current filters.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <motion.div
              key={request.id}
              layout
              className="p-6 bg-black/30 backdrop-blur-sm rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  {/* Reader Avatar */}
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold">
                      {request.reader_first_name?.[0]}{request.reader_last_name?.[0]}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-white">
                        {request.reader_first_name} {request.reader_last_name}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs ${getActionTypeColor(request.action_type)}`}>
                        {request.action_type}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs border flex items-center gap-1 ${getStatusColor(request.status)}`}>
                        {getStatusIcon(request.status)}
                        {request.status}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm">{request.reader_email}</p>
                    <p className="text-gray-400 text-sm">
                      Submitted {new Date(request.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleExpanded(request.id)}
                    className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors flex items-center gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    {expandedRequests.has(request.id) ? 'Hide' : 'View'}
                    {expandedRequests.has(request.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {request.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleReview(request, 'approved')}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors flex items-center gap-1"
                      >
                        <Check className="w-4 h-4" />
                        Approve
                      </button>
                      
                      <button
                        onClick={() => handleReview(request, 'rejected')}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors flex items-center gap-1"
                      >
                        <X className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Request Summary */}
              <div className="mb-4 p-4 bg-dark-700/50 rounded-lg">
                <h4 className="font-medium text-white mb-2">Request Summary:</h4>
                <p className="text-gray-300">
                  {formatRequestedChanges(request.requested_changes, request.action_type)}
                </p>
              </div>

              {/* Expanded Details */}
              <AnimatePresence>
                {expandedRequests.has(request.id) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4"
                  >
                    {/* Detailed Changes */}
                    <div className="bg-dark-700/50 rounded-lg p-4">
                      <h4 className="font-medium text-white mb-2">Requested Changes:</h4>
                      <pre className="text-gray-300 text-sm bg-dark-800 p-3 rounded overflow-x-auto">
                        {JSON.stringify(request.requested_changes, null, 2)}
                      </pre>
                    </div>

                    {/* Original Values */}
                    {request.old_values && (
                      <div className="bg-dark-700/50 rounded-lg p-4">
                        <h4 className="font-medium text-white mb-2">Original Values:</h4>
                        <pre className="text-gray-300 text-sm bg-dark-800 p-3 rounded overflow-x-auto">
                          {JSON.stringify(request.old_values, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Request Notes */}
                    {request.request_notes && (
                      <div className="bg-dark-700/50 rounded-lg p-4">
                        <h4 className="font-medium text-white mb-2">Reader Notes:</h4>
                        <p className="text-gray-300">{request.request_notes}</p>
                      </div>
                    )}

                    {/* Review Reason */}
                    {request.review_reason && (
                      <div className="bg-dark-700/50 rounded-lg p-4">
                        <h4 className="font-medium text-white mb-2">Review Notes:</h4>
                        <p className="text-gray-300">{request.review_reason}</p>
                        {request.admin_first_name && (
                          <p className="text-gray-400 text-sm mt-2">
                            Reviewed by {request.admin_first_name} {request.admin_last_name}
                            {request.reviewed_at && ` on ${new Date(request.reviewed_at).toLocaleString()}`}
                          </p>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded transition-colors"
          >
            Previous
          </button>
          
          <span className="text-gray-400">
            Page {currentPage} of {pagination.totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
            disabled={currentPage === pagination.totalPages}
            className="px-3 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* Review Modal */}
      <AnimatePresence>
        {showReviewModal && selectedRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowReviewModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-dark-800 rounded-2xl border border-purple-500/20 p-6 w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">
                  {reviewAction === 'approved' ? 'Approve' : 'Reject'} Request
                </h3>
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Request Summary */}
                <div className="bg-dark-700/50 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-2">Request Details:</h4>
                  <p className="text-gray-300">
                    <strong>{selectedRequest.reader_first_name} {selectedRequest.reader_last_name}</strong> 
                    {' '}wants to <strong>{selectedRequest.action_type}</strong> working hours:
                  </p>
                  <p className="text-purple-400 mt-2">
                    {formatRequestedChanges(selectedRequest.requested_changes, selectedRequest.action_type)}
                  </p>
                </div>

                {/* Review Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Review Notes {reviewAction === 'rejected' ? '(Required)' : '(Optional)'}
                  </label>
                  <textarea
                    value={reviewReason}
                    onChange={(e) => setReviewReason(e.target.value)}
                    rows="4"
                    placeholder={
                      reviewAction === 'approved'
                        ? 'Add any notes about this approval...'
                        : 'Please explain why this request is being rejected...'
                    }
                    className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none resize-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-4">
                  <button
                    onClick={handleSubmitReview}
                    disabled={loading || (reviewAction === 'rejected' && !reviewReason.trim())}
                    className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors flex items-center justify-center gap-2 ${
                      reviewAction === 'approved'
                        ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-800'
                        : 'bg-red-600 hover:bg-red-700 disabled:bg-red-800'
                    }`}
                  >
                    {loading ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : reviewAction === 'approved' ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                    {reviewAction === 'approved' ? 'Approve Request' : 'Reject Request'}
                  </button>
                  
                  <button
                    onClick={() => setShowReviewModal(false)}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WorkingHoursApprovalQueue; 