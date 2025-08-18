import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../../context/LanguageContext';
import { SearchInput } from '../../UI/BilingualFormComponents';
import {
  Users,
  Search,
  Filter,
  Edit,
  Ban,
  CheckCircle,
  XCircle,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Star,
  Eye,
  MoreHorizontal,
  UserPlus,
  Download,
  Shield,
  Crown,
  Trash2
} from 'lucide-react';

/**
 * GENERIC DATA CARDS - SAMIA TAROT
 * Reusable card/grid component for Admin-style data management
 * Supports users, decks, and other entities with glassmorphism cosmic theme
 */

const GenericDataCards = ({
  adapter,
  data = [],
  loading = false,
  error = null,
  message = '',
  onRefresh,
  onExport,
  onAction,
  onFiltersChange,
  filters = {},
  selectedItems = [],
  onSelectionChange,
  showFilters: externalShowFilters,
  className = ''
}) => {
  const { currentLanguage } = useLanguage();
  const [filteredData, setFilteredData] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // Use external showFilters prop if provided, otherwise use internal state
  const filtersVisible = externalShowFilters !== undefined ? externalShowFilters : showFilters;

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.1,
        staggerChildren: 0.05
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

  useEffect(() => {
    if (adapter && data) {
      const transformed = adapter.transformData(data);
      const filtered = adapter.applyFilters(transformed, filters);
      setFilteredData(filtered);
    }
  }, [adapter, data, filters]);

  // Icon mapping
  const iconMap = {
    Users,
    Crown,
    Eye,
    Edit,
    Trash2,
    UserPlus,
    Mail,
    Phone,
    MapPin,
    Calendar,
    Star,
    Ban,
    CheckCircle,
    Download,
    Filter,
    MoreHorizontal
  };

  const getIcon = (iconName) => {
    return iconMap[iconName] || Users;
  };

  // Handle bulk actions
  const handleBulkAction = (action) => {
    if (selectedItems.length === 0) {
      return;
    }
    onAction(`bulk_${action}`, selectedItems);
  };

  // Handle item selection
  const handleItemSelection = (itemId, selected) => {
    if (selected) {
      onSelectionChange([...selectedItems, itemId]);
    } else {
      onSelectionChange(selectedItems.filter(id => id !== itemId));
    }
  };

  // Handle select all
  const handleSelectAll = (selected) => {
    if (selected) {
      onSelectionChange(filteredData.map(item => item.id));
    } else {
      onSelectionChange([]);
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400"></div>
      </div>
    );
  }

  // Render filter controls
  const renderFilters = () => (
    <AnimatePresence>
      {filtersVisible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
        >
          <div className="glassmorphism rounded-2xl p-6 border border-white/10 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {adapter.filters.map((filter) => {
                switch (filter.type) {
                  case 'search':
                    return (
                      <SearchInput
                        key={filter.key}
                        value={filters[filter.key] || ''}
                        onChange={(value) => onFiltersChange({ ...filters, [filter.key]: value })}
                        placeholder={filter.placeholder}
                        className="bg-white/10 border-white/20 focus:border-gold-400"
                      />
                    );
                  
                  case 'select':
                    const options = filter.options === 'dynamic' 
                      ? adapter.getFilterOptions(data, filter.key)
                      : filter.options;

                    return (
                      <select
                        key={filter.key}
                        value={filters[filter.key] || ''}
                        onChange={(e) => onFiltersChange({ ...filters, [filter.key]: e.target.value })}
                        className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-gold-400 focus:outline-none"
                      >
                        {options.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    );
                  
                  case 'input':
                    return (
                      <input
                        key={filter.key}
                        type="text"
                        placeholder={filter.placeholder}
                        value={filters[filter.key] || ''}
                        onChange={(e) => onFiltersChange({ ...filters, [filter.key]: e.target.value })}
                        className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-gold-400 focus:outline-none"
                      />
                    );
                  
                  default:
                    return null;
                }
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Render bulk actions bar
  const renderBulkActions = () => (
    selectedItems.length > 0 && (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glassmorphism rounded-2xl p-4 border border-gold-400/30 mb-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-white font-medium">
              {selectedItems.length} {currentLanguage === 'ar' ? 'عنصر محدد' : 'items selected'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleBulkAction('activate')}
              className="flex items-center space-x-2 px-3 md:px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 min-h-[44px] bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 whitespace-nowrap"
            >
              <CheckCircle className="w-4 h-4" />
              <span className="hidden md:inline">{currentLanguage === 'ar' ? 'تفعيل' : 'Activate'}</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleBulkAction('deactivate')}
              className="flex items-center space-x-2 px-3 md:px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 min-h-[44px] bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 whitespace-nowrap"
            >
              <XCircle className="w-4 h-4" />
              <span className="hidden md:inline">{currentLanguage === 'ar' ? 'إلغاء تفعيل' : 'Deactivate'}</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleBulkAction('export')}
              className="flex items-center space-x-2 px-3 md:px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 min-h-[44px] bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              <span className="hidden md:inline">{currentLanguage === 'ar' ? 'تصدير' : 'Export'}</span>
            </motion.button>
          </div>
        </div>
      </motion.div>
    )
  );

  // Render empty state
  const renderEmptyState = () => {
    const hasFilters = Object.values(filters).some(v => v && v !== '');
    const emptyState = adapter.getEmptyState(hasFilters, currentLanguage);
    const EmptyIcon = getIcon(emptyState.icon);

    return (
      <div className="text-center py-16">
        <div className="w-24 h-24 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <EmptyIcon className="w-12 h-12 text-purple-400" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-4">{emptyState.title}</h3>
        <p className="text-gray-400 text-lg mb-8">{emptyState.subtitle}</p>
        {hasFilters && (
          <button
            onClick={() => onFiltersChange({})}
            className="flex items-center space-x-2 px-3 md:px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 min-h-[44px] bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-300 border border-red-400/30 hover:bg-gradient-to-r hover:from-red-500/30 hover:to-pink-500/30 hover:border-red-400/50"
          >
            <Filter className="w-4 h-4" />
            <span>{currentLanguage === 'ar' ? 'مسح الفلاتر' : 'Clear Filters'}</span>
          </button>
        )}
      </div>
    );
  };

  // Render card item
  const renderCard = (item) => (
    <motion.div
      key={item.id}
      variants={itemVariants}
      whileHover={{ scale: 1.02, y: -5 }}
      className="glassmorphism rounded-2xl p-6 border border-white/10 hover:border-gold-400/30 transition-all duration-300 group"
    >
      {/* Card Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={selectedItems.includes(item.id)}
            onChange={(e) => handleItemSelection(item.id, e.target.checked)}
            className="w-4 h-4 text-gold-400 bg-white/10 border-white/20 rounded focus:ring-gold-400/50"
          />
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">
              {item.displayData.avatar}
            </span>
          </div>
        </div>
        
        {/* Action dropdown */}
        <div className="relative group">
          <button className="p-2 text-gray-400 hover:text-white transition-colors">
            <MoreHorizontal className="w-5 h-5" />
          </button>
          <div className="absolute right-0 top-0 mt-8 w-48 bg-gray-800 rounded-lg shadow-xl border border-white/20 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
            <div className="p-2 space-y-1">
              {adapter.actions.map((action) => {
                const ActionIcon = getIcon(action.icon);
                return (
                  <button
                    key={action.key}
                    onClick={() => onAction(action.key, item)}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/10 rounded-md transition-colors"
                  >
                    <ActionIcon className="w-4 h-4" />
                    <span>{action.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="space-y-3">
        {/* Title and status */}
        <div>
          <h3 className="text-lg font-semibold text-white group-hover:text-gold-300 transition-colors">
            {item.displayData.title}
          </h3>
          <div className="flex items-center space-x-2 mt-1">
            <div className={`w-2 h-2 rounded-full ${item.is_active ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <span className={`text-sm ${item.is_active ? 'text-green-400' : 'text-red-400'}`}>
              {item.displayData.statusBadge.value}
            </span>
          </div>
        </div>

        {/* Subtitle */}
        <p className="text-gray-400 text-sm line-clamp-2">
          {item.displayData.subtitle}
        </p>

        {/* Primary badge */}
        <div>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${item.displayData.primaryBadge.color}`}>
            <Shield className="w-3 h-3 mr-1" />
            {item.displayData.primaryBadge.value}
          </span>
        </div>

        {/* Contact info and details */}
        <div className="space-y-2 text-sm text-gray-400">
          {adapter.entityType === 'user' && (
            <>
              {item.auth_users?.email && (
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4" />
                  <span>{item.auth_users.email}</span>
                </div>
              )}
              {item.phone && (
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4" />
                  <span>{item.phone}</span>
                </div>
              )}
              {item.country && (
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4" />
                  <span>{item.country}</span>
                </div>
              )}
            </>
          )}
          
          {adapter.entityType === 'deck' && (
            <>
              <div className="flex items-center space-x-2">
                <span className="font-medium">Category:</span>
                <span>{item.category || 'N/A'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-medium">Visibility:</span>
                <span>{item.visibility_type || 'N/A'}</span>
              </div>
            </>
          )}

          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4" />
            <span>
              {currentLanguage === 'ar' ? 'انضم في' : 'Created'} {new Date(item.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Stats section */}
        {item.displayData.stats.length > 0 && (
          <div className="flex items-center justify-between pt-3 border-t border-white/10">
            {item.displayData.stats.map((stat, index) => (
              <div key={index} className="text-center">
                <p className="text-lg font-semibold text-white">{stat.value}</p>
                <p className="text-xs text-gray-400">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Special stats for readers */}
        {adapter.entityType === 'user' && item.role === 'reader' && (
          <div className="flex items-center justify-between pt-3 border-t border-white/10">
            <div className="text-center">
              <p className="text-lg font-semibold text-white">{item.bookings_count || 0}</p>
              <p className="text-xs text-gray-400">{currentLanguage === 'ar' ? 'حجز' : 'Bookings'}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span className="text-lg font-semibold text-white">{item.rating || 'N/A'}</span>
              </div>
              <p className="text-xs text-gray-400">{currentLanguage === 'ar' ? 'تقييم' : 'Rating'}</p>
            </div>
          </div>
        )}

        {/* Special stats for clients */}
        {adapter.entityType === 'user' && item.role === 'client' && item.total_spent && (
          <div className="pt-3 border-t border-white/10">
            <div className="text-center">
              <p className="text-lg font-semibold text-green-400">${item.total_spent}</p>
              <p className="text-xs text-gray-400">{currentLanguage === 'ar' ? 'إجمالي المبلغ' : 'Total Spent'}</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`space-y-6 ${className}`}
    >
      {/* Header - Only show for non-deck entities */}
      {adapter.entityType !== 'deck' && (
        <motion.div
          variants={itemVariants}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
        >
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent">
              {currentLanguage === 'ar' 
                ? `إدارة ${adapter.entityType === 'user' ? 'المستخدمين' : 'مجموعات التاروت'}`
                : `${adapter.entityNamePlural} Management`
              }
            </h2>
            <p className="text-gray-400 mt-1">
              {currentLanguage === 'ar' 
                ? `إدارة جميع ${adapter.entityType === 'user' ? 'المستخدمين والأدوار' : 'مجموعات التاروت'} في النظام`
                : `Manage all ${adapter.entityNamePlural.toLowerCase()} and roles in the system`
              }
            </p>
          </div>
        
          <div className="flex items-center space-x-3">
            {onExport && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onExport(filteredData)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/30 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>{currentLanguage === 'ar' ? 'تصدير' : 'Export'}</span>
              </motion.button>
            )}
            
            {externalShowFilters === undefined && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center space-x-2 px-4 py-2 ${filtersVisible ? 'bg-gold-500/20 text-gold-400 border-gold-500/30' : 'bg-purple-500/20 text-purple-400 border-purple-500/30'} rounded-lg hover:bg-opacity-30 transition-colors`}
              >
                <Filter className="w-4 h-4" />
                <span>{currentLanguage === 'ar' ? 'فلاتر' : 'Filters'}</span>
              </motion.button>
            )}
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onRefresh}
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {loading ? (currentLanguage === 'ar' ? 'جاري التحديث...' : 'Loading...') : (currentLanguage === 'ar' ? 'تحديث' : 'Refresh')}
            </motion.button>
          </div>
        </motion.div>
      )}



      {/* Filters */}
      {renderFilters()}

      {/* Bulk Actions */}
      {renderBulkActions()}

      {/* Message Display */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`p-4 rounded-lg ${
            message.includes('Error') || message.includes('failed') 
              ? 'bg-red-500/20 border border-red-500/30 text-red-300' 
              : 'bg-green-500/20 border border-green-500/30 text-green-300'
          }`}
        >
          {message}
        </motion.div>
      )}

      {/* Cards Grid */}
      {error && data.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-red-400">{error}</p>
        </div>
      ) : filteredData.length === 0 ? (
        renderEmptyState()
      ) : (
        <>
          {/* Select All */}
          <div className="flex items-center space-x-3 mb-4">
            <input
              type="checkbox"
              checked={selectedItems.length === filteredData.length && filteredData.length > 0}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="w-4 h-4 text-gold-400 bg-white/10 border-white/20 rounded focus:ring-gold-400/50"
            />
            <span className="text-gray-400">
              {currentLanguage === 'ar' ? 'تحديد الكل' : 'Select All'} ({filteredData.length})
            </span>
          </div>

          {/* Cards Grid */}
          <motion.div
            variants={containerVariants}
            className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
          >
            {filteredData.map(renderCard)}
          </motion.div>
        </>
      )}
    </motion.div>
  );
};

export default GenericDataCards; 