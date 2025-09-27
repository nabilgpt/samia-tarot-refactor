import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Search, Filter, Plus, Edit3, Trash2, Shield, User, Clock, Mail, Phone, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../../lib/api';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('view'); // 'view', 'edit', 'create'
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    fetchUsers();
  }, [filter]);

  const fetchUsers = async () => {
    try {
      const data = await api.getAllUsers(filter);
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (userData) => {
    try {
      await api.createUser(userData);
      fetchUsers();
      closeModal();
    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  const handleUpdateUser = async (userId, userData) => {
    try {
      await api.updateUser(userId, userData);
      fetchUsers();
      closeModal();
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await api.deleteUser(userId);
        fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  const openModal = (type, user = null) => {
    setModalType(type);
    setSelectedUser(user);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalType('view');
    setSelectedUser(null);
    setModalOpen(false);
  };

  const getRoleColor = (role) => {
    switch (role?.toLowerCase()) {
      case 'superadmin': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'admin': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'monitor': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'reader': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'client': return 'text-green-400 bg-green-500/10 border-green-500/20';
      default: return 'text-theme-secondary bg-theme-card border-theme-cosmic';
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'suspended': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'pending': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      default: return 'text-theme-secondary bg-theme-card border-theme-cosmic';
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesFilter = filter === 'all' || user.role === filter || user.status === filter;
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

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
          className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-12"
        >
          <div>
            <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-4">
              User Management
            </h1>
            <div className="w-32 h-1 bg-cosmic-gradient mb-6 rounded-full shadow-theme-cosmic" />
            <p className="text-theme-secondary text-lg">
              Manage platform users, roles, and permissions
            </p>
          </div>

          <button
            onClick={() => openModal('create')}
            className="inline-flex items-center px-6 py-3 bg-cosmic-gradient hover:shadow-theme-cosmic text-theme-inverse font-bold rounded-lg transition-all duration-300 transform hover:scale-105"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add New User
          </button>
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
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-theme-card border border-theme-cosmic rounded-lg text-theme-primary placeholder-theme-muted focus:border-gold-primary focus:outline-none transition-colors duration-300"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              {['all', 'superadmin', 'admin', 'monitor', 'reader', 'client', 'active', 'suspended'].map((filterOption) => (
                <button
                  key={filterOption}
                  onClick={() => setFilter(filterOption)}
                  className={`px-3 py-2 rounded-lg font-medium transition-all duration-300 capitalize text-sm ${
                    filter === filterOption
                      ? 'bg-cosmic-gradient text-theme-inverse'
                      : 'bg-theme-card border border-theme-cosmic text-theme-primary hover:border-gold-primary'
                  }`}
                >
                  {filterOption}
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
          className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8"
        >
          <div className="bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-xl p-4 text-center">
            <div className="text-2xl font-bold gradient-text">{users.length}</div>
            <p className="text-theme-secondary text-sm">Total Users</p>
          </div>
          <div className="bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{users.filter(u => u.role === 'reader').length}</div>
            <p className="text-theme-secondary text-sm">Readers</p>
          </div>
          <div className="bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{users.filter(u => u.role === 'client').length}</div>
            <p className="text-theme-secondary text-sm">Clients</p>
          </div>
          <div className="bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-orange-400">{users.filter(u => u.role === 'admin').length}</div>
            <p className="text-theme-secondary text-sm">Admins</p>
          </div>
          <div className="bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{users.filter(u => u.status === 'active').length}</div>
            <p className="text-theme-secondary text-sm">Active</p>
          </div>
        </motion.div>

        {/* Users Table */}
        {loading ? (
          <div className="bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-2xl p-6">
            <div className="animate-pulse space-y-4">
              {Array(5).fill(0).map((_, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-theme-tertiary rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-theme-tertiary rounded w-3/4"></div>
                    <div className="h-3 bg-theme-tertiary rounded w-1/2"></div>
                  </div>
                  <div className="space-x-2">
                    <div className="h-8 w-16 bg-theme-tertiary rounded inline-block"></div>
                    <div className="h-8 w-16 bg-theme-tertiary rounded inline-block"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-2xl overflow-hidden"
          >
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <User className="w-16 h-16 text-theme-muted mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-theme-primary mb-2">No Users Found</h3>
                <p className="text-theme-secondary">
                  {searchTerm ? 'Try adjusting your search terms' : 'No users match the current filter'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-theme-card/50 border-b border-theme-cosmic">
                    <tr>
                      <th className="text-left p-4 font-medium text-theme-primary">User</th>
                      <th className="text-left p-4 font-medium text-theme-primary">Role</th>
                      <th className="text-left p-4 font-medium text-theme-primary">Status</th>
                      <th className="text-left p-4 font-medium text-theme-primary">Last Seen</th>
                      <th className="text-left p-4 font-medium text-theme-primary">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme-cosmic">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-theme-card/30 transition-colors duration-200">
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-cosmic-gradient rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-theme-inverse" />
                            </div>
                            <div>
                              <p className="font-medium text-theme-primary">{user.name || 'Unnamed'}</p>
                              <p className="text-sm text-theme-secondary flex items-center">
                                <Mail className="w-3 h-3 mr-1" />
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getRoleColor(user.role)}`}>
                            <Shield className="w-3 h-3 mr-1" />
                            {user.role?.toUpperCase() || 'UNKNOWN'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(user.status)}`}>
                            {user.status === 'active' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {user.status === 'suspended' && <AlertCircle className="w-3 h-3 mr-1" />}
                            {user.status?.toUpperCase() || 'UNKNOWN'}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center text-theme-secondary text-sm">
                            <Clock className="w-3 h-3 mr-1" />
                            {user.last_seen ? new Date(user.last_seen).toLocaleDateString() : 'Never'}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => openModal('view', user)}
                              className="p-2 text-theme-secondary hover:text-gold-primary rounded-lg hover:bg-theme-cosmic transition-colors duration-200"
                              title="View Details"
                            >
                              <User className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openModal('edit', user)}
                              className="p-2 text-theme-secondary hover:text-blue-400 rounded-lg hover:bg-theme-cosmic transition-colors duration-200"
                              title="Edit User"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-2 text-theme-secondary hover:text-red-400 rounded-lg hover:bg-theme-cosmic transition-colors duration-200"
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {/* User Modal */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            >
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold gradient-text">
                  {modalType === 'create' ? 'Create New User' : modalType === 'edit' ? 'Edit User' : 'User Details'}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-theme-secondary hover:text-theme-primary text-2xl"
                >
                  ×
                </button>
              </div>

              {modalType === 'view' && selectedUser && (
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-medium text-theme-primary mb-2">Personal Information</h3>
                      <div className="space-y-2">
                        <p className="text-theme-secondary"><strong>Name:</strong> {selectedUser.name || 'Not provided'}</p>
                        <p className="text-theme-secondary"><strong>Email:</strong> {selectedUser.email}</p>
                        <p className="text-theme-secondary"><strong>Phone:</strong> {selectedUser.phone || 'Not provided'}</p>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-medium text-theme-primary mb-2">Account Details</h3>
                      <div className="space-y-2">
                        <p className="text-theme-secondary"><strong>Role:</strong> {selectedUser.role}</p>
                        <p className="text-theme-secondary"><strong>Status:</strong> {selectedUser.status}</p>
                        <p className="text-theme-secondary"><strong>Created:</strong> {new Date(selectedUser.created_at).toLocaleDateString()}</p>
                        <p className="text-theme-secondary"><strong>Last Seen:</strong> {selectedUser.last_seen ? new Date(selectedUser.last_seen).toLocaleDateString() : 'Never'}</p>
                      </div>
                    </div>
                  </div>

                  {selectedUser.role === 'reader' && (
                    <div>
                      <h3 className="font-medium text-theme-primary mb-2">Reader Statistics</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-theme-card/50 rounded-lg p-3 text-center">
                          <div className="text-lg font-bold text-gold-primary">{selectedUser.total_readings || 0}</div>
                          <p className="text-xs text-theme-secondary">Total Readings</p>
                        </div>
                        <div className="bg-theme-card/50 rounded-lg p-3 text-center">
                          <div className="text-lg font-bold text-green-400">{selectedUser.rating || 0}⭐</div>
                          <p className="text-xs text-theme-secondary">Rating</p>
                        </div>
                        <div className="bg-theme-card/50 rounded-lg p-3 text-center">
                          <div className="text-lg font-bold text-blue-400">${selectedUser.earnings || 0}</div>
                          <p className="text-xs text-theme-secondary">Earnings</p>
                        </div>
                        <div className="bg-theme-card/50 rounded-lg p-3 text-center">
                          <div className="text-lg font-bold text-purple-400">{selectedUser.specialties?.length || 0}</div>
                          <p className="text-xs text-theme-secondary">Specialties</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4 border-t border-theme-cosmic">
                    <button
                      onClick={() => openModal('edit', selectedUser)}
                      className="px-4 py-2 bg-cosmic-gradient text-theme-inverse rounded-lg"
                    >
                      Edit User
                    </button>
                    <button
                      onClick={closeModal}
                      className="px-4 py-2 bg-theme-card border border-theme-cosmic text-theme-primary rounded-lg"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}

              {(modalType === 'edit' || modalType === 'create') && (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const userData = Object.fromEntries(formData.entries());
                  if (modalType === 'edit') {
                    handleUpdateUser(selectedUser.id, userData);
                  } else {
                    handleCreateUser(userData);
                  }
                }}>
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-theme-secondary text-sm mb-2">Name</label>
                        <input
                          type="text"
                          name="name"
                          defaultValue={selectedUser?.name || ''}
                          className="w-full bg-theme-card border border-theme-cosmic rounded-lg p-3 text-theme-primary focus:border-gold-primary focus:outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-theme-secondary text-sm mb-2">Email</label>
                        <input
                          type="email"
                          name="email"
                          defaultValue={selectedUser?.email || ''}
                          className="w-full bg-theme-card border border-theme-cosmic rounded-lg p-3 text-theme-primary focus:border-gold-primary focus:outline-none"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-theme-secondary text-sm mb-2">Role</label>
                        <select
                          name="role"
                          defaultValue={selectedUser?.role || 'client'}
                          className="w-full bg-theme-card border border-theme-cosmic rounded-lg p-3 text-theme-primary focus:border-gold-primary focus:outline-none"
                          required
                        >
                          <option value="client">Client</option>
                          <option value="reader">Reader</option>
                          <option value="monitor">Monitor</option>
                          <option value="admin">Admin</option>
                          <option value="superadmin">Super Admin</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-theme-secondary text-sm mb-2">Status</label>
                        <select
                          name="status"
                          defaultValue={selectedUser?.status || 'active'}
                          className="w-full bg-theme-card border border-theme-cosmic rounded-lg p-3 text-theme-primary focus:border-gold-primary focus:outline-none"
                          required
                        >
                          <option value="active">Active</option>
                          <option value="suspended">Suspended</option>
                          <option value="pending">Pending</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-theme-secondary text-sm mb-2">Phone (Optional)</label>
                      <input
                        type="tel"
                        name="phone"
                        defaultValue={selectedUser?.phone || ''}
                        className="w-full bg-theme-card border border-theme-cosmic rounded-lg p-3 text-theme-primary focus:border-gold-primary focus:outline-none"
                      />
                    </div>

                    {modalType === 'create' && (
                      <div>
                        <label className="block text-theme-secondary text-sm mb-2">Password</label>
                        <input
                          type="password"
                          name="password"
                          className="w-full bg-theme-card border border-theme-cosmic rounded-lg p-3 text-theme-primary focus:border-gold-primary focus:outline-none"
                          required
                        />
                      </div>
                    )}

                    <div className="flex gap-3 pt-4 border-t border-theme-cosmic">
                      <button
                        type="submit"
                        className="px-6 py-3 bg-cosmic-gradient text-theme-inverse font-bold rounded-lg"
                      >
                        {modalType === 'create' ? 'Create User' : 'Update User'}
                      </button>
                      <button
                        type="button"
                        onClick={closeModal}
                        className="px-6 py-3 bg-theme-card border border-theme-cosmic text-theme-primary rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Users;