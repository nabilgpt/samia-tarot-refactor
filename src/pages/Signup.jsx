import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import Particles from 'react-tsparticles';
import { loadSlim } from 'tsparticles-slim';
import { Eye, EyeOff, Mail, Phone, Calendar, MapPin, User, Lock, Shield, Check, Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import Button from '../components/Button';
import AnimatedBackground from '../components/UI/AnimatedBackground';
import { getCountryCodeFromCountry, getZodiacFromDateOfBirth, validateEmail, validatePhone, validatePassword } from '../utils/validation';
import { countries } from '../utils/countries';

const Signup = () => {
  const { t, i18n } = useTranslation();
  const { signup } = useAuth();
  const { showNotification, language } = useUI();
  const navigate = useNavigate();
  const dateInputRef = useRef(null);

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
    maritalStatus: '',
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
    phone: false
  });
  const [verificationCodes, setVerificationCodes] = useState({
    email: '',
    phone: ''
  });
  const [countrySearch, setCountrySearch] = useState('');
  const [lastKeyTime, setLastKeyTime] = useState(0);
  const [lastKey, setLastKey] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Particle configuration for cosmic background
  const particlesInit = useCallback(async engine => {
    await loadSlim(engine);
  }, []);

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

  const handleCountryKeyDown = (e) => {
    const currentTime = Date.now();
    const timeDiff = currentTime - lastKeyTime;
    const currentKey = e.key.toLowerCase();
    
    // Only handle letter keys
    if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
      e.preventDefault();
      
      // If more than 1 second has passed, reset everything
      if (timeDiff > 1000) {
        setCountrySearch('');
        setCurrentMatchIndex(0);
        setLastKey('');
      }
      
      let newSearch;
      let matchIndex = 0;
      
      // Check if it's the same key pressed again within 1 second
      if (currentKey === lastKey && timeDiff <= 1000) {
        // Same key pressed again - cycle through countries starting with this letter
        newSearch = currentKey;
        matchIndex = currentMatchIndex + 1;
      } else if (timeDiff <= 1000 && countrySearch) {
        // Different key pressed within 1 second - build progressive search
        newSearch = countrySearch + currentKey;
        matchIndex = 0;
      } else {
        // First key or after timeout - start new search
        newSearch = currentKey;
        matchIndex = 0;
      }
      
      // Find all countries that start with the search string
      const matchingCountries = countries.filter(country => 
        country.name.toLowerCase().startsWith(newSearch)
      );
      
      if (matchingCountries.length > 0) {
        // Cycle through matches if we've reached the end
        const actualIndex = matchIndex % matchingCountries.length;
        const selectedCountry = matchingCountries[actualIndex];
        
        setFormData(prev => ({ ...prev, country: selectedCountry.name }));
        setCountrySearch(newSearch);
        setCurrentMatchIndex(actualIndex);
        setLastKey(currentKey);
        setLastKeyTime(currentTime);
        
        // Clear any existing error
        if (errors.country) {
          setErrors(prev => ({ ...prev, country: '' }));
        }
      } else {
        // No matches found, reset to single character search
        const singleCharMatches = countries.filter(country => 
          country.name.toLowerCase().startsWith(currentKey)
        );
        
        if (singleCharMatches.length > 0) {
          setFormData(prev => ({ ...prev, country: singleCharMatches[0].name }));
          setCountrySearch(currentKey);
          setCurrentMatchIndex(0);
          setLastKey(currentKey);
          setLastKeyTime(currentTime);
          
          if (errors.country) {
            setErrors(prev => ({ ...prev, country: '' }));
          }
        }
      }
    }
  };

  const validateStep1 = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) newErrors.firstName = language === 'ar' ? 'الاسم الأول مطلوب' : 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = language === 'ar' ? 'اسم العائلة مطلوب' : 'Last name is required';
    if (!formData.email.trim()) {
      newErrors.email = language === 'ar' ? 'البريد الإلكتروني مطلوب' : 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = language === 'ar' ? 'البريد الإلكتروني غير صحيح' : 'Invalid email format';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = language === 'ar' ? 'رقم الهاتف مطلوب' : 'Phone number is required';
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = language === 'ar' ? 'رقم الهاتف غير صحيح' : 'Invalid phone number';
    }
    if (!formData.country) newErrors.country = language === 'ar' ? 'البلد مطلوب' : 'Country is required';
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = language === 'ar' ? 'تاريخ الميلاد مطلوب' : 'Date of birth is required';
    } else {
      // Check if user is at least 18 years old
      const birthDate = new Date(formData.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      // Adjust age if birthday hasn't occurred this year
      const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) 
        ? age - 1 
        : age;
      
      if (actualAge < 18) {
        newErrors.dateOfBirth = language === 'ar' 
          ? 'يجب أن تكون 18 سنة أو أكثر لاستخدام هذا التطبيق' 
          : 'You must be 18 years or older to use this app';
      }
    }
    if (!formData.gender) newErrors.gender = language === 'ar' ? 'الجنس مطلوب' : 'Gender is required';
    if (!formData.maritalStatus) newErrors.maritalStatus = language === 'ar' ? 'الوضع العائلي مطلوب' : 'Marital status is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};

    if (!formData.password) {
      newErrors.password = language === 'ar' ? 'كلمة المرور مطلوبة' : 'Password is required';
    } else if (!validatePassword(formData.password)) {
      newErrors.password = language === 'ar' 
        ? 'كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل، حرف كبير، حرف صغير، رقم ورمز خاص'
        : 'Password must contain at least 8 characters, one uppercase, one lowercase, one number and one special character';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = language === 'ar' ? 'تأكيد كلمة المرور مطلوب' : 'Password confirmation is required';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = language === 'ar' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match';
    }

    if (!formData.termsAccepted) {
      newErrors.termsAccepted = language === 'ar' ? 'يجب الموافقة على الشروط والأحكام' : 'You must accept the terms and conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const sendEmailVerification = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would call your email service
      await new Promise(resolve => setTimeout(resolve, 2000));
      setVerificationStep(prev => ({ ...prev, email: 'sent' }));
      showNotification(
        language === 'ar' ? 'تم إرسال رمز التحقق إلى بريدك الإلكتروني' : 'Verification code sent to your email',
        'success'
      );
    } catch (error) {
      showNotification(
        language === 'ar' ? 'فشل في إرسال رمز التحقق' : 'Failed to send verification code',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const sendPhoneVerification = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would call your SMS service
      await new Promise(resolve => setTimeout(resolve, 2000));
      setVerificationStep(prev => ({ ...prev, phone: 'sent' }));
      showNotification(
        language === 'ar' ? 'تم إرسال رمز التحقق إلى هاتفك' : 'Verification code sent to your phone',
        'success'
      );
    } catch (error) {
      showNotification(
        language === 'ar' ? 'فشل في إرسال رمز التحقق' : 'Failed to send verification code',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const verifyEmail = async () => {
    if (verificationCodes.email === '123456') {
      setVerificationStep(prev => ({ ...prev, email: 'verified' }));
      showNotification(
        language === 'ar' ? 'تم التحقق من البريد الإلكتروني بنجاح' : 'Email verified successfully',
        'success'
      );
    } else {
      showNotification(
        language === 'ar' ? 'رمز التحقق غير صحيح' : 'Invalid verification code',
        'error'
      );
    }
  };

  const verifyPhone = async () => {
    if (verificationCodes.phone === '123456') {
      setVerificationStep(prev => ({ ...prev, phone: 'verified' }));
      showNotification(
        language === 'ar' ? 'تم التحقق من رقم الهاتف بنجاح' : 'Phone verified successfully',
        'success'
      );
    } else {
      showNotification(
        language === 'ar' ? 'رمز التحقق غير صحيح' : 'Invalid verification code',
        'error'
      );
    }
  };

  const handleNextStep = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (step === 3) {
      if (verificationStep.email !== 'verified' || verificationStep.phone !== 'verified') {
        showNotification(
          language === 'ar' ? 'يجب التحقق من البريد الإلكتروني ورقم الهاتف أولاً' : 'Please verify email and phone first',
          'error'
        );
        return;
      }

      setLoading(true);
      try {
        const result = await signup(formData);
        if (result.success) {
          showNotification(
            language === 'ar' ? 'تم إنشاء الحساب بنجاح' : 'Account created successfully',
            'success'
          );
          navigate('/dashboard');
        } else {
          showNotification(result.error || (language === 'ar' ? 'فشل في إنشاء الحساب' : 'Account creation failed'), 'error');
        }
      } catch (error) {
        showNotification(
          language === 'ar' ? 'حدث خطأ أثناء إنشاء الحساب' : 'An error occurred during account creation',
          'error'
        );
      } finally {
        setLoading(false);
      }
    } else {
      handleNextStep();
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold gradient-text mb-2">
          {language === 'ar' ? 'إنشاء حساب جديد' : 'Create Your Account'}
        </h2>
        <p className="text-gray-400">
          {language === 'ar' ? 'ابدأ رحلتك الروحية معنا' : 'Begin your spiritual journey with us'}
        </p>
        
        {/* Age Restriction Notice */}
        <div className="mt-4 p-3 bg-amber-900/20 border border-amber-400/30 rounded-lg">
          <p className="text-sm text-amber-400 flex items-center justify-center gap-2">
            <span className="text-lg">🔞</span>
            {language === 'ar' ? 'هذا التطبيق للبالغين فقط (18+ سنة)' : 'This app is for adults only (18+ years)'}
          </p>
        </div>
        
        <div className="flex justify-center mt-4">
          <div className="flex space-x-2">
            <div className="w-8 h-2 bg-gold-400 rounded-full"></div>
            <div className="w-8 h-2 bg-gray-600 rounded-full"></div>
            <div className="w-8 h-2 bg-gray-600 rounded-full"></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            <User className="inline w-4 h-4 mr-2" />
            {language === 'ar' ? 'الاسم الأول' : 'First Name'} *
          </label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleInputChange}
            className={`
              w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg
              text-white placeholder-gray-400
              focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400
              transition-all duration-300 hover:border-white/30
              ${language === 'ar' ? 'text-right' : 'text-left'}
              ${errors.firstName ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}
            `}
            placeholder={language === 'ar' ? 'الاسم الأول' : 'Enter first name'}
            dir={language === 'ar' ? 'rtl' : 'ltr'}
            autoFocus
          />
          {errors.firstName && (
            <p className="text-sm text-red-400 flex items-center gap-1">
              <span className="w-1 h-1 bg-red-400 rounded-full"></span>
              {errors.firstName}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            <User className="inline w-4 h-4 mr-2" />
            {language === 'ar' ? 'اسم العائلة' : 'Last Name'} *
          </label>
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleInputChange}
            className={`
              w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg
              text-white placeholder-gray-400
              focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400
              transition-all duration-300 hover:border-white/30
              ${language === 'ar' ? 'text-right' : 'text-left'}
              ${errors.lastName ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}
            `}
            placeholder={language === 'ar' ? 'اسم العائلة' : 'Enter last name'}
            dir={language === 'ar' ? 'rtl' : 'ltr'}
          />
          {errors.lastName && (
            <p className="text-sm text-red-400 flex items-center gap-1">
              <span className="w-1 h-1 bg-red-400 rounded-full"></span>
              {errors.lastName}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          <Mail className="inline w-4 h-4 mr-2" />
          {language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'} *
        </label>
        <div className="relative">
          <div className={`absolute inset-y-0 flex items-center pointer-events-none z-10 ${
            language === 'ar' ? 'right-0 pr-3' : 'left-0 pl-3'
          }`}>
            <Mail className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className={`
              w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg
              text-white placeholder-gray-400
              focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400
              transition-all duration-300 hover:border-white/30
              ${language === 'ar' ? 'pr-10 text-right' : 'pl-10 text-left'}
              ${errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}
            `}
            placeholder={language === 'ar' ? 'البريد الإلكتروني' : 'Enter your email'}
            dir={language === 'ar' ? 'rtl' : 'ltr'}
          />
        </div>
        {errors.email && (
          <p className="text-sm text-red-400 flex items-center gap-1">
            <span className="w-1 h-1 bg-red-400 rounded-full"></span>
            {errors.email}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          <MapPin className="inline w-4 h-4 mr-2" />
          {language === 'ar' ? 'البلد' : 'Country'} *
        </label>
        <select
          name="country"
          value={formData.country}
          onChange={handleInputChange}
          onKeyDown={handleCountryKeyDown}
          className={`
            w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg
            text-white
            focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400
            transition-all duration-300 hover:border-white/30
            ${language === 'ar' ? 'text-right' : 'text-left'}
            ${errors.country ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}
          `}
          dir={language === 'ar' ? 'rtl' : 'ltr'}
        >
          <option value="">{language === 'ar' ? 'اختر البلد' : 'Select country'}</option>
          {countries.map(country => (
            <option key={country.code} value={country.name}>
              {country.flag} {country.name}
            </option>
          ))}
        </select>
        {errors.country && (
          <p className="text-sm text-red-400 flex items-center gap-1">
            <span className="w-1 h-1 bg-red-400 rounded-full"></span>
            {errors.country}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            {language === 'ar' ? 'رمز البلد' : 'Country Code'}
          </label>
          <input
            type="text"
            name="countryCode"
            value={formData.countryCode}
            className="w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg text-gray-400 cursor-not-allowed text-center font-mono"
            readOnly
            placeholder="+961"
          />
        </div>

        <div className="md:col-span-2 space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            <Phone className="inline w-4 h-4 mr-2" />
            {language === 'ar' ? 'رقم الهاتف' : 'Phone Number'} *
          </label>
          <div className="relative">
            <div className={`absolute inset-y-0 flex items-center pointer-events-none z-10 ${
              language === 'ar' ? 'right-0 pr-3' : 'left-0 pl-3'
            }`}>
              <Phone className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className={`
                w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg
                text-white placeholder-gray-400
                focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400
                transition-all duration-300 hover:border-white/30
                ${language === 'ar' ? 'pr-10 text-right' : 'pl-10 text-left'}
                ${errors.phone ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}
              `}
              placeholder={language === 'ar' ? 'رقم الهاتف' : 'Enter phone number'}
              dir={language === 'ar' ? 'rtl' : 'ltr'}
            />
          </div>
          {errors.phone && (
            <p className="text-sm text-red-400 flex items-center gap-1">
              <span className="w-1 h-1 bg-red-400 rounded-full"></span>
              {errors.phone}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            <Calendar className="inline w-4 h-4 mr-2" />
            {language === 'ar' ? 'تاريخ الميلاد' : 'Date of Birth'} *
          </label>
          <div className="relative">
            <div className={`absolute inset-y-0 flex items-center z-10 ${
              language === 'ar' ? 'right-0 pr-3' : 'left-0 pl-3'
            }`}>
              <button
                type="button"
                onClick={() => dateInputRef.current?.showPicker?.() || dateInputRef.current?.focus()}
                className="p-1 hover:bg-gold-400/10 rounded transition-colors"
              >
                <Calendar className="h-5 w-5 text-gray-400 hover:text-gold-400 transition-colors" />
              </button>
            </div>
            <input
              type="date"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleInputChange}
              className={`
                w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg
                text-white
                focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400
                transition-all duration-300 hover:border-white/30
                ${language === 'ar' ? 'pr-12 text-right' : 'pl-12 text-left'}
                ${errors.dateOfBirth ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}
              `}
              max={(() => {
                const eighteenYearsAgo = new Date();
                eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
                return eighteenYearsAgo.toISOString().split('T')[0];
              })()}
              dir={language === 'ar' ? 'rtl' : 'ltr'}
              ref={dateInputRef}
            />
          </div>
          {errors.dateOfBirth && (
            <p className="text-sm text-red-400 flex items-center gap-1">
              <span className="w-1 h-1 bg-red-400 rounded-full"></span>
              {errors.dateOfBirth}
            </p>
          )}
          <p className="text-xs text-amber-400 flex items-center gap-1">
            <span className="w-1 h-1 bg-amber-400 rounded-full"></span>
            {language === 'ar' ? 'يجب أن تكون 18 سنة أو أكثر للتسجيل' : 'You must be 18+ years old to register'}
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            ✨ {language === 'ar' ? 'البرج الفلكي' : 'Zodiac Sign'}
          </label>
          <input
            type="text"
            name="zodiac"
            value={formData.zodiac}
            className="w-full px-4 py-3 bg-cosmic-500/20 border border-cosmic-400/30 rounded-lg text-cosmic-300 cursor-not-allowed text-center font-medium backdrop-blur-sm"
            readOnly
            placeholder={language === 'ar' ? 'سيتم تحديده تلقائياً' : 'Auto-calculated'}
          />
          <p className="text-xs text-gray-500">
            {language === 'ar' ? 'يتم تحديد البرج تلقائياً حسب تاريخ الميلاد' : 'Auto-calculated based on birth date'}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          💍 {language === 'ar' ? 'الوضع العائلي' : 'Marital Status'} *
        </label>
        <select
          name="maritalStatus"
          value={formData.maritalStatus}
          onChange={handleInputChange}
          className={`
            w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg
            text-white
            focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400
            transition-all duration-300 hover:border-white/30
            ${language === 'ar' ? 'text-right' : 'text-left'}
            ${errors.maritalStatus ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}
          `}
          dir={language === 'ar' ? 'rtl' : 'ltr'}
        >
          <option value="">{language === 'ar' ? 'اختر الوضع العائلي' : 'Select marital status'}</option>
          <option value="single">{language === 'ar' ? 'أعزب/عزباء' : 'Single'}</option>
          <option value="married">{language === 'ar' ? 'متزوج/متزوجة' : 'Married'}</option>
          <option value="engaged">{language === 'ar' ? 'مخطوب/مخطوبة' : 'Engaged'}</option>
          <option value="relationship">{language === 'ar' ? 'في علاقة' : 'In a Relationship'}</option>
          <option value="complicated">{language === 'ar' ? 'الأمر معقد' : "It's Complicated"}</option>
        </select>
        {errors.maritalStatus && (
          <p className="text-sm text-red-400 flex items-center gap-1">
            <span className="w-1 h-1 bg-red-400 rounded-full"></span>
            {errors.maritalStatus}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          {language === 'ar' ? 'الجنس' : 'Gender'} *
        </label>
        <select
          name="gender"
          value={formData.gender}
          onChange={handleInputChange}
          className={`
            w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg
            text-white
            focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400
            transition-all duration-300 hover:border-white/30
            ${language === 'ar' ? 'text-right' : 'text-left'}
            ${errors.gender ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}
          `}
          dir={language === 'ar' ? 'rtl' : 'ltr'}
        >
          <option value="">{language === 'ar' ? 'اختر الجنس' : 'Select gender'}</option>
          <option value="male">{language === 'ar' ? 'ذكر' : 'Male'}</option>
          <option value="female">{language === 'ar' ? 'أنثى' : 'Female'}</option>
          <option value="other">{language === 'ar' ? 'آخر' : 'Other'}</option>
        </select>
        {errors.gender && (
          <p className="text-sm text-red-400 flex items-center gap-1">
            <span className="w-1 h-1 bg-red-400 rounded-full"></span>
            {errors.gender}
          </p>
        )}
      </div>

      <Button
        onClick={handleNextStep}
        className="w-full bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-gray-900 font-bold py-3 px-6 rounded-lg shadow-2xl shadow-gold-500/50 transition-all duration-300 transform hover:scale-105"
        size="lg"
      >
        <div className="flex items-center justify-center gap-2">
          <span>{language === 'ar' ? 'الخطوة التالية' : 'Next Step'}</span>
          <ArrowRight className={`w-4 h-4 ${language === 'ar' ? 'rotate-180' : ''}`} />
        </div>
      </Button>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold gradient-text mb-2">
          {language === 'ar' ? 'الأمان وكلمة المرور' : 'Security & Password'}
        </h2>
        <p className="text-gray-400">
          {language === 'ar' ? 'قم بإنشاء كلمة مرور قوية لحماية حسابك' : 'Create a strong password to secure your account'}
        </p>
        <div className="flex justify-center mt-4">
          <div className="flex space-x-2">
            <div className="w-8 h-2 bg-gold-400 rounded-full"></div>
            <div className="w-8 h-2 bg-gold-400 rounded-full"></div>
            <div className="w-8 h-2 bg-gray-600 rounded-full"></div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          <Lock className="inline w-4 h-4 mr-2" />
          {language === 'ar' ? 'كلمة المرور' : 'Password'} *
        </label>
        <div className="relative">
          <div className={`absolute inset-y-0 flex items-center pointer-events-none z-10 ${
            language === 'ar' ? 'right-0 pr-3' : 'left-0 pl-3'
          }`}>
            <Lock className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            className={`
              w-full px-4 py-3 bg-dark-700/50 border border-gold-400/30 rounded-lg
              text-white placeholder-gray-400
              focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400
              transition-all duration-200
              ${language === 'ar' ? 'pr-10 pl-10 text-right' : 'pl-10 pr-10 text-left'}
              ${errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}
            `}
            placeholder={language === 'ar' ? 'كلمة المرور' : 'Enter your password'}
            dir={language === 'ar' ? 'rtl' : 'ltr'}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className={`absolute inset-y-0 flex items-center z-10 ${
              language === 'ar' ? 'left-0 pl-3' : 'right-0 pr-3'
            }`}
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-300 transition-colors" />
            ) : (
              <Eye className="h-5 w-5 text-gray-400 hover:text-gray-300 transition-colors" />
            )}
          </button>
        </div>
        {errors.password && (
          <p className="text-sm text-red-400 flex items-center gap-1">
            <span className="w-1 h-1 bg-red-400 rounded-full"></span>
            {errors.password}
          </p>
        )}
        <div className="mt-2 text-xs text-gray-500 bg-dark-700/30 p-3 rounded-lg border border-gray-600/20">
          <p className="font-medium text-gray-400 mb-1">
            {language === 'ar' ? 'متطلبات كلمة المرور:' : 'Password requirements:'}
          </p>
          <ul className="space-y-1">
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
              {language === 'ar' ? 'على الأقل 8 أحرف' : 'At least 8 characters'}
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
              {language === 'ar' ? 'حرف كبير واحد على الأقل' : 'At least one uppercase letter'}
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
              {language === 'ar' ? 'رقم واحد على الأقل' : 'At least one number'}
            </li>
          </ul>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          <Lock className="inline w-4 h-4 mr-2" />
          {language === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'} *
        </label>
        <div className="relative">
          <div className={`absolute inset-y-0 flex items-center pointer-events-none z-10 ${
            language === 'ar' ? 'right-0 pr-3' : 'left-0 pl-3'
          }`}>
            <Lock className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            className={`
              w-full px-4 py-3 bg-dark-700/50 border border-gold-400/30 rounded-lg
              text-white placeholder-gray-400
              focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400
              transition-all duration-200
              ${language === 'ar' ? 'pr-10 pl-10 text-right' : 'pl-10 pr-10 text-left'}
              ${errors.confirmPassword ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}
            `}
            placeholder={language === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm your password'}
            dir={language === 'ar' ? 'rtl' : 'ltr'}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className={`absolute inset-y-0 flex items-center z-10 ${
              language === 'ar' ? 'left-0 pl-3' : 'right-0 pr-3'
            }`}
          >
            {showConfirmPassword ? (
              <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-300 transition-colors" />
            ) : (
              <Eye className="h-5 w-5 text-gray-400 hover:text-gray-300 transition-colors" />
            )}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="text-sm text-red-400 flex items-center gap-1">
            <span className="w-1 h-1 bg-red-400 rounded-full"></span>
            {errors.confirmPassword}
          </p>
        )}
      </div>

      <div className="bg-dark-700/30 p-4 rounded-lg border border-gold-400/20">
        <div className={`flex items-start gap-3 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
          <input
            type="checkbox"
            name="termsAccepted"
            checked={formData.termsAccepted}
            onChange={handleInputChange}
            className="mt-1 w-4 h-4 text-gold-400 bg-dark-700 border-gold-400/50 rounded focus:ring-gold-400/20 focus:ring-2"
          />
          <label className={`text-sm text-gray-300 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
            {language === 'ar' ? 'أوافق على ' : 'I agree to the '}{' '}
            <a 
              href="https://docs.google.com/document/d/1gGDfqW5WbaqAv0FXd6pxMi1XbUUHe1WlvkIeliebVMw/edit?usp=drive_link" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gold-400 hover:text-gold-300 underline transition-colors"
            >
              {language === 'ar' ? 'الشروط والأحكام' : 'Terms & Conditions'}
            </a>{' '}
            {language === 'ar' ? ' و ' : ' and '}{' '}
            <a 
              href="https://docs.google.com/document/d/1o1qaqFrgv7R9gyu-peN6TbnQhvz9z27OHuHrP_yWYCc/edit?usp=sharing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gold-400 hover:text-gold-300 underline transition-colors"
            >
              {language === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
            </a>
          </label>
        </div>
        {errors.termsAccepted && (
          <p className="text-sm text-red-400 flex items-center gap-1 mt-2">
            <span className="w-1 h-1 bg-red-400 rounded-full"></span>
            {errors.termsAccepted}
          </p>
        )}
      </div>

      <div className="flex gap-4">
        <Button
          onClick={handlePrevStep}
          variant="outline"
          className="flex-1 border-gold-400/30 text-gold-400 hover:bg-gold-400/10"
          size="lg"
        >
          <div className="flex items-center justify-center gap-2">
            <ArrowLeft className={`w-4 h-4 ${language === 'ar' ? 'rotate-180' : ''}`} />
            <span>{language === 'ar' ? 'السابق' : 'Previous'}</span>
          </div>
        </Button>
        <Button
          onClick={handleNextStep}
          className="flex-1 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-dark-900 font-bold shadow-lg shadow-gold-500/30 transition-all duration-200 transform hover:scale-105"
          size="lg"
        >
          <div className="flex items-center justify-center gap-2">
            <span>{language === 'ar' ? 'التحقق' : 'Verify'}</span>
            <ArrowRight className={`w-4 h-4 ${language === 'ar' ? 'rotate-180' : ''}`} />
          </div>
        </Button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold gradient-text mb-2">
          {language === 'ar' ? 'التحقق من الهوية' : 'Identity Verification'}
        </h2>
        <p className="text-gray-400">
          {language === 'ar' ? 'تحقق من بريدك الإلكتروني ورقم هاتفك لإكمال التسجيل' : 'Verify your email and phone to complete registration'}
        </p>
        <div className="flex justify-center mt-4">
          <div className="flex space-x-2">
            <div className="w-8 h-2 bg-gold-400 rounded-full"></div>
            <div className="w-8 h-2 bg-gold-400 rounded-full"></div>
            <div className="w-8 h-2 bg-gold-400 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Email Verification */}
      <div className="bg-dark-700/30 p-6 rounded-lg border border-gold-400/20 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gold-500/20 rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-gold-400" />
            </div>
            <div>
              <h3 className="font-medium text-white">
                {language === 'ar' ? 'تحقق من البريد الإلكتروني' : 'Email Verification'}
              </h3>
              <p className="text-sm text-gray-400">{formData.email}</p>
            </div>
          </div>
          {verificationStep.email === 'verified' && (
            <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
              <Check className="w-5 h-5 text-green-400" />
            </div>
          )}
        </div>
        
        {!verificationStep.email ? (
          <Button 
            onClick={sendEmailVerification} 
            loading={loading} 
            variant="outline"
            className="w-full border-gold-400/30 text-gold-400 hover:bg-gold-400/10"
          >
            {language === 'ar' ? 'إرسال رمز التحقق' : 'Send Verification Code'}
          </Button>
        ) : verificationStep.email === 'verified' ? (
          <div className="flex items-center gap-2 text-green-400">
            <Check className="w-4 h-4" />
            <span className="text-sm">{language === 'ar' ? 'تم التحقق من البريد الإلكتروني' : 'Email verified successfully'}</span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                {language === 'ar' ? 'أدخل رمز التحقق المرسل إلى بريدك الإلكتروني' : 'Enter the verification code sent to your email'}
              </label>
              <input
                type="text"
                value={verificationCodes.email}
                onChange={(e) => setVerificationCodes(prev => ({ ...prev, email: e.target.value }))}
                className={`
                  w-full px-4 py-3 bg-dark-700/50 border border-gold-400/30 rounded-lg
                  text-white placeholder-gray-400 text-center font-mono text-lg tracking-widest
                  focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400
                `}
                placeholder="123456"
                maxLength={6}
                dir="ltr"
                autoFocus
              />
            </div>
            <Button 
              onClick={verifyEmail} 
              className="w-full bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-dark-900 font-bold"
              disabled={!verificationCodes.email || verificationCodes.email.length !== 6}
            >
              {language === 'ar' ? 'تحقق' : 'Verify'}
            </Button>
          </div>
        )}
      </div>

      {/* Phone Verification */}
      <div className="bg-dark-700/30 p-6 rounded-lg border border-gold-400/20 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gold-500/20 rounded-lg flex items-center justify-center">
              <Phone className="w-5 h-5 text-gold-400" />
            </div>
            <div>
              <h3 className="font-medium text-white">
                {language === 'ar' ? 'تحقق من رقم الهاتف' : 'Phone Verification'}
              </h3>
              <p className="text-sm text-gray-400">{formData.countryCode} {formData.phone}</p>
            </div>
          </div>
          {verificationStep.phone === 'verified' && (
            <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
              <Check className="w-4 h-4 text-green-400" />
            </div>
          )}
        </div>
        
        {!verificationStep.phone ? (
          <Button 
            onClick={sendPhoneVerification} 
            loading={loading} 
            variant="outline"
            className="w-full border-gold-400/30 text-gold-400 hover:bg-gold-400/10"
          >
            {language === 'ar' ? 'إرسال رمز التحقق' : 'Send Verification Code'}
          </Button>
        ) : verificationStep.phone === 'verified' ? (
          <div className="flex items-center gap-2 text-green-400">
            <Check className="w-4 h-4" />
            <span className="text-sm">{language === 'ar' ? 'تم التحقق من رقم الهاتف' : 'Phone verified successfully'}</span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                {language === 'ar' ? 'أدخل رمز التحقق المرسل إلى هاتفك' : 'Enter the verification code sent to your phone'}
              </label>
              <input
                type="text"
                value={verificationCodes.phone}
                onChange={(e) => setVerificationCodes(prev => ({ ...prev, phone: e.target.value }))}
                className={`
                  w-full px-4 py-3 bg-dark-700/50 border border-gold-400/30 rounded-lg
                  text-white placeholder-gray-400 text-center font-mono text-lg tracking-widest
                  focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400
                `}
                placeholder="123456"
                maxLength={6}
                dir="ltr"
                autoFocus
              />
            </div>
            <Button 
              onClick={verifyPhone} 
              className="w-full bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-dark-900 font-bold"
              disabled={!verificationCodes.phone || verificationCodes.phone.length !== 6}
            >
              {language === 'ar' ? 'تحقق' : 'Verify'}
            </Button>
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <Button
          onClick={handlePrevStep}
          variant="outline"
          className="flex-1 border-gold-400/30 text-gold-400 hover:bg-gold-400/10"
          size="lg"
        >
          <div className="flex items-center justify-center gap-2">
            <ArrowLeft className={`w-4 h-4 ${language === 'ar' ? 'rotate-180' : ''}`} />
            <span>{language === 'ar' ? 'السابق' : 'Previous'}</span>
          </div>
        </Button>
        <Button
          onClick={handleSubmit}
          loading={loading}
          disabled={verificationStep.email !== 'verified' || verificationStep.phone !== 'verified'}
          className="flex-1 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-dark-900 font-bold shadow-lg shadow-gold-500/30 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          size="lg"
        >
          <div className="flex items-center justify-center gap-2">
            <span>{language === 'ar' ? 'إنشاء الحساب' : 'Create Account'}</span>
            <Sparkles className="w-4 h-4" />
          </div>
        </Button>
      </div>

      {/* Demo Note */}
      <div className="bg-cosmic-900/30 backdrop-blur-xl border border-cosmic-400/20 rounded-2xl p-4 shadow-lg">
        <div className="text-center space-y-2">
          <h3 className="text-sm font-medium text-cosmic-400">
            {language === 'ar' ? 'للتجربة السريعة' : 'Quick Demo'}
          </h3>
          <div className="text-xs text-gray-400">
            <p>{language === 'ar' ? 'استخدم الرمز: 123456 لتحقق البريد الإلكتروني والهاتف' : 'Use code: 123456 for email and phone verification'}</p>
          </div>
        </div>
      </div>
    </div>
  );

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
          className="relative z-10 max-w-2xl w-full glassmorphism rounded-2xl shadow-cosmic p-8 space-y-8"
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
              {language === 'ar' ? 'إنشاء حساب جديد' : 'Create Your Cosmic Account'}
            </h2>
            <p className="text-gray-300">
              {language === 'ar' ? 'انضم إلى رحلة اكتشاف أسرار الكون' : 'Join the journey to discover the secrets of the universe'}
            </p>
          </motion.div>

          {/* Progress Steps */}
          <motion.div variants={itemVariants} className="flex justify-center mb-8">
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              {[1, 2, 3].map((stepNumber) => (
                <div key={stepNumber} className="flex items-center">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${step >= stepNumber 
                      ? 'bg-gradient-to-r from-gold-500 to-gold-600 text-gray-900' 
                      : 'bg-white/10 text-gray-400 border border-white/20'
                    }
                  `}>
                    {stepNumber}
                  </div>
                  {stepNumber < 3 && (
                    <div className={`
                      w-12 h-0.5 mx-2
                      ${step > stepNumber ? 'bg-gold-500' : 'bg-white/20'}
                    `} />
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Step Content */}
          <motion.form onSubmit={handleSubmit} variants={itemVariants} className="space-y-6">
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
          </motion.form>

          {/* Login Link */}
          <motion.div className="text-center pt-6 border-t border-white/10" variants={itemVariants}>
            <p className="text-gray-400 text-sm">
              {language === 'ar' ? 'لديك حساب بالفعل؟' : "Already have an account?"}{' '}
              <Link 
                to="/login" 
                className="font-medium text-cosmic-400 hover:text-cosmic-300 transition-colors"
              >
                {language === 'ar' ? 'تسجيل الدخول' : 'Sign in'}
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
};

export default Signup; 