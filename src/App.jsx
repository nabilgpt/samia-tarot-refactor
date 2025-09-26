import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ErrorBoundary } from 'react-error-boundary'
import Home from './pages/Home'
import Login from './pages/Login'
import Services from './pages/Services'

function ErrorFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">🔮</div>
        <h1 className="text-2xl font-bold text-white mb-4">Cosmic Disturbance Detected</h1>
        <p className="text-gray-300 mb-6">
          The mystical energies are temporarily disrupted. Please refresh to restore balance.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
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
        <div className="App">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/services" element={<Services />} />
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  )
}

export default App