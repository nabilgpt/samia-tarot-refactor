import React, { useEffect, useState } from 'react';
import { useUI } from '../../context/UIContext';

const AnimatedBackground = ({ 
  variant = 'default', 
  className = '',
  children,
  intensity = 'normal' // 'subtle', 'normal', 'intense'
}) => {
  const { theme } = useUI();
  const [themeKey, setThemeKey] = useState(0);

  // Force re-render when theme changes to update all effects
  useEffect(() => {
    const handleThemeChange = () => {
      setThemeKey(prev => prev + 1);
    };

    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, []);

  const getOrbSizes = () => {
    switch (intensity) {
      case 'subtle':
        return {
          primary: { width: '12rem', height: '12rem' },
          secondary: { width: '16rem', height: '16rem' },
          tertiary: { width: '14rem', height: '14rem' }
        };
      case 'intense':
        return {
          primary: { width: '24rem', height: '24rem' },
          secondary: { width: '32rem', height: '32rem' },
          tertiary: { width: '20rem', height: '20rem' }
        };
      default: // normal
        return {
          primary: { width: '18rem', height: '18rem' },
          secondary: { width: '24rem', height: '24rem' },
          tertiary: { width: '20rem', height: '20rem' }
        };
    }
  };

  const getVariantClasses = () => {
    // Use CSS variables for theme-aware backgrounds
    const baseClass = 'bg-primary-gradient';
    
    switch (variant) {
      case 'dashboard':
        return `${baseClass} cosmic-particles`;
      case 'profile':
        return `${baseClass} cosmic-particles`;
      case 'auth':
        return `${baseClass} cosmic-particles`;
      case 'reader':
        return `${baseClass} cosmic-particles`;
      case 'admin':
        return `${baseClass} cosmic-particles`;
      default:
        return `${baseClass} cosmic-particles`;
    }
  };

  const orbSizes = getOrbSizes();
  const variantClasses = getVariantClasses();

  return (
    <div 
      key={themeKey} 
      className={`min-h-screen relative ${variantClasses} ${className}`}
      style={{
        background: 'var(--bg-gradient)',
        transition: 'all 0.3s ease'
      }}
    >
      {/* Cosmic overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'var(--cosmic-gradient)',
          transition: 'all 0.3s ease'
        }}
      />

      {/* Animated Background Orbs with enhanced theme support */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Primary Cosmic Orb */}
        <div 
          className="absolute top-20 left-10 rounded-full blur-3xl"
          style={{
            ...orbSizes.primary,
            background: 'var(--orb-gradient-primary)',
            opacity: 'var(--orb-opacity-primary)',
            animation: 'cosmicPulse 4s ease-in-out infinite',
            transition: 'all 0.3s ease'
          }}
        />
        
        {/* Secondary Gold Orb */}
        <div 
          className="absolute bottom-20 right-10 rounded-full blur-3xl"
          style={{
            ...orbSizes.secondary,
            background: 'var(--orb-gradient-secondary)',
            opacity: 'var(--orb-opacity-secondary)',
            animation: 'goldShimmer 5s ease-in-out infinite',
            animationDelay: '1000ms',
            transition: 'all 0.3s ease'
          }}
        />
        
        {/* Tertiary Purple Orb */}
        <div 
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
          style={{
            ...orbSizes.tertiary,
            background: 'var(--orb-gradient-tertiary)',
            opacity: 'var(--orb-opacity-tertiary)',
            animation: 'floatDelayed 6s ease-in-out infinite',
            animationDelay: '500ms',
            transition: 'all 0.3s ease'
          }}
        />
        
        {/* Additional floating particles for intense mode */}
        {intensity === 'intense' && (
          <>
            <div 
              className="absolute top-1/4 right-1/4 rounded-full blur-2xl"
              style={{
                width: '8rem',
                height: '8rem',
                background: 'var(--orb-gradient-primary)',
                opacity: 'calc(var(--orb-opacity-primary) * 0.5)',
                animation: 'float 3s ease-in-out infinite',
                animationDelay: '2000ms',
                transition: 'all 0.3s ease'
              }}
            />
            <div 
              className="absolute bottom-1/4 left-1/4 rounded-full blur-2xl"
              style={{
                width: '10rem',
                height: '10rem',
                background: 'var(--orb-gradient-secondary)',
                opacity: 'calc(var(--orb-opacity-secondary) * 0.4)',
                animation: 'floatSlow 4s ease-in-out infinite',
                animationDelay: '1500ms',
                transition: 'all 0.3s ease'
              }}
            />
            
            {/* Extra cosmic sparkles for intense mode */}
            <div 
              className="absolute top-3/4 right-1/3 rounded-full blur-xl"
              style={{
                width: '6rem',
                height: '6rem',
                background: 'var(--orb-gradient-tertiary)',
                opacity: 'calc(var(--orb-opacity-tertiary) * 0.6)',
                animation: 'bounceSlow 5s ease-in-out infinite',
                animationDelay: '3000ms',
                transition: 'all 0.3s ease'
              }}
            />
          </>
        )}

        {/* Cosmic grid pattern overlay */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(var(--cosmic-primary) 1px, transparent 1px),
              linear-gradient(90deg, var(--cosmic-primary) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            opacity: theme === 'light' ? 0.02 : 0.05,
            transition: 'opacity 0.3s ease'
          }}
        />

        {/* Additional subtle texture for light mode */}
        {theme === 'light' && (
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `
                radial-gradient(circle at 25% 25%, var(--gold-primary) 0%, transparent 50%),
                radial-gradient(circle at 75% 75%, var(--cosmic-primary) 0%, transparent 50%)
              `,
              opacity: 0.03,
              animation: 'float 8s ease-in-out infinite',
              transition: 'all 0.3s ease'
            }}
          />
        )}
      </div>

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default AnimatedBackground; 