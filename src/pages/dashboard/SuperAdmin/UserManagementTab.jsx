import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SuperAdminAPI from '../../../api/superAdminApi.js';
import {
  UsersIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  UserPlusIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

const UserManagementTab = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    country: '',
    is_active: '',
    sortBy: 'created_at',
    sortOrder: 'desc'
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadUsers();
  }, [filters]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      setMessage('');
      
      const result = await SuperAdminAPI.getAllUsers(filters);
      if (result.success) {
        setUsers(result.data || []);
        setError(null);
        
        // Show warning if fallback was used
        if (result.warning) {
          setMessage(`⚠️ ${result.warning} - Basic user data loaded successfully.`);
        }
      } else {
        throw new Error(result.error || 'Failed to load users');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      
      // Detailed error handling
      let userFriendlyMessage;
      if (error.message.includes('more than one relationship')) {
        userFriendlyMessage = 'Database relationship error detected. Please run the relationship fix script in Supabase.';
        setError('RELATIONSHIP_ERROR');
      } else if (error.message.includes('no matches were found') || error.message.includes('Could not find a relationship')) {
        userFriendlyMessage = 'No foreign key relationship exists between profiles and auth.users tables. Database schema needs to be fixed.';
        setError('NO_RELATIONSHIP_ERROR');
      } else if (error.message.includes('infinite recursion')) {
        userFriendlyMessage = 'Database security policy error. Please check RLS policies.';
        setError('RLS_ERROR');
      } else if (error.message.includes('permission denied')) {
        userFriendlyMessage = 'Access denied. Please check your super admin privileges.';
        setError('PERMISSION_ERROR');
      } else {
        userFriendlyMessage = error.message;
        setError('GENERAL_ERROR');
      }
      
      setMessage(`❌ ${userFriendlyMessage}`);
      
      // Don't clear users on error - keep showing previous data if available
      // This ensures the interface remains functional
    } finally {
      setLoading(false);
    }
  };

  // Error fallback component
  const renderErrorFallback = () => (
    <div className="text-center py-12">
      <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
        <ExclamationTriangleIcon className="w-10 h-10 text-red-400" />
      </div>
      <h3 className="text-xl font-bold text-white mb-4">Failed to Load Users</h3>
      
      {/* Show specific error messages and solutions */}
      {error === 'RELATIONSHIP_ERROR' ? (
        <div className="max-w-2xl mx-auto text-left bg-red-500/10 border border-red-500/20 rounded-lg p-6 mb-6">
          <h4 className="text-lg font-semibold text-red-300 mb-3">🔧 Database Relationship Error</h4>
          <p className="text-gray-300 mb-4">
            Multiple foreign key relationships found between profiles and users tables. This needs to be fixed in the database.
          </p>
          <div className="bg-gray-900/50 rounded-lg p-4 mb-4">
            <h5 className="text-sm font-semibold text-yellow-300 mb-2">💡 Solution:</h5>
            <ol className="text-sm text-gray-300 space-y-2">
              <li>1. Go to your Supabase Dashboard → SQL Editor</li>
              <li>2. Run the relationship fix script: <code className="bg-gray-800 px-2 py-1 rounded">FIX_SUPER_ADMIN_RELATIONSHIP_ERROR.sql</code></li>
              <li>3. This will remove duplicate foreign keys and clean the schema</li>
              <li>4. Refresh this page after running the script</li>
            </ol>
          </div>
        </div>
      ) : error === 'NO_RELATIONSHIP_ERROR' ? (
        <div className="max-w-2xl mx-auto text-left bg-orange-500/10 border border-orange-500/20 rounded-lg p-6 mb-6">
          <h4 className="text-lg font-semibold text-orange-300 mb-3">🚫 No Database Relationship Found</h4>
          <p className="text-gray-300 mb-4">
            No foreign key relationship exists between profiles and auth.users tables. The database schema is missing the required relationship.
          </p>
          <div className="bg-gray-900/50 rounded-lg p-4 mb-4">
            <h5 className="text-sm font-semibold text-yellow-300 mb-2">💡 Solution:</h5>
            <ol className="text-sm text-gray-300 space-y-2">
              <li>1. Go to your Supabase Dashboard → SQL Editor</li>
              <li>2. Run the relationship creation script: <code className="bg-gray-800 px-2 py-1 rounded">CREATE_PROFILES_RELATIONSHIP.sql</code></li>
              <li>3. This will create the required foreign key: profiles.id → auth.users.id</li>
              <li>4. Refresh this page after running the script</li>
              <li>5. The User Management should then load normally with auth data</li>
            </ol>
          </div>
          <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-3">
            <p className="text-blue-300 text-sm">
              <strong>Note:</strong> This is the most common cause of the error you&apos;re seeing. The relationship was accidentally removed and needs to be recreated.
            </p>
          </div>
        </div>
      ) : error === 'RLS_ERROR' ? (
        <div className="max-w-2xl mx-auto text-left bg-orange-500/10 border border-orange-500/20 rounded-lg p-6 mb-6">
          <h4 className="text-lg font-semibold text-orange-300 mb-3">🔒 Security Policy Error</h4>
          <p className="text-gray-300 mb-4">
            Row Level Security policies are causing infinite recursion or access issues.
          </p>
          <div className="bg-gray-900/50 rounded-lg p-4 mb-4">
            <h5 className="text-sm font-semibold text-yellow-300 mb-2">💡 Solution:</h5>
            <ol className="text-sm text-gray-300 space-y-2">
              <li>1. Check RLS policies on the profiles table</li>
              <li>2. Ensure super_admin role has proper access</li>
              <li>3. Verify no recursive policy references exist</li>
            </ol>
          </div>
        </div>
      ) : error === 'PERMISSION_ERROR' ? (
        <div className="max-w-2xl mx-auto text-left bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-6 mb-6">
          <h4 className="text-lg font-semibold text-yellow-300 mb-3">🚫 Access Denied</h4>
          <p className="text-gray-300 mb-4">
            Your account doesn&apos;t have super admin privileges or session has expired.
          </p>
          <div className="bg-gray-900/50 rounded-lg p-4 mb-4">
            <h5 className="text-sm font-semibold text-yellow-300 mb-2">💡 Solution:</h5>
            <ol className="text-sm text-gray-300 space-y-2">
              <li>1. Verify your account has super_admin role</li>
              <li>2. Try logging out and logging back in</li>
              <li>3. Contact system administrator if issue persists</li>
            </ol>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto">
          <p className="text-gray-300 mb-6">
            {error || 'There was an error loading the user data. This could be due to network issues or server problems.'}
          </p>
        </div>
      )}
      
      <div className="flex gap-3 justify-center">
        <button
          onClick={loadUsers}
          className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          <ArrowPathIcon className="w-4 h-4" />
          Retry Loading
        </button>
        <button
          onClick={() => {
            setError(null);
            setUsers([]);
            setMessage('Cleared error state - navigator remains functional');
          }}
          className="flex items-center gap-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
        >
          Continue Without Data
        </button>
      </div>
    </div>
  );

  // Loading skeleton component
  const renderLoadingSkeleton = () => (
    <div className="space-y-4">
      {[...Array(5)].map((_, index) => (
        <div key={index} className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gray-600/50 rounded-full animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-600/50 rounded animate-pulse w-1/3" />
              <div className="h-3 bg-gray-600/30 rounded animate-pulse w-1/2" />
            </div>
            <div className="w-20 h-8 bg-gray-600/30 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );

  // Empty state component
  const renderEmptyState = () => (
    <div className="text-center py-12">
      <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
        <UsersIcon className="w-10 h-10 text-purple-400" />
      </div>
      <h3 className="text-xl font-bold text-white mb-4">No Users Found</h3>
      <p className="text-gray-300 mb-6">
        {filters.search || filters.role || filters.country 
          ? 'No users match your current filter criteria.'
          : 'No users are currently registered in the system.'
        }
      </p>
      {(filters.search || filters.role || filters.country) && (
        <button
          onClick={() => {
            setFilters({
              search: '',
              role: '',
              country: '',
              is_active: '',
              sortBy: 'created_at',
              sortOrder: 'desc'
            });
          }}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          Clear Filters
        </button>
      )}
    </div>
  );

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setEditFormData({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.auth_users?.email || '',
      phone: user.phone || '',
      country: user.country || '',
      role: user.role || 'client',
      is_active: user.is_active !== false,
      bio: user.bio || '',
      experience_years: user.experience_years || '',
      specializations: user.specializations || [],
      languages: user.languages || [],
      maritalStatus: user.maritalStatus || '',
      zodiac: user.zodiac || '',
      status: user.status || 'available'
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async () => {
    try {
      setLoading(true);
      const result = await SuperAdminAPI.updateUserProfile(selectedUser.id, editFormData);
      if (result.success) {
        setMessage('User updated successfully');
        setShowEditModal(false);
        await loadUsers();
      } else {
        setMessage(`Error updating user: ${result.error}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    try {
      setLoading(true);
      const result = await SuperAdminAPI.deleteUser(selectedUser.id, 'Admin deletion');
      if (result.success) {
        setMessage('User deleted successfully');
        setShowDeleteModal(false);
        await loadUsers();
      } else {
        setMessage(`Error deleting user: ${result.error}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleImpersonateUser = async (userId) => {
    try {
      const result = await SuperAdminAPI.impersonateUser(userId);
      if (result.success) {
        setMessage('Impersonation started. Redirecting...');
        // Redirect to the user's dashboard
        window.location.href = '/dashboard';
      } else {
        setMessage(`Error starting impersonation: ${result.error}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }
  };

  const exportUsers = () => {
    try {
      if (!users.length) {
        setMessage('No users to export');
        return;
      }

      const csvContent = [
        ['ID', 'Name', 'Email', 'Role', 'Country', 'Active', 'Created'].join(','),
        ...users.map(user => [
          user.id,
          `${user.first_name} ${user.last_name}`,
          user.auth_users?.email || '',
          user.role,
          user.country || '',
          user.is_active ? 'Yes' : 'No',
          new Date(user.created_at).toLocaleDateString()
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      setMessage('Users exported successfully');
    } catch (error) {
      setMessage('Error exporting users');
    }
  };

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

  const getStatusColor = (isActive) => {
    return isActive 
      ? 'bg-green-500/20 text-green-400 border-green-500/30'
      : 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  return (
    <div className="space-y-6">
      {/* Header - always visible */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center">
            <UsersIcon className="w-8 h-8 text-purple-400 mr-3" />
            User Management
          </h2>
          <p className="text-cosmic-300 mt-1">
            Complete control over all user accounts and data
          </p>
        </div>
        <div className="flex space-x-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={exportUsers}
            disabled={loading || (!users.length && !error)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
            <span>Export CSV</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={loadUsers}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </motion.button>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`p-4 rounded-lg ${
            message.includes('Error') || message.includes('failed') 
              ? 'bg-red-500/20 border border-red-500/30 text-red-300' 
              : 'bg-green-500/20 border border-green-500/30 text-green-300'
          }`}
        >
          <div className="flex justify-between items-center">
            <span>{message}</span>
            <button
              onClick={() => setMessage('')}
              className="text-current hover:opacity-70"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Filters */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cosmic-300 w-5 h-5" />
            <input
              type="text"
              placeholder="Search users..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-cosmic-300 focus:border-purple-400 focus:outline-none"
            />
          </div>

          <select
            value={filters.role}
            onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none"
          >
            <option value="">All Roles</option>
            <option value="client">Client</option>
            <option value="reader">Reader</option>
            <option value="admin">Admin</option>
            <option value="monitor">Monitor</option>
            <option value="super_admin">Super Admin</option>
          </select>

          <input
            type="text"
            placeholder="Country..."
            value={filters.country}
            onChange={(e) => setFilters(prev => ({ ...prev, country: e.target.value }))}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-cosmic-300 focus:border-purple-400 focus:outline-none"
          />

          <select
            value={filters.is_active}
            onChange={(e) => setFilters(prev => ({ ...prev, is_active: e.target.value }))}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>

          <select
            value={filters.sortBy}
            onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none"
          >
            <option value="created_at">Created Date</option>
            <option value="first_name">Name</option>
            <option value="role">Role</option>
            <option value="country">Country</option>
          </select>

          <select
            value={filters.sortOrder}
            onChange={(e) => setFilters(prev => ({ ...prev, sortOrder: e.target.value }))}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none"
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl overflow-hidden">
        {/* Content based on current state */}
        {error && users.length === 0 ? (
          // Show error fallback if we have no users and there's an error
          renderErrorFallback()
        ) : loading ? (
          // Show loading skeleton while loading
          <div className="p-6">
            {renderLoadingSkeleton()}
          </div>
        ) : users.length === 0 ? (
          // Show empty state if no users found
          renderEmptyState()
        ) : (
          // Show users table with data
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-cosmic-300">User</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-cosmic-300">Role</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-cosmic-300">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-cosmic-300">Stats</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-cosmic-300">Created</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-cosmic-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {users.map((user) => (
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
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(user.is_active)}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-cosmic-300">
                        <div>Services: {user.services?.length || 0}</div>
                        <div>Bookings: {(user.bookings_as_client?.length || 0) + (user.bookings_as_reader?.length || 0)}</div>
                        <div>Country: {user.country || 'N/A'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-cosmic-300">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end space-x-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleImpersonateUser(user.id)}
                          className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                          title="Impersonate User"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleEditUser(user)}
                          className="p-2 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors"
                          title="Edit User"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => {
                            setSelectedUser(user);
                            setShowDeleteModal(true);
                          }}
                          className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                          title="Delete User"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>

            {/* Show warning if there's an error but we still have data from cache */}
            {error && users.length > 0 && (
              <div className="p-4 bg-yellow-500/10 border-t border-yellow-500/20">
                <div className="flex items-center gap-2 text-yellow-300 text-sm">
                  <ExclamationTriangleIcon className="w-4 h-4" />
                  <span>Data may be outdated. Last error: {error}</span>
                  <button
                    onClick={loadUsers}
                    className="ml-auto text-yellow-300 hover:text-yellow-200 underline"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      <AnimatePresence>
        {showEditModal && (
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
              className="bg-gradient-to-b from-bg-primary to-bg-secondary border border-white/20 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Edit User Profile</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-cosmic-300 hover:text-white"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-cosmic-300 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={editFormData.first_name}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, first_name: e.target.value }))}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-cosmic-300 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={editFormData.last_name}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, last_name: e.target.value }))}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-cosmic-300 mb-2">
                    Email (Read Only)
                  </label>
                  <input
                    type="email"
                    value={editFormData.email}
                    readOnly
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-cosmic-300 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-cosmic-300 mb-2">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-cosmic-300 mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    value={editFormData.country}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, country: e.target.value }))}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-cosmic-300 mb-2">
                    Role
                  </label>
                  <select
                    value={editFormData.role}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none"
                  >
                    <option value="client">Client</option>
                    <option value="reader">Reader</option>
                    <option value="admin">Admin</option>
                    <option value="monitor">Monitor</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-cosmic-300 mb-2">
                    Marital Status
                  </label>
                  <select
                    value={editFormData.maritalStatus}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, maritalStatus: e.target.value }))}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none"
                  >
                    <option value="">Select Status</option>
                    <option value="single">Single</option>
                    <option value="married">Married</option>
                    <option value="engaged">Engaged</option>
                    <option value="in_relationship">In a Relationship</option>
                    <option value="complicated">It&rsquo;s Complicated</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-cosmic-300 mb-2">
                    Status
                  </label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none"
                  >
                    <option value="available">Available</option>
                    <option value="busy">Busy</option>
                    <option value="offline">Offline</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-cosmic-300 mb-2">
                    Bio
                  </label>
                  <textarea
                    value={editFormData.bio}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, bio: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={editFormData.is_active}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                      className="w-4 h-4 text-purple-600 bg-white/10 border-white/20 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm text-cosmic-300">Account Active</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-4 mt-8">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleUpdateUser}
                  disabled={loading}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Update User'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
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
              className="bg-gradient-to-b from-bg-primary to-bg-secondary border border-red-500/30 rounded-2xl p-6 w-full max-w-md"
            >
              <div className="text-center">
                <ExclamationTriangleIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-4">Delete User</h3>
                <p className="text-cosmic-300 mb-6">
                  Are you sure you want to permanently delete this user? This action cannot be undone.
                </p>
                <p className="text-red-400 text-sm mb-6">
                  User: {selectedUser?.first_name} {selectedUser?.last_name}
                </p>
                <div className="flex justify-center space-x-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowDeleteModal(false)}
                    className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleDeleteUser}
                    disabled={loading}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Deleting...' : 'Delete User'}
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

export default UserManagementTab; 