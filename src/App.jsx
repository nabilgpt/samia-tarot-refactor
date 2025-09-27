import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ErrorBoundary } from 'react-error-boundary'
import AppLayout from './components/AppLayout'
import RequireAuth from './components/RequireAuth'
import RoleGate from './components/RoleGate'

// Public Pages
import Home from './pages/Home'
import Login from './pages/Login'
import Services from './pages/Services'
import Horoscopes from './pages/Horoscopes'
import Order from './pages/Order'

// Legal Pages
import Terms from './pages/legal/Terms'
import Privacy from './pages/legal/Privacy'
import Refund from './pages/legal/Refund'

// Client Pages
import Orders from './pages/client/Orders'
import Checkout from './pages/client/Checkout'
import Profile from './pages/client/Profile'

// Reader Pages
import Queue from './pages/reader/Queue'
import ReaderOrder from './pages/reader/ReaderOrder'

// Monitor Pages
import Review from './pages/monitor/Review'
import Calls from './pages/monitor/Calls'

// Admin Pages
import Users from './pages/admin/Users'
import Metrics from './pages/admin/Metrics'
import RateLimits from './pages/admin/RateLimits'
import Exports from './pages/admin/Exports'

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
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/horoscopes" element={<Horoscopes />} />
            <Route path="/login" element={<Login />} />
            <Route path="/services" element={<Services />} />
            <Route path="/checkout" element={<Checkout />} />

            {/* Legal Routes */}
            <Route path="/legal/terms" element={<Terms />} />
            <Route path="/legal/privacy" element={<Privacy />} />
            <Route path="/legal/refund" element={<Refund />} />

            {/* Protected Routes - Require Authentication */}
            <Route element={<RequireAuth />}>
              {/* General Authenticated Routes */}
              <Route path="/orders/:orderId" element={<Order />} />
              <Route path="/profile" element={<Profile />} />

              {/* Client Routes */}
              <Route element={<RoleGate allow={['client', 'admin', 'superadmin']} />}>
                <Route path="/orders" element={<Orders />} />
              </Route>

              {/* Reader Routes */}
              <Route element={<RoleGate allow={['reader', 'admin', 'superadmin']} />}>
                <Route path="/reader/queue" element={<Queue />} />
                <Route path="/reader/orders/:orderId" element={<ReaderOrder />} />
              </Route>

              {/* Monitor Routes */}
              <Route element={<RoleGate allow={['monitor', 'admin', 'superadmin']} />}>
                <Route path="/monitor/review" element={<Review />} />
                <Route path="/monitor/calls" element={<Calls />} />
              </Route>

              {/* Admin Routes */}
              <Route element={<RoleGate allow={['admin', 'superadmin']} />}>
                <Route path="/admin/users" element={<Users />} />
                <Route path="/admin/metrics" element={<Metrics />} />
                <Route path="/admin/rate-limits" element={<RateLimits />} />
                <Route path="/admin/exports" element={<Exports />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </Router>
    </ErrorBoundary>
  )
}

export default App