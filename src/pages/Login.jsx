import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import Particles from 'react-tsparticles';
import { loadSlim } from 'tsparticles-slim';
import { Eye, EyeOff, Mail, Lock, Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import Button from '../components/Button';
import { MonolingualInput, FormButton, FormContainer } from '../components/UI/BilingualFormComponents';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading, isAuthenticated, user, profile, initialized } = useAuth();
  const { showSuccess, showError, language } = useUI();

  const from = location.state?.from?.pathname || '/';

  // Particle configuration for cosmic background (moved before early return)
  const particlesInit = useCallback(async engine => {
    await loadSlim(engine);
  }, []);

  // 🔄 Redirect already authenticated users to their dashboard
  useEffect(() => {
    if (initialized && isAuthenticated && user && profile) {
      const dashboardPath = `/dashboard/${profile.role === 'super_admin' ? 'super-admin' : profile.role}`;
      navigate(dashboardPath, { replace: true });
    }
  }, [initialized, isAuthenticated, user, profile, navigate]);

  // ✨ ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
  const particlesConfig = useMemo(() => ({
    background: {
      color: {
        value: "transparent",
      },
    },
    fpsLimit: 120,
    interactivity: {
      events: {
        onClick: {
          enable: true,
          mode: "push",
        },
        onHover: {
          enable: true,
          mode: "repulse",
        },
        resize: true,
      },
      modes: {
        push: {
          quantity: 4,
        },
        repulse: {
          distance: 200,
          duration: 0.4,
        },
      },
    },
    particles: {
      color: {
        value: ["#fbbf24", "#d946ef", "#06b6d4", "#ffffff"],
      },
      links: {
        color: "#fbbf24",
        distance: 150,
        enable: true,
        opacity: 0.2,
        width: 1,
      },
      collisions: {
        enable: true,
      },
      move: {
        direction: "none",
        enable: true,
        outModes: {
          default: "bounce",
        },
        random: false,
        speed: 1,
        straight: false,
      },
      number: {
        density: {
          enable: true,
          area: 800,
        },
        value: 80,
      },
      opacity: {
        value: 0.3,
      },
      shape: {
        type: "circle",
      },
      size: {
        value: { min: 1, max: 3 },
      },
    },
    detectRetina: true,
  }), []);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.3,
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = t('forms.validation.required');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t('forms.validation.email');
    }

    if (!formData.password) {
      newErrors.password = t('forms.validation.required');
    } else if (formData.password.length < 6) {
      newErrors.password = t('forms.validation.password');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const result = await login(formData.email, formData.password);
    
    if (result.success) {
      showSuccess(t('auth.signin.success'));
      
      // Navigate to dashboard instead of 'from' to avoid redirect loops
      const targetPath = from === '/' || from === '/login' ? '/dashboard' : from;
      navigate(targetPath, { replace: true });
    } else {
      showError(result.error || t('auth.signin.error'));
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Show loading while checking authentication
  if (!initialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400"></div>
            <div className="absolute inset-0 rounded-full border-2 border-purple-400/20"></div>
          </div>
          <div className="space-y-2">
            <p className="text-gray-300 text-lg font-medium">
              Checking authentication...
            </p>
            <p className="text-gray-500 text-sm">
              Please wait while we verify your login status
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white overflow-hidden" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Particle Background */}
      <Particles
        id="tsparticles"
        init={particlesInit}
        options={particlesConfig}
        className="absolute inset-0 z-0"
      />

      {/* Main Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 py-16">
        {/* Additional cosmic background effects */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-72 h-72 bg-cosmic-500/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-gold-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl animate-pulse delay-500"></div>
        </div>

        <motion.div 
          className="relative z-10 max-w-md w-full glassmorphism rounded-2xl shadow-cosmic p-8 space-y-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="text-center">
            <div className="flex justify-center mb-6">
              <motion.div 
                className="w-16 h-16 bg-gradient-to-br from-gold-500 to-gold-600 rounded-xl flex items-center justify-center shadow-2xl shadow-gold-500/50"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Sparkles className="w-8 h-8 text-gray-900" />
              </motion.div>
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-gold-400 via-cosmic-400 to-cyan-400 bg-clip-text text-transparent mb-2">
              {t('auth.signin.title')}
            </h2>
            <p className="text-gray-300">
              {t('auth.signin.subtitle')}
            </p>
          </motion.div>

          {/* Login Form */}
          <motion.form 
            className="space-y-6" 
            onSubmit={handleSubmit}
            variants={itemVariants}
          >
            {/* Email Field */}
            <motion.div variants={itemVariants}>
              <MonolingualInput
                name="email"
                type="email"
                labelKey="forms.labels.email"
                placeholderKey="forms.placeholders.email"
                value={formData.email}
                onChange={(value) => handleChange({ target: { name: 'email', value } })}
                error={errors.email}
                required
                className="text-gold-300"
              />
            </motion.div>

            {/* Password Field */}
            <motion.div className="space-y-2" variants={itemVariants}>
              <label htmlFor="password" className={`block text-sm font-medium text-gold-300 ${language === 'ar' ? 'text-right' : ''}`}>
                {t('forms.labels.password')}
                <span className={`text-red-400 ${language === 'ar' ? 'mr-1' : 'ml-1'}`}>*</span>
              </label>
              <div className="relative">
                <div className={`absolute inset-y-0 flex items-center pointer-events-none z-10 ${
                  language === 'ar' ? 'right-0 pr-3' : 'left-0 pl-3'
                }`}>
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`
                    w-full px-4 py-3 bg-dark-700/50 border border-gold-400/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-all duration-200 backdrop-blur-xl
                    ${language === 'ar' ? 'pr-10 pl-10 text-right' : 'pl-10 pr-10 text-left'}
                    ${errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}
                  `}
                  placeholder={t('forms.placeholders.password')}
                  dir={language === 'ar' ? 'rtl' : 'ltr'}
                />
                <button
                  type="button"
                  className={`absolute inset-y-0 flex items-center z-10 ${
                    language === 'ar' ? 'left-0 pl-3' : 'right-0 pr-3'
                  }`}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-white transition-colors" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-white transition-colors" />
                  )}
                </button>
              </div>
              {errors.password && (
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-red-400 flex items-center gap-1"
                >
                  <span className="w-1 h-1 bg-red-400 rounded-full"></span>
                  {errors.password}
                </motion.p>
              )}
            </motion.div>

            {/* Remember Me & Forgot Password */}
            <motion.div className="flex items-center justify-between" variants={itemVariants}>
              <div className="flex items-center">
                <input
                  id="rememberMe"
                  name="rememberMe"
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="h-4 w-4 text-gold-400 bg-white/10 border-white/20 rounded focus:ring-gold-400/20 focus:ring-2"
                />
                <label htmlFor="rememberMe" className={`block text-sm text-gray-300 ${
                  language === 'ar' ? 'mr-2' : 'ml-2'
                }`}>
                  {t('auth.rememberMe')}
                </label>
              </div>

              <div className="text-sm">
                <Link 
                  to="/forgot-password" 
                  className="font-medium text-gold-400 hover:text-gold-300 transition-colors"
                >
                  {t('auth.forgotPassword')}
                </Link>
              </div>
            </motion.div>

            {/* Submit Button */}
            <motion.div variants={itemVariants}>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="submit"
                  loading={loading}
                  className="w-full bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-gray-900 font-bold py-3 px-6 shadow-2xl shadow-gold-500/50 border-2 border-gold-400/50"
                >
                  {loading ? (
                    t('common.loading')
                  ) : (
                    <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse">
                      <span>{t('auth.signin.submit')}</span>
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  )}
                </Button>
              </motion.div>
            </motion.div>
          </motion.form>

          {/* Sign Up Link */}
          <motion.div className="text-center pt-6 border-t border-white/10" variants={itemVariants}>
            <p className="text-gray-400 text-sm">
              {t('auth.noAccount')}{' '}
              <Link 
                to="/signup" 
                className="font-medium text-cosmic-400 hover:text-cosmic-300 transition-colors"
              >
                {t('auth.signupLink')}
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
};

export default Login; 