import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, Package, Eye, EyeOff, Users, Settings, 
  CheckCircle, XCircle, Clock, AlertTriangle, Plus,
  Search, Filter, MoreVertical, Edit3, Trash2
} from 'lucide-react';
import { getRTLClasses, getMobileRowClasses } from '../../utils/rtlUtils';
import { useResponsive } from '../../hooks/useResponsive';
import DeckBulkUploader from './DeckBulkUploader';

const DeckManagementTab = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [decks, setDecks] = useState([]);
  const [uploadSessions, setUploadSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [showUploader, setShowUploader] = useState(false);
  const { isMobile } = useResponsive();

  useEffect(() => {
    fetchDecks();
    fetchUploadSessions();
  }, []);

  const fetchDecks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/tarot/decks', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDecks(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching decks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUploadSessions = async () => {
    try {
      const response = await fetch('/api/deck-upload/sessions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUploadSessions(data || []);
      }
    } catch (error) {
      console.error('Error fetching upload sessions:', error);
    }
  };

  const handleUploadComplete = (result) => {
    console.log('Upload completed:', result);
    fetchUploadSessions();
    fetchDecks();
    setShowUploader(false);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'completed': { 
        icon: CheckCircle, 
        color: 'text-green-400 bg-green-500/10 border-green-500/30',
        text: 'Complete' 
      },
      'partial': { 
        icon: AlertTriangle, 
        color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
        text: 'Partial' 
      },
      'uploading': { 
        icon: Clock, 
        color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
        text: 'Uploading' 
      },
      'failed': { 
        icon: XCircle, 
        color: 'text-red-400 bg-red-500/10 border-red-500/30',
        text: 'Failed' 
      },
      'initiated': { 
        icon: Clock, 
        color: 'text-cosmic-text/60 bg-cosmic-panel/10 border-cosmic-accent/20',
        text: 'Initiated' 
      }
    };

    const config = statusConfig[status] || statusConfig.initiated;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.text}
      </span>
    );
  };

  const filteredUploadSessions = uploadSessions.filter(session => {
    const matchesSearch = session.deck_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || session.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Package },
    { id: 'upload', label: 'Bulk Upload', icon: Upload },
    { id: 'manage', label: 'Manage Decks', icon: Settings }
  ];

  return (
    <div className={`space-y-6 ${getRTLClasses()}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-cosmic-text">Deck Management</h2>
          <p className="text-cosmic-text/70 text-sm">
            Manage tarot decks and bulk upload card images
          </p>
        </div>
        
        <button
          onClick={() => setShowUploader(true)}
          className="flex items-center gap-2 px-4 py-2 bg-cosmic-accent hover:bg-cosmic-accent/80 rounded-lg text-white font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Upload
        </button>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Stats Cards */}
              <div className="bg-cosmic-panel/20 backdrop-blur-sm border border-cosmic-accent/30 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Package className="w-6 h-6 text-cosmic-accent" />
                  <h3 className="font-semibold text-cosmic-text">Total Decks</h3>
                </div>
                <p className="text-3xl font-bold text-cosmic-text">{decks.length}</p>
                <p className="text-cosmic-text/60 text-sm">Active deck collections</p>
              </div>

              <div className="bg-cosmic-panel/20 backdrop-blur-sm border border-cosmic-accent/30 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Upload className="w-6 h-6 text-blue-400" />
                  <h3 className="font-semibold text-cosmic-text">Upload Sessions</h3>
                </div>
                <p className="text-3xl font-bold text-cosmic-text">{uploadSessions.length}</p>
                <p className="text-cosmic-text/60 text-sm">Total upload attempts</p>
              </div>

              <div className="bg-cosmic-panel/20 backdrop-blur-sm border border-cosmic-accent/30 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <h3 className="font-semibold text-cosmic-text">Completed</h3>
                </div>
                <p className="text-3xl font-bold text-cosmic-text">
                  {uploadSessions.filter(s => s.status === 'completed').length}
                </p>
                <p className="text-cosmic-text/60 text-sm">Successful uploads</p>
              </div>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="bg-cosmic-panel/20 backdrop-blur-sm border border-cosmic-accent/30 rounded-xl p-6">
              <DeckBulkUploader onUploadComplete={handleUploadComplete} />
            </div>
          )}

          {activeTab === 'manage' && (
            <div className="space-y-6">
              {/* Search and Filter */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-cosmic-text/50" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search upload sessions..."
                    className="w-full pl-10 pr-4 py-2 bg-cosmic-dark/50 border border-cosmic-accent/30 rounded-lg text-cosmic-text placeholder-cosmic-text/50 focus:border-cosmic-accent focus:outline-none"
                  />
                </div>
                
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 bg-cosmic-dark/50 border border-cosmic-accent/30 rounded-lg text-cosmic-text focus:border-cosmic-accent focus:outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="partial">Partial</option>
                  <option value="uploading">Uploading</option>
                  <option value="failed">Failed</option>
                  <option value="initiated">Initiated</option>
                </select>
              </div>

              {/* Upload Sessions List */}
              <div className="space-y-3">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-2 border-cosmic-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-cosmic-text/60">Loading upload sessions...</p>
                  </div>
                ) : filteredUploadSessions.length === 0 ? (
                  <div className="text-center py-8">
                    <Upload className="w-12 h-12 text-cosmic-text/30 mx-auto mb-4" />
                    <p className="text-cosmic-text/60">No upload sessions found</p>
                    <button
                      onClick={() => setShowUploader(true)}
                      className="mt-4 px-4 py-2 bg-cosmic-accent/20 hover:bg-cosmic-accent/30 border border-cosmic-accent rounded-lg text-cosmic-accent transition-colors"
                    >
                      Start New Upload
                    </button>
                  </div>
                ) : (
                  filteredUploadSessions.map(session => (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`${getMobileRowClasses()} bg-cosmic-dark/30 rounded-lg p-4 border border-cosmic-accent/20 hover:border-cosmic-accent/40 transition-colors`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-cosmic-text truncate">
                            {session.deck_name}
                          </h4>
                          <p className="text-cosmic-text/60 text-sm truncate">
                            {session.description || 'No description'}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-cosmic-text/50">
                            <span>Cards: {session.cards_uploaded || 0}/79</span>
                            <span>Created: {new Date(session.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {getStatusBadge(session.status)}
                          
                          <button className="p-2 text-cosmic-text/60 hover:text-cosmic-text rounded-lg hover:bg-cosmic-panel/20 transition-colors">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Bulk Uploader Modal */}
      <AnimatePresence>
        {showUploader && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setShowUploader(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-cosmic-dark border border-cosmic-accent/30 rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-cosmic-text">
                  Bulk Upload Deck (78+1 Cards)
                </h3>
                <button
                  onClick={() => setShowUploader(false)}
                  className="p-2 text-cosmic-text/60 hover:text-cosmic-text rounded-lg hover:bg-cosmic-panel/20 transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              
              <DeckBulkUploader onUploadComplete={handleUploadComplete} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DeckManagementTab;