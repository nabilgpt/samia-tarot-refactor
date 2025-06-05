import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, 
  Phone, 
  Key, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  ArrowRight,
  Sparkles,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  Timer,
  Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import AnimatedBackground from '../components/UI/AnimatedBackground';
import Button from '../components/Button';
import Loader from '../components/Loader';

const ForgotPassword = () => {
  const { t } = useTranslation();
  const { resetPassword } = useAuth();
  const { language, showSuccess, showError } = useUI();
  const navigate = useNavigate();

  // Form steps: 'method' -> 'verify' -> 'reset' -> 'success'
  const [currentStep, setCurrentStep] = useState('method');
  const [selectedMethod, setSelectedMethod] = useState('email'); // 'email' or 'phone'
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Form data
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    verificationCode: '',
    newPassword: '',
    confirmPassword: ''
  });

  // UI state
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Countdown timer for resend verification
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^\+?[\d\s-()]{10,}$/;
    return phoneRegex.test(phone);
  };

  const validatePassword = (password) => {
    return password.length >= 8 && 
           /[A-Z]/.test(password) && 
           /[a-z]/.test(password) && 
           /\d/.test(password);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear specific error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleMethodSelect = (method) => {
    setSelectedMethod(method);
    setErrors({});
  };

  const handleSendVerification = async (e) => {
    e.preventDefault();
    setErrors({});

    // Validate input based on selected method
    if (selectedMethod === 'email') {
      if (!formData.email) {
        setErrors({ email: language === 'ar' ? 'البريد الإلكتروني مطلوب' : 'Email is required' });
        return;
      }
      if (!validateEmail(formData.email)) {
        setErrors({ email: language === 'ar' ? 'البريد الإلكتروني غير صحيح' : 'Invalid email format' });
        return;
      }
    } else {
      if (!formData.phone) {
        setErrors({ phone: language === 'ar' ? 'رقم الهاتف مطلوب' : 'Phone number is required' });
        return;
      }
      if (!validatePhone(formData.phone)) {
        setErrors({ phone: language === 'ar' ? 'رقم الهاتف غير صحيح' : 'Invalid phone number' });
        return;
      }
    }

    try {
      setLoading(true);

      // Simulate API call for sending verification
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In real implementation, call your backend API here
      const success = true; // Replace with actual API response

      if (success) {
        showSuccess(
          selectedMethod === 'email' 
            ? (language === 'ar' ? 'تم إرسال رمز التحقق إلى بريدك الإلكتروني' : 'Verification code sent to your email')
            : (language === 'ar' ? 'تم إرسال رمز التحقق إلى هاتفك' : 'Verification code sent to your phone')
        );
        setCurrentStep('verify');
        setCountdown(60); // 60 seconds countdown
      } else {
        throw new Error('Failed to send verification code');
      }
    } catch (error) {
      showError(
        selectedMethod === 'email'
          ? (language === 'ar' ? 'فشل في إرسال رمز التحقق إلى البريد الإلكتروني' : 'Failed to send email verification')
          : (language === 'ar' ? 'فشل في إرسال رمز التحقق إلى الهاتف' : 'Failed to send SMS verification')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setErrors({});

    if (!formData.verificationCode) {
      setErrors({ verificationCode: language === 'ar' ? 'رمز التحقق مطلوب' : 'Verification code is required' });
      return;
    }

    if (formData.verificationCode.length !== 6) {
      setErrors({ verificationCode: language === 'ar' ? 'رمز التحقق يجب أن يكون 6 أرقام' : 'Verification code must be 6 digits' });
      return;
    }

    try {
      setLoading(true);

      // Simulate API call for verification
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock verification (replace with actual API call)
      const isValidCode = formData.verificationCode === '123456';

      if (isValidCode) {
        showSuccess(language === 'ar' ? 'تم التحقق بنجاح' : 'Verification successful');
        setCurrentStep('reset');
      } else {
        setErrors({ verificationCode: language === 'ar' ? 'رمز التحقق غير صحيح' : 'Invalid verification code' });
      }
    } catch (error) {
      showError(language === 'ar' ? 'فشل في التحقق من الرمز' : 'Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrors({});

    // Validate new password
    if (!formData.newPassword) {
      setErrors({ newPassword: language === 'ar' ? 'كلمة المرور الجديدة مطلوبة' : 'New password is required' });
      return;
    }

    if (!validatePassword(formData.newPassword)) {
      setErrors({ 
        newPassword: language === 'ar' 
          ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على أحرف كبيرة وصغيرة وأرقام'
          : 'Password must be at least 8 characters with uppercase, lowercase, and numbers'
      });
      return;
    }

    if (!formData.confirmPassword) {
      setErrors({ confirmPassword: language === 'ar' ? 'تأكيد كلمة المرور مطلوب' : 'Password confirmation is required' });
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setErrors({ confirmPassword: language === 'ar' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match' });
      return;
    }

    try {
      setLoading(true);

      // Simulate password reset API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const result = await resetPassword({
        [selectedMethod]: formData[selectedMethod],
        verificationCode: formData.verificationCode,
        newPassword: formData.newPassword
      });

      if (result.success) {
        setCurrentStep('success');
      } else {
        throw new Error(result.error || 'Password reset failed');
      }
    } catch (error) {
      showError(error.message || (language === 'ar' ? 'فشل في إعادة تعيين كلمة المرور' : 'Failed to reset password'));
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;
    
    try {
      setLoading(true);
      
      // Simulate resend API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      showSuccess(
        selectedMethod === 'email'
          ? (language === 'ar' ? 'تم إعادة إرسال الرمز إلى بريدك الإلكتروني' : 'Code resent to your email')
          : (language === 'ar' ? 'تم إعادة إرسال الرمز إلى هاتفك' : 'Code resent to your phone')
      );
      setCountdown(60);
    } catch (error) {
      showError(language === 'ar' ? 'فشل في إعادة الإرسال' : 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  const renderMethodSelection = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-gold-500 to-gold-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-gold-500/30">
          <Key className="w-8 h-8 text-dark-900" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {language === 'ar' ? 'إعادة تعيين كلمة المرور' : 'Reset Password'}
        </h2>
        <p className="text-gray-400">
          {language === 'ar' 
            ? 'اختر طريقة استلام رمز التحقق'
            : 'Choose how to receive your verification code'
          }
        </p>
      </div>

      <div className="space-y-4">
        {/* Email Method */}
        <motion.button
          onClick={() => handleMethodSelect('email')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`
            w-full p-6 rounded-xl border-2 transition-all duration-200 text-left
            ${selectedMethod === 'email'
              ? 'border-gold-400 bg-gold-400/10 shadow-lg shadow-gold-500/20'
              : 'border-gold-400/20 bg-dark-700/30 hover:border-gold-400/40'
            }
          `}
        >
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <div className={`
              w-12 h-12 rounded-lg flex items-center justify-center
              ${selectedMethod === 'email' 
                ? 'bg-gradient-to-r from-gold-500 to-gold-600 text-dark-900' 
                : 'bg-gold-400/20 text-gold-400'
              }
            `}>
              <Mail className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-white mb-1">
                {language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
              </h3>
              <p className="text-gray-400 text-sm">
                {language === 'ar' 
                  ? 'احصل على رمز التحقق عبر البريد الإلكتروني'
                  : 'Get verification code via email'
                }
              </p>
            </div>
            {selectedMethod === 'email' && (
              <CheckCircle className="w-6 h-6 text-gold-400" />
            )}
          </div>
        </motion.button>

        {/* Phone Method */}
        <motion.button
          onClick={() => handleMethodSelect('phone')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`
            w-full p-6 rounded-xl border-2 transition-all duration-200 text-left
            ${selectedMethod === 'phone'
              ? 'border-gold-400 bg-gold-400/10 shadow-lg shadow-gold-500/20'
              : 'border-gold-400/20 bg-dark-700/30 hover:border-gold-400/40'
            }
          `}
        >
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <div className={`
              w-12 h-12 rounded-lg flex items-center justify-center
              ${selectedMethod === 'phone' 
                ? 'bg-gradient-to-r from-cosmic-500 to-cosmic-600 text-white' 
                : 'bg-cosmic-400/20 text-cosmic-400'
              }
            `}>
              <Phone className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-white mb-1">
                {language === 'ar' ? 'رقم الهاتف' : 'Phone Number'}
              </h3>
              <p className="text-gray-400 text-sm">
                {language === 'ar' 
                  ? 'احصل على رمز التحقق عبر رسالة نصية'
                  : 'Get verification code via SMS'
                }
              </p>
            </div>
            {selectedMethod === 'phone' && (
              <CheckCircle className="w-6 h-6 text-cosmic-400" />
            )}
          </div>
        </motion.button>
      </div>

      {/* Input Field */}
      <form onSubmit={handleSendVerification} className="space-y-6">
        {selectedMethod === 'email' ? (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder={language === 'ar' ? 'أدخل بريدك الإلكتروني' : 'Enter your email address'}
              className={`
                w-full px-4 py-3 bg-dark-700/50 border rounded-lg text-white placeholder-gray-400 
                focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 
                transition-all duration-200
                ${errors.email ? 'border-red-500' : 'border-gold-400/30'}
              `}
              dir={language === 'ar' ? 'rtl' : 'ltr'}
            />
            {errors.email && (
              <p className="text-red-400 text-sm mt-1 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.email}
              </p>
            )}
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {language === 'ar' ? 'رقم الهاتف' : 'Phone Number'}
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder={language === 'ar' ? 'أدخل رقم هاتفك' : 'Enter your phone number'}
              className={`
                w-full px-4 py-3 bg-dark-700/50 border rounded-lg text-white placeholder-gray-400 
                focus:outline-none focus:ring-2 focus:ring-cosmic-400/50 focus:border-cosmic-400 
                transition-all duration-200
                ${errors.phone ? 'border-red-500' : 'border-cosmic-400/30'}
              `}
              dir={language === 'ar' ? 'rtl' : 'ltr'}
            />
            {errors.phone && (
              <p className="text-red-400 text-sm mt-1 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.phone}
              </p>
            )}
          </div>
        )}

        <Button
          type="submit"
          loading={loading}
          className={`
            w-full font-bold py-3 px-6 shadow-lg transition-all duration-200 transform hover:scale-105
            ${selectedMethod === 'email'
              ? 'bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-dark-900 shadow-gold-500/30'
              : 'bg-gradient-to-r from-cosmic-500 to-cosmic-600 hover:from-cosmic-600 hover:to-cosmic-700 text-white shadow-cosmic-500/30'
            }
          `}
        >
          {loading ? (
            <div className="flex items-center justify-center space-x-2">
              <Loader size="sm" variant="spinner" />
              <span>{language === 'ar' ? 'جاري الإرسال...' : 'Sending...'}</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse">
              <span>
                {language === 'ar' ? 'إرسال رمز التحقق' : 'Send Verification Code'}
              </span>
              <ArrowRight className={`w-5 h-5 ${language === 'ar' ? 'rotate-180' : ''}`} />
            </div>
          )}
        </Button>
      </form>
    </motion.div>
  );

  const renderVerificationStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-cosmic-500 to-cosmic-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-cosmic-500/30">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {language === 'ar' ? 'تحقق من الرمز' : 'Verify Code'}
        </h2>
        <p className="text-gray-400">
          {language === 'ar' 
            ? `أدخل الرمز المرسل إلى ${selectedMethod === 'email' ? 'بريدك الإلكتروني' : 'هاتفك'}`
            : `Enter the code sent to your ${selectedMethod === 'email' ? 'email' : 'phone'}`
          }
        </p>
        <p className="text-cosmic-400 text-sm mt-2">
          {selectedMethod === 'email' ? formData.email : formData.phone}
        </p>
      </div>

      <form onSubmit={handleVerifyCode} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {language === 'ar' ? 'رمز التحقق (6 أرقام)' : 'Verification Code (6 digits)'}
          </label>
          <input
            type="text"
            name="verificationCode"
            value={formData.verificationCode}
            onChange={handleInputChange}
            placeholder="123456"
            maxLength={6}
            className={`
              w-full px-4 py-3 bg-dark-700/50 border rounded-lg text-white placeholder-gray-400 
              focus:outline-none focus:ring-2 focus:ring-cosmic-400/50 focus:border-cosmic-400 
              transition-all duration-200 text-center text-2xl tracking-widest
              ${errors.verificationCode ? 'border-red-500' : 'border-cosmic-400/30'}
            `}
          />
          {errors.verificationCode && (
            <p className="text-red-400 text-sm mt-1 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.verificationCode}
            </p>
          )}
        </div>

        <Button
          type="submit"
          loading={loading}
          className="w-full bg-gradient-to-r from-cosmic-500 to-cosmic-600 hover:from-cosmic-600 hover:to-cosmic-700 text-white font-bold py-3 px-6 shadow-lg shadow-cosmic-500/30 transition-all duration-200 transform hover:scale-105"
        >
          {loading ? (
            <div className="flex items-center justify-center space-x-2">
              <Loader size="sm" variant="spinner" />
              <span>{language === 'ar' ? 'جاري التحقق...' : 'Verifying...'}</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse">
              <CheckCircle className="w-5 h-5" />
              <span>{language === 'ar' ? 'تحقق من الرمز' : 'Verify Code'}</span>
            </div>
          )}
        </Button>

        {/* Resend Code */}
        <div className="text-center">
          <p className="text-gray-400 text-sm mb-2">
            {language === 'ar' ? 'لم تستلم الرمز؟' : "Didn't receive the code?"}
          </p>
          <button
            type="button"
            onClick={handleResendCode}
            disabled={countdown > 0 || loading}
            className={`
              text-sm font-medium transition-colors duration-200
              ${countdown > 0 || loading
                ? 'text-gray-500 cursor-not-allowed'
                : 'text-cosmic-400 hover:text-cosmic-300'
              }
            `}
          >
            {countdown > 0 ? (
              <div className="flex items-center space-x-1">
                <Timer className="w-4 h-4" />
                <span>
                  {language === 'ar' 
                    ? `إعادة الإرسال خلال ${countdown} ثانية`
                    : `Resend in ${countdown}s`
                  }
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-1">
                <RotateCcw className="w-4 h-4" />
                <span>{language === 'ar' ? 'إعادة الإرسال' : 'Resend Code'}</span>
              </div>
            )}
          </button>
        </div>
      </form>

      <button
        onClick={() => setCurrentStep('method')}
        className="w-full text-center text-gray-400 hover:text-white transition-colors duration-200 text-sm flex items-center justify-center space-x-1"
      >
        <ArrowLeft className={`w-4 h-4 ${language === 'ar' ? 'rotate-180' : ''}`} />
        <span>{language === 'ar' ? 'تغيير الطريقة' : 'Change Method'}</span>
      </button>
    </motion.div>
  );

  const renderPasswordReset = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/30">
          <Lock className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {language === 'ar' ? 'كلمة مرور جديدة' : 'New Password'}
        </h2>
        <p className="text-gray-400">
          {language === 'ar' 
            ? 'اختر كلمة مرور قوية لحسابك'
            : 'Choose a strong password for your account'
          }
        </p>
      </div>

      <form onSubmit={handleResetPassword} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {language === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              name="newPassword"
              value={formData.newPassword}
              onChange={handleInputChange}
              placeholder={language === 'ar' ? 'أدخل كلمة المرور الجديدة' : 'Enter new password'}
              className={`
                w-full px-4 py-3 pr-12 bg-dark-700/50 border rounded-lg text-white placeholder-gray-400 
                focus:outline-none focus:ring-2 focus:ring-green-400/50 focus:border-green-400 
                transition-all duration-200
                ${errors.newPassword ? 'border-red-500' : 'border-green-400/30'}
              `}
              dir={language === 'ar' ? 'rtl' : 'ltr'}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={`absolute inset-y-0 flex items-center px-3 ${
                language === 'ar' ? 'left-0' : 'right-0'
              }`}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5 text-gray-400 hover:text-gray-300" />
              ) : (
                <Eye className="w-5 h-5 text-gray-400 hover:text-gray-300" />
              )}
            </button>
          </div>
          {errors.newPassword && (
            <p className="text-red-400 text-sm mt-1 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.newPassword}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {language === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              placeholder={language === 'ar' ? 'أعد إدخال كلمة المرور' : 'Re-enter password'}
              className={`
                w-full px-4 py-3 pr-12 bg-dark-700/50 border rounded-lg text-white placeholder-gray-400 
                focus:outline-none focus:ring-2 focus:ring-green-400/50 focus:border-green-400 
                transition-all duration-200
                ${errors.confirmPassword ? 'border-red-500' : 'border-green-400/30'}
              `}
              dir={language === 'ar' ? 'rtl' : 'ltr'}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className={`absolute inset-y-0 flex items-center px-3 ${
                language === 'ar' ? 'left-0' : 'right-0'
              }`}
            >
              {showConfirmPassword ? (
                <EyeOff className="w-5 h-5 text-gray-400 hover:text-gray-300" />
              ) : (
                <Eye className="w-5 h-5 text-gray-400 hover:text-gray-300" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-red-400 text-sm mt-1 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.confirmPassword}
            </p>
          )}
        </div>

        {/* Password Requirements */}
        <div className="bg-dark-700/30 border border-gray-600/30 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-300 mb-2">
            {language === 'ar' ? 'متطلبات كلمة المرور:' : 'Password Requirements:'}
          </h4>
          <ul className="text-xs text-gray-400 space-y-1">
            <li className={`flex items-center ${formData.newPassword.length >= 8 ? 'text-green-400' : ''}`}>
              <span className="w-1 h-1 bg-current rounded-full mr-2"></span>
              {language === 'ar' ? '8 أحرف على الأقل' : 'At least 8 characters'}
            </li>
            <li className={`flex items-center ${/[A-Z]/.test(formData.newPassword) ? 'text-green-400' : ''}`}>
              <span className="w-1 h-1 bg-current rounded-full mr-2"></span>
              {language === 'ar' ? 'حرف كبير واحد على الأقل' : 'At least one uppercase letter'}
            </li>
            <li className={`flex items-center ${/[a-z]/.test(formData.newPassword) ? 'text-green-400' : ''}`}>
              <span className="w-1 h-1 bg-current rounded-full mr-2"></span>
              {language === 'ar' ? 'حرف صغير واحد على الأقل' : 'At least one lowercase letter'}
            </li>
            <li className={`flex items-center ${/\d/.test(formData.newPassword) ? 'text-green-400' : ''}`}>
              <span className="w-1 h-1 bg-current rounded-full mr-2"></span>
              {language === 'ar' ? 'رقم واحد على الأقل' : 'At least one number'}
            </li>
          </ul>
        </div>

        <Button
          type="submit"
          loading={loading}
          className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-6 shadow-lg shadow-green-500/30 transition-all duration-200 transform hover:scale-105"
        >
          {loading ? (
            <div className="flex items-center justify-center space-x-2">
              <Loader size="sm" variant="spinner" />
              <span>{language === 'ar' ? 'جاري إعادة التعيين...' : 'Resetting...'}</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse">
              <Lock className="w-5 h-5" />
              <span>{language === 'ar' ? 'إعادة تعيين كلمة المرور' : 'Reset Password'}</span>
            </div>
          )}
        </Button>
      </form>
    </motion.div>
  );

  const renderSuccessStep = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-6"
    >
      <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
        <CheckCircle className="w-10 h-10 text-white" />
      </div>
      
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {language === 'ar' ? 'تم بنجاح!' : 'Success!'}
        </h2>
        <p className="text-gray-400">
          {language === 'ar' 
            ? 'تم إعادة تعيين كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.'
            : 'Your password has been reset successfully. You can now sign in with your new password.'
          }
        </p>
      </div>

      <div className="space-y-3">
        <Button
          onClick={() => navigate('/login')}
          className="w-full bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-dark-900 font-bold py-3 px-6 shadow-lg shadow-gold-500/30 transition-all duration-200 transform hover:scale-105"
        >
          <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse">
            <span>{language === 'ar' ? 'تسجيل الدخول' : 'Sign In'}</span>
            <ArrowRight className={`w-5 h-5 ${language === 'ar' ? 'rotate-180' : ''}`} />
          </div>
        </Button>
        
        <Link
          to="/"
          className="block text-center text-gray-400 hover:text-white transition-colors duration-200 text-sm"
        >
          {language === 'ar' ? 'العودة إلى الصفحة الرئيسية' : 'Back to Home'}
        </Link>
      </div>
    </motion.div>
  );

  return (
    <AnimatedBackground variant="default" intensity="normal">
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          {/* Back to Login */}
          <div className="text-center mb-8">
            <Link
              to="/login"
              className="inline-flex items-center text-gold-400 hover:text-gold-300 transition-colors duration-200 text-sm"
            >
              <ArrowLeft className={`w-4 h-4 mr-1 ${language === 'ar' ? 'rotate-180' : ''}`} />
              {language === 'ar' ? 'العودة لتسجيل الدخول' : 'Back to Login'}
            </Link>
          </div>

          {/* Main Card */}
          <div className="bg-dark-800/50 backdrop-blur-xl border border-gold-400/20 rounded-2xl p-8 shadow-2xl shadow-cosmic-500/10">
            <AnimatePresence mode="wait">
              {currentStep === 'method' && renderMethodSelection()}
              {currentStep === 'verify' && renderVerificationStep()}
              {currentStep === 'reset' && renderPasswordReset()}
              {currentStep === 'success' && renderSuccessStep()}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-gray-400 text-sm">
              {language === 'ar' ? 'تذكرت كلمة المرور؟' : 'Remember your password?'}{' '}
              <Link
                to="/login"
                className="text-gold-400 hover:text-gold-300 transition-colors duration-200 font-medium"
              >
                {language === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </AnimatedBackground>
  );
};

export default ForgotPassword; 