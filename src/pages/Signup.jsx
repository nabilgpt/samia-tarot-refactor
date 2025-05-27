import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Mail, Phone, Calendar, MapPin, User, Lock, Shield, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import Button from '../components/Button';
import { getCountryCodeFromCountry, getZodiacFromDateOfBirth, validateEmail, validatePhone, validatePassword } from '../utils/validation';
import { countries } from '../utils/countries';
import ReCAPTCHA from 'react-google-recaptcha';

const Signup = () => {
  const { t } = useTranslation();
  const { signup } = useAuth();
  const { showNotification } = useUI();
  const navigate = useNavigate();

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
    termsAccepted: false
  });

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // Multi-step form
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

  const validateStep1 = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) newErrors.firstName = t('signup.errors.firstNameRequired');
    if (!formData.lastName.trim()) newErrors.lastName = t('signup.errors.lastNameRequired');
    if (!formData.email.trim()) {
      newErrors.email = t('signup.errors.emailRequired');
    } else if (!validateEmail(formData.email)) {
      newErrors.email = t('signup.errors.emailInvalid');
    }
    if (!formData.phone.trim()) {
      newErrors.phone = t('signup.errors.phoneRequired');
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = t('signup.errors.phoneInvalid');
    }
    if (!formData.country) newErrors.country = t('signup.errors.countryRequired');
    if (!formData.dateOfBirth) newErrors.dateOfBirth = t('signup.errors.dobRequired');

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};

    if (!formData.password) {
      newErrors.password = t('signup.errors.passwordRequired');
    } else if (!validatePassword(formData.password)) {
      newErrors.password = t('signup.errors.passwordWeak');
    }
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t('signup.errors.confirmPasswordRequired');
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('signup.errors.passwordMismatch');
    }
    if (!formData.termsAccepted) {
      newErrors.termsAccepted = t('signup.errors.termsRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const sendEmailVerification = async () => {
    try {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      showNotification(t('signup.verification.emailSent'), 'success');
      setVerificationStep(prev => ({ ...prev, email: true }));
    } catch (error) {
      showNotification(t('signup.verification.emailError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const sendPhoneVerification = async () => {
    try {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      showNotification(t('signup.verification.phoneSent'), 'success');
      setVerificationStep(prev => ({ ...prev, phone: true }));
    } catch (error) {
      showNotification(t('signup.verification.phoneError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const verifyEmail = async () => {
    if (verificationCodes.email === '123456') { // Mock verification
      setVerificationStep(prev => ({ ...prev, email: 'verified' }));
      showNotification(t('signup.verification.emailVerified'), 'success');
    } else {
      showNotification(t('signup.verification.invalidCode'), 'error');
    }
  };

  const verifyPhone = async () => {
    if (verificationCodes.phone === '123456') { // Mock verification
      setVerificationStep(prev => ({ ...prev, phone: 'verified' }));
      showNotification(t('signup.verification.phoneVerified'), 'success');
    } else {
      showNotification(t('signup.verification.invalidCode'), 'error');
    }
  };

  const handleCaptcha = (token) => {
    setCaptchaToken(token);
    setVerificationStep(prev => ({ ...prev, captcha: true }));
  };

  const handleNextStep = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!verificationStep.email === 'verified' || !verificationStep.phone === 'verified' || !verificationStep.captcha) {
      showNotification(t('signup.errors.verificationIncomplete'), 'error');
      return;
    }

    try {
      setLoading(true);
      await signup(formData);
      showNotification(t('signup.success'), 'success');
      navigate('/profile');
    } catch (error) {
      showNotification(error.message || t('signup.errors.general'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold gradient-text mb-2">{t('signup.title')}</h2>
        <p className="text-gray-400">{t('signup.subtitle')}</p>
        <div className="flex justify-center mt-4">
          <div className="flex space-x-2">
            <div className="w-8 h-2 bg-gold-400 rounded-full"></div>
            <div className="w-8 h-2 bg-gray-600 rounded-full"></div>
            <div className="w-8 h-2 bg-gray-600 rounded-full"></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gold-400 mb-2">
            <User className="inline w-4 h-4 mr-2" />
            {t('signup.firstName')} *
          </label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleInputChange}
            className="input-field"
            placeholder={t('signup.placeholders.firstName')}
            autoFocus
          />
          {errors.firstName && <p className="text-red-400 text-sm mt-1">{errors.firstName}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gold-400 mb-2">
            <User className="inline w-4 h-4 mr-2" />
            {t('signup.lastName')} *
          </label>
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleInputChange}
            className="input-field"
            placeholder={t('signup.placeholders.lastName')}
          />
          {errors.lastName && <p className="text-red-400 text-sm mt-1">{errors.lastName}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gold-400 mb-2">
          <Mail className="inline w-4 h-4 mr-2" />
          {t('signup.email')} *
        </label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          className="input-field"
          placeholder={t('signup.placeholders.email')}
        />
        {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gold-400 mb-2">
          <MapPin className="inline w-4 h-4 mr-2" />
          {t('signup.country')} *
        </label>
        <select
          name="country"
          value={formData.country}
          onChange={handleInputChange}
          className="input-field"
        >
          <option value="">{t('signup.placeholders.country')}</option>
          {countries.map(country => (
            <option key={country.code} value={country.name}>
              {country.flag} {country.name}
            </option>
          ))}
        </select>
        {errors.country && <p className="text-red-400 text-sm mt-1">{errors.country}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gold-400 mb-2">
            {t('signup.countryCode')}
          </label>
          <input
            type="text"
            name="countryCode"
            value={formData.countryCode}
            className="input-field bg-gray-700 cursor-not-allowed"
            readOnly
            placeholder="+961"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gold-400 mb-2">
            <Phone className="inline w-4 h-4 mr-2" />
            {t('signup.phone')} *
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            className="input-field"
            placeholder={t('signup.placeholders.phone')}
          />
          {errors.phone && <p className="text-red-400 text-sm mt-1">{errors.phone}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gold-400 mb-2">
            <Calendar className="inline w-4 h-4 mr-2" />
            {t('signup.dateOfBirth')} *
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
            ✨ {t('signup.zodiac')}
          </label>
          <input
            type="text"
            name="zodiac"
            value={formData.zodiac}
            className="input-field bg-gray-700 cursor-not-allowed"
            readOnly
            placeholder={t('signup.placeholders.zodiac')}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gold-400 mb-2">
          {t('signup.gender')} ({t('signup.optional')})
        </label>
        <select
          name="gender"
          value={formData.gender}
          onChange={handleInputChange}
          className="input-field"
        >
          <option value="">{t('signup.placeholders.gender')}</option>
          <option value="male">{t('signup.genders.male')}</option>
          <option value="female">{t('signup.genders.female')}</option>
          <option value="prefer-not-to-say">{t('signup.genders.preferNotToSay')}</option>
        </select>
      </div>

      <Button
        onClick={handleNextStep}
        className="w-full"
        size="lg"
      >
        {t('signup.nextStep')}
      </Button>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold gradient-text mb-2">{t('signup.security.title')}</h2>
        <p className="text-gray-400">{t('signup.security.subtitle')}</p>
        <div className="flex justify-center mt-4">
          <div className="flex space-x-2">
            <div className="w-8 h-2 bg-gold-400 rounded-full"></div>
            <div className="w-8 h-2 bg-gold-400 rounded-full"></div>
            <div className="w-8 h-2 bg-gray-600 rounded-full"></div>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gold-400 mb-2">
          <Lock className="inline w-4 h-4 mr-2" />
          {t('signup.password')} *
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            className="input-field pr-12"
            placeholder={t('signup.placeholders.password')}
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
          {t('signup.passwordRequirements')}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gold-400 mb-2">
          <Lock className="inline w-4 h-4 mr-2" />
          {t('signup.confirmPassword')} *
        </label>
        <div className="relative">
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            className="input-field pr-12"
            placeholder={t('signup.placeholders.confirmPassword')}
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
          {t('signup.termsText')}{' '}
          <Link to="/terms" className="text-gold-400 hover:underline">
            {t('signup.termsLink')}
          </Link>{' '}
          {t('signup.and')}{' '}
          <Link to="/privacy" className="text-gold-400 hover:underline">
            {t('signup.privacyLink')}
          </Link>
        </label>
      </div>
      {errors.termsAccepted && <p className="text-red-400 text-sm">{errors.termsAccepted}</p>}

      <div className="flex space-x-4">
        <Button
          onClick={() => setStep(1)}
          variant="secondary"
          className="flex-1"
        >
          {t('signup.back')}
        </Button>
        <Button
          onClick={handleNextStep}
          className="flex-1"
        >
          {t('signup.nextStep')}
        </Button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold gradient-text mb-2">{t('signup.verification.title')}</h2>
        <p className="text-gray-400">{t('signup.verification.subtitle')}</p>
        <div className="flex justify-center mt-4">
          <div className="flex space-x-2">
            <div className="w-8 h-2 bg-gold-400 rounded-full"></div>
            <div className="w-8 h-2 bg-gold-400 rounded-full"></div>
            <div className="w-8 h-2 bg-gold-400 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Email Verification */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Mail className="w-5 h-5 text-gold-400" />
            <span className="font-medium">{t('signup.verification.emailTitle')}</span>
          </div>
          {verificationStep.email === 'verified' && (
            <Check className="w-5 h-5 text-green-400" />
          )}
        </div>
        
        {!verificationStep.email ? (
          <Button onClick={sendEmailVerification} loading={loading} size="sm">
            {t('signup.verification.sendEmail')}
          </Button>
        ) : verificationStep.email === true ? (
          <div className="space-y-3">
            <input
              type="text"
              value={verificationCodes.email}
              onChange={(e) => setVerificationCodes(prev => ({ ...prev, email: e.target.value }))}
              className="input-field"
              placeholder={t('signup.verification.enterCode')}
              maxLength={6}
            />
            <Button onClick={verifyEmail} size="sm">
              {t('signup.verification.verify')}
            </Button>
          </div>
        ) : (
          <p className="text-green-400 text-sm">{t('signup.verification.emailVerified')}</p>
        )}
      </div>

      {/* Phone Verification */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Phone className="w-5 h-5 text-gold-400" />
            <span className="font-medium">{t('signup.verification.phoneTitle')}</span>
          </div>
          {verificationStep.phone === 'verified' && (
            <Check className="w-5 h-5 text-green-400" />
          )}
        </div>
        
        {!verificationStep.phone ? (
          <Button onClick={sendPhoneVerification} loading={loading} size="sm">
            {t('signup.verification.sendPhone')}
          </Button>
        ) : verificationStep.phone === true ? (
          <div className="space-y-3">
            <input
              type="text"
              value={verificationCodes.phone}
              onChange={(e) => setVerificationCodes(prev => ({ ...prev, phone: e.target.value }))}
              className="input-field"
              placeholder={t('signup.verification.enterCode')}
              maxLength={6}
            />
            <Button onClick={verifyPhone} size="sm">
              {t('signup.verification.verify')}
            </Button>
          </div>
        ) : (
          <p className="text-green-400 text-sm">{t('signup.verification.phoneVerified')}</p>
        )}
      </div>

      {/* CAPTCHA */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Shield className="w-5 h-5 text-gold-400" />
            <span className="font-medium">{t('signup.verification.captchaTitle')}</span>
          </div>
          {verificationStep.captcha && (
            <Check className="w-5 h-5 text-green-400" />
          )}
        </div>
        
        {!verificationStep.captcha ? (
          <div className="bg-gray-700 p-4 rounded-lg border-2 border-dashed border-gray-600">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">{t('signup.verification.captchaText')}</span>
              <Button onClick={() => handleCaptcha('mock-token')} size="sm">
                {t('signup.verification.verifyCaptcha')}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-green-400 text-sm">{t('signup.verification.captchaVerified')}</p>
        )}
      </div>

      <div className="flex space-x-4">
        <Button
          onClick={() => setStep(2)}
          variant="secondary"
          className="flex-1"
        >
          {t('signup.back')}
        </Button>
        <Button
          onClick={handleSubmit}
          loading={loading}
          disabled={!verificationStep.email === 'verified' || !verificationStep.phone === 'verified' || !verificationStep.captcha}
          className="flex-1"
        >
          {t('signup.createAccount')}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-cosmic-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <form onSubmit={handleSubmit} className="card-glow">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </form>

        <div className="text-center mt-6">
          <p className="text-gray-400">
            {t('signup.alreadyHaveAccount')}{' '}
            <Link to="/login" className="text-gold-400 hover:underline font-medium">
              {t('signup.loginLink')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup; 