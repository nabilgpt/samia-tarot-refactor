// Complete list of ALL world countries sorted by priority: Lebanon > Gulf > Europe > Rest of World
export const countries = [
  // Lebanon (Priority 1)
  { code: 'LB', name: 'Lebanon', flag: '🇱🇧', region: 'Middle East' },
  
  // Gulf Countries (Priority 2)
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', region: 'Gulf' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', region: 'Gulf' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦', region: 'Gulf' },
  { code: 'KW', name: 'Kuwait', flag: '🇰🇼', region: 'Gulf' },
  { code: 'BH', name: 'Bahrain', flag: '🇧🇭', region: 'Gulf' },
  { code: 'OM', name: 'Oman', flag: '🇴🇲', region: 'Gulf' },
  
  // Europe (Priority 3)
  { code: 'FR', name: 'France', flag: '🇫🇷', region: 'Europe' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', region: 'Europe' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', region: 'Europe' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', region: 'Europe' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', region: 'Europe' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', region: 'Europe' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪', region: 'Europe' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴', region: 'Europe' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭', region: 'Europe' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹', region: 'Europe' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪', region: 'Europe' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰', region: 'Europe' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮', region: 'Europe' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷', region: 'Europe' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', region: 'Europe' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪', region: 'Europe' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱', region: 'Europe' },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿', region: 'Europe' },
  { code: 'HU', name: 'Hungary', flag: '🇭🇺', region: 'Europe' },
  { code: 'RO', name: 'Romania', flag: '🇷🇴', region: 'Europe' },
  { code: 'BG', name: 'Bulgaria', flag: '🇧🇬', region: 'Europe' },
  { code: 'HR', name: 'Croatia', flag: '🇭🇷', region: 'Europe' },
  { code: 'SI', name: 'Slovenia', flag: '🇸🇮', region: 'Europe' },
  { code: 'SK', name: 'Slovakia', flag: '🇸🇰', region: 'Europe' },
  { code: 'EE', name: 'Estonia', flag: '🇪🇪', region: 'Europe' },
  { code: 'LV', name: 'Latvia', flag: '🇱🇻', region: 'Europe' },
  { code: 'LT', name: 'Lithuania', flag: '🇱🇹', region: 'Europe' },
  { code: 'LU', name: 'Luxembourg', flag: '🇱🇺', region: 'Europe' },
  { code: 'MT', name: 'Malta', flag: '🇲🇹', region: 'Europe' },
  { code: 'CY', name: 'Cyprus', flag: '🇨🇾', region: 'Europe' },
  { code: 'IS', name: 'Iceland', flag: '🇮🇸', region: 'Europe' },
  { code: 'AL', name: 'Albania', flag: '🇦🇱', region: 'Europe' },
  { code: 'AD', name: 'Andorra', flag: '🇦🇩', region: 'Europe' },
  { code: 'BA', name: 'Bosnia and Herzegovina', flag: '🇧🇦', region: 'Europe' },
  { code: 'XK', name: 'Kosovo', flag: '🇽🇰', region: 'Europe' },
  { code: 'LI', name: 'Liechtenstein', flag: '🇱🇮', region: 'Europe' },
  { code: 'MK', name: 'North Macedonia', flag: '🇲🇰', region: 'Europe' },
  { code: 'MD', name: 'Moldova', flag: '🇲🇩', region: 'Europe' },
  { code: 'MC', name: 'Monaco', flag: '🇲🇨', region: 'Europe' },
  { code: 'ME', name: 'Montenegro', flag: '🇲🇪', region: 'Europe' },
  { code: 'RS', name: 'Serbia', flag: '🇷🇸', region: 'Europe' },
  { code: 'SM', name: 'San Marino', flag: '🇸🇲', region: 'Europe' },
  { code: 'VA', name: 'Vatican City', flag: '🇻🇦', region: 'Europe' },
  { code: 'BY', name: 'Belarus', flag: '🇧🇾', region: 'Europe' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺', region: 'Europe' },
  { code: 'UA', name: 'Ukraine', flag: '🇺🇦', region: 'Europe' },
  
  // Rest of the World (Priority 4) - Alphabetical by region then country
  
  // Afghanistan to Zimbabwe (A-Z)
  { code: 'AF', name: 'Afghanistan', flag: '🇦🇫', region: 'Asia' },
  { code: 'DZ', name: 'Algeria', flag: '🇩🇿', region: 'Africa' },
  { code: 'AS', name: 'American Samoa', flag: '🇦🇸', region: 'Oceania' },
  { code: 'AO', name: 'Angola', flag: '🇦🇴', region: 'Africa' },
  { code: 'AI', name: 'Anguilla', flag: '🇦🇮', region: 'Caribbean' },
  { code: 'AQ', name: 'Antarctica', flag: '🇦🇶', region: 'Antarctica' },
  { code: 'AG', name: 'Antigua and Barbuda', flag: '🇦🇬', region: 'Caribbean' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', region: 'South America' },
  { code: 'AM', name: 'Armenia', flag: '🇦🇲', region: 'Asia' },
  { code: 'AW', name: 'Aruba', flag: '🇦🇼', region: 'Caribbean' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', region: 'Oceania' },
  { code: 'AZ', name: 'Azerbaijan', flag: '🇦🇿', region: 'Asia' },
  
  { code: 'BS', name: 'Bahamas', flag: '🇧🇸', region: 'Caribbean' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩', region: 'Asia' },
  { code: 'BB', name: 'Barbados', flag: '🇧🇧', region: 'Caribbean' },
  { code: 'BZ', name: 'Belize', flag: '🇧🇿', region: 'Central America' },
  { code: 'BJ', name: 'Benin', flag: '🇧🇯', region: 'Africa' },
  { code: 'BM', name: 'Bermuda', flag: '🇧🇲', region: 'North America' },
  { code: 'BT', name: 'Bhutan', flag: '🇧🇹', region: 'Asia' },
  { code: 'BO', name: 'Bolivia', flag: '🇧🇴', region: 'South America' },
  { code: 'BW', name: 'Botswana', flag: '🇧🇼', region: 'Africa' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', region: 'South America' },
  { code: 'BN', name: 'Brunei', flag: '🇧🇳', region: 'Asia' },
  { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫', region: 'Africa' },
  { code: 'BI', name: 'Burundi', flag: '🇧🇮', region: 'Africa' },
  
  { code: 'KH', name: 'Cambodia', flag: '🇰🇭', region: 'Asia' },
  { code: 'CM', name: 'Cameroon', flag: '🇨🇲', region: 'Africa' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', region: 'North America' },
  { code: 'CV', name: 'Cape Verde', flag: '🇨🇻', region: 'Africa' },
  { code: 'KY', name: 'Cayman Islands', flag: '🇰🇾', region: 'Caribbean' },
  { code: 'CF', name: 'Central African Republic', flag: '🇨🇫', region: 'Africa' },
  { code: 'TD', name: 'Chad', flag: '🇹🇩', region: 'Africa' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', region: 'South America' },
  { code: 'CN', name: 'China', flag: '🇨🇳', region: 'Asia' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', region: 'South America' },
  { code: 'KM', name: 'Comoros', flag: '🇰🇲', region: 'Africa' },
  { code: 'CG', name: 'Congo', flag: '🇨🇬', region: 'Africa' },
  { code: 'CD', name: 'Congo (Democratic Republic)', flag: '🇨🇩', region: 'Africa' },
  { code: 'CK', name: 'Cook Islands', flag: '🇨🇰', region: 'Oceania' },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷', region: 'Central America' },
  { code: 'CI', name: 'Côte d\'Ivoire', flag: '🇨🇮', region: 'Africa' },
  { code: 'CU', name: 'Cuba', flag: '🇨🇺', region: 'Caribbean' },
  { code: 'CW', name: 'Curaçao', flag: '🇨🇼', region: 'Caribbean' },
  
  { code: 'DJ', name: 'Djibouti', flag: '🇩🇯', region: 'Africa' },
  { code: 'DM', name: 'Dominica', flag: '🇩🇲', region: 'Caribbean' },
  { code: 'DO', name: 'Dominican Republic', flag: '🇩🇴', region: 'Caribbean' },
  
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨', region: 'South America' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬', region: 'Africa' },
  { code: 'SV', name: 'El Salvador', flag: '🇸🇻', region: 'Central America' },
  { code: 'GQ', name: 'Equatorial Guinea', flag: '🇬🇶', region: 'Africa' },
  { code: 'ER', name: 'Eritrea', flag: '🇪🇷', region: 'Africa' },
  { code: 'ET', name: 'Ethiopia', flag: '🇪🇹', region: 'Africa' },
  
  { code: 'FK', name: 'Falkland Islands', flag: '🇫🇰', region: 'South America' },
  { code: 'FO', name: 'Faroe Islands', flag: '🇫🇴', region: 'Europe' },
  { code: 'FJ', name: 'Fiji', flag: '🇫🇯', region: 'Oceania' },
  { code: 'PF', name: 'French Polynesia', flag: '🇵🇫', region: 'Oceania' },
  
  { code: 'GA', name: 'Gabon', flag: '🇬🇦', region: 'Africa' },
  { code: 'GM', name: 'Gambia', flag: '🇬🇲', region: 'Africa' },
  { code: 'GE', name: 'Georgia', flag: '🇬🇪', region: 'Asia' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', region: 'Africa' },
  { code: 'GI', name: 'Gibraltar', flag: '🇬🇮', region: 'Europe' },
  { code: 'GL', name: 'Greenland', flag: '🇬🇱', region: 'North America' },
  { code: 'GD', name: 'Grenada', flag: '🇬🇩', region: 'Caribbean' },
  { code: 'GU', name: 'Guam', flag: '🇬🇺', region: 'Oceania' },
  { code: 'GT', name: 'Guatemala', flag: '🇬🇹', region: 'Central America' },
  { code: 'GG', name: 'Guernsey', flag: '🇬🇬', region: 'Europe' },
  { code: 'GN', name: 'Guinea', flag: '🇬🇳', region: 'Africa' },
  { code: 'GW', name: 'Guinea-Bissau', flag: '🇬🇼', region: 'Africa' },
  { code: 'GY', name: 'Guyana', flag: '🇬🇾', region: 'South America' },
  
  { code: 'HT', name: 'Haiti', flag: '🇭🇹', region: 'Caribbean' },
  { code: 'HN', name: 'Honduras', flag: '🇭🇳', region: 'Central America' },
  { code: 'HK', name: 'Hong Kong', flag: '🇭🇰', region: 'Asia' },
  
  { code: 'IN', name: 'India', flag: '🇮🇳', region: 'Asia' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩', region: 'Asia' },
  { code: 'IR', name: 'Iran', flag: '🇮🇷', region: 'Asia' },
  { code: 'IQ', name: 'Iraq', flag: '🇮🇶', region: 'Asia' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱', region: 'Asia' },
  
  { code: 'JM', name: 'Jamaica', flag: '🇯🇲', region: 'Caribbean' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', region: 'Asia' },
  { code: 'JE', name: 'Jersey', flag: '🇯🇪', region: 'Europe' },
  { code: 'JO', name: 'Jordan', flag: '🇯🇴', region: 'Asia' },
  
  { code: 'KZ', name: 'Kazakhstan', flag: '🇰🇿', region: 'Asia' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', region: 'Africa' },
  { code: 'KI', name: 'Kiribati', flag: '🇰🇮', region: 'Oceania' },
  { code: 'KP', name: 'Korea (North)', flag: '🇰🇵', region: 'Asia' },
  { code: 'KR', name: 'Korea (South)', flag: '🇰🇷', region: 'Asia' },
  { code: 'KG', name: 'Kyrgyzstan', flag: '🇰🇬', region: 'Asia' },
  
  { code: 'LA', name: 'Laos', flag: '🇱🇦', region: 'Asia' },
  { code: 'LS', name: 'Lesotho', flag: '🇱🇸', region: 'Africa' },
  { code: 'LR', name: 'Liberia', flag: '🇱🇷', region: 'Africa' },
  { code: 'LY', name: 'Libya', flag: '🇱🇾', region: 'Africa' },
  
  { code: 'MO', name: 'Macau', flag: '🇲🇴', region: 'Asia' },
  { code: 'MG', name: 'Madagascar', flag: '🇲🇬', region: 'Africa' },
  { code: 'MW', name: 'Malawi', flag: '🇲🇼', region: 'Africa' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾', region: 'Asia' },
  { code: 'MV', name: 'Maldives', flag: '🇲🇻', region: 'Asia' },
  { code: 'ML', name: 'Mali', flag: '🇲🇱', region: 'Africa' },
  { code: 'MH', name: 'Marshall Islands', flag: '🇲🇭', region: 'Oceania' },
  { code: 'MR', name: 'Mauritania', flag: '🇲🇷', region: 'Africa' },
  { code: 'MU', name: 'Mauritius', flag: '🇲🇺', region: 'Africa' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', region: 'North America' },
  { code: 'FM', name: 'Micronesia', flag: '🇫🇲', region: 'Oceania' },
  { code: 'MN', name: 'Mongolia', flag: '🇲🇳', region: 'Asia' },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦', region: 'Africa' },
  { code: 'MZ', name: 'Mozambique', flag: '🇲🇿', region: 'Africa' },
  { code: 'MM', name: 'Myanmar', flag: '🇲🇲', region: 'Asia' },
  
  { code: 'NA', name: 'Namibia', flag: '🇳🇦', region: 'Africa' },
  { code: 'NR', name: 'Nauru', flag: '🇳🇷', region: 'Oceania' },
  { code: 'NP', name: 'Nepal', flag: '🇳🇵', region: 'Asia' },
  { code: 'NC', name: 'New Caledonia', flag: '🇳🇨', region: 'Oceania' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', region: 'Oceania' },
  { code: 'NI', name: 'Nicaragua', flag: '🇳🇮', region: 'Central America' },
  { code: 'NE', name: 'Niger', flag: '🇳🇪', region: 'Africa' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', region: 'Africa' },
  { code: 'NU', name: 'Niue', flag: '🇳🇺', region: 'Oceania' },
  { code: 'NF', name: 'Norfolk Island', flag: '🇳🇫', region: 'Oceania' },
  { code: 'MP', name: 'Northern Mariana Islands', flag: '🇲🇵', region: 'Oceania' },
  
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰', region: 'Asia' },
  { code: 'PW', name: 'Palau', flag: '🇵🇼', region: 'Oceania' },
  { code: 'PS', name: 'Palestine', flag: '🇵🇸', region: 'Asia' },
  { code: 'PA', name: 'Panama', flag: '🇵🇦', region: 'Central America' },
  { code: 'PG', name: 'Papua New Guinea', flag: '🇵🇬', region: 'Oceania' },
  { code: 'PY', name: 'Paraguay', flag: '🇵🇾', region: 'South America' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪', region: 'South America' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭', region: 'Asia' },
  { code: 'PN', name: 'Pitcairn Islands', flag: '🇵🇳', region: 'Oceania' },
  { code: 'PR', name: 'Puerto Rico', flag: '🇵🇷', region: 'Caribbean' },
  
  { code: 'RE', name: 'Réunion', flag: '🇷🇪', region: 'Africa' },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼', region: 'Africa' },
  
  { code: 'BL', name: 'Saint Barthélemy', flag: '🇧🇱', region: 'Caribbean' },
  { code: 'SH', name: 'Saint Helena', flag: '🇸🇭', region: 'Africa' },
  { code: 'KN', name: 'Saint Kitts and Nevis', flag: '🇰🇳', region: 'Caribbean' },
  { code: 'LC', name: 'Saint Lucia', flag: '🇱🇨', region: 'Caribbean' },
  { code: 'MF', name: 'Saint Martin', flag: '🇲🇫', region: 'Caribbean' },
  { code: 'PM', name: 'Saint Pierre and Miquelon', flag: '🇵🇲', region: 'North America' },
  { code: 'VC', name: 'Saint Vincent and the Grenadines', flag: '🇻🇨', region: 'Caribbean' },
  { code: 'WS', name: 'Samoa', flag: '🇼🇸', region: 'Oceania' },
  { code: 'ST', name: 'São Tomé and Príncipe', flag: '🇸🇹', region: 'Africa' },
  { code: 'SN', name: 'Senegal', flag: '🇸🇳', region: 'Africa' },
  { code: 'SC', name: 'Seychelles', flag: '🇸🇨', region: 'Africa' },
  { code: 'SL', name: 'Sierra Leone', flag: '🇸🇱', region: 'Africa' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', region: 'Asia' },
  { code: 'SX', name: 'Sint Maarten', flag: '🇸🇽', region: 'Caribbean' },
  { code: 'SB', name: 'Solomon Islands', flag: '🇸🇧', region: 'Oceania' },
  { code: 'SO', name: 'Somalia', flag: '🇸🇴', region: 'Africa' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', region: 'Africa' },
  { code: 'GS', name: 'South Georgia', flag: '🇬🇸', region: 'Antarctica' },
  { code: 'SS', name: 'South Sudan', flag: '🇸🇸', region: 'Africa' },
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰', region: 'Asia' },
  { code: 'SD', name: 'Sudan', flag: '🇸🇩', region: 'Africa' },
  { code: 'SR', name: 'Suriname', flag: '🇸🇷', region: 'South America' },
  { code: 'SZ', name: 'Eswatini', flag: '🇸🇿', region: 'Africa' },
  { code: 'SY', name: 'Syria', flag: '🇸🇾', region: 'Asia' },
  
  { code: 'TW', name: 'Taiwan', flag: '🇹🇼', region: 'Asia' },
  { code: 'TJ', name: 'Tajikistan', flag: '🇹🇯', region: 'Asia' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿', region: 'Africa' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭', region: 'Asia' },
  { code: 'TL', name: 'Timor-Leste', flag: '🇹🇱', region: 'Asia' },
  { code: 'TG', name: 'Togo', flag: '🇹🇬', region: 'Africa' },
  { code: 'TK', name: 'Tokelau', flag: '🇹🇰', region: 'Oceania' },
  { code: 'TO', name: 'Tonga', flag: '🇹🇴', region: 'Oceania' },
  { code: 'TT', name: 'Trinidad and Tobago', flag: '🇹🇹', region: 'Caribbean' },
  { code: 'TN', name: 'Tunisia', flag: '🇹🇳', region: 'Africa' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷', region: 'Asia' },
  { code: 'TM', name: 'Turkmenistan', flag: '🇹🇲', region: 'Asia' },
  { code: 'TC', name: 'Turks and Caicos Islands', flag: '🇹🇨', region: 'Caribbean' },
  { code: 'TV', name: 'Tuvalu', flag: '🇹🇻', region: 'Oceania' },
  
  { code: 'UG', name: 'Uganda', flag: '🇺🇬', region: 'Africa' },
  { code: 'US', name: 'United States', flag: '🇺🇸', region: 'North America' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾', region: 'South America' },
  { code: 'UZ', name: 'Uzbekistan', flag: '🇺🇿', region: 'Asia' },
  
  { code: 'VU', name: 'Vanuatu', flag: '🇻🇺', region: 'Oceania' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪', region: 'South America' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳', region: 'Asia' },
  { code: 'VG', name: 'Virgin Islands (British)', flag: '🇻🇬', region: 'Caribbean' },
  { code: 'VI', name: 'Virgin Islands (US)', flag: '🇻🇮', region: 'Caribbean' },
  
  { code: 'WF', name: 'Wallis and Futuna', flag: '🇼🇫', region: 'Oceania' },
  { code: 'EH', name: 'Western Sahara', flag: '🇪🇭', region: 'Africa' },
  
  { code: 'YE', name: 'Yemen', flag: '🇾🇪', region: 'Asia' },
  
  { code: 'ZM', name: 'Zambia', flag: '🇿🇲', region: 'Africa' },
  { code: 'ZW', name: 'Zimbabwe', flag: '🇿🇼', region: 'Africa' }
];

// Helper function to get countries by region
export const getCountriesByRegion = (region) => {
  return countries.filter(country => country.region === region);
};

// Helper function to search countries
export const searchCountries = (query) => {
  const searchTerm = query.toLowerCase();
  return countries.filter(country => 
    country.name.toLowerCase().includes(searchTerm) ||
    country.code.toLowerCase().includes(searchTerm)
  );
};

// Get country by code
export const getCountryByCode = (code) => {
  return countries.find(country => country.code === code);
};

// Get country by name
export const getCountryByName = (name) => {
  return countries.find(country => country.name === name);
};

// Get total count of countries
export const getTotalCountries = () => {
  return countries.length;
};

// Get countries grouped by region
export const getCountriesGroupedByRegion = () => {
  const grouped = {};
  countries.forEach(country => {
    if (!grouped[country.region]) {
      grouped[country.region] = [];
    }
    grouped[country.region].push(country);
  });
  return grouped;
}; 