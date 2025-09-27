import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Search, Filter, Eye, ThumbsUp, ThumbsDown, AlertTriangle, CheckCircle, Star, Clock, User } from 'lucide-react';
import api from '../../lib/api';

const Review = () => {
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReading, setSelectedReading] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    fetchReadings();
  }, [filter]);

  const fetchReadings = async () => {
    try {
      const data = await api.getReadingsForReview(filter);
      setReadings(data);
    } catch (error) {
      console.error('Error fetching readings:', error);
      setError('Failed to load readings');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (readingId) => {
    try {
      await api.approveReading(readingId);
      fetchReadings();
    } catch (error) {
      console.error('Error approving reading:', error);
    }
  };

  const handleReject = async (readingId, reason) => {
    try {
      await api.rejectReading(readingId, reason);
      fetchReadings();
    } catch (error) {
      console.error('Error rejecting reading:', error);
    }
  };

  const openModal = (reading) => {
    setSelectedReading(reading);
    setModalOpen(true);
  };

  const closeModal = () => {
    setSelectedReading(null);
    setModalOpen(false);
  };

  const filteredReadings = readings.filter(reading =>
    reading.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reading.reader_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reading.service_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const itemVariants = {
    hidden: shouldReduceMotion ? { opacity: 0 } : { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: shouldReduceMotion ? { duration: 0.3 } : {
        type: "spring",
        stiffness: 100,
        damping: 12
      }
    }
  };

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="container mx-auto max-w-7xl">

        {/* Header */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-4">
            Reading Review
          </h1>
          <div className="w-32 h-1 bg-cosmic-gradient mx-auto mb-6 rounded-full shadow-theme-cosmic" />
          <p className="text-theme-secondary text-lg">
            Monitor and approve spiritual guidance quality
          </p>
        </motion.div>

        {/* Controls */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-2xl p-6 mb-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-theme-muted" />
              <input
                type="text"
                placeholder="Search by client, reader, or service..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-theme-card border border-theme-cosmic rounded-lg text-theme-primary placeholder-theme-muted focus:border-gold-primary focus:outline-none transition-colors duration-300"
              />
            </div>

            {/* Filter */}
            <div className="flex gap-2">
              {['pending', 'approved', 'rejected', 'flagged'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 capitalize ${
                    filter === status
                      ? 'bg-cosmic-gradient text-theme-inverse'
                      : 'bg-theme-card border border-theme-cosmic text-theme-primary hover:border-gold-primary'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <div className="bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400">12</div>
            <p className="text-theme-secondary text-sm">Pending Review</p>
          </div>
          <div className="bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-400">156</div>
            <p className="text-theme-secondary text-sm">Approved Today</p>
          </div>
          <div className="bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-red-400">3</div>
            <p className="text-theme-secondary text-sm">Rejected</p>
          </div>
          <div className="bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-gold-primary">98.2%</div>
            <p className="text-theme-secondary text-sm">Approval Rate</p>
          </div>
        </motion.div>

        {/* Readings List */}
        {loading ? (
          <div className="space-y-4">
            {Array(3).fill(0).map((_, index) => (
              <div key={index} className="bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-2xl p-6 animate-pulse">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-2">
                    <div className="h-6 bg-theme-tertiary rounded w-48"></div>
                    <div className="h-4 bg-theme-tertiary rounded w-32"></div>
                  </div>
                  <div className="h-8 bg-theme-tertiary rounded w-20"></div>
                </div>
                <div className="h-20 bg-theme-tertiary rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {filteredReadings.map((reading, index) => (
              <motion.div
                key={reading.id}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: index * 0.1 }}
                className="bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-2xl p-6 hover:border-gold-primary/50 transition-all duration-300"
              >

                {/* Reading Header */}
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start mb-6">
                  <div className="flex items-start mb-4 lg:mb-0">
                    <div className="text-2xl mr-4 mt-1">
                      {reading.service_type === 'tarot' ? '🔮' : reading.service_type === 'astrology' ? '⭐' : '🌟'}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-theme-primary mb-1">
                        {reading.service_name}
                      </h3>
                      <div className="flex items-center text-theme-secondary text-sm space-x-4">
                        <span className="flex items-center">
                          <User className="w-3 h-3 mr-1" />
                          Client: {reading.client_name}
                        </span>
                        <span className="flex items-center">
                          <Star className="w-3 h-3 mr-1" />
                          Reader: {reading.reader_name}
                        </span>
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {new Date(reading.completed_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                    reading.status === 'approved'
                      ? 'bg-green-500/20 text-green-400'
                      : reading.status === 'rejected'
                      ? 'bg-red-500/20 text-red-400'
                      : reading.status === 'flagged'
                      ? 'bg-orange-500/20 text-orange-400'
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {reading.status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
                    {reading.status === 'rejected' && <ThumbsDown className="w-3 h-3 mr-1" />}
                    {reading.status === 'flagged' && <AlertTriangle className="w-3 h-3 mr-1" />}
                    {reading.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                    {reading.status.charAt(0).toUpperCase() + reading.status.slice(1)}
                  </div>
                </div>

                {/* Client Question */}
                {reading.question && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-theme-primary mb-2">Client's Question:</h4>
                    <div className="bg-theme-card/50 rounded-lg p-3">
                      <p className="text-theme-secondary text-sm italic">"{reading.question}"</p>
                    </div>
                  </div>
                )}

                {/* Reading Preview */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-theme-primary mb-2">Reading Content:</h4>
                  <div className="bg-theme-card/50 rounded-lg p-4">
                    <p className="text-theme-secondary text-sm leading-relaxed">
                      {reading.content && reading.content.length > 200
                        ? `${reading.content.substring(0, 200)}...`
                        : reading.content || 'No content available'
                      }
                    </p>
                  </div>
                </div>

                {/* Quality Indicators */}
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className={`px-2 py-1 rounded text-xs ${
                    reading.word_count >= 200 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {reading.word_count || 0} words
                  </span>
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                    ${reading.amount} order
                  </span>
                  {reading.has_audio && (
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">
                      Audio included
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => openModal(reading)}
                    className="inline-flex items-center px-4 py-2 bg-cosmic-gradient hover:shadow-theme-cosmic text-theme-inverse font-medium rounded-lg transition-all duration-300 transform hover:scale-105"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Review Full Reading
                  </button>

                  {reading.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(reading.id)}
                        className="inline-flex items-center px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/20 text-green-400 font-medium rounded-lg transition-all duration-300"
                      >
                        <ThumbsUp className="w-4 h-4 mr-2" />
                        Approve
                      </button>

                      <button
                        onClick={() => handleReject(reading.id, 'Quality concerns')}
                        className="inline-flex items-center px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/20 text-red-400 font-medium rounded-lg transition-all duration-300"
                      >
                        <ThumbsDown className="w-4 h-4 mr-2" />
                        Reject
                      </button>
                    </>
                  )}

                  <button className="inline-flex items-center px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/20 text-orange-400 font-medium rounded-lg transition-all duration-300">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Flag for Review
                  </button>
                </div>

              </motion.div>
            ))}
          </div>
        )}

        {/* No Results */}
        {!loading && filteredReadings.length === 0 && (
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="text-center py-12"
          >
            <Eye className="w-16 h-16 text-theme-muted mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-theme-primary mb-2">No Readings Found</h3>
            <p className="text-theme-secondary">
              {searchTerm ? 'Try adjusting your search terms' : `No ${filter} readings at this time`}
            </p>
          </motion.div>
        )}

        {/* Reading Detail Modal */}
        {modalOpen && selectedReading && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-2xl p-6 max-w-4xl max-h-[80vh] overflow-y-auto"
            >
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold gradient-text">Full Reading Review</h2>
                <button
                  onClick={closeModal}
                  className="text-theme-secondary hover:text-theme-primary text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                {/* Reading Details */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium text-theme-primary mb-2">Service Information</h3>
                    <p className="text-theme-secondary">{selectedReading.service_name}</p>
                    <p className="text-theme-muted text-sm">Order #{selectedReading.order_id}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-theme-primary mb-2">Participants</h3>
                    <p className="text-theme-secondary">Client: {selectedReading.client_name}</p>
                    <p className="text-theme-secondary">Reader: {selectedReading.reader_name}</p>
                  </div>
                </div>

                {/* Client Question */}
                {selectedReading.question && (
                  <div>
                    <h3 className="font-medium text-theme-primary mb-2">Client's Question</h3>
                    <div className="bg-theme-card/50 rounded-lg p-4">
                      <p className="text-theme-secondary italic">"{selectedReading.question}"</p>
                    </div>
                  </div>
                )}

                {/* Full Reading Content */}
                <div>
                  <h3 className="font-medium text-theme-primary mb-2">Reading Content</h3>
                  <div className="bg-theme-card/50 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <p className="text-theme-secondary leading-relaxed whitespace-pre-wrap">
                      {selectedReading.content || 'No content available'}
                    </p>
                  </div>
                </div>

                {/* Review Actions */}
                <div className="flex flex-wrap gap-3 pt-6 border-t border-theme-cosmic">
                  <button
                    onClick={() => {
                      handleApprove(selectedReading.id);
                      closeModal();
                    }}
                    className="px-6 py-3 bg-green-500/20 hover:bg-green-500/30 border border-green-500/20 text-green-400 font-medium rounded-lg transition-all duration-300"
                  >
                    <ThumbsUp className="w-4 h-4 mr-2 inline" />
                    Approve Reading
                  </button>

                  <button
                    onClick={() => {
                      handleReject(selectedReading.id, 'Quality concerns');
                      closeModal();
                    }}
                    className="px-6 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/20 text-red-400 font-medium rounded-lg transition-all duration-300"
                  >
                    <ThumbsDown className="w-4 h-4 mr-2 inline" />
                    Reject Reading
                  </button>

                  <button
                    onClick={closeModal}
                    className="px-6 py-3 bg-theme-card border border-theme-cosmic text-theme-primary hover:border-gold-primary font-medium rounded-lg transition-all duration-300"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Review;