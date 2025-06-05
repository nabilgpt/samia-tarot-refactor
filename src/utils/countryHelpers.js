/**
 * Country and Country Code Mapping Utilities
 * Maps countries to their international dialing codes
 */

export const countryCodeMap = {
  // Middle East & North Africa
  'Saudi Arabia': '+966',
  'United Arab Emirates': '+971',
  'Kuwait': '+965',
  'Qatar': '+974',
  'Bahrain': '+973',
  'Oman': '+968',
  'Yemen': '+967',
  'Jordan': '+962',
  'Lebanon': '+961',
  'Syria': '+963',
  'Iraq': '+964',
  'Palestine': '+970',
  'Israel': '+972',
  'Egypt': '+20',
  'Libya': '+218',
  'Tunisia': '+216',
  'Algeria': '+213',
  'Morocco': '+212',
  'Sudan': '+249',

  // Europe
  'Turkey': '+90',
  'Germany': '+49',
  'France': '+33',
  'United Kingdom': '+44',
  'Italy': '+39',
  'Spain': '+34',
  'Netherlands': '+31',
  'Belgium': '+32',
  'Switzerland': '+41',
  'Austria': '+43',
  'Sweden': '+46',
  'Norway': '+47',
  'Denmark': '+45',
  'Finland': '+358',
  'Poland': '+48',
  'Czech Republic': '+420',
  'Hungary': '+36',
  'Romania': '+40',
  'Bulgaria': '+359',
  'Greece': '+30',
  'Cyprus': '+357',
  'Malta': '+356',
  'Luxembourg': '+352',
  'Iceland': '+354',
  'Ireland': '+353',
  'Portugal': '+351',
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

  // Asia Pacific
  'China': '+86',
  'Japan': '+81',
  'South Korea': '+82',
  'India': '+91',
  'Pakistan': '+92',
  'Bangladesh': '+880',
  'Sri Lanka': '+94',
  'Nepal': '+977',
  'Bhutan': '+975',
  'Maldives': '+960',
  'Afghanistan': '+93',
  'Iran': '+98',
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
  'Azerbaijan': '+994',
  'Armenia': '+374',
  'Georgia': '+995',

  // North America
  'United States': '+1',
  'Canada': '+1',
  'Mexico': '+52',
  'Guatemala': '+502',
  'Belize': '+501',
  'Honduras': '+504',
  'El Salvador': '+503',
  'Nicaragua': '+505',
  'Costa Rica': '+506',
  'Panama': '+507',

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
  'French Guiana': '+594',

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
  'Ivory Coast': '+225',
  'Niger': '+227',
  'Burkina Faso': '+226',
  'Mali': '+223',
  'Malawi': '+265',
  'Zambia': '+260',
  'Zimbabwe': '+263',
  'Botswana': '+267',
  'Namibia': '+264',
  'Lesotho': '+266',
  'Swaziland': '+268',
  'Mauritius': '+230',
  'Seychelles': '+248',
  'Comoros': '+269',
  'Djibouti': '+253',
  'Eritrea': '+291',
  'Somalia': '+252',
  'Rwanda': '+250',
  'Burundi': '+257',
  'Central African Republic': '+236',
  'Chad': '+235',
  'Democratic Republic of Congo': '+243',
  'Republic of Congo': '+242',
  'Gabon': '+241',
  'Equatorial Guinea': '+240',
  'Sao Tome and Principe': '+239',
  'Cape Verde': '+238',
  'Guinea-Bissau': '+245',
  'Guinea': '+224',
  'Sierra Leone': '+232',
  'Liberia': '+231',
  'Senegal': '+221',
  'Gambia': '+220',
  'Mauritania': '+222',

  // Oceania
  'Australia': '+61',
  'New Zealand': '+64',
  'Fiji': '+679',
  'Papua New Guinea': '+675',
  'New Caledonia': '+687',
  'French Polynesia': '+689',
  'Samoa': '+685',
  'Tonga': '+676',
  'Vanuatu': '+678',
  'Solomon Islands': '+677',
  'Palau': '+680',
  'Micronesia': '+691',
  'Marshall Islands': '+692',
  'Kiribati': '+686',
  'Nauru': '+674',
  'Tuvalu': '+688'
};

// Get list of countries for dropdown
export const getCountryList = () => {
  return Object.keys(countryCodeMap).sort();
};

// Get country code for a specific country
export const getCountryCode = (country) => {
  return countryCodeMap[country] || '';
};

// Validate country code format
export const isValidCountryCode = (code) => {
  return /^\+\d{1,4}$/.test(code);
};

// Get country by code (reverse lookup)
export const getCountryByCode = (code) => {
  return Object.keys(countryCodeMap).find(country => countryCodeMap[country] === code) || '';
};

// Format phone number with country code
export const formatPhoneWithCountryCode = (phone, countryCode) => {
  if (!phone || !countryCode) return phone;
  
  // Remove any existing country code or leading zeros
  let cleanPhone = phone.replace(/^(\+\d{1,4}|0+)/, '');
  
  // Add the country code
  return `${countryCode}${cleanPhone}`;
};

// Extract phone number without country code
export const extractPhoneNumber = (fullPhone, countryCode) => {
  if (!fullPhone || !countryCode) return fullPhone;
  
  if (fullPhone.startsWith(countryCode)) {
    return fullPhone.substring(countryCode.length);
  }
  
  return fullPhone;
};

export default {
  countryCodeMap,
  getCountryList,
  getCountryCode,
  isValidCountryCode,
  getCountryByCode,
  formatPhoneWithCountryCode,
  extractPhoneNumber
}; 