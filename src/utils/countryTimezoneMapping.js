/**
 * 🌍 SAMIA TAROT - Advanced Country/Timezone/CountryCode Mapping System
 * 
 * Professional auto-fill system that:
 * 1. Maps countries to their international dialing codes
 * 2. Maps countries to their timezones (with multiple timezone support)
 * 3. Provides smart auto-selection and validation
 * 
 * Usage: Select country → Auto-fills timezone & country code
 */

// Complete Country Code Mapping (International Dialing Codes)
export const countryCodeMapping = {
  // Lebanon & Gulf (Priority)
  'Lebanon': '+961',
  'Saudi Arabia': '+966',
  'United Arab Emirates': '+971',
  'Qatar': '+974',
  'Kuwait': '+965',
  'Bahrain': '+973',
  'Oman': '+968',
  
  // Middle East
  'Jordan': '+962',
  'Syria': '+963',
  'Iraq': '+964',
  'Palestine': '+970',
  'Israel': '+972',
  'Egypt': '+20',
  'Yemen': '+967',
  'Iran': '+98',
  'Turkey': '+90',
  
  // Europe
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
  'Poland': '+48',
  'Czech Republic': '+420',
  'Hungary': '+36',
  'Romania': '+40',
  'Bulgaria': '+359',
  'Greece': '+30',
  'Portugal': '+351',
  'Ireland': '+353',
  'Russia': '+7',
  'Ukraine': '+380',
  'Belarus': '+375',
  'Lithuania': '+370',
  'Latvia': '+371',
  'Estonia': '+372',
  'Serbia': '+381',
  'Croatia': '+385',
  'Bosnia and Herzegovina': '+387',
  'Montenegro': '+382',
  'North Macedonia': '+389',
  'Albania': '+355',
  'Slovenia': '+386',
  'Slovakia': '+421',
  'Moldova': '+373',
  'Georgia': '+995',
  'Armenia': '+374',
  'Azerbaijan': '+994',
  
  // North America
  'United States': '+1',
  'Canada': '+1',
  'Mexico': '+52',
  
  // Asia Pacific
  'China': '+86',
  'Japan': '+81',
  'Korea (South)': '+82',
  'India': '+91',
  'Pakistan': '+92',
  'Bangladesh': '+880',
  'Sri Lanka': '+94',
  'Nepal': '+977',
  'Thailand': '+66',
  'Vietnam': '+84',
  'Malaysia': '+60',
  'Singapore': '+65',
  'Indonesia': '+62',
  'Philippines': '+63',
  'Cambodia': '+855',
  'Laos': '+856',
  'Myanmar': '+95',
  'Brunei': '+673',
  'Mongolia': '+976',
  'Kazakhstan': '+7',
  'Uzbekistan': '+998',
  'Turkmenistan': '+993',
  'Tajikistan': '+992',
  'Kyrgyzstan': '+996',
  'Afghanistan': '+93',
  
  // South America
  'Brazil': '+55',
  'Argentina': '+54',
  'Chile': '+56',
  'Colombia': '+57',
  'Peru': '+51',
  'Venezuela': '+58',
  'Ecuador': '+593',
  'Bolivia': '+591',
  'Paraguay': '+595',
  'Uruguay': '+598',
  'Guyana': '+592',
  'Suriname': '+597',
  
  // Africa
  'Nigeria': '+234',
  'South Africa': '+27',
  'Kenya': '+254',
  'Ethiopia': '+251',
  'Ghana': '+233',
  'Tanzania': '+255',
  'Uganda': '+256',
  'Mozambique': '+258',
  'Madagascar': '+261',
  'Cameroon': '+237',
  'Algeria': '+213',
  'Morocco': '+212',
  'Tunisia': '+216',
  'Libya': '+218',
  'Sudan': '+249',
  'Zambia': '+260',
  'Zimbabwe': '+263',
  'Botswana': '+267',
  'Namibia': '+264',
  'Mauritius': '+230',
  
  // Oceania
  'Australia': '+61',
  'New Zealand': '+64',
  'Fiji': '+679',
  'Papua New Guinea': '+675'
};

// Country to Timezone Mapping (with multiple timezone support)
export const countryTimezoneMapping = {
  // Lebanon & Gulf
  'Lebanon': ['Asia/Beirut'],
  'Saudi Arabia': ['Asia/Riyadh'],
  'United Arab Emirates': ['Asia/Dubai'],
  'Qatar': ['Asia/Qatar'],
  'Kuwait': ['Asia/Kuwait'],
  'Bahrain': ['Asia/Bahrain'],
  'Oman': ['Asia/Muscat'],
  
  // Middle East
  'Jordan': ['Asia/Amman'],
  'Syria': ['Asia/Damascus'],
  'Iraq': ['Asia/Baghdad'],
  'Palestine': ['Asia/Gaza', 'Asia/Hebron'],
  'Israel': ['Asia/Jerusalem'],
  'Egypt': ['Africa/Cairo'],
  'Yemen': ['Asia/Aden'],
  'Iran': ['Asia/Tehran'],
  'Turkey': ['Europe/Istanbul'],
  
  // Europe (Single timezone countries)
  'France': ['Europe/Paris'],
  'Germany': ['Europe/Berlin'],
  'United Kingdom': ['Europe/London'],
  'Italy': ['Europe/Rome'],
  'Spain': ['Europe/Madrid', 'Atlantic/Canary'],
  'Netherlands': ['Europe/Amsterdam'],
  'Sweden': ['Europe/Stockholm'],
  'Norway': ['Europe/Oslo'],
  'Switzerland': ['Europe/Zurich'],
  'Austria': ['Europe/Vienna'],
  'Belgium': ['Europe/Brussels'],
  'Denmark': ['Europe/Copenhagen'],
  'Finland': ['Europe/Helsinki'],
  'Poland': ['Europe/Warsaw'],
  'Czech Republic': ['Europe/Prague'],
  'Hungary': ['Europe/Budapest'],
  'Romania': ['Europe/Bucharest'],
  'Bulgaria': ['Europe/Sofia'],
  'Greece': ['Europe/Athens'],
  'Portugal': ['Europe/Lisbon', 'Atlantic/Azores'],
  'Ireland': ['Europe/Dublin'],
  'Ukraine': ['Europe/Kiev'],
  'Belarus': ['Europe/Minsk'],
  'Lithuania': ['Europe/Vilnius'],
  'Latvia': ['Europe/Riga'],
  'Estonia': ['Europe/Tallinn'],
  
  // Large countries with multiple timezones
  'Russia': [
    'Europe/Moscow', 'Europe/Kaliningrad', 'Asia/Yekaterinburg', 
    'Asia/Novosibirsk', 'Asia/Krasnoyarsk', 'Asia/Irkutsk', 
    'Asia/Yakutsk', 'Asia/Vladivostok', 'Asia/Magadan', 
    'Asia/Kamchatka', 'Asia/Anadyr'
  ],
  'United States': [
    'America/New_York', 'America/Chicago', 'America/Denver', 
    'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu'
  ],
  'Canada': [
    'America/St_Johns', 'America/Halifax', 'America/Toronto', 
    'America/Winnipeg', 'America/Edmonton', 'America/Vancouver'
  ],
  'Australia': [
    'Australia/Perth', 'Australia/Adelaide', 'Australia/Darwin',
    'Australia/Brisbane', 'Australia/Sydney', 'Australia/Hobart'
  ],
  'Brazil': [
    'America/Noronha', 'America/Sao_Paulo', 'America/Manaus', 
    'America/Rio_Branco'
  ],
  'Mexico': [
    'America/Mexico_City', 'America/Cancun', 'America/Chihuahua',
    'America/Hermosillo', 'America/Mazatlan', 'America/Tijuana'
  ],
  'China': ['Asia/Shanghai'],
  'India': ['Asia/Kolkata'],
  
  // Other countries (single timezone)
  'Japan': ['Asia/Tokyo'],
  'Korea (South)': ['Asia/Seoul'],
  'Pakistan': ['Asia/Karachi'],
  'Bangladesh': ['Asia/Dhaka'],
  'Sri Lanka': ['Asia/Colombo'],
  'Thailand': ['Asia/Bangkok'],
  'Vietnam': ['Asia/Ho_Chi_Minh'],
  'Malaysia': ['Asia/Kuala_Lumpur'],
  'Singapore': ['Asia/Singapore'],
  'Indonesia': ['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura'],
  'Philippines': ['Asia/Manila'],
  'Argentina': ['America/Argentina/Buenos_Aires'],
  'Chile': ['America/Santiago', 'Pacific/Easter'],
  'Colombia': ['America/Bogota'],
  'Peru': ['America/Lima'],
  'Nigeria': ['Africa/Lagos'],
  'South Africa': ['Africa/Johannesburg'],
  'Kenya': ['Africa/Nairobi'],
  'New Zealand': ['Pacific/Auckland', 'Pacific/Chatham']
};

// Timezone Display Names (User-friendly)
export const timezoneDisplayNames = {
  // Middle East
  'Asia/Beirut': 'Lebanon Time (EET)',
  'Asia/Riyadh': 'Saudi Arabia Time (AST)',
  'Asia/Dubai': 'UAE Time (GST)',
  'Asia/Qatar': 'Qatar Time (AST)',
  'Asia/Kuwait': 'Kuwait Time (AST)',
  'Asia/Bahrain': 'Bahrain Time (AST)',
  'Asia/Muscat': 'Oman Time (GST)',
  'Asia/Amman': 'Jordan Time (EET)',
  'Asia/Damascus': 'Syria Time (EET)',
  'Asia/Baghdad': 'Iraq Time (AST)',
  'Asia/Gaza': 'Palestine Time (EET)',
  'Asia/Jerusalem': 'Israel Time (IST)',
  'Africa/Cairo': 'Egypt Time (EET)',
  'Asia/Tehran': 'Iran Time (IRST)',
  'Europe/Istanbul': 'Turkey Time (TRT)',
  
  // Europe
  'Europe/London': 'UK Time (GMT/BST)',
  'Europe/Paris': 'Central European Time',
  'Europe/Berlin': 'Central European Time',
  'Europe/Rome': 'Central European Time',
  'Europe/Madrid': 'Central European Time',
  'Europe/Moscow': 'Moscow Time (MSK)',
  
  // North America
  'America/New_York': 'Eastern Time (EST/EDT)',
  'America/Chicago': 'Central Time (CST/CDT)',
  'America/Denver': 'Mountain Time (MST/MDT)',
  'America/Los_Angeles': 'Pacific Time (PST/PDT)',
  'America/Anchorage': 'Alaska Time (AKST/AKDT)',
  'Pacific/Honolulu': 'Hawaii Time (HST)',
  
  // Asia
  'Asia/Shanghai': 'China Time (CST)',
  'Asia/Tokyo': 'Japan Time (JST)',
  'Asia/Seoul': 'Korea Time (KST)',
  'Asia/Kolkata': 'India Time (IST)',
  'Asia/Bangkok': 'Thailand Time (ICT)',
  'Asia/Singapore': 'Singapore Time (SGT)',
  
  // Oceania
  'Australia/Sydney': 'Australian Eastern Time',
  'Australia/Perth': 'Australian Western Time',
  'Pacific/Auckland': 'New Zealand Time'
};

/**
 * 🚀 MAIN FUNCTIONS
 */

// Get country code by country name
export const getCountryCode = (countryName) => {
  return countryCodeMapping[countryName] || '';
};

// Get timezones by country name
export const getTimezones = (countryName) => {
  return countryTimezoneMapping[countryName] || [];
};

// Get default (first) timezone for a country
export const getDefaultTimezone = (countryName) => {
  const timezones = getTimezones(countryName);
  return timezones.length > 0 ? timezones[0] : '';
};

// Check if country has multiple timezones
export const hasMultipleTimezones = (countryName) => {
  const timezones = getTimezones(countryName);
  return timezones.length > 1;
};

// Get timezone display name
export const getTimezoneDisplayName = (timezone) => {
  return timezoneDisplayNames[timezone] || timezone;
};

// Auto-fill country data when country is selected
export const getCountryData = (countryName) => {
  const countryCode = getCountryCode(countryName);
  const timezones = getTimezones(countryName);
  const defaultTimezone = getDefaultTimezone(countryName);
  const hasMultiple = hasMultipleTimezones(countryName);
  
  return {
    countryCode,
    timezones,
    defaultTimezone,
    hasMultipleTimezones: hasMultiple,
    timezoneOptions: timezones.map(tz => ({
      value: tz,
      label: getTimezoneDisplayName(tz)
    }))
  };
};

// Validate country code format
export const isValidCountryCode = (code) => {
  return /^\+\d{1,4}$/.test(code);
};

// Format phone number with country code
export const formatPhoneWithCountryCode = (phone, countryCode) => {
  if (!phone || !countryCode) return phone;
  
  // Remove any existing country code or leading zeros
  let cleanPhone = phone.replace(/^(\+\d{1,4}|0+)/, '');
  
  // Add the country code
  return `${countryCode}${cleanPhone}`;
};

// Search countries by name (for autocomplete)
export const searchCountriesByName = (query) => {
  if (!query) return [];
  
  const searchTerm = query.toLowerCase();
  return Object.keys(countryCodeMapping).filter(country =>
    country.toLowerCase().includes(searchTerm)
  );
};

export default {
  countryCodeMapping,
  countryTimezoneMapping,
  timezoneDisplayNames,
  getCountryCode,
  getTimezones,
  getDefaultTimezone,
  hasMultipleTimezones,
  getTimezoneDisplayName,
  getCountryData,
  isValidCountryCode,
  formatPhoneWithCountryCode,
  searchCountriesByName
}; 