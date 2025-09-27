import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Menu, X, Home, Zap, Star, User, ShoppingBag, Eye, Shield, Settings, LogOut, Package, Users, BarChart3, PhoneCall } from 'lucide-react';
import { getCurrentUser, logout } from '../lib/auth';

const Navigation = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Public navigation items
  const publicItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/services', label: 'Services', icon: Zap },
    { path: '/horoscopes', label: 'Horoscopes', icon: Star }
  ];

  // Role-based navigation items
  const getRoleItems = (userRole) => {
    const roleItems = [];

    if (userRole === 'client' || userRole === 'admin' || userRole === 'superadmin') {
      roleItems.push({ path: '/orders', label: 'My Orders', icon: Package });
    }

    if (userRole === 'reader' || userRole === 'admin' || userRole === 'superadmin') {
      roleItems.push({ path: '/reader/queue', label: 'Queue', icon: BarChart3 });
    }

    if (userRole === 'monitor' || userRole === 'admin' || userRole === 'superadmin') {
      roleItems.push(
        { path: '/monitor/review', label: 'Review', icon: Eye },
        { path: '/monitor/calls', label: 'Calls', icon: PhoneCall }
      );
    }

    if (userRole === 'admin' || userRole === 'superadmin') {
      roleItems.push(
        { path: '/admin/users', label: 'Users', icon: Users },
        { path: '/admin/metrics', label: 'Metrics', icon: BarChart3 },
        { path: '/admin/rate-limits', label: 'Limits', icon: Shield }
      );
    }

    return roleItems;
  };

  // Combine all navigation items
  const getNavItems = () => {
    if (!user) {
      return [...publicItems, { path: '/login', label: 'Sign In', icon: User }];
    }

    const roleItems = getRoleItems(user.user_metadata?.role);
    return [...publicItems, ...roleItems];
  };

  const navItems = getNavItems();

  const isActiveRoute = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const closeMenu = () => setIsMobileMenuOpen(false);

  return (
    <nav className="sticky top-0 z-50 bg-theme-card/95 backdrop-blur-xl border-b border-theme-cosmic/20">
      <div className="container">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link
            to="/"
            className="text-2xl font-bold gradient-text flex items-center group"
            onClick={closeMenu}
          >
            <Sparkles className="w-8 h-8 mr-2 text-gold-primary animate-pulse group-hover:rotate-12 transition-transform duration-300" />
            <span className="hidden sm:inline">SAMIA TAROT</span>
            <span className="sm:hidden">SAMIA</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="nav-desktop hidden items-center space-x-1">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center group ${
                  isActiveRoute(path)
                    ? 'text-gold-primary bg-gold-primary/10'
                    : 'text-theme-secondary hover:text-gold-primary hover:bg-theme-cosmic/10'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {label}
                {isActiveRoute(path) && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-gold-primary/10 rounded-lg"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gold-primary rounded-full group-hover:w-full transition-all duration-300"></span>
              </Link>
            ))}

            {/* User Menu */}
            {user && (
              <div className="flex items-center space-x-2 ml-4 border-l border-theme-cosmic/20 pl-4">
                <Link
                  to="/profile"
                  className={`relative px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center group ${
                    isActiveRoute('/profile')
                      ? 'text-gold-primary bg-gold-primary/10'
                      : 'text-theme-secondary hover:text-gold-primary hover:bg-theme-cosmic/10'
                  }`}
                >
                  <Settings className="w-4 h-4 mr-1" />
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-theme-secondary hover:text-red-400 hover:bg-red-500/10 transition-all duration-300 flex items-center group"
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  Logout
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="nav-mobile touch-target-large p-2 rounded-lg text-theme-secondary hover:text-gold-primary hover:bg-theme-cosmic/10 transition-all duration-300"
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="nav-mobile border-t border-theme-cosmic/20 py-4"
            >
              <div className="flex flex-col space-y-2">
                {navItems.map(({ path, label, icon: Icon }) => (
                  <Link
                    key={path}
                    to={path}
                    onClick={closeMenu}
                    className={`touch-target flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                      isActiveRoute(path)
                        ? 'text-gold-primary bg-gold-primary/10'
                        : 'text-theme-secondary hover:text-gold-primary hover:bg-theme-cosmic/10'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {label}
                    {isActiveRoute(path) && (
                      <div className="ml-auto w-2 h-2 bg-gold-primary rounded-full"></div>
                    )}
                  </Link>
                ))}

                {/* Mobile User Menu */}
                {user && (
                  <>
                    <div className="border-t border-theme-cosmic/20 my-2"></div>
                    <Link
                      to="/profile"
                      onClick={closeMenu}
                      className={`touch-target flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                        isActiveRoute('/profile')
                          ? 'text-gold-primary bg-gold-primary/10'
                          : 'text-theme-secondary hover:text-gold-primary hover:bg-theme-cosmic/10'
                      }`}
                    >
                      <Settings className="w-5 h-5 mr-3" />
                      Profile
                      {isActiveRoute('/profile') && (
                        <div className="ml-auto w-2 h-2 bg-gold-primary rounded-full"></div>
                      )}
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout();
                        closeMenu();
                      }}
                      className="touch-target flex items-center px-4 py-3 rounded-lg text-sm font-medium text-theme-secondary hover:text-red-400 hover:bg-red-500/10 transition-all duration-300 w-full text-left"
                    >
                      <LogOut className="w-5 h-5 mr-3" />
                      Logout
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
};

export default Navigation;