import React from 'react'
import { useAuth } from '../contexts/AuthContext'

interface RequireAuthProps {
  children: React.ReactNode
}

const RequireAuth: React.FC<RequireAuthProps> = ({ children }) => {
  const { user, loading } = useAuth()

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

  // For demo purposes, always allow access
  // In production, this would redirect to login if not authenticated
  return <>{children}</>
}

export default RequireAuth