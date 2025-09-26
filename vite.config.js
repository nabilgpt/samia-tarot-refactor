import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Fix for "process is not defined" error in frontend
    global: 'globalThis',
    // Don't define process entirely - just define process.env as empty object
    'process.env': {}
  },
  build: {
    // M36 Performance optimizations
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false, // Disable sourcemaps in production for faster builds
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // M36 INP Optimization - Smart code splitting
          
          // Core React libraries (critical path)
          if (id.includes('react') && !id.includes('react-router')) {
            return 'react-core';
          }
          
          // Router (loaded after initial render)
          if (id.includes('react-router')) {
            return 'router';
          }
          
          // Animation libraries (can be lazy loaded)
          if (id.includes('framer-motion') || id.includes('lottie')) {
            return 'animations';
          }
          
          // Chart libraries (heavy, lazy load)
          if (id.includes('recharts') || id.includes('chart')) {
            return 'charts';
          }
          
          // Form libraries
          if (id.includes('react-hook-form') || id.includes('joi') || id.includes('validator')) {
            return 'forms';
          }
          
          // UI libraries (icons, etc.)
          if (id.includes('lucide-react') || id.includes('react-icons')) {
            return 'ui-icons';
          }
          
          // Admin pages (lazy loaded)
          if (id.includes('/admin/') && id.includes('.jsx')) {
            return 'admin-pages';
          }
          
          // Dashboard pages (lazy loaded)
          if (id.includes('/dashboard/') && id.includes('.jsx')) {
            return 'dashboard-pages';
          }
          
          // Payment libraries (lazy loaded when needed)
          if (id.includes('stripe') || id.includes('square')) {
            return 'payments';
          }
          
          // Communication libraries (lazy loaded)
          if (id.includes('socket.io') || id.includes('twilio')) {
            return 'communications';
          }
          
          // Node modules that are large
          if (id.includes('node_modules')) {
            // Date utilities
            if (id.includes('date-fns') || id.includes('moment')) {
              return 'date-utils';
            }
            
            // Crypto/security
            if (id.includes('crypto') || id.includes('bcrypt')) {
              return 'security';
            }
            
            // General vendor code
            return 'vendor';
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000 // 1MB chunk warning
  },
  server: {
    port: 5173, // Updated to match lighthouserc.js
    open: true,
    host: '0.0.0.0', // Allow external connections
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '.ngrok-free.app', // Allow all ngrok free domains
      '.ngrok.io', // Allow all ngrok domains
      'df50dc1efad9.ngrok-free.app' // Specific ngrok domain
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false
      }
    }
  },
  optimizeDeps: {
    // M36 Dependency pre-bundling optimizations
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'framer-motion',
      'lucide-react'
    ],
    exclude: ['web-vitals'] // Keep web-vitals as ESM for better tree-shaking
  }
}) 