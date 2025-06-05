import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Menu,
  X,
  LogOut,
  Globe,
  User
} from 'lucide-react';
import { 
  StarIcon,
  UsersIcon, 
  CogIcon, 
  EyeIcon, 
  CircleStackIcon,
  CurrencyDollarIcon,
  ClipboardDocumentListIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import ThemeToggle from '../UI/ThemeToggle';

const SuperAdminDrawer = ({ activeTab, setActiveTab, isOpen, setIsOpen }) => {
  const { t } = useTranslation();
  const { user, profile, logout } = useAuth();
  const { language, setLanguage } = useUI();
  const location = useLocation();

  // Navigation items - same as SuperAdminLayout but adapted for drawer
  const navigationItems = [
    { id: 'users', label: language === 'ar' ? 'إدارة المستخدمين' : 'User Management', icon: UsersIcon },
    { id: 'system', label: language === 'ar' ? 'إعدادات النظام' : 'System Settings', icon: CogIcon },
    { id: 'realtime', label: language === 'ar' ? 'التحكم المباشر' : 'Real-Time Controls', icon: EyeIcon },
    { id: 'database', label: language === 'ar' ? 'إدارة قاعدة البيانات' : 'Database Management', icon: CircleStackIcon },
    { id: 'financial', label: language === 'ar' ? 'التحكم المالي' : 'Financial Controls', icon: CurrencyDollarIcon },
    { id: 'audit', label: language === 'ar' ? 'سجلات المراجعة' : 'Audit Logs', icon: ClipboardDocumentListIcon },
    { id: 'impersonation', label: language === 'ar' ? 'انتحال الهوية' : 'User Impersonation', icon: UserIcon }
  ];

  const handleNavClick = (tabId) => {
    setActiveTab(tabId);
    setIsOpen(false); // Close drawer after selection
  };

  const handleLanguageToggle = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  const handleLogout = () => {
    logout();
    setIsOpen(false);
  };

  // Drawer variants for animation
  const drawerVariants = {
    closed: {
      x: '100%',
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 40
      }
    },
    open: {
      x: 0,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 40
      }
    }
  };

  const backdropVariants = {
    closed: {
      opacity: 0,
      transition: {
        duration: 0.3
      }
    },
    open: {
      opacity: 1,
      transition: {
        duration: 0.3
      }
    }
  };

  return (
    <>
      {/* Header with Menu Icon - Always visible */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-gray-900/95 backdrop-blur-md border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          {/* Logo/Title */}
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <StarIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {language === 'ar' ? 'سوبر أدمن' : 'Super Admin'}
              </h1>
              <p className="text-sm text-gray-400">
                {language === 'ar' ? 'تحكم كامل' : 'Full Control'}
              </p>
            </div>
          </div>
          
          {/* User Info and Menu Button */}
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            {/* User Avatar */}
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {profile?.first_name?.charAt(0) || user?.email?.charAt(0) || 'S'}
                </span>
              </div>
              <div className="hidden sm:block">
                <span className="text-sm text-white">
                  {profile?.first_name || user?.email?.split('@')[0] || 'Super Admin'}
                </span>
                <span className="block text-xs text-purple-300">
                  {profile?.role || 'super_admin'}
                </span>
              </div>
            </div>

            {/* Menu Button */}
            <button
              onClick={() => setIsOpen(true)}
              className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors duration-200"
              aria-label="Open navigation menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={backdropVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={drawerVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className={`fixed top-0 ${language === 'ar' ? 'left-0' : 'right-0'} z-50 w-80 h-full bg-gray-900/95 backdrop-blur-xl border-l border-white/10 shadow-2xl`}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <StarIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {language === 'ar' ? 'القائمة' : 'Navigation'}
                  </h2>
                  <p className="text-sm text-gray-400">
                    {language === 'ar' ? 'سوبر أدمن' : 'Super Admin'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors duration-200"
                aria-label="Close navigation menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Info */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    {profile?.first_name?.charAt(0) || user?.email?.charAt(0) || 'S'}
                  </span>
                </div>
                <div>
                  <p className="text-white font-medium">
                    {profile?.first_name} {profile?.last_name || user?.email?.split('@')[0] || 'Super Admin'}
                  </p>
                  <p className="text-purple-300 text-sm">
                    {profile?.role || 'super_admin'}
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center space-x-3 rtl:space-x-reverse px-4 py-3 rounded-xl transition-all duration-300 ${
                      isActive
                        ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border border-purple-400/30'
                        : 'text-gray-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium text-sm">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Footer Controls */}
            <div className="p-6 border-t border-white/10 space-y-4">
              {/* Theme and Language Controls */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 font-medium text-sm">
                    {language === 'ar' ? 'المظهر' : 'Theme'}
                  </span>
                  <ThemeToggle />
                </div>
                <button
                  onClick={handleLanguageToggle}
                  className="flex items-center space-x-2 rtl:space-x-reverse w-full px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors duration-200"
                >
                  <Globe className="w-4 h-4" />
                  <span className="text-sm">
                    {language === 'ar' ? 'English' : 'العربية'}
                  </span>
                </button>
              </div>

              {/* Profile Link */}
              <Link
                to="/profile"
                onClick={() => setIsOpen(false)}
                className="flex items-center space-x-2 rtl:space-x-reverse w-full px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors duration-200"
              >
                <User className="w-4 h-4" />
                <span className="text-sm">
                  {language === 'ar' ? 'الملف الشخصي' : 'Profile'}
                </span>
              </Link>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 rtl:space-x-reverse w-full px-3 py-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors duration-200"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">
                  {language === 'ar' ? 'تسجيل الخروج' : 'Logout'}
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SuperAdminDrawer; 