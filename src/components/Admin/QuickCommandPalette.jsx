import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Command, ArrowRight, User, FileText, Settings, BarChart3, Users, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const QuickCommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { profile } = useAuth();
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Check if user has admin access
  const hasAdminAccess = profile?.role === 'admin' || profile?.role === 'super_admin';

  // Keyboard shortcut handler
  const handleKeyDown = useCallback((event) => {
    // Ctrl+K or Cmd+K to open palette
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      setIsOpen(true);
    }
    
    // Escape to close
    if (event.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
      setSelectedIndex(0);
    }
  }, []);

  // Register keyboard shortcuts
  useEffect(() => {
    if (hasAdminAccess) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown, hasAdminAccess]);

  // Focus input when palette opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle search with debouncing
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions(getDefaultSuggestions());
      return;
    }

    const timeoutId = setTimeout(() => {
      searchSuggestions(query);
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Navigation within suggestions
  const handleKeyNavigation = (event) => {
    if (!isOpen) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        event.preventDefault();
        if (suggestions[selectedIndex]) {
          executeAction(suggestions[selectedIndex]);
        }
        break;
    }
  };

  // Get default suggestions when no query
  const getDefaultSuggestions = () => [
    {
      type: 'page',
      title: 'إدارة المستخدمين',
      titleEn: 'Users Management',
      description: 'إدارة حسابات المستخدمين والملفات الشخصية',
      descriptionEn: 'Manage user accounts and profiles',
      url: '/admin/users',
      icon: Users,
      category: 'navigation',
      shortcut: 'U'
    },
    {
      type: 'page',
      title: 'التحليلات',
      titleEn: 'Analytics',
      description: 'عرض التقارير والإحصائيات',
      descriptionEn: 'View reports and statistics',
      url: '/admin/analytics',
      icon: BarChart3,
      category: 'navigation',
      shortcut: 'A'
    },
    {
      type: 'page',
      title: 'الأموال',
      titleEn: 'Finances',
      description: 'إدارة المدفوعات والتقارير المالية',
      descriptionEn: 'Manage payments and financial reports',
      url: '/admin/finances',
      icon: DollarSign,
      category: 'navigation',
      shortcut: 'F'
    },
    {
      type: 'action',
      title: 'تصدير البيانات إلى CSV',
      titleEn: 'Export Data to CSV',
      description: 'تحميل بيانات المستخدمين كملف CSV',
      descriptionEn: 'Download users data as CSV file',
      action: 'export_users_csv',
      icon: FileText,
      category: 'actions'
    },
    {
      type: 'action',
      title: 'إرسال إشعار جماعي',
      titleEn: 'Send Bulk Notification',
      description: 'إرسال إشعار لجميع المستخدمين',
      descriptionEn: 'Send notification to all users',
      action: 'send_bulk_notification',
      icon: User,
      category: 'actions'
    }
  ];

  // Search for suggestions via API
  const searchSuggestions = async (searchQuery) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/quick-actions/suggest?q=${encodeURIComponent(searchQuery)}&limit=10`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.data || []);
      } else {
        // Fallback to local filtering
        const defaultSuggestions = getDefaultSuggestions();
        const filtered = defaultSuggestions.filter(item =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.titleEn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.descriptionEn?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setSuggestions(filtered);
      }
    } catch (error) {
      console.error('Search suggestions error:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Execute selected action
  const executeAction = async (suggestion) => {
    if (suggestion.type === 'page' && suggestion.url) {
      navigate(suggestion.url);
      setIsOpen(false);
      setQuery('');
    } else if (suggestion.type === 'action' && suggestion.action) {
      try {
        const response = await fetch('/api/admin/quick-actions/trigger', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            action: suggestion.action,
            params: suggestion.params || {}
          })
        });

        const result = await response.json();
        if (result.success) {
          console.log('Action executed successfully:', result);
          // Show success notification
        } else {
          console.error('Action failed:', result.message);
        }
      } catch (error) {
        console.error('Execute action error:', error);
      }
      setIsOpen(false);
      setQuery('');
    } else if (suggestion.type === 'user' && suggestion.url) {
      navigate(suggestion.url);
      setIsOpen(false);
      setQuery('');
    }
    setSelectedIndex(0);
  };

  // Don't render if user doesn't have admin access
  if (!hasAdminAccess) {
    return null;
  }

  // Get icon component
  const getIconComponent = (iconName) => {
    const iconMap = {
      users: Users,
      user: User,
      'bar-chart-3': BarChart3,
      'dollar-sign': DollarSign,
      'file-text': FileText,
      settings: Settings
    };
    return iconMap[iconName] || Search;
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Command Palette */}
      {isOpen && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 w-full max-w-2xl z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Search Input */}
            <div className="flex items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <Search className="w-5 h-5 text-gray-400 mr-3" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyNavigation}
                placeholder="ابحث عن الصفحات والإجراءات والمستخدمين... (Ctrl+K)"
                className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 outline-none text-lg"
              />
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
              )}
            </div>

            {/* Suggestions List */}
            <div 
              ref={listRef}
              className="max-h-96 overflow-y-auto"
            >
              {suggestions.length === 0 && !loading ? (
                <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>لم يتم العثور على نتائج</p>
                  <p className="text-sm">No results found</p>
                </div>
              ) : (
                <div className="py-2">
                  {suggestions.map((suggestion, index) => {
                    const IconComponent = suggestion.icon || getIconComponent(suggestion.icon);
                    const isSelected = index === selectedIndex;
                    
                    return (
                      <div
                        key={suggestion.id || index}
                        className={`flex items-center px-4 py-3 cursor-pointer transition-colors ${
                          isSelected 
                            ? 'bg-purple-50 dark:bg-purple-900/20 border-r-2 border-purple-600' 
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                        onClick={() => executeAction(suggestion)}
                      >
                        <div className={`p-2 rounded-lg mr-3 ${
                          isSelected 
                            ? 'bg-purple-100 dark:bg-purple-800 text-purple-600 dark:text-purple-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                        }`}>
                          <IconComponent className="w-4 h-4" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center">
                            <p className={`font-medium truncate ${
                              isSelected 
                                ? 'text-purple-900 dark:text-purple-100' 
                                : 'text-gray-900 dark:text-white'
                            }`}>
                              {suggestion.title}
                            </p>
                            {suggestion.shortcut && (
                              <span className="ml-2 px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded">
                                {suggestion.shortcut}
                              </span>
                            )}
                          </div>
                          <p className={`text-sm truncate ${
                            isSelected 
                              ? 'text-purple-700 dark:text-purple-200' 
                              : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {suggestion.description}
                          </p>
                        </div>

                        <div className="flex items-center ml-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            suggestion.category === 'navigation' 
                              ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                              : suggestion.category === 'actions'
                              ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                          }`}>
                            {suggestion.category === 'navigation' ? 'صفحة' : 
                             suggestion.category === 'actions' ? 'إجراء' : 
                             suggestion.category === 'users' ? 'مستخدم' : suggestion.category}
                          </span>
                          {isSelected && (
                            <ArrowRight className="w-4 h-4 ml-2 text-purple-600 dark:text-purple-300" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center space-x-4">
                  <span className="flex items-center">
                    <kbd className="px-2 py-1 bg-white dark:bg-gray-600 rounded border mr-1">↑↓</kbd>
                    للتنقل
                  </span>
                  <span className="flex items-center">
                    <kbd className="px-2 py-1 bg-white dark:bg-gray-600 rounded border mr-1">Enter</kbd>
                    للتنفيذ
                  </span>
                  <span className="flex items-center">
                    <kbd className="px-2 py-1 bg-white dark:bg-gray-600 rounded border mr-1">Esc</kbd>
                    للإغلاق
                  </span>
                </div>
                <div className="flex items-center">
                  <Command className="w-3 h-3 mr-1" />
                  <span>Command Palette</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating trigger button (optional) */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg transition-colors z-40 lg:hidden"
        title="فتح لوحة الأوامر (Ctrl+K)"
      >
        <Command className="w-5 h-5" />
      </button>
    </>
  );
};

export default QuickCommandPalette; 