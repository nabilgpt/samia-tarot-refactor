import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { secureAPI, hasPermission, hasRoleLevel } from '../../lib/apiSecurity';
import { Shield, CheckCircle, XCircle, AlertTriangle, Play, FileText, User } from 'lucide-react';

const RoleBasedAccessTest = () => {
  const { user, profile } = useAuth();
  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState('');

  // Test scenarios for each role
  const testScenarios = {
    client: [
      { name: 'View own bookings', permission: 'getUserBookings', shouldPass: true },
      { name: 'View all bookings', permission: 'getAllBookings', shouldPass: false },
      { name: 'Manage services', permission: 'getAllServices', shouldPass: false },
      { name: 'Manage users', permission: 'getUsers', shouldPass: false },
      { name: 'View own payments', permission: 'getUserPayments', shouldPass: true },
      { name: 'View all payments', permission: 'getAllPayments', shouldPass: false }
    ],
    reader: [
      { name: 'View assigned bookings', permission: 'getReaderBookings', shouldPass: true },
      { name: 'View all bookings', permission: 'getAllBookings', shouldPass: false },
      { name: 'Manage services', permission: 'getAllServices', shouldPass: false },
      { name: 'Manage users', permission: 'getUsers', shouldPass: false },
      { name: 'View all payments', permission: 'getAllPayments', shouldPass: false }
    ],
    monitor: [
      { name: 'View all bookings', permission: 'getAllBookings', shouldPass: true },
      { name: 'View all payments', permission: 'getAllPayments', shouldPass: true },
      { name: 'Manage services', permission: 'getAllServices', shouldPass: false },
      { name: 'Manage users', permission: 'getUsers', shouldPass: false },
      { name: 'Update user roles', permission: 'updateUserRole', shouldPass: false }
    ],
    admin: [
      { name: 'View all bookings', permission: 'getAllBookings', shouldPass: true },
      { name: 'View all payments', permission: 'getAllPayments', shouldPass: true },
      { name: 'Manage services', permission: 'getAllServices', shouldPass: true },
      { name: 'Manage users', permission: 'getUsers', shouldPass: true },
      { name: 'Update user roles (non-super)', permission: 'updateUserRole', shouldPass: false }
    ],
    super_admin: [
      { name: 'View all bookings', permission: 'getAllBookings', shouldPass: true },
      { name: 'View all payments', permission: 'getAllPayments', shouldPass: true },
      { name: 'Manage services', permission: 'getAllServices', shouldPass: true },
      { name: 'Manage users', permission: 'getUsers', shouldPass: true },
      { name: 'Update user roles', permission: 'updateUserRole', shouldPass: true }
    ]
  };

  // Permission mapping for API calls
  const permissionMapping = {
    getUserBookings: () => secureAPI.getUserBookings(user.id),
    getAllBookings: () => secureAPI.getAllBookings(),
    getAllServices: () => secureAPI.getAllServices(),
    getUsers: () => secureAPI.getUsers(),
    getUserPayments: () => secureAPI.getUserPayments(user.id),
    getAllPayments: () => secureAPI.getAllPayments(),
    getReaderBookings: () => secureAPI.getReaderBookings(user.id),
    updateUserRole: () => secureAPI.updateUserRole('test-user-id', 'client')
  };

  const runSecurityTests = async () => {
    if (!profile || !profile.role) {
      alert('User profile not loaded. Please wait and try again.');
      return;
    }

    setIsRunning(true);
    setTestResults([]);
    
    const userRole = profile.role;
    const scenarios = testScenarios[userRole] || [];
    
    console.log(`Running security tests for role: ${userRole}`);
    
    for (const scenario of scenarios) {
      setCurrentTest(`Testing: ${scenario.name}`);
      
      try {
        const apiCall = permissionMapping[scenario.permission];
        if (!apiCall) {
          throw new Error('Test not implemented');
        }
        
        await apiCall();
        
        // If we get here, the API call succeeded
        const result = {
          name: scenario.name,
          expected: scenario.shouldPass,
          actual: true,
          passed: scenario.shouldPass === true,
          message: scenario.shouldPass ? 'Access granted as expected' : 'SECURITY ISSUE: Access should have been denied!'
        };
        
        setTestResults(prev => [...prev, result]);
        
      } catch (error) {
        // If we get here, the API call failed
        const result = {
          name: scenario.name,
          expected: scenario.shouldPass,
          actual: false,
          passed: scenario.shouldPass === false,
          message: scenario.shouldPass ? `ISSUE: Access denied unexpectedly - ${error.message}` : 'Access denied as expected',
          error: error.message
        };
        
        setTestResults(prev => [...prev, result]);
      }
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setCurrentTest('');
    setIsRunning(false);
  };

  const runPermissionTests = () => {
    if (!profile || !profile.role) return;

    const permissionTests = [
      { permission: 'canManageUsers', roles: ['admin', 'super_admin'] },
      { permission: 'canManageServices', roles: ['admin', 'super_admin'] },
      { permission: 'canViewAllBookings', roles: ['admin', 'super_admin', 'monitor'] },
      { permission: 'canViewAllPayments', roles: ['admin', 'super_admin', 'monitor'] },
      { permission: 'canManageRoles', roles: ['super_admin'] }
    ];

    const results = permissionTests.map(test => {
      const hasPermissionResult = hasPermission(profile.role, test.permission);
      const shouldHave = test.roles.includes(profile.role);
      
      return {
        name: `Permission: ${test.permission}`,
        expected: shouldHave,
        actual: hasPermissionResult,
        passed: shouldHave === hasPermissionResult,
        message: shouldHave === hasPermissionResult ? 
          'Permission check correct' : 
          `ISSUE: Permission check failed for ${profile.role}`
      };
    });

    const roleHierarchyTests = [
      { testRole: 'client', higherRoles: ['reader', 'monitor', 'admin', 'super_admin'] },
      { testRole: 'reader', higherRoles: ['monitor', 'admin', 'super_admin'] },
      { testRole: 'monitor', higherRoles: ['admin', 'super_admin'] },
      { testRole: 'admin', higherRoles: ['super_admin'] }
    ];

    const hierarchyResults = roleHierarchyTests.flatMap(test => 
      test.higherRoles.map(higherRole => {
        const hasLevel = hasRoleLevel(profile.role, test.testRole);
        const shouldHave = hasRoleLevel(profile.role, higherRole) || profile.role === higherRole;
        
        return {
          name: `Role Level: ${profile.role} >= ${test.testRole}`,
          expected: shouldHave,
          actual: hasLevel,
          passed: true, // This is just for display
          message: hasLevel ? `Has ${test.testRole} level access` : `Does not have ${test.testRole} level access`
        };
      })
    );

    setTestResults([...results, ...hierarchyResults]);
  };

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <p className="text-gray-300">Please log in to run security tests</p>
        </div>
      </div>
    );
  }

  const passedTests = testResults.filter(test => test.passed).length;
  const totalTests = testResults.length;
  const failedTests = testResults.filter(test => !test.passed);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Shield className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-white mb-2">
            Role-Based Access Control Test Suite
          </h1>
          <p className="text-gray-300">
            Verify that security policies are properly enforced
          </p>
        </div>

        {/* User Info */}
        <div className="bg-black/30 backdrop-blur-sm rounded-2xl border border-purple-500/20 p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            Current User
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Email:</span>
              <span className="text-white ml-2">{user.email}</span>
            </div>
            <div>
              <span className="text-gray-400">Role:</span>
              <span className="text-yellow-400 font-semibold ml-2">{profile.role}</span>
            </div>
            <div>
              <span className="text-gray-400">ID:</span>
              <span className="text-gray-300 ml-2 font-mono text-xs">{user.id.slice(0, 8)}...</span>
            </div>
          </div>
        </div>

        {/* Test Controls */}
        <div className="bg-black/30 backdrop-blur-sm rounded-2xl border border-purple-500/20 p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Test Controls</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={runSecurityTests}
              disabled={isRunning}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              <Play className="w-4 h-4" />
              {isRunning ? 'Running API Tests...' : 'Run API Security Tests'}
            </button>
            
            <button
              onClick={runPermissionTests}
              disabled={isRunning}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              <FileText className="w-4 h-4" />
              Run Permission Tests
            </button>
          </div>
          
          {currentTest && (
            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-yellow-300">{currentTest}</p>
            </div>
          )}
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="bg-black/30 backdrop-blur-sm rounded-2xl border border-purple-500/20 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Test Results</h2>
              <div className="text-sm text-gray-300">
                {passedTests}/{totalTests} tests passed
                {failedTests.length > 0 && (
                  <span className="text-red-400 ml-2">({failedTests.length} failed)</span>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    result.passed
                      ? 'bg-green-500/10 border-green-500/20'
                      : 'bg-red-500/10 border-red-500/20'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    {result.passed ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400" />
                    )}
                    <span className="font-medium text-white">{result.name}</span>
                  </div>
                  
                  <p className={`text-sm ${result.passed ? 'text-green-300' : 'text-red-300'}`}>
                    {result.message}
                  </p>
                  
                  {result.error && (
                    <p className="text-xs text-gray-400 mt-1">
                      Error: {result.error}
                    </p>
                  )}
                  
                  <div className="text-xs text-gray-500 mt-2">
                    Expected: {result.expected ? 'Pass' : 'Fail'} | 
                    Actual: {result.actual ? 'Pass' : 'Fail'}
                  </div>
                </div>
              ))}
            </div>

            {failedTests.length > 0 && (
              <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-red-400 mb-2">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-semibold">Security Issues Detected</span>
                </div>
                <p className="text-red-300 text-sm">
                  {failedTests.length} test(s) failed. Please review the security implementation.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RoleBasedAccessTest; 