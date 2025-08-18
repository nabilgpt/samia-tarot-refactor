/**
 * Dashboard Styling Utilities
 * Provides consistent styling classes and helper functions for all dashboard pages
 */

import { hasAdminOrMonitorAccess } from './roleHelpers';

// Base layout classes
export const dashboardClasses = {
  // Container spacing
  pageContainer: "space-y-8",
  
  // Header styles
  headerBase: "rounded-xl p-6 text-white shadow-lg",
  headerTitle: "text-2xl md:text-3xl font-bold mb-2",
  headerSubtitle: "text-sm md:text-base",
  
  // Stats grid
  statsGrid: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6",
  statsGridLarge: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 lg:gap-6",
  
  // Stat card
  statCard: "bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow",
  statIcon: "p-3 rounded-lg",
  statLabel: "text-sm font-medium text-gray-600",
  statValue: "text-2xl font-bold text-gray-900",
  
  // Content cards
  contentCard: "bg-white rounded-xl shadow-sm border border-gray-200",
  contentGrid: "grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8",
  
  // Tab navigation
  tabContainer: "bg-white rounded-xl shadow-sm border border-gray-200",
  tabNav: "flex flex-wrap gap-2 px-6 py-2 overflow-x-auto",
  tabButton: "py-3 px-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap",
  tabContent: "p-6",
  
  // Interactive elements
  link: "transition-colors",
  button: "transition-colors",
  listItem: "hover:bg-gray-100 transition-colors"
};

// Role-specific header gradients
export const headerGradients = {
  client: "bg-gradient-to-r from-purple-600 to-blue-600",
  reader: "bg-gradient-to-r from-purple-600 to-indigo-600",
  admin: "bg-gradient-to-r from-red-600 to-orange-600",
  monitor: "bg-gradient-to-r from-blue-600 to-indigo-600"
};

// Role-specific tab colors
export const tabColors = {
  client: {
    active: "border-purple-500 text-purple-600 bg-purple-50",
    inactive: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50"
  },
  reader: {
    active: "border-purple-500 text-purple-600 bg-purple-50",
    inactive: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50"
  },
  admin: {
    active: "border-red-500 text-red-600 bg-red-50",
    inactive: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50"
  },
  monitor: {
    active: "border-blue-500 text-blue-600 bg-blue-50",
    inactive: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50"
  }
};

// Icon background colors
export const iconColors = {
  blue: "bg-blue-100",
  green: "bg-green-100",
  purple: "bg-purple-100",
  yellow: "bg-yellow-100",
  red: "bg-red-100",
  orange: "bg-orange-100",
  indigo: "bg-indigo-100",
  emerald: "bg-emerald-100"
};

// Helper functions
export const getHeaderClasses = (role) => {
  return `${dashboardClasses.headerBase} ${headerGradients[role] || headerGradients.client}`;
};

export const getTabClasses = (role, isActive) => {
  const colors = tabColors[role] || tabColors.client;
  return `${dashboardClasses.tabButton} ${isActive ? colors.active : colors.inactive}`;
};

export const getStatCardClasses = () => {
  return dashboardClasses.statCard;
};

export const getIconClasses = (color) => {
  return `${dashboardClasses.statIcon} ${iconColors[color] || iconColors.blue}`;
};

// Layout helper components
export const createStatsGrid = (role, stats) => {
  const isWideLayout = hasAdminOrMonitorAccess(role);
  return isWideLayout ? dashboardClasses.statsGridLarge : dashboardClasses.statsGrid;
};

// Responsive breakpoints for consistent behavior
export const breakpoints = {
  sm: "640px",
  md: "768px", 
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px"
};

// Common dashboard animations
export const animations = {
  fadeIn: "transition-opacity duration-300 ease-in-out",
  slideIn: "transition-transform duration-300 ease-in-out",
  scaleIn: "transition-transform duration-200 ease-in-out hover:scale-105"
};

export default {
  dashboardClasses,
  headerGradients,
  tabColors,
  iconColors,
  getHeaderClasses,
  getTabClasses,
  getStatCardClasses,
  getIconClasses,
  createStatsGrid,
  breakpoints,
  animations
}; 
