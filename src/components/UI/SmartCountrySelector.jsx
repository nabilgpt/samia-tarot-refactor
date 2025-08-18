/**
 * 🌍 Smart Country Selector Component
 * 
 * Professional country selection with:
 * - Searchable dropdown with flags
 * - Auto-fill timezone & country code
 * - Multiple timezone support
 * - Cosmic theme integration
 * - Arabic/English support
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Phone, Clock, ChevronDown, Search, Check } from 'lucide-react';
import { countries } from '../../utils/countries';
import { getCountryData } from '../../utils/countryTimezoneMapping';
import { useUI } from '../../context/UIContext';

const SmartCountrySelector = ({
  selectedCountry = '',
  selectedTimezone = '',
  selectedCountryCode = '',
  onCountryChange,
  onTimezoneChange,
  onCountryCodeChange,
  showTimezone = true,
  showCountryCode = true,
  disabled = false,
  error = '',
  required = false,
  className = ''
}) => {
  const { t } = useTranslation();
  const { language } = useUI();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCountries, setFilteredCountries] = useState(countries);
  const [timezoneOptions, setTimezoneOptions] = useState([]);
  const [showTimezoneDropdown, setShowTimezoneDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Filter countries based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCountries(countries);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = countries.filter(country =>
        country.name.toLowerCase().includes(query) ||
        country.code.toLowerCase().includes(query)
      );
      setFilteredCountries(filtered);
    }
  }, [searchQuery]);

  // Handle country selection
  const handleCountrySelect = (country) => {
    const countryData = getCountryData(country.name);
    
    // Update country
    onCountryChange?.(country.name);
    
    // Auto-fill country code
    if (onCountryCodeChange && countryData.countryCode) {
      onCountryCodeChange(countryData.countryCode);
    }
    
    // Auto-fill timezone
    if (onTimezoneChange && countryData.defaultTimezone) {
      onTimezoneChange(countryData.defaultTimezone);
    }
    
    // Set timezone options for multi-timezone countries
    setTimezoneOptions(countryData.timezoneOptions || []);
    setShowTimezoneDropdown(countryData.hasMultipleTimezones);
    
    // Close dropdown and clear search
    setIsOpen(false);
    setSearchQuery('');
  };

  // Handle timezone selection (for multi-timezone countries)
  const handleTimezoneSelect = (timezone) => {
    onTimezoneChange?.(timezone);
    setShowTimezoneDropdown(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setShowTimezoneDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Get selected country object
  const selectedCountryObj = countries.find(c => c.name === selectedCountry);

  return (
    <div className={`space-y-4 ${className}`} ref={dropdownRef}>
      {/* Country Selector */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          <MapPin className="inline w-4 h-4 mr-2" />
          {language === 'ar' ? 'البلد' : 'Country'} {required && '*'}
        </label>
        
        <div className="relative">
          <button
            type="button"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            disabled={disabled}
            className={`
              w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg
              text-white text-left
              focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400
              transition-all duration-300 hover:border-white/30
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}
              ${language === 'ar' ? 'text-right' : 'text-left'}
            `}
            dir={language === 'ar' ? 'rtl' : 'ltr'}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selectedCountryObj ? (
                  <>
                    <span className="text-lg">{selectedCountryObj.flag}</span>
                    <span>{selectedCountryObj.name}</span>
                  </>
                ) : (
                  <span className="text-gray-400">
                    {language === 'ar' ? 'اختر البلد' : 'Select country'}
                  </span>
                )}
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {/* Dropdown */}
          {isOpen && (
            <div className="absolute z-50 w-full mt-1 bg-gray-900/95 backdrop-blur-sm border border-white/20 rounded-lg shadow-xl max-h-64 overflow-hidden">
              {/* Search Input */}
              <div className="p-3 border-b border-white/10">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={language === 'ar' ? 'ابحث عن البلد...' : 'Search country...'}
                    className="w-full pl-10 pr-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-400/50"
                  />
                </div>
              </div>

              {/* Countries List */}
              <div className="max-h-48 overflow-y-auto">
                {filteredCountries.length > 0 ? (
                  filteredCountries.map((country) => (
                    <button
                      key={country.code}
                      type="button"
                      onClick={() => handleCountrySelect(country)}
                      className={`
                        w-full px-4 py-2 text-left hover:bg-white/10 transition-colors
                        flex items-center gap-3
                        ${selectedCountry === country.name ? 'bg-gold-400/20 text-gold-400' : 'text-white'}
                      `}
                    >
                      <span className="text-lg">{country.flag}</span>
                      <span className="flex-1">{country.name}</span>
                      {selectedCountry === country.name && (
                        <Check className="w-4 h-4 text-gold-400" />
                      )}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-gray-400 text-center">
                    {language === 'ar' ? 'لا توجد نتائج' : 'No results found'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-400 flex items-center gap-1">
            <span className="w-1 h-1 bg-red-400 rounded-full"></span>
            {error}
          </p>
        )}
      </div>

      {/* Auto-filled Fields Row */}
      {(showCountryCode || showTimezone) && selectedCountry && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Country Code */}
          {showCountryCode && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                <Phone className="inline w-4 h-4 mr-2" />
                {language === 'ar' ? 'رمز البلد' : 'Country Code'}
              </label>
              <input
                type="text"
                value={selectedCountryCode}
                readOnly
                className="w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg text-gray-300 cursor-not-allowed text-center font-mono"
                placeholder="+961"
              />
              <p className="text-xs text-gray-400">
                {language === 'ar' ? 'يُملأ تلقائياً' : 'Auto-filled'}
              </p>
            </div>
          )}

          {/* Timezone */}
          {showTimezone && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                <Clock className="inline w-4 h-4 mr-2" />
                {language === 'ar' ? 'المنطقة الزمنية' : 'Timezone'}
              </label>
              
              {timezoneOptions.length > 1 ? (
                // Multiple timezones - show dropdown
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowTimezoneDropdown(!showTimezoneDropdown)}
                    className="w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg text-white text-left focus:outline-none focus:ring-2 focus:ring-gold-400/50 transition-all duration-300 hover:border-white/30"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm">
                        {timezoneOptions.find(tz => tz.value === selectedTimezone)?.label || selectedTimezone}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showTimezoneDropdown ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {showTimezoneDropdown && (
                    <div className="absolute z-40 w-full mt-1 bg-gray-900/95 backdrop-blur-sm border border-white/20 rounded-lg shadow-xl max-h-32 overflow-y-auto">
                      {timezoneOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleTimezoneSelect(option.value)}
                          className={`
                            w-full px-4 py-2 text-left text-sm hover:bg-white/10 transition-colors
                            ${selectedTimezone === option.value ? 'bg-gold-400/20 text-gold-400' : 'text-white'}
                          `}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                // Single timezone - show as readonly
                <input
                  type="text"
                  value={timezoneOptions[0]?.label || selectedTimezone}
                  readOnly
                  className="w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg text-gray-300 cursor-not-allowed text-sm"
                  placeholder="Auto-filled"
                />
              )}
              
              <p className="text-xs text-gray-400">
                {timezoneOptions.length > 1 
                  ? (language === 'ar' ? 'اختر المنطقة الزمنية' : 'Select timezone')
                  : (language === 'ar' ? 'يُملأ تلقائياً' : 'Auto-filled')
                }
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SmartCountrySelector; 