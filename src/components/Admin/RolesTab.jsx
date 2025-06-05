import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase.js';

const RolesTab = ({ onUpdate }) => {
  const [roles, setRoles] = useState([]);
  const [roleChanges, setRoleChanges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: []
  });

  const defaultRoles = [
    {
      id: 'client',
      name: 'Client',
      description: 'Regular users who book services',
      permissions: ['book_services', 'view_bookings', 'chat_with_readers', 'leave_reviews'],
      color: 'bg-green-100 text-green-800',
      icon: '👤',
      isDefault: true
    },
    {
      id: 'reader',
      name: 'Reader',
      description: 'Spiritual advisors who provide services',
      permissions: ['manage_services', 'view_bookings', 'chat_with_clients', 'manage_schedule'],
      color: 'bg-purple-100 text-purple-800',
      icon: '🔮',
      isDefault: true
    },
    {
      id: 'admin',
      name: 'Admin',
      description: 'Platform administrators with full access',
      permissions: ['manage_users', 'manage_services', 'manage_payments', 'view_analytics', 'manage_roles'],
      color: 'bg-red-100 text-red-800',
      icon: '👑',
      isDefault: true
    },
    {
      id: 'monitor',
      name: 'Monitor',
      description: 'Quality assurance and monitoring staff',
      permissions: ['view_chats', 'view_analytics', 'emergency_override', 'generate_reports'],
      color: 'bg-blue-100 text-blue-800',
      icon: '👁️',
      isDefault: true
    }
  ];

  const availablePermissions = [
    { id: 'book_services', name: 'Book Services', description: 'Can book and schedule services' },
    { id: 'view_bookings', name: 'View Bookings', description: 'Can view booking information' },
    { id: 'chat_with_readers', name: 'Chat with Readers', description: 'Can chat with service providers' },
    { id: 'chat_with_clients', name: 'Chat with Clients', description: 'Can chat with service clients' },
    { id: 'leave_reviews', name: 'Leave Reviews', description: 'Can leave reviews and ratings' },
    { id: 'manage_services', name: 'Manage Services', description: 'Can create and edit services' },
    { id: 'manage_schedule', name: 'Manage Schedule', description: 'Can manage availability schedule' },
    { id: 'manage_users', name: 'Manage Users', description: 'Can manage user accounts and roles' },
    { id: 'manage_payments', name: 'Manage Payments', description: 'Can view and manage payments' },
    { id: 'view_analytics', name: 'View Analytics', description: 'Can access platform analytics' },
    { id: 'manage_roles', name: 'Manage Roles', description: 'Can create and edit user roles' },
    { id: 'view_chats', name: 'View Chats', description: 'Can monitor chat conversations' },
    { id: 'emergency_override', name: 'Emergency Override', description: 'Can override active sessions' },
    { id: 'generate_reports', name: 'Generate Reports', description: 'Can generate system reports' }
  ];

  useEffect(() => {
    loadRoleChanges();
  }, []);

  const loadRoleChanges = async () => {
    try {
      setLoading(true);
      // Get recent role changes from profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          role,
          updated_at,
          first_name,
          last_name,
          email
        `)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setRoleChanges(data || []);
    } catch (error) {
      console.error('Error loading role changes:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleStats = () => {
    const stats = {};
    roleChanges.forEach(user => {
      stats[user.role] = (stats[user.role] || 0) + 1;
    });
    return stats;
  };

  const roleStats = getRoleStats();

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Roles Management</h3>
        <button
          onClick={() => {
            setEditingRole(null);
            setFormData({ name: '', description: '', permissions: [] });
            setShowRoleModal(true);
          }}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Create Custom Role
        </button>
      </div>

      {/* Role Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {defaultRoles.map((role) => (
          <div key={role.id} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className={`p-2 rounded-lg ${role.color.replace('text-', 'bg-').replace('-800', '-100')}`}>
                <span className="text-2xl">{role.icon}</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{role.name}</p>
                <p className="text-2xl font-bold text-gray-900">{roleStats[role.id] || 0}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Default Roles */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-lg font-semibold text-gray-900">System Roles</h4>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {defaultRoles.map((role) => (
              <div key={role.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{role.icon}</span>
                    <div>
                      <h5 className="font-semibold text-gray-900">{role.name}</h5>
                      <p className="text-sm text-gray-600">{role.description}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${role.color}`}>
                    System Role
                  </span>
                </div>

                <div className="space-y-2">
                  <h6 className="text-sm font-medium text-gray-700">Permissions:</h6>
                  <div className="flex flex-wrap gap-1">
                    {role.permissions.map(permission => {
                      const permissionInfo = availablePermissions.find(p => p.id === permission);
                      return (
                        <span
                          key={permission}
                          className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                          title={permissionInfo?.description}
                        >
                          {permissionInfo?.name || permission}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-3 text-sm text-gray-500">
                  {roleStats[role.id] || 0} users assigned
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Role Changes */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h4 className="text-lg font-semibold text-gray-900">Recent Role Changes</h4>
          <button
            onClick={loadRoleChanges}
            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            Refresh
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                    Loading role changes...
                  </td>
                </tr>
              ) : roleChanges.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                    No role changes found
                  </td>
                </tr>
              ) : (
                roleChanges.slice(0, 10).map((user) => {
                  const role = defaultRoles.find(r => r.id === user.role);
                  return (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {user.first_name} {user.last_name}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${role?.color || 'bg-gray-100 text-gray-800'}`}>
                          <span className="mr-1">{role?.icon || '❓'}</span>
                          {role?.name || user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDateTime(user.updated_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-blue-600 hover:text-blue-900">
                          View History
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Creation Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingRole ? 'Edit Role' : 'Create Custom Role'}
              </h3>
              <button
                onClick={() => setShowRoleModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="e.g., Moderator"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Describe what this role can do..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {availablePermissions.map(permission => (
                    <label key={permission.id} className="flex items-start space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.permissions.includes(permission.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData(prev => ({
                              ...prev,
                              permissions: [...prev.permissions, permission.id]
                            }));
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              permissions: prev.permissions.filter(p => p !== permission.id)
                            }));
                          }
                        }}
                        className="mt-1"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{permission.name}</div>
                        <div className="text-xs text-gray-500">{permission.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowRoleModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Custom role creation would be implemented here
                    console.log('Creating custom role:', formData);
                    setShowRoleModal(false);
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  {editingRole ? 'Update Role' : 'Create Role'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RolesTab; 