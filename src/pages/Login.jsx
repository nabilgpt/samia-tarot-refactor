import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles, ArrowLeft, Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';

const Login = () => {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: shouldReduceMotion ? { duration: 0.3 } : {
        delayChildren: 0.2,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: shouldReduceMotion ? { opacity: 0 } : { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: shouldReduceMotion ? { duration: 0.3 } : {
        type: "spring",
        stiffness: 100,
        damping: 12
      }
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Basic validation
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      const response = await api.login({
        email: formData.email,
        password: formData.password
      });

      // Store auth token (simplified for demo)
      localStorage.setItem('authToken', response.token);

      // Redirect to home page
      navigate('/');
    } catch (error) {
      console.error('Login error:', error);
      setError(
        error.message.includes('404') || error.message.includes('401')
          ? 'Invalid email or password'
          : 'Login failed. Please check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-theme-card/80 backdrop-blur-lg border-b border-theme-cosmic/20 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold gradient-text flex items-center group">
            <Sparkles className="w-8 h-8 mr-2 text-gold-primary animate-pulse group-hover:rotate-12 transition-transform duration-300" />
            SAMIA TAROT
          </Link>
          <Link
            to="/"
            className="flex items-center px-4 py-2 bg-cosmic-gradient hover:shadow-theme-cosmic text-theme-inverse font-medium rounded-lg transition-all duration-300 transform hover:scale-105"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Home
          </Link>
        </div>
      </nav>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12"
      >
        <div className="w-full max-w-md">
          <motion.div variants={itemVariants} className="text-center mb-8">
            <div className="text-5xl mb-4">🔮</div>
            <h1 className="text-3xl font-bold gradient-text mb-2">
              Welcome Back
            </h1>
            <p className="text-theme-secondary">
              Sign in to access your cosmic journey
            </p>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-2xl p-8 shadow-theme-card"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400"
                >
                  <AlertCircle className="w-5 h-5 mr-2" />
                  <span className="text-sm">{error}</span>
                </motion.div>
              )}

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-theme-primary mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-muted w-5 h-5" />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-theme-card border border-theme-cosmic rounded-lg text-theme-primary placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-gold-primary focus:border-transparent transition-all duration-300"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-theme-primary mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-muted w-5 h-5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-10 pr-12 py-3 bg-theme-card border border-theme-cosmic rounded-lg text-theme-primary placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-gold-primary focus:border-transparent transition-all duration-300"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-theme-muted hover:text-theme-primary transition-colors duration-300"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between">
                <label className="flex items-center text-sm text-theme-secondary">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-gold-primary bg-theme-card border-theme-cosmic rounded focus:ring-gold-primary focus:ring-2 mr-2"
                  />
                  Remember me
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-theme-secondary hover:text-gold-primary transition-colors duration-300"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 bg-cosmic-gradient hover:shadow-theme-cosmic text-theme-inverse font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 mr-2"
                    >
                      ✨
                    </motion.div>
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            {/* Register Link */}
            <motion.div variants={itemVariants} className="mt-8 pt-6 border-t border-theme-cosmic text-center">
              <p className="text-theme-secondary mb-4">
                Don't have an account?
              </p>
              <Link
                to="/register"
                className="inline-flex items-center px-6 py-2 bg-transparent border border-theme-cosmic text-theme-primary hover:bg-theme-cosmic hover:text-theme-inverse rounded-lg transition-all duration-300"
              >
                Create Account
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;