import React, { useState, useEffect } from 'react';
import { serviceHelpers } from '../../lib/supabase.js';

const ServiceSelector = ({ onServiceSelect, selectedService }) => {
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadServices();
  }, []);

  useEffect(() => {
    filterServices();
  }, [services, filter, searchTerm]);

  const loadServices = async () => {
    try {
      const result = await serviceHelpers.getAllServices();
      if (result.data) {
        setServices(result.data);
      }
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterServices = () => {
    let filtered = services;

    // Filter by type
    if (filter !== 'all') {
      filtered = filtered.filter(service => service.type === filter);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(service =>
        service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredServices(filtered);
  };

  const getServiceIcon = (type) => {
    switch (type) {
      case 'tarot': return '🔮';
      case 'coffee': return '☕';
      case 'palm': return '✋';
      case 'dream': return '💭';
      case 'call': return '📞';
      default: return '🌟';
    }
  };

  const getServiceTypeColor = (type) => {
    switch (type) {
      case 'tarot': return 'bg-purple-100 text-purple-800';
      case 'coffee': return 'bg-amber-100 text-amber-800';
      case 'palm': return 'bg-green-100 text-green-800';
      case 'dream': return 'bg-blue-100 text-blue-800';
      case 'call': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Service</h2>
        <p className="text-gray-600">Select the type of reading that speaks to your soul</p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search services..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <div className="sm:w-48">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="all">All Services</option>
            <option value="tarot">Tarot Reading</option>
            <option value="coffee">Coffee Reading</option>
            <option value="palm">Palm Reading</option>
            <option value="dream">Dream Analysis</option>
            <option value="call">Voice Call</option>
          </select>
        </div>
      </div>

      {/* Services Grid */}
      {filteredServices.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <div
              key={service.id}
              onClick={() => onServiceSelect(service)}
              className={`relative p-6 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-lg ${
                selectedService?.id === service.id
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-purple-300'
              }`}
            >
              {/* VIP Badge */}
              {service.is_vip && (
                <div className="absolute top-4 right-4">
                  <span className="px-2 py-1 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white text-xs font-bold rounded-full">
                    VIP
                  </span>
                </div>
              )}

              {/* Service Icon */}
              <div className="text-4xl mb-4 text-center">
                {getServiceIcon(service.type)}
              </div>

              {/* Service Info */}
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{service.name}</h3>
                
                {/* Service Type */}
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mb-3 ${getServiceTypeColor(service.type)}`}>
                  {service.type.charAt(0).toUpperCase() + service.type.slice(1)}
                </span>

                {/* Description */}
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                  {service.description}
                </p>

                {/* Duration and Price */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    {service.duration_minutes} min
                  </span>
                  <div className="text-2xl font-bold text-purple-600">
                    ${service.price} USD
                    <div className="text-xs text-gray-500 mt-1" id={`currency-${service.id}`}>
                      {/* Local currency will be loaded here */}
                    </div>
                  </div>
                </div>

                {/* AI Badge */}
                {service.is_ai && (
                  <div className="mt-3">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                      🤖 AI Enhanced
                    </span>
                  </div>
                )}
              </div>

              {/* Selection Indicator */}
              {selectedService?.id === service.id && (
                <div className="absolute top-2 left-2">
                  <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <span className="text-6xl mb-4 block">🔍</span>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No services found</h3>
          <p className="text-gray-600">Try adjusting your search or filter criteria</p>
        </div>
      )}

      {/* Service Details Modal/Expanded View */}
      {selectedService && (
        <div className="mt-8 p-6 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {getServiceIcon(selectedService.type)} {selectedService.name}
              </h3>
              <p className="text-gray-700 mb-4">{selectedService.description}</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Duration:</span>
                  <p className="text-gray-900">{selectedService.duration_minutes} minutes</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Price:</span>
                  <p className="text-gray-900 font-bold">${selectedService.price}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Type:</span>
                  <p className="text-gray-900 capitalize">{selectedService.type}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Level:</span>
                  <p className="text-gray-900">{selectedService.is_vip ? 'VIP' : 'Standard'}</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => onServiceSelect(null)}
              className="ml-4 p-2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceSelector; 