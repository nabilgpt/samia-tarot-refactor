import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@samia-tarot/ui-kit'
import { useAuth } from '../contexts/AuthContext'

const Layout: React.FC = () => {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const navItems = [
    { path: '/', label: 'لوحة التحكم', icon: '📊' },
    { path: '/schedule', label: 'المواعيد', icon: '📅' },
    { path: '/services', label: 'خدماتي', icon: '🔮' },
    { path: '/sessions', label: 'الجلسات', icon: '💬' },
    { path: '/inbox', label: 'الرسائل', icon: '📧' },
    { path: '/earnings', label: 'الأرباح', icon: '💰' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <span className="text-2xl">🔮</span>
                <span className="mr-2 font-bold text-xl text-green-600">
                  قراء سامية
                </span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-reverse space-x-8">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-green-600 bg-green-50'
                        : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
                    }`
                  }
                >
                  <span className="ml-2">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>

            {/* Profile Menu */}
            <div className="flex items-center">
              <div className="hidden md:flex items-center space-x-reverse space-x-4">
                <span className="text-sm text-gray-700">
                  {profile?.user_metadata?.first_name} {profile?.user_metadata?.last_name}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                >
                  تسجيل الخروج
                </Button>
              </div>

              {/* Mobile menu button */}
              <div className="md:hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                >
                  <span className="sr-only">فتح القائمة</span>
                  {showMobileMenu ? '✕' : '☰'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {showMobileMenu && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-gray-200"
            >
              <div className="px-2 pt-2 pb-3 space-y-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center px-3 py-2 rounded-md text-base font-medium ${
                        isActive
                          ? 'text-green-600 bg-green-50'
                          : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
                      }`
                    }
                    onClick={() => setShowMobileMenu(false)}
                  >
                    <span className="ml-3">{item.icon}</span>
                    {item.label}
                  </NavLink>
                ))}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center px-3 py-2">
                    <span className="text-sm text-gray-700">
                      {profile?.user_metadata?.first_name} {profile?.user_metadata?.last_name}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSignOut}
                    className="mx-3"
                  >
                    تسجيل الخروج
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout