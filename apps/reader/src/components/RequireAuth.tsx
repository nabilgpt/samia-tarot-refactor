import React, { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { LoadingSpinner } from '@samia-tarot/ui-kit'
import { useAuth } from '../contexts/AuthContext'

interface RequireAuthProps {
  children: React.ReactNode
  requiredRole?: 'reader' | 'monitor' | 'admin' | 'super_admin'
}

const RequireAuth: React.FC<RequireAuthProps> = ({
  children,
  requiredRole = 'reader'
}) => {
  const { user, profile, loading, signOut } = useAuth()
  const location = useLocation()

  useEffect(() => {
    if (profile && profile.role !== requiredRole) {
      signOut()
    }
  }, [profile, requiredRole, signOut])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user || !profile) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (profile.role !== requiredRole) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            غير مخول للدخول
          </h2>
          <p className="text-gray-600 mb-4">
            هذا التطبيق مخصص للقراء فقط
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default RequireAuth