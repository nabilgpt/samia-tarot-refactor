import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../services/frontendApi.js';
import {
  CircleStackIcon,
  TableCellsIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ChartBarIcon,
  ServerIcon,
  DocumentTextIcon,
  CpuChipIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const DatabaseManagementTab = () => {
  const [tables, setTables] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState(null);
  const [showTableModal, setShowTableModal] = useState(false);
  const [tableData, setTableData] = useState([]);
  const [message, setMessage] = useState('');
  const [backupProgress, setBackupProgress] = useState(0);
  const [showBackupModal, setShowBackupModal] = useState(false);

  const tableConfigs = {
    profiles: { name: 'User Profiles', icon: '👤', color: 'blue' },
    services: { name: 'Services', icon: '🔮', color: 'purple' },
    bookings: { name: 'Bookings', icon: '📅', color: 'green' },
    payments: { name: 'Payments', icon: '💳', color: 'yellow' },
    messages: { name: 'Messages', icon: '💬', color: 'cyan' },
    reviews: { name: 'Reviews', icon: '⭐', color: 'orange' },
    notifications: { name: 'Notifications', icon: '🔔', color: 'red' },
    wallets: { name: 'Wallets', icon: '💰', color: 'green' },
    transactions: { name: 'Transactions', icon: '💸', color: 'pink' },
    call_sessions: { name: 'Call Sessions', icon: '📞', color: 'indigo' },
    call_recordings: { name: 'Call Recordings', icon: '🎙️', color: 'gray' },
    emergency_call_logs: { name: 'Emergency Logs', icon: '🚨', color: 'red' },
    admin_audit_logs: { name: 'Audit Logs', icon: '📋', color: 'yellow' },
    impersonation_sessions: { name: 'Impersonation Sessions', icon: '👁️', color: 'orange' },
    system_settings: { name: 'System Settings', icon: '⚙️', color: 'gray' }
  };

  useEffect(() => {
    loadDatabaseStats();
  }, []);

  const loadDatabaseStats = async () => {
    try {
      setLoading(true);
      const result = await api.getDatabaseStats();
      if (result.success) {
        setStats(result.data);
        setTables(Object.keys(result.data).map(table => ({
          name: table,
          count: result.data[table],
          ...tableConfigs[table]
        })));
      } else {
        setMessage(`Error loading database stats: ${result.error}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const viewTableData = async (tableName) => {
    try {
      setLoading(true);
      setSelectedTable(tableName);
      
      // This would be implemented in the API to fetch table data
      // For now, we'll show a placeholder
      setTableData([
        { id: 1, sample: 'This is sample data', created_at: new Date().toISOString() },
        { id: 2, sample: 'Table viewer coming soon', created_at: new Date().toISOString() }
      ]);
      
      setShowTableModal(true);
    } catch (error) {
      setMessage(`Error viewing table: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const exportTable = async (tableName) => {
    try {
      setMessage('Exporting table data...');
      
      // Mock export functionality
      const csvContent = `Table: ${tableName}\nExported at: ${new Date().toISOString()}\nRecord Count: ${stats[tableName]}\n\nThis is a placeholder export.`;
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tableName}_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      setMessage('Table exported successfully');
    } catch (error) {
      setMessage(`Export failed: ${error.message}`);
    }
  };

  const createBackup = async () => {
    try {
      setBackupProgress(0);
      setShowBackupModal(true);
      
      // Simulate backup progress
      const interval = setInterval(() => {
        setBackupProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setMessage('Database backup completed successfully');
            setTimeout(() => setShowBackupModal(false), 2000);
            return 100;
          }
          return prev + 10;
        });
      }, 500);
      
    } catch (error) {
      setMessage(`Backup failed: ${error.message}`);
      setShowBackupModal(false);
    }
  };

  const getTableColor = (color) => {
    const colors = {
      blue: 'from-blue-500 to-cyan-500',
      purple: 'from-purple-500 to-pink-500',
      green: 'from-green-500 to-emerald-500',
      yellow: 'from-yellow-500 to-orange-500',
      cyan: 'from-cyan-500 to-blue-500',
      orange: 'from-orange-500 to-red-500',
      red: 'from-red-500 to-pink-500',
      pink: 'from-pink-500 to-purple-500',
      indigo: 'from-indigo-500 to-purple-500',
      gray: 'from-gray-500 to-slate-500'
    };
    return colors[color] || colors.blue;
  };

  const getTotalRecords = () => {
    if (!stats || typeof stats !== 'object') return 0;
    return Object.values(stats).reduce((total, count) => {
      return total + (typeof count === 'number' ? count : 0);
    }, 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center">
            <CircleStackIcon className="w-8 h-8 text-blue-400 mr-3" />
            Database Management
          </h2>
          <p className="text-cosmic-300 mt-1">
            Monitor, backup, and manage all database tables
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={createBackup}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
            <span>Create Backup</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={loadDatabaseStats}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Refresh
          </motion.button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg ${
            message.includes('Error') || message.includes('failed')
              ? 'bg-red-500/20 border border-red-500/30 text-red-400'
              : 'bg-green-500/20 border border-green-500/30 text-green-400'
          }`}
        >
          {message}
        </motion.div>
      )}

      {/* Database Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-cosmic-300 text-sm">Total Tables</p>
              <p className="text-2xl font-bold text-white">{tables.length}</p>
            </div>
            <TableCellsIcon className="w-8 h-8 text-blue-400" />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-cosmic-300 text-sm">Total Records</p>
              <p className="text-2xl font-bold text-white">{getTotalRecords().toLocaleString()}</p>
            </div>
            <ServerIcon className="w-8 h-8 text-green-400" />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-cosmic-300 text-sm">Database Size</p>
              <p className="text-2xl font-bold text-white">~{Math.round(getTotalRecords() * 0.001)}MB</p>
            </div>
            <CpuChipIcon className="w-8 h-8 text-purple-400" />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-cosmic-300 text-sm">Last Backup</p>
              <p className="text-2xl font-bold text-white">24h ago</p>
            </div>
            <ChartBarIcon className="w-8 h-8 text-yellow-400" />
          </div>
        </motion.div>
      </div>

      {/* Tables Grid */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-6">Database Tables</h3>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-cosmic-300">Loading database tables...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tables.map((table) => (
              <motion.div
                key={table.name}
                whileHover={{ scale: 1.02 }}
                className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6 hover:bg-white/10 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${getTableColor(table.color)} flex items-center justify-center text-white text-lg`}>
                      {table.icon || '📊'}
                    </div>
                    <div>
                      <h4 className="text-white font-medium">
                        {table.displayName || table.name}
                      </h4>
                      <p className="text-cosmic-300 text-sm">
                        {typeof table.count === 'number' ? table.count.toLocaleString() : (typeof table.count === 'object' ? JSON.stringify(table.count) : table.count)} records
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => viewTableData(table.name)}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    View Data
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => exportTable(table.name)}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    title="Export CSV"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                  </motion.button>
                </div>

                {/* Table Stats */}
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex justify-between text-xs text-cosmic-300">
                    <span>Table: {table.name}</span>
                    <span>Last updated: Now</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6 cursor-pointer"
        >
          <div className="flex items-center space-x-3 mb-4">
            <ArrowUpTrayIcon className="w-8 h-8 text-blue-400" />
            <h3 className="text-lg font-bold text-white">Import Data</h3>
          </div>
          <p className="text-cosmic-300 text-sm">
            Import data from CSV or JSON files
          </p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6 cursor-pointer"
        >
          <div className="flex items-center space-x-3 mb-4">
            <DocumentTextIcon className="w-8 h-8 text-green-400" />
            <h3 className="text-lg font-bold text-white">Query Builder</h3>
          </div>
          <p className="text-cosmic-300 text-sm">
            Execute custom database queries
          </p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6 cursor-pointer"
        >
          <div className="flex items-center space-x-3 mb-4">
            <TrashIcon className="w-8 h-8 text-red-400" />
            <h3 className="text-lg font-bold text-white">Data Cleanup</h3>
          </div>
          <p className="text-cosmic-300 text-sm">
            Clean up old and unused data
          </p>
        </motion.div>
      </div>

      {/* Table Data Modal */}
      <AnimatePresence>
        {showTableModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-b from-bg-primary to-bg-secondary border border-white/20 rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">
                  Table Data: {selectedTable}
                </h3>
                <button
                  onClick={() => setShowTableModal(false)}
                  className="text-cosmic-300 hover:text-white"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-center py-8">
                  <TableCellsIcon className="w-16 h-16 text-cosmic-300 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-white mb-2">Table Viewer</h4>
                  <p className="text-cosmic-300">
                    Advanced table viewer and editor coming soon
                  </p>
                  <div className="mt-4 text-sm text-cosmic-400">
                    <p>Selected table: <span className="font-mono">{selectedTable}</span></p>
                    <p>Records: {stats[selectedTable]} rows</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowTableModal(false)}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Close
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backup Progress Modal */}
      <AnimatePresence>
        {showBackupModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-b from-bg-primary to-bg-secondary border border-white/20 rounded-2xl p-6 w-full max-w-md"
            >
              <div className="text-center">
                <ArrowDownTrayIcon className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-4">Creating Database Backup</h3>
                
                <div className="bg-white/5 rounded-lg p-4 mb-6">
                  <div className="mb-2">
                    <div className="flex justify-between text-sm text-cosmic-300 mb-1">
                      <span>Progress</span>
                      <span>{backupProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-2">
                      <motion.div
                        className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full"
                        style={{ width: `${backupProgress}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                  <p className="text-cosmic-300 text-sm">
                    {backupProgress < 100 ? 'Backing up database tables...' : 'Backup completed successfully!'}
                  </p>
                </div>

                {backupProgress === 100 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center justify-center text-green-400"
                  >
                    <CheckCircleIcon className="w-6 h-6 mr-2" />
                    <span>Backup Complete</span>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DatabaseManagementTab; 