/**
 * ==========================================
 * RTL UTILITIES - ARABIC MODE REFINEMENTS
 * ==========================================
 * Shared utilities for consistent RTL/LTR handling
 * across the SAMIA TAROT platform
 */

/**
 * Get directional classes for consistent spacing and alignment
 */
export const getRTLClasses = (direction = 'ltr') => ({
  // Text alignment
  textAlign: direction === 'rtl' ? 'text-right' : 'text-left',
  textAlignOpposite: direction === 'rtl' ? 'text-left' : 'text-right',
  
  // Margins
  marginStart: direction === 'rtl' ? 'ml' : 'mr',
  marginEnd: direction === 'rtl' ? 'mr' : 'ml',
  
  // Padding
  paddingStart: direction === 'rtl' ? 'pl' : 'pr',
  paddingEnd: direction === 'rtl' ? 'pr' : 'pl',
  
  // Flex direction
  flexRow: direction === 'rtl' ? 'flex-row-reverse' : 'flex-row',
  
  // Border radius
  roundedStart: direction === 'rtl' ? 'rounded-r' : 'rounded-l',
  roundedEnd: direction === 'rtl' ? 'rounded-l' : 'rounded-r',
  
  // Positioning
  left: direction === 'rtl' ? 'right' : 'left',
  right: direction === 'rtl' ? 'left' : 'right'
});

/**
 * Get form field classes with proper RTL support
 */
export const getFormFieldClasses = (direction = 'ltr', extraClasses = '') => {
  const rtl = getRTLClasses(direction);
  return `
    w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg 
    focus:ring-2 focus:ring-purple-500 focus:border-transparent 
    text-white hover:border-gray-500 transition-all duration-200
    ${rtl.textAlign} ${extraClasses}
  `.trim();
};

/**
 * Get label classes with proper RTL alignment
 */
export const getLabelClasses = (direction = 'ltr', extraClasses = '') => {
  const rtl = getRTLClasses(direction);
  return `
    block text-sm font-medium text-gray-300 mb-2
    ${rtl.textAlign} ${extraClasses}
  `.trim();
};

/**
 * Get validation error classes with RTL support
 */
export const getValidationErrorClasses = (direction = 'ltr') => {
  const rtl = getRTLClasses(direction);
  return `text-red-400 text-sm mt-1 ${rtl.textAlign}`;
};

/**
 * Get mobile compact row classes
 */
export const getMobileRowClasses = (direction = 'ltr') => {
  const rtl = getRTLClasses(direction);
  return `
    flex items-center justify-between px-4 py-3 
    border-b border-gray-700 hover:bg-gray-800 
    transition-colors duration-200 min-h-[64px]
    ${rtl.flexRow}
  `.trim();
};

/**
 * Get mobile action menu classes
 */
export const getMobileActionClasses = (direction = 'ltr') => {
  const rtl = getRTLClasses(direction);
  return `
    relative ${rtl.marginStart}-2
  `.trim();
};

/**
 * Get solid background panel classes
 */
export const getSolidPanelClasses = (direction = 'ltr') => {
  return `
    fixed bg-gray-900/95 backdrop-blur-sm border border-white/20 
    rounded-xl overflow-hidden shadow-2xl
    ${direction === 'rtl' ? 'text-right' : 'text-left'}
  `.trim();
};

/**
 * Get flex container classes with RTL support
 */
export const getFlexContainerClasses = (direction = 'ltr', align = 'center') => {
  const rtl = getRTLClasses(direction);
  return `flex items-${align} gap-2 ${rtl.flexRow}`;
};

/**
 * Apply RTL-specific form validation styling
 */
export const applyRTLValidation = (element, isValid, direction = 'ltr') => {
  if (!element) return;
  
  const rtl = getRTLClasses(direction);
  
  // Remove existing validation classes
  element.classList.remove('border-red-500', 'border-green-500', 'text-right', 'text-left');
  
  // Apply validation state
  if (isValid === false) {
    element.classList.add('border-red-500');
  } else if (isValid === true) {
    element.classList.add('border-green-500');
  }
  
  // Apply text alignment
  element.classList.add(rtl.textAlign.replace('text-', ''));
};

/**
 * Get responsive grid classes with RTL support
 */
export const getResponsiveGridClasses = (direction = 'ltr') => {
  return `
    grid grid-cols-1 md:grid-cols-2 gap-6 w-full
    ${direction === 'rtl' ? '[&>*]:text-right' : '[&>*]:text-left'}
  `.trim();
};

/**
 * Get card container classes with proper RTL spacing
 */
export const getCardContainerClasses = (direction = 'ltr') => {
  const rtl = getRTLClasses(direction);
  return `
    bg-gray-800 border border-gray-700 rounded-lg p-6 
    hover:border-purple-500 transition-all duration-200
    ${rtl.textAlign}
  `.trim();
};

/**
 * Helper function to get CSS custom properties for RTL
 */
export const getRTLCSSProps = (direction = 'ltr') => ({
  '--text-align': direction === 'rtl' ? 'right' : 'left',
  '--text-align-opposite': direction === 'rtl' ? 'left' : 'right',
  '--flex-direction': direction === 'rtl' ? 'row-reverse' : 'row'
});