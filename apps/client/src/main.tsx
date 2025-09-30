import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { ErrorBoundary } from 'react-error-boundary'
import { Toaster } from 'react-hot-toast'
import App from './App'
import ErrorFallback from './components/ErrorFallback'
import { AuthProvider } from './contexts/AuthContext'
import { UIProvider } from './contexts/UIContext'
import './index.css'

// Register service worker for PWA
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration)
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError)
      })
  })
}

// Hide loading screen when React app starts
document.body.classList.add('loaded')

// Remove loading overlay after first render
requestAnimationFrame(() => {
  document.body.classList.add('app-loaded');
  const el = document.getElementById('loading-screen');
  if (el) el.remove();
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        console.error('App error:', error, errorInfo)
        // Send to error reporting service (Sentry)
        if (import.meta.env.PROD) {
          // Sentry.captureException(error)
        }
      }}
    >
      <HelmetProvider>
        <UIProvider>
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true
            }}
          >
            <AuthProvider>
              <App />
              <Toaster
                position="top-center"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    fontFamily: 'Amiri, serif',
                    border: '1px solid var(--border-cosmic)',
                    backdropFilter: 'blur(10px)',
                  },
                }}
              />
            </AuthProvider>
          </BrowserRouter>
        </UIProvider>
      </HelmetProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)