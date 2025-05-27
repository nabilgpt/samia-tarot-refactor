// Email validation
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Phone validation (international format)
export const validatePhone = (phone) => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

// Password validation (minimum 8 characters, at least one letter, one number, one special character)
export const validatePassword = (password) => {
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
  return passwordRegex.test(password);
};

// Get country code from country name
export const getCountryCodeFromCountry = (countryName) => {
  const countryCodes = {
    'Lebanon': '+961',
    'Saudi Arabia': '+966',
    'United Arab Emirates': '+971',
    'Qatar': '+974',
    'Kuwait': '+965',
    'Bahrain': '+973',
    'Oman': '+968',
    'Jordan': '+962',
    'Egypt': '+20',
    'Syria': '+963',
    'Iraq': '+964',
    'Palestine': '+970',
    'Morocco': '+212',
    'Algeria': '+213',
    'Tunisia': '+216',
    'Libya': '+218',
    'Sudan': '+249',
    'Yemen': '+967',
    'France': '+33',
    'Germany': '+49',
    'United Kingdom': '+44',
    'Italy': '+39',
    'Spain': '+34',
    'Netherlands': '+31',
    'Sweden': '+46',
    'Norway': '+47',
    'Switzerland': '+41',
    'Austria': '+43',
    'Belgium': '+32',
    'Denmark': '+45',
    'Finland': '+358',
    'Greece': '+30',
    'Portugal': '+351',
    'Ireland': '+353',
    'United States': '+1',
    'Canada': '+1',
    'Australia': '+61',
    'New Zealand': '+64',
    'Turkey': '+90',
    'India': '+91',
    'Pakistan': '+92',
    'Bangladesh': '+880',
    'Sri Lanka': '+94',
    'Malaysia': '+60',
    'Singapore': '+65',
    'Thailand': '+66',
    'Philippines': '+63',
    'Indonesia': '+62',
    'Vietnam': '+84',
    'South Korea': '+82',
    'Japan': '+81',
    'China': '+86',
    'Russia': '+7',
    'Brazil': '+55',
    'Argentina': '+54',
    'Mexico': '+52',
    'Chile': '+56',
    'Colombia': '+57',
    'Peru': '+51',
    'Venezuela': '+58',
    'South Africa': '+27',
    'Nigeria': '+234',
    'Kenya': '+254',
    'Ghana': '+233',
    'Ethiopia': '+251',
    'Morocco': '+212',
    'Algeria': '+213',
    'Tunisia': '+216'
  };

  return countryCodes[countryName] || '';
};

// Get zodiac sign from date of birth
export const getZodiacFromDateOfBirth = (dateString) => {
  const date = new Date(dateString);
  const month = date.getMonth() + 1; // getMonth() returns 0-11
  const day = date.getDate();

  const zodiacSigns = [
    { name: 'Capricorn ♑', nameAr: 'الجدي ♑', start: [12, 22], end: [1, 19] },
    { name: 'Aquarius ♒', nameAr: 'الدلو ♒', start: [1, 20], end: [2, 18] },
    { name: 'Pisces ♓', nameAr: 'الحوت ♓', start: [2, 19], end: [3, 20] },
    { name: 'Aries ♈', nameAr: 'الحمل ♈', start: [3, 21], end: [4, 19] },
    { name: 'Taurus ♉', nameAr: 'الثور ♉', start: [4, 20], end: [5, 20] },
    { name: 'Gemini ♊', nameAr: 'الجوزاء ♊', start: [5, 21], end: [6, 20] },
    { name: 'Cancer ♋', nameAr: 'السرطان ♋', start: [6, 21], end: [7, 22] },
    { name: 'Leo ♌', nameAr: 'الأسد ♌', start: [7, 23], end: [8, 22] },
    { name: 'Virgo ♍', nameAr: 'العذراء ♍', start: [8, 23], end: [9, 22] },
    { name: 'Libra ♎', nameAr: 'الميزان ♎', start: [9, 23], end: [10, 22] },
    { name: 'Scorpio ♏', nameAr: 'العقرب ♏', start: [10, 23], end: [11, 21] },
    { name: 'Sagittarius ♐', nameAr: 'القوس ♐', start: [11, 22], end: [12, 21] }
  ];

  for (const sign of zodiacSigns) {
    const [startMonth, startDay] = sign.start;
    const [endMonth, endDay] = sign.end;

    if (
      (month === startMonth && day >= startDay) ||
      (month === endMonth && day <= endDay) ||
      (startMonth > endMonth && (month === startMonth || month === endMonth))
    ) {
      return sign.name; // Return English name with symbol
    }
  }

  return '';
};

// Format phone number for display
export const formatPhoneNumber = (phone, countryCode) => {
  if (!phone) return '';
  
  // Remove any existing country code
  let cleanPhone = phone.replace(/^\+?\d{1,4}/, '');
  
  // Add the country code
  return `${countryCode}${cleanPhone}`;
};

// Validate form step by step
export const validateFormStep = (step, formData) => {
  const errors = {};

  switch (step) {
    case 1:
      if (!formData.firstName?.trim()) errors.firstName = 'First name is required';
      if (!formData.lastName?.trim()) errors.lastName = 'Last name is required';
      if (!formData.email?.trim()) {
        errors.email = 'Email is required';
      } else if (!validateEmail(formData.email)) {
        errors.email = 'Please enter a valid email address';
      }
      if (!formData.phone?.trim()) {
        errors.phone = 'Phone number is required';
      } else if (!validatePhone(formData.phone)) {
        errors.phone = 'Please enter a valid phone number';
      }
      if (!formData.country) errors.country = 'Country is required';
      if (!formData.dateOfBirth) errors.dateOfBirth = 'Date of birth is required';
      break;

    case 2:
      if (!formData.password) {
        errors.password = 'Password is required';
      } else if (!validatePassword(formData.password)) {
        errors.password = 'Password must be at least 8 characters with letters, numbers, and special characters';
      }
      if (!formData.confirmPassword) {
        errors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
      if (!formData.termsAccepted) {
        errors.termsAccepted = 'You must accept the terms and conditions';
      }
      break;

    default:
      break;
  }

  return errors;
};

// Generate verification code (for demo purposes)
export const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Validate verification code
export const validateVerificationCode = (code) => {
  return code && code.length === 6 && /^\d{6}$/.test(code);
}; 