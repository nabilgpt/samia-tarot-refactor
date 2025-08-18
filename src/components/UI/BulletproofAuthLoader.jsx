import React from 'react';
import { motion } from 'framer-motion';

// BULLETPROOF AUTHENTICATION LOADER - COSMIC THEME PRESERVED
const BulletproofAuthLoader = ({ 
  message = 'Verifying session...', 
  submessage = 'Please wait while we authenticate your account',
  showProgress = false 
}) => {
  return (
    <div className="fixed inset-0 w-full h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        {/* Cosmic Loading Rings */}
        <div className="relative mb-8">
          <div className="w-20 h-20 mx-auto">
            {/* Outer Ring - Purple */}
            <motion.div
              className="absolute inset-0 border-4 border-purple-500/40 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
            
            {/* Middle Ring - Pink */}
            <motion.div
              className="absolute inset-2 border-4 border-pink-500/60 rounded-full"
              animate={{ rotate: -360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
            
            {/* Inner Ring - Red */}
            <motion.div
              className="absolute inset-4 border-3 border-red-400/70 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            
            {/* Core Pulse */}
            <motion.div
              className="absolute inset-6 bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 rounded-full"
              animate={{ 
                scale: [1, 1.3, 1], 
                opacity: [0.7, 1, 0.7] 
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </div>
        
        {/* Loading Text - Cosmic Style */}
        <motion.div
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="space-y-3"
        >
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent">
            {message}
          </h2>
          <p className="text-gray-400 text-sm max-w-sm mx-auto">
            {submessage}
          </p>
        </motion.div>

        {/* Optional Progress Bar */}
        {showProgress && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 8, ease: "easeInOut" }}
            className="mt-6 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 rounded-full mx-auto max-w-xs"
          />
        )}

        {/* Cosmic Particles Effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-purple-400/30 rounded-full"
              animate={{
                x: [0, Math.random() * 400 - 200],
                y: [0, Math.random() * 300 - 150],
                opacity: [0, 1, 0],
                scale: [0, 1, 0]
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2
              }}
              style={{
                left: `${50 + Math.random() * 20 - 10}%`,
                top: `${50 + Math.random() * 20 - 10}%`
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default BulletproofAuthLoader; 