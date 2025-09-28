import { useCallback, useMemo } from 'react'
import { Outlet } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { loadSlim } from 'tsparticles-slim'
import Particles from 'react-tsparticles'
import Navigation from '../components/Navigation.jsx'

export default function AppLayout({ children }) {
  const shouldReduceMotion = useReducedMotion()

  const particlesInit = useCallback(async engine => {
    await loadSlim(engine)
  }, [])

  const particlesConfig = useMemo(() => ({
    background: {
      color: {
        value: "transparent",
      },
    },
    fpsLimit: 60,
    pauseOnBlur: true,
    pauseOnOutsideViewport: true,
    interactivity: {
      detectsOn: "window",
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
          distance: 150,
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
        distance: 120,
        enable: true,
        opacity: 0.2,
        width: 1,
      },
      collisions: {
        enable: false,
      },
      move: {
        direction: "none",
        enable: true,
        outModes: {
          default: "bounce",
        },
        random: false,
        speed: 0.8,
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
        value: 0.3,
        animation: {
          enable: false,
        },
      },
      shape: {
        type: "circle",
      },
      size: {
        value: { min: 1, max: 2 },
        animation: {
          enable: false,
        },
      },
    },
    detectRetina: true,
    smooth: true,
  }), [])

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
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white relative overflow-hidden">
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
          style={{ background: 'radial-gradient(circle, #d946ef 0%, transparent 70%)' }}
          variants={floatVariants}
          animate="animate"
        />
        <motion.div
          className="absolute top-40 right-32 w-24 h-24 rounded-full opacity-15 blur-xl"
          style={{ background: 'radial-gradient(circle, #fbbf24 0%, transparent 70%)' }}
          variants={floatVariants}
          animate="animate"
          transition={{ delay: 1 }}
        />
        <motion.div
          className="absolute bottom-32 left-40 w-40 h-40 rounded-full opacity-10 blur-xl"
          style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }}
          variants={floatVariants}
          animate="animate"
          transition={{ delay: 2 }}
        />
        <motion.div
          className="absolute bottom-20 right-20 w-28 h-28 rounded-full opacity-25 blur-xl"
          style={{ background: 'radial-gradient(circle, #d946ef 0%, transparent 70%)' }}
          variants={floatVariants}
          animate="animate"
          transition={{ delay: 0.5 }}
        />
      </div>

      <Navigation />

      <main className="relative z-10">
        {children}
      </main>
    </div>
  )
}