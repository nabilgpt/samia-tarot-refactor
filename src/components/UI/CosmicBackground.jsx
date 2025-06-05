import React from 'react';
import { motion } from 'framer-motion';
import { useUI } from '../../context/UIContext';

const CosmicBackground = () => {
  const { theme } = useUI();
  
  // Theme-specific color configurations
  const themeConfig = {
    dark: {
      baseGradient: 'from-gray-900 via-gray-800 to-gray-900',
      orbs: {
        cosmic: 'bg-cosmic-500/20',
        gold: 'bg-gold-500/15',
        cyan: 'bg-cyan-500/20',
        purple: 'bg-purple-500/20'
      },
      grid: 'rgba(251, 191, 36, 0.1)',
      noise: [
        'rgba(217, 70, 239, 0.3)',
        'rgba(6, 182, 212, 0.3)',
        'rgba(251, 191, 36, 0.2)'
      ]
    },
    light: {
      baseGradient: 'from-slate-50 via-slate-100 to-slate-50',
      orbs: {
        cosmic: 'bg-purple-400/30',
        gold: 'bg-amber-400/25',
        cyan: 'bg-sky-400/30',
        purple: 'bg-violet-400/25'
      },
      grid: 'rgba(217, 119, 6, 0.15)',
      noise: [
        'rgba(139, 92, 246, 0.4)',
        'rgba(14, 165, 233, 0.4)',
        'rgba(217, 119, 6, 0.3)'
      ]
    }
  };

  const config = themeConfig[theme];

  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      {/* Base cosmic gradient */}
      <motion.div 
        className={`absolute inset-0 bg-gradient-to-br ${config.baseGradient}`}
        animate={{
          background: theme === 'dark' 
            ? 'linear-gradient(to bottom right, #111827, #1f2937, #111827)'
            : 'linear-gradient(to bottom right, #f8fafc, #f1f5f9, #f8fafc)'
        }}
        transition={{ duration: 0.5 }}
      />
      
      {/* Animated cosmic orbs */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          repeatType: "loop",
          ease: "easeInOut"
        }}
        className={`absolute top-20 left-10 w-96 h-96 ${config.orbs.cosmic} rounded-full blur-3xl transition-colors duration-500`}
      />
      
      <motion.div
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.2, 0.5, 0.2],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          repeatType: "loop",
          ease: "easeInOut",
          delay: 2
        }}
        className={`absolute bottom-20 right-10 w-80 h-80 ${config.orbs.gold} rounded-full blur-3xl transition-colors duration-500`}
      />
      
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.25, 0.4, 0.25],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          repeatType: "loop",
          ease: "easeInOut",
          delay: 4
        }}
        className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 ${config.orbs.cyan} rounded-full blur-3xl transition-colors duration-500`}
      />
      
      <motion.div
        animate={{
          scale: [1.1, 1, 1.1],
          opacity: [0.15, 0.3, 0.15],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          repeatType: "loop",
          ease: "easeInOut",
          delay: 1
        }}
        className={`absolute top-32 right-1/4 w-64 h-64 ${config.orbs.purple} rounded-full blur-3xl transition-colors duration-500`}
      />
      
      {/* Floating particles for enhanced cosmic effect */}
      <div className="absolute inset-0">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className={`absolute w-2 h-2 rounded-full ${
              theme === 'dark' ? 'bg-gold-400/60' : 'bg-amber-500/40'
            }`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0, 1, 0],
              scale: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 4 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 4,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
      
      {/* Subtle grid pattern */}
      <motion.div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(${config.grid} 1px, transparent 1px),
            linear-gradient(90deg, ${config.grid} 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
        animate={{
          opacity: theme === 'dark' ? 0.05 : 0.08
        }}
        transition={{ duration: 0.5 }}
      />
      
      {/* Cosmic noise texture */}
      <motion.div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 50%, ${config.noise[0]} 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, ${config.noise[1]} 0%, transparent 50%),
            radial-gradient(circle at 40% 80%, ${config.noise[2]} 0%, transparent 50%)
          `
        }}
        animate={{
          opacity: theme === 'dark' ? 0.1 : 0.15
        }}
        transition={{ duration: 0.5 }}
      />

      {/* Enhanced cosmic rays for light mode */}
      {theme === 'light' && (
        <motion.div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse at top left, rgba(139, 92, 246, 0.1) 0%, transparent 50%),
              radial-gradient(ellipse at bottom right, rgba(217, 119, 6, 0.1) 0%, transparent 50%)
            `
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        />
      )}
    </div>
  );
};

export default CosmicBackground; 