import React from 'react'
import { useAuth } from '../contexts/AuthContext'

interface RequireAuthProps {
  children: React.ReactNode
  allow?: Array<'client' | 'reader' | 'monitor' | 'admin' | 'superadmin'>
}

const RequireAuth: React.FC<RequireAuthProps> = ({ children, allow }) => {
  // DEV-only gate: enabled only when both DEV and VITE_AUTH_BYPASS are set
  const DEV_BYPASS = import.meta.env.DEV && import.meta.env.VITE_AUTH_BYPASS === '1'
  const DEV_ROLE = (import.meta.env.VITE_DEV_ROLE as ('client' | 'reader' | 'monitor' | 'admin' | 'superadmin')) || 'client'

  const { user, loading } = useAuth()

  if (DEV_BYPASS) {

    // Optional: restrict what dev can see by allow list
    if (allow && !allow.includes(DEV_ROLE)) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-red-900">
          <div className="text-center text-white">
            <div className="text-6xl mb-4">🚫</div>
            <div className="text-xl font-semibold mb-4">Access denied (dev bypass)</div>
            <div className="text-sm">Required roles: {allow.join(', ')}</div>
            <div className="text-sm">Current dev role: {DEV_ROLE}</div>
          </div>
        </div>
      )
    }

    // Visual hint that bypass is active
    return (
      <>
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            background: 'crimson',
            color: '#fff',
            fontSize: '12px',
            textAlign: 'center',
            padding: '4px'
          }}
        >
          🚨 DEV AUTH BYPASS ACTIVE — Role: {DEV_ROLE} 🚨
        </div>
        <div style={{ paddingTop: '28px' }}>
          {children}
        </div>
      </>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">🔮</div>
          <div className="text-xl font-semibold mb-4">سامية تاروت</div>
          <div className="animate-spin w-8 h-8 border-3 border-white/30 border-t-white rounded-full mx-auto"></div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-purple-900">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">🔐</div>
          <div className="text-xl font-semibold mb-4">يرجى تسجيل الدخول</div>
          <div className="text-sm">Please login to access this page</div>
        </div>
      </div>
    )
  }

  // Check role permissions in production
  if (allow && !allow.includes('client')) { // Assuming user role logic here
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-900">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">🚫</div>
          <div className="text-xl font-semibold mb-4">غير مسموح بالوصول</div>
          <div className="text-sm">Access denied - insufficient permissions</div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default RequireAuth