import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Phone, PhoneCall, Clock, User, Play, Pause, Volume2, AlertCircle, CheckCircle, RotateCcw } from 'lucide-react';
import api from '../../lib/api';

const Calls = () => {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('active');
  const [selectedCall, setSelectedCall] = useState(null);
  const [audioPlaying, setAudioPlaying] = useState(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    fetchCalls();
    const interval = setInterval(fetchCalls, 10000);
    return () => clearInterval(interval);
  }, [filter]);

  const fetchCalls = async () => {
    try {
      const data = await api.getActiveCalls(filter);
      setCalls(data);
    } catch (error) {
      console.error('Error fetching calls:', error);
      setError('Failed to load calls');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCall = async (callId) => {
    try {
      await api.joinCallAsMonitor(callId);
      fetchCalls();
    } catch (error) {
      console.error('Error joining call:', error);
    }
  };

  const handleEndCall = async (callId, reason) => {
    try {
      await api.endCall(callId, reason);
      fetchCalls();
    } catch (error) {
      console.error('Error ending call:', error);
    }
  };

  const getCallStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'on_hold': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'ended': return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
      case 'flagged': return 'text-red-400 bg-red-500/10 border-red-500/20';
      default: return 'text-theme-secondary bg-theme-card border-theme-cosmic';
    }
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return hours > 0
      ? `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      : `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

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
            Call Monitoring
          </h1>
          <div className="w-32 h-1 bg-cosmic-gradient mx-auto mb-6 rounded-full shadow-theme-cosmic" />
          <p className="text-theme-secondary text-lg">
            Monitor live readings and ensure quality standards
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
            <div className="flex gap-2">
              {['active', 'on_hold', 'ended', 'flagged'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                    filter === status
                      ? 'bg-cosmic-gradient text-theme-inverse'
                      : 'bg-theme-card border border-theme-cosmic text-theme-primary hover:border-gold-primary'
                  }`}
                >
                  {status.replace('_', ' ').toUpperCase()}
                </button>
              ))}
            </div>

            <button
              onClick={fetchCalls}
              className="inline-flex items-center px-4 py-2 bg-cosmic-gradient hover:shadow-theme-cosmic text-theme-inverse font-medium rounded-lg transition-all duration-300 transform hover:scale-105"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Refresh
            </button>
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
            <div className="text-2xl font-bold text-green-400">8</div>
            <p className="text-theme-secondary text-sm">Active Calls</p>
          </div>
          <div className="bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400">2</div>
            <p className="text-theme-secondary text-sm">On Hold</p>
          </div>
          <div className="bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-gold-primary">47</div>
            <p className="text-theme-secondary text-sm">Today Total</p>
          </div>
          <div className="bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">32m</div>
            <p className="text-theme-secondary text-sm">Avg Duration</p>
          </div>
        </motion.div>

        {/* Live Calls */}
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
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="h-4 bg-theme-tertiary rounded"></div>
                  <div className="h-4 bg-theme-tertiary rounded"></div>
                  <div className="h-4 bg-theme-tertiary rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : calls.length === 0 ? (
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="text-center py-12"
          >
            <Phone className="w-16 h-16 text-theme-muted mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-theme-primary mb-2">No {filter} Calls</h3>
            <p className="text-theme-secondary">
              {filter === 'active' ? 'No active calls at the moment' : `No ${filter} calls found`}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {calls.map((call, index) => (
              <motion.div
                key={call.id}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: index * 0.1 }}
                className="bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-2xl p-6 hover:border-gold-primary/50 transition-all duration-300"
              >

                {/* Call Header */}
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start mb-6">
                  <div className="flex items-start mb-4 lg:mb-0">
                    <div className="relative mr-4">
                      <PhoneCall className={`w-8 h-8 ${call.status === 'active' ? 'text-green-400' : 'text-theme-secondary'}`} />
                      {call.status === 'active' && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-theme-primary mb-1">
                        {call.service_name || 'Voice Reading'}
                      </h3>
                      <div className="flex items-center text-theme-secondary text-sm space-x-4">
                        <span className="flex items-center">
                          <User className="w-3 h-3 mr-1" />
                          Client: {call.client_name}
                        </span>
                        <span className="flex items-center">
                          <User className="w-3 h-3 mr-1" />
                          Reader: {call.reader_name}
                        </span>
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatDuration(call.duration_seconds || 0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-medium ${getCallStatusColor(call.status)}`}>
                    {call.status === 'active' && <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>}
                    {call.status === 'flagged' && <AlertCircle className="w-3 h-3 mr-1" />}
                    {call.status === 'ended' && <CheckCircle className="w-3 h-3 mr-1" />}
                    {call.status.replace('_', ' ').toUpperCase()}
                  </div>
                </div>

                {/* Call Details */}
                <div className="grid md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <p className="text-theme-muted text-xs uppercase tracking-wide mb-1">Started</p>
                    <p className="text-theme-primary font-semibold">
                      {new Date(call.started_at).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-theme-muted text-xs uppercase tracking-wide mb-1">Duration</p>
                    <p className="text-theme-primary font-semibold">{formatDuration(call.duration_seconds || 0)}</p>
                  </div>
                  <div>
                    <p className="text-theme-muted text-xs uppercase tracking-wide mb-1">Rate</p>
                    <p className="text-theme-primary font-semibold">${call.rate_per_minute || '0.00'}/min</p>
                  </div>
                  <div>
                    <p className="text-theme-muted text-xs uppercase tracking-wide mb-1">Current Cost</p>
                    <p className="text-theme-primary font-semibold">${call.current_cost?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>

                {/* Audio Controls */}
                {call.status === 'active' && (
                  <div className="bg-theme-card/50 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={() => setAudioPlaying(audioPlaying === call.id ? null : call.id)}
                          className="flex items-center px-3 py-2 bg-cosmic-gradient hover:shadow-theme-cosmic text-theme-inverse rounded-lg transition-all duration-300"
                        >
                          {audioPlaying === call.id ? (
                            <Pause className="w-4 h-4 mr-2" />
                          ) : (
                            <Play className="w-4 h-4 mr-2" />
                          )}
                          {audioPlaying === call.id ? 'Stop' : 'Listen'}
                        </button>
                        <div className="flex items-center text-theme-secondary">
                          <Volume2 className="w-4 h-4 mr-2" />
                          <span className="text-sm">Live Audio</span>
                        </div>
                      </div>

                      {/* Audio Wave Visualization */}
                      <div className="flex items-center space-x-1">
                        {Array(5).fill(0).map((_, i) => (
                          <div
                            key={i}
                            className={`w-1 bg-gold-primary rounded-full ${
                              audioPlaying === call.id ? 'animate-pulse' : ''
                            }`}
                            style={{
                              height: `${Math.random() * 20 + 10}px`,
                              animationDelay: `${i * 0.1}s`
                            }}
                          ></div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Quality Indicators */}
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className={`px-2 py-1 rounded text-xs ${
                    call.audio_quality >= 80 ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    Audio: {call.audio_quality || 85}%
                  </span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    call.connection_stable ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {call.connection_stable ? 'Stable' : 'Unstable'}
                  </span>
                  {call.reader_rating && (
                    <span className="px-2 py-1 bg-gold-primary/20 text-gold-primary rounded text-xs">
                      Reader: {call.reader_rating}⭐
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                  {call.status === 'active' && (
                    <>
                      <button
                        onClick={() => handleJoinCall(call.id)}
                        className="inline-flex items-center px-4 py-2 bg-cosmic-gradient hover:shadow-theme-cosmic text-theme-inverse font-medium rounded-lg transition-all duration-300 transform hover:scale-105"
                      >
                        <PhoneCall className="w-4 h-4 mr-2" />
                        Join Call
                      </button>

                      <button
                        onClick={() => handleEndCall(call.id, 'Quality concerns')}
                        className="inline-flex items-center px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/20 text-red-400 font-medium rounded-lg transition-all duration-300"
                      >
                        <AlertCircle className="w-4 h-4 mr-2" />
                        End Call
                      </button>
                    </>
                  )}

                  <button className="inline-flex items-center px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/20 text-orange-400 font-medium rounded-lg transition-all duration-300">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Flag Call
                  </button>

                  <button
                    onClick={() => setSelectedCall(call)}
                    className="inline-flex items-center px-4 py-2 bg-theme-card hover:bg-theme-cosmic border border-theme-cosmic text-theme-primary font-medium rounded-lg transition-all duration-300"
                  >
                    View Details
                  </button>
                </div>

              </motion.div>
            ))}
          </div>
        )}

        {/* Call Detail Modal */}
        {selectedCall && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-2xl p-6 max-w-2xl max-h-[80vh] overflow-y-auto"
            >
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold gradient-text">Call Details</h2>
                <button
                  onClick={() => setSelectedCall(null)}
                  className="text-theme-secondary hover:text-theme-primary text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium text-theme-primary">Service</h3>
                    <p className="text-theme-secondary">{selectedCall.service_name}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-theme-primary">Status</h3>
                    <p className="text-theme-secondary capitalize">{selectedCall.status}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-theme-primary">Client</h3>
                    <p className="text-theme-secondary">{selectedCall.client_name}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-theme-primary">Reader</h3>
                    <p className="text-theme-secondary">{selectedCall.reader_name}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-theme-primary">Duration</h3>
                    <p className="text-theme-secondary">{formatDuration(selectedCall.duration_seconds || 0)}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-theme-primary">Cost</h3>
                    <p className="text-theme-secondary">${selectedCall.current_cost?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>

                {selectedCall.notes && (
                  <div>
                    <h3 className="font-medium text-theme-primary mb-2">Monitoring Notes</h3>
                    <div className="bg-theme-card/50 rounded-lg p-3">
                      <p className="text-theme-secondary text-sm">{selectedCall.notes}</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-theme-cosmic">
                  <button
                    onClick={() => setSelectedCall(null)}
                    className="px-4 py-2 bg-theme-card border border-theme-cosmic text-theme-primary rounded-lg"
                  >
                    Close
                  </button>
                  {selectedCall.status === 'active' && (
                    <button
                      onClick={() => {
                        handleJoinCall(selectedCall.id);
                        setSelectedCall(null);
                      }}
                      className="px-4 py-2 bg-cosmic-gradient text-theme-inverse rounded-lg"
                    >
                      Join Call
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Calls;