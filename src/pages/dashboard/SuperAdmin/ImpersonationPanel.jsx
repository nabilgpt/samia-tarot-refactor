import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../services/frontendApi.js';
import {
  UserIcon,
  MagnifyingGlassIcon,
  PlayIcon,
  StopIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ShieldCheckIcon,
  EyeIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';

const ImpersonationPanel = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [activeSessions, setActiveSessions] = useState([]);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  useEffect(() => {
    loadUsers();
    loadActiveSessions();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const result = await api.getAllUsers({
        search: searchTerm,
        role: roleFilter,
        limit: 50
      });
      if (result.success) {
        setUsers(result.data);
      } else {
        setMessage(`Error loading users: ${result.error}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadActiveSessions = async () => {
    try {
      // This would load active impersonation sessions
      // For now, we'll use mock data
      setActiveSessions([]);
    } catch (error) {
      console.error('Error loading active sessions:', error);
    }
  };

  const handleImpersonateUser = async () => {
    try {
      setLoading(true);
      const result = await api.impersonateUser(selectedUser.id);
      if (result.success) {
        setMessage('Impersonation session started successfully');
        setShowConfirmModal(false);
        
        // Store impersonation data in localStorage for restoration
        localStorage.setItem('impersonation_session', JSON.stringify({
          session_id: result.data.impersonation_session_id,
          target_user_id: selectedUser.id,
          target_user_name: `${selectedUser.first_name} ${selectedUser.last_name}`,
          started_at: new Date().toISOString()
        }));

        // Redirect to appropriate dashboard based on user role
        const dashboardRoutes = {
          client: '/dashboard/client',
          reader: '/dashboard/reader',
          admin: '/dashboard/admin',
          monitor: '/dashboard/monitor'
        };

        setTimeout(() => {
          window.location.href = dashboardRoutes[selectedUser.role] || '/dashboard';
        }, 2000);
      } else {
        setMessage(`Error starting impersonation: ${result.error}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEndImpersonation = async (sessionId) => {
    try {
      const result = await api.endImpersonation(sessionId);
      if (result.success) {
        setMessage('Impersonation session ended');
        localStorage.removeItem('impersonation_session');
        await loadActiveSessions();
      } else {
        setMessage(`Error ending impersonation: ${result.error}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }
  };

  const filteredUsers = users.filter(user => 
    user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.auth_users?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleColor = (role) => {
    switch (role) {
      case 'super_admin': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'admin': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'monitor': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'reader': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'client': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getRiskLevel = (role) => {
    switch (role) {
      case 'super_admin': return { level: 'CRITICAL', color: 'text-red-400' };
      case 'admin': return { level: 'HIGH', color: 'text-orange-400' };
      case 'monitor': return { level: 'MEDIUM', color: 'text-yellow-400' };
      case 'reader': return { level: 'LOW', color: 'text-green-400' };
      case 'client': return { level: 'MINIMAL', color: 'text-blue-400' };
      default: return { level: 'UNKNOWN', color: 'text-gray-400' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center">
            <UserIcon className="w-8 h-8 text-red-400 mr-3" />
            User Impersonation
          </h2>
          <p className="text-cosmic-300 mt-1">
            Securely impersonate any user account for testing and support
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={loadUsers}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Refresh
          </motion.button>
        </div>
      </div>

      {/* Security Warning */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-red-500/10 border border-red-500/30 rounded-xl p-6"
      >
        <div className="flex items-start space-x-3">
          <ExclamationTriangleIcon className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-red-400 font-bold mb-2">⚠️ SECURITY WARNING</h3>
            <ul className="text-red-300 text-sm space-y-1">
              <li>• All impersonation sessions are logged and monitored</li>
              <li>• Only use for legitimate testing, debugging, or customer support</li>
              <li>• You will have full access to the target user&rsquo;s account and data</li>
              <li>• Misuse may result in immediate access revocation</li>
              <li>• Always end sessions promptly when finished</li>
            </ul>
          </div>
        </div>
      </motion.div>

      {/* Message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg ${
            message.includes('Error') 
              ? 'bg-red-500/20 border border-red-500/30 text-red-400'
              : 'bg-green-500/20 border border-green-500/30 text-green-400'
          }`}
        >
          {message}
        </motion.div>
      )}

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center">
            <ClockIcon className="w-5 h-5 text-orange-400 mr-2" />
            Active Impersonation Sessions
          </h3>
          <div className="space-y-3">
            {activeSessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                <div>
                  <p className="text-white font-medium">{session.target_user_name}</p>
                  <p className="text-orange-300 text-sm">Started: {new Date(session.started_at).toLocaleString()}</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleEndImpersonation(session.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                >
                  <StopIcon className="w-4 h-4" />
                  <span>End Session</span>
                </motion.button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cosmic-300 w-5 h-5" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-cosmic-300 focus:border-purple-400 focus:outline-none"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none"
          >
            <option value="">All Roles</option>
            <option value="client">Client</option>
            <option value="reader">Reader</option>
            <option value="admin">Admin</option>
            <option value="monitor">Monitor</option>
            <option value="super_admin">Super Admin</option>
          </select>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-cosmic-300">Loading users...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-cosmic-300">User</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-cosmic-300">Role</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-cosmic-300">Risk Level</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-cosmic-300">Last Activity</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-cosmic-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredUsers.map((user) => {
                  const risk = getRiskLevel(user.role);
                  return (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                            {user.first_name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="text-white font-medium">
                              {user.first_name} {user.last_name}
                            </p>
                            <p className="text-cosmic-300 text-sm">
                              {user.auth_users?.email}
                            </p>
                            <p className="text-cosmic-400 text-xs">
                              ID: {user.id.slice(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getRoleColor(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <ShieldCheckIcon className={`w-4 h-4 ${risk.color}`} />
                          <span className={`text-sm font-medium ${risk.color}`}>
                            {risk.level}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-cosmic-300">
                        {user.auth_users?.last_sign_in_at 
                          ? new Date(user.auth_users.last_sign_in_at).toLocaleDateString()
                          : 'Never'
                        }
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end space-x-2">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                              setSelectedUser(user);
                              setShowConfirmModal(true);
                            }}
                            className="px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 transition-colors flex items-center space-x-2 text-sm"
                          >
                            <PlayIcon className="w-4 h-4" />
                            <span>Impersonate</span>
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>

            {filteredUsers.length === 0 && (
              <div className="p-8 text-center text-cosmic-300">
                No users found matching your criteria
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && selectedUser && (
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
              className="bg-gradient-to-b from-bg-primary to-bg-secondary border border-orange-500/30 rounded-2xl p-6 w-full max-w-md"
            >
              <div className="text-center">
                <EyeIcon className="w-16 h-16 text-orange-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-4">Confirm Impersonation</h3>
                
                <div className="bg-white/5 rounded-lg p-4 mb-6 text-left">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-cosmic-300">Target User:</span>
                      <span className="text-white font-medium">
                        {selectedUser.first_name} {selectedUser.last_name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-cosmic-300">Email:</span>
                      <span className="text-white">{selectedUser.auth_users?.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-cosmic-300">Role:</span>
                      <span className={`px-2 py-1 rounded text-xs ${getRoleColor(selectedUser.role)}`}>
                        {selectedUser.role}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-cosmic-300">Risk Level:</span>
                      <span className={`font-medium ${getRiskLevel(selectedUser.role).color}`}>
                        {getRiskLevel(selectedUser.role).level}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-6">
                  <p className="text-orange-300 text-sm">
                    ⚠️ You will gain full access to this user&rsquo;s account. This action is logged and monitored.
                  </p>
                </div>

                <div className="flex justify-center space-x-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowConfirmModal(false)}
                    className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleImpersonateUser}
                    disabled={loading}
                    className="px-6 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                  >
                    <ArrowRightOnRectangleIcon className="w-4 h-4" />
                    <span>{loading ? 'Starting...' : 'Start Impersonation'}</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ImpersonationPanel; 