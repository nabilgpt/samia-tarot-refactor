import React, { useCallback, useMemo } from 'react';
import Particles from 'react-tsparticles';
import { loadSlim } from 'tsparticles-slim';
import { useUI } from '../contexts/UIContext';

// Color palette to match the exact screenshot
const bgTheme = {
  // Page backdrop - dark navy matching screenshot
  backdropFrom: '#0A0F1E',
  backdropTo: '#0B1020',
  // Particles/nodes - purple, amber, lilac
  nodeColors: ['#A78BFA', '#F59E0B', '#C084FC'],
  nodeAlpha: 0.9,
  // Connecting lines - semi-transparent purple
  linkColor: 'rgba(167,139,250,0.35)',
  linkWidth: 1.0,
  // Glow/accents - soft amber glow
  glowColor: 'rgba(255,193,7,0.25)',
  dotAccent: '#7DD3FC' // tiny cyan dots
};

const CosmicBackground = () => {
  const { theme } = useUI();

  // Initialize particles engine
  const particlesInit = useCallback(async (engine: any) => {
    await loadSlim(engine);
  }, []);

  // Theme-aware particle configuration using bgTheme
  const particlesConfig = useMemo(() => ({
    background: {
      color: {
        value: "transparent",
      },
    },
    fpsLimit: 120,
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
          quantity: 4,
        },
        repulse: {
          distance: 200,
          duration: 0.4,
        },
      },
    },
    particles: {
      color: {
        value: theme === 'dark' ? bgTheme.nodeColors : ["#d97706", "#8b5cf6", "#0ea5e9"],
      },
      links: {
        color: theme === 'dark' ? bgTheme.linkColor : "#d97706",
        distance: 150,
        enable: true,
        opacity: theme === 'dark' ? 0.35 : 0.15,
        width: bgTheme.linkWidth,
      },
      collisions: {
        enable: true,
      },
      move: {
        direction: "none" as const,
        enable: true,
        outModes: {
          default: "bounce" as const,
        },
        random: false,
        speed: theme === 'dark' ? 1 : 0.8,
        straight: false,
      },
      number: {
        density: {
          enable: true,
          area: 800,
        },
        value: theme === 'dark' ? 80 : 60,
      },
      opacity: {
        value: theme === 'dark' ? bgTheme.nodeAlpha : 0.4,
      },
      shape: {
        type: "circle" as const,
      },
      size: {
        value: { min: 1, max: 3 },
      },
    },
    detectRetina: true,
  }), [theme]);

  return (
    <>
      {/* Base backdrop - exact dark navy from screenshot */}
      <div
        className="fixed inset-0 z-[-10]"
        style={{
          background: theme === 'dark'
            ? `linear-gradient(135deg, ${bgTheme.backdropFrom} 0%, ${bgTheme.backdropTo} 100%)`
            : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)',
          width: '100vw',
          height: '100vh'
        }}
      />

      {/* Subtle glow overlay */}
      <div
        className="fixed inset-0 z-[-9]"
        style={{
          background: theme === 'dark'
            ? `radial-gradient(ellipse at top left, ${bgTheme.glowColor} 0%, transparent 50%),
               radial-gradient(ellipse at bottom right, ${bgTheme.glowColor} 0%, transparent 50%)`
            : 'transparent',
          width: '100%',
          height: '100%'
        }}
      />

      {/* Interactive Particle System */}
      <Particles
        id="tsparticles"
        init={particlesInit}
        options={particlesConfig}
        className="fixed inset-0 z-[-1] pointer-events-none"
      />

      {/* Force CSS to match screenshot colors */}
      <style dangerouslySetInnerHTML={{
        __html: `
          html, body, #root {
            background: ${theme === 'dark' ? bgTheme.backdropFrom : '#f8fafc'} !important;
            background-color: ${theme === 'dark' ? bgTheme.backdropFrom : '#f8fafc'} !important;
          }
        `
      }} />
    </>
  );
};

export default CosmicBackground;