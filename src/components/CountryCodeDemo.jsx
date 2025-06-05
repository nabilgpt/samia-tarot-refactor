import React, { useState, useEffect } from 'react';
import { getCountryList, getCountryCode } from '../utils/countryHelpers';

const CountryCodeDemo = () => {
  const [selectedCountry, setSelectedCountry] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const countryList = getCountryList();

  useEffect(() => {
    if (selectedCountry) {
      const code = getCountryCode(selectedCountry);
      setCountryCode(code);
    } else {
      setCountryCode('');
    }
  }, [selectedCountry]);

  return (
    <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        🌍 Country Code Auto-fill Demo
      </h3>
      
      <div className="space-y-4">
        {/* Country Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Country:
          </label>
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="form-select w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">Choose a country...</option>
            {countryList.slice(0, 20).map(country => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </div>

        {/* Auto-filled Country Code */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Country Code (Auto-filled):
          </label>
          <input
            type="text"
            value={countryCode}
            readOnly
            className="country-code-field w-full px-3 py-2 border border-gray-200 rounded-lg cursor-not-allowed font-bold text-center"
            placeholder="Select country to see code"
          />
        </div>

        {/* Example */}
        {selectedCountry && countryCode && (
          <div className="p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg">
            <p className="text-sm text-green-700 dark:text-green-300">
              <strong>Example:</strong> {countryCode} + your phone number
            </p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              For {selectedCountry}: {countryCode} 123456789
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CountryCodeDemo; 