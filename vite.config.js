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
  server: {
    port: 3000,
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
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false
      }
    }
  }
}) 