/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'arabic': ['Amiri', 'serif'],
      },
      colors: {
        'cosmic-purple': {
          50: '#f3f1ff',
          500: '#7c3aed',
          900: '#1e1b4b'
        }
      },
      animation: {
        'twinkle': 'twinkle 3s linear infinite',
        'float': 'float 10s ease-in-out infinite',
        'drift': 'drift 8s linear infinite',
      },
      keyframes: {
        twinkle: {
          '0%, 100%': { opacity: '0.3', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.2)' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '25%': { transform: 'translateY(-20px) rotate(90deg)' },
          '50%': { transform: 'translateY(-10px) rotate(180deg)' },
          '75%': { transform: 'translateY(-30px) rotate(270deg)' }
        },
        drift: {
          '0%': { transform: 'translateY(100vh) translateX(0) rotate(0deg)', opacity: '0' },
          '10%': { opacity: '1' },
          '90%': { opacity: '1' },
          '100%': { transform: 'translateY(-100vh) translateX(50px) rotate(360deg)', opacity: '0' }
        }
      }
    },
  },
  plugins: [],
}