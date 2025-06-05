import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { UserAPI } from '../api/userApi.js';

const RoleDemo = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const changeRole = async (newRole) => {
    if (!user) {
      setMessage('Please sign in first');
      return;
    }

    try {
      setLoading(true);
      const result = await UserAPI.updateProfile(user.id, { role: newRole });
      
      if (result.success) {
        await refreshProfile();
        setMessage(`Role changed to ${newRole} successfully!`);
      } else {
        setMessage(`Failed to change role: ${result.error}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { id: 'client', name: 'Client', icon: '👤', description: 'Book services and chat with readers' },
    { id: 'reader', name: 'Reader', icon: '🔮', description: 'Provide spiritual guidance and manage bookings' },
    { id: 'admin', name: 'Admin', icon: '👑', description: 'Manage platform and users' },
    { id: 'monitor', name: 'Monitor', icon: '👁️', description: 'Monitor sessions and quality' }
  ];

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">🔮 Role Demo</h2>
          <p className="text-gray-600 mb-6">Please sign in to test different user roles</p>
          <a 
            href="/auth" 
            className="inline-flex items-center px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">🔮 Role Demo</h2>
        <p className="text-gray-600">Test different user roles to explore dashboard features</p>
      </div>

      {/* Current Role */}
      <div className="mb-8 p-4 bg-purple-50 rounded-lg border border-purple-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-purple-900">Current Role</h3>
            <p className="text-purple-700">
              {roles.find(r => r.id === profile?.role)?.icon} {profile?.role || 'Not set'} - {roles.find(r => r.id === profile?.role)?.description}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-purple-600">User: {user.email}</p>
            <p className="text-sm text-purple-600">ID: {user.id.slice(0, 8)}...</p>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.includes('successfully') 
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      {/* Role Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {roles.map((role) => (
          <div key={role.id} className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">{role.icon}</span>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{role.name}</h3>
                  <p className="text-sm text-gray-600">{role.description}</p>
                </div>
              </div>
              {profile?.role === role.id && (
                <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                  Current
                </span>
              )}
            </div>
            
            <div className="space-y-2">
              <button
                onClick={() => changeRole(role.id)}
                disabled={loading || profile?.role === role.id}
                className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                  profile?.role === role.id
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                {loading ? 'Changing...' : profile?.role === role.id ? 'Current Role' : `Switch to ${role.name}`}
              </button>
              
              {role.id === 'client' && (
                <a 
                  href="/dashboard/client"
                  className="block w-full px-4 py-2 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition-colors"
                >
                  View Client Dashboard
                </a>
              )}
              
              {role.id === 'reader' && (
                <a 
                  href="/dashboard/reader"
                  className="block w-full px-4 py-2 bg-purple-600 text-white text-center rounded-lg hover:bg-purple-700 transition-colors"
                >
                  View Reader Dashboard
                </a>
              )}
              
              {role.id === 'admin' && (
                <a 
                  href="/dashboard/admin"
                  className="block w-full px-4 py-2 bg-red-600 text-white text-center rounded-lg hover:bg-red-700 transition-colors"
                >
                  View Admin Dashboard
                </a>
              )}
              
              {role.id === 'monitor' && (
                <a 
                  href="/dashboard/monitor"
                  className="block w-full px-4 py-2 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition-colors"
                >
                  View Monitor Dashboard
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <a 
            href="/test"
            className="flex items-center justify-center px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="mr-2">🧪</span>
            <span className="text-sm font-medium">Connection Test</span>
          </a>
          
          <a 
            href="/book"
            className="flex items-center justify-center px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="mr-2">📅</span>
            <span className="text-sm font-medium">Book Service</span>
          </a>
          
          <a 
            href="/dashboard/client"
            className="flex items-center justify-center px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="mr-2">👤</span>
            <span className="text-sm font-medium">Client Dashboard</span>
          </a>
          
          <a 
            href="/dashboard/reader"
            className="flex items-center justify-center px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="mr-2">🔮</span>
            <span className="text-sm font-medium">Reader Dashboard</span>
          </a>
          
          <a 
            href="/dashboard/admin"
            className="flex items-center justify-center px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="mr-2">👑</span>
            <span className="text-sm font-medium">Admin Dashboard</span>
          </a>
          
          <a 
            href="/dashboard/monitor"
            className="flex items-center justify-center px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="mr-2">👁️</span>
            <span className="text-sm font-medium">Monitor Dashboard</span>
          </a>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h4 className="font-semibold text-yellow-800 mb-2">📋 Testing Instructions:</h4>
        <ol className="list-decimal list-inside text-sm text-yellow-700 space-y-1">
          <li>Switch to &ldquo;Admin&rdquo; role to access the Admin Dashboard</li>
          <li>Test user management, role assignments, and search functionality</li>
          <li>Manage services, pricing, and availability settings</li>
          <li>View and filter bookings, export data, and update statuses</li>
          <li>Review payments, approve transfers, and view receipts</li>
          <li>Monitor active chats and perform emergency overrides</li>
          <li>Switch to &ldquo;Monitor&rdquo; role to access the Monitor Dashboard</li>
          <li>Test approval queue for voice messages, profile updates, and AI readings</li>
          <li>Use surveillance tools to monitor calls, chats, and flag content</li>
          <li>Create and submit internal reports to administrators</li>
          <li>Switch between roles to test different dashboard features</li>
        </ol>
      </div>
    </div>
  );
};

export default RoleDemo; 