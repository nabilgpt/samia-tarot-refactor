import React from 'react';
import { motion } from 'framer-motion';
import Particles from 'react-tsparticles';
import { loadSlim } from 'tsparticles-slim';
import { useCallback, useMemo } from 'react';
import Navbar from '../Navbar';
import CosmicBackground from '../UI/CosmicBackground';
import { useUI } from '../../context/UIContext';

const MainLayout = ({ children, showNavbar = true, showParticles = true, className = "" }) => {
  const { language } = useUI();

  // Particle configuration for cosmic background
  const particlesInit = useCallback(async engine => {
    await loadSlim(engine);
  }, []);

  const particlesConfig = useMemo(() => ({
    background: {
      color: {
        value: "transparent",
      },
    },
    fpsLimit: 60,
    interactivity: {
      events: {
        onClick: {
          enable: true,
          mode: "push",
        },
        onHover: {
          enable: true,
          mode: "repulse",
        },
        resize: true,
      },
      modes: {
        push: {
          quantity: 2,
        },
        repulse: {
          distance: 100,
          duration: 0.4,
        },
      },
    },
    particles: {
      color: {
        value: ["#fbbf24", "#d946ef", "#06b6d4", "#ffffff"],
      },
      links: {
        color: "#fbbf24",
        distance: 120,
        enable: true,
        opacity: 0.1,
        width: 1,
      },
      collisions: {
        enable: true,
      },
      move: {
        direction: "none",
        enable: true,
        outModes: {
          default: "bounce",
        },
        random: false,
        speed: 0.5,
        straight: false,
      },
      number: {
        density: {
          enable: true,
          area: 1000,
        },
        value: 50,
      },
      opacity: {
        value: 0.2,
      },
      shape: {
        type: "circle",
      },
      size: {
        value: { min: 1, max: 2 },
      },
    },
    detectRetina: true,
  }), []);

  return (
    <div className={`
      min-h-screen max-h-screen h-screen
      bg-gray-900 text-white 
      overflow-hidden
      flex flex-col
      ${className}
    `}>
      {/* Cosmic Background */}
      <CosmicBackground />
      
      {/* Particle Background */}
      {showParticles && (
        <Particles
          id="main-particles"
          init={particlesInit}
          options={particlesConfig}
          className="fixed inset-0 z-0 pointer-events-none"
        />
      )}

      {/* Navigation - Fixed height */}
      {showNavbar && (
        <div className="relative z-20 flex-shrink-0">
          <Navbar />
        </div>
      )}

      {/* Main Content Container - Fills remaining height with proper overflow */}
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="
          relative z-10 
          flex-1 
          min-h-0
          overflow-y-auto overflow-x-hidden
          scrollbar-thin scrollbar-track-gray-900 scrollbar-thumb-purple-600/50
          hover:scrollbar-thumb-purple-500/70
        "
      >
        <div className="min-h-full w-full">
          {children}
        </div>
      </motion.main>

      {/* Floating Cosmic Elements */}
      <div className="fixed inset-0 pointer-events-none z-5">
        <motion.div
          animate={{
            y: [-20, 20, -20],
            x: [-10, 10, -10],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            repeatType: "loop",
            ease: "easeInOut"
          }}
          className="absolute top-20 right-20 w-4 h-4 bg-gold-400/30 rounded-full blur-sm"
        />
        <motion.div
          animate={{
            y: [20, -20, 20],
            x: [10, -10, 10],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            repeatType: "loop",
            ease: "easeInOut",
            delay: 2
          }}
          className="absolute bottom-32 left-20 w-3 h-3 bg-cosmic-400/40 rounded-full blur-sm"
        />
        <motion.div
          animate={{
            y: [-15, 15, -15],
            x: [15, -15, 15],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            repeatType: "loop",
            ease: "easeInOut",
            delay: 4
          }}
          className="absolute top-1/2 right-32 w-2 h-2 bg-cyan-400/30 rounded-full blur-sm"
        />
      </div>
    </div>
  );
};

export default MainLayout; 