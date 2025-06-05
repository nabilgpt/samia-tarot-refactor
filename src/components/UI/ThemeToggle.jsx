import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUI } from '../../context/UIContext';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useUI();
  const isDark = theme === 'dark';

  // Custom Sun Icon Component
  const SunIcon = () => (
    <motion.svg
      key="sun"
      initial={{ rotate: -90, scale: 0 }}
      animate={{ rotate: 0, scale: 1 }}
      exit={{ rotate: 90, scale: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      className="text-yellow-400"
    >
      {/* Sun center */}
      <motion.circle
        cx="12"
        cy="12"
        r="4"
        fill="currentColor"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      />
      
      {/* Sun rays */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, index) => (
        <motion.line
          key={angle}
          x1="12"
          y1="2"
          x2="12"
          y2="6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          transform={`rotate(${angle} 12 12)`}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ 
            delay: 0.2 + (index * 0.05), 
            duration: 0.3,
            ease: "easeOut"
          }}
        />
      ))}
    </motion.svg>
  );

  // Custom Moon Icon Component
  const MoonIcon = () => (
    <motion.svg
      key="moon"
      initial={{ rotate: 90, scale: 0 }}
      animate={{ rotate: 0, scale: 1 }}
      exit={{ rotate: -90, scale: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      className="text-blue-300"
    >
      {/* Moon crescent */}
      <motion.path
        d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
        fill="currentColor"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
      />
      
      {/* Stars around moon */}
      {[
        { x: 6, y: 6, delay: 0.3 },
        { x: 18, y: 8, delay: 0.4 },
        { x: 4, y: 16, delay: 0.5 },
        { x: 19, y: 18, delay: 0.6 }
      ].map((star, index) => (
        <motion.circle
          key={index}
          cx={star.x}
          cy={star.y}
          r="1"
          fill="currentColor"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ 
            scale: [0, 1.2, 1], 
            opacity: [0, 1, 0.8] 
          }}
          transition={{ 
            delay: star.delay, 
            duration: 0.4,
            ease: "easeOut"
          }}
        />
      ))}
    </motion.svg>
  );

  return (
    <motion.button
      onClick={toggleTheme}
      className={`
        relative p-3 rounded-full transition-all duration-300 ease-in-out
        ${isDark 
          ? 'bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-blue-400/30 hover:from-indigo-600/30 hover:to-purple-600/30 hover:border-blue-400/50' 
          : 'bg-gradient-to-br from-yellow-400/20 to-orange-500/20 border border-yellow-400/30 hover:from-yellow-400/30 hover:to-orange-500/30 hover:border-yellow-400/50'
        }
        hover:scale-110 active:scale-95 shadow-lg hover:shadow-xl
        backdrop-blur-sm
      `}
      whileHover={{ 
        scale: 1.1,
        boxShadow: isDark 
          ? "0 0 20px rgba(59, 130, 246, 0.3)" 
          : "0 0 20px rgba(251, 191, 36, 0.3)"
      }}
      whileTap={{ scale: 0.95 }}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {/* Background glow effect */}
      <motion.div
        className={`
          absolute inset-0 rounded-full blur-md -z-10
          ${isDark 
            ? 'bg-gradient-to-br from-blue-400/20 to-purple-500/20' 
            : 'bg-gradient-to-br from-yellow-400/20 to-orange-500/20'
          }
        `}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 0.8, 0.5]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Icon container with smooth transition */}
      <div className="relative w-5 h-5 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {isDark ? <MoonIcon /> : <SunIcon />}
        </AnimatePresence>
      </div>

      {/* Orbital particles effect */}
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      >
        {[0, 120, 240].map((angle, index) => (
          <motion.div
            key={index}
            className={`
              absolute w-1 h-1 rounded-full
              ${isDark ? 'bg-blue-400/60' : 'bg-yellow-400/60'}
            `}
            style={{
              top: '2px',
              left: '50%',
              transformOrigin: '0 14px',
              transform: `rotate(${angle}deg) translateX(-50%)`
            }}
            animate={{
              scale: [0.5, 1, 0.5],
              opacity: [0.3, 1, 0.3]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: index * 0.3,
              ease: "easeInOut"
            }}
          />
        ))}
      </motion.div>
    </motion.button>
  );
};

export default ThemeToggle; 