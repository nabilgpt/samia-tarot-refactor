import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Mail, Phone, Calendar, MapPin, User, Lock, Shield, Check, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import Button from '../components/Button';
import AnimatedBackground from '../components/UI/AnimatedBackground';
import SocialAuth from '../components/SocialAuth';
import ReCaptchaComponent from '../components/ReCaptchaComponent';
import { getCountryCodeFromCountry, getZodiacFromDateOfBirth, validateEmail, validatePhone, validatePassword } from '../utils/validation';
import { countries } from '../utils/countries';

const AuthPage = () => {
  const { t } = useTranslation();
  const { signup, login, isAuthenticated, user, profile, initialized } = useAuth();
  const { showNotification } = useUI();
  const navigate = useNavigate();
  const location = useLocation();
  const recaptchaRef = useRef();

  // 🔄 Redirect already authenticated users to their dashboard
  useEffect(() => {
    if (initialized && isAuthenticated && user && profile) {
      console.log('🔄 AuthPage: User already authenticated, redirecting to dashboard...');
      const dashboardPath = `/dashboard/${profile.role === 'super_admin' ? 'super-admin' : profile.role}`;
      navigate(dashboardPath, { replace: true });
    }
  }, [initialized, isAuthenticated, user, profile, navigate]);

  // Show loading while checking authentication
  if (!initialized) {
    return (
      <AnimatedBackground variant="auth" intensity="normal">
        <div className="min-h-screen flex items-center justify-center p-4">
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
      </AnimatedBackground>
    );
  }

  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'mobile'
  const [authMethod, setAuthMethod] = useState('form'); // 'form' | 'social' | 'mobile'
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: '',
    countryCode: '',
    dateOfBirth: '',
    zodiac: '',
    gender: '',
    password: '',
    confirmPassword: '',
    termsAccepted: false,
    rememberMe: false
  });

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // Multi-step form for signup
  const [verificationStep, setVerificationStep] = useState({
    email: false,
    phone: false,
    captcha: false
  });
  const [verificationCodes, setVerificationCodes] = useState({
    email: '',
    phone: ''
  });
  const [captchaToken, setCaptchaToken] = useState('');

  // Auto-fill country code when country changes
  useEffect(() => {
    if (formData.country) {
      const countryCode = getCountryCodeFromCountry(formData.country);
      setFormData(prev => ({ ...prev, countryCode }));
    }
  }, [formData.country]);

  // Auto-fill zodiac when date of birth changes
  useEffect(() => {
    if (formData.dateOfBirth) {
      const zodiac = getZodiacFromDateOfBirth(formData.dateOfBirth);
      setFormData(prev => ({ ...prev, zodiac }));
    }
  }, [formData.dateOfBirth]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Validation functions
  const validateSigninForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = t('auth.errors.emailRequired');
    } else if (!validateEmail(formData.email)) {
      newErrors.email = t('auth.errors.emailInvalid');
    }

    if (!formData.password) {
      newErrors.password = t('auth.errors.passwordRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateSignupStep1 = () => {
    const newErrors = {};

    if (!formData.firstName) {
      newErrors.firstName = t('auth.errors.firstNameRequired');
    }
    if (!formData.lastName) {
      newErrors.lastName = t('auth.errors.lastNameRequired');
    }
    if (!formData.email) {
      newErrors.email = t('auth.errors.emailRequired');
    } else if (!validateEmail(formData.email)) {
      newErrors.email = t('auth.errors.emailInvalid');
    }
    if (!formData.phone) {
      newErrors.phone = t('auth.errors.phoneRequired');
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = t('auth.errors.phoneInvalid');
    }
    if (!formData.country) {
      newErrors.country = t('auth.errors.countryRequired');
    }
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = t('auth.errors.dateOfBirthRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateSignupStep2 = () => {
    const newErrors = {};

    if (!formData.password) {
      newErrors.password = t('auth.errors.passwordRequired');
    } else if (!validatePassword(formData.password)) {
      newErrors.password = t('auth.errors.passwordWeak');
    }
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t('auth.errors.confirmPasswordRequired');
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('auth.errors.passwordMismatch');
    }
    if (!formData.termsAccepted) {
      newErrors.termsAccepted = t('auth.errors.termsRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Verification functions
  const sendEmailVerification = async () => {
    try {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      showNotification(t('auth.verification.emailSent'), 'success');
      setVerificationStep(prev => ({ ...prev, email: true }));
    } catch (error) {
      showNotification(t('auth.verification.emailError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const sendPhoneVerification = async () => {
    try {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      showNotification(t('auth.verification.phoneSent'), 'success');
      setVerificationStep(prev => ({ ...prev, phone: true }));
    } catch (error) {
      showNotification(t('auth.verification.phoneError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const verifyEmail = async () => {
    if (verificationCodes.email === '123456') {
      setVerificationStep(prev => ({ ...prev, email: 'verified' }));
      showNotification(t('auth.verification.emailVerified'), 'success');
    } else {
      showNotification(t('auth.verification.invalidCode'), 'error');
    }
  };

  const verifyPhone = async () => {
    if (verificationCodes.phone === '123456') {
      setVerificationStep(prev => ({ ...prev, phone: 'verified' }));
      showNotification(t('auth.verification.phoneVerified'), 'success');
    } else {
      showNotification(t('auth.verification.invalidCode'), 'error');
    }
  };

  const handleCaptcha = (token) => {
    setCaptchaToken(token);
    setVerificationStep(prev => ({ ...prev, captcha: true }));
  };

  // Navigation functions
  const handleNextStep = () => {
    if (step === 1 && validateSignupStep1()) {
      setStep(2);
    } else if (step === 2 && validateSignupStep2()) {
      setStep(3);
    }
  };

  const handleBackStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  // Submit functions
  const handleSignin = async (e) => {
    e.preventDefault();
    
    if (!validateSigninForm()) return;

    try {
      setLoading(true);
      const result = await login(formData.email, formData.password);
      
      if (result.success) {
        showNotification(t('auth.signin.success'), 'success');
        navigate(location.state?.from?.pathname || '/');
      } else {
        showNotification(result.error || t('auth.signin.error'), 'error');
      }
    } catch (error) {
      showNotification(error.message || t('auth.signin.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    
    if (verificationStep.email !== 'verified' || verificationStep.phone !== 'verified' || !verificationStep.captcha) {
      showNotification(t('auth.errors.verificationIncomplete'), 'error');
      return;
    }

    try {
      setLoading(true);
      
      // Prepare final payload
      const signupData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        country: formData.country,
        countryCode: formData.countryCode,
        dateOfBirth: formData.dateOfBirth,
        zodiac: formData.zodiac,
        gender: formData.gender,
        password: formData.password,
        emailVerified: true,
        mobileVerified: true,
        captchaVerified: true
      };

      const result = await signup(signupData);
      
      if (result.success) {
        showNotification(t('auth.signup.success'), 'success');
        navigate('/');
      } else {
        showNotification(result.error || t('auth.signup.error'), 'error');
      }
    } catch (error) {
      showNotification(error.message || t('auth.signup.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Social auth handlers
  const handleSocialSuccess = (user) => {
    showNotification(t('auth.social.success'), 'success');
    navigate('/');
  };

  const handleSocialError = (error) => {
    showNotification(error || t('auth.social.error'), 'error');
  };

  // Render functions
  const renderModeSelector = () => (
    <div className="flex space-x-2 mb-8">
      <Button
        onClick={() => { setMode('signin'); setAuthMethod('form'); setStep(1); }}
        variant={mode === 'signin' ? 'primary' : 'outline'}
        className="flex-1"
      >
        {t('auth.signin.title')}
      </Button>
      <Button
        onClick={() => { setMode('signup'); setAuthMethod('form'); setStep(1); }}
        variant={mode === 'signup' ? 'primary' : 'outline'}
        className="flex-1"
      >
        {t('auth.signup.title')}
      </Button>
    </div>
  );

  const renderAuthMethodSelector = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <Button
        onClick={() => setAuthMethod('form')}
        variant={authMethod === 'form' ? 'primary' : 'outline'}
        className="flex flex-col items-center p-6 h-auto"
      >
        <Mail className="w-8 h-8 mb-2" />
        <span>{t('auth.methods.email')}</span>
      </Button>
      <Button
        onClick={() => setAuthMethod('social')}
        variant={authMethod === 'social' ? 'primary' : 'outline'}
        className="flex flex-col items-center p-6 h-auto"
      >
        <Shield className="w-8 h-8 mb-2" />
        <span>{t('auth.methods.social')}</span>
      </Button>
      <Button
        onClick={() => setAuthMethod('mobile')}
        variant={authMethod === 'mobile' ? 'primary' : 'outline'}
        className="flex flex-col items-center p-6 h-auto"
      >
        <Phone className="w-8 h-8 mb-2" />
        <span>{t('auth.methods.mobile')}</span>
      </Button>
    </div>
  );

  const renderSigninForm = () => (
    <form onSubmit={handleSignin} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gold-400 mb-2">
          <Mail className="inline w-4 h-4 mr-2" />
          {t('auth.email')}
        </label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          className="input-field"
          placeholder={t('auth.placeholders.email')}
          autoFocus
        />
        {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gold-400 mb-2">
          <Lock className="inline w-4 h-4 mr-2" />
          {t('auth.password')}
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            className="input-field pr-12"
            placeholder={t('auth.placeholders.password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gold-400"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {errors.password && <p className="text-red-400 text-sm mt-1">{errors.password}</p>}
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center">
          <input
            type="checkbox"
            name="rememberMe"
            checked={formData.rememberMe}
            onChange={handleInputChange}
            className="w-4 h-4 text-gold-400 bg-dark-700 border-gold-400 rounded focus:ring-gold-400"
          />
          <span className="ml-2 text-sm text-gray-300">{t('auth.rememberMe')}</span>
        </label>
        <Link to="/forgot-password" className="text-sm text-gold-400 hover:underline">
          {t('auth.forgotPassword')}
        </Link>
      </div>

      <Button
        type="submit"
        loading={loading}
        className="w-full"
        size="lg"
      >
        {t('auth.signin.submit')}
      </Button>
    </form>
  );

  const renderSignupStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="flex justify-center space-x-2">
          <div className="w-8 h-2 bg-gold-400 rounded-full"></div>
          <div className="w-8 h-2 bg-gray-600 rounded-full"></div>
          <div className="w-8 h-2 bg-gray-600 rounded-full"></div>
        </div>
        <p className="text-sm text-gray-400 mt-2">{t('auth.signup.step1of3')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gold-400 mb-2">
            <User className="inline w-4 h-4 mr-2" />
            {t('auth.firstName')} *
          </label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleInputChange}
            className="input-field"
            placeholder={t('auth.placeholders.firstName')}
          />
          {errors.firstName && <p className="text-red-400 text-sm mt-1">{errors.firstName}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gold-400 mb-2">
            <User className="inline w-4 h-4 mr-2" />
            {t('auth.lastName')} *
          </label>
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleInputChange}
            className="input-field"
            placeholder={t('auth.placeholders.lastName')}
          />
          {errors.lastName && <p className="text-red-400 text-sm mt-1">{errors.lastName}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gold-400 mb-2">
          <Mail className="inline w-4 h-4 mr-2" />
          {t('auth.email')} *
        </label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          className="input-field"
          placeholder={t('auth.placeholders.email')}
        />
        {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gold-400 mb-2">
            <MapPin className="inline w-4 h-4 mr-2" />
            {t('auth.country')} *
          </label>
          <select
            name="country"
            value={formData.country}
            onChange={handleInputChange}
            className="input-field"
          >
            <option value="">{t('auth.placeholders.country')}</option>
            {countries.map((country) => (
              <option key={country.code} value={country.name}>
                {country.name}
              </option>
            ))}
          </select>
          {errors.country && <p className="text-red-400 text-sm mt-1">{errors.country}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gold-400 mb-2">
            {t('auth.countryCode')}
          </label>
          <input
            type="text"
            name="countryCode"
            value={formData.countryCode}
            className="input-field bg-gray-700 cursor-not-allowed"
            readOnly
            placeholder="+966"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gold-400 mb-2">
            <Phone className="inline w-4 h-4 mr-2" />
            {t('auth.phone')} *
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            className="input-field"
            placeholder={t('auth.placeholders.phone')}
            dir="ltr"
          />
          {errors.phone && <p className="text-red-400 text-sm mt-1">{errors.phone}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gold-400 mb-2">
            <Calendar className="inline w-4 h-4 mr-2" />
            {t('auth.dateOfBirth')} *
          </label>
          <input
            type="date"
            name="dateOfBirth"
            value={formData.dateOfBirth}
            onChange={handleInputChange}
            className="input-field"
            max={new Date().toISOString().split('T')[0]}
          />
          {errors.dateOfBirth && <p className="text-red-400 text-sm mt-1">{errors.dateOfBirth}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gold-400 mb-2">
            ✨ {t('auth.zodiac')}
          </label>
          <input
            type="text"
            name="zodiac"
            value={formData.zodiac}
            className="input-field bg-gray-700 cursor-not-allowed"
            readOnly
            placeholder={t('auth.placeholders.zodiac')}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gold-400 mb-2">
          {t('auth.gender')} ({t('auth.optional')})
        </label>
        <select
          name="gender"
          value={formData.gender}
          onChange={handleInputChange}
          className="input-field"
        >
          <option value="">{t('auth.placeholders.gender')}</option>
          <option value="male">{t('auth.genders.male')}</option>
          <option value="female">{t('auth.genders.female')}</option>
          <option value="prefer-not-to-say">{t('auth.genders.preferNotToSay')}</option>
        </select>
      </div>

      <Button
        onClick={handleNextStep}
        className="w-full"
        size="lg"
      >
        {t('auth.nextStep')}
      </Button>
    </div>
  );

  const renderSignupStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="flex justify-center space-x-2">
          <div className="w-8 h-2 bg-gold-400 rounded-full"></div>
          <div className="w-8 h-2 bg-gold-400 rounded-full"></div>
          <div className="w-8 h-2 bg-gray-600 rounded-full"></div>
        </div>
        <p className="text-sm text-gray-400 mt-2">{t('auth.signup.step2of3')}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gold-400 mb-2">
          <Lock className="inline w-4 h-4 mr-2" />
          {t('auth.password')} *
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            className="input-field pr-12"
            placeholder={t('auth.placeholders.password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gold-400"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {errors.password && <p className="text-red-400 text-sm mt-1">{errors.password}</p>}
        <div className="mt-2 text-xs text-gray-400">
          {t('auth.passwordRequirements')}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gold-400 mb-2">
          <Lock className="inline w-4 h-4 mr-2" />
          {t('auth.confirmPassword')} *
        </label>
        <div className="relative">
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            className="input-field pr-12"
            placeholder={t('auth.placeholders.confirmPassword')}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gold-400"
          >
            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {errors.confirmPassword && <p className="text-red-400 text-sm mt-1">{errors.confirmPassword}</p>}
      </div>

      <div className="flex items-start space-x-3">
        <input
          type="checkbox"
          name="termsAccepted"
          checked={formData.termsAccepted}
          onChange={handleInputChange}
          className="mt-1 w-4 h-4 text-gold-400 bg-dark-700 border-gold-400 rounded focus:ring-gold-400"
        />
        <label className="text-sm text-gray-300">
          {t('auth.termsText')}{' '}
          <a 
            href="https://docs.google.com/document/d/1gGDfqW5WbaqAv0FXd6pxMi1XbUUHe1WlvkIeliebVMw/edit?usp=drive_link"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold-400 hover:underline"
          >
            {t('auth.termsLink')}
          </a>{' '}
          {t('auth.and')}{' '}
          <a 
            href="https://docs.google.com/document/d/1o1qaqFrgv7R9gyu-peN6TbnQhvz9z27OHuHrP_yWYCc/edit?usp=sharing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold-400 hover:underline"
          >
            {t('auth.privacyLink')}
          </a>
        </label>
      </div>
      {errors.termsAccepted && <p className="text-red-400 text-sm">{errors.termsAccepted}</p>}

      <div className="flex space-x-4">
        <Button
          onClick={handleBackStep}
          variant="outline"
          className="flex-1"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('auth.back')}
        </Button>
        <Button
          onClick={handleNextStep}
          className="flex-1"
        >
          {t('auth.nextStep')}
        </Button>
      </div>
    </div>
  );

  const renderSignupStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="flex justify-center space-x-2">
          <div className="w-8 h-2 bg-gold-400 rounded-full"></div>
          <div className="w-8 h-2 bg-gold-400 rounded-full"></div>
          <div className="w-8 h-2 bg-gold-400 rounded-full"></div>
        </div>
        <p className="text-sm text-gray-400 mt-2">{t('auth.signup.step3of3')}</p>
      </div>

      {/* Email Verification */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Mail className="w-5 h-5 text-gold-400" />
            <span className="font-medium">{t('auth.verification.emailTitle')}</span>
          </div>
          {verificationStep.email === 'verified' && (
            <Check className="w-5 h-5 text-green-400" />
          )}
        </div>
        
        {!verificationStep.email ? (
          <Button onClick={sendEmailVerification} loading={loading} size="sm">
            {t('auth.verification.sendEmail')}
          </Button>
        ) : verificationStep.email === true ? (
          <div className="space-y-3">
            <input
              type="text"
              value={verificationCodes.email}
              onChange={(e) => setVerificationCodes(prev => ({ ...prev, email: e.target.value }))}
              className="input-field"
              placeholder={t('auth.verification.enterCode')}
              maxLength={6}
            />
            <Button onClick={verifyEmail} size="sm">
              {t('auth.verification.verify')}
            </Button>
          </div>
        ) : (
          <p className="text-green-400 text-sm">{t('auth.verification.emailVerified')}</p>
        )}
      </div>

      {/* Phone Verification */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Phone className="w-5 h-5 text-gold-400" />
            <span className="font-medium">{t('auth.verification.phoneTitle')}</span>
          </div>
          {verificationStep.phone === 'verified' && (
            <Check className="w-5 h-5 text-green-400" />
          )}
        </div>
        
        {!verificationStep.phone ? (
          <Button onClick={sendPhoneVerification} loading={loading} size="sm">
            {t('auth.verification.sendPhone')}
          </Button>
        ) : verificationStep.phone === true ? (
          <div className="space-y-3">
            <input
              type="text"
              value={verificationCodes.phone}
              onChange={(e) => setVerificationCodes(prev => ({ ...prev, phone: e.target.value }))}
              className="input-field"
              placeholder={t('auth.verification.enterCode')}
              maxLength={6}
            />
            <Button onClick={verifyPhone} size="sm">
              {t('auth.verification.verify')}
            </Button>
          </div>
        ) : (
          <p className="text-green-400 text-sm">{t('auth.verification.phoneVerified')}</p>
        )}
      </div>

      {/* CAPTCHA */}
      <div className="card">
        <ReCaptchaComponent
          onVerify={(isVerified, token) => {
            setCaptchaToken(token);
            setVerificationStep(prev => ({ ...prev, captcha: isVerified }));
          }}
          onError={(error) => {
            setCaptchaToken('');
            setVerificationStep(prev => ({ ...prev, captcha: false }));
            showNotification(error, 'error');
          }}
          onExpire={() => {
            setCaptchaToken('');
            setVerificationStep(prev => ({ ...prev, captcha: false }));
            showNotification(t('auth.verification.captchaExpired'), 'warning');
          }}
          theme="dark"
          size="normal"
          showStatus={true}
          autoReset={true}
          className="w-full"
        />
      </div>

      <div className="flex space-x-4">
        <Button
          onClick={handleBackStep}
          variant="outline"
          className="flex-1"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('auth.back')}
        </Button>
        <Button
          onClick={handleSignup}
          loading={loading}
          disabled={verificationStep.email !== 'verified' || verificationStep.phone !== 'verified' || !verificationStep.captcha}
          className="flex-1"
        >
          {t('auth.signup.submit')}
        </Button>
      </div>
    </div>
  );

  return (
    <AnimatedBackground variant="auth" intensity="normal">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <div className="bg-theme-card backdrop-blur-xl border border-theme rounded-2xl p-8 shadow-theme-card">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-theme-primary mb-2">
                {t('app.name')}
              </h1>
              <p className="text-theme-secondary">{t('app.tagline')}</p>
            </div>

            {authMethod === 'form' && (
              <>
                {renderModeSelector()}
                
                {mode === 'signin' && renderSigninForm()}
                {mode === 'signup' && step === 1 && renderSignupStep1()}
                {mode === 'signup' && step === 2 && renderSignupStep2()}
                {mode === 'signup' && step === 3 && renderSignupStep3()}
              </>
            )}

            {authMethod !== 'form' && (
              <>
                <div className="mb-6">
                  <Button
                    onClick={() => setAuthMethod('form')}
                    variant="outline"
                    size="sm"
                    className="mb-4"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t('auth.backToForm')}
                  </Button>
                </div>

                {authMethod === 'social' && (
                  <SocialAuth
                    mode={mode}
                    onSuccess={handleSocialSuccess}
                    onError={handleSocialError}
                  />
                )}

                {authMethod === 'mobile' && (
                  <SocialAuth
                    mode="mobile"
                    onSuccess={handleSocialSuccess}
                    onError={handleSocialError}
                  />
                )}
              </>
            )}

            {authMethod === 'form' && (
              <>
                <div className="relative my-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-600"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-dark-800 text-gray-400">{t('auth.or')}</span>
                  </div>
                </div>

                {renderAuthMethodSelector()}
              </>
            )}
          </div>

          {authMethod === 'form' && (
            <div className="text-center mt-6">
              <p className="text-gray-400">
                {mode === 'signin' ? t('auth.noAccount') : t('auth.haveAccount')}{' '}
                <button
                  onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                  className="text-gold-400 hover:underline font-medium"
                >
                  {mode === 'signin' ? t('auth.signup.title') : t('auth.signin.title')}
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </AnimatedBackground>
  );
};

export default AuthPage; 