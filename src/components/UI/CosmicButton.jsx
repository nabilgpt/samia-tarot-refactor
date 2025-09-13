import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

const CosmicButton = React.forwardRef(({ 
  className, 
  variant = 'primary', 
  size = 'md', 
  children, 
  loading = false,
  disabled = false,
  glow = false,
  animated = true,
  ariaLabel,
  ariaDescribedBy,
  loadingText = "Loading...",
  ...props 
}, ref) => {
  const baseClasses = `
    inline-flex items-center justify-center rounded-xl font-semibold 
    transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 
    disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group
  `;
  
  const variants = {
    primary: `
      bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700
      dark:from-gold-500 dark:to-gold-600 dark:hover:from-gold-600 dark:hover:to-gold-700
      light:from-amber-600 light:to-amber-700 light:hover:from-amber-700 light:hover:to-amber-800
      text-gray-900 dark:text-gray-900 light:text-white
      focus:ring-gold-400 dark:focus:ring-gold-400 light:focus:ring-amber-500
      shadow-lg hover:shadow-xl
    `,
    secondary: `
      bg-transparent border-2 
      border-gold-400 dark:border-gold-400 light:border-amber-600
      text-gold-400 dark:text-gold-400 light:text-amber-600
      hover:bg-gold-400 hover:text-gray-900
      dark:hover:bg-gold-400 dark:hover:text-gray-900
      light:hover:bg-amber-600 light:hover:text-white
      focus:ring-gold-400 dark:focus:ring-gold-400 light:focus:ring-amber-500
    `,
    cosmic: `
      bg-gradient-to-r from-cosmic-600 to-purple-600 hover:from-cosmic-700 hover:to-purple-700
      dark:from-cosmic-600 dark:to-purple-600 dark:hover:from-cosmic-700 dark:hover:to-purple-700
      light:from-purple-600 light:to-violet-600 light:hover:from-purple-700 light:hover:to-violet-700
      text-white dark:text-white light:text-white
      focus:ring-cosmic-500 dark:focus:ring-cosmic-500 light:focus:ring-purple-500
      shadow-lg hover:shadow-xl
    `,
    outline: `
      bg-transparent border-2 
      border-white/20 dark:border-white/20 light:border-slate-300/60
      text-white dark:text-white light:text-slate-700
      hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-slate-100/60
      focus:ring-white/20 dark:focus:ring-white/20 light:focus:ring-slate-300
      backdrop-blur-sm
    `,
    ghost: `
      bg-transparent 
      text-white dark:text-white light:text-slate-700
      hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-slate-100/50
      focus:ring-white/20 dark:focus:ring-white/20 light:focus:ring-slate-300
    `,
    danger: `
      bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800
      dark:from-red-600 dark:to-red-700 dark:hover:from-red-700 dark:hover:to-red-800
      light:from-red-600 light:to-red-700 light:hover:from-red-700 light:hover:to-red-800
      text-white dark:text-white light:text-white
      focus:ring-red-500 dark:focus:ring-red-500 light:focus:ring-red-500
      shadow-lg hover:shadow-xl
    `,
    success: `
      bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800
      dark:from-green-600 dark:to-green-700 dark:hover:from-green-700 dark:hover:to-green-800
      light:from-green-600 light:to-green-700 light:hover:from-green-700 light:hover:to-green-800
      text-white dark:text-white light:text-white
      focus:ring-green-500 dark:focus:ring-green-500 light:focus:ring-green-500
      shadow-lg hover:shadow-xl
    `,
    glass: `
      bg-white/10 dark:bg-white/10 light:bg-white/60
      backdrop-blur-md border 
      border-white/20 dark:border-white/20 light:border-slate-200/60
      text-white dark:text-white light:text-slate-700
      hover:bg-white/20 dark:hover:bg-white/20 light:hover:bg-white/80
      focus:ring-white/20 dark:focus:ring-white/20 light:focus:ring-slate-300
    `,
    neon: `
      bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700
      dark:from-cyan-500 dark:to-blue-600 dark:hover:from-cyan-600 dark:hover:to-blue-700
      light:from-cyan-600 light:to-blue-700 light:hover:from-cyan-700 light:hover:to-blue-800
      text-white dark:text-white light:text-white
      focus:ring-cyan-400 dark:focus:ring-cyan-400 light:focus:ring-cyan-500
      shadow-lg hover:shadow-xl
    `
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
    xl: 'px-12 py-6 text-xl'
  };

  const glowClasses = glow ? 'animate-pulse-glow' : '';

  const buttonVariants = {
    initial: { scale: 1 },
    hover: { 
      scale: 1.05,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 10
      }
    },
    tap: { 
      scale: 0.95,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 10
      }
    }
  };

  return (
    <motion.button
      className={cn(
        baseClasses,
        variants[variant],
        sizes[size],
        glowClasses,
        loading && 'cursor-wait',
        className
      )}
      disabled={disabled || loading}
      ref={ref}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-busy={loading}
      variants={animated ? buttonVariants : {}}
      initial={animated ? "initial" : {}}
      whileHover={animated && !disabled ? "hover" : {}}
      whileTap={animated && !disabled ? "tap" : {}}
      {...props}
    >
      {/* Shine effect */}
      <div className="absolute inset-0 -left-full group-hover:left-full bg-gradient-to-r from-transparent via-white/20 to-transparent dark:via-white/20 light:via-slate-400/30 transition-all duration-500 transform skew-x-12" />
      
      {/* Content */}
      <div className="relative z-10 flex items-center">
        {loading && (
          <>
            <div 
              className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
              aria-hidden="true"
            />
            <span className="sr-only">{loadingText}</span>
          </>
        )}
        {children}
      </div>
      
      {/* Cosmic glow border */}
      {glow && (
        <div 
          className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-30 transition-opacity duration-300 blur-sm -z-10"
          style={{
            background: 'linear-gradient(to right, var(--gold-glow), var(--cosmic-glow), var(--gold-glow))'
          }}
        />
      )}
    </motion.button>
  );
});

CosmicButton.displayName = 'CosmicButton';

export default CosmicButton; 