import React from 'react';
import { motion } from 'framer-motion';

// SPECIALIZED AUTH INITIALIZATION COMPONENT
// Prevents route flicker during session rehydration
const AuthInitializer = ({ isInitializing, children }) => {
  if (!isInitializing) {
    return children;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        {/* Cosmic Loading Animation */}
        <div className="relative mb-8">
          <div className="w-16 h-16 mx-auto">
            {/* Outer Ring */}
            <motion.div
              className="absolute inset-0 border-4 border-purple-500/30 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
            {/* Inner Ring */}
            <motion.div
              className="absolute inset-2 border-4 border-pink-500/50 rounded-full"
              animate={{ rotate: -360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
            {/* Core */}
            <motion.div
              className="absolute inset-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          </div>
        </div>
        
        {/* Loading Text */}
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-white"
        >
          <h2 className="text-xl font-semibold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Initializing Session...
          </h2>
          <p className="text-gray-400 text-sm">
            Verifying authentication state
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default AuthInitializer; 