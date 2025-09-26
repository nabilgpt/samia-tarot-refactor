import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ErrorBoundary } from 'react-error-boundary'
import AppLayout from './components/AppLayout'
import Home from './pages/Home'
import Login from './pages/Login'
import Services from './pages/Services'
import Horoscopes from './pages/Horoscopes'
import Order from './pages/Order'

function ErrorFallback() {
  return (
    <div className="min-h-screen bg-primary-gradient flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">🔮</div>
        <h1 className="text-2xl font-bold text-theme-primary mb-4">Cosmic Disturbance Detected</h1>
        <p className="text-theme-secondary mb-6">
          The mystical energies are temporarily disrupted. Please refresh to restore balance.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-cosmic-gradient text-theme-inverse font-semibold rounded-lg hover:opacity-90 transition-opacity"
        >
          Restore Balance ✨
        </button>
      </div>
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/horoscopes" element={<Horoscopes />} />
            <Route path="/login" element={<Login />} />
            <Route path="/services" element={<Services />} />
            <Route path="/orders/:orderId" element={<Order />} />
          </Route>
        </Routes>
      </Router>
    </ErrorBoundary>
  )
}

export default App