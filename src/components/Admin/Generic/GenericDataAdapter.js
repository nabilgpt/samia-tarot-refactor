/**
 * GENERIC DATA ADAPTER - SAMIA TAROT
 * Universal data management adapter for users, decks, and other entities
 * Provides unified interface for different data types with cosmic theme
 */

export class GenericDataAdapter {
  constructor(config) {
    this.entityType = config.entityType; // 'user' or 'deck'
    this.apiService = config.apiService;
    this.entityName = config.entityName;
    this.entityNamePlural = config.entityNamePlural;
    this.columns = config.columns;
    this.filters = config.filters;
    this.actions = config.actions;
    this.cardFields = config.cardFields;
    this.emptyIcon = config.emptyIcon;
    this.getBadgeColor = config.getBadgeColor;
    this.getStatusColor = config.getStatusColor;
    this.getAvatarContent = config.getAvatarContent;
  }

  // Transform raw data for display
  transformData(rawData) {
    return rawData.map(item => ({
      ...item,
      displayData: this.getDisplayData(item)
    }));
  }

  // Get display-specific data for each entity
  getDisplayData(item) {
    switch (this.entityType) {
      case 'user':
        return {
          title: `${item.first_name} ${item.last_name}`,
          subtitle: item.auth_users?.email || item.email,
          avatar: item.first_name?.charAt(0) || 'U',
          primaryBadge: { value: item.role, color: this.getBadgeColor(item.role) },
          statusBadge: { 
            value: item.is_active ? 'Active' : 'Inactive', 
            color: this.getStatusColor(item.is_active) 
          },
          stats: [
            { label: 'Services', value: item.services?.length || 0 },
            { label: 'Bookings', value: (item.bookings_as_client?.length || 0) + (item.bookings_as_reader?.length || 0) },
            { label: 'Country', value: item.country || 'N/A' }
          ]
        };
      
      case 'deck':
        return {
          title: item.name_en || item.name_ar,
          subtitle: item.description_en || item.description_ar,
          avatar: item.name_en?.charAt(0) || item.name_ar?.charAt(0) || 'D',
          primaryBadge: { value: item.deck_type, color: this.getBadgeColor(item.deck_type) },
          statusBadge: { 
            value: item.is_active ? 'Active' : 'Inactive', 
            color: this.getStatusColor(item.is_active) 
          },
          stats: [
            { label: 'Cards', value: item.total_cards || 0 },
            { label: 'Category', value: item.category || 'N/A' },
            { label: 'Readers', value: item.assigned_readers?.length || 0 }
          ]
        };
      
      default:
        return {
          title: item.name || item.title || 'Unknown',
          subtitle: item.description || '',
          avatar: 'U',
          primaryBadge: { value: 'Unknown', color: 'bg-gray-500/20 text-gray-400' },
          statusBadge: { value: 'Unknown', color: 'bg-gray-500/20 text-gray-400' },
          stats: []
        };
    }
  }

  // Apply filters to data
  applyFilters(data, filters) {
    let filtered = [...data];

    // Search filter
    if (filters.search) {
      filtered = filtered.filter(item => {
        const searchFields = this.getSearchFields(item);
        return searchFields.some(field => 
          field?.toLowerCase().includes(filters.search.toLowerCase())
        );
      });
    }

    // Dynamic filters based on entity type
    Object.keys(filters).forEach(filterKey => {
      if (filterKey !== 'search' && filterKey !== 'sortBy' && filterKey !== 'sortOrder' && filters[filterKey]) {
        filtered = filtered.filter(item => {
          if (filterKey === 'is_active' && filters[filterKey] !== '') {
            return item.is_active === (filters[filterKey] === 'true' || filters[filterKey] === true);
          }
          return item[filterKey] === filters[filterKey];
        });
      }
    });

    // Sorting
    if (filters.sortBy) {
      filtered.sort((a, b) => {
        const aVal = a[filters.sortBy] || '';
        const bVal = b[filters.sortBy] || '';
        const order = filters.sortOrder === 'asc' ? 1 : -1;
        
        if (typeof aVal === 'string') {
          return aVal.localeCompare(bVal) * order;
        }
        return (aVal < bVal ? -1 : aVal > bVal ? 1 : 0) * order;
      });
    }

    return filtered;
  }

  // Get searchable fields for each entity type
  getSearchFields(item) {
    switch (this.entityType) {
      case 'user':
        return [
          item.first_name,
          item.last_name,
          item.auth_users?.email || item.email,
          item.phone
        ];
      
      case 'deck':
        return [
          item.name_en,
          item.name_ar,
          item.description_en,
          item.description_ar,
          item.deck_type,
          item.category
        ];
      
      default:
        return [item.name, item.title, item.description];
    }
  }

  // Export data to CSV
  exportToCSV(data, filename) {
    const headers = this.columns.map(col => col.label);
    const csvContent = [
      headers.join(','),
      ...data.map(item => 
        this.columns.map(col => {
          const value = this.getCellValue(item, col.key);
          return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `${this.entityType}-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  // Get cell value for table display
  getCellValue(item, key) {
    switch (key) {
      case 'created_at':
        return new Date(item.created_at).toLocaleDateString();
      case 'status':
        return item.is_active ? 'Active' : 'Inactive';
      case 'fullName':
        return `${item.first_name || ''} ${item.last_name || ''}`.trim();
      case 'email':
        return item.auth_users?.email || item.email || '';
      default:
        return item[key] || '';
    }
  }

  // Get available filter options
  getFilterOptions(data, filterKey) {
    const uniqueValues = [...new Set(data.map(item => item[filterKey]).filter(Boolean))];
    return uniqueValues.map(value => ({
      value,
      label: this.formatFilterLabel(value, filterKey)
    }));
  }

  // Format filter labels
  formatFilterLabel(value, filterKey) {
    switch (filterKey) {
      case 'role':
        const roleLabels = {
          super_admin: 'Super Admin',
          admin: 'Admin',
          reader: 'Reader',
          monitor: 'Monitor',
          client: 'Client'
        };
        return roleLabels[value] || value;
      
      case 'deck_type':
        const typeLabels = {
          'Rider-Waite': 'Rider-Waite',
          'Marseille': 'Marseille',
          'Oracle': 'Oracle',
          'Custom': 'Custom'
        };
        return typeLabels[value] || value;
      
      default:
        return value;
    }
  }

  // Get empty state configuration
  getEmptyState(hasFilters, language = 'en') {
    const messages = {
      en: {
        noData: `No ${this.entityNamePlural.toLowerCase()} found`,
        noResults: `No ${this.entityNamePlural.toLowerCase()} match your current filter criteria.`,
        noDataSub: hasFilters 
          ? `No ${this.entityNamePlural.toLowerCase()} match your current filter criteria.`
          : `No ${this.entityNamePlural.toLowerCase()} are currently registered in the system.`
      },
      ar: {
        noData: this.entityType === 'user' ? 'لا توجد مستخدمين' : 'لا توجد مجموعات تاروت',
        noResults: this.entityType === 'user' 
          ? 'لا توجد مستخدمين تطابق معايير البحث'
          : 'لا توجد مجموعات تطابق معايير البحث',
        noDataSub: hasFilters 
          ? (this.entityType === 'user' 
              ? 'لا توجد مستخدمين تطابق معايير البحث الحالية'
              : 'لا توجد مجموعات تطابق معايير البحث الحالية')
          : (this.entityType === 'user'
              ? 'لا يوجد مستخدمين مسجلين في النظام حالياً'
              : 'لا توجد مجموعات تاروت مسجلة في النظام حالياً')
      }
    };

    return {
      icon: this.emptyIcon,
      title: messages[language].noData,
      subtitle: messages[language].noDataSub
    };
  }
}

// Predefined configurations for different entity types
export const USER_ADAPTER_CONFIG = {
  entityType: 'user',
  entityName: 'User',
  entityNamePlural: 'Users',
  emptyIcon: 'UsersIcon',
  columns: [
    { key: 'fullName', label: 'User', sortable: true },
    { key: 'role', label: 'Role', sortable: true },
    { key: 'status', label: 'Status', sortable: false },
    { key: 'country', label: 'Country', sortable: true },
    { key: 'created_at', label: 'Created', sortable: true }
  ],
  filters: [
    { key: 'search', type: 'search', placeholder: 'Search users...' },
    { key: 'role', type: 'select', label: 'Role', options: 'dynamic' },
    { key: 'country', type: 'input', placeholder: 'Country' },
    { key: 'is_active', type: 'select', label: 'Status', options: [
      { value: '', label: 'All Status' },
      { value: 'true', label: 'Active' },
      { value: 'false', label: 'Inactive' }
    ]}
  ],
  actions: [
    { key: 'view', label: 'View', icon: 'EyeIcon', color: 'text-blue-400 hover:bg-blue-500/20' },
    { key: 'edit', label: 'Edit', icon: 'PencilIcon', color: 'text-green-400 hover:bg-green-500/20' },
    { key: 'password', label: 'Change Password', icon: 'KeyIcon', color: 'text-yellow-400 hover:bg-yellow-500/20' },
    { key: 'delete', label: 'Delete', icon: 'TrashIcon', color: 'text-red-400 hover:bg-red-500/20' }
  ],
  getBadgeColor: (role) => {
    const colors = {
      super_admin: 'bg-red-500/20 text-red-400 border-red-500/30',
      admin: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      monitor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      reader: 'bg-green-500/20 text-green-400 border-green-500/30',
      client: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    };
    return colors[role] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  },
  getStatusColor: (isActive) => {
    return isActive 
      ? 'bg-green-500/20 text-green-400 border-green-500/30'
      : 'bg-red-500/20 text-red-400 border-red-500/30';
  }
};

export const DECK_ADAPTER_CONFIG = {
  entityType: 'deck',
  entityName: 'Deck',
  entityNamePlural: 'Decks',
  emptyIcon: 'CrownIcon',
  columns: [
    { key: 'name', label: 'Deck Name', sortable: true },
    { key: 'deck_type', label: 'Type', sortable: true },
    { key: 'status', label: 'Status', sortable: false },
    { key: 'total_cards', label: 'Cards', sortable: true },
    { key: 'created_at', label: 'Created', sortable: true }
  ],
  filters: [
    { key: 'search', type: 'search', placeholder: 'Search decks...' },
    { key: 'deck_type', type: 'select', label: 'Type', options: 'dynamic' },
    { key: 'category', type: 'select', label: 'Category', options: 'dynamic' },
    { key: 'visibility_type', type: 'select', label: 'Visibility', options: 'dynamic' },
    { key: 'is_active', type: 'select', label: 'Status', options: [
      { value: '', label: 'All Status' },
      { value: 'true', label: 'Active' },
      { value: 'false', label: 'Inactive' }
    ]}
  ],
  actions: [
    { key: 'edit', label: 'Edit', icon: 'PencilIcon', color: 'text-green-400 hover:bg-green-500/20' },
    { key: 'assign', label: 'Assign Readers', icon: 'UserPlusIcon', color: 'text-blue-400 hover:bg-blue-500/20' },
    { key: 'view', label: 'View Details', icon: 'EyeIcon', color: 'text-purple-400 hover:bg-purple-500/20' },
    { key: 'delete', label: 'Delete', icon: 'TrashIcon', color: 'text-red-400 hover:bg-red-500/20' }
  ],
  getBadgeColor: (type) => {
    const colors = {
      'Rider-Waite': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'Marseille': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'Oracle': 'bg-green-500/20 text-green-400 border-green-500/30',
      'Custom': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    };
    return colors[type] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  },
  getStatusColor: (isActive) => {
    return isActive 
      ? 'bg-green-500/20 text-green-400 border-green-500/30'
      : 'bg-red-500/20 text-red-400 border-red-500/30';
  }
}; 