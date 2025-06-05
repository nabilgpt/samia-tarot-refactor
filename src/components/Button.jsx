import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';
import { useUI } from '../context/UIContext';

const Button = React.forwardRef(({ 
  className, 
  variant = 'primary', 
  size = 'md', 
  children, 
  loading = false,
  disabled = false,
  glow = false,
  animated = true,
  ...props 
}, ref) => {
  const { theme } = useUI();
  
  const baseClasses = 'inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group';
  
  const variants = {
    primary: 'bg-gold-gradient-theme hover:shadow-theme-gold text-theme-inverse focus:ring-2 shadow-theme-card hover:shadow-xl',
    secondary: 'bg-transparent border-2 border-theme-cosmic text-theme-primary hover:bg-cosmic-gradient hover:text-theme-inverse focus:ring-2',
    cosmic: 'bg-cosmic-gradient hover:shadow-theme-cosmic text-theme-inverse focus:ring-2 shadow-theme-card hover:shadow-xl',
    outline: 'bg-transparent border-2 border-theme-subtle text-theme-primary hover:bg-theme-glass focus:ring-2 backdrop-blur-sm',
    ghost: 'bg-transparent text-theme-primary hover:bg-theme-glass focus:ring-2',
    danger: 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white focus:ring-red-500 shadow-theme-card hover:shadow-xl',
    success: 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white focus:ring-green-500 shadow-theme-card hover:shadow-xl',
    glass: 'bg-theme-glass backdrop-blur-md border border-theme-subtle text-theme-primary hover:bg-theme-card focus:ring-2',
    neon: 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white focus:ring-cyan-400 shadow-theme-card hover:shadow-xl'
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

  const ButtonComponent = animated ? motion.button : 'button';

  return (
    <ButtonComponent
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
      variants={animated ? buttonVariants : undefined}
      initial={animated ? "initial" : undefined}
      whileHover={animated && !disabled ? "hover" : undefined}
      whileTap={animated && !disabled ? "tap" : undefined}
      style={{
        '--ring-color': variant === 'primary' ? 'var(--gold-primary)' : 
                       variant === 'cosmic' ? 'var(--cosmic-primary)' :
                       variant === 'danger' ? '#ef4444' :
                       variant === 'success' ? '#22c55e' :
                       variant === 'neon' ? '#06b6d4' :
                       'var(--border-cosmic)',
        '--ring-offset-color': 'var(--bg-primary)'
      }}
      {...props}
    >
      {/* Shine effect */}
      <div 
        className="absolute inset-0 -left-full group-hover:left-full bg-gradient-to-r from-transparent to-transparent transition-all duration-500 transform skew-x-12"
        style={{
          background: `linear-gradient(to right, transparent, ${theme === 'light' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.2)'}, transparent)`
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 flex items-center">
        {loading && (
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </div>
      
      {/* Cosmic glow border */}
      {glow && (
        <div 
          className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-30 transition-opacity duration-300 blur-sm -z-10"
          style={{
            background: `linear-gradient(to right, var(--gold-glow), var(--cosmic-glow), var(--gold-glow))`
          }}
        />
      )}
    </ButtonComponent>
  );
});

Button.displayName = 'Button';

export default Button; 