import React, { useState, useEffect } from 'react';
import { UserAPI } from '../../api/userApi.js';
import { authHelpers } from '../../lib/supabase.js';
import AnimatedBackground from '../UI/AnimatedBackground.jsx';

const DashboardLayout = ({ children, userRole = 'client' }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const result = await UserAPI.getCurrentUser();
      if (result.success && result.data) {
        setUser(result.data);
        setProfile(result.data.profile);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await UserAPI.signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getNavigationItems = (role) => {
    const baseItems = [
      { name: 'Dashboard', href: '/dashboard', icon: '🏠' },
      { name: 'Profile', href: '/dashboard/profile', icon: '👤' }
    ];

    switch (role) {
      case 'client':
        return [
          ...baseItems,
          { name: 'My Bookings', href: '/dashboard/bookings', icon: '📅' },
          { name: 'Services', href: '/dashboard/services', icon: '🔮' },
          { name: 'Payments', href: '/dashboard/payments', icon: '💳' },
          { name: 'History', href: '/dashboard/history', icon: '📜' }
        ];
      
      case 'reader':
        return [
          ...baseItems,
          { name: 'Schedule', href: '/dashboard/schedule', icon: '📅' },
          { name: 'Bookings', href: '/dashboard/bookings', icon: '📋' },
          { name: 'Clients', href: '/dashboard/clients', icon: '👥' },
          { name: 'Earnings', href: '/dashboard/earnings', icon: '💰' },
          { name: 'Services', href: '/dashboard/services', icon: '🔮' }
        ];
      
      case 'admin':
        return [
          ...baseItems,
          { name: 'Users', href: '/dashboard/users', icon: '👥' },
          { name: 'Services', href: '/dashboard/services', icon: '🔮' },
          { name: 'Bookings', href: '/dashboard/bookings', icon: '📅' },
          { name: 'Payments', href: '/dashboard/payments', icon: '💳' },
          { name: 'Analytics', href: '/dashboard/analytics', icon: '📊' },
          { name: 'Settings', href: '/dashboard/settings', icon: '⚙️' }
        ];
      
      case 'monitor':
        return [
          ...baseItems,
          { name: 'Live Sessions', href: '/dashboard/live', icon: '🔴' },
          { name: 'Moderation', href: '/dashboard/moderation', icon: '🛡️' },
          { name: 'Alerts', href: '/dashboard/alerts', icon: '🚨' },
          { name: 'Reports', href: '/dashboard/reports', icon: '📋' },
          { name: 'Quality Control', href: '/dashboard/quality', icon: '✅' }
        ];
      
      default:
        return baseItems;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'client': return 'bg-blue-500';
      case 'reader': return 'bg-purple-500';
      case 'admin': return 'bg-red-500';
      case 'monitor': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getRoleName = (role) => {
    switch (role) {
      case 'client': return 'Client';
      case 'reader': return 'Reader';
      case 'admin': return 'Administrator';
      case 'monitor': return 'Monitor';
      default: return 'User';
    }
  };

  if (loading) {
    return (
      <AnimatedBackground variant="dashboard" intensity="subtle">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400 mx-auto"></div>
            <p className="mt-4 text-gray-300">Loading dashboard...</p>
          </div>
        </div>
      </AnimatedBackground>
    );
  }

  const navigationItems = getNavigationItems(userRole);

  return (
    <AnimatedBackground variant="dashboard" intensity="normal">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="fixed inset-0 bg-dark-900/75 backdrop-blur-sm"></div>
        </div>
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-dark-800/90 backdrop-blur-xl border-r border-gold-400/20 shadow-2xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-center h-16 px-4 bg-gradient-to-r from-gold-500 to-gold-600 border-b border-gold-400/30">
          <h1 className="text-xl font-bold text-dark-900">🔮 Samia Tarot</h1>
        </div>

        {/* User info */}
        <div className="p-4 border-b border-gold-400/20">
          <div className="flex items-center">
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-gold-500 to-gold-600 flex items-center justify-center text-dark-900 font-bold shadow-lg`}>
              {profile?.first_name?.[0] || user?.email?.[0] || '?'}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-white">
                {profile?.first_name} {profile?.last_name || user?.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-xs text-gold-400">{getRoleName(userRole)}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-4 px-4">
          <ul className="space-y-2">
            {navigationItems.map((item) => (
              <li key={item.name}>
                <a
                  href={item.href}
                  className="flex items-center px-4 py-2 text-sm font-medium text-gray-300 rounded-lg hover:bg-gold-400/10 hover:text-gold-300 transition-all duration-200 group"
                >
                  <span className="mr-3 text-lg group-hover:scale-110 transition-transform duration-200">{item.icon}</span>
                  {item.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Sign out button */}
        <div className="absolute bottom-4 left-4 right-4">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center px-4 py-2 text-sm font-medium text-red-400 rounded-lg hover:bg-red-500/10 hover:text-red-300 transition-all duration-200 group"
          >
            <span className="mr-3 text-lg group-hover:scale-110 transition-transform duration-200">🚪</span>
            Sign Out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="bg-dark-800/50 backdrop-blur-xl border-b border-gold-400/20 shadow-lg">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-md text-gold-400 hover:text-gold-300 hover:bg-gold-400/10 transition-all duration-200"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h2 className="text-lg font-semibold text-white ml-2">
                {getRoleName(userRole)} Dashboard
              </h2>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold-500 to-gold-600 flex items-center justify-center text-dark-900 text-sm font-bold shadow-lg">
                  {profile?.first_name?.[0] || user?.email?.[0] || '?'}
                </div>
                <span className="text-sm text-gray-300">
                  {profile?.first_name} {profile?.last_name || user?.email?.split('@')[0] || 'User'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Main content area with proper alignment */}
        <main className="min-h-screen">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </AnimatedBackground>
  );
};

export default DashboardLayout; 