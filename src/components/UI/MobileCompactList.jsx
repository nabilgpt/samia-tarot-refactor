/**
 * ==========================================
 * MOBILE COMPACT LIST COMPONENT
 * ==========================================
 * Provides mobile-optimized list view with ≤64px row height
 * and action menus in 3-dot dropdowns
 */

import React, { useState } from 'react';
import { MoreVertical, Eye, Edit, Trash2, Settings } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { getMobileRowClasses, getMobileActionClasses, getFlexContainerClasses } from '../../utils/rtlUtils';

const MobileCompactList = ({
  items = [],
  onView,
  onEdit,
  onDelete,
  onSettings,
  renderItem,
  showActions = true,
  extraActions = []
}) => {
  const { currentLanguage, direction } = useLanguage();
  const [openMenuId, setOpenMenuId] = useState(null);

  const toggleMenu = (itemId) => {
    setOpenMenuId(openMenuId === itemId ? null : itemId);
  };

  const handleAction = (action, item) => {
    setOpenMenuId(null);
    action(item);
  };

  const ActionMenu = ({ item }) => {
    const actions = [
      ...(onView ? [{ 
        icon: Eye, 
        label: currentLanguage === 'ar' ? 'عرض' : 'View',
        action: () => handleAction(onView, item)
      }] : []),
      ...(onEdit ? [{ 
        icon: Edit, 
        label: currentLanguage === 'ar' ? 'تعديل' : 'Edit',
        action: () => handleAction(onEdit, item)
      }] : []),
      ...(onSettings ? [{ 
        icon: Settings, 
        label: currentLanguage === 'ar' ? 'إعدادات' : 'Settings',
        action: () => handleAction(onSettings, item)
      }] : []),
      ...extraActions,
      ...(onDelete ? [{ 
        icon: Trash2, 
        label: currentLanguage === 'ar' ? 'حذف' : 'Delete',
        action: () => handleAction(onDelete, item),
        danger: true
      }] : [])
    ];

    return (
      <div className={getMobileActionClasses(direction)}>
        <button
          onClick={() => toggleMenu(item.id)}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          aria-label={currentLanguage === 'ar' ? 'المزيد من الخيارات' : 'More options'}
        >
          <MoreVertical className="h-4 w-4 text-gray-400" />
        </button>
        
        {openMenuId === item.id && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpenMenuId(null)}
            />
            
            {/* Menu */}
            <div className={`
              absolute top-full z-50 mt-1 min-w-[160px]
              bg-gray-800 border border-gray-600 rounded-lg shadow-xl
              ${direction === 'rtl' ? 'left-0' : 'right-0'}
            `}>
              {actions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <button
                    key={index}
                    onClick={action.action}
                    className={`
                      w-full px-3 py-2 text-sm transition-colors
                      hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg
                      ${getFlexContainerClasses(direction)}
                      ${action.danger 
                        ? 'text-red-400 hover:bg-red-500/10' 
                        : 'text-gray-300'
                      }
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{action.label}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-0">
      {items.map((item, index) => (
        <div
          key={item.id || index}
          className={getMobileRowClasses(direction)}
        >
          {/* Item Content */}
          <div className="flex-1 min-w-0">
            {renderItem ? renderItem(item) : (
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-white truncate">
                  {item.title || item.name}
                </h3>
                {item.description && (
                  <p className="text-xs text-gray-400 truncate">
                    {item.description}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          {showActions && <ActionMenu item={item} />}
        </div>
      ))}

      {items.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">
            {currentLanguage === 'ar' ? 'لا توجد عناصر' : 'No items found'}
          </p>
        </div>
      )}
    </div>
  );
};

export default MobileCompactList;