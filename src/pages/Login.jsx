import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Mail, Lock, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import Button from '../components/Button';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading } = useAuth();
  const { showSuccess, showError } = useUI();

  const from = location.state?.from?.pathname || '/';

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = 'البريد الإلكتروني مطلوب';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'البريد الإلكتروني غير صحيح';
    }

    if (!formData.password) {
      newErrors.password = 'كلمة المرور مطلوبة';
    } else if (formData.password.length < 6) {
      newErrors.password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const result = await login(formData.email, formData.password);
    
    if (result.success) {
      showSuccess('تم تسجيل الدخول بنجاح');
      navigate(from, { replace: true });
    } else {
      showError(result.error || 'فشل في تسجيل الدخول');
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

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-cosmic-pattern opacity-5"></div>
      <div className="absolute top-20 left-10 w-72 h-72 bg-cosmic-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      
      <div className="relative max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gold-gradient rounded-xl flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-dark-900" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">
            {t('auth.login.title')}
          </h2>
          <p className="text-gray-400">
            {t('auth.login.subtitle')}
          </p>
        </div>

        {/* Login Form */}
        <div className="card">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                {t('auth.login.email')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-3 rtl:pl-0 rtl:pr-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`input-field pl-10 rtl:pl-4 rtl:pr-10 ${
                    errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''
                  }`}
                  placeholder="example@email.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-400">{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                {t('auth.login.password')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-3 rtl:pl-0 rtl:pr-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`input-field pl-10 pr-10 rtl:pl-10 rtl:pr-10 ${
                    errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 pr-3 rtl:pr-0 rtl:pl-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-400">{errors.password}</p>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="rememberMe"
                  name="rememberMe"
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="h-4 w-4 text-gold-400 bg-dark-700 border-gold-400/30 rounded focus:ring-gold-400/20 focus:ring-2"
                />
                <label htmlFor="rememberMe" className="ml-2 rtl:ml-0 rtl:mr-2 block text-sm text-gray-300">
                  {t('auth.login.rememberMe')}
                </label>
              </div>

              <div className="text-sm">
                <Link
                  to="/forgot-password"
                  className="text-gold-400 hover:text-gold-300 transition-colors duration-200"
                >
                  {t('auth.login.forgotPassword')}
                </Link>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              loading={loading}
              disabled={loading}
            >
              {t('auth.login.loginButton')}
            </Button>
          </form>

          {/* Divider */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gold-400/20" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-dark-800 text-gray-400">أو</span>
              </div>
            </div>
          </div>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              {t('auth.login.noAccount')}{' '}
              <Link
                to="/signup"
                className="text-gold-400 hover:text-gold-300 font-medium transition-colors duration-200"
              >
                {t('auth.login.signupLink')}
              </Link>
            </p>
          </div>
        </div>

        {/* Demo Credentials */}
        <div className="card bg-cosmic-900/30 border-cosmic-400/20">
          <div className="text-center space-y-2">
            <h3 className="text-sm font-medium text-cosmic-400">للتجربة السريعة</h3>
            <div className="text-xs text-gray-400 space-y-1">
              <p>البريد الإلكتروني: demo@samia-tarot.com</p>
              <p>كلمة المرور: 123456</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login; 