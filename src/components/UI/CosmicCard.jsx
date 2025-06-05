import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

const CosmicCard = ({ 
  children, 
  className = "", 
  variant = "default",
  hover = true,
  glow = false,
  animated = true,
  ...props 
}) => {
  const variants = {
    default: `
      bg-slate-900/50 dark:bg-slate-900/50 light:bg-slate-100/80
      border-white/10 dark:border-white/10 light:border-slate-300/50
      hover:border-gold-400/50 dark:hover:border-gold-400/50 light:hover:border-amber-500/60
    `,
    primary: `
      bg-gradient-to-br from-cosmic-900/50 to-purple-900/50 
      dark:from-cosmic-900/50 dark:to-purple-900/50
      light:from-purple-100/60 light:to-violet-100/60
      border-cosmic-400/30 dark:border-cosmic-400/30 light:border-purple-300/50
      hover:border-cosmic-400/60 dark:hover:border-cosmic-400/60 light:hover:border-purple-400/70
    `,
    gold: `
      bg-gradient-to-br from-amber-900/30 to-yellow-900/30
      dark:from-amber-900/30 dark:to-yellow-900/30
      light:from-amber-50/60 light:to-yellow-50/60
      border-gold-400/30 dark:border-gold-400/30 light:border-amber-300/50
      hover:border-gold-400/60 dark:hover:border-gold-400/60 light:hover:border-amber-400/70
    `,
    glass: `
      bg-white/5 dark:bg-white/5 light:bg-white/60
      border-white/20 dark:border-white/20 light:border-slate-200/60
      hover:border-white/40 dark:hover:border-white/40 light:hover:border-slate-300/80
      backdrop-blur-xl
    `,
    feature: `
      bg-gradient-to-br from-slate-800/60 to-slate-900/60
      dark:from-slate-800/60 dark:to-slate-900/60
      light:from-slate-50/80 light:to-slate-100/80
      border-gold-400/20 dark:border-gold-400/20 light:border-amber-300/40
      hover:border-gold-400/50 dark:hover:border-gold-400/50 light:hover:border-amber-400/60
    `
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12
      }
    },
    hover: {
      y: -5,
      scale: 1.02,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 10
      }
    }
  };

  const glowEffect = glow 
    ? "shadow-2xl shadow-gold-500/20 hover:shadow-gold-500/40 dark:shadow-cosmic-500/20 dark:hover:shadow-cosmic-500/40 light:shadow-amber-500/15 light:hover:shadow-amber-500/30" 
    : "";
  
  const hoverEffect = hover ? "hover:shadow-xl" : "";

  return (
    <motion.div
      variants={animated ? cardVariants : {}}
      initial={animated ? "hidden" : {}}
      animate={animated ? "visible" : {}}
      whileHover={hover ? "hover" : {}}
      className={cn(
        "relative rounded-2xl backdrop-blur-xl border transition-all duration-500 group overflow-hidden",
        variants[variant],
        glowEffect,
        hoverEffect,
        className
      )}
      style={{
        background: variant === 'default' 
          ? 'var(--bg-card)'
          : undefined,
        borderColor: variant === 'default' 
          ? 'var(--border-color)'
          : undefined,
      }}
      {...props}
    >
      {/* Shine effect on hover */}
      <div className="absolute inset-0 -left-full group-hover:left-full bg-gradient-to-r from-transparent via-white/10 to-transparent dark:via-white/10 light:via-slate-400/20 transition-all duration-1000 transform skew-x-12" />
      
      {/* Content */}
      <div className="relative z-10 text-slate-100 dark:text-slate-100 light:text-slate-900">
        {children}
      </div>
      
      {/* Cosmic border glow */}
      {glow && (
        <div 
          className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm -z-10"
          style={{
            background: 'linear-gradient(to right, var(--gold-glow), var(--cosmic-glow), var(--gold-glow))'
          }}
        />
      )}

      {/* Theme-responsive background overlay */}
      <div 
        className="absolute inset-0 rounded-2xl opacity-50 -z-20 transition-opacity duration-300"
        style={{
          background: 'var(--cosmic-gradient)'
        }}
      />
    </motion.div>
  );
};

export default CosmicCard; 