import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, X, User, LogOut, Wallet, MessageCircle, Calendar, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import Button from './Button';
import { cn } from '../utils/cn';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { t } = useTranslation();
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const { language, setLanguage } = useUI();

  const navItems = [
    { key: 'home', path: '/', label: t('nav.home') },
    { key: 'services', path: '/services', label: t('nav.services') },
    { key: 'readers', path: '/readers', label: t('nav.readers') },
    { key: 'about', path: '/about', label: t('nav.about') },
    { key: 'contact', path: '/contact', label: t('nav.contact') }
  ];

  const userMenuItems = [
    { key: 'profile', path: '/profile', label: t('nav.profile'), icon: User },
    { key: 'wallet', path: '/wallet', label: t('nav.wallet'), icon: Wallet },
    { key: 'messages', path: '/messages', label: t('nav.messages'), icon: MessageCircle },
    { key: 'bookings', path: '/bookings', label: t('nav.bookings'), icon: Calendar }
  ];

  const isActivePath = (path) => {
    return location.pathname === path;
  };

  const handleLanguageToggle = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
  };

  return (
    <nav className="bg-dark-900/95 backdrop-blur-sm border-b border-gold-400/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 rtl:space-x-reverse">
            <div className="w-10 h-10 bg-gold-gradient rounded-lg flex items-center justify-center">
              <span className="text-dark-900 font-bold text-xl">س</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold gradient-text">
                {language === 'ar' ? 'سامية تاروت' : 'SAMIA TAROT'}
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
                    ? 'text-gold-400 bg-gold-400/10'
                    : 'text-gray-300 hover:text-gold-400 hover:bg-gold-400/5'
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            {/* Language Toggle */}
            <button
              onClick={handleLanguageToggle}
              className="p-2 text-gray-300 hover:text-gold-400 transition-colors duration-200"
              title={language === 'ar' ? 'English' : 'العربية'}
            >
              <Globe className="w-5 h-5" />
            </button>

            {/* User Menu or Auth Buttons */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 rtl:space-x-reverse p-2 rounded-lg hover:bg-gold-400/10 transition-colors duration-200"
                >
                  <div className="w-8 h-8 bg-gold-gradient rounded-full flex items-center justify-center">
                    <span className="text-dark-900 font-semibold text-sm">
                      {user?.firstName?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <span className="hidden sm:block text-sm text-gray-300">
                    {user?.firstName || 'User'}
                  </span>
                </button>

                {/* User Dropdown */}
                {userMenuOpen && (
                  <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-48 bg-dark-800 rounded-lg shadow-lg border border-gold-400/20 py-1 z-50">
                    {userMenuItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.key}
                          to={item.path}
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm text-gray-300 hover:bg-gold-400/10 hover:text-gold-400 transition-colors duration-200"
                        >
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                    <hr className="my-1 border-gold-400/20" />
                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-2 rtl:space-x-reverse w-full px-4 py-2 text-sm text-red-400 hover:bg-red-400/10 transition-colors duration-200"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{t('nav.logout')}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <Link to="/login">
                  <Button variant="outline" size="sm">
                    {t('nav.login')}
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button size="sm">
                    {t('nav.signup')}
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 text-gray-300 hover:text-gold-400 transition-colors duration-200"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-gold-400/20">
            <div className="space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.key}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200',
                    isActivePath(item.path)
                      ? 'text-gold-400 bg-gold-400/10'
                      : 'text-gray-300 hover:text-gold-400 hover:bg-gold-400/5'
                  )}
                >
                  {item.label}
                </Link>
              ))}
              
              {!isAuthenticated && (
                <div className="pt-4 space-y-2">
                  <Link to="/login" onClick={() => setIsOpen(false)}>
                    <Button variant="outline" className="w-full">
                      {t('nav.login')}
                    </Button>
                  </Link>
                  <Link to="/signup" onClick={() => setIsOpen(false)}>
                    <Button className="w-full">
                      {t('nav.signup')}
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