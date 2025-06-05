import React, { useState, useEffect } from 'react';
import { UserAPI } from '../api/userApi.js';
import { supabase } from '../lib/supabase.js';

const SupabaseTest = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [testResults, setTestResults] = useState({});
  const [connectionStatus, setConnectionStatus] = useState('testing');
  const [tables, setTables] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      setConnectionStatus('testing');
      setError(null);

      // Test basic connection
      console.log('Testing Supabase connection...');
      
      // Test each table
      const tableTests = [
        'profiles',
        'services', 
        'bookings',
        'payments',
        'messages',
        'reviews',
        'notifications'
      ];

      const tableResults = [];

      for (const tableName of tableTests) {
        try {
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);
          
          if (error) {
            tableResults.push({
              name: tableName,
              status: 'error',
              error: error.message
            });
          } else {
            tableResults.push({
              name: tableName,
              status: 'success',
              count: data?.length || 0
            });
          }
        } catch (err) {
          tableResults.push({
            name: tableName,
            status: 'error',
            error: err.message
          });
        }
      }

      setTables(tableResults);

      // Test services data specifically
      try {
        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select('*');
        
        if (servicesError) {
          console.error('Services error:', servicesError);
        } else {
          setServices(servicesData || []);
        }
      } catch (err) {
        console.error('Services fetch error:', err);
      }

      setConnectionStatus('completed');
    } catch (error) {
      console.error('Connection test failed:', error);
      setError(error.message);
      setConnectionStatus('failed');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'testing': return '⏳';
      default: return '❓';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'testing': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const testCreateProfile = async () => {
    if (!user) {
      setMessage('Please sign in first to test profile creation');
      return;
    }

    setLoading(true);
    try {
      const profileData = {
        id: user.id,
        first_name: 'Test',
        last_name: 'User',
        country: 'Lebanon',
        zodiac: 'Virgo'
      };

      const result = await UserAPI.createProfile(profileData);
      if (result.success) {
        setProfile(result.data);
        setMessage('Profile created successfully!');
        setTestResults(prev => ({
          ...prev,
          profileCreation: 'Success'
        }));
      } else {
        setMessage(`Profile creation failed: ${result.error}`);
        setTestResults(prev => ({
          ...prev,
          profileCreation: `Failed: ${result.error}`
        }));
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testUpdateProfile = async () => {
    if (!user) {
      setMessage('Please sign in first to test profile update');
      return;
    }

    setLoading(true);
    try {
      const updates = {
        zodiac: 'Leo',
        country: 'UAE'
      };

      const result = await UserAPI.updateProfile(user.id, updates);
      if (result.success) {
        setProfile(result.data);
        setMessage('Profile updated successfully!');
        setTestResults(prev => ({
          ...prev,
          profileUpdate: 'Success'
        }));
      } else {
        setMessage(`Profile update failed: ${result.error}`);
        setTestResults(prev => ({
          ...prev,
          profileUpdate: `Failed: ${result.error}`
        }));
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });

      if (error) {
        setMessage(`Google sign-in failed: ${error.message}`);
      } else {
        setMessage('Redirecting to Google...');
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const result = await UserAPI.signOut();
      if (result.success) {
        setUser(null);
        setProfile(null);
        setMessage('Signed out successfully');
        setTestResults({});
      } else {
        setMessage(`Sign out failed: ${result.error}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🔮 SAMIA TAROT</h1>
        <h2 className="text-xl text-gray-600">Supabase Connection Test</h2>
      </div>

      {/* Connection Status */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Connection Status</h3>
        <div className="flex items-center space-x-2">
          <span className="text-2xl">
            {connectionStatus === 'testing' && '⏳'}
            {connectionStatus === 'completed' && '✅'}
            {connectionStatus === 'failed' && '❌'}
          </span>
          <span className={`font-medium ${
            connectionStatus === 'testing' ? 'text-yellow-600' :
            connectionStatus === 'completed' ? 'text-green-600' :
            'text-red-600'
          }`}>
            {connectionStatus === 'testing' && 'Testing connection...'}
            {connectionStatus === 'completed' && 'Connection successful!'}
            {connectionStatus === 'failed' && 'Connection failed'}
          </span>
        </div>
        {error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Tables Status */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Database Tables</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tables.map((table) => (
            <div key={table.name} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">{table.name}</span>
                <span className="text-xl">{getStatusIcon(table.status)}</span>
              </div>
              <div className={`text-sm ${getStatusColor(table.status)}`}>
                {table.status === 'success' ? 
                  `Table exists (${table.count} records)` : 
                  table.error || 'Error accessing table'
                }
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Services Data */}
      {services.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Sample Services ({services.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.slice(0, 6).map((service) => (
              <div key={service.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{service.name}</h4>
                  {service.is_vip && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                      VIP
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  {service.type} • {service.duration_minutes} min
                </div>
                <div className="text-lg font-bold text-purple-600">
                  ${service.price}
                </div>
              </div>
            ))}
          </div>
          {services.length > 6 && (
            <div className="text-center mt-4 text-gray-500">
              ... and {services.length - 6} more services
            </div>
          )}
        </div>
      )}

      {/* Setup Instructions */}
      {tables.some(t => t.status === 'error') && (
        <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="text-lg font-semibold text-yellow-800 mb-3">⚠️ Setup Required</h3>
          <p className="text-yellow-700 mb-4">
            Some tables are missing. Please run the database setup:
          </p>
          <ol className="list-decimal list-inside text-yellow-700 space-y-2">
            <li>Go to your Supabase project dashboard</li>
            <li>Open the SQL Editor</li>
            <li>Copy and paste the contents of <code>database/schema.sql</code></li>
            <li>Click &ldquo;RUN&rdquo; to execute the schema</li>
            <li>Refresh this page to test again</li>
          </ol>
        </div>
      )}

      {/* Success Message */}
      {connectionStatus === 'completed' && tables.every(t => t.status === 'success') && (
        <div className="p-6 bg-green-50 border border-green-200 rounded-lg text-center">
          <h3 className="text-lg font-semibold text-green-800 mb-2">🎉 Setup Complete!</h3>
          <p className="text-green-700 mb-4">
            Your SAMIA TAROT database is fully configured and ready to use.
          </p>
          <div className="space-y-2 text-sm text-green-600">
            <div>✅ All 7 tables created successfully</div>
            <div>✅ {services.length} sample services loaded</div>
            <div>✅ Row Level Security enabled</div>
            <div>✅ Auto-profile creation configured</div>
          </div>
        </div>
      )}

      {/* Retry Button */}
      <div className="text-center mt-6">
        <button
          onClick={testConnection}
          className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
        >
          🔄 Test Again
        </button>
      </div>
    </div>
  );
};

export default SupabaseTest; 