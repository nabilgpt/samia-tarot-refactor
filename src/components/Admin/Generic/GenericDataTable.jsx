import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  EllipsisVerticalIcon, 
  EyeIcon, 
  PencilIcon, 
  TrashIcon, 
  UserGroupIcon,
  StarIcon 
} from '@heroicons/react/24/outline';

// ActionsDropdown component with portal for proper layering
const ActionsDropdown = ({ 
  item, 
  onView, 
  onEdit, 
  onDelete, 
  onAssign, 
  position,
  onClose 
}) => {
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleAction = (actionFn, actionName) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Small delay to prevent menu closing before action
    setTimeout(() => {
      try {
        actionFn(item);
        onClose();
      } catch (error) {
        console.error(`Error executing ${actionName}:`, error);
        onClose();
      }
    }, 50);
  };

  const dropdownContent = (
    <div
      ref={dropdownRef}
      className="fixed bg-gray-800/95 backdrop-blur-sm border border-purple-500/30 rounded-lg shadow-2xl min-w-[160px] z-[9999]"
      style={{
        top: position.top,
        left: position.left,
        transform: 'translateX(-50%)'
      }}
    >
      <div className="py-2">
        {onView && (
          <button
            onClick={handleAction(onView, 'view')}
            className="mobile-dropdown-item w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-purple-600/20 hover:text-purple-300 transition-colors flex items-center gap-2"
          >
            <EyeIcon className="w-4 h-4" />
            View
          </button>
        )}
        {onEdit && (
          <button
            onClick={handleAction(onEdit, 'edit')}
            className="mobile-dropdown-item w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-purple-600/20 hover:text-purple-300 transition-colors flex items-center gap-2"
          >
            <PencilIcon className="w-4 h-4" />
            Edit
          </button>
        )}
        {onAssign && (
          <button
            onClick={handleAction(onAssign, 'assign')}
            className="mobile-dropdown-item w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-purple-600/20 hover:text-purple-300 transition-colors flex items-center gap-2"
          >
            <UserGroupIcon className="w-4 h-4" />
            Assign Readers
          </button>
        )}
        {onDelete && (
          <button
            onClick={handleAction(onDelete, 'delete')}
            className="mobile-dropdown-item w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-600/20 hover:text-red-300 transition-colors flex items-center gap-2"
          >
            <TrashIcon className="w-4 h-4" />
            Delete
          </button>
        )}
      </div>
    </div>
  );

  return createPortal(dropdownContent, document.body);
};

// Mobile Card Component
const MobileCard = ({ 
  item, 
  primaryField, 
  secondaryFields, 
  expandableFields, 
  onView, 
  onEdit, 
  onDelete, 
  onAssign 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);

  const handleDropdownToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!showDropdown && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 5,
        left: rect.left + window.scrollX + (rect.width / 2)
      });
    }
    setShowDropdown(!showDropdown);
  };

  const closeDropdown = () => {
    setShowDropdown(false);
  };

  return (
    <>
      <div className="mobile-card-container bg-gray-800/50 backdrop-blur-sm border border-purple-500/30 rounded-lg p-4 mb-3 relative">
        {/* Header with primary info and actions */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-medium text-sm truncate">
              {item[primaryField.key] || 'N/A'}
            </h3>
            {secondaryFields.map((field, index) => (
              <p key={index} className="text-gray-400 text-xs mt-1 truncate">
                {field.label}: {item[field.key] || 'N/A'}
              </p>
            ))}
          </div>
          
          {/* Actions Button */}
          <div className="mobile-actions-container flex items-center gap-2 ml-3 flex-shrink-0">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mobile-action-button text-gray-400 hover:text-purple-300 transition-colors p-1"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              <StarIcon className="w-4 h-4" />
            </button>
            
            <button
              ref={buttonRef}
              onClick={handleDropdownToggle}
              className="mobile-action-button text-gray-400 hover:text-purple-300 transition-colors p-1 relative z-10"
              aria-label="Actions"
            >
              <EllipsisVerticalIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Expandable content */}
        {isExpanded && expandableFields.length > 0 && (
          <div className="border-t border-purple-500/20 pt-3 mt-3">
            <div className="grid grid-cols-1 gap-2">
              {expandableFields.map((field, index) => (
                <div key={index} className="flex justify-between text-xs">
                  <span className="text-gray-500">{field.label}:</span>
                  <span className="text-gray-300 text-right ml-2">
                    {item[field.key] || 'N/A'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Portal-rendered dropdown */}
      {showDropdown && (
        <ActionsDropdown
          item={item}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
          onAssign={onAssign}
          position={dropdownPosition}
          onClose={closeDropdown}
        />
      )}
    </>
  );
};

// Main GenericDataTable Component
const GenericDataTable = ({
  data = [],
  columns = [],
  onView,
  onEdit,
  onDelete,
  onAssign,
  title = "Data Table",
  isLoading = false,
  emptyMessage = "No data available"
}) => {
  // Mobile responsive breakpoint
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Configure mobile fields
  const primaryField = columns[0] || { key: 'name', label: 'Name' };
  const secondaryFields = columns.slice(1, 3);
  const expandableFields = columns.slice(3);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-2">
          <StarIcon className="w-12 h-12 mx-auto opacity-50" />
        </div>
        <p className="text-gray-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="generic-data-table-container w-full">
      {/* Mobile View */}
      {isMobile ? (
        <div className="space-y-3">
          {data.map((item, index) => (
            <MobileCard
              key={item.id || index}
              item={item}
              primaryField={primaryField}
              secondaryFields={secondaryFields}
              expandableFields={expandableFields}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
              onAssign={onAssign}
            />
          ))}
        </div>
      ) : (
        /* Desktop/Tablet View */
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-purple-500/30">
                {columns.map((column, index) => (
                  <th
                    key={index}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                  >
                    {column.label}
                  </th>
                ))}
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-500/20">
              {data.map((item, index) => (
                <tr
                  key={item.id || index}
                  className="hover:bg-purple-600/10 transition-colors"
                >
                  {columns.map((column, colIndex) => (
                    <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {item[column.key] || 'N/A'}
                    </td>
                  ))}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      {onView && (
                        <button
                          onClick={() => onView(item)}
                          className="text-purple-400 hover:text-purple-300 transition-colors"
                          title="View"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                      )}
                      {onEdit && (
                        <button
                          onClick={() => onEdit(item)}
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                          title="Edit"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                      )}
                      {onAssign && (
                        <button
                          onClick={() => onAssign(item)}
                          className="text-green-400 hover:text-green-300 transition-colors"
                          title="Assign Readers"
                        >
                          <UserGroupIcon className="w-4 h-4" />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(item)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                          title="Delete"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default GenericDataTable; 