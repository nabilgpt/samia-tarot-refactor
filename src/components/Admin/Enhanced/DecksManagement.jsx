import React from 'react';
import { motion } from 'framer-motion';
import { 
  Plus,
  RefreshCw,
  Eye,
  Edit3,
  Trash2,
  Loader,
  Filter,
  Users,
  Crown,
  Star,
  Settings
} from 'lucide-react';

/**
 * ==========================================
 * SAMIA TAROT - DECKS MANAGEMENT COMPONENT
 * Admin-Enhanced Deck Management with Visibility Controls
 * PIXEL-PERFECT REPLICA of SpreadsManagement for Decks
 * ==========================================
 */

const DecksManagement = ({
  decks,
  categories,
  readers,
  filters,
  setFilters,
  loading,
  onAdd,
  onEdit,
  onView,
  onDelete,
  onAssignReaders,
  renderVisibilityBadge,
  currentLanguage
}) => {

  return (
    <div className="space-y-6">
      {/* Header - Same structure as Reader Spreads */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-bold text-white">
            {currentLanguage === 'ar' ? 'إدارة مجموعات التاروت' : 'Tarot Decks Management'}
          </h3>
          <span className="text-gray-400 text-sm">
            ({decks.length} {currentLanguage === 'ar' ? 'مجموعة' : 'decks'})
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.location.reload()}
            disabled={loading}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {currentLanguage === 'ar' ? 'تحديث' : 'Refresh'}
          </button>
          
          <button
            onClick={onAdd}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {currentLanguage === 'ar' ? 'إضافة مجموعة' : 'Add Deck'}
          </button>
        </div>
      </div>

      {/* Enhanced Filters - Same structure as Reader Spreads but with admin options */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-black/30 rounded-lg border border-purple-500/20">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={currentLanguage === 'ar' ? 'البحث...' : 'Search...'}
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="w-full bg-dark-700 border border-gray-600 rounded px-3 py-1 text-white placeholder-gray-400"
          />
        </div>

        <select
          value={filters.type}
          onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
          className="bg-dark-700 border border-gray-600 rounded px-3 py-1 text-white"
        >
          <option value="all">
            {currentLanguage === 'ar' ? 'جميع الأنواع' : 'All Types'}
          </option>
          <option value="rider-waite">
            {currentLanguage === 'ar' ? 'رايدر-وايت' : 'Rider-Waite'}
          </option>
          <option value="marseille">
            {currentLanguage === 'ar' ? 'مارسيليا' : 'Marseille'}
          </option>
          <option value="thoth">
            {currentLanguage === 'ar' ? 'توت' : 'Thoth'}
          </option>
          <option value="wild-unknown">
            {currentLanguage === 'ar' ? 'البري المجهول' : 'Wild Unknown'}
          </option>
          <option value="moonchild">
            {currentLanguage === 'ar' ? 'طفل القمر' : 'Moonchild'}
          </option>
          <option value="starchild">
            {currentLanguage === 'ar' ? 'طفل النجوم' : 'Starchild'}
          </option>
          <option value="moroccan">
            {currentLanguage === 'ar' ? 'مغربي' : 'Moroccan'}
          </option>
          <option value="custom">
            {currentLanguage === 'ar' ? 'مخصص' : 'Custom'}
          </option>
        </select>

        <select
          value={filters.category}
          onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
          className="bg-dark-700 border border-gray-600 rounded px-3 py-1 text-white"
        >
          <option value="all">
            {currentLanguage === 'ar' ? 'جميع الفئات' : 'All Categories'}
          </option>
          {categories.map((category) => (
            <option key={category.id} value={category.name}>
              {currentLanguage === 'ar' ? category.name_ar || category.name : category.name}
            </option>
          ))}
        </select>

        {/* Admin-only Visibility Filter */}
        <select
          value={filters.visibility}
          onChange={(e) => setFilters(prev => ({ ...prev, visibility: e.target.value }))}
          className="bg-dark-700 border border-gray-600 rounded px-3 py-1 text-white"
        >
          <option value="all">
            {currentLanguage === 'ar' ? 'جميع الرؤية' : 'All Visibility'}
          </option>
          <option value="public">
            {currentLanguage === 'ar' ? 'عام' : 'Public'}
          </option>
          <option value="private">
            {currentLanguage === 'ar' ? 'خاص' : 'Private'}
          </option>
          <option value="assigned">
            {currentLanguage === 'ar' ? 'مخصص' : 'Assigned'}
          </option>
        </select>

        {/* Admin-only Status Filter */}
        <select
          value={filters.status}
          onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
          className="bg-dark-700 border border-gray-600 rounded px-3 py-1 text-white"
        >
          <option value="all">
            {currentLanguage === 'ar' ? 'جميع الحالات' : 'All Status'}
          </option>
          <option value="draft">
            {currentLanguage === 'ar' ? 'مسودة' : 'Draft'}
          </option>
          <option value="pending">
            {currentLanguage === 'ar' ? 'في الانتظار' : 'Pending'}
          </option>
          <option value="active">
            {currentLanguage === 'ar' ? 'نشط' : 'Active'}
          </option>
          <option value="inactive">
            {currentLanguage === 'ar' ? 'غير نشط' : 'Inactive'}
          </option>
        </select>
      </div>

      {/* Content Area - Same structure as Reader Spreads */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 text-purple-400 animate-spin" />
        </div>
      ) : decks.length === 0 ? (
        /* Empty State - Same as Reader Spreads */
        <div className="text-center py-12">
          <Crown className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-white mb-2">
            {currentLanguage === 'ar' ? 'لا توجد مجموعات' : 'No decks available'}
          </h3>
          <p className="text-gray-400 mb-4">
            {currentLanguage === 'ar' 
              ? 'ابدأ بإنشاء مجموعة التاروت الأولى.'
              : 'Start by creating your first tarot deck.'
            }
          </p>
          <button
            onClick={onAdd}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            {currentLanguage === 'ar' ? 'إنشاء أول مجموعة' : 'Create First Deck'}
          </button>
        </div>
      ) : (
        /* Decks Grid - Enhanced with Admin Features */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {decks.map((deck) => (
            <motion.div
              key={deck.id}
              layout
              className="p-4 bg-black/30 backdrop-blur-sm rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-all"
            >
              {/* Header with Featured Badge */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white">
                      {currentLanguage === 'ar' ? deck.name_ar || deck.name : deck.name}
                    </h3>
                    {deck.is_featured && (
                      <Star className="w-4 h-4 text-yellow-400" />
                    )}
                  </div>
                  <p className="text-purple-400 text-sm">
                    {currentLanguage === 'ar' ? deck.description_ar || deck.description : deck.description}
                  </p>
                </div>
              </div>

              {/* Admin Status Badges */}
              <div className="flex flex-wrap gap-2 mb-3">
                {renderVisibilityBadge(deck.visibility_type, deck.deck_assignments?.length || 0)}
                
                <span className={`px-2 py-1 rounded text-xs border ${
                  deck.status === 'active' 
                    ? 'bg-green-500/20 text-green-300 border-green-400/30'
                    : deck.status === 'pending'
                    ? 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30'
                    : deck.status === 'draft'
                    ? 'bg-blue-500/20 text-blue-300 border-blue-400/30'
                    : 'bg-red-500/20 text-red-300 border-red-400/30'
                }`}>
                  {deck.status === 'active' 
                    ? (currentLanguage === 'ar' ? 'نشط' : 'Active')
                    : deck.status === 'pending'
                    ? (currentLanguage === 'ar' ? 'في الانتظار' : 'Pending')
                    : deck.status === 'draft'
                    ? (currentLanguage === 'ar' ? 'مسودة' : 'Draft')
                    : (currentLanguage === 'ar' ? 'غير نشط' : 'Inactive')
                  }
                </span>
              </div>

              {/* Deck Details - Same as Reader Spreads */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">
                    {currentLanguage === 'ar' ? 'النوع:' : 'Type:'}
                  </span>
                  <span className="text-white">{deck.deck_type || 'Custom'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">
                    {currentLanguage === 'ar' ? 'الأوراق:' : 'Cards:'}
                  </span>
                  <span className="text-white">{deck.total_cards || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">
                    {currentLanguage === 'ar' ? 'الاستخدام:' : 'Usage:'}
                  </span>
                  <span className="text-white">{deck.usage_count || 0}</span>
                </div>
                {deck.deck_assignments?.length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">
                      {currentLanguage === 'ar' ? 'مخصص لـ:' : 'Assigned to:'}
                    </span>
                    <span className="text-white">{deck.deck_assignments.length} readers</span>
                  </div>
                )}
              </div>

              {/* Enhanced Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onEdit(deck)}
                  className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  {currentLanguage === 'ar' ? 'تعديل' : 'Edit'}
                </button>
                
                <button
                  onClick={() => onAssignReaders(deck)}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  {currentLanguage === 'ar' ? 'تخصيص' : 'Assign'}
                </button>
                
                <button
                  onClick={() => onView(deck)}
                  className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  {currentLanguage === 'ar' ? 'عرض' : 'View'}
                </button>
                
                <button
                  onClick={() => onDelete(deck)}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  {currentLanguage === 'ar' ? 'حذف' : 'Delete'}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DecksManagement; 