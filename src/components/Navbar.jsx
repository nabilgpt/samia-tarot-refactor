import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, User, LogOut, Wallet, MessageCircle, Calendar, Globe, LayoutDashboard, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { useLanguage } from '../context/LanguageContext';
import Button from './Button';
import { cn } from '../utils/cn';
import ThemeToggle from './UI/ThemeToggle';
import EmergencyCallButton from './EmergencyCallButton';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const location = useLocation();
  const { isAuthenticated, user, profile, logout } = useAuth();
  const { showError, showSuccess } = useUI();
  const { currentLanguage, changeLanguage } = useLanguage();
  
  const navItems = [
    { key: 'home', path: '/', label: currentLanguage === 'ar' ? 'الرئيسية' : 'Home' },
    { key: 'services', path: '/services', label: currentLanguage === 'ar' ? 'الخدمات' : 'Services' },
    { key: 'readers', path: '/readers', label: currentLanguage === 'ar' ? 'القراء' : 'Readers' },
    { key: 'about', path: '/about', label: currentLanguage === 'ar' ? 'حولنا' : 'About' },
    { key: 'contact', path: '/contact', label: currentLanguage === 'ar' ? 'اتصل بنا' : 'Contact' }
  ];

  // Role-based dashboard configuration
  const getDashboardConfig = () => {
    if (!isAuthenticated || !profile?.role) return null;

    const roleConfigs = {
      super_admin: {
        label: currentLanguage === 'ar' ? 'لوحة المدير العام' : 'Super Admin Dashboard',
        path: '/dashboard/super-admin',
        icon: LayoutDashboard
      },
      admin: {
        label: currentLanguage === 'ar' ? 'لوحة الإدارة' : 'Admin Dashboard',
        path: '/dashboard/admin',
        icon: LayoutDashboard
      },
      reader: {
        label: currentLanguage === 'ar' ? 'لوحة القارئ' : 'Reader Dashboard',
        path: '/dashboard/reader',
        icon: LayoutDashboard
      },
      monitor: {
        label: currentLanguage === 'ar' ? 'لوحة المراقب' : 'Monitor Dashboard',
        path: '/dashboard/monitor',
        icon: LayoutDashboard
      },
      client: {
        label: currentLanguage === 'ar' ? 'لوحة العميل' : 'Client Dashboard',
        path: '/dashboard/client',
        icon: LayoutDashboard
      }
    };

    return roleConfigs[profile.role] || null;
  };

  const dashboardConfig = getDashboardConfig();

  const userMenuItems = [
    // Add dashboard as first item in user menu if it exists
    ...(dashboardConfig ? [{
      key: 'dashboard',
      path: dashboardConfig.path,
      label: dashboardConfig.label,
      icon: LayoutDashboard
    }] : []),
    { key: 'profile', path: '/profile', label: currentLanguage === 'ar' ? 'الملف الشخصي' : 'Profile', icon: User },
    { key: 'wallet', path: '/wallet', label: currentLanguage === 'ar' ? 'المحفظة' : 'Wallet', icon: Wallet },
    { key: 'messages', path: '/messages', label: currentLanguage === 'ar' ? 'الرسائل' : 'Messages', icon: MessageCircle },
    { key: 'bookings', path: '/bookings', label: currentLanguage === 'ar' ? 'الحجوزات' : 'Bookings', icon: Calendar }
  ];

  const isActivePath = (path) => {
    return location.pathname === path;
  };

  const handleLanguageToggle = () => {
    const newLanguage = currentLanguage === 'ar' ? 'en' : 'ar';
    changeLanguage(newLanguage);
  };

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
  };

  return (
    <nav className="bg-theme-card backdrop-blur-sm border-b border-theme sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 rtl:space-x-reverse">
            <div className="w-10 h-10 bg-gold-gradient-theme rounded-lg flex items-center justify-center">
              <span className="text-theme-inverse font-bold text-xl">س</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold gradient-text">
                {currentLanguage === 'ar' ? 'سامية تاروت' : 'SAMIA TAROT'}
              </h1>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8 rtl:space-x-reverse">
            {navItems.map((item) => (
              <Link
                key={item.key}
                to={item.path}
                className={cn(
                  'px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200',
                  isActivePath(item.path)
                    ? 'text-theme-primary bg-cosmic-gradient'
                    : 'text-theme-secondary hover:text-theme-primary hover:bg-cosmic-gradient'
                )}
              >
                {item.label}
              </Link>
            ))}

            {/* Emergency Call Button - Single instance for clients and guests */}
            <EmergencyCallButton className="hidden md:inline-flex" />

            {/* Dashboard Button for Desktop - Only show if user is logged in and has a valid role */}
            {dashboardConfig && (
              <Link
                to={dashboardConfig.path}
                className={cn(
                  'flex items-center space-x-2 rtl:space-x-reverse px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 bg-purple-600/20 border border-purple-500/30',
                  isActivePath(dashboardConfig.path)
                    ? 'text-purple-300 bg-purple-600/30 border-purple-400'
                    : 'text-purple-200 hover:text-purple-100 hover:bg-purple-600/30 hover:border-purple-400'
                )}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>{dashboardConfig.label}</span>
              </Link>
            )}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            {/* Language Toggle */}
            <button
              onClick={handleLanguageToggle}
              className="p-2 text-theme-secondary hover:text-theme-primary transition-colors duration-200"
              title={currentLanguage === 'ar' ? 'English' : 'العربية'}
            >
              <Globe className="w-5 h-5" />
            </button>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* User Menu or Auth Buttons */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 rtl:space-x-reverse p-2 rounded-lg hover:bg-cosmic-gradient transition-colors duration-200"
                >
                  <div className="w-8 h-8 bg-gold-gradient-theme rounded-full flex items-center justify-center">
                    <span className="text-theme-inverse font-semibold text-sm">
                      {profile?.first_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <span className="hidden sm:block text-sm text-theme-secondary">
                    {profile?.first_name || user?.email?.split('@')[0] || 'User'}
                  </span>
                  {/* Role badge */}
                  {profile?.role && (
                    <span className="hidden lg:block text-xs px-2 py-1 rounded-full bg-purple-600/20 text-purple-300 border border-purple-500/30">
                      {profile.role}
                    </span>
                  )}
                </button>

                {/* User Dropdown */}
                {userMenuOpen && (
                  <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-56 bg-theme-card rounded-lg shadow-theme-card border border-theme py-1 z-50">
                    {userMenuItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.key}
                          to={item.path}
                          onClick={() => setUserMenuOpen(false)}
                          className={cn(
                            'flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm transition-colors duration-200',
                            item.key === 'dashboard'
                              ? 'text-purple-300 hover:bg-purple-600/10 hover:text-purple-200 border-b border-theme'
                              : 'text-theme-secondary hover:bg-cosmic-gradient hover:text-theme-primary'
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                          {item.key === 'dashboard' && (
                            <span className="ml-auto text-xs text-purple-400">
                              {profile?.role}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                    <hr className="my-1 border-theme" />
                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-2 rtl:space-x-reverse w-full px-4 py-2 text-sm text-red-400 hover:bg-red-400/10 transition-colors duration-200"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{currentLanguage === 'ar' ? 'تسجيل الخروج' : 'Logout'}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <Link to="/login">
                  <Button variant="outline" size="sm">
                    {currentLanguage === 'ar' ? 'تسجيل الدخول' : 'Login'}
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button size="sm">
                    {currentLanguage === 'ar' ? 'إنشاء حساب' : 'Sign Up'}
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 text-theme-secondary hover:text-theme-primary transition-colors duration-200"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-theme">
            <div className="space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.key}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200',
                    isActivePath(item.path)
                      ? 'text-theme-primary bg-cosmic-gradient'
                      : 'text-theme-secondary hover:text-theme-primary hover:bg-cosmic-gradient'
                  )}
                >
                  {item.label}
                </Link>
              ))}

              {/* Emergency Call Button for Mobile */}
              <EmergencyCallButton className="md:hidden w-full mt-2" />

              {/* Dashboard Button for Mobile - Only show if user is logged in and has a valid role */}
              {dashboardConfig && (
                <Link
                  to={dashboardConfig.path}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'flex items-center space-x-2 rtl:space-x-reverse px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 bg-purple-600/20 border border-purple-500/30 mt-2',
                    isActivePath(dashboardConfig.path)
                      ? 'text-purple-300 bg-purple-600/30 border-purple-400'
                      : 'text-purple-200 hover:text-purple-100 hover:bg-purple-600/30 hover:border-purple-400'
                  )}
                >
                  <LayoutDashboard className="w-5 h-5" />
                  <span>{dashboardConfig.label}</span>
                  <span className="ml-auto text-xs text-purple-400">
                    {profile?.role}
                  </span>
                </Link>
              )}

              {/* Mobile Theme and Language Controls */}
              <div className="pt-4 border-t border-theme space-y-2">
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-theme-secondary font-medium">{currentLanguage === 'ar' ? 'الثيم' : 'Theme'}</span>
                  <ThemeToggle />
                </div>
                <button
                  onClick={handleLanguageToggle}
                  className="flex items-center space-x-2 rtl:space-x-reverse w-full px-3 py-2 rounded-md text-base font-medium text-theme-secondary hover:text-theme-primary hover:bg-cosmic-gradient transition-colors duration-200"
                >
                  <Globe className="w-5 h-5" />
                  <span>{currentLanguage === 'ar' ? 'العربية' : 'English'}</span>
                </button>
              </div>
              
              {!isAuthenticated && (
                <div className="pt-4 space-y-2">
                  <Link to="/login" onClick={() => setIsOpen(false)}>
                    <Button variant="outline" className="w-full">
                      {currentLanguage === 'ar' ? 'تسجيل الدخول' : 'Login'}
                    </Button>
                  </Link>
                  <Link to="/signup" onClick={() => setIsOpen(false)}>
                    <Button className="w-full">
                      {currentLanguage === 'ar' ? 'إنشاء حساب' : 'Sign Up'}
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar; 