import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Menu, X, Home, Zap, Star, User, ShoppingBag } from 'lucide-react';

const Navigation = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/services', label: 'Services', icon: Zap },
    { path: '/horoscopes', label: 'Horoscopes', icon: Star },
    { path: '/login', label: 'Sign In', icon: User }
  ];

  const isActiveRoute = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const closeMenu = () => setIsMobileMenuOpen(false);

  return (
    <nav className="sticky top-0 z-50 bg-theme-card/95 backdrop-blur-xl border-b border-theme-cosmic/20">
      <div className="container mx-auto px-4">
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
          <div className="hidden md:flex items-center space-x-1">
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
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-theme-secondary hover:text-gold-primary hover:bg-theme-cosmic/10 transition-all duration-300"
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
              className="md:hidden border-t border-theme-cosmic/20 py-4"
            >
              <div className="flex flex-col space-y-2">
                {navItems.map(({ path, label, icon: Icon }) => (
                  <Link
                    key={path}
                    to={path}
                    onClick={closeMenu}
                    className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
};

export default Navigation;