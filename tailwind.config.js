/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cosmic: {
          50: '#fdf4ff',
          100: '#fae8ff',
          200: '#f5d0fe',
          300: '#f0abfc',
          400: '#e879f9',
          500: '#d946ef',
          600: '#c026d3',
          700: '#a21caf',
          800: '#86198f',
          900: '#701a75',
          950: '#4a044e',
          // Light theme variants
          'light-50': '#f8fafc',
          'light-100': '#f1f5f9',
          'light-200': '#e2e8f0',
          'light-300': '#cbd5e1',
          'light-400': '#94a3b8',
          'light-500': '#64748b',
        },
        gold: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
          // Light theme variants
          'light-400': '#d97706',
          'light-500': '#b45309',
          'light-600': '#92400e',
        },
        dark: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        }
      },
      fontFamily: {
        'arabic': ['Noto Sans Arabic', 'Arial', 'sans-serif'],
        'english': ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite alternate',
        'cosmic-pulse': 'cosmic-pulse 3s ease-in-out infinite alternate',
        'text-glow': 'text-glow-pulse 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #fbbf24, 0 0 10px #fbbf24, 0 0 15px #fbbf24' },
          '100%': { boxShadow: '0 0 10px #fbbf24, 0 0 20px #fbbf24, 0 0 30px #fbbf24' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        },
        'pulse-glow': {
          '0%, 100%': { 
            boxShadow: '0 0 5px var(--gold-glow), 0 0 10px var(--gold-glow), 0 0 15px var(--gold-glow)',
            transform: 'scale(1)'
          },
          '50%': { 
            boxShadow: '0 0 10px var(--gold-glow), 0 0 20px var(--gold-glow), 0 0 30px var(--gold-glow)',
            transform: 'scale(1.02)'
          }
        },
        'cosmic-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px var(--cosmic-glow), 0 0 40px var(--cosmic-glow)' },
          '50%': { boxShadow: '0 0 30px var(--cosmic-glow), 0 0 60px var(--cosmic-glow)' }
        },
        'text-glow-pulse': {
          '0%, 100%': { textShadow: '0 0 5px currentColor, 0 0 10px currentColor' },
          '50%': { textShadow: '0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor' }
        }
      },
      backgroundImage: {
        'cosmic-gradient': 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        'cosmic-gradient-light': 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)',
        'gold-gradient': 'linear-gradient(135deg, #fbbf24 0%, #f59e0b  50%, #d97706 100%)',
        'gold-gradient-light': 'linear-gradient(135deg, #d97706 0%, #b45309 50%, #92400e 100%)',
      }
    },
  },
  plugins: [],
  darkMode: 'class',
} 