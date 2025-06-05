import React from 'react';
import { 
  UserIcon, 
  CalendarIcon, 
  PhoneIcon, 
  GlobeAltIcon,
  EnvelopeIcon,
  HomeIcon,
  CogIcon,
  HeartIcon
} from '@heroicons/react/24/outline';

import {
  UserIcon as UserIconSolid,
  CalendarIcon as CalendarIconSolid,
  PhoneIcon as PhoneIconSolid,
  GlobeAltIcon as GlobeAltIconSolid
} from '@heroicons/react/24/solid';

/**
 * Working Example Component for Heroicons
 * Demonstrates correct import and usage of @heroicons/react v2+
 */
const HeroiconsExample = () => {
  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        🎯 Heroicons Working Examples
      </h2>
      
      {/* Outline Icons Section */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-gray-700">
          📝 Outline Icons (24px)
        </h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="flex flex-col items-center p-4 border rounded-lg">
            <UserIcon className="w-8 h-8 text-blue-500 mb-2" />
            <span className="text-sm text-gray-600">UserIcon</span>
          </div>
          <div className="flex flex-col items-center p-4 border rounded-lg">
            <CalendarIcon className="w-8 h-8 text-green-500 mb-2" />
            <span className="text-sm text-gray-600">CalendarIcon</span>
          </div>
          <div className="flex flex-col items-center p-4 border rounded-lg">
            <PhoneIcon className="w-8 h-8 text-purple-500 mb-2" />
            <span className="text-sm text-gray-600">PhoneIcon</span>
          </div>
          <div className="flex flex-col items-center p-4 border rounded-lg">
            <GlobeAltIcon className="w-8 h-8 text-orange-500 mb-2" />
            <span className="text-sm text-gray-600">GlobeAltIcon</span>
          </div>
          <div className="flex flex-col items-center p-4 border rounded-lg">
            <EnvelopeIcon className="w-8 h-8 text-red-500 mb-2" />
            <span className="text-sm text-gray-600">EnvelopeIcon</span>
          </div>
          <div className="flex flex-col items-center p-4 border rounded-lg">
            <HomeIcon className="w-8 h-8 text-indigo-500 mb-2" />
            <span className="text-sm text-gray-600">HomeIcon</span>
          </div>
          <div className="flex flex-col items-center p-4 border rounded-lg">
            <CogIcon className="w-8 h-8 text-gray-500 mb-2" />
            <span className="text-sm text-gray-600">CogIcon</span>
          </div>
          <div className="flex flex-col items-center p-4 border rounded-lg">
            <HeartIcon className="w-8 h-8 text-pink-500 mb-2" />
            <span className="text-sm text-gray-600">HeartIcon</span>
          </div>
        </div>
      </div>

      {/* Solid Icons Section */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-gray-700">
          🔴 Solid Icons (24px)
        </h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="flex flex-col items-center p-4 border rounded-lg bg-blue-50">
            <UserIconSolid className="w-8 h-8 text-blue-600 mb-2" />
            <span className="text-sm text-gray-600">UserIcon (Solid)</span>
          </div>
          <div className="flex flex-col items-center p-4 border rounded-lg bg-green-50">
            <CalendarIconSolid className="w-8 h-8 text-green-600 mb-2" />
            <span className="text-sm text-gray-600">CalendarIcon (Solid)</span>
          </div>
          <div className="flex flex-col items-center p-4 border rounded-lg bg-purple-50">
            <PhoneIconSolid className="w-8 h-8 text-purple-600 mb-2" />
            <span className="text-sm text-gray-600">PhoneIcon (Solid)</span>
          </div>
          <div className="flex flex-col items-center p-4 border rounded-lg bg-orange-50">
            <GlobeAltIconSolid className="w-8 h-8 text-orange-600 mb-2" />
            <span className="text-sm text-gray-600">GlobeAltIcon (Solid)</span>
          </div>
        </div>
      </div>

      {/* Code Examples */}
      <div className="bg-gray-100 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3 text-gray-700">
          💻 Code Examples
        </h3>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-600 mb-2">✅ Correct Import (v2+):</h4>
            <code className="block bg-white p-3 rounded border text-sm">
              {`import { UserIcon, CalendarIcon } from '@heroicons/react/24/outline';`}
            </code>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-600 mb-2">✅ Correct Usage:</h4>
            <code className="block bg-white p-3 rounded border text-sm">
              {`<UserIcon className="w-6 h-6 text-blue-500" />`}
            </code>
          </div>

          <div>
            <h4 className="font-medium text-gray-600 mb-2">✅ Solid Icons:</h4>
            <code className="block bg-white p-3 rounded border text-sm">
              {`import { UserIcon } from '@heroicons/react/24/solid';`}
            </code>
          </div>

          <div>
            <h4 className="font-medium text-gray-600 mb-2">✅ Mini Icons (20px):</h4>
            <code className="block bg-white p-3 rounded border text-sm">
              {`import { UserIcon } from '@heroicons/react/20/solid';`}
            </code>
          </div>
        </div>
      </div>

      {/* Usage in Form Fields Example */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3 text-blue-800">
          📋 Form Field Examples (like in ProfilePage)
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <UserIcon className="w-5 h-5 text-blue-600" />
            <input 
              type="text" 
              placeholder="First Name" 
              className="px-3 py-2 border rounded-lg flex-1"
            />
          </div>
          
          <div className="flex items-center space-x-3">
            <CalendarIcon className="w-5 h-5 text-green-600" />
            <input 
              type="date" 
              className="px-3 py-2 border rounded-lg flex-1"
            />
          </div>
          
          <div className="flex items-center space-x-3">
            <PhoneIcon className="w-5 h-5 text-purple-600" />
            <input 
              type="tel" 
              placeholder="Phone Number" 
              className="px-3 py-2 border rounded-lg flex-1"
            />
          </div>
          
          <div className="flex items-center space-x-3">
            <GlobeAltIcon className="w-5 h-5 text-orange-600" />
            <select className="px-3 py-2 border rounded-lg flex-1">
              <option>Select Country</option>
              <option>Saudi Arabia</option>
              <option>UAE</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroiconsExample; 