# SAMIA TAROT - Cosmic Theme System Documentation

## Overview
The SAMIA TAROT platform features a comprehensive cosmic-themed design system that creates an immersive, mystical user experience through carefully crafted visual elements, animations, and color schemes.

## Table of Contents
1. [Design Philosophy](#design-philosophy)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Component Library](#component-library)
5. [Animation System](#animation-system)
6. [Background Effects](#background-effects)
7. [Icon System](#icon-system)
8. [Layout & Spacing](#layout--spacing)
9. [Responsive Design](#responsive-design)
10. [Theme Configuration](#theme-configuration)
11. [Implementation Guide](#implementation-guide)
12. [Customization](#customization)

## Design Philosophy

### Core Principles
- **Mystical Atmosphere**: Create an otherworldly, cosmic experience
- **Intuitive Navigation**: Maintain usability while enhancing visual appeal
- **Emotional Connection**: Use colors and animations to evoke wonder
- **Accessibility**: Ensure cosmic design doesn't compromise usability
- **Performance**: Optimize animations and effects for smooth experience

### Visual Language
- **Cosmic Elements**: Stars, nebulae, aurora effects, celestial bodies
- **Depth & Dimension**: Layered backgrounds, parallax effects, depth of field
- **Organic Flow**: Smooth transitions, fluid animations, natural movement
- **Sacred Geometry**: Subtle geometric patterns and alignments

## Color System

### Primary Palette
```css
:root {
  /* Cosmic Purples */
  --cosmic-purple-900: #1a0b2e;
  --cosmic-purple-800: #2d1b4e;
  --cosmic-purple-700: #3f2a6b;
  --cosmic-purple-600: #523a88;
  --cosmic-purple-500: #6449a5;
  --cosmic-purple-400: #7759c2;
  --cosmic-purple-300: #8968df;
  --cosmic-purple-200: #9c78fc;
  --cosmic-purple-100: #ae87ff;

  /* Cosmic Blues */
  --cosmic-blue-900: #0a0e27;
  --cosmic-blue-800: #151d3b;
  --cosmic-blue-700: #1f2c4f;
  --cosmic-blue-600: #2a3b63;
  --cosmic-blue-500: #344a77;
  --cosmic-blue-400: #3f598b;
  --cosmic-blue-300: #49689f;
  --cosmic-blue-200: #5477b3;
  --cosmic-blue-100: #5e86c7;

  /* Cosmic Teals */
  --cosmic-teal-900: #0d1b1e;
  --cosmic-teal-800: #1a3034;
  --cosmic-teal-700: #27454a;
  --cosmic-teal-600: #345a60;
  --cosmic-teal-500: #416f76;
  --cosmic-teal-400: #4e848c;
  --cosmic-teal-300: #5b99a2;
  --cosmic-teal-200: #68aeb8;
  --cosmic-teal-100: #75c3ce;

  /* Accent Colors */
  --cosmic-gold: #ffd700;
  --cosmic-silver: #c0c0c0;
  --cosmic-rose: #ff69b4;
  --cosmic-mint: #98fb98;
}
```

### Semantic Colors
```css
:root {
  /* UI States */
  --color-success: var(--cosmic-mint);
  --color-warning: var(--cosmic-gold);
  --color-error: var(--cosmic-rose);
  --color-info: var(--cosmic-blue-300);

  /* Background Layers */
  --bg-primary: var(--cosmic-purple-900);
  --bg-secondary: var(--cosmic-purple-800);
  --bg-tertiary: var(--cosmic-purple-700);
  --bg-surface: rgba(124, 89, 223, 0.1);
  --bg-overlay: rgba(26, 11, 46, 0.8);

  /* Text Colors */
  --text-primary: #ffffff;
  --text-secondary: var(--cosmic-purple-100);
  --text-muted: var(--cosmic-purple-300);
  --text-accent: var(--cosmic-gold);
}
```

### Gradient System
```css
/* Cosmic Gradients */
.gradient-cosmic-primary {
  background: linear-gradient(135deg, 
    var(--cosmic-purple-600) 0%, 
    var(--cosmic-blue-600) 50%, 
    var(--cosmic-teal-600) 100%);
}

.gradient-cosmic-aurora {
  background: linear-gradient(45deg,
    var(--cosmic-purple-500) 0%,
    var(--cosmic-blue-400) 25%,
    var(--cosmic-teal-400) 50%,
    var(--cosmic-purple-400) 75%,
    var(--cosmic-blue-500) 100%);
}

.gradient-cosmic-nebula {
  background: radial-gradient(ellipse at center,
    var(--cosmic-purple-400) 0%,
    var(--cosmic-purple-600) 40%,
    var(--cosmic-purple-800) 80%,
    var(--cosmic-purple-900) 100%);
}
```

## Typography

### Font System
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap');

:root {
  /* Primary Font Family */
  --font-primary: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-cosmic: 'Orbitron', monospace;
  
  /* Font Weights */
  --font-weight-light: 300;
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --font-weight-cosmic: 800;
  
  /* Font Sizes */
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 1.875rem;  /* 30px */
  --text-4xl: 2.25rem;   /* 36px */
  --text-5xl: 3rem;      /* 48px */
  --text-6xl: 3.75rem;   /* 60px */
}
```

### Typography Classes
```css
/* Heading Styles */
.cosmic-heading {
  font-family: var(--font-cosmic);
  font-weight: var(--font-weight-cosmic);
  background: var(--gradient-cosmic-aurora);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 0 20px rgba(124, 89, 223, 0.5);
}

.cosmic-subheading {
  font-family: var(--font-primary);
  font-weight: var(--font-weight-semibold);
  color: var(--text-secondary);
  letter-spacing: 0.05em;
}

.cosmic-body {
  font-family: var(--font-primary);
  font-weight: var(--font-weight-normal);
  color: var(--text-primary);
  line-height: 1.6;
}

.cosmic-caption {
  font-family: var(--font-primary);
  font-weight: var(--font-weight-medium);
  color: var(--text-muted);
  font-size: var(--text-sm);
  letter-spacing: 0.025em;
}
```

## Component Library

### Cosmic Button System
```jsx
// src/components/UI/CosmicButton.jsx
const CosmicButton = ({ 
  variant = 'primary', 
  size = 'md', 
  children, 
  className = '',
  ...props 
}) => {
  const baseClasses = `
    cosmic-button
    relative overflow-hidden
    font-medium rounded-lg
    transition-all duration-300
    transform hover:scale-105
    focus:outline-none focus:ring-2 focus:ring-cosmic-purple-400
  `;

  const variants = {
    primary: `
      bg-gradient-to-r from-cosmic-purple-600 to-cosmic-blue-600
      text-white shadow-lg shadow-cosmic-purple-500/25
      hover:shadow-xl hover:shadow-cosmic-purple-500/40
    `,
    secondary: `
      bg-cosmic-purple-800/50 border border-cosmic-purple-400
      text-cosmic-purple-100 backdrop-blur-sm
      hover:bg-cosmic-purple-700/50
    `,
    ghost: `
      bg-transparent text-cosmic-purple-300
      hover:bg-cosmic-purple-800/30
    `,
    cosmic: `
      bg-gradient-cosmic-aurora
      text-white font-cosmic font-bold
      shadow-2xl shadow-cosmic-purple-500/50
      hover:shadow-cosmic-purple-400/60
    `
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-xl'
  };

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      <span className="relative z-10">{children}</span>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
    </button>
  );
};
```

### Cosmic Card Component
```jsx
// src/components/UI/CosmicCard.jsx
const CosmicCard = ({ 
  children, 
  className = '', 
  variant = 'default',
  glow = false 
}) => {
  const baseClasses = `
    cosmic-card
    relative overflow-hidden
    bg-cosmic-purple-800/30 backdrop-blur-md
    border border-cosmic-purple-400/30
    rounded-xl shadow-xl
    transition-all duration-300
  `;

  const variants = {
    default: 'hover:border-cosmic-purple-300/50',
    highlighted: `
      border-cosmic-gold/50 
      shadow-cosmic-gold/20 shadow-2xl
    `,
    reading: `
      bg-gradient-to-br from-cosmic-purple-800/40 to-cosmic-blue-800/40
      border-cosmic-teal-400/40
    `
  };

  const glowEffect = glow ? `
    before:absolute before:inset-0 before:-z-10
    before:bg-gradient-to-r before:from-cosmic-purple-500/20 
    before:to-cosmic-blue-500/20 before:blur-xl
    before:animate-pulse
  ` : '';

  return (
    <div className={`${baseClasses} ${variants[variant]} ${glowEffect} ${className}`}>
      {children}
    </div>
  );
};
```

### Cosmic Input Components
```jsx
// src/components/UI/CosmicInput.jsx
const CosmicInput = ({ 
  label, 
  error, 
  className = '', 
  ...props 
}) => {
  return (
    <div className="cosmic-input-group">
      {label && (
        <label className="block text-sm font-medium text-cosmic-purple-200 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          className={`
            cosmic-input
            w-full px-4 py-3 rounded-lg
            bg-cosmic-purple-800/50 backdrop-blur-sm
            border border-cosmic-purple-400/30
            text-white placeholder-cosmic-purple-300
            focus:outline-none focus:ring-2 focus:ring-cosmic-purple-400
            focus:border-cosmic-purple-300
            transition-all duration-300
            ${error ? 'border-cosmic-rose focus:ring-cosmic-rose' : ''}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-cosmic-rose">{error}</p>
        )}
      </div>
    </div>
  );
};
```

## Animation System

### Keyframes & Transitions
```css
/* Cosmic Animations */
@keyframes cosmic-float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  33% { transform: translateY(-10px) rotate(1deg); }
  66% { transform: translateY(5px) rotate(-1deg); }
}

@keyframes cosmic-pulse {
  0%, 100% { 
    transform: scale(1);
    opacity: 1;
  }
  50% { 
    transform: scale(1.05);
    opacity: 0.8;
  }
}

@keyframes cosmic-shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}

@keyframes cosmic-aurora {
  0%, 100% { 
    background-position: 0% 50%;
  }
  50% { 
    background-position: 100% 50%;
  }
}

@keyframes cosmic-twinkle {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.2); }
}

/* Animation Classes */
.animate-cosmic-float {
  animation: cosmic-float 6s ease-in-out infinite;
}

.animate-cosmic-pulse {
  animation: cosmic-pulse 2s ease-in-out infinite;
}

.animate-cosmic-shimmer {
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  background-size: 200% 100%;
  animation: cosmic-shimmer 2s infinite;
}

.animate-cosmic-aurora {
  background-size: 200% 200%;
  animation: cosmic-aurora 8s ease infinite;
}

.animate-cosmic-twinkle {
  animation: cosmic-twinkle 3s ease-in-out infinite;
}
```

### Transition System
```css
/* Transition Utilities */
.transition-cosmic {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.transition-cosmic-slow {
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.transition-cosmic-bounce {
  transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

/* Hover Effects */
.hover-cosmic-lift:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 20px 40px rgba(124, 89, 223, 0.3);
}

.hover-cosmic-glow:hover {
  box-shadow: 
    0 0 20px rgba(124, 89, 223, 0.5),
    0 0 40px rgba(124, 89, 223, 0.3),
    0 0 60px rgba(124, 89, 223, 0.1);
}
```

## Background Effects

### Animated Background Component
```jsx
// src/components/UI/CosmicBackground.jsx
const CosmicBackground = () => {
  return (
    <div className="cosmic-background fixed inset-0 -z-50 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-cosmic-purple-900 via-cosmic-blue-900 to-cosmic-purple-900" />
      
      {/* Animated aurora */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-cosmic-aurora animate-cosmic-aurora" />
      </div>
      
      {/* Floating particles */}
      <div className="absolute inset-0">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-cosmic-twinkle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 4}s`
            }}
          />
        ))}
      </div>
      
      {/* Nebula effect */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cosmic-purple-500 rounded-full blur-3xl animate-cosmic-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cosmic-blue-500 rounded-full blur-3xl animate-cosmic-pulse" style={{ animationDelay: '1s' }} />
      </div>
    </div>
  );
};
```

### Parallax Scroll Effects
```jsx
// src/components/UI/ParallaxSection.jsx
const ParallaxSection = ({ children, speed = 0.5 }) => {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setOffset(window.pageYOffset * speed);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed]);

  return (
    <div 
      className="parallax-section relative"
      style={{ transform: `translateY(${offset}px)` }}
    >
      {children}
    </div>
  );
};
```

## Icon System

### Cosmic Icon Library
```jsx
// src/components/UI/CosmicIcons.jsx
export const StarIcon = ({ className = "w-6 h-6", ...props }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" {...props}>
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

export const MoonIcon = ({ className = "w-6 h-6", ...props }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" {...props}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

export const CrystalIcon = ({ className = "w-6 h-6", ...props }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" {...props}>
    <path d="M12 2L2 7v10l10 5 10-5V7l-10-5zM12 4.5L19.5 8 12 11.5 4.5 8 12 4.5zM4 9.5l7 3.5v7l-7-3.5v-7zm16 0v7l-7 3.5v-7l7-3.5z" />
  </svg>
);

export const CosmicSpinner = ({ className = "w-8 h-8" }) => (
  <div className={`cosmic-spinner ${className}`}>
    <div className="relative">
      <div className="w-full h-full border-4 border-cosmic-purple-300 border-t-cosmic-gold rounded-full animate-spin" />
      <div className="absolute inset-2 border-2 border-cosmic-blue-300 border-b-cosmic-teal-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
    </div>
  </div>
);
```

### Icon Usage Guidelines
```jsx
// Icon with cosmic glow effect
<StarIcon className="w-6 h-6 text-cosmic-gold drop-shadow-cosmic-glow" />

// Animated icon
<MoonIcon className="w-8 h-8 text-cosmic-blue-300 animate-cosmic-pulse" />

// Interactive icon
<CrystalIcon className="w-6 h-6 text-cosmic-purple-300 hover:text-cosmic-gold transition-cosmic cursor-pointer" />
```

## Layout & Spacing

### Spacing System
```css
:root {
  /* Spacing Scale */
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
  --space-20: 5rem;     /* 80px */
  --space-24: 6rem;     /* 96px */
  --space-32: 8rem;     /* 128px */
}

/* Spacing Utilities */
.cosmic-spacing-xs { gap: var(--space-2); }
.cosmic-spacing-sm { gap: var(--space-4); }
.cosmic-spacing-md { gap: var(--space-6); }
.cosmic-spacing-lg { gap: var(--space-8); }
.cosmic-spacing-xl { gap: var(--space-12); }
```

### Layout Components
```jsx
// src/components/Layout/CosmicContainer.jsx
const CosmicContainer = ({ children, size = 'default', className = '' }) => {
  const sizes = {
    sm: 'max-w-2xl',
    default: 'max-w-4xl',
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
    full: 'max-w-full'
  };

  return (
    <div className={`cosmic-container mx-auto px-4 sm:px-6 lg:px-8 ${sizes[size]} ${className}`}>
      {children}
    </div>
  );
};

// src/components/Layout/CosmicGrid.jsx
const CosmicGrid = ({ children, cols = 1, gap = 'md', className = '' }) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  };

  const gaps = {
    sm: 'gap-4',
    md: 'gap-6',
    lg: 'gap-8',
    xl: 'gap-12'
  };

  return (
    <div className={`cosmic-grid grid ${gridCols[cols]} ${gaps[gap]} ${className}`}>
      {children}
    </div>
  );
};
```

## Responsive Design

### Breakpoint System
```css
/* Breakpoints */
:root {
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
  --breakpoint-2xl: 1536px;
}

/* Responsive Utilities */
@media (max-width: 767px) {
  .cosmic-mobile-hidden { display: none; }
  .cosmic-mobile-stack { flex-direction: column; }
  .cosmic-text-mobile { font-size: var(--text-sm); }
}

@media (min-width: 768px) {
  .cosmic-desktop-hidden { display: none; }
  .cosmic-desktop-flex { display: flex; }
}
```

### Responsive Components
```jsx
// Responsive cosmic card grid
const ResponsiveCardGrid = ({ items }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
      {items.map((item, index) => (
        <CosmicCard key={index} className="h-full">
          {item}
        </CosmicCard>
      ))}
    </div>
  );
};
```

## Theme Configuration

### Theme Provider
```jsx
// src/context/ThemeContext.jsx
const ThemeContext = createContext();

export const CosmicThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState({
    mode: 'cosmic', // cosmic, light, dark
    intensity: 'normal', // subtle, normal, intense
    animations: true,
    particles: true
  });

  const updateTheme = (updates) => {
    setTheme(prev => ({ ...prev, ...updates }));
  };

  useEffect(() => {
    // Apply theme to document
    document.documentElement.className = `theme-${theme.mode} intensity-${theme.intensity}`;
    
    if (!theme.animations) {
      document.documentElement.style.setProperty('--animation-duration', '0s');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, updateTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useCosmicTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useCosmicTheme must be used within CosmicThemeProvider');
  }
  return context;
};
```

### Theme Customization
```jsx
// src/components/Admin/ThemeCustomizer.jsx
const ThemeCustomizer = () => {
  const { theme, updateTheme } = useCosmicTheme();

  return (
    <CosmicCard className="p-6">
      <h3 className="cosmic-heading text-xl mb-4">Theme Settings</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-cosmic-purple-200 mb-2">
            Visual Intensity
          </label>
          <select 
            value={theme.intensity}
            onChange={(e) => updateTheme({ intensity: e.target.value })}
            className="cosmic-input w-full"
          >
            <option value="subtle">Subtle</option>
            <option value="normal">Normal</option>
            <option value="intense">Intense</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-cosmic-purple-200">Animations</span>
          <button
            onClick={() => updateTheme({ animations: !theme.animations })}
            className={`cosmic-toggle ${theme.animations ? 'active' : ''}`}
          >
            <span className="cosmic-toggle-slider" />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-cosmic-purple-200">Particle Effects</span>
          <button
            onClick={() => updateTheme({ particles: !theme.particles })}
            className={`cosmic-toggle ${theme.particles ? 'active' : ''}`}
          >
            <span className="cosmic-toggle-slider" />
          </button>
        </div>
      </div>
    </CosmicCard>
  );
};
```

## Implementation Guide

### 1. Setup Base Styles
```css
/* src/styles/cosmic-base.css */
@import './cosmic-variables.css';
@import './cosmic-animations.css';
@import './cosmic-components.css';

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  font-family: var(--font-primary);
  background: var(--bg-primary);
  color: var(--text-primary);
  overflow-x: hidden;
}

/* Cosmic scrollbar */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: var(--cosmic-purple-900);
}

::-webkit-scrollbar-thumb {
  background: linear-gradient(to bottom, var(--cosmic-purple-500), var(--cosmic-blue-500));
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(to bottom, var(--cosmic-purple-400), var(--cosmic-blue-400));
}
```

### 2. Component Integration
```jsx
// App.jsx
import { CosmicThemeProvider } from './context/ThemeContext';
import { CosmicBackground } from './components/UI/CosmicBackground';
import './styles/cosmic-base.css';

function App() {
  return (
    <CosmicThemeProvider>
      <div className="app min-h-screen relative">
        <CosmicBackground />
        <div className="relative z-10">
          {/* App content */}
        </div>
      </div>
    </CosmicThemeProvider>
  );
}
```

### 3. Page Layout Example
```jsx
// Example page with cosmic theme
const CosmicPage = () => {
  return (
    <CosmicContainer size="lg" className="py-12">
      <div className="text-center mb-12">
        <h1 className="cosmic-heading text-5xl mb-4">
          Welcome to the Cosmic Realm
        </h1>
        <p className="cosmic-subheading text-xl">
          Discover the mysteries of the universe
        </p>
      </div>

      <CosmicGrid cols={3} gap="lg">
        <CosmicCard glow className="p-6">
          <StarIcon className="w-12 h-12 text-cosmic-gold mb-4 animate-cosmic-twinkle" />
          <h3 className="cosmic-subheading text-lg mb-2">Stellar Guidance</h3>
          <p className="cosmic-body">Connect with cosmic wisdom</p>
        </CosmicCard>
        
        <CosmicCard variant="highlighted" className="p-6">
          <MoonIcon className="w-12 h-12 text-cosmic-blue-300 mb-4 animate-cosmic-pulse" />
          <h3 className="cosmic-subheading text-lg mb-2">Lunar Insights</h3>
          <p className="cosmic-body">Harness lunar energy</p>
        </CosmicCard>
        
        <CosmicCard className="p-6">
          <CrystalIcon className="w-12 h-12 text-cosmic-purple-300 mb-4 animate-cosmic-float" />
          <h3 className="cosmic-subheading text-lg mb-2">Crystal Power</h3>
          <p className="cosmic-body">Channel crystal energy</p>
        </CosmicCard>
      </CosmicGrid>

      <div className="mt-12 text-center">
        <CosmicButton variant="cosmic" size="lg">
          Begin Your Journey
        </CosmicButton>
      </div>
    </CosmicContainer>
  );
};
```

## Customization

### Creating Custom Cosmic Components
```jsx
// Custom cosmic component example
const CosmicProgressBar = ({ value, max = 100, className = '' }) => {
  const percentage = (value / max) * 100;

  return (
    <div className={`cosmic-progress-bar relative h-3 bg-cosmic-purple-800 rounded-full overflow-hidden ${className}`}>
      <div 
        className="absolute inset-y-0 left-0 bg-gradient-cosmic-aurora rounded-full transition-all duration-500 ease-out"
        style={{ width: `${percentage}%` }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-cosmic-shimmer" />
    </div>
  );
};
```

### Theme Extensions
```css
/* Custom theme extension */
.theme-cosmic.intensity-intense {
  --cosmic-glow-intensity: 0.8;
  --cosmic-animation-speed: 1.5;
}

.theme-cosmic.intensity-subtle {
  --cosmic-glow-intensity: 0.3;
  --cosmic-animation-speed: 0.5;
}

/* Custom cosmic utilities */
.cosmic-shadow-intense {
  box-shadow: 
    0 0 30px rgba(124, 89, 223, var(--cosmic-glow-intensity)),
    0 0 60px rgba(84, 58, 183, calc(var(--cosmic-glow-intensity) * 0.7)),
    0 0 90px rgba(64, 38, 143, calc(var(--cosmic-glow-intensity) * 0.4));
}

.cosmic-border-glow {
  border: 1px solid rgba(124, 89, 223, 0.5);
  box-shadow: 
    inset 0 0 20px rgba(124, 89, 223, 0.1),
    0 0 20px rgba(124, 89, 223, 0.2);
}
```

## Performance Optimization

### Animation Performance
```css
/* Use transform and opacity for smooth animations */
.cosmic-optimized-animation {
  will-change: transform, opacity;
  transform: translateZ(0); /* Force hardware acceleration */
}

/* Reduce animations on low-powered devices */
@media (prefers-reduced-motion: reduce) {
  .animate-cosmic-float,
  .animate-cosmic-pulse,
  .animate-cosmic-aurora {
    animation: none;
  }
}
```

### Lazy Loading Effects
```jsx
// Lazy load particle effects
const LazyParticleEffect = () => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {isVisible && <ParticleEffect />}
    </div>
  );
};
```

## Best Practices

1. **Performance First**: Always consider performance impact of animations
2. **Accessibility**: Respect `prefers-reduced-motion` settings
3. **Consistency**: Use established color and spacing systems
4. **Modularity**: Create reusable cosmic components
5. **Testing**: Test on various devices and browsers
6. **Documentation**: Document custom cosmic components
7. **Gradual Enhancement**: Ensure basic functionality without cosmic effects

## Future Enhancements

1. **3D Effects**: WebGL-based cosmic backgrounds
2. **Interactive Particles**: Mouse-responsive particle systems
3. **Sound Integration**: Cosmic ambient sounds
4. **Advanced Shaders**: Custom CSS and WebGL shaders
5. **VR/AR Support**: Immersive cosmic experiences
6. **Dynamic Themes**: Time-based theme variations

---

**Last Updated**: December 2024
**Version**: 1.0.0
**Maintainer**: SAMIA TAROT Development Team 