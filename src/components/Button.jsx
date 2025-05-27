import React from 'react';
import { cn } from '../utils/cn';

const Button = React.forwardRef(({ 
  className, 
  variant = 'primary', 
  size = 'md', 
  children, 
  loading = false,
  disabled = false,
  ...props 
}, ref) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-gold-gradient text-dark-900 hover:shadow-xl hover:scale-105 active:scale-95 focus:ring-gold-400',
    secondary: 'bg-transparent border-2 border-gold-400 text-gold-400 hover:bg-gold-400 hover:text-dark-900 focus:ring-gold-400',
    outline: 'bg-transparent border border-white/20 text-white hover:bg-white/10 focus:ring-white/20',
    ghost: 'bg-transparent text-white hover:bg-white/10 focus:ring-white/20',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    cosmic: 'bg-cosmic-600 text-white hover:bg-cosmic-700 focus:ring-cosmic-500'
  };

  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
    xl: 'px-10 py-5 text-xl'
  };

  return (
    <button
      className={cn(
        baseClasses,
        variants[variant],
        sizes[size],
        loading && 'cursor-wait',
        className
      )}
      disabled={disabled || loading}
      ref={ref}
      {...props}
    >
      {loading && (
        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
});

Button.displayName = 'Button';

export default Button; 