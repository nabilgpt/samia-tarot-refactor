import React, { useCallback, useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { loadSlim } from 'tsparticles-slim';
import Particles from 'react-tsparticles';
import Navigation from './Navigation';

const AppLayout = () => {
  const shouldReduceMotion = useReducedMotion();

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
    fpsLimit: 45, // Optimized for better performance
    pauseOnBlur: true, // Pause when tab is not active
    pauseOnOutsideViewport: true, // Pause when not visible
    interactivity: {
      detectsOn: "window", // Optimize interaction detection
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
          quantity: 2, // Reduced for performance
        },
        repulse: {
          distance: 150, // Reduced calculation area
          duration: 0.3,
        },
      },
    },
    particles: {
      color: {
        value: ["#fbbf24", "#d946ef", "#06b6d4", "#ffffff"],
      },
      links: {
        color: "#fbbf24",
        distance: 120, // Reduced for fewer calculations
        enable: true,
        opacity: 0.2,
        width: 1,
      },
      collisions: {
        enable: false, // Disabled for better performance
      },
      move: {
        direction: "none",
        enable: true,
        outModes: {
          default: "bounce",
        },
        random: false,
        speed: 0.8, // Slightly slower for smoother animation
        straight: false,
      },
      number: {
        density: {
          enable: true,
          area: 1000, // Increased area for fewer particles per space
        },
        value: 50, // Reduced particle count for performance
      },
      opacity: {
        value: 0.3,
        animation: {
          enable: false, // Disabled opacity animation for performance
        },
      },
      shape: {
        type: "circle",
      },
      size: {
        value: { min: 1, max: 2 }, // Smaller particles for better performance
        animation: {
          enable: false, // Disabled size animation for performance
        },
      },
    },
    detectRetina: true,
    smooth: true, // Enable smooth rendering
  }), []);

  // Animation variants with reduced motion support
  const floatVariants = {
    animate: shouldReduceMotion ? { y: 0 } : {
      y: [-10, 10, -10],
      transition: {
        duration: 4,
        repeat: Infinity,
        repeatType: "loop",
        ease: "easeInOut"
      }
    }
  };

  return (
    <div className="min-h-screen bg-primary-gradient relative overflow-hidden">
      {/* Cosmic Particles Background */}
      <div className="absolute inset-0 z-0">
        <Particles
          id="tsparticles"
          init={particlesInit}
          options={particlesConfig}
          className="absolute inset-0"
        />
      </div>

      {/* Cosmic Orbs - Floating Background Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <motion.div
          className="absolute top-20 left-20 w-32 h-32 rounded-full opacity-20 blur-xl"
          style={{ background: 'var(--orb-gradient-primary)' }}
          variants={floatVariants}
          animate="animate"
        />
        <motion.div
          className="absolute top-40 right-32 w-24 h-24 rounded-full opacity-15 blur-xl"
          style={{ background: 'var(--orb-gradient-secondary)' }}
          variants={floatVariants}
          animate="animate"
          transition={{ delay: 1 }}
        />
        <motion.div
          className="absolute bottom-32 left-40 w-40 h-40 rounded-full opacity-10 blur-xl"
          style={{ background: 'var(--orb-gradient-tertiary)' }}
          variants={floatVariants}
          animate="animate"
          transition={{ delay: 2 }}
        />
        <motion.div
          className="absolute bottom-20 right-20 w-28 h-28 rounded-full opacity-25 blur-xl"
          style={{ background: 'var(--orb-gradient-primary)' }}
          variants={floatVariants}
          animate="animate"
          transition={{ delay: 0.5 }}
        />
      </div>

      {/* Navigation */}
      <Navigation />

      {/* Page Content */}
      <div className="relative z-10">
        <Outlet />
      </div>
    </div>
  );
};

export default AppLayout;