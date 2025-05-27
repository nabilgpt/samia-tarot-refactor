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

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setLoading(true);
    setMessage('Testing Supabase connection...');
    
    try {
      // Test 1: Check if we can connect to Supabase
      const { data, error } = await supabase.from('profiles').select('count');
      setTestResults(prev => ({
        ...prev,
        connection: error ? 'Failed' : 'Success'
      }));

      // Test 2: Check current user
      const userResult = await UserAPI.getCurrentUser();
      setTestResults(prev => ({
        ...prev,
        currentUser: userResult.success ? 'Success' : 'No user logged in'
      }));

      if (userResult.success && userResult.data) {
        setUser(userResult.data);
        setProfile(userResult.data.profile);
      }

      // Test 3: Check services table
      const servicesResult = await supabase.from('services').select('*').limit(5);
      setTestResults(prev => ({
        ...prev,
        services: servicesResult.error ? 'Failed' : `Success (${servicesResult.data.length} services)`
      }));
      setServices(servicesResult.data || []);

      setMessage('Connection tests completed!');
    } catch (error) {
      setMessage(`Error: ${error.message}`);
      setTestResults(prev => ({
        ...prev,
        error: error.message
      }));
    } finally {
      setLoading(false);
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
      <h2 className="text-2xl font-bold mb-6 text-center text-purple-800">
        🔮 Supabase Connection Test
      </h2>

      {/* Status Message */}
      {message && (
        <div className={`p-4 rounded-lg mb-6 ${
          message.includes('Error') || message.includes('Failed') 
            ? 'bg-red-100 text-red-700 border border-red-300'
            : 'bg-green-100 text-green-700 border border-green-300'
        }`}>
          {message}
        </div>
      )}

      {/* Test Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-3 text-gray-800">Connection Tests</h3>
          <div className="space-y-2">
            {Object.entries(testResults).map(([test, result]) => (
              <div key={test} className="flex justify-between">
                <span className="capitalize">{test.replace(/([A-Z])/g, ' $1')}:</span>
                <span className={`font-medium ${
                  result.includes('Success') ? 'text-green-600' : 
                  result.includes('Failed') ? 'text-red-600' : 'text-yellow-600'
                }`}>
                  {result}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-3 text-gray-800">User Status</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Authenticated:</span>
              <span className={`font-medium ${user ? 'text-green-600' : 'text-red-600'}`}>
                {user ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Profile:</span>
              <span className={`font-medium ${profile ? 'text-green-600' : 'text-yellow-600'}`}>
                {profile ? 'Exists' : 'Not created'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Services:</span>
              <span className="font-medium text-blue-600">
                {services.length} available
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* User Information */}
      {user && (
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold mb-3 text-blue-800">Current User</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>ID:</strong> {user.id}
            </div>
            <div>
              <strong>Email:</strong> {user.email || 'N/A'}
            </div>
            <div>
              <strong>Phone:</strong> {user.phone || 'N/A'}
            </div>
            <div>
              <strong>Provider:</strong> {user.app_metadata?.provider || 'N/A'}
            </div>
          </div>
        </div>
      )}

      {/* Profile Information */}
      {profile && (
        <div className="bg-purple-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold mb-3 text-purple-800">User Profile</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Name:</strong> {profile.first_name} {profile.last_name}
            </div>
            <div>
              <strong>Role:</strong> {profile.role}
            </div>
            <div>
              <strong>Country:</strong> {profile.country || 'N/A'}
            </div>
            <div>
              <strong>Zodiac:</strong> {profile.zodiac || 'N/A'}
            </div>
          </div>
        </div>
      )}

      {/* Services List */}
      {services.length > 0 && (
        <div className="bg-green-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold mb-3 text-green-800">Available Services</h3>
          <div className="space-y-2">
            {services.map((service) => (
              <div key={service.id} className="flex justify-between items-center">
                <span>{service.name}</span>
                <span className="text-sm text-gray-600">
                  ${service.price} • {service.duration_minutes}min
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 justify-center">
        <button
          onClick={checkConnection}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Connection'}
        </button>

        {!user ? (
          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            Sign In with Google
          </button>
        ) : (
          <>
            <button
              onClick={signOut}
              disabled={loading}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              Sign Out
            </button>

            {!profile && (
              <button
                onClick={testCreateProfile}
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Create Profile
              </button>
            )}

            {profile && (
              <button
                onClick={testUpdateProfile}
                disabled={loading}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                Update Profile
              </button>
            )}
          </>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <h4 className="font-semibold text-yellow-800 mb-2">Instructions:</h4>
        <ol className="list-decimal list-inside text-sm text-yellow-700 space-y-1">
          <li>First, run the database schema in your Supabase SQL editor</li>
          <li>Click "Test Connection" to verify database connectivity</li>
          <li>Sign in with Google to test authentication</li>
          <li>Create and update your profile to test API functions</li>
          <li>Check that all tests show "Success" status</li>
        </ol>
      </div>
    </div>
  );
};

export default SupabaseTest; 